
let names = x => Object.values(x).flat().filter(d => !d.nimi || d.nimi.indexOf('(väliaikainen)') == -1).map(d => d.nimi || d.kuvaus).sort();

let luoTilastoPopupRatapihapalvelut          = () => luoTilastoPopup('Ratapihapalvelut',          ratapihapalvelutUrlTilasto(),          [''], ratapihapalveluTyypit, ['']);
let luoTilastoPopupToimialueet               = () => luoTilastoPopup('Toimialueet',               toimialueetUrlTilasto(),               [''], names(ohjausalueet), ['']);
let luoTilastoPopupTilirataosat              = () => luoTilastoPopup('Tilirataosat',              tilirataosatUrlTilasto(),              [''], names(kpalueet), ['']);
let luoTilastoPopupLiikennesuunnittelualueet = () => luoTilastoPopup('Liikennesuunnittelualueet', liikennesuunnittelualueetUrlTilasto(), [''], [''], ['']);
let luoTilastoPopupPaikantamismerkit         = () => luoTilastoPopup('Paikantamismerkit',         paikantamismerkitUrlTilasto(),         [''], [''], ['']);
let luoTilastoPopupKilometrimerkit           = () => luoTilastoPopup('Kilometrimerkit',           kilometrimerkitUrlTilasto(),           [''], [''], ['']);
let luoTilastoPopupRadat                     = () => luoTilastoPopup('Radat',                     radatUrlTilasto(),                     [''], [''], ['']);
let luoTilastoPopupLiikennepaikanOsat        = () => luoTilastoPopup('Liikennepaikan osat',       liikennepaikanOsatUrlTilasto(),        names(lisualueet), [''], ['']);
let luoTilastoPopupRautatieliikennepaikat    = kk => luoTilastoPopup('Rautatieliikennepaikat',    rautatieliikennepaikatUrlTilasto(),    kk === false ? names(lisualueet) : [''], ['liikennepaikka','seisake','linjavaihde'], ['']);
let luoTilastoPopupLiikennepaikkavalit       = () => luoTilastoPopup('Liikennepaikkavalit',       liikennepaikkavalitUrlTilasto(),       [''], [''], ['']);
let luoTilastoPopupRaideosuudet              = () => luoTilastoPopup('Raideosuudet',              raideosuudetUrlTilasto(),              [''], ['eristysosuus','akselinlaskentaosuus','aanitaajuusvirtapiiri'], ['']);

