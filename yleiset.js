
window.onkoSeed = () => window.location.hash == "#seed" || window.location.hash.endsWith("&seed")

let toISOStringNoMillis = (d) => {
    let pad = n => n < 10 ? '0' + n : n;
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z';
};

/*let parseInterval = str => {
    let instant = dateFns.dateFns.parse(str, "yyyy-MM-dd'T'HH:mm:ssX", new Date(0));
    if (!isNaN(instant.getTime())) {
        return [instant, instant, undefined, undefined];
    }
    let parts = str.split('/');
    if (parts.length == 1) {
        let instant = dateFns.dateFns.parse(parts[0], "yyyy-MM-dd'T'HH:mm:ssX", new Date(0));
        if (!isNaN(instant.getTime())) {
            return [instant, instant, undefined, undefined];
        }
    } else if (parts.length == 2) {
        let beginInstant  = dateFns.dateFns.parse(parts[0], "yyyy-MM-dd'T'HH:mm:ssX", new Date(0));
        let endInstant    = dateFns.dateFns.parse(parts[1], "yyyy-MM-dd'T'HH:mm:ssX", new Date(0));
        if (!isNaN(beginInstant.getTime()) && !isNaN(endInstant.getTime())) {
            return [beginInstant, endInstant, undefined, undefined];
        }
        
        let beginDuration;
        try {
            beginDuration = dateFns.durationFns.parse(parts[0]);
        } catch (_) {}
        let endDuration;
        try {
            endDuration = dateFns.durationFns.parse(parts[1]);
        } catch (_) {}
        if (!isNaN(beginInstant.getTime()) && endDuration) {
            let k = dateFns.durationFns.normalize({milliseconds: Math.floor(dateFns.durationFns.toMilliseconds(endDuration))});
            return [beginInstant, dateFns.dateFns.add(beginInstant, endDuration), undefined, endDuration];
        } else if (!isNaN(endInstant.getTime()) && beginDuration) {
            let k = dateFns.durationFns.normalize({milliseconds: Math.floor(dateFns.durationFns.toMilliseconds(beginDuration))});
            return [dateFns.dateFns.sub(endInstant, beginDuration), endInstant, beginDuration, undefined];
        }
    }
    return undefined;
}*/

/*let parseLayers = str => {
    let ret = str.split(',');
    if (ret.every(x => x.length == 2 || x.length == 3)) {
        return ret;
    }
    return undefined;
};*/

/*let parseStatePart = str => {
    if (str == hashPlaceholder.substring(1)) {
        return {};
    } else if (str == 'kartta' || str == 'map') {
        return {moodi: 'kartta'};
    } else if (str == 'kaavio' || str == 'diagram') {
        return {moodi: 'kaavio'};
    } else if (!isNaN(str)) {
        return {rotaatio: parseFloat(str)/360 * 2*Math.PI}
    } else {
        let layers = parseLayers(str);
        if (layers) {
            return {tasot: layers};
        } else {
            let interval = parseInterval(str);
            if (interval) {
                return {aika: interval};
            } else {
                return {sijainti: str};
            }
        }
    }
};*/

/*let pyoristaAjanhetki = x => {
    let y = new Date(x.getTime());
    y.setMinutes(0);
    y.setSeconds(0);
    y.setMilliseconds(0);
    return y;
};*/

/*let startOfDayUTC = x => {
    let y = new Date(x.getTime());
    y.setUTCHours(0);
    y.setUTCMinutes(0);
    y.setUTCSeconds(0);
    y.setUTCMilliseconds(0);
    return y;
};

let startOfMonthUTC = x => {
    let y = new Date(x.getTime());
    y.setUTCDate(1);
    y.setUTCHours(0);
    y.setUTCMinutes(0);
    y.setUTCSeconds(0);
    y.setUTCMilliseconds(0);
    return y;
};*/

/*let defaultAika = () => {
    let now = pyoristaAjanhetki(dateFns.dateFns.sub(new Date(), {hours: 1}));
    return [now, dateFns.dateFns.add(now, {hours: 4}), undefined, 'PT4H'];
};*/

//let defaultState = () => ({moodi:'kartta', aika: defaultAika(), sijainti: '(009)', rotaatio: 0, tasot: []});

/*let parseState = state => {
    let st = {};
    state.forEach(x => Object.entries(parseStatePart(decodeURIComponent(x))).forEach(kv => st[kv[0]] = kv[1]));
    return st;
}*/

//let getStates = () => window.location.hash.substring(1).split('#').filter(x => x != "").map(x => x.split('&')).map(parseState);

/*let getState = index => key => {
    let state = getStates()[index];
    if (!state) {
        return undefined;
    }
    return state[key];
};*/

/*let printDuration = dur => {
    let rounded = {minutes: Math.floor(dateFns.durationFns.toMinutes(dur))};
    return dur === undefined ? undefined : dateFns.durationFns.toString(dateFns.durationFns.normalize(rounded));
};

let printState = state => ((state.moodi && state.moodi != defaultState().moodi ? '&' + state.moodi : '') +
                           (state.aika ? '&' + (state.aika[0].getTime() == state.aika[1].getTime() ? toISOStringNoMillis(state.aika[0]) : (state.aika[2] && printDuration(dateFns.durationFns.parse(state.aika[2])) || toISOStringNoMillis(state.aika[0])) + '/' + (state.aika[3] && printDuration(dateFns.durationFns.parse(state.aika[3])) || toISOStringNoMillis(state.aika[1]))) : '') +
                           (state.sijainti ? '&' + (state.sijainti instanceof Array ? state.sijainti.join("-") : state.sijainti) : '') +
                           (state.rotaatio && state.rotaatio != 0 ? '&' + (state.rotaatio / (2*Math.PI) * 360) : '') +
                           (state.tasot && state.tasot instanceof Array && state.tasot.length > 0 ? '&' + state.tasot.join(',') : '')
                          ).substring(1);*/

let hashPlaceholder = '&loading...';

/*let setState = index => (key, val) => {
    log('Setting state', key, 'for', index, 'to', val);
    let states = getStates();
    if (!key) {
        states.splice(index, 1);
    } else {
        while (states.length <= index) {
            states.push({});
        }
        if (key == 'aika') {
            if (states[index][key] && states[index][key][2]) {
                val[2] = dateFns.durationFns.toString(dateFns.durationFns.between(val[0], val[1]));
            }
            if (states[index][key] && states[index][key][3]) {
                val[3] = dateFns.durationFns.toString(dateFns.durationFns.between(val[0], val[1]));
            }
        }
        states[index][key] = val;
    }
    window.location.hash = '#' + states.map(s => printState(s)).join('#') + hashPlaceholder;
};*/

