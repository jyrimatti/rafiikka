
let log = (msg1, msg2, msg3, msg4, msg5, msg6) => {
    if (console && console.log) {
        console.log(dateFns.dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS'), ":", msg1, msg2, msg3, msg4, msg5, msg6);
    }
};

// https://stackoverflow.com/a/31732310
let isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
               navigator.userAgent &&
               navigator.userAgent.indexOf('CriOS') == -1 &&
               navigator.userAgent.indexOf('FxiOS') == -1;

let params = () => new URLSearchParams(window.location.hash.replace('#', '?'));

let sijaintiParam = () => params().get('sijainti') || '';
let aikaParam     = () => new Date(params().get("aika") || new Date().toISOString());
let kestoParam    = () => dateFns.durationFns.parse(params().get("kesto") || "P1D");

log("Parametri Sijainti", sijaintiParam());
log("Parametri Aika", aikaParam());
log("Parametri Kesto", kestoParam());

let paivitaUrl = (sijainti, aika, kesto) => {
    log("Päivitetään urlia");    
    let hash = '#aika=' + toISOStringNoMillis(aika) +
               '&kesto=' + dateFns.durationFns.toString(dateFns.durationFns.normalize(kesto)) +
               '&sijainti=' + (sijainti instanceof Array ? sijainti.join("-") : sijainti);
    window.location.hash = hash;
}

window.ikkuna = () => {
    let kesto = Math.floor(dateFns.durationFns.toMilliseconds(kestoParam()) / 2);
    let k = dateFns.durationFns.normalize({milliseconds: kesto});
    let ret = [dateFns.dateFns.sub(aikaParam(), k), dateFns.dateFns.add(aikaParam(), k)];
    return ret;
};
window.rajat  = () => [dateFns.dateFns.addDays(ikkuna()[0], -3), dateFns.dateFns.addDays(ikkuna()[1], 3)];

let pyoristaAjanhetki = x => dateFns.dateFns.format(x, "yyy-MM-dd'T00:00:00Z'");
let laajennaAikavali = x => [dateFns.dateFns.startOfMonth(x[1]), dateFns.dateFns.endOfMonth(x[1])];

let limitInterval = intervalString => {
    let begin = new Date('2010-01-01T00:00:00Z');
    let end = new Date('2030-01-01T00:00:00Z');
    let instants = intervalString.split('/');
    if (new Date(instants[0]).getTime() < begin.getTime()) {
        instants[0] = toISOStringNoMillis(begin);
    }
    if (new Date(instants[1]).getTime() > end.getTime()) {
        instants[1] = toISOStringNoMillis(end);
    }
    return instants[0] + '/' + instants[1];
};

// safari bugittaa cross-origin-redirectien kanssa, joten proxytetään safari oman palvelimen kautta.
let infraAPIUrl = 'https://' + (isSafari ? 'rafiikka.lahteenmaki.net' : 'rata.digitraffic.fi') + '/infra-api/0.6/';
let etj2APIUrl  = 'https://' + (isSafari ? 'rafiikka.lahteenmaki.net' : 'rata.digitraffic.fi') + '/jeti-api/0.6/';
let aikatauluAPIUrl = 'https://rata.digitraffic.fi/api/v1/trains/';
let graphQLUrl = 'https://rata.digitraffic.fi/api/v1/graphql/graphiql/?';

let mqttUrl = "rata.digitraffic.fi";
let mqttPort = 443;
let mqttTopic = 'train-locations/#';

let infraAikavali = () => 'time=' + pyoristaAjanhetki(aikaParam()) + "/" + pyoristaAjanhetki(aikaParam());
let etj2Aikavali  = () => 'time=' + laajennaAikavali(rajat()).map(function(x) { return pyoristaAjanhetki(x); }).join("/");
let rumaAikavali  = () => 'start=' + pyoristaAjanhetki(rajat()[0]) + "&end=" + pyoristaAjanhetki(rajat()[1]);

let junienEsitysaikavali = 1000*60*60*24*5;

let ratanumeroUrl             = ratanumero => infraAPIUrl + "radat.json?cql_filter=ratanumero='" + ratanumero + "'&" + infraAikavali();
let ratanumerotUrl            = () => infraAPIUrl + "radat.json?propertyName=ratakilometrit,ratanumero&" + infraAikavali();
let ratakmSijaintiUrl         = (ratanumero, ratakm, etaisyys) => infraAPIUrl + 'radat/' + ratanumero + '/' + ratakm + '+' + etaisyys + '.json?' + infraAikavali();
let ratakmValiUrl             = (ratanumero, alkuratakm, alkuetaisyys, loppuratakm, loppuetaisyys) => infraAPIUrl + 'radat/' + ratanumero + '/' + alkuratakm + '+' + alkuetaisyys + '-' + loppuratakm + '+' + loppuetaisyys + '.json?' + infraAikavali();
let liikennepaikkavalitUrl    = () => infraAPIUrl + "liikennepaikkavalit.json?propertyName=tunniste,alkuliikennepaikka,loppuliikennepaikka,ratakmvalit&" + infraAikavali();
let reittiUrl                 = (alku, etapit, loppu) => infraAPIUrl + "reitit/kaikki/" + alku + "/" + (/*TODO*/ false && etapit && etapit.length > 0 ? etapit.join(',') + '/' : '') + loppu + ".json?propertyName=liikennepaikat,liikennepaikanOsat,seisakkeet,linjavaihteet&" + infraAikavali();

let rautatieliikennepaikatUrl = () => infraAPIUrl + "rautatieliikennepaikat.json?propertyName=lyhenne,muutRatakmsijainnit,nimi,ratakmvalit,tunniste,tyyppi,uicKoodi,virallinenRatakmsijainti,virallinenSijainti&srsName=crs:84&" + infraAikavali();
let liikennepaikanOsatUrl     = () => infraAPIUrl + "liikennepaikanosat.json?propertyName=liikennepaikka,lyhenne,muutRatakmsijainnit,nimi,tunniste,uicKoodi,virallinenRatakmsijainti,virallinenSijainti&srsName=crs:84&" + infraAikavali();
let raideosuudetUrl           = () => infraAPIUrl + "aikataulupaikat.json?cql_filter=tyyppi=%27raideosuus%27&propertyName=geometria,tunniste.tunniste,tunniste.ratakmvalit,tunniste.turvalaiteNimi,tyyppi,uickoodi&srsName=crs:84&" + infraAikavali();
let laituritUrl               = () => infraAPIUrl + "aikataulupaikat.json?cql_filter=tyyppi=%27laituri%27&propertyName=geometria,tunniste.tunniste,tunniste.kuvaus,tunniste.laskennallisetRatakmvalit,tunniste.tunnus,tyyppi,uickoodi&srsName=crs:84&" + infraAikavali();

let elementitUrl              = () => infraAPIUrl + "elementit.json?propertyName=tunniste,nimi,ratakmsijainnit&" + infraAikavali();
let lorajatUrl                = () => infraAPIUrl + "liikenteenohjauksenrajat.json?propertyName=tunniste,leikkaukset.ratakmsijainnit&" + infraAikavali();

let eiUrlRatanumero = () => tila => etj2APIUrl + 'ennakkoilmoitukset.json?cql_filter=tila=%27' + tila + '%27&propertyName=ajankohdat,liikennevaikutusalue.laskennallisetRatakmvalit,sisainenTunniste,tunniste,voimassa&' + etj2Aikavali();
let esUrlRatanumero = () => tila => etj2APIUrl + 'ennakkosuunnitelmat.json?cql_filter=tila=%27' + tila + '%27&propertyName=sisainenTunniste,tyonosat.ajankohdat,tyonosat.tekopaikka.laskennallisetRatakmvalit,tunniste,voimassa&' + etj2Aikavali();
let vsUrlRatanumero = () => tila => etj2APIUrl + 'vuosisuunnitelmat.json?cql_filter=tila=%27' + tila + '%27&propertyName=ajankohdat,sisainenTunniste,tunniste,kohde.laskennallisetRatakmvalit,voimassa&' + etj2Aikavali();
let loUrlRatanumero = () => tila => etj2APIUrl + 'loilmoitukset.json?cql_filter=tila=%27' + tila + '%27&propertyName=ensimmainenAktiivisuusaika,ratakmvalit,sisainenTunniste,tunniste,viimeinenAktiivisuusaika&' + etj2Aikavali();

let eiUrlAikataulupaikka = () => tila => etj2APIUrl + 'ennakkoilmoitukset.json?cql_filter=tila=%27' + tila + '%27&propertyName=ajankohdat,liikennevaikutusalue.laskennallisetRatakmvalit,sisainenTunniste,tunniste,voimassa&' + etj2Aikavali();
let esUrlAikataulupaikka = () => tila => etj2APIUrl + 'ennakkosuunnitelmat.json?cql_filter=tila=%27' + tila + '%27&propertyName=sisainenTunniste,tyonosat.ajankohdat,tyonosat.tekopaikka.laskennallisetRatakmvalit,tunniste,voimassa&' + etj2Aikavali();
let vsUrlAikataulupaikka = () => tila => etj2APIUrl + 'vuosisuunnitelmat.json?cql_filter=tila=%27' + tila + '%27&propertyName=ajankohdat,sisainenTunniste,tunniste,kohde.laskennallisetRatakmvalit,voimassa&' + etj2Aikavali();
let loUrlAikataulupaikka = () => tila => etj2APIUrl + 'loilmoitukset.json?cql_filter=tila=%27' + tila + '%27&propertyName=ensimmainenAktiivisuusaika,ratakmvalit,sisainenTunniste,tunniste,viimeinenAktiivisuusaika&' + etj2Aikavali();

let junasijainnitUrl        = () => 'https://rata.digitraffic.fi/api/v1/train-locations/latest/';
let junasijainnitGeojsonUrl = () => 'https://rata.digitraffic.fi/api/v1/train-locations.geojson/latest/';

let ratakmMuunnosUrl       = coord => infraAPIUrl + 'koordinaatit/' + coord + '.json?propertyName=ratakmsijainnit&srsName=crs:84&' + infraAikavali();
let koordinaattiMuunnosUrl = (ratanumero, ratakm, etaisyys) => infraAPIUrl + 'radat/' + ratanumero + '/' + ratakm + '+' + etaisyys + '.geojson?propertyName=geometria&srsName=crs:84&' + infraAikavali();

let rtSingleUrl        = () => 'https://rata.digitraffic.fi/api/v1/trackwork-notifications/';
let rtSingleGeojsonUrl = () => 'https://rata.digitraffic.fi/api/v1/trackwork-notifications.geojson/';
let rtUrl              = () => tila => 'https://rata.digitraffic.fi/api/v1/trackwork-notifications.json?state=' + tila + '&' + rumaAikavali();
let rtGeojsonUrl       =       tila => 'https://rata.digitraffic.fi/api/v1/trackwork-notifications.geojson?state=' + tila + '&' + rumaAikavali();

let lrSingleUrl        = () => 'https://rata.digitraffic.fi/api/v1/trafficrestriction-notifications/';
let lrSingleGeojsonUrl = () => 'https://rata.digitraffic.fi/api/v1/trafficrestriction-notifications.geojson/';
let lrUrl              = () => tila => 'https://rata.digitraffic.fi/api/v1/trafficrestriction-notifications.json?state=' + tila + '&' + rumaAikavali();
let lrGeojsonUrl       =       tila => 'https://rata.digitraffic.fi/api/v1/trafficrestriction-notifications.geojson?state=' + tila + '&' + rumaAikavali();

let infraObjektityypitUrl = () => infraAPIUrl + "objektityypit.json";
let hakuUrlitInfra = () => [ infraAPIUrl + "ratapihapalvelut.json?propertyName=kuvaus,nimi,ratakmsijainnit,sahkokeskus.sahkokeskustyyppi,tunniste,tyyppi"
                           , infraAPIUrl + "toimialueet.json?propertyName=nimi,rttunnusvali,tunniste,valit.ratakmvali"
                           , infraAPIUrl + "tilirataosat.json?propertyName=nimi,numero,ratakmvalit,tunniste"
                           , infraAPIUrl + "liikennesuunnittelualueet.json?propertyName=nimi,tunniste"
                           , infraAPIUrl + "paikantamismerkit.json?propertyName=numero,ratakmsijainnit,tunniste"
                           , infraAPIUrl + "kilometrimerkit.json?propertyName=ratakm,ratanumero,tunniste"
                           , infraAPIUrl + "radat.json?propertyName=ratanumero,tunniste"
                           , infraAPIUrl + "liikennepaikanosat.json?propertyName=kuljettajaAikatauluNimi,lyhenne,maakoodi,muutRatakmsijainnit,nimi,tunniste,uicKoodi,virallinenRatakmsijainti"
                           , infraAPIUrl + "rautatieliikennepaikat.json?propertyName=kuljettajaAikatauluNimi,lyhenne,muutRatakmsijainnit,nimi,paaristeysasema,tunniste,tyyppi,uicKoodi,virallinenRatakmsijainti"
                           , infraAPIUrl + "liikennepaikkavalit.json?propertyName=alkuliikennepaikka,loppuliikennepaikka,tunniste"
                           , infraAPIUrl + "raideosuudet.json?propertyName=kaukoOhjausTunnisteet,tunniste,turvalaiteNimi,turvalaiteRaide,tyyppi,uicKoodi"
                           , infraAPIUrl + "elementit.json?propertyName=baliisi,kuumakayntiIlmaisin,kuvaus,nimi,opastin,pyorovoimailmaisin,raiteensulku,ratakmsijainnit,rfidLukija,ryhmityseristin,sahkoistysPaattyy,tunniste,tyyppi,vaihde,virroitinvalvontakamera"
                           , infraAPIUrl + "raiteet.json?propertyName=kaupallinenNumero,kayttotarkoitukset,kuvaus,linjaraidetunnukset,nopeusrajoitukset,tunniste,tunnus"
                           , infraAPIUrl + "liikenteenohjauksenrajat.json?propertyName=ensimmaisenLuokanAlueidenRaja,leikkaukset.ratakmsijainnit,tunniste"
                           , infraAPIUrl + "tunnelit.json?propertyName=nimi,tunniste"
                           , infraAPIUrl + "sillat.json?propertyName=kayttotarkoitus,nimi,laskennallisetRatakmvalit,siltakoodi,tunniste"
                           , infraAPIUrl + "laiturit.json?propertyName=kaupallinenNumero,kuvaus,laskennallisetRatakmvalit,tunniste,tunnus,uicKoodi"
                           , infraAPIUrl + "tasoristeykset.json?propertyName=nimi,tielaji,tunniste,tunnus,varoituslaitos,virallinenSijainti"
                           , infraAPIUrl + "kayttokeskukset.json?propertyName=nimi,tunniste"
                           , infraAPIUrl + "kytkentaryhmat.json?propertyName=numero,tunniste"
                           ].map(x => x + '&' + infraAikavali());
let hakuUrlitEtj2  = () => [ etj2APIUrl + "vuosisuunnitelmat.json?propertyName=alustavakapasiteettivaraus,liikennehaitta,liikennejarjestelyt,liikennerajoitteenLisatiedot,liikennerajoitteet,myohastymisvaikutus,sisainenTunniste,tila,tunniste,tyo,tyonlaji,tyonLisatiedot,urakoitsija.urakoitsija"
                           , etj2APIUrl + "ennakkosuunnitelmat.json?propertyName=kuvaus,organisaatio,projektinumerot,sisainenTunniste,tila,tilanLisatiedot,tunniste,tyyppi,tyonosat.alustavaKapasiteettirajoite,tyonosat.nopeusrajoitus,tyonosat.selite,tyonosat.tyyppi,urakoitsija.urakoitsija"
                           , etj2APIUrl + "ennakkoilmoitukset.json?propertyName=asia,eivekSelite,muutostyyppi,nopeusrajoitus,sisainenTunniste,suunta,symbolit,tila,tunniste,tyyppi,vekSelite"
                           , etj2APIUrl + "loilmoitukset.json?propertyName=sisainenTunniste,tila,toimitustapa,tunniste,tyyppi"
                           ].map(x => x + '&' + etj2Aikavali());
let hakuUrlitRT    = () => ['https://rata.digitraffic.fi/api/v1/trackwork-notifications.json'];
let hakuUrlitLR    = () => ['https://rata.digitraffic.fi/api/v1/trafficrestriction-notifications.json'];

let initDS = ds => {
    ds.requestOptions.requestHeaders = [/*{
        "key": "Digitraffic-User",
        "value": "Rafiikka"
    }*/];
}

let eiTilat = ['hyväksytty', 'luonnos', 'poistettu'];
let esTilat = ['hyväksytty', 'lähetetty', 'lisätietopyyntö', 'luonnos', 'peruttu', 'poistettu'];
let vsTilat = ['alustava', 'toteutuu', 'tehty', 'poistettu', 'vuosiohjelmissa (tila poistunut käytöstä)', 'käynnissä (tila poistunut käytöstä)'];
let loTilat = ['aktiivinen', 'poistettu'];

if (params().has("seed")) {
    [ratanumerotUrl(), liikennepaikkavalitUrl(), rautatieliikennepaikatUrl(), liikennepaikanOsatUrl(), raideosuudetUrl(), laituritUrl(),
     elementitUrl(), lorajatUrl(), infraObjektityypitUrl(),
     junasijainnitUrl(), junasijainnitGeojsonUrl()]
     .concat(eiTilat.flatMap(tila => [eiUrlRatanumero()(tila), eiUrlAikataulupaikka()(tila)]))
     .concat(esTilat.flatMap(tila => [esUrlRatanumero()(tila), esUrlAikataulupaikka()(tila)]))
     .concat(vsTilat.flatMap(tila => [vsUrlRatanumero()(tila), vsUrlAikataulupaikka()(tila)]))
     .concat(loTilat.flatMap(tila => [loUrlRatanumero()(tila), loUrlAikataulupaikka()(tila)]))
     .concat(hakuUrlitInfra())
     .concat(hakuUrlitEtj2())
     .concat(hakuUrlitRT())
     .concat(hakuUrlitLR()).forEach(url => {
        let ds = new am4core.DataSource();
        ds.url = url;
        initDS(ds);
        ds.load();
    });
    log("seedattu");
}

let errorHandler = ev => log("Virhe!", ev);

let loggingDelegate = f => (a, b, c) => {
    try {
        return f(a, b, c);
    } catch (e) {
        errorHandler(e);
        throw e;
    }
};

let on   = (obj, event, f) => obj.on(event,   loggingDelegate(f));
let once = (obj, event, f) => obj.once(event, loggingDelegate(f));
let add  = (obj, name,  f) => obj.add(name,   loggingDelegate(f));


window.loadingIndicator = new am4core.DataItem();
window.loadingIndicator.categories.aktiiviset = "";
window.loadingIndicator.values.count = {value: 0};

let monitor = (ds, type) => {
    ds.events.on("error", errorHandler);
    on(ds.events, "started", () => {
        loadingIndicator.setCategory("aktiiviset", loadingIndicator.categories.aktiiviset + " " + type);
        loadingIndicator.setValue("count", loadingIndicator.values.count.value + 1);
    });
    on(ds.events, "ended", () => {
        loadingIndicator.setCategory("aktiiviset", loadingIndicator.categories.aktiiviset.replace(" " + type, ""));
        loadingIndicator.setValue("count", loadingIndicator.values.count.value - 1);
    });
}

let luoDatasource = (type, urlF, f) => {
    let ds = new am4core.DataSource();
    ds.url = urlF();
    add(ds.adapter, "url", () => urlF());
    initDS(ds);
    monitor(ds, type);
    on(ds.events, "parseended", ev => {
        log("Parsitaan", type);
        var ret = {};
        Object.values(ev.target.data).flat().forEach(x => f(ret, x));
        ev.target.data = ret;
        log("Parsittu", type);
    });
    return ds;
};

let onkoOID      = str => str && str.match && str.match(/^(?:\d+\.)+(\d+)$/);
let onkoInfraOID = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.1\.)(\d+)\.(.+)$/);
let onkoJetiOID  = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.2\.)(\d+)\.(.+)$/);
let onkoRumaOID  = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.7\.)(\d+)\.(.+)$/);
let onkoTREXOID  = str => str && str.match && str.match(/^(?:1\.2\.246\.578\.1\.)(\d+)\.(.+)$/);

