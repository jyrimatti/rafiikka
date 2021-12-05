
let log = (msg1, msg2, msg3, msg4, msg5, msg6) => {
    if (console && console.log) {
        console.log(dateFns.dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS'), "      :",
                    msg1 == undefined ? '' : msg1,
                    msg2 == undefined ? '' : msg2,
                    msg3 == undefined ? '' : msg3,
                    msg4 == undefined ? '' : msg4,
                    msg5 == undefined ? '' : msg5,
                    msg6 == undefined ? '' : msg6);
    }
};

let logDiff = (msg1, msg2, msg3, msg4, msg5, msg6) => {
    let started = new Date();
    let lastGiven = [msg1, msg2, msg3, msg4, msg5, msg6].reverse().find(x => x !== undefined);
    let ret = lastGiven();
    if (console && console.log) {
        let ended = new Date();
        let dur = (ended.getTime() - started.getTime());
        console.log(dateFns.dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS'),
                    '(' + ' '.repeat(Math.max(0, 2 - (dur+'').length)) + dur + 'ms):',
                    msg1 instanceof Function || msg1 == undefined ? '' : msg1,
                    msg2 instanceof Function || msg2 == undefined ? '' : msg2,
                    msg3 instanceof Function || msg3 == undefined ? '' : msg3,
                    msg4 instanceof Function || msg4 == undefined ? '' : msg4,
                    msg5 instanceof Function || msg5 == undefined ? '' : msg5,
                    msg6 instanceof Function || msg6 == undefined ? '' : msg6);
    }
    return ret;
};

// https://stackoverflow.com/a/31732310
let isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
               navigator.userAgent &&
               navigator.userAgent.indexOf('CriOS') == -1 &&
               navigator.userAgent.indexOf('FxiOS') == -1;

let toISOStringNoMillis = (d) => {
    let pad = n => n < 10 ? '0' + n : n;
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z';
};

window.ikkuna = () => getMainState('aika');
window.rajat  = () => laajennaAikavali(getMainState('aika')); //[dateFns.dateFns.addDays(ikkuna()[0], -3), dateFns.dateFns.addDays(ikkuna()[1], 3)];

let laajennaAikavali = x => [startOfMonthUTC(dateFns.dateFns.addMonths(x[1], -1)),
                             startOfMonthUTC(dateFns.dateFns.addMonths(x[1], 1))];

let limitInterval = intervalString => {
    let begin = new Date('2010-01-01T00:00:00Z');
    let end = new Date('2029-12-31T00:00:00Z');
    let instants = intervalString.split('/');
    if (new Date(instants[0]).getTime() < begin.getTime()) {
        instants[0] = toISOStringNoMillis(begin);
    }
    if (new Date(instants[1]).getTime() > end.getTime()) {
        instants[1] = toISOStringNoMillis(end);
    }
    return instants[0] + '/' + instants[1];
};

let intervalsIntersect = a => b => {
    let as = a.split('/').map(x => new Date(x).getTime());
    let bs = b.split('/').map(x => new Date(x).getTime());
    return as[0] < bs[1] && bs[0] < as[1];
};

window.revisions = {
    infra: '',
    etj2: ''
};

// safari bugittaa cross-origin-redirectien kanssa, joten proxytetään safari oman palvelimen kautta.
let infraAPIUrl = skipRevision => 'https://' + (isSafari ? 'rafiikka.lahteenmaki.net' : 'rata.digitraffic.fi') + '/infra-api/0.7/' + (skipRevision === true ? '' : window.revisions.infra);
let etj2APIUrl  = skipRevision => 'https://' + (isSafari ? 'rafiikka.lahteenmaki.net' : 'rata.digitraffic.fi') + '/jeti-api/0.7/' + (skipRevision === true ? '' : window.revisions.etj2);
let aikatauluAPIUrl = 'https://rata.digitraffic.fi/api/v1/trains/';
let graphQLUrl = 'https://rata.digitraffic.fi/api/v1/graphql/graphiql/?';

let mqttUrl = "rata.digitraffic.fi";
let mqttPort = 443;
let mqttTopic = juna => 'train-locations/' + (juna ? juna.departureDate + '/' + juna.trainNumber : '#');

let errorHandler = error => log("Virhe!", error, error.stack, new Error().stack);

let loggingDelegate = f => (a, b, c) => {
    try {
        return f(a, b, c);
    } catch (e) {
        errorHandler(e);
        throw e;
    }
};

window.progress = document.getElementById('progress');

let progressStart = type => {
    progress.title += " " + type;
    
    progress.max += 1;
    if (!progress.hasAttribute('value')) {
        progress.setAttribute("value", 1);
    }
};

let progressEnd = type => {
    progress.title = progress.title.replace(" " + type, "");
    
    progress.value += 1;
    if (progress.value == progress.max) {
        progress.removeAttribute('value');
        progress.max = 1;
    }
};

let onkoSeed = window.location.hash == '#seed' || window.location.hash.endsWith('&seed');

let fetchJson = (url, opts, callback, errorCallback) => {
    let type = url.replace(/[?].*/,'')
                  .replace(/[.][^/]+$/, '')
                  .replace(/.*\/([^\/]+)$/, '$1');
    progressStart(type);
    return fetch(url, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            'Digitraffic-User': 'Rafiikka'
        }
    }).then(response => response.json())
      .then(x => {
          progressEnd(type);
          return callback(x);
       })
      .catch(x => {
          progressEnd(type);
          return (errorCallback || errorHandler)(x);
       });
}

let getJson  = (url,       callback, signal, errorCallback) => onkoSeed ? null : fetchJson(url, {method: 'GET', signal: signal}             , callback, errorCallback);
let headJson = (url,       callback, signal, errorCallback) =>                   fetchJson(url, {method: 'HEAD', signal: signal}            , callback, errorCallback);
let postJson = (url, body, callback, signal, errorCallback) => onkoSeed ? null : fetchJson(url, {method: 'POST', signal: signal, body: body}, callback, errorCallback);

getJson(infraAPIUrl() + 'revisions.json?count=1', data => {
    window.revisions.infra = data[0].revisio + '/';
    log("Saatiin infra-revisioksi", window.revisions.infra);
});
getJson(etj2APIUrl() + 'revisions.json?count=1', data => {
    window.revisions.etj2 = data[0].revisio + '/';
    log("Saatiin etj2-revisioksi", window.revisions.etj2);
});

let ikuisuusAlku = '2010-01-01T00:00:00Z';
let ikuisuusLoppu = '2030-01-01T00:00:00Z';
let ikuisuusAikavali = 'time=' + ikuisuusAlku + '/' + ikuisuusLoppu;
// haetaan infra oletuksena päätilan alkuajanhetkellä
let infraAikavali = () => 'time=' + toISOStringNoMillis(startOfDayUTC(getMainState('aika')[0])) + "/" + toISOStringNoMillis(startOfDayUTC(getMainState('aika')[0]));
// haetaan ennakkotiedot oletuksena päätilan aikakonteksti laajennettuna (+- kuukausi tms)
let etj2Aikavali  = () => 'time=' + laajennaAikavali(getMainState('aika').slice(0,2)).map(toISOStringNoMillis).join("/");
// haetaan ratatyöt oletuksena tarkasti päätilan aikakontekstilla (ei cachetusta)
let rumaAikavali  = () => 'start=' + getMainState('aika').slice(0,2).map(startOfDayUTC).map(toISOStringNoMillis).join("&end=");

let junienEsitysaikavali = 1000*60*60*24*5;