window.addEventListener('hashchange', e => {
    if (e.newURL.indexOf(hashPlaceholder) > -1 || e.oldURL === e.newURL + hashPlaceholder) {
        window.location.hash = window.location.hash.replace(hashPlaceholder, '');
        e.stopImmediatePropagation();
    }
  }, false);

/*let getSubState = index => {
    let state = getState(index);
    if (state) {
        return key => state[key] || (key == 'aika' ? getMainState()[key].map((x,i) => i <= 1 ? startOfDayUTC(x) : x) : getMainState()[key]);
    }
    return key => getMainState()[key];
};*/

/*let setSubState = index => (key, val) => {
    let st = getState(index);
    st[key] = val;
    setState(index)(st);
};*/
//let clearSubState = index => setSubState(index)(undefined, undefined);
//let setMainState = setSubState(0);








window.log = (msg1, msg2, msg3, msg4, msg5, msg6) => {
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

/*let toISOStringNoMillis = (d) => {
    let pad = n => n < 10 ? '0' + n : n;
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z';
};*/

window.ikkuna = () => getMainState().aika;
window.rajat  = () => laajennaAikavali(getMainState().aika.slice(0, 2)); //[dateFns.dateFns.addDays(ikkuna()[0], -3), dateFns.dateFns.addDays(ikkuna()[1], 3)];

//let laajennaAikavali = x => [startOfMonthUTC(dateFns.dateFns.addMonths(x[0], -1)),
//                             startOfMonthUTC(dateFns.dateFns.addMonths(x[1], 1))];

/*let limitInterval = intervalString => {
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
};*/

/*let intervalsIntersect = a => b => {
    let as = a.split('/').map(x => new Date(x).getTime());
    let bs = b.split('/').map(x => new Date(x).getTime());
    return as[0] < bs[1] && bs[0] < as[1];
};*/

window.revisions = {
    infra: '',
    etj2: ''
};

// safari bugittaa cross-origin-redirectien kanssa, joten proxytetään safari oman palvelimen kautta.
// let infraAPIUrl = skipRevision => 'https://' + (isSafari || isLocal || onkoSeed ? 'rafiikka.lahteenmaki.net' : 'rata.digitraffic.fi') + '/infra-api/0.7/' + (skipRevision === true ? '' : window.revisions.infra);
// let etj2APIUrl  = skipRevision => 'https://' + (isSafari || isLocal || onkoSeed ? 'rafiikka.lahteenmaki.net' : 'rata.digitraffic.fi') + '/jeti-api/0.7/' + (skipRevision === true ? '' : window.revisions.etj2);
// let aikatauluAPIUrl = 'https://rata.digitraffic.fi/api/v1/trains/';
// let graphQLUrl = 'https://rata.digitraffic.fi/api/v1/graphql/graphiql/?';

// let mqttHost = "rata.digitraffic.fi";
// let mqttPort = 443;
// let mqttTopic = juna => 'train-locations/' + (juna ? juna.departureDate + '/' + juna.trainNumber : '#');

//let errorHandler = error => log("Virhe!", error, error.stack, new Error().stack);

let loggingDelegate = f => (a, b, c) => {
    try {
        return f(a, b, c);
    } catch (e) {
        errorHandler(e);
        throw e;
    }
};

window.progress = document.getElementById('progress');

/*let progressStart = type => {
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
};*/

let fetchJson = (url, opts, callback, errorCallback) => {
    let type = url.replace(/[?].*/,'')
                  .replace(/[.][^/]+$/, '')
                  .replace(/.*\/([^\/]+)$/, '$1');
    //progressStart(type);
    return fetch(url, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            'Digitraffic-User': 'Rafiikka'
        }
    }).then(response => opts.method == 'HEAD' ? response.text() : response.json())
      .then(x => {
          //progressEnd(type);
          return callback(x);
       })
      .catch(x => {
          //progressEnd(type);
          return (errorCallback || errorHandler)(x);
       });
}

window.GET  = (url, signal, errorCallback, callback, _) => onkoSeed() ? null : fetchJson(url, signal ? {method: 'GET', signal: signal} : {method: 'GET'}             , callback, errorCallback);
window.HEAD = (url, signal, errorCallback, callback, _) =>                   fetchJson(url, signal ? {method: 'HEAD', signal: signal} : {method: 'HEAD'}            , callback, errorCallback);
window.POST = (url, signal, errorCallback, callback, body) => onkoSeed() ? null : fetchJson(url, signal ? {method: 'POST', signal: signal, body: body} : {method: 'POST', body: body}, callback, errorCallback);

/*getJson(baseInfraAPIUrl(false) + 'revisions.json?count=1', data => {
    window.revisions.infra = data[0].revisio + '/';
    log("Saatiin infra-revisioksi", window.revisions.infra);
});
getJson(baseEtj2APIUrl(false) + 'revisions.json?count=1', data => {
    window.revisions.etj2 = data[0].revisio + '/';
    log("Saatiin etj2-revisioksi", window.revisions.etj2);
});*/

//let ikuisuusAlku = '2010-01-01T00:00:00Z';
//let ikuisuusLoppu = '2030-01-01T00:00:00Z';
//let ikuisuusAikavali = 'time=' + toISOStringNoMillis(ikuisuusAlku) + '/' + toISOStringNoMillis(ikuisuusLoppu);
// haetaan infra oletuksena päätilan alkuajanhetkellä
//let infraAikavali = () => 'time=' + toISOStringNoMillis(startOfDayUTC(getMainState().aika[0])) + "/" + toISOStringNoMillis(startOfDayUTC(getMainState().aika[0]));
// haetaan ennakkotiedot oletuksena päätilan aikakonteksti laajennettuna (+- kuukausi tms)
//let etj2Aikavali  = () => 'time=' + laajennaAikavali(getMainState().aika.slice(0,2)).map(toISOStringNoMillis).join("/");
// haetaan ratatyöt oletuksena tarkasti päätilan aikakontekstilla (ei cachetusta)
//let rumaAikavali  = () => 'start=' + getMainState().aika.slice(0,2).map(startOfDayUTC).map(toISOStringNoMillis).join("&end=");

