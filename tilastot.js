var estyypit = ['Rakentaminen', 'Kunnossapito'];
var asiat = [];
getJson(asiatUrl(), data => {
    asiat = data.map(d => d.asia);
});

let luoTilastoPopupEI = () => luoTilastoPopup('Ennakkoilmoitukset', eiUrlTilasto(), am4core.color("orange").lighten(-0.5), ['poistettu', 'luonnos', 'hyväksytty'], ['vek', 'eivek'], asiat);
let luoTilastoPopupES = () => luoTilastoPopup('Ennakkosuunnitelmat', esUrlTilasto(), am4core.color("green").lighten(-0.5), ['poistettu', 'peruttu', 'luonnos', 'lähetetty', 'lisätietopyyntö', 'hyväksytty'], estyypit, ['']);
let luoTilastoPopupVS = () => luoTilastoPopup('Vuosisuunnitelmat', vsUrlTilasto(), am4core.color("violet").lighten(-0.5), ['vuosiohjelmissa (tila poistunut käytöstä)', 'käynnissä (tila poistunut käytöstä)', 'poistettu', 'alustava', 'toteutuu', 'tehty'], [''], ['investointi', 'kunnossapito', 'ulkopuolisen tahon työ']);

let paivitaNakyvyydet = (series, nakyvat) => {
    series.filter(s => s.visible)
          .filter(s => s.dummyData && s.dummyData.subtypes && !s.dummyData.subtypes.every(st => nakyvat[st]))
          .forEach(s => {
        log("Piilotetaan", s.name);
        s.hide();
    });
    series.filter(s => !s.visible)
          .filter(s => s.dummyData && s.dummyData.subtypes && s.dummyData.subtypes.every(st => nakyvat[st]))
          .forEach(s => {
        log("Näytetään", s.name);
        s.show();
    });
};

let luoTilastoPopup = (nimi, url, vari, tilat, tyypit, tyonlajit) => {
    let [container, elemHeader] = luoIkkuna(nimi);
    container.setAttribute("class", "popupContainer infoPopup tilastoContainer");

    let content = document.createElement("div");
    
    let id = ''+Math.random();
    content.setAttribute("id", id);
    content.setAttribute("class", "tilastoPopup");
    container.appendChild(content);

    dragElement(container);

    let chart = am4core.create(id, am4charts.XYChart);
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

    xAxis.groupData         = true;
    xAxis.groupCount        = 100;
    xAxis.groupIntervals.setAll([
        { timeUnit: "day",   count: 1 },
        { timeUnit: "week",  count: 1 },
        { timeUnit: "month", count: 1 },
        { timeUnit: "year",  count: 1 }
    ]);
    xAxis.strictMinMax      = true;
    xAxis.baseInterval      = { timeUnit: "day" }; // automatiikka tuntuu asettavan joksikin muuksi
    xAxis.mainBaseInterval  = { timeUnit: "day" };
    xAxis.tooltipDateFormat = "yyyy-MM-dd";
    xAxis.max               = new Date('2025-01-01T00:00:00Z').getTime();
    
    xAxis.renderer.labels.template.tooltipText = "{value.formatDate(dd.MM.yyyy)}";

    let buttonContainer = chart.plotContainer.createChild(am4core.Container);
    buttonContainer.align       = "left";
    buttonContainer.valign      = "top";
    buttonContainer.layout      = "horizontal";
    buttonContainer.zIndex      = Number.MAX_SAFE_INTEGER;
    buttonContainer.marginTop   = 5;
    buttonContainer.marginRight = 5;

    // by default, hide states but show tyypit/tyonlajit
    let nakyvat = {};
    tilat.filter(x => x != '').forEach(x => nakyvat[x] = false);
    tyypit.filter(x => x != '').concat(tyonlajit).forEach(x => nakyvat[x] = true);

    let ds = new am4core.DataSource();
    initDS(ds);
    monitor(ds, "tilasto-" + nimi);

    let voimassaolon = luo(nimi, ds, vari, tilat, tyypit, tyonlajit, false, nakyvat);
    let luontiajan = luo(nimi, ds, vari, tilat, tyypit, tyonlajit, true, nakyvat);

    on(ds.events, "done", ev => {
        logDiff("Asetetaan data", () => {
            log("Dataa voimassaolon mukaan", ev.target.voimassaolonMukaan.length, ",", "luontiajan mukaan", ev.target.luontiajanMukaan.length);
            voimassaolon.filter(x => x.dummyData && x.dummyData.subtypes)
                        .forEach(series => series.data = ev.target.voimassaolonMukaan);
            
            // laitetaan luontiaikadata chartille, niin on hiukan nopeampi
            chart.data = ev.target.luontiajanMukaan;
        });
    });

    // gotta set stacked only after the chart is ready. Otherwise hoooooorribly slow.
    once(voimassaolon[0].events, "validated", () => logDiff("Asetetaan stacked", () => {
        voimassaolon.forEach(series => series.stacked = true);
        luontiajan.forEach(series => series.stacked = true);
    }));

    ds.url = url;
    ds.load();

    var moodi;
    let ryhmitteleLuontiajanMukaan = () => moodi.label.text == 'luontiaika';

    tyypit.concat(tyonlajit)
          .filter(x => x != '')
          .forEach(x => {
        let button = buttonContainer.createChild(am4core.Button);
        button.label.text = x;
        button.label.fontSize = 12;
        button.paddingLeft = 2;
        button.paddingRight = 2;
        button.background.states.create("active").properties.fill = button.background.fill.lighten(-0.5);
        button.isActive = nakyvat[x];

        on(button.events, "hit", ev => {
            ev.target.isActive = !ev.target.isActive;
            nakyvat[x] = ev.target.isActive;
            let series = ryhmitteleLuontiajanMukaan() ? luontiajan : voimassaolon;
            paivitaNakyvyydet(series, nakyvat);
        });
    });

    moodi = buttonContainer.createChild(am4core.Button);
    moodi.label.text = 'voimassaolo';
    moodi.tooltipText = 'Ryhmitelty voimassaolon mukaan';
    moodi.marginLeft = 100;

    let zoomButton = buttonContainer.createChild(am4core.Button);
    zoomButton.label.text = "zoom";
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

    on(moodi.events, "hit", () => {
        if (ryhmitteleLuontiajanMukaan()) {
            moodi.label.text = 'voimassaolo';
            moodi.tooltipText = 'Ryhmitelty voimassaolon mukaan';
            luontiajan.forEach(hide);
            voimassaolon.forEach(show);    
        } else {
            moodi.label.text = 'luontiaika';
            moodi.tooltipText = 'Ryhmitelty luontiajan mukaan';
            voimassaolon.forEach(hide);
            luontiajan.forEach(show);
        }
    });

    chart.series.pushAll(luontiajan);
    chart.series.pushAll(voimassaolon);

    voimassaolon.forEach(show);
};