let ratanumeroUrl             = (ratanumero, time) => infraAPIUrl() + "radat.json?cql_filter=ratanumero='" + ratanumero + "'&" + (time ? 'time=' + time : infraAikavali());
let ratanumerotUrl            = () => infraAPIUrl() + "radat.json?propertyName=ratakilometrit,ratanumero,objektinVoimassaoloaika&" + infraAikavali();
let ratakmSijaintiUrl         = (ratanumero, ratakm, etaisyys, time) => infraAPIUrl() + 'radat/' + ratanumero + '/' + ratakm + '+' + etaisyys + '.json?' + (time ? 'time=' + time : infraAikavali());
let pmSijaintiUrl             = (numero, suunta, etaisyys, time) => infraAPIUrl() + 'paikantamismerkit/' + numero + suunta + etaisyys + '.json?' + (time ? 'time=' + time : infraAikavali());
let ratakmValiUrl             = (ratanumero, alkuratakm, alkuetaisyys, loppuratakm, loppuetaisyys, time) => infraAPIUrl() + 'radat/' + ratanumero + '/' + alkuratakm + '+' + alkuetaisyys + '-' + loppuratakm + '+' + loppuetaisyys + '.json?' + (time ? 'time=' + time : infraAikavali());
let liikennepaikkavalitUrl    = () => infraAPIUrl() + "liikennepaikkavalit.json?propertyName=alkuliikennepaikka,loppuliikennepaikka,ratakmvalit,objektinVoimassaoloaika,tunniste&" + infraAikavali();
let reittiUrl                 = (alku, etapit, loppu, time) => infraAPIUrl() + "reitit/kaikki/" + alku + "/" + (etapit && etapit.length > 0 ? etapit.join(',') + '/' : '') + loppu + ".json?propertyName=geometria,liikennepaikat,liikennepaikanOsat,seisakkeet,linjavaihteet&" + (time ? 'time=' + time : infraAikavali());
let reittihakuUrl             = (alku, etapit, loppu, time) => infraAPIUrl() + "reitit/kaikki/" + alku + "/" + (etapit && etapit.length > 0 ? etapit.join(',') + '/' : '') + loppu + ".json?propertyName=liikennepaikat,liikennepaikanOsat,seisakkeet,linjavaihteet&" + (time ? 'time=' + time : infraAikavali());
let ratapihapalveluTyypitUrl  = () => infraAPIUrl() + "ratapihapalvelutyypit.json";
let opastinTyypitUrl          = () => infraAPIUrl() + "opastintyypit.json";
let vaihdeTyypitUrl           = () => infraAPIUrl() + "vaihdetyypit.json";

let rautatieliikennepaikatUrl = () => infraAPIUrl() + "rautatieliikennepaikat.json?propertyName=lyhenne,muutRatakmsijainnit,nimi,ratakmvalit,tunniste,tyyppi,uicKoodi,virallinenRatakmsijainti,virallinenSijainti,objektinVoimassaoloaika&srsName=crs:84&" + infraAikavali();
let liikennepaikanOsatUrl     = () => infraAPIUrl() + "liikennepaikanosat.json?propertyName=liikennepaikka,lyhenne,muutRatakmsijainnit,nimi,tunniste,uicKoodi,virallinenRatakmsijainti,virallinenSijainti,objektinVoimassaoloaika&srsName=crs:84&" + infraAikavali();
let raideosuudetUrl           = () => infraAPIUrl() + "aikataulupaikat.json?cql_filter=tyyppi=%27raideosuus%27&propertyName=geometria,tunniste.tunniste,tunniste.ratakmvalit,tunniste.turvalaiteNimi,tyyppi,uicKoodi,objektinVoimassaoloaika&srsName=crs:84&" + infraAikavali();
let laituritUrl               = () => infraAPIUrl() + "aikataulupaikat.json?cql_filter=tyyppi=%27laituri%27&propertyName=geometria,tunniste.tunniste,tunniste.kuvaus,tunniste.ratakmvalit,tunniste.tunnus,tyyppi,uicKoodi,objektinVoimassaoloaika&srsName=crs:84&" + infraAikavali();

let elementitUrl              = () => infraAPIUrl() + "elementit.json?propertyName=tunniste,nimi,ratakmsijainnit,objektinVoimassaoloaika&" + infraAikavali();
let lorajatUrl                = () => infraAPIUrl() + "liikenteenohjauksenrajat.json?propertyName=tunniste,leikkaukset.ratakmsijainnit,objektinVoimassaoloaika&" + infraAikavali();
let raiteenKorkeudetUrl       = tunniste => infraAPIUrl() + "raiteet/" + tunniste + ".json?propertyName=korkeuspisteet,ratakmvalit,tunnus&" + infraAikavali();

let eiUrlRatanumero = () => tila => etj2APIUrl() + 'ennakkoilmoitukset.json?cql_filter=tila=%27'  + tila + '%27&propertyName=ajankohdat,liikennevaikutusalue.laskennallisetRatakmvalit,sisainenTunniste,tunniste,voimassa&' + etj2Aikavali();
let esUrlRatanumero = () => tila => etj2APIUrl() + 'ennakkosuunnitelmat.json?cql_filter=tila=%27' + tila + '%27&propertyName=sisainenTunniste,tyonosat.ajankohdat,tyonosat.tekopaikka.laskennallisetRatakmvalit,tunniste,voimassa&' + etj2Aikavali();
let vsUrlRatanumero = () => tila => etj2APIUrl() + 'vuosisuunnitelmat.json?cql_filter=tila=%27'   + tila + '%27&propertyName=ajankohdat,sisainenTunniste,tunniste,kohde.laskennallisetRatakmvalit,voimassa&' + etj2Aikavali();
let loUrlRatanumero = () => tila => etj2APIUrl() + 'loilmoitukset.json?cql_filter=tila=%27'       + tila + '%27&propertyName=ensimmainenAktiivisuusaika,ratakmvalit,sisainenTunniste,tunniste,viimeinenAktiivisuusaika&' + etj2Aikavali();

let eiUrlAikataulupaikka = () => tila => etj2APIUrl() + 'ennakkoilmoitukset.json?cql_filter=tila=%27'  + tila + '%27&propertyName=ajankohdat,liikennevaikutusalue.laskennallisetRatakmvalit,sisainenTunniste,tunniste,voimassa&' + etj2Aikavali();
let esUrlAikataulupaikka = () => tila => etj2APIUrl() + 'ennakkosuunnitelmat.json?cql_filter=tila=%27' + tila + '%27&propertyName=sisainenTunniste,tyonosat.ajankohdat,tyonosat.tekopaikka.laskennallisetRatakmvalit,tunniste,voimassa&' + etj2Aikavali();
let vsUrlAikataulupaikka = () => tila => etj2APIUrl() + 'vuosisuunnitelmat.json?cql_filter=tila=%27'   + tila + '%27&propertyName=ajankohdat,sisainenTunniste,tunniste,kohde.laskennallisetRatakmvalit,voimassa&' + etj2Aikavali();
let loUrlAikataulupaikka = () => tila => etj2APIUrl() + 'loilmoitukset.json?cql_filter=tila=%27'       + tila + '%27&propertyName=ensimmainenAktiivisuusaika,ratakmvalit,sisainenTunniste,tunniste,viimeinenAktiivisuusaika&' + etj2Aikavali();