//let ratanumeroUrl             = (ratanumero, time) => baseInfraAPIUrl(false) + "radat.json?cql_filter=ratanumero='" + ratanumero + "'&" + (time ? 'time=' + time : infraAikavali());
//let ratanumerotUrl            = () => baseInfraAPIUrl(false) + "radat.json?propertyName=ratakilometrit,ratanumero,objektinVoimassaoloaika&" + infraAikavali();
//let ratakmSijaintiUrl         = (ratanumero, ratakm, etaisyys, time) => baseInfraAPIUrl(false) + 'radat/' + ratanumero + '/' + ratakm + '+' + etaisyys + '.json?' + (time ? 'time=' + time : infraAikavali());
//let pmSijaintiUrl             = (numero, suunta, etaisyys, time) => baseInfraAPIUrl(false) + 'paikantamismerkit/' + numero + suunta + etaisyys + '.json?' + (time ? 'time=' + time : infraAikavali());
//let ratakmValiUrl             = (ratanumero, alkuratakm, alkuetaisyys, loppuratakm, loppuetaisyys, time) => baseInfraAPIUrl(false) + 'radat/' + ratanumero + '/' + alkuratakm + '+' + alkuetaisyys + '-' + loppuratakm + '+' + loppuetaisyys + '.json?' + (time ? 'time=' + time : infraAikavali());
//let liikennepaikkavalitUrl    = () => baseInfraAPIUrl(false) + "liikennepaikkavalit.json?propertyName=alkuliikennepaikka,loppuliikennepaikka,ratakmvalit,objektinVoimassaoloaika,tunniste&" + infraAikavali();
//let reittiUrl                 = (alku, etapit, loppu, time) => baseInfraAPIUrl(false) + "reitit/kaikki/" + alku + "/" + (etapit && etapit.length > 0 ? etapit.join(',') + '/' : '') + loppu + ".json?propertyName=geometria,liikennepaikat,liikennepaikanOsat,seisakkeet,linjavaihteet&" + (time ? 'time=' + time : infraAikavali());
//let reittihakuUrl             = (alku, etapit, loppu, time) => baseInfraAPIUrl(false) + "reitit/kaikki/" + alku + "/" + (etapit && etapit.length > 0 ? etapit.join(',') + '/' : '') + loppu + ".json?propertyName=liikennepaikat,liikennepaikanOsat,seisakkeet,linjavaihteet&" + (time ? 'time=' + time : infraAikavali());
//let ratapihapalveluTyypitUrl  = () => baseInfraAPIUrl(false) + "ratapihapalvelutyypit.json";
//let opastinTyypitUrl          = () => baseInfraAPIUrl(false) + "opastintyypit.json";
//let vaihdeTyypitUrl           = () => baseInfraAPIUrl(false) + "vaihdetyypit.json";

//let rautatieliikennepaikatUrl = () => baseInfraAPIUrl(false) + "rautatieliikennepaikat.json?propertyName=lyhenne,muutRatakmsijainnit,nimi,ratakmvalit,tunniste,tyyppi,uicKoodi,virallinenRatakmsijainti,virallinenSijainti,objektinVoimassaoloaika&srsName=crs:84&" + infraAikavali();
//let liikennepaikanOsatUrl     = () => baseInfraAPIUrl(false) + "liikennepaikanosat.json?propertyName=liikennepaikka,lyhenne,muutRatakmsijainnit,nimi,tunniste,uicKoodi,virallinenRatakmsijainti,virallinenSijainti,objektinVoimassaoloaika&srsName=crs:84&" + infraAikavali();
//let raideosuudetUrl           = () => baseInfraAPIUrl(false) + "aikataulupaikat.json?cql_filter=tyyppi=%27raideosuus%27&propertyName=geometria,tunniste.tunniste,tunniste.ratakmvalit,tunniste.turvalaiteNimi,tyyppi,uicKoodi,objektinVoimassaoloaika&srsName=crs:84&" + infraAikavali();
//let laituritUrl               = () => baseInfraAPIUrl(false) + "aikataulupaikat.json?cql_filter=tyyppi=%27laituri%27&propertyName=geometria,tunniste.tunniste,tunniste.kuvaus,tunniste.ratakmvalit,tunniste.tunnus,tyyppi,uicKoodi,objektinVoimassaoloaika&srsName=crs:84&" + infraAikavali();

//let elementitUrl              = () => baseInfraAPIUrl(false) + "elementit.json?propertyName=tunniste,nimi,ratakmsijainnit,objektinVoimassaoloaika&" + infraAikavali();
//let lorajatUrl                = () => baseInfraAPIUrl(false) + "liikenteenohjauksenrajat.json?propertyName=tunniste,leikkaukset.ratakmsijainnit,objektinVoimassaoloaika&" + infraAikavali();
//let raiteenKorkeudetUrl       = tunniste => baseInfraAPIUrl(false) + "raiteet/" + tunniste + ".json?propertyName=korkeuspisteet,ratakmvalit,tunnus&" + infraAikavali();

//let eiUrlRatanumero = () => tila => baseEtj2APIUrl(false) + 'ennakkoilmoitukset.json?cql_filter=tila=%27'  + tila + '%27&propertyName=ajankohdat,liikennevaikutusalue.laskennallisetRatakmvalit,sisainenTunniste,tunniste,voimassa&' + etj2Aikavali();
//let esUrlRatanumero = () => tila => baseEtj2APIUrl(false) + 'ennakkosuunnitelmat.json?cql_filter=tila=%27' + tila + '%27&propertyName=sisainenTunniste,tyonosat.ajankohdat,tyonosat.tekopaikka.laskennallisetRatakmvalit,tunniste,voimassa&' + etj2Aikavali();
//let vsUrlRatanumero = () => tila => baseEtj2APIUrl(false) + 'vuosisuunnitelmat.json?cql_filter=tila=%27'   + tila + '%27&propertyName=ajankohdat,sisainenTunniste,tunniste,kohde.laskennallisetRatakmvalit,voimassa&' + etj2Aikavali();
//let loUrlRatanumero = () => tila => baseEtj2APIUrl(false) + 'loilmoitukset.json?cql_filter=tila=%27'       + tila + '%27&propertyName=ensimmainenAktiivisuusaika,ratakmvalit,sisainenTunniste,tunniste,viimeinenAktiivisuusaika&' + etj2Aikavali();

