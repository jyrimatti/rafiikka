setTimeout(() => {
    window.ratanumerotDS = luoDatasource(["Infra", "Rata"], ratanumerotUrl, (ret, x) => {
        let kilometrit = x.ratakilometrit.flat();
        ret[x.ratanumero] = [Math.min.apply(Math, kilometrit)*1000,
                            Math.max.apply(Math, kilometrit)*1000+1000];
    });

    window.liikennepaikkavalitDS = luoDatasource(["Infra", "Liikennepaikkavali"], liikennepaikkavalitUrl, (ret, x) => {
        ret[x.tunniste] = {
            alkuliikennepaikka:  x.alkuliikennepaikka,
            loppuliikennepaikka: x.loppuliikennepaikka,
            ratakmvalit:         x.ratakmvalit,
            voimassa:            x.objektinVoimassaoloaika
        };
    });

    window.rautatieliikennepaikatDS = luoDatasource(["Infra", "Rautatieliikennepaikka"], rautatieliikennepaikatUrl, (ret, x) => {
        ret[x.tunniste] = {
            tunniste:        x.tunniste,
            ratakmSijainnit: x.muutRatakmsijainnit.concat(x.virallinenRatakmsijainti != null ? [x.virallinenRatakmsijainti] : []),
            lyhenne:         x.lyhenne,
            nimi:            x.nimi,
            tyyppi:          x.tyyppi,
            uicKoodi:        x.uicKoodi,
            geometria:       buildGeometry({
                                type: "Point",
                                coordinates: x.virallinenSijainti
                            }),
            ratakmvalit:     x.ratakmvalit,
            voimassa:        x.objektinVoimassaoloaika
        };
    });

    window.liikennepaikanOsatDS = luoDatasource(["Infra", "LiikennepaikanOsa"], liikennepaikanOsatUrl, (ret, x) => {
        ret[x.tunniste] = {
            tunniste:        x.tunniste,
            ratakmSijainnit: x.muutRatakmsijainnit.concat(x.virallinenRatakmsijainti ? [x.virallinenRatakmsijainti] : []),
            lyhenne:         x.lyhenne,
            liikennepaikka:  x.liikennepaikka,
            nimi:            x.nimi,
            tyyppi:          "liikennepaikanosa",
            uicKoodi:        x.uicKoodi,
            geometria:       buildGeometry({
                                type: "Point",
                                coordinates: x.virallinenSijainti
                            }),
            ratakmvalit:     x.muutRatakmsijainnit.concat(x.virallinenRatakmsijainti ? [x.virallinenRatakmsijainti] : [])
                                                .map(r => {
                return {
                    ratanumero: r.ratanumero,
                    alku:       {ratakm: r.ratakm, etaisyys: r.etaisyys},
                    loppu:      {ratakm: r.ratakm, etaisyys: r.etaisyys}
                };
            }),
            voimassa:        x.objektinVoimassaoloaika
        };
    });

    window.raideosuudetDS = luoDatasource(["Infra","Raideosuus"], raideosuudetUrl, (ret, x) => {
        ret[x.tunniste[0].tunniste] = {
            tunniste:        x.tunniste,
            ratakmSijainnit: [],
            lyhenne:         x.tunniste[0].turvalaiteNimi,
            nimi:            x.tunniste[0].turvalaiteNimi,
            tyyppi:          x.tyyppi,
            uicKoodi:        x.uicKoodi,
            geometria:       buildGeometry({
                                type: "MultiLineString",
                                coordinates: x.geometria
                            }),
            ratakmvalit:     x.tunniste[0].ratakmvalit,
            voimassa:        x.objektinVoimassaoloaika
        };
    });

    window.laituritDS = luoDatasource(["Infra","Laituri"], laituritUrl, (ret, x) => {
        ret[x.tunniste[0].tunniste] = {
            tunniste:        x.tunniste,
            ratakmSijainnit: [],
            lyhenne:         x.tunniste[0].tunnus,
            nimi:            x.tunniste[0].kuvaus,
            tyyppi:          x.tyyppi,
            uicKoodi:        x.uicKoodi,
            geometria:       buildGeometry({
                                type: "MultiLineString",
                                coordinates: x.geometria
                            }),
            ratakmvalit:     x.tunniste[0].ratakmvalit,
            voimassa:        x.objektinVoimassaoloaika
        };
    });

    window.elementitDS = luoDatasource(["Infra","Elementti"], elementitUrl, (ret, x) => {
        ret[x.tunniste] = {
            tunniste:        x.tunniste,
            nimi:            x.nimi,
            ratakmsijainnit: x.ratakmsijainnit,
            voimassa:        x.objektinVoimassaoloaika
        };
    });

    window.lorajatDS = luoDatasource(["Infra","LiikenteenohjauksenRaja"], lorajatUrl, (ret, x) => {
        ret[x.tunniste] = {
            tunniste:        x.tunniste,
            nimi:            'Liikenteenohjauksen raja',
            ratakmsijainnit: x.leikkaukset.flatMap(y => y.ratakmsijainnit),
            voimassa:        x.objektinVoimassaoloaika
        };
    });

    window.aikataulupaikatDS = new am4core.DataSource();
    aikataulupaikatDS.data = {};
    let apHandler = ev => {
        Object.values(ev.target.data).filter(x => x.uicKoodi)
                                    .forEach(x => {
            aikataulupaikatDS.data[x.uicKoodi] = x;
            aikataulupaikatDS.data[x.tunniste] = x;
        });
        aikataulupaikatDS.dispatch("done", aikataulupaikatDS.data);
    };
    on(rautatieliikennepaikatDS.events, "done", apHandler);
    on(liikennepaikanOsatDS.events,     "done", apHandler);
    on(raideosuudetDS.events,           "done", apHandler);
    on(laituritDS.events,               "done", apHandler);

    window.ratatyoElementitDS = new am4core.DataSource();
    ratatyoElementitDS.data = {};
    let reHandler = ev => {
        Object.values(ev.target.data).forEach(x => {
            ratatyoElementitDS.data[x.tunniste] = x;
        });
        ratatyoElementitDS.dispatch("done", ratatyoElementitDS.data);
    };
    on(elementitDS.events, "done", reHandler);
    on(lorajatDS.events,   "done", reHandler);

    window.ratapihapalveluTyypit = [];
    getJson(ratapihapalveluTyypitUrl(), data => {
        ratapihapalveluTyypit = Object.values(data);
    });
    window.opastintyypit = [];
    getJson(opastinTyypitUrl(), data => {
        opastintyypit = Object.values(data);
    });
    window.vaihdetyypit = [];
    getJson(vaihdeTyypitUrl(), data => {
        vaihdetyypit = Object.values(data);
    });

    window.kpalueet = {};
    getJson(kunnossapitoalueetMetaUrl(), data => {
        kpalueet = data;
    });
    window.ohjausalueet = {};
    getJson(liikenteenohjausalueetMetaUrl(), data => {
        ohjausalueet = data;
    });
    window.kayttokeskukset = {};
    getJson(kayttokeskuksetMetaUrl(), data => {
        kayttokeskukset = data;
    });
    window.lisualueet = {};
    getJson(liikennesuunnittelualueetMetaUrl(), data => {
        lisualueet = data;
    });
}, 100);

setTimeout(() => {
    window.ratanumerotDS.load();
    window.liikennepaikkavalitDS.load();
    window.elementitDS.load();
    window.lorajatDS.load();
    rautatieliikennepaikatDS.load();
    liikennepaikanOsatDS.load();
    raideosuudetDS.load();
    laituritDS.load();
    elementitDS.load();
    lorajatDS.load();
}, 2000);