let kunnossapitoalueetMetaUrl        = () => infraAPIUrl() + "kunnossapitoalueet.json?propertyName=nimi,objektinVoimassaoloaika,tunniste&" + ikuisuusAikavali;
let liikenteenohjausalueetMetaUrl    = () => infraAPIUrl() + "liikenteenohjausalueet.json?propertyName=nimi,objektinVoimassaoloaika,tunniste&" + ikuisuusAikavali;
let kayttokeskuksetMetaUrl           = () => infraAPIUrl() + "kayttokeskukset.json?propertyName=nimi,objektinVoimassaoloaika,tunniste&" + ikuisuusAikavali;
let liikennesuunnittelualueetMetaUrl = () => infraAPIUrl() + "liikennesuunnittelualueet.json?propertyName=nimi,objektinVoimassaoloaika,tunniste&" + ikuisuusAikavali;

let ratapihapalvelutUrlTilasto = () => infraAPIUrl() + 'ratapihapalvelut.json?propertyName=objektinVoimassaoloaika,tunniste,tyyppi&' + ikuisuusAikavali;
let toimialueetUrlTilasto = () => infraAPIUrl() + 'toimialueet.json?propertyName=liikenteenohjausalue,objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
let tilirataosatUrlTilasto = () => infraAPIUrl() + 'tilirataosat.json?propertyName=kunnossapitoalue,objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
let liikennesuunnittelualueetUrlTilasto = () => infraAPIUrl() + 'liikennesuunnittelualueet.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
let paikantamismerkitUrlTilasto = () => infraAPIUrl() + 'paikantamismerkit.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
let kilometrimerkitUrlTilasto = () => infraAPIUrl() + 'kilometrimerkit.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
let radatUrlTilasto = () => infraAPIUrl() + 'radat.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
let liikennepaikanOsatUrlTilasto = () => infraAPIUrl() + 'liikennepaikanosat.json?propertyName=liikennesuunnittelualueet,objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
let rautatieliikennepaikatUrlTilasto = () => infraAPIUrl() + 'rautatieliikennepaikat.json?propertyName=liikennesuunnittelualueet,objektinVoimassaoloaika,tunniste,tyyppi&' + ikuisuusAikavali;
let liikennepaikkavalitUrlTilasto = () => infraAPIUrl() + 'liikennepaikkavalit.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
let raideosuudetUrlTilasto = () => infraAPIUrl() + 'raideosuudet.json?propertyName=objektinVoimassaoloaika,tunniste,tyyppi&' + ikuisuusAikavali;

let akselinlaskijaUrlTilasto                   = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=akselinlaskija&' + ikuisuusAikavali;
let baliisiUrlTilasto                          = () => infraAPIUrl() + 'elementit.json?propertyName=baliisi.tyyppi,kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=baliisi&' + ikuisuusAikavali;
let kuumakayntiilmaisinUrlTilasto              = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=kuumakayntiilmaisin&' + ikuisuusAikavali;
let liikennepaikanrajaUrlTilasto               = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=liikennepaikanraja&' + ikuisuusAikavali;
let opastinUrlTilasto                          = () => infraAPIUrl() + 'elementit.json?propertyName=opastin.tyyppi,kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=opastin&' + ikuisuusAikavali;
let puskinUrlTilasto                           = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=puskin&' + ikuisuusAikavali;
let pyoravoimailmaisinUrlTilasto               = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=pyoravoimailmaisin&' + ikuisuusAikavali;
let raideeristysUrlTilasto                     = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=raideeristys&' + ikuisuusAikavali;
let pysaytyslaiteUrlTilasto                    = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,pysaytyslaite.kasinAsetettava,pysaytyslaite.varmuuslukittu,tunniste&typeNames=pysaytyslaite&' + ikuisuusAikavali;
let rfidlukijaUrlTilasto                       = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=rfidlukija&' + ikuisuusAikavali;
let ryhmityseristinUrlTilasto                  = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,ryhmityseristin.nopeastiAjettava,tunniste&typeNames=ryhmityseristin&' + ikuisuusAikavali;
let sahkoistyspaattyyUrlTilasto                = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=sahkoistyspaattyy&' + ikuisuusAikavali;
let seislevyUrlTilasto                         = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=seislevy&' + ikuisuusAikavali;
let vaihdeUrlTilasto                           = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste,vaihde.tyyppi&typeNames=vaihde&' + ikuisuusAikavali;
let virroitinvalvontakameraUrlTilasto          = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=virroitinvalvontakamera&' + ikuisuusAikavali;
let erotusjaksoUrlTilasto                      = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=erotusjakso&' + ikuisuusAikavali;
let erotuskenttaUrlTilasto                     = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=erotuskentta&' + ikuisuusAikavali;
let maadoitinUrlTilasto                        = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=maadoitin&' + ikuisuusAikavali;
let tyonaikaineneristinUrlTilasto              = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=tyonaikaineneristin&' + ikuisuusAikavali;
let kaantopoytaUrlTilasto                      = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=kaantopoyta&' + ikuisuusAikavali;
let pyoraprofiilimittalaiteUrlTilasto          = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=pyoraprofiilimittalaite&' + ikuisuusAikavali;
let telivalvontaUrlTilasto                     = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=telivalvonta&' + ikuisuusAikavali;
let erotinUrlTilasto                           = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=erotin&' + ikuisuusAikavali;
let tasoristeysvalojenpyoratunnistinUrlTilasto = () => infraAPIUrl() + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=tasoristeysvalojenpyoratunnistin&' + ikuisuusAikavali;

let raiteensulutUrlTilasto = () => infraAPIUrl() + 'raiteensulut.json?propertyName=kasinAsetettava,objektinVoimassaoloaika,tunniste,varmuuslukittu&' + ikuisuusAikavali;
let raiteetUrlTilasto = () => infraAPIUrl() + 'raiteet.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
let liikenteenohjauksenrajatUrlTilasto = () => infraAPIUrl() + 'liikenteenohjauksenrajat.json?propertyName=ensimmaisenLuokanAlueidenRaja,objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
let tunnelitUrlTilasto = () => infraAPIUrl() + 'tunnelit.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
let sillatUrlTilasto = () => infraAPIUrl() + 'sillat.json?propertyName=kayttotarkoitus,objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
let laituritUrlTilasto = () => infraAPIUrl() + 'laiturit.json?propertyName=korkeus,objektinVoimassaoloaika,tunniste,tyyppi&' + ikuisuusAikavali;
let tasoristeyksetUrlTilasto = () => infraAPIUrl() + 'tasoristeykset.json?propertyName=kayttokeskukset,objektinVoimassaoloaika,tielaji,tunniste,varoituslaitos&' + ikuisuusAikavali;
let kayttokeskuksetUrlTilasto = () => infraAPIUrl() + 'kayttokeskukset.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
let kytkentaryhmatUrlTilasto = () => infraAPIUrl() + 'kytkentaryhmat.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;

let asiatUrl     = () => etj2APIUrl() + 'asiat.json';
let esTyypitUrl  = () => etj2APIUrl() + 'ennakkosuunnitelmatyypit.json';
let loUrlTilasto = () => etj2APIUrl() + 'loilmoitukset.json?propertyName=ensimmainenAktiivisuusaika,luontiaika,tila,tunniste,tyyppi,viimeinenAktiivisuusaika&' + ikuisuusAikavali;
let eiUrlTilasto = () => etj2APIUrl() + 'ennakkoilmoitukset.json?propertyName=asia,luontiaika,tila,tunniste,tyyppi,voimassa&' + ikuisuusAikavali;
let esUrlTilasto = () => etj2APIUrl() + 'ennakkosuunnitelmat.json?propertyName=luontiaika,tila,tunniste,tyyppi,voimassa&' + ikuisuusAikavali;
let vsUrlTilasto = () => etj2APIUrl() + 'vuosisuunnitelmat.json?propertyName=alustavakapasiteettivaraus,luontiaika,tila,tunniste,tyo,tyonlaji,voimassa&' + ikuisuusAikavali;