//let eiUrlAikataulupaikka = () => tila => baseEtj2APIUrl(false) + 'ennakkoilmoitukset.json?cql_filter=tila=%27'  + tila + '%27&propertyName=ajankohdat,liikennevaikutusalue.laskennallisetRatakmvalit,sisainenTunniste,tunniste,voimassa&' + etj2Aikavali();
//let esUrlAikataulupaikka = () => tila => baseEtj2APIUrl(false) + 'ennakkosuunnitelmat.json?cql_filter=tila=%27' + tila + '%27&propertyName=sisainenTunniste,tyonosat.ajankohdat,tyonosat.tekopaikka.laskennallisetRatakmvalit,tunniste,voimassa&' + etj2Aikavali();
//let vsUrlAikataulupaikka = () => tila => baseEtj2APIUrl(false) + 'vuosisuunnitelmat.json?cql_filter=tila=%27'   + tila + '%27&propertyName=ajankohdat,sisainenTunniste,tunniste,kohde.laskennallisetRatakmvalit,voimassa&' + etj2Aikavali();
//let loUrlAikataulupaikka = () => tila => baseEtj2APIUrl(false) + 'loilmoitukset.json?cql_filter=tila=%27'       + tila + '%27&propertyName=ensimmainenAktiivisuusaika,ratakmvalit,sisainenTunniste,tunniste,viimeinenAktiivisuusaika&' + etj2Aikavali();

//let kunnossapitoalueetMetaUrl        = () => baseInfraAPIUrl(false) + "kunnossapitoalueet.json?propertyName=nimi,objektinVoimassaoloaika,tunniste&" + ikuisuusAikavali;
//let liikenteenohjausalueetMetaUrl    = () => baseInfraAPIUrl(false) + "liikenteenohjausalueet.json?propertyName=nimi,objektinVoimassaoloaika,tunniste&" + ikuisuusAikavali;
//let kayttokeskuksetMetaUrl           = () => baseInfraAPIUrl(false) + "kayttokeskukset.json?propertyName=nimi,objektinVoimassaoloaika,tunniste&" + ikuisuusAikavali;
//let liikennesuunnittelualueetMetaUrl = () => baseInfraAPIUrl(false) + "liikennesuunnittelualueet.json?propertyName=nimi,objektinVoimassaoloaika,tunniste&" + ikuisuusAikavali;

//let ratapihapalvelutUrlTilasto = () => baseInfraAPIUrl(false) + 'ratapihapalvelut.json?propertyName=objektinVoimassaoloaika,tunniste,tyyppi&' + ikuisuusAikavali;
//let toimialueetUrlTilasto = () => baseInfraAPIUrl(false) + 'toimialueet.json?propertyName=liikenteenohjausalue,objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
//let tilirataosatUrlTilasto = () => baseInfraAPIUrl(false) + 'tilirataosat.json?propertyName=kunnossapitoalue,objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
//let liikennesuunnittelualueetUrlTilasto = () => baseInfraAPIUrl(false) + 'liikennesuunnittelualueet.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
//let paikantamismerkitUrlTilasto = () => baseInfraAPIUrl(false) + 'paikantamismerkit.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
//let kilometrimerkitUrlTilasto = () => baseInfraAPIUrl(false) + 'kilometrimerkit.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
//let radatUrlTilasto = () => baseInfraAPIUrl(false) + 'radat.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
//let liikennepaikanOsatUrlTilasto = () => baseInfraAPIUrl(false) + 'liikennepaikanosat.json?propertyName=liikennesuunnittelualueet,objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
//let rautatieliikennepaikatUrlTilasto = () => baseInfraAPIUrl(false) + 'rautatieliikennepaikat.json?propertyName=liikennesuunnittelualueet,objektinVoimassaoloaika,tunniste,tyyppi&' + ikuisuusAikavali;
//let liikennepaikkavalitUrlTilasto = () => baseInfraAPIUrl(false) + 'liikennepaikkavalit.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
//let raideosuudetUrlTilasto = () => baseInfraAPIUrl(false) + 'raideosuudet.json?propertyName=objektinVoimassaoloaika,tunniste,tyyppi&' + ikuisuusAikavali;

//let akselinlaskijaUrlTilasto                   = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=akselinlaskija&' + ikuisuusAikavali;
//let baliisiUrlTilasto                          = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=baliisi.tyyppi,kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=baliisi&' + ikuisuusAikavali;
//let kuumakayntiilmaisinUrlTilasto              = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=kuumakayntiilmaisin&' + ikuisuusAikavali;
//let liikennepaikanrajaUrlTilasto               = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=liikennepaikanraja&' + ikuisuusAikavali;
//let opastinUrlTilasto                          = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=opastin.tyyppi,kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=opastin&' + ikuisuusAikavali;
//let puskinUrlTilasto                           = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=puskin&' + ikuisuusAikavali;
//let pyoravoimailmaisinUrlTilasto               = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=pyoravoimailmaisin&' + ikuisuusAikavali;
//let raideeristysUrlTilasto                     = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=raideeristys&' + ikuisuusAikavali;
//let pysaytyslaiteUrlTilasto                    = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,pysaytyslaite.kasinAsetettava,pysaytyslaite.varmuuslukittu,tunniste&typeNames=pysaytyslaite&' + ikuisuusAikavali;
//let rfidlukijaUrlTilasto                       = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=rfidlukija&' + ikuisuusAikavali;
//let ryhmityseristinUrlTilasto                  = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,ryhmityseristin.nopeastiAjettava,tunniste&typeNames=ryhmityseristin&' + ikuisuusAikavali;
//let sahkoistyspaattyyUrlTilasto                = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=sahkoistyspaattyy&' + ikuisuusAikavali;
//let seislevyUrlTilasto                         = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=seislevy&' + ikuisuusAikavali;
//let vaihdeUrlTilasto                           = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste,vaihde.tyyppi&typeNames=vaihde&' + ikuisuusAikavali;
//let virroitinvalvontakameraUrlTilasto          = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=virroitinvalvontakamera&' + ikuisuusAikavali;
//let erotusjaksoUrlTilasto                      = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=erotusjakso&' + ikuisuusAikavali;
//let erotuskenttaUrlTilasto                     = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=erotuskentta&' + ikuisuusAikavali;
//let maadoitinUrlTilasto                        = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=maadoitin&' + ikuisuusAikavali;
//let tyonaikaineneristinUrlTilasto              = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=tyonaikaineneristin&' + ikuisuusAikavali;
//let kaantopoytaUrlTilasto                      = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=kaantopoyta&' + ikuisuusAikavali;
//let pyoraprofiilimittalaiteUrlTilasto          = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=pyoraprofiilimittalaite&' + ikuisuusAikavali;
//let telivalvontaUrlTilasto                     = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=telivalvonta&' + ikuisuusAikavali;
//let erotinUrlTilasto                           = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=erotin&' + ikuisuusAikavali;
//let tasoristeysvalojenpyoratunnistinUrlTilasto = () => baseInfraAPIUrl(false) + 'elementit.json?propertyName=kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste&typeNames=tasoristeysvalojenpyoratunnistin&' + ikuisuusAikavali;

