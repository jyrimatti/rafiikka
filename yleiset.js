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

let geometryFactory = new jsts.geom.GeometryFactory();
let geojsonReader = new jsts.io.GeoJSONReader();

// safari bugittaa cross-origin-redirectien kanssa, joten proxytetään safari oman palvelimen kautta.
let infraAPIUrl = 'https://' + (isSafari ? 'lahteenmaki.net' : 'rata.digitraffic.fi') + '/infra-api/0.6/';
let etj2APIUrl = 'https://' + (isSafari ? 'lahteenmaki.net' : 'rata.digitraffic.fi') + '/jeti-api/0.6/';
let aikatauluAPIUrl = 'https://rata.digitraffic.fi/api/v1/trains/';
let graphQLUrl = 'https://rata.digitraffic.fi/api/v1/graphql/graphiql/?';

let mqttUrl = "rata.digitraffic.fi";
let mqttPort = 443;
let mqttTopic = 'train-locations/#';

let params = new URLSearchParams(window.location.hash.replace("#", "?"));

let sijaintiParam = params.get("sijainti") || "009";
let aikaParam     = new Date(params.get("aika") || new Date().toISOString());
let kestoParam    = dateFns.durationFns.parse(params.get("kesto") || "P1D");
let seedParam     = params.has("seed") ? true : false;

log("Parametri Sijainti", sijaintiParam);
log("Parametri Aika", aikaParam);
log("Parametri Kesto", kestoParam);

window.ikkuna = [dateFns.dateFns.sub(aikaParam, kestoParam), dateFns.dateFns.add(aikaParam, kestoParam)];
window.rajat  = [dateFns.dateFns.addDays(ikkuna[0], -3), dateFns.dateFns.addDays(ikkuna[1], 3)];

let pyoristaAjanhetki = x => dateFns.dateFns.format(x, "yyy-MM-dd'T00:00:00Z'");
let laajennaAikavali = x => [dateFns.dateFns.startOfMonth(x[1]), dateFns.dateFns.endOfMonth(x[1])];

let infraAikavali = '&time=' + pyoristaAjanhetki(aikaParam) + "/" + pyoristaAjanhetki(aikaParam);
let etj2Aikavali = '&time=' + laajennaAikavali(rajat).map(function(x) { return pyoristaAjanhetki(x); }).join("/");
let rumaAikavali = '&start=' + pyoristaAjanhetki(rajat[0]) + "&end=" + pyoristaAjanhetki(rajat[1]);

let junienEsitysaikavali = 1000*60*60*24*3;

let ratanumerotUrl            = infraAPIUrl + "radat.json?propertyName=ratakilometrit,ratanumero" + infraAikavali;
let liikennepaikkavalitUrl    = infraAPIUrl + "liikennepaikkavalit.json?propertyName=tunniste,alkuliikennepaikka,loppuliikennepaikka" + infraAikavali;
let reittiUrl                 = infraAPIUrl + "reitit/kaikki/{alku}/{loppu}.json?propertyName=liikennepaikat,liikennepaikanOsat,seisakkeet,linjavaihteet" + infraAikavali;

let rautatieliikennepaikatUrl = infraAPIUrl + "rautatieliikennepaikat.json?propertyName=lyhenne,muutRatakmsijainnit,nimi,ratakmvalit,tunniste,tyyppi,uicKoodi,virallinenRatakmsijainti,virallinenSijainti&srsName=crs:84" + infraAikavali;
let liikennepaikanOsatUrl     = infraAPIUrl + "liikennepaikanosat.json?propertyName=liikennepaikka,lyhenne,muutRatakmsijainnit,nimi,tunniste,uicKoodi,virallinenRatakmsijainti,virallinenSijainti&srsName=crs:84" + infraAikavali;
let raideosuudetUrl           = infraAPIUrl + "aikataulupaikat.json?cql_filter=tyyppi=%27raideosuus%27&propertyName=geometria,tunniste.tunniste,tunniste.ratakmvalit,tunniste.turvalaiteNimi,tyyppi,uickoodi&srsName=crs:84" + infraAikavali;
let laituritUrl               = infraAPIUrl + "aikataulupaikat.json?cql_filter=tyyppi=%27laituri%27&propertyName=geometria,tunniste.tunniste,tunniste.kuvaus,tunniste.laskennallisetRatakmvalit,tunniste.tunnus,tyyppi,uickoodi&srsName=crs:84" + infraAikavali;

