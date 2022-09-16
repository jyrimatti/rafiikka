setTimeout(() => {

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