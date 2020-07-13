let log = (msg1, msg2, msg3, msg4, msg5, msg6) => {
    if (console && console.log) {
        console.log(dateFns.dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS'), ":", msg1, msg2, msg3, msg4, msg5, msg6);
    }
};

let geometryFactory = new jsts.geom.GeometryFactory();
let geojsonReader = new jsts.io.GeoJSONReader();

let infraAPIUrl = 'https://rata.digitraffic.fi/infra-api/0.6/';
let etj2APIUrl = 'https://rata.digitraffic.fi/jeti-api/0.6/';
let aikatauluAPIUrl = 'https://rata.digitraffic.fi/api/v1/trains/';

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
    // nah, cannot use, would trigger a pre-flight request...
    /*ds.requestOptions.requestHeaders = [{
        "key": "Digitraffic-User",
        "value": "Rafiikka"
      }];*/
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