let show = x => {
    if (!x.dummyData || !x.dummyData.subtypes) {
        x.show();
        x.hiddenInLegend = false;
    }
};
let hide = x => {
    if (!x.dummyData || !x.dummyData.subtypes) {
        x.hide();
        x.hiddenInLegend = true;
    }
};

let luo = (nimi, ds, vari, tilat, tyypit, tyonlajit, ryhmitteleLuontiajanMukaan, nakyvat) => {
    if (ryhmitteleLuontiajanMukaan) {
        on(ds.events, "parseended", ev => {
            logDiff("Parsitaan", nimi, "luontiajan mukaan", () => {
                let ret = {};
                ev.target.data.forEach(x => {
                    // grouppaus, koska dataa on muuten liian paljon.
                    let o = {
                        tila:     x.tila,
                        tyyppi:   x.tyyppi || '',
                        tyonlaji: x.tyonlaji || x.asia || '', 
                        loppu:    dateFns.dateFns.setMinutes(dateFns.dateFns.roundToNearestMinutes(new Date(x.luontiaika)), 0),
                        value:    1
                    };
                    // pyöristetään vuorokausiin jos rivejä liikaa
                    o.loppu = ev.target.data.length > 5000 ? dateFns.dateFns.setHours(o.loppu, 0).getTime() : o.loppu.getTime();
                    let hash = o.tila + '_' + o.tyyppi + '_' + o.tyonlaji + '_' + o.loppu;
                    if (ret[hash]) {
                        ret[hash].value += 1;
                    } else {
                        ret[hash] = o;
                    }
                });
                ev.target.luontiajanMukaan = Object.values(ret);
            });
        });
    } else {
        on(ds.events, "parseended", ev => {
            logDiff("Parsitaan", nimi, "voimassaolon mukaan", () => {
                let aikavalit = ev.target.data
                    .map(x => {
                        let voim = x.voimassa.split('/').map(y => new Date(y));
                        let ret = {
                            tila:             x.tila,
                            sisainenTunniste: x.sisainenTunniste,
                            tyyppi:           x.tyyppi || '',
                            tyonlaji:         x.tyonlaji || x.asia || '', 
                            alku:             dateFns.dateFns.setMinutes(dateFns.dateFns.roundToNearestMinutes(voim[0]), 0),
                            loppu:            dateFns.dateFns.setMinutes(dateFns.dateFns.roundToNearestMinutes(voim[1]), 0),
                        }
                        // pyöristetään vuorokausiin jos rivejä liikaa
                        ret.alku = ev.target.data.length > 5000 ? dateFns.dateFns.setHours(ret.alku, 0).getTime() : ret.alku.getTime();
                        ret.loppu = ev.target.data.length > 5000 ? dateFns.dateFns.setHours(ret.loppu, 0).getTime() : ret.loppu.getTime();
                        return ret;
                    });
                let ajanhetket = [...new Set(aikavalit.flatMap(x => [x.alku, x.loppu]))].sort();
                let muutoshetket = new Map();
                aikavalit.forEach(x => {
                    let a = muutoshetket.get(x.alku);
                    if (!a) {
                        a = [new Set(), new Set()];
                        muutoshetket.set(x.alku, a);
                    }
                    a[0].add(x.tila + '-' + x.tyyppi + '-' + x.tyonlaji + '-' + x.sisainenTunniste);
    
                    let b = muutoshetket.get(x.loppu);
                    if (!b) {
                        b = [new Set(), new Set()];
                        muutoshetket.set(x.loppu, b);
                    }
                    b[1].add(x.tila + '-' + x.tyyppi + '-' + x.tyonlaji + '-' + x.sisainenTunniste);
                });
                let cur = new Set();
                let alku = new Date('2014-01-01T00:00:00Z').getTime();
                let loppu = new Date('2025-01-01T00:00:00Z').getTime();
                ev.target.voimassaolonMukaan = ajanhetket
                    .filter(x => x >= alku && x < loppu)
                    .map((x,i) => {
                        let diff = muutoshetket.get(x);
                        diff[0].forEach(y => cur.add(y));
                        diff[1].forEach(y => cur.delete(y));
                        return {
                            alku:  new Date(x),
                            loppu: i == ajanhetket.length ? new Date(x) : new Date(ajanhetket[i+1]),
                            elements: [...cur],
                            value: cur.size
                        };
                    });
            });
        });
    }

    let tilavari = i => vari.lighten(i*(1/tilat.length));
    let f = ryhmitteleLuontiajanMukaan ? luontiajanMukaan(ds) : voimassaolonMukaan(ds);
    let series = tilat.flatMap((tila,i) => tyypit.flatMap(tyyppi => tyonlajit.map(tyonlaji => f(luoSeries(tila, tyyppi, tyonlaji, tilavari(i)))(tila, tyyppi, tyonlaji))));

    let toggles = tilat.map((tila,i) => {
        let toggle               = new am4charts.ColumnSeries();
        toggle.name              = tila;
        toggle.fill              = tilavari(i)
        toggle.stroke            = toggle.fill;
        toggle.hidden            = true;
        toggle.hiddenInLegend    = true;
        //toggle.stacked           = true;
        toggle.dataFields.dateX  = 'dummy1';
        toggle.dataFields.valueY = "dummy2";
        on(toggle.events, "hidden", () => {
            series.filter(x => x.dummyData && x.dummyData.subtypes && x.dummyData.subtypes.includes(tila))
                  .forEach(x => {
                      nakyvat[tila] = false;
                  })
            paivitaNakyvyydet(series, nakyvat);
        });
        on(toggle.events, "shown", () => {
            series.filter(x => x.dummyData && x.dummyData.subtypes && x.dummyData.subtypes.includes(tila))
                  .forEach(x => {
                      nakyvat[tila] = true;
                  })
            paivitaNakyvyydet(series, nakyvat);
        });
        return toggle;
    });

    return series.concat(toggles);
};