let onkoRatakmSijainti = str => str && str.match && str.match(/\(([^)]+)\)\s*(\d+)[+](\d+)$/);
let onkoRatakmVali     = str => str && str.match && str.match(/\(([^)]+)\)\s*(\d+)[+](\d+)\s*-\s*(\d+)[+](\d+)$/);
let onkoRatanumero     = str => str && str.match && str.match(/\(([^)]+)\)$/);
let onkoReitti         = str => str && str.match && str.match(/^(.*?)\s*(?:=>)\s*(?:(.*)(?:=>))?\s*(.*?)$/);

let onkoInfra = str => onkoInfraOID(str) ||
                       onkoReitti(str) ||
                       onkoRatanumero(str) ||
                       onkoRatakmSijainti(str) ||
                       onkoRatakmVali(str);

let onkoJeti  = str => onkoJetiOID(str) || str && str.match && str.match(/^(?:EI|ES|VS|LOI)(.+)$/);
let onkoRuma  = str => onkoRumaOID(str) || str && str.match && str.match(/^(?:RT|LR)(.+)$/);
let onkoTREX  = onkoTREXOID

let onkoJuna  = str => str && str.match && str.match(/([0-9]{4}-[0-9]{2}-[0-9]{2})\s*\(?(\d+)\)?$/);