let eiUrlRatanumero = etj2APIUrl + 'ennakkoilmoitukset.json?cql_filter=tila=%27hyväksytty%27&propertyName=ajankohdat,liikennevaikutusalue.laskennallisetRatakmvalit,sisainenTunniste,tunniste,voimassa' + etj2Aikavali;
let esUrlRatanumero = etj2APIUrl + 'ennakkosuunnitelmat.json?cql_filter=tila=%27hyväksytty%27&propertyName=sisainenTunniste,tyonosat.ajankohdat,tyonosat.tekopaikka.laskennallisetRatakmvalit,tunniste,voimassa' + etj2Aikavali;
let vsUrlRatanumero = etj2APIUrl + 'vuosisuunnitelmat.json?cql_filter=tila%3C%3E%27poistettu%27&propertyName=ajankohdat,sisainenTunniste,tunniste,kohde.laskennallisetRatakmvalit,voimassa' + etj2Aikavali;
let loUrlRatanumero = etj2APIUrl + 'loilmoitukset.json?cql_filter=tila=%27aktiivinen%27&propertyName=ensimmainenAktiivisuusaika,ratakmvalit,sisainenTunniste,tunniste,viimeinenAktiivisuusaika' + etj2Aikavali;

let eiUrlAikataulupaikka = etj2APIUrl + 'ennakkoilmoitukset.json?cql_filter=tila=%27hyväksytty%27&propertyName=ajankohdat,liikennevaikutusalue.laskennallisetLiikennepaikat,liikennevaikutusalue.laskennallisetLiikennepaikkavalit,sisainenTunniste,tunniste,voimassa' + etj2Aikavali;
let esUrlAikataulupaikka = etj2APIUrl + 'ennakkosuunnitelmat.json?cql_filter=tila=%27hyväksytty%27&propertyName=sisainenTunniste,tyonosat.ajankohdat,tyonosat.tekopaikka.laskennallisetLiikennepaikat,tyonosat.tekopaikka.laskennallisetLiikennepaikkavalit,tunniste,voimassa' + etj2Aikavali;
let vsUrlAikataulupaikka = etj2APIUrl + 'vuosisuunnitelmat.json?cql_filter=tila%3C%3E%27poistettu%27&propertyName=ajankohdat,sisainenTunniste,tunniste,kohde.laskennallisetLiikennepaikat,kohde.laskennallisetLiikennepaikkavalit,voimassa' + etj2Aikavali;
let loUrlAikataulupaikka = etj2APIUrl + 'loilmoitukset.json?cql_filter=tila=%27aktiivinen%27&propertyName=ensimmainenAktiivisuusaika,ratakmvalit,sisainenTunniste,tunniste,viimeinenAktiivisuusaika' + etj2Aikavali;

let junasijainnitUrl = 'https://rata.digitraffic.fi/api/v1/train-locations/latest/';
let ratakmMuunnosUrl = infraAPIUrl + 'koordinaatit/{coord}.json?propertyName=ratakmsijainnit&srsName=crs:84';

let rtUrl = 'https://rata.digitraffic.fi/api/v1/trackwork-notifications.json?state=ACTIVE' + rumaAikavali;
let lrUrl = 'https://rata.digitraffic.fi/api/v1/trafficrestriction-notifications.json?state=SENT' + rumaAikavali;

let initDS = ds => {
    ds.requestOptions.requestHeaders = [{
        "key": "Digitraffic-User",
        "value": "Rafiikka"
      }];
}