let luoSeries = (tila, tyyppi, tyonlaji, vari) => {
    let series = new am4charts.ColumnSeries();
    //series.dataSource           = new am4core.DataSource();
    series.fill                 = vari;
    series.name                 = tila + '-' + tyyppi + '-' + tyonlaji;
    series.columns.template.width  = am4core.percent(100);
    series.columns.template.stroke = vari.lighten(0.2);
    series.tooltipText          = tila + " ({valueY} kpl)" + (tyyppi ? '\n' + tyyppi : '') + (tyonlaji ? '\n' + tyonlaji : '') + "\nvälillä {dateX.formatDate('dd.MM.yyyy')}-{loppu.formatDate('dd.MM.yyyy')}";
    series.simplifiedProcessing = true;
    series.showOnInit           = false;
    series.dataFields.dateX     = 'loppu';
    series.dataFields.valueY    = 'value';
    //series.stacked              = true;
    series.hidden               = true;
    series.hiddenInLegend       = true;
    series.tooltip.label.adapter.add("text", (text, target) => target.dataItem && target.dataItem.valueY == 0 ? '' : text);
    
    series.dummyData            = { subtypes: [tila, tyyppi, tyonlaji].filter(x => x != '') };

    return series;
}

let luontiajanMukaan = ds => series => (tila, tyyppi, tyonlaji) => {
    add(series.adapter, "groupDataItem", val => {
        val.value = val.dataItem.groupDataItems
            .filter(x => x.dataContext.tila == tila &&
                         x.dataContext.tyyppi == tyyppi &&
                         x.dataContext.tyonlaji == tyonlaji)
            .map(x => x.dataContext.value)
            .reduce((a, b) => a + b, 0);
        return val;
    });
    return series;
};

let voimassaolonMukaan = ds => series => (tila, tyyppi, tyonlaji) => {
    add(series.adapter, "groupDataItem", val => {
        let elems = new Set();
        val.dataItem.groupDataItems
            //.filter(x => !x.dataContext.tyyppi || ds.includeTyyppi.includes(x.dataContext.tyyppi))
            .forEach(x => x.dataContext.elements.forEach(e => {
                if (e.startsWith(tila) &&
                    (tyyppi == '' || e.indexOf(tyyppi) >= 0) &&
                    (tyonlaji == '' || e.indexOf(tyonlaji) >= 0)) {
                    elems.add(e);
                }
            }));
        val.value = elems.size;
        return val;
    });
    return series;
};