let luotujaInfraUrl = (path, duration, typeNames) => infraAPIUrl(true) + path + '.json?cql_filter=start(objektinVoimassaoloaika)>=start(time)+AND+start(objektinVoimassaoloaika)<end(time)&propertyName=objektinVoimassaoloaika,tunniste&' + (typeNames ? 'typeNames=' + typeNames + '&' : '') + 'duration=' + duration;
let poistuneitaInfraUrl = (path, duration, typeNames) => infraAPIUrl(true) + path + '.json?cql_filter=end(objektinVoimassaoloaika)>=start(time)+AND+end(objektinVoimassaoloaika)<end(time)&propertyName=objektinVoimassaoloaika,tunniste&' + (typeNames ? 'typeNames=' + typeNames + '&' : '') + 'duration=' + duration;
let infraMuutoksetUrl = (name, path, typeNames) => duration => ({
    nimi:        name,
    luotuja:     luotujaInfraUrl(path, duration, typeNames),
    poistuneita: poistuneitaInfraUrl(path, duration, typeNames)
});

let luotujaEtj2Url = (path, duration) => etj2APIUrl(true) + path + '.json?cql_filter=start(voimassa)>=start(time)+AND+start(voimassa)<end(time)&propertyName=sisainenTunniste,tunniste,voimassa&duration=' + duration;
let poistuneitaEtj2Url = (path, duration) => etj2APIUrl(true) + path + '.json?cql_filter=end(voimassa)>=start(time)+AND+end(voimassa)<end(time)&propertyName=sisainenTunniste,tunniste,voimassa&duration=' + duration;
let etj2MuutoksetUrl = (name, path) => duration => ({
    nimi:        name,
    luotuja:     luotujaEtj2Url(path, duration),
    poistuneita: poistuneitaEtj2Url(path, duration)
});

let muutoksetInfra = [
    infraMuutoksetUrl('Ratapihapalvelut'                    , 'ratapihapalvelut'),
    infraMuutoksetUrl('Toimialueet'                         , 'toimialueet'),
    infraMuutoksetUrl('Tilirataosat'                        , 'tilirataosat'),
    infraMuutoksetUrl('Liikennesuunnittelualueet'           , 'liikennesuunnittelualueet'),
    infraMuutoksetUrl('Paikantamismerkit'                   , 'paikantamismerkit'),
    infraMuutoksetUrl('Kilometrimerkit'                     , 'kilometrimerkit'),
    infraMuutoksetUrl('Radat'                               , 'radat'),
    infraMuutoksetUrl('Liikennepaikanosat'                  , 'liikennepaikanosat'),
    infraMuutoksetUrl('Rautatieliikennepaikat'              , 'rautatieliikennepaikat'),
    infraMuutoksetUrl('Liikennepaikkavalit'                 , 'liikennepaikkavalit'),
    infraMuutoksetUrl('Raideosuudet'                        , 'raideosuudet'),
    infraMuutoksetUrl('Akselinlaskijat'                     , 'elementit', 'akselinlaskija'),
    infraMuutoksetUrl('Baliisit'                            , 'elementit', 'baliisi'),
    infraMuutoksetUrl('Kuumakäynti-ilmaisimet'              , 'elementit', 'kuumakayntiilmaisin'),
    infraMuutoksetUrl('Liikennepaikan rajat'                , 'elementit', 'liikennepaikanraja'),
    infraMuutoksetUrl('Opastimet'                           , 'elementit', 'opastin'),
    infraMuutoksetUrl('Puskimet'                            , 'elementit', 'puskin'),
    infraMuutoksetUrl('Pyörävoimailmaisimet'                , 'elementit', 'pyoravoimailmaisin'),
    infraMuutoksetUrl('Raide-eristykset'                    , 'elementit', 'raideeristys'),
    infraMuutoksetUrl('Pysäytyslaitteet'                    , 'elementit', 'pysaytyslaite'),
    infraMuutoksetUrl('RFID-lukijat'                        , 'elementit', 'rfidlukija'),
    infraMuutoksetUrl('Ryhmityseristimet'                   , 'elementit', 'ryhmityseristin'),
    infraMuutoksetUrl('Sähköistys päättyy'                  , 'elementit', 'sahkoistyspaattyy'),
    infraMuutoksetUrl('Seislevyt'                           , 'elementit', 'seislevy'),
    infraMuutoksetUrl('Vaihteet'                            , 'elementit', 'vaihde'),
    infraMuutoksetUrl('Virroitinvalvontakamerat'            , 'elementit', 'virroitinvalvontakamera'),
    infraMuutoksetUrl('Erotusjaksot'                        , 'elementit', 'erotusjakso'),
    infraMuutoksetUrl('Erotuskentät'                        , 'elementit', 'erotuskentta'),
    infraMuutoksetUrl('Maadoittimet'                        , 'elementit', 'maadoitin'),
    infraMuutoksetUrl('Työnaikaiset eristimet'              , 'elementit', 'tyonaikaineneristin'),
    infraMuutoksetUrl('Kääntöpöydät'                        , 'elementit', 'kaantopoyta'),
    infraMuutoksetUrl('Pyöräprofiilin mittalaitteet'        , 'elementit', 'pyoraprofiilimittalaite'),
    infraMuutoksetUrl('Telivalvonnat'                       , 'elementit', 'telivalvonta'),
    infraMuutoksetUrl('Erottimet'                           , 'elementit', 'erotin'),
    infraMuutoksetUrl('Tasoristeysvalojen pyörätunnistimet' , 'elementit', 'tasoristeysvalojenpyoratunnistin'),
    infraMuutoksetUrl('Raiteensulut'                        , 'raiteensulut'),
    infraMuutoksetUrl('Raiteet'                             , 'raiteet'),
    infraMuutoksetUrl('Liikenteenohjauksen rajat'           , 'liikenteenohjauksenrajat'),
    infraMuutoksetUrl('Tunnelit'                            , 'tunnelit'),
    infraMuutoksetUrl('Sillat'                              , 'sillat'),
    infraMuutoksetUrl('Laiturit'                            , 'laiturit'),
    infraMuutoksetUrl('Tasoristeykset'                      , 'tasoristeykset'),
    infraMuutoksetUrl('Käyttökeskukset'                     , 'kayttokeskukset'),
    infraMuutoksetUrl('Kytkentäryhmät'                      , 'kytkentaryhmat')
];
muutoksetEtj2 = [
    etj2MuutoksetUrl('Ennakkoilmoitukset' , 'ennakkoilmoitukset'),
    etj2MuutoksetUrl('Ennakkosuunnitelmat', 'ennakkosuunnitelmat'),
    etj2MuutoksetUrl('Vuosisuunnitelmat'  , 'vuosisuunnitelmat')
];

let junasijainnitUrl        = () => 'https://rata.digitraffic.fi/api/v1/train-locations/latest/';
let junasijainnitGeojsonUrl = () => 'https://rata.digitraffic.fi/api/v1/train-locations.geojson/latest/';

let koordinaattiUrl        = (coord, srsName, time) => infraAPIUrl() + 'koordinaatit/' + coord + '.json?' + (srsName ? 'srsName=' + srsName + '&' : '') + (time ? 'time=' + time : infraAikavali());
let ratakmMuunnosUrl       = coord => infraAPIUrl() + 'koordinaatit/' + coord + '.json?propertyName=ratakmsijainnit,haetunDatanVoimassaoloaika&srsName=crs:84&' + infraAikavali();
let koordinaattiMuunnosUrl = (ratanumero, ratakm, etaisyys) => infraAPIUrl() + 'radat/' + ratanumero + '/' + ratakm + '+' + etaisyys + '.geojson?propertyName=geometria,haetunDatanVoimassaoloaika&srsName=crs:84&' + infraAikavali();