let onkoLOI   = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.2\.80\.|LOI)(.+)$/);
let onkoEI    = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.2\.81\.|EI)(.+)$/);
let onkoES    = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.2\.82\.|ES)(.+)$/);
let onkoVS    = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.2\.83\.|VS)(.+)$/);

let onkoRT    = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.7\.1\.|RT)(.+)$/);
let onkoLR    = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.7\.2\.|LR)(.+)$/);

let luoInfraAPIUrl = str => {
    let m = onkoInfraOID(str);
    if (m) {
        return infraAPIUrl + m[0] + '.json?' + infraAikavali();
    }
    m = onkoRatakmSijainti(str);
    if (m) {
        return ratakmSijaintiUrl(m[1], m[2], m[3]);
    }
    m = onkoRatakmVali(str);
    if (m) {
        return ratakmValiUrl(m[1], m[2], m[3], m[4], m[5]);
    }
    m = onkoRatanumero(str);
    if (m) {
        return ratanumeroUrl(m[1]);
    }
    m = onkoReitti(str);
    if (m) {
        return reittiUrlGeojson(m[1], m[2], m[3]);
    }
    m = onkoTREXOID(str);
    if (m) {
        return infraAPIUrl + m[0] + '.json?' + infraAikavali();
    }
}

let luoEtj2APIUrl = str => {
    let m = onkoJeti(str);
    if (m) {
        return etj2APIUrl + m[0] + '.json' + etj2Aikavali();
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

let onStyleChange = (elem, callback) => {
    let observer = new MutationObserver(mutations => {
        mutations.forEach(callback);    
    });
    observer.observe(elem, { attributes : true, attributeFilter : ['style'] });
};

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
    }
    return obj;
};