let luoTilastoPopupAkselinlaskija                   = kk => luoTilastoPopup('Akselinlaskijat',                     akselinlaskijaUrlTilasto(),                   names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupBaliisi                          = kk => luoTilastoPopup('Baliisit',                            baliisiUrlTilasto(),                          kk === true ? names(kayttokeskukset) : kk === false ? names(lisualueet) : [''], kk === undefined ? ['tavallinen', 'kiintea', 'toistopiste'] : [''], ['']);
let luoTilastoPopupKuumakayntiilmaisin              = kk => luoTilastoPopup('Kuumakäynti-ilmaisimet',              kuumakayntiilmaisinUrlTilasto(),              names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupLiikennepaikanraja               = kk => luoTilastoPopup('Liikennepaikan rajat',                liikennepaikanrajaUrlTilasto(),               names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupOpastin                          = kk => luoTilastoPopup('Opastimet',                           opastinUrlTilasto(),                          kk === true ? names(kayttokeskukset) : kk === false ? names(lisualueet) : [''], kk === undefined ? names(opastintyypit) : [''], ['']);
let luoTilastoPopupPuskin                           = kk => luoTilastoPopup('Puskimet',                            puskinUrlTilasto(),                           names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupPyoravoimailmaisin               = kk => luoTilastoPopup('Pyörävoimailmaisimet',                pyoravoimailmaisinUrlTilasto(),               names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupRaideeristys                     = kk => luoTilastoPopup('Raide-eristykset',                    raideeristysUrlTilasto(),                     names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupPysaytyslaite                    = kk => luoTilastoPopup('Pysäytyslaitteet',                    pysaytyslaiteUrlTilasto(),                    names(kk ? kayttokeskukset : lisualueet), ['Käsin asetettava', 'Keskitetty'], ['Varmuuslukittu','Lukitsematon']);
let luoTilastoPopupRfidlukija                       = kk => luoTilastoPopup('RFID-lukijat',                        rfidlukijaUrlTilasto(),                       names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupRyhmityseristin                  = kk => luoTilastoPopup('Ryhmityseristimet',                   ryhmityseristinUrlTilasto(),                  names(kk ? kayttokeskukset : lisualueet), ['Nopeasti ajettava', 'Hitaasti ajettava'], ['']);
let luoTilastoPopupSahkoistyspaattyy                = kk => luoTilastoPopup('Sähköistys päättyy',                  sahkoistyspaattyyUrlTilasto(),                names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupSeislevy                         = kk => luoTilastoPopup('Seislevyt',                           seislevyUrlTilasto(),                         names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupVaihde                           = kk => luoTilastoPopup('Vaihteet',                            vaihdeUrlTilasto(),                           kk === true ? names(kayttokeskukset) : kk === false ? names(lisualueet) : [''], kk === undefined ? names(vaihdetyypit) : [''], ['']);
let luoTilastoPopupVirroitinvalvontakamera          = kk => luoTilastoPopup('Virroitinvalvontakamerat',            virroitinvalvontakameraUrlTilasto(),          names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupErotusjakso                      = kk => luoTilastoPopup('Erotusjaksot',                        erotusjaksoUrlTilasto(),                      names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupErotuskentta                     = kk => luoTilastoPopup('Erotuskentät',                        erotuskenttaUrlTilasto(),                     names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupMaadoitin                        = kk => luoTilastoPopup('Maadoittimet',                        maadoitinUrlTilasto(),                        names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupTyonaikaineneristin              = kk => luoTilastoPopup('Työnaikaiset eristimet',              tyonaikaineneristinUrlTilasto(),              names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupKaantopoyta                      = kk => luoTilastoPopup('Kääntöpöydät',                        kaantopoytaUrlTilasto(),                      names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupPyoraprofiilimittalaite          = kk => luoTilastoPopup('Pyöräprofiilin mittalaitteet',        pyoraprofiilimittalaiteUrlTilasto(),          names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupTelivalvonta                     = kk => luoTilastoPopup('Telivalvonnat',                       telivalvontaUrlTilasto(),                     names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupErotin                           = kk => luoTilastoPopup('Erottimet',                           erotinUrlTilasto(),                           names(kk ? kayttokeskukset : lisualueet), [''], ['']);
let luoTilastoPopupTasoristeysvalojenpyoratunnistin = kk => luoTilastoPopup('Tasoristeysvalojen pyörätunnistimet', tasoristeysvalojenpyoratunnistinUrlTilasto(), names(kk ? kayttokeskukset : lisualueet), [''], ['']);

let luoTilastoPopupRaiteensulut             = () => luoTilastoPopup('Raiteensulut',              raiteensulutUrlTilasto(),             [''], ['Käsin asetettava', 'Keskitetty'], ['Varmuuslukittu','Lukitsematon']);
let luoTilastoPopupRaiteet                  = () => luoTilastoPopup('Raiteet',                   raiteetUrlTilasto(),                  [''], [''], ['']);
let luoTilastoPopupLiikenteenohjauksenrajat = () => luoTilastoPopup('Liikenteenohjauksen rajat', liikenteenohjauksenrajatUrlTilasto(), [''], ['1./1.', '1./2.'], ['']);
let luoTilastoPopupTunnelit                 = () => luoTilastoPopup('Tunnelit',                  tunnelitUrlTilasto(),                 [''], [''], ['']);
let luoTilastoPopupSillat                   = () => luoTilastoPopup('Sillat',                    sillatUrlTilasto(),                   [''], ['aks', 'ak', 'rs', 'yks', 'yk', 'rrs'], ['']);
let luoTilastoPopupLaiturit                 = () => luoTilastoPopup('Laiturit',                  laituritUrlTilasto(),                 ['matala','korkea'], ['henkilo','kuormaus'], ['']);
let luoTilastoPopupTasoristeykset           = kk => luoTilastoPopup('Tasoristeykset',            tasoristeyksetUrlTilasto(),           kk === true ? names(kayttokeskukset) : [''], kk === true ? [''] : ['Huomiolaite', 'Junansiirtohälytysjärjestelmä', 'Kauko-ohjattu lukittu puomi tai portti', 'Kev.liik.kokopuomit', 'Kokopuomilaitos', 'Laituripolun varoituslaitos', 'Liikennevalot + tasoristeysturvalaite', 'Muut', 'Paripuomilaitos', 'Paripuomilaitos + kl kokopuomit', 'Paripuomilaitos + kokopuomit', 'Puolipuomilaitos', 'Puolipuomilaitos+kev.liik.kokopuomit', 'Puolipuomilaitos + kl valo- ja äänivaroituslaitos', 'Valo- ja äänivaroituslaitos', 'Valo- ja äänivaroituslaitos + kl kokopuomit', 'Varoitusvalolaitos'], ['']);
let luoTilastoPopupKayttokeskukset          = () => luoTilastoPopup('Käyttökeskukset',           kayttokeskuksetUrlTilasto(),          [''], [''], ['']);
let luoTilastoPopupKytkentaryhmat           = kk => luoTilastoPopup('Kytkentäryhmät',            kytkentaryhmatUrlTilasto(),           kk === true ? names(kayttokeskukset) : [''], [''], ['ei','osittain','kokonaan']);

let luoTilastoPopupLO = () => luoTilastoPopup('LOilmoitukset',       loUrlTilasto(), [''], ['jkv rakennusalue', 'tilapäinen nopeusrajoitus', 'muu ilmoitus', 'opastimen ohitus', 'usean opastimen ohitus', 'baliisiryhmanohitus', 'junakohtainen nopeusrajoitus', 'junan pysäyttäminen', 'lupa ajaa ilman jkv-laitetta', 'varatulle raiteelle', 'muu junakohtainen'], ['Aktiivinen','Poistettu'], true, am4core.color("orange").lighten(-0.5));
let luoTilastoPopupEI = () => luoTilastoPopup('Ennakkoilmoitukset',  eiUrlTilasto(), ['poistettu', 'luonnos', 'hyväksytty'], ['vek', 'eivek'], asiat, true, am4core.color("orange").lighten(-0.5));
let luoTilastoPopupES = () => luoTilastoPopup('Ennakkosuunnitelmat', esUrlTilasto(), ['poistettu', 'peruttu', 'luonnos', 'lähetetty', 'lisätietopyyntö', 'hyväksytty'], estyypit, [''], true, am4core.color("green").lighten(-0.5), );
let luoTilastoPopupVS = () => luoTilastoPopup('Vuosisuunnitelmat',   vsUrlTilasto(), ['vuosiohjelmissa (tila poistunut käytöstä)', 'käynnissä (tila poistunut käytöstä)', 'poistettu', 'alustava', 'toteutuu', 'tehty'], [''], ['investointi', 'kunnossapito', 'ulkopuolisen tahon työ'], true, am4core.color("violet").lighten(-0.5), );

let paivitaNakyvyydet = (series, nakyvat) => {
    series.filter(s => s.dummyData && s.dummyData.subtypes && !s.dummyData.subtypes.every(st => nakyvat[st]))
          .filter(s => s.visible)
          .forEach(s => {
        log("Piilotetaan", s.name);
        s.hide();
    });
    series.filter(s => s.dummyData && s.dummyData.subtypes && s.dummyData.subtypes.every(st => nakyvat[st]))
          .filter(s => !s.visible)
          .forEach(s => {
        log("Näytetään", s.name);
        s.show();
    });
};

let luoTilastoPopup = (nimi, url, tilat, tyypit, tyonlajit, eiPoistumista, vari) => {
    try {
        return luoTilastoPopup_(nimi, url, tilat, tyypit, tyonlajit, eiPoistumista, vari);
    } catch (e) {
        log(e);
        return e;
    }
};
let luoTilastoPopup_ = (nimi, url, tilat, tyypit, tyonlajit, eiPoistumista, vari) => {
    if (tilat.concat(tyypit).concat(tyonlajit).every(x => x == '')) {
        tilat = [nimi];
    }

    let [container, elemHeader] = luoIkkuna(nimi);
    container.setAttribute("class", "popupContainer infoPopup tilastoContainer");

    let content = document.createElement("div");
    
    let id = generateId();
    content.setAttribute("id", id);
    content.setAttribute("class", "tilastoPopup");
    container.appendChild(content);

    dragElement(container);

    let chart = am4core.create(id, am4charts.XYChart);
    window.tilastoChart = chart;
    chart.height = am4core.percent(100);
    chart.events.on("error", errorHandler);

    chart.legend = new am4charts.Legend();
    chart.dateFormatter.dateFormat = "dd.MM.yyyy HH:mm:ss";

    chart.scrollbarX = new am4core.Scrollbar();
    chart.scrollbarY = new am4core.Scrollbar();

    chart.cursor          = new am4charts.XYCursor();
    chart.cursor.behavior = "panXY";

    let xAxis = chart.xAxes.push(new am4charts.DateAxis());
    let yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.extraMax = 0.2;

    //let intervalDay     = { timeUnit: "day",   count: 1 };
    let intervalWeek    = { timeUnit: "week",  count: 1 };
    let intervalMonth   = { timeUnit: "month", count: 1 };
    let intervalQuarter = { timeUnit: "month", count: 3 };
    let intervalYear    = { timeUnit: "year",  count: 1 };

    xAxis.groupData         = true;
    xAxis.groupCount        = 100;
    xAxis.groupIntervals.setAll([
        //intervalDay,
        intervalWeek,
        intervalMonth,
        intervalQuarter,
        intervalYear
    ]);
    xAxis.strictMinMax      = true;
    xAxis.baseInterval      = { timeUnit: "day" };
    xAxis.mainBaseInterval  = { timeUnit: "day" };
    xAxis.tooltipDateFormat = "yyyy-MM-dd";
    xAxis.min               = new Date('2013-01-01T00:00:00Z').getTime();
    xAxis.max               = new Date('2024-01-01T00:00:00Z').getTime();
    
    xAxis.renderer.labels.template.tooltipText = "{value.formatDate(dd.MM.yyyy)}";

    let buttonContainer = chart.plotContainer.createChild(am4core.Container);
    buttonContainer.align       = "left";
    buttonContainer.valign      = "top";
    buttonContainer.layout      = "horizontal";
    buttonContainer.zIndex      = Number.MAX_SAFE_INTEGER;
    buttonContainer.marginTop   = 5;
    buttonContainer.marginRight = 5;

    let makeButton = labelText => {
        let button = buttonContainer.createChild(am4core.Button);
        button.label.fontSize = 12;
        button.paddingLeft = 5;
        button.paddingRight = 5;
        button.label.text = labelText;
        return button;
    };
    

    let togglet = [tilat, tyypit, tyonlajit].find(x => x[0] != '') || [];
    let muut = [tilat, tyypit, tyonlajit].filter(x => x != togglet);

    let nakyvat = {};
    window.nakyvat = nakyvat;
    togglet.filter(x => x != '').forEach(x => nakyvat[x] = false);
    muut.flat().filter(x => x != '').forEach(x => nakyvat[x] = true);

    chart.dataSource = new am4core.DataSource();
    initDS(chart.dataSource);
    monitor(chart.dataSource, "tilasto-" + nimi);

    on(chart.dataSource.events, "parseended", ev => {
        logDiff("Parsitaan tilastoja", nimi, () => {
            let rows = ev.target.data instanceof Array ? ev.target.data : Object.values(ev.target.data).flat();
            var min = new Date().getTime();
            var max = new Date().getTime();
            let data = rows
                .map(x => {
                    let voimassaolo = x.voimassa || x.objektinVoimassaoloaika;
                    let voimassa = limitInterval(voimassaolo).split('/').map(x => new Date(x));
                    let luontiaika = (x.luontiaika && new Date(x.luontiaika)) || voimassa[0];
                    let poistumisaika = voimassa[1];
                    let ret = {
                        tila:          (x.tila || x.korkeus ||
                                        (x.kasinAsetettava === true ? 'Käsin asetettava' : x.kasinAsetettava === false ? 'Keskitetty' : undefined) ||
                                        (x.liikennesuunnittelualue ? lisualueet[x.liikennesuunnittelualue].filter(z => z.nimi.indexOf('(väliaikainen)') == -1).filter(y => intervalsIntersect(voimassaolo)(y.objektinVoimassaoloaika)).map(z => z.nimi)[0] : undefined) ||
                                        (x.liikennesuunnittelualueet ? x.liikennesuunnittelualueet.flatMap(y => lisualueet[y].filter(z => z.nimi.indexOf('(väliaikainen)') == -1).filter(z => intervalsIntersect(voimassaolo)(z.objektinVoimassaoloaika))).map(y => y.nimi)[0] : undefined) ||
                                        (x.kayttokeskukset ? x.kayttokeskukset.flatMap(y => kayttokeskukset[y].filter(z => intervalsIntersect(voimassaolo)(z.objektinVoimassaoloaika))).map(y => y.nimi)[0] : undefined) ||
                                        (tilat.filter(y => y != '').length == 1 ? tilat[0] : '')
                                       ).toLowerCase(),
                        tunniste:      x.tunniste.replace('1.2.246.586.', ''),
                        tyyppi:        (x.tyyppi || 
                                        (x.baliisi ? x.baliisi.tyyppi : undefined) ||
                                        (x.opastin ? opastintyypit.find(y => y.tyyppi == x.opastin.tyyppi).nimi : undefined) ||
                                        (x.vaihde ? vaihdetyypit.find(y => y.tyyppi == x.vaihde.tyyppi).kuvaus : undefined) ||
                                        (x.pysaytyslaite ? (x.pysaytyslaite.kasinAsetettava === true ? 'Käsin asetettava' : x.pysaytyslaite.kasinAsetettava === false ? 'Keskitetty' : undefined) : undefined) ||
                                        (x.ryhmityseristin ? (x.ryhmityseristin.nopeastiAjettava === true ? 'Nopeasti ajettava' : x.ryhmityseristin.nopeastiAjettava === false ? 'Hitaasti ajettava' : undefined) : undefined) ||
                                        (x.kunnossapitoalue ? kpalueet[x.kunnossapitoalue].filter(y => intervalsIntersect(voimassaolo)(y.objektinVoimassaoloaika)).map(y => y.nimi)[0] : undefined) ||
                                        (x.liikenteenohjausalue ? ohjausalueet[x.liikenteenohjausalue].filter(y => intervalsIntersect(voimassaolo)(y.objektinVoimassaoloaika)).map(y => y.nimi)[0] : undefined) ||
                                        x.kayttotarkoitus ||
                                        x.varoituslaitos ||
                                        (x.ensimmaisenLuokanAlueidenRaja === true ? '1./1.' : x.ensimmaisenLuokanAlueidenRaja === false ? '1./2.' : undefined) ||
                                       '').toLowerCase(),
                        tyonlaji:      (x.tyonlaji || x.asia || x.maadoitus ||
                                        (x.pysaytyslaite ? (x.pysaytyslaite.varmuuslukittu === true ? 'Varmuuslukittu' : x.pysaytyslaite.varmuuslukittu === false ? 'Lukitsematon' : undefined) : undefined) ||
                                       '').toLowerCase(), 
                        alku:          voimassa[0].getTime(),
                        loppu:         voimassa[1].getTime(),
                        luontiaika:    luontiaika.getTime(),
                        poistumisaika: x.objektinVoimassaoloaika ? poistumisaika.getTime() : undefined
                    };
                    min = Math.min(min, ret.alku, ret.luontiaika);
                    max = Math.max(max, ret.loppu, ret.poistumisaika || ret.loppu);
                    return ret;
                });
            if (min < new Date(2013, 0, 0).getTime()) {
                min = new Date(2013, 0, 0).getTime();
            }
            if (max > new Date(2024, 0, 0).getTime()) {
                max = new Date(2024, 0, 0).getTime();
            }
            let valit = dateFns.dateFns.eachDayOfInterval({ start: new Date(min), end: new Date(max)});
            ev.target.data = valit.map(v => {
                let alku = v.getTime();
                let loppu = dateFns.dateFns.addDays(v, 1).getTime();
                let r = {
                    alku:       alku,
                    loppu:      loppu,
                    loppuPlusOne: dateFns.dateFns.addMinutes(dateFns.dateFns.addDays(v, 2), -1).getTime(),
                    voimassa:   data.filter(x => x.alku < loppu && alku < x.loppu),
                    luodut:     data.filter(x => x.luontiaika < loppu && alku <= x.luontiaika),
                    poistuneet: data.filter(x => x.poistumisaika && x.poistumisaika < loppu && alku <= x.poistumisaika)
                };
                return r;
            }).filter(x => x.voimassa.length + x.luodut.length + x.poistuneet.length > 0);
        });
    });

    let voimassaolon  =                      luo(vari, tilat, tyypit, tyonlajit, 'voimassaolo'  , nakyvat, togglet);
    let luontiajan    =                      luo(vari, tilat, tyypit, tyonlajit, 'luontiaika'   , nakyvat, togglet);
    let poistumisajan = eiPoistumista ? [] : luo(vari, tilat, tyypit, tyonlajit, 'poistumisaika', nakyvat, togglet);
    window.tilastoSeries = [voimassaolon, luontiajan, poistumisajan];

    // gotta set stacked only after the chart is ready. Otherwise hoooooorribly slow.
    once(voimassaolon[0].events, "validated", () => logDiff("Asetetaan stacked", () => {
        voimassaolon.forEach(series => series.stacked = true);
        luontiajan.forEach(series => series.stacked = true);
        poistumisajan.forEach(series => series.stacked = true);
    }));

    chart.dataSource.url = url;

    var moodi;
    let ryhmittely = () => moodi.label.text;

    muut.flat()
        .filter(x => x != '')
        .forEach(x => {
            let button = makeButton(x);
            button.paddingLeft = 2;
            button.paddingRight = 2;
            button.background.states.create("active").properties.fill = button.background.fill.lighten(-0.5);
            button.isActive = nakyvat[x];

            on(button.events, "hit", ev => {
                ev.target.isActive = !ev.target.isActive;
                nakyvat[x] = ev.target.isActive;
                if (ryhmittely() == 'luontiaika') {
                    paivitaNakyvyydet(luontiajan, nakyvat);
                }
                if (ryhmittely() == 'poistumisaika') {
                    paivitaNakyvyydet(poistumisajan, nakyvat);
                }
                if (ryhmittely() == 'voimassaolo') {
                    paivitaNakyvyydet(voimassaolon, nakyvat);
                }
            });
    });

    moodi = makeButton('voimassaolo');
    moodi.tooltipText = 'Ryhmitelty voimassaolon mukaan';
    moodi.marginLeft = 50;

    let zoomButton = makeButton('zoom');
    zoomButton.tooltipText = 'Zoomaa alueeseen';
    zoomButton.background.states.create("active").properties.fill = zoomButton.background.fill.lighten(-0.5);
    on(zoomButton.events, "hit", ev => {
        if (ev.target.isActive) {
            chart.cursor.behavior = "panXY";
        } else {
            chart.cursor.behavior = "zoomXY";
            zoomButton.isActive = false;
        }
        ev.target.isActive = !ev.target.isActive;
    });
    on(chart.cursor.events, "zoomended", () => {
        chart.cursor.behavior = "panXY";
        zoomButton.isActive = false;
    });

    let intervalAutoButton = makeButton('auto');
    intervalAutoButton.tooltipText = 'Ryhmittely automaattisesti';
    intervalAutoButton.marginLeft = 50;
    on(intervalAutoButton.events, "hit", ev => {
        xAxis.groupInterval = undefined;
    });
    let intervalYearButton = makeButton('y');
    intervalYearButton.tooltipText = 'Ryhmittely vuosittain';
    on(intervalYearButton.events, "hit", ev => {
        xAxis.groupInterval = intervalYear;
    });
    let intervalQuarterButton = makeButton('q');
    intervalQuarterButton.tooltipText = 'Ryhmittely kvartaaleittain';
    on(intervalQuarterButton.events, "hit", ev => {
        xAxis.groupInterval = intervalQuarter;
    });
    let intervalMonthButton = makeButton('m');
    intervalMonthButton.tooltipText = 'Ryhmittely kuukausittain';
    on(intervalMonthButton.events, "hit", ev => {
        xAxis.groupInterval = intervalMonth;
    });
    let intervalWeekButton = makeButton('w');
    intervalWeekButton.tooltipText = 'Ryhmittely viikoittain';
    on(intervalWeekButton.events, "hit", ev => {
        xAxis.groupInterval = intervalWeek;
    });
    /*let intervalDayButton = makeButton('d');
    intervalDayButton.tooltipText = 'Ryhmittely päivittäin';
    on(intervalDayButton.events, "hit", ev => {
        xAxis.groupInterval = intervalDay;
    });*/

    on(moodi.events, "hit", () => {
        if (ryhmittely() == 'voimassaolo') {
            moodi.label.text = 'luontiaika';
            moodi.tooltipText = 'Ryhmitelty luontiajan mukaan';
            poistumisajan.forEach(hide);
            voimassaolon.forEach(hide);
            luontiajan.forEach(show);
        } else if (ryhmittely() == 'luontiaika' && !eiPoistumista) {
            moodi.label.text = 'poistumisaika';
            moodi.tooltipText = 'Ryhmitelty poistumisajan mukaan';
            luontiajan.forEach(hide);
            voimassaolon.forEach(hide);
            poistumisajan.forEach(show);
        } else if (ryhmittely() == 'poistumisaika' || eiPoistumista) {
            moodi.label.text = 'voimassaolo';
            moodi.tooltipText = 'Ryhmitelty voimassaolon mukaan';
            luontiajan.forEach(hide);
            poistumisajan.forEach(hide);
            voimassaolon.forEach(show);    
        }
    });

    chart.series.pushAll(luontiajan);
    chart.series.pushAll(poistumisajan);
    chart.series.pushAll(voimassaolon);

    voimassaolon.forEach(show);
};

let show = x => {
    if (!x.dummyData || !x.dummyData.subtypes) {
        x.show();
        x.hiddenInLegend = false;
    }
};
let hide = x => {
    if (!x.dummyData || !x.dummyData.subtypes) {
        x.hide();
        x.hiddenInLegend = true;
    }
};

let luo = (vari, tilat, tyypit, tyonlajit, ryhmittely, nakyvat, togglet) => {
    let colorSet = new am4core.ColorSet();
    let togglevari = i => vari ? vari.lighten(i*(1/togglet.length)) : colorSet.getIndex(i);

    let f = grouping(ryhmittely);
    let series = tilat.flatMap((tila,i) => tyypit.flatMap((tyyppi,j) => tyonlajit.map((tyonlaji,k) => f(luoSeries(tila, tyyppi, tyonlaji, togglevari(togglet == tilat ? i : togglet == tyypit ? j : k), ryhmittely))(tila, tyyppi, tyonlaji))));
    if (series.length == 0) {
        return series;
    }

    let toggles = togglet.map((tog,i) => {
        let toggle               = new am4charts.ColumnSeries();
        toggle.name              = tog;
        toggle.fill              = togglevari(i)
        toggle.stroke            = toggle.fill;
        toggle.hidden            = true;
        toggle.hiddenInLegend    = true;
        toggle.dataFields.dateX  = 'dummy1';
        toggle.dataFields.valueY = "dummy2";
        on(toggle.events, "hidden", () => {
            series.filter(x => x.dummyData && x.dummyData.subtypes && x.dummyData.subtypes.includes(tog))
                  .forEach(x => {
                      nakyvat[tog] = false;
                  })
            paivitaNakyvyydet(series, nakyvat);
        });
        on(toggle.events, "shown", () => {
            series.filter(x => x.dummyData && x.dummyData.subtypes && x.dummyData.subtypes.includes(tog))
                  .forEach(x => {
                      nakyvat[tog] = true;
                  })
            paivitaNakyvyydet(series, nakyvat);
        });
        return toggle;
    });

    return series.concat(toggles);
};

let luoSeries = (tila, tyyppi, tyonlaji, vari, ryhmittely) => {
    let series = new am4charts.ColumnSeries();
    series.fill                 = vari;
    series.name                 = tila + '-' + tyyppi + '-' + tyonlaji + " - " + ryhmittely;
    series.columns.template.width  = am4core.percent(100);
    series.columns.template.stroke = vari.lighten(-0.1);
    series.tooltipText          = "{valueY} kpl" + (tila ? ', ' + tila : '') + (tyyppi ? ', ' + tyyppi : '') + (tyonlaji ? '\n' + tyonlaji : '') + "\nAIKA{dateX.formatDate('i')}/{loppuPlusOne.formatDate('i')}";
    series.simplifiedProcessing = true;
    series.showOnInit           = false;
    series.dataFields.dateX     = 'loppu';
    series.dataFields.valueY    = 'value';
    series.hidden               = true;
    series.hiddenInLegend       = true;
    add(series.tooltip.label.adapter, "text", (text, target) => target.dataItem && target.dataItem.valueY == 0 ? '' : text);
    add(series.tooltip.label.adapter, "textOutput", text => text && !text.endsWith('AIKA/') ? text.replace(/AIKA.*/g, '') + muotoileAikavali(text.replace(/[.\s\S]*AIKA(.*)/m, "$1")) : text);
    on(series.tooltip.events, 'shown', () => document.querySelectorAll('.popupContainer').forEach(x => x.classList.add('manualOverflow')));
    on(series.tooltip.events, 'hidden', () => document.querySelectorAll('.popupContainer').forEach(x => x.classList.remove('manualOverflow')));
    
    series.dummyData            = { subtypes: [tila, tyyppi, tyonlaji].filter(x => x != '') };

    return series;
}

let grouping = ryhmittely => series => (tila, tyyppi, tyonlaji) => {
    add(series.adapter, "groupDataItem", val => {
        let tila_ = tila.toLowerCase();
        let tyyppi_ = tyyppi.toLowerCase();
        let tyonlaji_ = tyonlaji.toLowerCase();
        let elems = new Set();
        val.dataItem.groupDataItems
            .forEach(x => (ryhmittely == 'voimassaolo' ? x.dataContext.voimassa : ryhmittely == 'luontiaika' ? x.dataContext.luodut : ryhmittely == 'poistumisaika' ? x.dataContext.poistuneet : undefined)
                .forEach(y => {
                    if ((tila_ == '' || y.tila == tila_) &&
                        (tyyppi_ == '' || y.tyyppi == tyyppi_) &&
                        (tyonlaji_ == '' || y.tyonlaji == tyonlaji_)) {
                      elems.add(y.tunniste);
                    }
                })
            );
        val.value = elems.size;
        return val;
    });
    return series;
};