let rtUrl              = () => tila => 'https://rata.digitraffic.fi/api/v1/trackwork-notifications.json?'    + (tila ? 'state=' + tila + '&' : '') + rumaAikavali();
let rtSingleUrl        = (tunniste) => 'https://rata.digitraffic.fi/api/v1/trackwork-notifications/'         + tunniste + '/latest.json';
let rtGeojsonUrl       =       tila => 'https://rata.digitraffic.fi/api/v1/trackwork-notifications.geojson?' + (tila ? 'state=' + tila + '&' : '') + rumaAikavali();

let lrUrl              = () => tila => 'https://rata.digitraffic.fi/api/v1/trafficrestriction-notifications.json?'    + (tila ? 'state=' + tila + '&' : '') + rumaAikavali();
let lrSingleUrl        = (tunniste) => 'https://rata.digitraffic.fi/api/v1/trafficrestriction-notifications/'         + tunniste + '/latest.json';
let lrGeojsonUrl       =       tila => 'https://rata.digitraffic.fi/api/v1/trafficrestriction-notifications.geojson?' + (tila ? 'state=' + tila + '&' : '') + rumaAikavali();

let infraObjektityypitUrl = () => infraAPIUrl(true) + "objektityypit.json";
let hakuUrlitInfra = () => [ infraAPIUrl() + "ratapihapalvelut.json?propertyName=kuvaus,nimi,ratakmsijainnit,sahkokeskus.sahkokeskustyyppi,tunniste,tyyppi"
                           , infraAPIUrl() + "toimialueet.json?propertyName=nimi,rttunnusvali,tunniste,valit.ratakmvali"
                           , infraAPIUrl() + "tilirataosat.json?propertyName=nimi,numero,ratakmvalit,tunniste"
                           , infraAPIUrl() + "liikennesuunnittelualueet.json?propertyName=nimi,tunniste"
                           , infraAPIUrl() + "paikantamismerkit.json?propertyName=liikennepaikkavalit,numero,ratakmsijainnit,rautatieliikennepaikka,tunniste"
                           , infraAPIUrl() + "kilometrimerkit.json?propertyName=ratakm,ratanumero,tunniste"
                           , infraAPIUrl() + "radat.json?propertyName=ratanumero,tunniste"
                           , infraAPIUrl() + "liikennepaikanosat.json?propertyName=kuljettajaAikatauluNimi,liikennepaikka,lyhenne,maakoodi,muutRatakmsijainnit,nimi,tunniste,uicKoodi,virallinenRatakmsijainti"
                           , infraAPIUrl() + "rautatieliikennepaikat.json?propertyName=kuljettajaAikatauluNimi,lyhenne,muutRatakmsijainnit,nimi,paaristeysasema,tunniste,tyyppi,uicKoodi,virallinenRatakmsijainti"
                           , infraAPIUrl() + "liikennepaikkavalit.json?propertyName=alkuliikennepaikka,loppuliikennepaikka,tunniste"
                           , infraAPIUrl() + "raideosuudet.json?propertyName=kaukoOhjausTunnisteet,liikennepaikkavalit,rautatieliikennepaikat,tunniste,turvalaiteNimi,turvalaiteRaide,tyyppi,uicKoodi"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=akselinlaskija"
                           , infraAPIUrl() + "elementit.json?propertyName=baliisi,kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=baliisi"
                           , infraAPIUrl() + "elementit.json?propertyName=kuumakayntiIlmaisin,kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=kuumakayntiilmaisin"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=liikennepaikanraja"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,opastin,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=opastin"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=puskin"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,pyoravoimailmaisin,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=pyoravoimailmaisin"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=raideeristys"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,pysaytyslaite,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=pysaytyslaite"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,rfidLukija,tunniste,tyyppi&typeNames=rfidlukija"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,ryhmityseristin,tunniste,tyyppi&typeNames=ryhmityseristin"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,sahkoistysPaattyy,tunniste,tyyppi&typeNames=sahkoistyspaattyy"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=seislevy"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi,vaihde&typeNames=vaihde"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi,virroitinvalvontakamera&typeNames=virroitinvalvontakamera"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=erotusjakso"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=erotuskentta"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=maadoitin"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=tyonaikaineneristin"
                           , infraAPIUrl() + "elementit.json?propertyName=kaantopoyta,kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=kaantopoyta"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,pyoraprofiiliMittalaite,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=pyoraprofiilimittalaite"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,telivalvonta,tunniste,tyyppi&typeNames=telivalvonta"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=erotin"
                           , infraAPIUrl() + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=tasoristeysvalojenpyoratunnistin"
                           , infraAPIUrl() + "raiteensulut.json?propertyName=kasinAsetettava,nimi,tunniste,varmuuslukittu"
                           , infraAPIUrl() + "raiteet.json?propertyName=kaupallinenNumero,kayttotarkoitukset,kuvaus,liikennepaikkavalit,linjaraidetunnukset,nopeusrajoitukset,rautatieliikennepaikat,tunniste,tunnus"
                           , infraAPIUrl() + "liikenteenohjauksenrajat.json?propertyName=ensimmaisenLuokanAlueidenRaja,leikkaukset.ratakmsijainnit,tunniste"
                           , infraAPIUrl() + "tunnelit.json?propertyName=nimi,tunniste"
                           , infraAPIUrl() + "sillat.json?propertyName=kayttotarkoitus,nimi,ratakmvalit,siltakoodi,tunniste"
                           , infraAPIUrl() + "laiturit.json?propertyName=kaupallinenNumero,kuvaus,liikennepaikanOsa,ratakmvalit,rautatieliikennepaikka,tunniste,tunnus,uicKoodi"
                           , infraAPIUrl() + "tasoristeykset.json?propertyName=liikennepaikkavalit,nimi,rautatieliikennepaikat,tielaji,tunniste,tunnus,varoituslaitos,virallinenSijainti"
                           , infraAPIUrl() + "kayttokeskukset.json?propertyName=nimi,tunniste"
                           , infraAPIUrl() + "kytkentaryhmat.json?propertyName=numero,rautatieliikennepaikat,tunniste"
                           ].map(x => x + '&' + infraAikavali());
let hakuUrlitEtj2  = () => [ etj2APIUrl() + "vuosisuunnitelmat.json?propertyName=alustavakapasiteettivaraus,liikennehaitta,liikennejarjestelyt,liikennerajoitteenLisatiedot,liikennerajoitteet,myohastymisvaikutus,sisainenTunniste,tila,tunniste,tyo,tyonlaji,tyonLisatiedot,urakoitsija.urakoitsija,voimassa"
                           , etj2APIUrl() + "ennakkosuunnitelmat.json?propertyName=kuvaus,organisaatio,projektinumerot,sisainenTunniste,tila,tilanLisatiedot,tunniste,tyyppi,tyonosat.alustavaKapasiteettirajoite,tyonosat.nopeusrajoitus,tyonosat.selite,tyonosat.tyyppi,urakoitsija.urakoitsija,voimassa"
                           , etj2APIUrl() + "ennakkoilmoitukset.json?propertyName=asia,eivekSelite,muutostyyppi,nopeusrajoitus,sisainenTunniste,suunta,symbolit,tila,tunniste,tyyppi,vekSelite,voimassa"
                           , etj2APIUrl() + "loilmoitukset.json?propertyName=sisainenTunniste,tila,toimitustapa,tunniste,tyyppi"
                           ].map(x => x + '&' + etj2Aikavali());
