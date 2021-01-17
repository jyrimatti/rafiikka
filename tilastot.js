
let luoTilastoPopupEI = () => luoTilastoPopup('Ennakkoilmoitukset', eiUrlTilasto(), am4core.color("orange").lighten(-0.5), ['Poistettu', 'Luonnos', 'Hyväksytty']);
let luoTilastoPopupES = () => luoTilastoPopup('Ennakkosuunnitelmat', esUrlTilasto(), am4core.color("green").lighten(-0.5), ['Poistettu', 'Peruttu', 'Luonnos', 'Lähetetty', 'Lisätietopyyntö', 'Hyväksytty']);
let luoTilastoPopupVS = () => luoTilastoPopup('Vuosisuunnitelmat', vsUrlTilasto(), am4core.color("violet").lighten(-0.5), ['Vuosiohjelmissa (tila poistunut käytöstä)', 'Käynnissä (tila poistunut käytöstä)', 'Poistettu', 'Alustava', 'Toteutuu', 'Tehty']);

let luoTilastoPopup = (tunniste, url, vari, tilat) => {
    let [container, elemHeader] = luoIkkuna(tunniste);
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
    xAxis.strictMinMax      = true;
    xAxis.baseInterval      = { timeUnit: "day" }; // automatiikka tuntuu asettavan joksikin muuksi
    xAxis.mainBaseInterval  = { timeUnit: "day" };
    xAxis.tooltipDateFormat = "yyyy-MM-dd";
    xAxis.max               = new Date('2025-01-01T00:00:00Z').getTime();
    
    xAxis.renderer.labels.template.tooltipText = "{value.formatDate(dd.MM.yyyy)}";

    let buttonContainer = chart.plotContainer.createChild(am4core.Container);
    buttonContainer.align       = "right";
    buttonContainer.valign      = "top";
    buttonContainer.layout      = "horizontal";
    buttonContainer.zIndex      = Number.MAX_SAFE_INTEGER;
    buttonContainer.marginTop   = 5;
    buttonContainer.marginRight = 5;

    let moodi = buttonContainer.createChild(am4core.Button);
    moodi.label.text = 'voimassaolo';
    moodi.tooltipText = 'Ryhmitelty voimassaolon mukaan';
    let ryhmitteleLuontiajanMukaan = () => moodi.label.text == 'voimassaolo';

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

    let ds = new am4core.DataSource();;
    initDS(ds);
    monitor(ds, "tilasto-" + tunniste);

    let voimassaolon = luo(ds, vari, tilat, !ryhmitteleLuontiajanMukaan());
    let luontiajan = luo(ds, vari, tilat, ryhmitteleLuontiajanMukaan());

    ds.url = url;
    ds.load();

    on(moodi.events, "hit", () => {
        if (ryhmitteleLuontiajanMukaan()) {
            moodi.label.text = 'luontiaika';
            moodi.tooltipText = 'Ryhmitelty luontiajan mukaan';
            voimassaolon.forEach(hide);
            luontiajan.forEach(show);
        } else {
            moodi.label.text = 'voimassaolo';
            moodi.tooltipText = 'Ryhmitelty voimassaolon mukaan';
            luontiajan.forEach(hide);
            voimassaolon.forEach(show);
        }
    });

    chart.series.pushAll(luontiajan);
    chart.series.pushAll(voimassaolon);

    voimassaolon.forEach(x => on(x.events, "ready", () => show(x)));
};

let show = x => {
    x.show();
    x.hiddenInLegend = false;
};
let hide = x => {
    x.hide();
    x.hiddenInLegend = true;
};