//let raiteensulutUrlTilasto = () => baseInfraAPIUrl(false) + 'raiteensulut.json?propertyName=kasinAsetettava,objektinVoimassaoloaika,tunniste,varmuuslukittu&' + ikuisuusAikavali;
//let raiteetUrlTilasto = () => baseInfraAPIUrl(false) + 'raiteet.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
//let liikenteenohjauksenrajatUrlTilasto = () => baseInfraAPIUrl(false) + 'liikenteenohjauksenrajat.json?propertyName=ensimmaisenLuokanAlueidenRaja,objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
//let tunnelitUrlTilasto = () => baseInfraAPIUrl(false) + 'tunnelit.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
//let sillatUrlTilasto = () => baseInfraAPIUrl(false) + 'sillat.json?propertyName=kayttotarkoitus,objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
//let laituritUrlTilasto = () => baseInfraAPIUrl(false) + 'laiturit.json?propertyName=korkeus,objektinVoimassaoloaika,tunniste,tyyppi&' + ikuisuusAikavali;
//let tasoristeyksetUrlTilasto = () => baseInfraAPIUrl(false) + 'tasoristeykset.json?propertyName=kayttokeskukset,objektinVoimassaoloaika,tielaji,tunniste,varoituslaitos&' + ikuisuusAikavali;
//let kayttokeskuksetUrlTilasto = () => baseInfraAPIUrl(false) + 'kayttokeskukset.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;
//let kytkentaryhmatUrlTilasto = () => baseInfraAPIUrl(false) + 'kytkentaryhmat.json?propertyName=objektinVoimassaoloaika,tunniste&' + ikuisuusAikavali;

//let asiatUrl     = () => baseEtj2APIUrl(false) + 'asiat.json';
//let esTyypitUrl  = () => baseEtj2APIUrl(false) + 'ennakkosuunnitelmatyypit.json';
//let loUrlTilasto = () => baseEtj2APIUrl(false) + 'loilmoitukset.json?propertyName=ensimmainenAktiivisuusaika,luontiaika,tila,tunniste,tyyppi,viimeinenAktiivisuusaika&' + ikuisuusAikavali;
//let eiUrlTilasto = () => baseEtj2APIUrl(false) + 'ennakkoilmoitukset.json?propertyName=asia,luontiaika,tila,tunniste,tyyppi,voimassa&' + ikuisuusAikavali;
//let esUrlTilasto = () => baseEtj2APIUrl(false) + 'ennakkosuunnitelmat.json?propertyName=luontiaika,tila,tunniste,tyyppi,voimassa&' + ikuisuusAikavali;
//let vsUrlTilasto = () => baseEtj2APIUrl(false) + 'vuosisuunnitelmat.json?propertyName=alustavakapasiteettivaraus,luontiaika,tila,tunniste,tyo,tyonlaji,voimassa&' + ikuisuusAikavali;

/*let luotujaInfraUrl = (path, duration, typeNames) => baseInfraAPIUrl(true) + path + '.json?cql_filter=start(objektinVoimassaoloaika)>=start(time)+AND+start(objektinVoimassaoloaika)<end(time)&propertyName=objektinVoimassaoloaika,tunniste&' + (typeNames ? 'typeNames=' + typeNames + '&' : '') + 'duration=' + duration;
let poistuneitaInfraUrl = (path, duration, typeNames) => baseInfraAPIUrl(true) + path + '.json?cql_filter=end(objektinVoimassaoloaika)>=start(time)+AND+end(objektinVoimassaoloaika)<end(time)&propertyName=objektinVoimassaoloaika,tunniste&' + (typeNames ? 'typeNames=' + typeNames + '&' : '') + 'duration=' + duration;
let infraMuutoksetUrl = (name, path, typeNames) => duration => ({
    nimi:        name,
    luotuja:     luotujaInfraUrl(path, duration, typeNames),
    poistuneita: poistuneitaInfraUrl(path, duration, typeNames)
});

let luotujaEtj2Url = (path, duration) => baseEtj2APIUrl(true) + path + '.json?cql_filter=start(voimassa)>=start(time)+AND+start(voimassa)<end(time)&propertyName=sisainenTunniste,tunniste,voimassa&duration=' + duration;
let poistuneitaEtj2Url = (path, duration) => baseEtj2APIUrl(true) + path + '.json?cql_filter=end(voimassa)>=start(time)+AND+end(voimassa)<end(time)&propertyName=sisainenTunniste,tunniste,voimassa&duration=' + duration;
let etj2MuutoksetUrl = (name, path) => duration => ({
    nimi:        name,
    luotuja:     luotujaEtj2Url(path, duration),
    poistuneita: poistuneitaEtj2Url(path, duration)
});*/

/*let muutoksetInfra = [
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
];*/

//let junasijainnitUrl        = () => 'https://rata.digitraffic.fi/api/v1/train-locations/latest/';
//let junasijainnitGeojsonUrl = () => 'https://rata.digitraffic.fi/api/v1/train-locations.geojson/latest/';

//let koordinaattiUrl        = (coord, srsName, time) => baseInfraAPIUrl(false) + 'koordinaatit/' + coord[0] + "," + coord[1] + '.json?' + (srsName ? 'srsName=' + srsName + '&' : '') + (time ? 'time=' + time : infraAikavali());
//let ratakmMuunnosUrl       = coord => baseInfraAPIUrl(false) + 'koordinaatit/' + coord + '.json?propertyName=ratakmsijainnit,haetunDatanVoimassaoloaika&srsName=crs:84&' + infraAikavali();
//let koordinaattiMuunnosUrl = (ratanumero, ratakm, etaisyys) => baseInfraAPIUrl(false) + 'radat/' + ratanumero + '/' + ratakm + '+' + etaisyys + '.geojson?propertyName=geometria,haetunDatanVoimassaoloaika&srsName=crs:84&' + infraAikavali();

//let rtUrl              = tila => 'https://rata.digitraffic.fi/api/v1/trackwork-notifications.json?'    + (tila ? 'state=' + tila + '&' : '') + rumaAikavali();
//let rtSingleUrl        = (tunniste) => 'https://rata.digitraffic.fi/api/v1/trackwork-notifications/'         + tunniste + '/latest.json';
//let rtGeojsonUrl       =       tila => 'https://rata.digitraffic.fi/api/v1/trackwork-notifications.geojson?' + (tila ? 'state=' + tila + '&' : '') + rumaAikavali();