let hakuUrlitRT    = () => ['https://rata.digitraffic.fi/api/v1/trackwork-notifications.json'];
let hakuUrlitLR    = () => ['https://rata.digitraffic.fi/api/v1/trafficrestriction-notifications.json'];

let initDS = ds => {
    ds.requestOptions.requestHeaders = [{
        "key": "Digitraffic-User",
        "value": "Rafiikka"
    }];
}

let eiTilat = ['hyväksytty', 'luonnos', 'poistettu'];
let esTilat = ['hyväksytty', 'lähetetty', 'lisätietopyyntö', 'luonnos', 'peruttu', 'poistettu'];
let vsTilat = ['alustava', 'toteutuu', 'tehty', 'poistettu', 'vuosiohjelmissa (tila poistunut käytöstä)', 'käynnissä (tila poistunut käytöstä)'];
let loTilat = ['aktiivinen', 'poistettu'];

if (onkoSeed) {
    let seed = urls => {
        if (urls.length > 0) {
            log("seedataan", urls[0]);
            headJson(urls[0], () => seed(urls.slice(1)), undefined, () => seed(urls.slice(1)));
        } else {
            log("seedattu");
        }
    };

    seed([ratanumerotUrl(), liikennepaikkavalitUrl(), rautatieliikennepaikatUrl(), liikennepaikanOsatUrl(), raideosuudetUrl(), laituritUrl(),
     elementitUrl(), lorajatUrl(), infraObjektityypitUrl(),
     junasijainnitUrl(), junasijainnitGeojsonUrl(), kunnossapitoalueetMetaUrl(), liikenteenohjausalueetMetaUrl(), kayttokeskuksetMetaUrl(), liikennesuunnittelualueetMetaUrl(),
     ratapihapalveluTyypitUrl(), opastinTyypitUrl(), vaihdeTyypitUrl()]
     .concat(eiTilat.flatMap(tila => [eiUrlRatanumero()(tila), eiUrlAikataulupaikka()(tila)]))
     .concat(esTilat.flatMap(tila => [esUrlRatanumero()(tila), esUrlAikataulupaikka()(tila)]))
     .concat(vsTilat.flatMap(tila => [vsUrlRatanumero()(tila), vsUrlAikataulupaikka()(tila)]))
     .concat(loTilat.flatMap(tila => [loUrlRatanumero()(tila), loUrlAikataulupaikka()(tila)]))
     .concat(hakuUrlitInfra())
     .concat(hakuUrlitEtj2())
     .concat(hakuUrlitRT())
     .concat(hakuUrlitLR())
     .concat([asiatUrl(), eiUrlTilasto(), esUrlTilasto(), vsUrlTilasto()])
     .concat([ratapihapalvelutUrlTilasto(), toimialueetUrlTilasto(), tilirataosatUrlTilasto(), liikennesuunnittelualueetUrlTilasto(), paikantamismerkitUrlTilasto(),
            kilometrimerkitUrlTilasto(), radatUrlTilasto(), liikennepaikanOsatUrlTilasto(), rautatieliikennepaikatUrlTilasto(), liikennepaikkavalitUrlTilasto(), raideosuudetUrlTilasto(),
            akselinlaskijaUrlTilasto(), baliisiUrlTilasto(), kuumakayntiilmaisinUrlTilasto(), liikennepaikanrajaUrlTilasto(), opastinUrlTilasto(), puskinUrlTilasto(),
            pyoravoimailmaisinUrlTilasto(), raideeristysUrlTilasto(), pysaytyslaiteUrlTilasto(), rfidlukijaUrlTilasto(), ryhmityseristinUrlTilasto(), 
            sahkoistyspaattyyUrlTilasto(), seislevyUrlTilasto(), vaihdeUrlTilasto(), virroitinvalvontakameraUrlTilasto(), erotusjaksoUrlTilasto(), 
            erotuskenttaUrlTilasto(), maadoitinUrlTilasto(), tyonaikaineneristinUrlTilasto(), kaantopoytaUrlTilasto(), pyoraprofiilimittalaiteUrlTilasto(),
            telivalvontaUrlTilasto(), erotinUrlTilasto(), tasoristeysvalojenpyoratunnistinUrlTilasto(), raiteensulutUrlTilasto(), raiteetUrlTilasto(),
            liikenteenohjauksenrajatUrlTilasto(), tunnelitUrlTilasto(), sillatUrlTilasto(), laituritUrlTilasto(), tasoristeyksetUrlTilasto(), kayttokeskuksetUrlTilasto(), 
            kytkentaryhmatUrlTilasto()]));
};

let on   = (obj, event, f) => obj.on(event,   loggingDelegate(f));
let once = (obj, event, f) => obj.once(event, loggingDelegate(f));
let add  = (obj, name,  f) => obj.add(name,   loggingDelegate(f));

let monitor = (ds, type) => {
    ds.events.on("error", errorHandler);
    on(ds.events, "started", () => progressStart(type));
    on(ds.events, "ended", () => progressEnd(type));
}

let luoDatasource = (type, urlF, f) => {
    let ds = new am4core.DataSource();
    if (!onkoSeed) {
        ds.url = urlF();
        add(ds.adapter, "url", () => urlF());
    }
    initDS(ds);
    monitor(ds, type);
    on(ds.events, "parseended", ev => {
        logDiff("Parsitaan", type, () => {
            var ret = {};
            Object.values(ev.target.data).flat().forEach(x => f(ret, x));
            ev.target.data = ret;
        });
    });
    return ds;
};

let onkoOID      = str => str && str.match && str.match(/^(?:\d+\.)+(\d+)$/);
let onkoInfraOID = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.1\.)(\d+)\.([0-9.]+)$/);
let onkoJetiOID  = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.2\.)(\d+)\.([0-9.]+)$/);
let onkoRumaOID  = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.7\.)(\d+)\.([0-9.]+)$/);
let onkoTREXOID  = str => str && str.match && str.match(/^(?:1\.2\.246\.578\.1\.)(\d+)\.([0-9.]+)$/);

let onkoKoordinaatti   = str => str && str.match && str.match(/^(\d+)(?:\.\d+)?,[ ]?(\d+)(?:\.\d+)?$/);
let onkoRatakmSijainti = str => str && str.match && str.match(/^\(([^)]+)\)\s*(\d+)[+](\d+)$/);
let onkoPmSijainti     = str => str && str.match && str.match(/^(\d+)([+-])(\d+)$/);
let onkoRatakmVali     = str => str && str.match && str.match(/^\(([^)]+)\)\s*(\d+)[+](\d+)\s*-\s*(\d+)[+](\d+)$/);
let onkoRatanumero     = str => str && str.match && !onkoJeti(str) && !onkoRuma(str) && !onkoWKT(str) && str.match(/^\(([a-zA-Z0-9 ]+|[^a-zA-Z0-9 ]{1,6}(?: [^a-zA-Z0-9 ]{1,3})?)\)$/);
let onkoReitti         = str => str && str.match && str.match(/^(.*?)\s*((?:=>.*?)*\s*)(?:=>)\s*(.*?)$/);
let onkoRaide          = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.1\.44\.)([0-9.]+)$/);

let onkoInfra = str => onkoInfraOID(str) ||
                       onkoReitti(str) ||
                       onkoRatanumero(str) ||
                       onkoRatakmSijainti(str) ||
                       onkoRatakmVali(str) ||
                       onkoKoordinaatti(str) ||
                       onkoPmSijainti(str);

let onkoJeti  = str => onkoJetiOID(str) || str && str.match && str.match(/^(EI|ES|VS|LOI)(\d+)$/);
let onkoRuma  = str => onkoRumaOID(str) || str && str.match && str.match(/^(RT|LR)(\d+)$/);
let onkoTREX  = onkoTREXOID