let prettyPrint = obj => {
    if (obj == null) {
        return null;
    } else if (obj instanceof Array && obj.length > 0) {
        return '<span class="array">' + obj.map(customPrettyPrinting).join('<br />') + '</span>';
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

let toISOStringNoMillis = (d) => {
    let pad = n => n < 10 ? '0' + n : n;
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z';
};

let escapeRegex = str => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

let splitString = str => {
    let m = str.match(/"[^"]+"|[^ ]+/g);
    return m ? m.map(x => x.replace(/^"|"$/g, '')) : [];
}

let luoInfoLinkki = tunniste => `
    <li>
        <a href=''
           title='Avaa tietoja'
           class='infoikoni'
           onclick='avaaInfo("${tunniste}"); return false;'>
            ℹ️
        </a>
    </li>`;

let luoInfraAPILinkki = tunniste => `
    <li>
        <a href='${luoInfraAPIUrl(tunniste).replace('.json', '.html')}'
           title='Avaa Infra-API:ssa'
           class='infoikoni'
           onclick='window.open(this.getAttribute("href"),"_blank"); return false;'>
           <img src='${infraAPIUrl.replaceAll(/[/][^/]+[/]$/g, '/r/favicon.ico')}'
                alt='Avaa Infra-API:ssa' />
        </a>
    </li>`;

let luoEtj2APILinkki = tunniste => `
    <li>
        <a href='${luoEtj2APIUrl(tunniste).replace('.json', '.html')}'
           title='Avaa Jeti-API:ssa'
           class='infoikoni'
           onclick='window.open(this.getAttribute("href"),"_blank"); return false;'>
            <img src='${etj2APIUrl.replaceAll(/[/][^/]+[/]$/g, '/r/favicon.ico')}'
                 alt='Avaa Jeti-API:ssa' />
        </a>
    </li>
`

let luoKarttaLinkki = (tunniste, title, pathOrRumaLocation) => `
    <li>
        <a href=''
           title='Avaa kartalla'
           class='infoikoni'
           onclick='kartta("${tunniste}", "${title}", ` + (pathOrRumaLocation ? '"' + pathOrRumaLocation + '"' : pathOrRumaLocation) + `); return false;' />
           🗺
        </a>
    </li>
`

let luoAikatauluLinkki = (lahtopaiva, junanumero) => `
    <li>
        <a href=''
           title='Avaa aikataulu'
           class='infoikoni'
           onclick='luoJunaPopup("${lahtopaiva}", "${junanumero}"); return false;' />
           📅
        </a>
    </li>
`

let luoGrafiikkaLinkkiRatanumerolle = ratanumero => `
    <li>
        <a href=''
           title='Avaa työrakografiikalla'
           class='infoikoni'
           onclick='ratanumeroChanged("${ratanumero}"); return false;' />
           📈
        </a>
    </li>
`
let luoGrafiikkaLinkkiReitille = reitti => {
    var r;
    if (reitti instanceof Array) {
        r = reitti;
    } else {
        let rr = onkoReitti(reitti).slice(1);
        r = [rr[1]].concat(rr[2] ? rr[2].split(',') : []).concat(rr[3]);
    }
    return `
    <li>
        <a href=''
           title='Avaa työrakografiikalla'
           class='infoikoni'
           onclick='aikataulupaikkaChanged("${r[0]}","${r[r.length-1]}",[${r.length > 2 ? r[1].split(',').map(x => '"' + x + '"').join(',') : ''}]); return false;' />
           📈
        </a>
    </li>
`
}