//let lrUrl              = tila => 'https://rata.digitraffic.fi/api/v1/trafficrestriction-notifications.json?'    + (tila ? 'state=' + tila + '&' : '') + rumaAikavali();
//let lrSingleUrl        = (tunniste) => 'https://rata.digitraffic.fi/api/v1/trafficrestriction-notifications/'         + tunniste + '/latest.json';
//let lrGeojsonUrl       =       tila => 'https://rata.digitraffic.fi/api/v1/trafficrestriction-notifications.geojson?' + (tila ? 'state=' + tila + '&' : '') + rumaAikavali();

//let infraObjektityypitUrl = () => baseInfraAPIUrl(true) + "objektityypit.json";
/*let hakuUrlitInfra = () => [ baseInfraAPIUrl(false) + "ratapihapalvelut.json?propertyName=kuvaus,nimi,ratakmsijainnit,sahkokeskus.sahkokeskustyyppi,tunniste,tyyppi"
                           , baseInfraAPIUrl(false) + "toimialueet.json?propertyName=nimi,rttunnusvali,tunniste,valit.ratakmvali"
                           , baseInfraAPIUrl(false) + "tilirataosat.json?propertyName=nimi,numero,ratakmvalit,tunniste"
                           , baseInfraAPIUrl(false) + "liikennesuunnittelualueet.json?propertyName=nimi,tunniste"
                           , baseInfraAPIUrl(false) + "paikantamismerkit.json?propertyName=liikennepaikkavalit,numero,ratakmsijainnit,rautatieliikennepaikka,tunniste"
                           , baseInfraAPIUrl(false) + "kilometrimerkit.json?propertyName=ratakm,ratanumero,tunniste"
                           , baseInfraAPIUrl(false) + "radat.json?propertyName=ratanumero,tunniste"
                           , baseInfraAPIUrl(false) + "liikennepaikanosat.json?propertyName=kuljettajaAikatauluNimi,liikennepaikka,lyhenne,maakoodi,muutRatakmsijainnit,nimi,tunniste,uicKoodi,virallinenRatakmsijainti"
                           , baseInfraAPIUrl(false) + "rautatieliikennepaikat.json?propertyName=kuljettajaAikatauluNimi,lyhenne,muutRatakmsijainnit,nimi,paaristeysasema,tunniste,tyyppi,uicKoodi,virallinenRatakmsijainti"
                           , baseInfraAPIUrl(false) + "liikennepaikkavalit.json?propertyName=alkuliikennepaikka,loppuliikennepaikka,tunniste"
                           , baseInfraAPIUrl(false) + "raideosuudet.json?propertyName=kaukoOhjausTunnisteet,liikennepaikkavalit,rautatieliikennepaikat,tunniste,turvalaiteNimi,turvalaiteRaide,tyyppi,uicKoodi"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=akselinlaskija"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=baliisi,kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=baliisi"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuumakayntiIlmaisin,kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=kuumakayntiilmaisin"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=liikennepaikanraja"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,opastin,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=opastin"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=puskin"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,pyoravoimailmaisin,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=pyoravoimailmaisin"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=raideeristys"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,pysaytyslaite,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=pysaytyslaite"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,rfidLukija,tunniste,tyyppi&typeNames=rfidlukija"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,ryhmityseristin,tunniste,tyyppi&typeNames=ryhmityseristin"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,sahkoistysPaattyy,tunniste,tyyppi&typeNames=sahkoistyspaattyy"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=seislevy"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi,vaihde&typeNames=vaihde"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi,virroitinvalvontakamera&typeNames=virroitinvalvontakamera"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=erotusjakso"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=erotuskentta"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=maadoitin"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=tyonaikaineneristin"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kaantopoyta,kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=kaantopoyta"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,pyoraprofiiliMittalaite,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=pyoraprofiilimittalaite"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,telivalvonta,tunniste,tyyppi&typeNames=telivalvonta"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=erotin"
                           , baseInfraAPIUrl(false) + "elementit.json?propertyName=kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi&typeNames=tasoristeysvalojenpyoratunnistin"
                           , baseInfraAPIUrl(false) + "raiteensulut.json?propertyName=kasinAsetettava,nimi,tunniste,varmuuslukittu"
                           , baseInfraAPIUrl(false) + "raiteet.json?propertyName=kaupallinenNumero,kayttotarkoitukset,kuvaus,liikennepaikkavalit,linjaraidetunnukset,nopeusrajoitukset,rautatieliikennepaikat,tunniste,tunnus"
                           , baseInfraAPIUrl(false) + "liikenteenohjauksenrajat.json?propertyName=ensimmaisenLuokanAlueidenRaja,leikkaukset.ratakmsijainnit,tunniste"
                           , baseInfraAPIUrl(false) + "tunnelit.json?propertyName=nimi,tunniste"
                           , baseInfraAPIUrl(false) + "sillat.json?propertyName=kayttotarkoitus,nimi,ratakmvalit,siltakoodi,tunniste"
                           , baseInfraAPIUrl(false) + "laiturit.json?propertyName=kaupallinenNumero,kuvaus,liikennepaikanOsa,ratakmvalit,rautatieliikennepaikka,tunniste,tunnus,uicKoodi"
                           , baseInfraAPIUrl(false) + "tasoristeykset.json?propertyName=liikennepaikkavalit,nimi,rautatieliikennepaikat,tielaji,tunniste,tunnus,varoituslaitos,virallinenSijainti"
                           , baseInfraAPIUrl(false) + "kayttokeskukset.json?propertyName=nimi,tunniste"
                           , baseInfraAPIUrl(false) + "kytkentaryhmat.json?propertyName=numero,rautatieliikennepaikat,tunniste"
                           ].map(x => x + '&' + infraAikavali());*/
/*let hakuUrlitEtj2  = () => [ baseEtj2APIUrl(false) + "vuosisuunnitelmat.json?propertyName=alustavakapasiteettivaraus,liikennehaitta,liikennejarjestelyt,liikennerajoitteenLisatiedot,liikennerajoitteet,myohastymisvaikutus,sisainenTunniste,tila,tunniste,tyo,tyonlaji,tyonLisatiedot,urakoitsija.urakoitsija,voimassa"
                           , baseEtj2APIUrl(false) + "ennakkosuunnitelmat.json?propertyName=kuvaus,organisaatio,projektinumerot,sisainenTunniste,tila,tilanLisatiedot,tunniste,tyyppi,tyonosat.alustavaKapasiteettirajoite,tyonosat.nopeusrajoitus,tyonosat.selite,tyonosat.tyyppi,urakoitsija.urakoitsija,voimassa"
                           , baseEtj2APIUrl(false) + "ennakkoilmoitukset.json?propertyName=asia,eivekSelite,muutostyyppi,nopeusrajoitus,sisainenTunniste,suunta,symbolit,tila,tunniste,tyyppi,vekSelite,voimassa"
                           , baseEtj2APIUrl(false) + "loilmoitukset.json?propertyName=sisainenTunniste,tila,toimitustapa,tunniste,tyyppi"
                           ].map(x => x + '&' + etj2Aikavali());*/