let onkoJuna  = str => str && str.match && str.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})\s*\(?(\d+)\)?$/);

let onkoLOI   = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.2\.80\.|LOI)(\d+)$/);
let onkoEI    = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.2\.81\.|EI)(\d+)$/);
let onkoES    = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.2\.82\.|ES)(\d+)$/);
let onkoVS    = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.2\.83\.|VS)(\d+)$/);

let onkoRT    = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.7\.1\.|RT)(\d+)$/);
let onkoLR    = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.7\.2\.|LR)(\d+)$/);

let onkoWKT = str => str && str.match && str.match(/^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)(.*)$/);

let luoInfraAPIUrl = (str, time) => {
    let m = onkoInfraOID(str);
    if (m) {
        return infraAPIUrl()+ m[0] + '.json?' + (time ? 'time=' + time : infraAikavali());
    }
    m = onkoRatakmSijainti(str);
    if (m) {
        return ratakmSijaintiUrl(m[1], m[2], m[3], time);
    }
    m = onkoRatakmVali(str);
    if (m) {
        return ratakmValiUrl(m[1], m[2], m[3], m[4], m[5], time);
    }
    m = onkoRatanumero(str);
    if (m) {
        return ratanumeroUrl(m[1], time);
    }
    m = onkoPmSijainti(str);
    if (m) {
        return pmSijaintiUrl(m[1],m[2],m[3], time);
    }
    m = onkoReitti(str);
    if (m) {
        return reittiUrl(m[1], (m[2] ? m[2].split('=>').filter(x => x != '') : []), m[3], time);
    }
    m = onkoKoordinaatti(str);
    if (m) {
        var srs = undefined;
        if (m[1] > 999 && m[2] > 999) {
            // epsg:3067
            srs = undefined;
        } else if (m[1] < 50 && m[2] > 50) {
            // epsg:4326
            srs = 'srsName=epsg:4326';
        } else if (m[1] > 50 && m[2] < 50) {
            // crs:84
            srs = 'srsName=crs:84';
        }
        return koordinaattiUrl(m[1] + ',' + m[2],  srs, time);
    }
    m = onkoTREXOID(str);
    if (m) {
        return infraAPIUrl() + m[0] + '.json?' + (time ? 'time=' + time : infraAikavali());
    }
}

let luoEtj2APIUrl = (str, time) => {
    let m = onkoJetiOID(str)
    if (m) {
        return etj2APIUrl() + m[0] + '.json?' + (time ? 'time=' + time : '');
    }
    m = onkoJeti(str);
    if (m) {
        return etj2APIUrl(true) + m[0] + '.json?' + (time ? 'time=' + time : '');
    }
}

let luoRumaUrl = str => {
    let m = onkoRT(str);
    if (m) {
        return rtSingleUrl(m[0]);
    }
    m = onkoLR(str);
    if (m) {
        return lrSingleUrl(m[0]);
    }
}

let luoAikatauluUrl = str => {
    let m = onkoJuna(str);
    if (m) {
        return aikatauluAPIUrl + m[1] + '/' + m[2];
    }
}

// charts ei piirrä näkyviin laatikoita, jotka ovat 0-mittaisia suuntaan tai toiseen.
let fixPoints = x => {
    if (x.alkuX == x.loppuX) {
        x.loppuX = x.loppuX + 1;
    }
    if (x.alkuY == x.loppuY) {
        x.loppuY = x.loppuY + 1;
    }
    return x;
};

let onAttributeMutation = (attr) => (elem, callback) => {
    let observer = new MutationObserver(mutations => {
        mutations.forEach(callback);    
    });
    observer.observe(elem, { attributes : true, attributeFilter : [attr] });
};

let onStyleChange = onAttributeMutation('style');
let onTitleChange = onAttributeMutation('title');

let withoutProp = (obj, unwantedProp) => {
    var ret = {};
    for (var key in obj) {
        if (key !== unwantedProp) {
            ret[key] = obj[key];
        }
    }
    return ret;
};

let customPrettyPrinting = obj => {
    if (obj == null) {
        return null;
    } else if (obj.ratanumero && obj.alku && obj.loppu) {
        var x = '(' + obj.ratanumero + ') ' + obj.alku.ratakm + '+' + obj.alku.etaisyys + ' - ' + obj.loppu.ratakm + '+' + obj.loppu.etaisyys;
        return x + (obj.kohtaamissuunta == 'nouseva' ? ' ↑' : obj.kohtaamissuunta == 'laskeva' ? ' ↓' : (obj.kohtaamissuunta || ''));
    } else if (obj.ratanumero && obj.ratakm && obj.etaisyys) {
        var x = '(' + obj.ratanumero + ') ' + obj.ratakm + '+' + obj.etaisyys;
        return x + (obj.kohtaamissuunta == 'nouseva' ? ' ↑' : obj.kohtaamissuunta == 'laskeva' ? ' ↓' : (obj.kohtaamissuunta || ''));
    } else if (obj.numero && obj.etaisyys && obj.suunta) {
        var x = obj.numero + (obj.suunta == 'n' ? '+' : obj.suunta == 'l' ? '-' : obj.suunta) + obj.etaisyys;
        return x + (obj.kohtaamissuunta == 'nouseva' ? ' ↑' : obj.kohtaamissuunta == 'laskeva' ? ' ↓' : (obj.kohtaamissuunta || ''));
    } else if (typeof obj == 'string' && obj.startsWith('1.2.246.586.')) {
        return obj;
    } else if (typeof obj == 'string') {
        let dur = obj.match(/^(-?)P(\d+)([DWMY])$/);
        if (dur) {
            return (dur[1] == '-' ? 'edelliset ' : 'seuraavat ') + dur[2] + (
                dur[3] == 'D' ? ' päivää' :
                dur[3] == 'W' ? ' viikkoa' :
                dur[3] == 'M' ? ' kuukautta' :
                dur[3] == 'Y' ? ' vuotta' :
                obj);
        }
    }
    return obj;
};

let prettyPrint = obj => {
    if (obj == null) {
        return null;
    } else if (obj instanceof Array && obj.length > 0) {
        return '<span class="array">' + obj.map(prettyPrint).join('<br />') + '</span>';
    } else {
        let r = customPrettyPrinting(obj);
        if (typeof r == 'object') {
            r = Object.keys(obj)
                      .filter(x => obj.hasOwnProperty(x))
                      .map(key => {
                let val = obj[key];
                if (val instanceof Array && val.length === 0) {
                    // skip empty arrays
                    return '';
                } else {
                    return `<tr><th>${key}</th><td>${prettyPrint(val)}</td></tr>`;
                }
            }).join('');
            r = r === '' ? '' : '<table>' + r + '</table>';
        }
        return r;
    }
};

let escapeRegex = str => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

let generateId = () => 'id'+Math.random().toString(36).slice(2);

let splitString = str => {
    let m = str.match(/"[^"]+"|[^ ]+/g);
    return m ? m.map(x => x.replace(/^"|"$/g, '')) : [];
}

let luoInfoLinkki = (tunniste, time, peek) => onkoInfra(tunniste) || onkoJeti(tunniste) || onkoRatanumero(tunniste) || onkoJuna(tunniste) || onkoRuma(tunniste) ? `
    <li>
        <a href=""
           title='Avaa tietoja'
           class='infoikoni'
           onclick='avaaInfo("${tunniste}", event.pageX, event.pageY, ${time ? '"' + time + '"' : time}); return false;'
           ` + (peek ? `onmouseenter='kurkistaInfo(this, "${tunniste}", ([...document.querySelectorAll(".selectize-dropdown").values()].filter(x => x.style.display!="none")[0].offsetLeft + [...document.querySelectorAll(".selectize-dropdown").values()].filter(x => x.style.display!="none")[0].offsetWidth) + "px", (event.pageY-20) + "px", ${time ? '"' + time + '"' : time}); return false;'` : '') + `>
            ℹ️
        </a>
    </li>` : '';