let luo = (ds, vari, tilat, ryhmitteleLuontiajanMukaan) => {
    if (ryhmitteleLuontiajanMukaan) {
        on(ds.events, "parseended", ev => {
            logDiff("Parsitaan luontiajan mukaan", () => {
                ev.target.luontiajanMukaan = ev.target.data.map(x => ({
                    tila:  x.tila,
                    loppu: x.luontiaika
                }));
            });
        });
    } else {
        on(ds.events, "parseended", ev => {
            logDiff("Parsitaan voimassaolon mukaan", () => {
                let aikavalit = ev.target.data.map(x => ({
                    tila:  x.tila,
                    sisainenTunniste: x.sisainenTunniste,
                    alku:  x.voimassa.split('/').map(y => new Date(y).getTime())[0],
                    loppu: x.voimassa.split('/').map(y => new Date(y).getTime())[1]
                }));
                let ajanhetket = [...new Set(aikavalit.flatMap(x => [x.alku, x.loppu]))].sort();
                let muutoshetket = new Map();
                aikavalit.forEach(x => {
                    let a = muutoshetket.get(x.alku);
                    if (!a) {
                        a = [new Set(), new Set()];
                        muutoshetket.set(x.alku, a);
                    }
                    a[0].add(x.tila + ' ' + x.sisainenTunniste);
    
                    let b = muutoshetket.get(x.loppu);
                    if (!b) {
                        b = [new Set(), new Set()];
                        muutoshetket.set(x.loppu, b);
                    }
                    b[1].add(x.tila + ' ' + x.sisainenTunniste);
                });
                let cur = new Set();
                ev.target.voimassaolonMukaan = ajanhetket.map((x,i) => {
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
    
    let f = ryhmitteleLuontiajanMukaan ? luontiajanMukaan(ds) : voimassaolonMukaan(ds);
    return tilat.map((x,i) => f(x.toLowerCase(), luoSeries(x, vari.lighten(i*(1/tilat.length)))));
};

let luoSeries = (tila, vari) => {
    let series = new am4charts.ColumnSeries();
    series.dataSource           = new am4core.DataSource();
    series.fill                 = vari;
    series.name                 = tila;
    series.columns.template.width  = am4core.percent(100);
    series.columns.template.stroke = "gray";
    series.tooltipText          = tila + " {valueY} kpl\nvälillä {dateX.formatDate('dd.MM.yyyy')}-{loppu.formatDate('dd.MM.yyyy')}";
    series.simplifiedProcessing = true;
    series.showOnInit           = false;
    series.dataFields.dateX     = 'loppu';
    series.dataFields.valueY    = 'value';
    series.stacked              = true;
    series.hidden               = true;
    series.hiddenInLegend       = true;
    series.tooltip.label.adapter.add("text", (text, target) => target.dataItem && target.dataItem.valueY == 0 ? '' : text);
    
    return series;
}

let luontiajanMukaan = ds => (tila, series) => {
    add(series.adapter, "groupDataItem", val => {
        val.value = val.dataItem.groupDataItems.filter(x => x.dataContext.tila == tila).length;
        return val;
    });
    on(ds.events, "done", ev => {
        series.dataSource.data = ev.target.luontiajanMukaan;
        series.dataSource.dispatchImmediately("done", {data: series.dataSource.data});
    });
    return series;
};

let voimassaolonMukaan = ds => (tila, series) => {
    add(series.adapter, "groupDataItem", val => {
        var elems;
        for(let i = 0; i < val.dataItem.groupDataItems.length; i++) {
            let item = val.dataItem.groupDataItems[i]
            if (!elems) {
                elems = new Set(item.dataContext.elements);
            } else {
                item.dataContext.elements.forEach(x => elems.add(x));
            }
        }
        val.value = elems.size;
        return val;
    });
    on(ds.events, "done", ev => {
        let data = ev.target.voimassaolonMukaan.map(x => {
            let elems = x.elements.filter(y => y.startsWith(tila));
            return {
                alku: x.alku,
                loppu: x.loppu,
                elements: elems,
                value: elems.length
            };
        });
        series.dataSource.data = data;
        series.dataSource.dispatchImmediately("done", {data: data});
    });
    return series;
};
