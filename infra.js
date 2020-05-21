let ratakmsijaintiComparator = (a,b) => {
    if (a.ratanumero < b.ratanumero) {
        return -1;
    } else if (a.ratanumero > b.ratanumero) {
        return 1;
    } else if (a.ratakm*10000+a.etaisyys < b.ratakm*10000+b.etaisyys) {
        return -1;
    } else if (a.ratakm*10000+a.etaisyys > b.ratakm*10000+b.etaisyys) {
        return 1;
    }
    return 0;
};
let valissa = (ratakmsijainti,vali) => [vali[0],ratakmsijainti,vali[1]].sort(ratakmsijaintiComparator) == [vali[0],ratakmsijainti,vali[1]];

window.ratanumerotDS = luoDatasource("Ratanumerot", ratanumerotUrl, (ret, x) => {
    let kilometrit = x.ratakilometrit.flat();
    ret[x.ratanumero] = [Math.min.apply(Math, kilometrit)*1000,
                         Math.max.apply(Math, kilometrit)*1000+1000];
});

window.liikennepaikkavalitDS = luoDatasource("Liikennepaikkavalit", liikennepaikkavalitUrl, (ret, x) => {
    ret[x.tunniste] = {
        alkuliikennepaikka:  x.alkuliikennepaikka,
        loppuliikennepaikka: x.loppuliikennepaikka
    };
});

window.rautatieliikennepaikatDS = luoDatasource("Rautatieliikennepaikat", rautatieliikennepaikatUrl, (ret, x) => {
    ret[x.tunniste] = {
        tunniste:        x.tunniste,
        ratakmSijainnit: x.muutRatakmsijainnit.concat(x.virallinenRatakmsijainti != null ? [x.virallinenRatakmsijainti] : []),
        lyhenne:         x.lyhenne,
        nimi:            x.nimi,
        tyyppi:          x.tyyppi,
        uicKoodi:        x.uicKoodi,
        geometria:       geometryFactory.buildGeometry(javascript.util.Arrays.asList([geojsonReader.read({
                            type: "Point",
                            coordinates: x.virallinenSijainti
                         })])),
        ratakmvalit:     x.ratakmvalit
    };
});

window.liikennepaikanOsatDS = luoDatasource("LiikennepaikanOsat", liikennepaikanOsatUrl, (ret, x) => {
    ret[x.tunniste] = {
        tunniste:        x.tunniste,
        ratakmSijainnit: x.muutRatakmsijainnit.concat(x.virallinenRatakmsijainti != null ? [x.virallinenRatakmsijainti] : []),
        lyhenne:         x.lyhenne,
        liikennepaikka:  x.liikennepaikka,
        nimi:            x.nimi,
        tyyppi:          "liikennepaikanosa",
        uicKoodi:        x.uicKoodi,
        geometria:       geometryFactory.buildGeometry(javascript.util.Arrays.asList([geojsonReader.read({
                            type: "Point",
                            coordinates: x.virallinenSijainti
                         })])),
        ratakmvalit:     x.muutRatakmsijainnit.concat(x.virallinenRatakmsijainti != null ? [x.virallinenRatakmsijainti] : [])
                                              .map(r => {
            return {
                ratanumero: r.ratanumero,
                alku:       {ratakm: r.ratakm, etaisyys: r.etaisyys},
                loppu:      {ratakm: r.ratakm, etaisyys: r.etaisyys}
            };
        })
    };
});

window.raideosuudetDS = luoDatasource("Raideosuudet", raideosuudetUrl, (ret, x) => {
    ret[x.tunniste[0].tunniste] = {
        tunniste:        x.tunniste,
        ratakmSijainnit: [],
        lyhenne:         x.tunniste[0].turvalaiteNimi,
        nimi:            x.tunniste[0].turvalaiteNimi,
        tyyppi:          x.tyyppi,
        uicKoodi:        x.uickoodi,
        geometria:       geometryFactory.buildGeometry(javascript.util.Arrays.asList([geojsonReader.read({
                            type: "MultiLineString",
                            coordinates: x.geometria
                         })])),
        ratakmvalit:     x.tunniste[0].ratakmvalit
    };
});

window.laituritDS = luoDatasource("Laiturit", laituritUrl, (ret, x) => {
    ret[x.tunniste[0].tunniste] = {
        tunniste:        x.tunniste,
        ratakmSijainnit: [],
        lyhenne:         x.tunniste[0].tunnus,
        nimi:            x.tunniste[0].kuvaus,
        tyyppi:          x.tyyppi,
        uicKoodi:        x.uickoodi,
        geometria:       geometryFactory.buildGeometry(javascript.util.Arrays.asList([geojsonReader.read({
                            type: "MultiLineString",
                            coordinates: x.geometria
                         })])),
        ratakmvalit:     x.tunniste[0].laskennallisetRatakmvalit
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

let muotoileEtaisyys = x => (x < 10 ? "000" : x < 100 ? "00" : x < 1000 ? "0" : "") + x;
let muotoileRkmv = x => '(' + x.ratanumero + ') ' + x.alku.ratakm  + '+' + muotoileEtaisyys(x.alku.etaisyys) + " - "
                                                  + x.loppu.ratakm + "+" + muotoileEtaisyys(x.loppu.etaisyys);

let aikataulupaikkaUlottumat = (lp, lpv) => {
    let aikataulupaikat = lp.concat(lpv)
                            .flatMap(x => aikataulupaikatDS.data[x] ? [x] : Object.values(liikennepaikanOsatDS.data)
                                                                                  .filter(y => y.liikennepaikka == x)
                                                                                  .map(y => y.tunniste));
    // TODO: seisakkeet ja linjavaihteet kun infra-api osaa kertoa ne liikennepaikkaväliltä.

    // TODO: tarkempi laskenta jotenkin
    return valittuDS.data.reduce( (prev,currentUIC,currentIndex) => {
        if (aikataulupaikat.includes(aikataulupaikatDS.data[currentUIC].tunniste)) {
            prev[prev.length-1].push(currentIndex);
        } else {
            prev.push([]);
        }
        return prev;
    }, [[]]);
};