let luoInfraAPILinkki = (tunniste, time) => onkoInfra(tunniste) ? `
    <li>
        <a href="${luoInfraAPIUrl(tunniste, time).replace('.json', '.html')}"
           title='Avaa Infra-API:ssa'
           class='infoikoni'
           onclick='window.open(this.getAttribute("href"),"_blank"); return false;'>
           <img src='https://rata.digitraffic.fi/infra-api/r/favicon.ico'
                alt='Avaa Infra-API:ssa' />
        </a>
    </li>
` : '';

let luoEtj2APILinkki = (tunniste, time) => onkoJeti(tunniste) ? `
    <li>
        <a href="${luoEtj2APIUrl(tunniste, time).replace('.json', '.html')}"
           title='Avaa Jeti-API:ssa'
           class='infoikoni'
           onclick='window.open(this.getAttribute("href"),"_blank"); return false;'>
            <img src='https://rata.digitraffic.fi/jeti-api/r/favicon.ico'
                 alt='Avaa Jeti-API:ssa' />
        </a>
    </li>
` : '';

let luoKarttaLinkki = (tunniste, title, time, peek) => onkoInfra(tunniste) || onkoTREX(tunniste) || onkoJeti(tunniste) || onkoRuma(tunniste) || onkoJuna(tunniste) ? `
    <li>
        <a href=""
           title='Avaa kartalla'
           class='infoikoni karttaikoni'
           onclick='kartta("${tunniste}", "${title.replaceAll(/<[^>]*>|&lt;.*?&gt;/g,'')}", ${time ? '"' + time + '"' : time}, true, event.pageX, event.pageY); return false;'
           ` + (peek ? `onmouseenter='kurkistaKartta(this, "${tunniste}", "${title.replaceAll(/<[^>]*>|&lt;.*?&gt;|\n/g,'')}", ${time ? '"' + time + '"' : time}, ([...document.querySelectorAll(".selectize-dropdown").values()].filter(x => x.style.display!="none")[0].offsetLeft + [...document.querySelectorAll(".selectize-dropdown").values()].filter(x => x.style.display!="none")[0].offsetWidth) + "px", (event.pageY-20) + "px"); return false;'` : '') + `/>
           🗺
        </a>
    </li>
` : '';

let luoAikatauluLinkki = (tunniste) => onkoJuna(tunniste) ? `
    <li>
        <a href=""
           title='Avaa aikataulu'
           class='infoikoni'
           onclick='luoJunaPopup("${onkoJuna(tunniste)[1]}", "${onkoJuna(tunniste)[2]}"); return false;' />
           📅
        </a>
    </li>
` : '';

let luoRaideLinkki = (tunniste) => onkoRaide(tunniste) ? `
    <li>
        <a href=""
           title='Avaa raiteen korkeuskäyrä'
           class='infoikoni'
           onclick='luoRaidePopup("${tunniste}"); return false;' />
           ⦧
        </a>
    </li>
` : '';

let luoGrafiikkaLinkki = tunniste => {
    let m = onkoRatanumero(tunniste);
    if (m) {
        return luoGrafiikkaLinkkiRatanumerolle(m[1]);
    }
    m = onkoReitti(tunniste);
    if (m) {
        return luoGrafiikkaLinkkiReitille([m[1]].concat(m[2] ? m[2].split('=>').filter(x => x != '') : []).concat(m[3]));
    }
    m = onkoJuna(tunniste);
    if (m) {
        return luoGrafiikkaLinkkiJunalle(m[1], m[2]);
    }
    m = onkoJeti(tunniste);
    if (m) {
        return luoGrafiikkaLinkkiJetille(m[0]);
    }
    return '';
}

let luoGrafiikkaLinkkiRatanumerolle = ratanumero => `
    <li>
        <a href=""
           title='Avaa työrakografiikalla'
           class='infoikoni'
           onclick='ratanumeroChanged("${ratanumero}"); return false;' />
           📈
        </a>
    </li>
`;

let luoGrafiikkaLinkkiReitille = reitti => {
    var r;
    if (reitti instanceof Array) {
        r = reitti;
    } else {
        let rr = onkoReitti(reitti).slice(1);
        r = [rr[1]].concat(rr[2] ? rr[2].split('=>').filter(x => x != '') : []).concat(rr[3]);
    }
    return `
        <li>
            <a href=""
            title='Avaa työrakografiikalla'
            class='infoikoni'
            onclick='aikataulupaikkaChanged("${r[0]}","${r[r.length-1]}",[${r.length > 2 ? r[1].split(',').map(x => '"' + x + '"').join(',') : ''}]); return false;' />
            📈
            </a>
        </li>
    `;
}

let luoGrafiikkaLinkkiJunalle = (lahtopaiva, junanumero) => `
    <li>
        <a href=""
           title='Avaa työrakografiikalla'
           class='infoikoni'
           onclick='valitseJuna({departureDate: "${lahtopaiva}", trainNumber: ${junanumero}}); return false;' />
           📈
        </a>
    </li>
`;

window.asetaEnnakkotietoGrafiikalle = tunniste => {
    let existingData = seriesEI.data.length > 0 && onkoEI(tunniste)  ? seriesEI.data :
                       seriesES.data.length > 0 && onkoES(tunniste)  ? seriesES.data :
                       seriesVS.data.length > 0 && onkoVS(tunniste)  ? seriesVS.data :
                       seriesLO.data.length > 0 && onkoLOI(tunniste) ? seriesLO.data : undefined;
    if (existingData) {
        ratanumeroChanged(existingData.filter(x => x.tunniste == tunniste || x.sisainenTunniste == tunniste)
                                      .map(x => x.ratakmvali)
                                      .sort(ratakmvaliComparator)
                                      .map(x => x.ratanumero)[0]);
    } else {
        haeEnnakkotiedonRatanumerotJaVoimassaolo(tunniste, (ratanumero, voimassa) => {
            ratanumeroChanged(ratanumero);
            asetaAikavali(voimassa);
        });
    }
};

let luoGrafiikkaLinkkiJetille = tunniste => !onkoJeti(tunniste) ? '' : `
<li>
    <a href=""
       title='Avaa työrakografiikalla'
       class='infoikoni'
       onclick='asetaEnnakkotietoGrafiikalle("${tunniste}"); return false;' />
       📈
    </a>
</li>
`;

let luoLinkit = (tyyppi, tunniste, karttaTitle, time) => `
<ul class="ikonit">${
    (tyyppi == 'grafiikka' ? '' : luoGrafiikkaLinkki(tunniste)) +
    (tyyppi == 'info'      ? '' : luoInfoLinkki(tunniste, time, tyyppi == '')) +
    (tyyppi == 'kartta'    ? '' : karttaTitle ? luoKarttaLinkki(tunniste, karttaTitle, time, tyyppi == '') : '') +
    (tyyppi == 'aikataulu' ? '' : luoAikatauluLinkki(tunniste)) +
    (tyyppi == 'raide'     ? '' : luoRaideLinkki(tunniste)) +
    luoInfraAPILinkki(tunniste, time) +
    luoEtj2APILinkki(tunniste, time)
}</ul>`

let lueTunniste = obj => obj.tunniste || (obj.trainNumber ? obj.departureDate + '(' + obj.trainNumber + ')' : undefined) || obj.id;