if (seedParam) {
    [ratanumerotUrl, liikennepaikkavalitUrl, rautatieliikennepaikatUrl, liikennepaikanOsatUrl, raideosuudetUrl, laituritUrl,
     eiUrlRatanumero, esUrlRatanumero, vsUrlRatanumero, loUrlRatanumero,
     eiUrlAikataulupaikka, esUrlAikataulupaikka, vsUrlAikataulupaikka, loUrlAikataulupaikka].forEach(url => {
        let ds = new am4core.DataSource();
        ds.url = url;
        initDS(ds);
        ds.load();
    });
    throw "seedattu";
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
    initDS(ds);
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

let luoDatasource = (type, url, f) => {
    let ds = new am4core.DataSource();
    ds.url = url;
    monitor(ds, type);
    on(ds.events, "parseended", ev => {
        log("Parsitaan " + type);
        var ret = {};
        Object.values(ev.target.data).flat().forEach(x => f(ret, x));
        ev.target.data = ret;
        log("Parsittu " + type);
    });
    return ds;
};

let dragElement = elmnt => {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (elmnt.querySelector(".header")) {
      // if present, the header is where you move the DIV from:
      elmnt.querySelector(".header").onmousedown = dragMouseDown;
    } else {
      // otherwise, move the DIV from anywhere inside the DIV: 
      elmnt.onmousedown = dragMouseDown;
    }
  
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;
    }
  
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      // calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // set the element's new position:
      elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
      elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }
  
    function closeDragElement() {
      // stop moving when mouse button is released:
      document.onmouseup = null;
      document.onmousemove = null;
    }
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
    if (obj.ratanumero && obj.alku && obj.loppu) {
        var x = '(' + obj.ratanumero + ') ' + obj.alku.ratakm + '+' + obj.alku.etaisyys + ' - ' + obj.loppu.ratakm + '+' + obj.loppu.etaisyys;
        return x + (obj.kohtaamissuunta == 'nouseva' ? ' ↑' : obj.kohtaamissuunta == 'laskeva' ? ' ↓' : (obj.kohtaamissuunta || ''));
    } else if (obj.ratanumero && obj.ratakm && obj.etaisyys) {
        var x = '(' + obj.ratanumero + ') ' + obj.ratakm + '+' + obj.etaisyys;
        return x + (obj.kohtaamissuunta == 'nouseva' ? ' ↑' : obj.kohtaamissuunta == 'laskeva' ? ' ↓' : (obj.kohtaamissuunta || ''));
    } else if (obj.numero && obj.etaisyys && obj.suunta) {
        var x = obj.numero + (obj.suunta == 'n' ? '+' : obj.suunta == 'l' ? '-' : obj.suunta) + obj.etaisyys;
        return x + (obj.kohtaamissuunta == 'nouseva' ? ' ↑' : obj.kohtaamissuunta == 'laskeva' ? ' ↓' : (obj.kohtaamissuunta || ''));
    } else if (typeof obj == 'string' && obj.indexOf('1.2.246.586.') == 0) {
        return obj;
    }
    return null;
};

let prettyPrint = obj => {
    if (obj instanceof Array && obj.length > 0) {
        return '<span class="array">' + obj.map(function(val) {
            var printedVal = (val && typeof val === 'object') ? prettyPrint(val) : val == null ? '' : customPrettyPrinting ? customPrettyPrinting(val) : val;
            return (printedVal ? printedVal : val) + ' ';
        }).join('<br />') + '</span>';
    } else {
        var r = '';
        if (customPrettyPrinting) {
            r = customPrettyPrinting(obj);
        }
        if (!r) {
            r = '';
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (r === '') {
                        r = '<table>';
                    }
                    var val = obj[key];
                    if (val instanceof Array && val.length === 0) {
                        // skip empty arrays
                    } else {
                        var printedVal = (val && typeof val === 'object') ? prettyPrint(val) : val == null ? null : customPrettyPrinting ? customPrettyPrinting(val) : val;
                        r += '<tr>' + '<th>' + key + '</th><td>' + (printedVal ? printedVal : val) + '</td></tr>';
                    }
                }
            }
            r = r === '' ? '' : r + '</table>';
        }
        return r;
    }
};

let toISOStringNoMillis = (d) => {
    function pad(n) {
        return n < 10 ? '0' + n : n;
    }
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z';
};

let nyt = () => {
    var d = new Date();
    d.setUTCHours(0);
    d.setUTCMinutes(0);
    d.setUTCSeconds(0);
    d.setUTCMilliseconds(0);
    return toISOStringNoMillis(d);
};

let instant = new URLSearchParams(window.location.search).get('time') || nyt();