//let hakuUrlitRT    = () => ['https://rata.digitraffic.fi/api/v1/trackwork-notifications.json'];
//let hakuUrlitLR    = () => ['https://rata.digitraffic.fi/api/v1/trafficrestriction-notifications.json'];

/*let initDS = ds => {
    ds.requestOptions.requestHeaders = [{
        "key": "Digitraffic-User",
        "value": "Rafiikka"
    }];
}*/

if (onkoSeed()) {
    let seed = urls => {
        if (urls.length > 0) {
            log("seedataan", urls[0]);
            headJson(urls[0], () => seed(urls.slice(1)), undefined, () => seed(urls.slice(1)));
        } else {
            log("seedattu");
        }
    };

    seed([]
     .concat([ratanumerotUrl(), liikennepaikkavalitUrl(), rautatieliikennepaikatUrl(), liikennepaikanOsatUrl(), raideosuudetUrl(), laituritUrl(),
              elementitUrl(), lorajatUrl(), infraObjektityypitUrl(),
              junasijainnitUrl, junasijainnitGeojsonUrl, kunnossapitoalueetMetaUrl(), liikenteenohjausalueetMetaUrl(), kayttokeskuksetMetaUrl(), liikennesuunnittelualueetMetaUrl(),
              ratapihapalveluTyypitUrl(), opastinTyypitUrl(), vaihdeTyypitUrl()])
     .concat(eiTilat.flatMap(tila => [eiUrlRatanumero(tila), eiUrlAikataulupaikka()(tila)]))
     .concat(esTilat.flatMap(tila => [esUrlRatanumero(tila), esUrlAikataulupaikka()(tila)]))
     .concat(vsTilat.flatMap(tila => [vsUrlRatanumero(tila), vsUrlAikataulupaikka()(tila)]))
     .concat(loiTilat.flatMap(tila => [loUrlRatanumero(tila), loUrlAikataulupaikka()(tila)]))
     .concat(hakuUrlitInfra())
     .concat(hakuUrlitEtj2())
     .concat(hakuUrlitRuma())
     .concat(muutoksetInfra(document.getElementById('delta1').value + 'P' + document.getElementById('delta2').value + document.getElementById('delta3').value).flatMap(x => [x.luotuja, x.poistuneita]))
     .concat(muutoksetEtj2(document.getElementById('delta1').value + 'P' + document.getElementById('delta2').value + document.getElementById('delta3').value).flatMap(x => [x.luotuja, x.poistuneita]))
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

window.on   = (obj, event, f) => obj.on(event,   loggingDelegate(f));
window.once = (obj, event, f) => obj.once(event, loggingDelegate(f));
window.add  = (obj, name,  f) => obj.add(name,   loggingDelegate(f));

/*let monitor = (ds, type) => {
    ds.events.on("error", errorHandler);
    on(ds.events, "started", () => progressStart(type));
    on(ds.events, "ended", () => progressEnd(type));
}*/

let luoDatasource = (type, urlF, f) => {
    let ds = new am4core.DataSource();
    if (!onkoSeed()) {
        ds.url = urlF();
        add(ds.adapter, "url", () => urlF());
    }
    initDS(ds);
    monitor(ds, type);
    on(ds.events, "parseended", ev => {
        if (ev.target.data) {
            logDiff("Parsitaan", type, () => {
                var ret = {};
                Object.values(ev.target.data).flat().forEach(x => f(ret, x));
                ev.target.data = ret;
            });
        } else {
            console.error("Ei dataa!");
        }
    });
    return ds;
};

//let onkoOID      = str => str && str.match && str.match(/^(?:\d+\.)+(\d+)$/);
//let onkoInfraOID = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.1\.)(\d+)\.([0-9.]+)$/);
//let onkoJetiOID  = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.2\.)(\d+)\.([0-9.]+)$/);
//let onkoRumaOID  = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.7\.)(\d+)\.([0-9.]+)$/);
//let onkoTREXOID  = str => str && str.match && str.match(/^(?:1\.2\.246\.578\.1\.)(\d+)\.([0-9.]+)$/);

//let onkoKoordinaatti   = str => str && str.match && str.match(/^(\d+)(?:\.\d+)?,[ ]?(\d+)(?:\.\d+)?$/);
//let onkoRatakmSijainti = str => str && str.match && str.match(/^\(([^)]+)\)\s*(\d+)[+](\d+)$/);
//let onkoPmSijainti     = str => str && str.match && str.match(/^(\d+)([+-])(\d+)$/);
//let onkoRatakmVali     = str => str && str.match && str.match(/^\(([^)]+)\)\s*(\d+)[+](\d+)\s*-\s*(\d+)[+](\d+)$/);
//let onkoRatanumero     = str => str && str.match && !onkoJeti(str) && !onkoRuma(str) && !onkoWKT(str) && str.match(/^\(([a-zA-Z0-9 ]+|[^a-zA-Z0-9 ]{1,6}(?: [^a-zA-Z0-9 ]{1,3})?)\)$/);
//let onkoReitti         = str => str && str.match && str.match(/^(.*?)\s*((?:=>.*?)*\s*)(?:=>)\s*(.*?)$/);
//let onkoRaide          = str => onkoInfraOID(str) == 44

/*let onkoInfra = str => onkoInfraOID(str) ||
                       onkoReitti(str) ||
                       onkoRatanumero(str) ||
                       onkoRatakmSijainti(str) ||
                       onkoRatakmVali(str) ||
                       onkoKoordinaatti(str) ||
                       onkoPmSijainti(str);*/

//let onkoJeti  = str => onkoJetiOID(str) || str && str.match && str.match(/^(EI|ES|VS|LOI)(\d+)$/);
//let onkoRuma  = str => onkoRumaOID(str) || str && str.match && str.match(/^(RT|LR)(\d+)$/);

//let onkoJuna  = str => str && str.match && str.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})\s*\(?(\d+)\)?$/);

/*let onkoLOI   = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.2\.80\.|LOI)(\d+)$/);
let onkoEI    = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.2\.81\.|EI)(\d+)$/);
let onkoES    = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.2\.82\.|ES)(\d+)$/);
let onkoVS    = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.2\.83\.|VS)(\d+)$/);

let onkoRT    = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.7\.1\.|RT)(\d+)$/);
let onkoLR    = str => str && str.match && str.match(/^(?:1\.2\.246\.586\.7\.2\.|LR)(\d+)$/);
*/
//let onkoWKT = str => str && str.match && str.match(/^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)(.*)$/);

/*let luoInfraAPIUrl = (str, time) => {
    return time ? withTime(time, luoInfraAPIUrl_(str)) : luoInfraAPIUrl_(str);
}
let luoInfraAPIUrl_ = str => {
    let m = onkoInfraOID(str);
    if (m) {
        return baseInfraAPIUrl(false) + str + '.json';
    }
    m = onkoRatakmSijainti(str);
    if (m) {
        return ratakmSijaintiUrl(m);
    }
    m = onkoRatakmVali(str);
    if (m) {
        return ratakmValiUrl(m);
    }
    m = onkoRatanumero(str);
    if (m) {
        return ratanumeroUrl(m[1]);
    }
    m = onkoPmSijainti(str);
    if (m) {
        return pmSijaintiUrl(m);
    }
    m = onkoReitti(str);
    if (m) {
        return reittiUrl({start: m.start, legs: (m.legs.length > 0 ? m.legs.filter(x => x != '') : []), end: m.end});
    }
    m = onkoKoordinaatti(str);
    if (m) {
        var srs = undefined;
        if (m[0] > 999 && m[1] > 999) {
            // epsg:3067
            srs = undefined;
        } else if (m[0] < 50 && m[1] > 50) {
            // epsg:4326
            srs = 'srsName=epsg:4326';
        } else if (m[0] > 50 && m[1] < 50) {
            // crs:84
            srs = 'srsName=crs:84';
        }
        return koordinaattiUrl(srs, [m[0], m[1]]);
    }
    m = onkoTREXOID(str);
    if (m) {
        return baseInfraAPIUrl(false) + str + '.json';
    }
}

let luoEtj2APIUrl = (str, time) => {
    return time ? withTime(time, luoEtj2APIUrl_(str)) : luoEtj2APIUrl_(str);
}
let luoEtj2APIUrl_ = str => {
    let m = onkoJetiOID(str)
    if (m) {
        return baseEtj2APIUrl(false) + str + '.json?' + (time ? 'time=' + time : '');
    }
    m = onkoJeti(str);
    if (m) {
        return baseEtj2APIUrl(true) + str + '.json?' + (time ? 'time=' + time : '');
    }
}

let luoRumaUrl = str => {
    let m = onkoRT(str);
    if (m) {
        return rtSingleUrl(str);
    }
    m = onkoLR(str);
    if (m) {
        return lrSingleUrl(str);
    }
}

let luoAikatauluUrl = str => {
    let m = onkoJuna(str);
    if (m) {
        return aikatauluAPIUrl + m.departureDate + '/' + m.trainNumber;
    }
}*/

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
//let onTitleChange = onAttributeMutation('title');

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
           onclick='avaaInfo("${tunniste}", event.pageX, event.pageY, ${time ? '"' + toISOStringNoMillis(time[0]) + '/' + toISOStringNoMillis(time[1]) + '"' : time}); return false;'
           ` + (peek ? `onmouseenter='kurkistaInfo(this, "${tunniste}", [...document.querySelectorAll(".selectize-dropdown").values()].filter(x => x.style.display!="none").map(x => (x.offsetLeft + x.offsetWidth) + "px")[0], (event.pageY-20) + "px", ${time ? '"' + time + '"' : time}); return false;'` : '') + `>
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
           onclick='kartta("${tunniste}", "${title.replaceAll(/<[^>]*>|&lt;.*?&gt;/g,'')}", ${time ? '"' + toISOStringNoMillis(time[0]) + '/' + toISOStringNoMillis(time[1]) + '"' : time}, true, event.pageX, event.pageY); return false;'
           ` + (peek ? `onmouseenter='kurkistaKartta(this, "${tunniste}", "${title.replaceAll(/<[^>]*>|&lt;.*?&gt;|\n/g,'')}", ${time ? '"' + toISOStringNoMillis(time[0]) + '/' + toISOStringNoMillis(time[1]) + '"' : time}, [...document.querySelectorAll(".selectize-dropdown").values()].filter(x => x.style.display!="none").map(x => (x.offsetLeft + x.offsetWidth) + "px")[0], (event.pageY-20) + "px"); return false;'` : '') + `/>
           🗺
        </a>
    </li>
` : '';

let luoAikatauluLinkki = (tunniste) => onkoJuna(tunniste) ? `
    <li>
        <a href=""
           title='Avaa aikataulu'
           class='infoikoni'
           onclick='luoJunaPopup("${onkoJuna(tunniste).departureDate}", "${onkoJuna(tunniste).trainNumber}"); return false;' />
           📅
        </a>
    </li>
` : '';

let luoRaideLinkki = (tunniste) => onkoInfraOID(tunniste) == 44 ? `
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
        return luoGrafiikkaLinkkiReitille([m.start].concat(m.legs.filter(x => x != '')).concat([m.end]));
    }
    m = onkoJuna(tunniste);
    if (m) {
        return luoGrafiikkaLinkkiJunalle(m.trainNumber, m.departureDate);
    }
    m = onkoJeti(tunniste);
    if (m) {
        return luoGrafiikkaLinkkiJetille(tunniste);
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
        let rr = onkoReitti(reitti);
        r = [rr.start].concat(rr.legs.filter(x => x != '')).concat([rr.end]);
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

window.asetaEnnakkotietoGrafiikalle = (tunniste, f) => {
    haeEnnakkotiedonRatanumerotJaVoimassaolo(tunniste, (ratanumero, voimassa) => {
        if (f) {
            f(ratanumero, voimassa);
        }
        ratanumeroChanged(ratanumero);
        let aikaNyt = getMainState().aika;
        if (voimassa[0] < aikaNyt[1] && aikaNyt[0] < voimassa[1]) {
            // voimassaolo leikkaa jo näytettävää aikaväliä
        } else {
            let st = getMainState();
            st.aika = voimassa[1] <= aikaNyt[0] ? [dateFns.dateFns.add(voimassa[1], {hours: -4}), voimassa[1]]
                                                : [voimassa[0], dateFns.dateFns.add(voimassa[0], dateFns.durationFns.toString({hours: 4}))];
            setMainState(st);
            window.dispatchEvent(new HashChangeEvent("hashchange"));
        }
    });
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
