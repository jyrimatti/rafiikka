let luoRaidePopup = tunniste => {
    try {
        return luoRaidePopup_(tunniste);
    } catch (e) {
        log(e);
        return e;
    }
};
let luoRaidePopup_ = tunniste => {
    let [container, elemHeader] = luoIkkuna(tunniste);
    container.setAttribute("class", "popupContainer raidePopup");

    let open = document.createElement("div");
    open.setAttribute("class", "open");

    open.innerHTML = luoLinkit('raide', tunniste, tunniste);
    elemHeader.appendChild(open);

    let haku = document.createElement('input');
    haku.setAttribute('placeholder', 'hae...');
    haku.setAttribute('style', 'display: none');
    container.appendChild(haku);

    let content = document.createElement("div");
    
    let id = generateId();
    content.setAttribute("id", id);
    content.setAttribute("class", "raide");
    container.appendChild(content);

    window.raidepopup = am4core.create(id, am4charts.XYChart);
    raidepopup.height = am4core.percent(100);
    raidepopup.paddingTop = 40;
    raidepopup.events.on("error", errorHandler);

    dragElement(container, tunniste);
    moveElement(container, () => raidepopup.series.values.map(x => x.name).join(","));

    raidepopup.scrollbarX = new am4core.Scrollbar();
    raidepopup.scrollbarY = new am4core.Scrollbar();

    raidepopup.cursor          = new am4charts.XYCursor();
    raidepopup.cursor.behavior = "panXY";
    raidepopup.numberFormatter.numberFormat = "#";

    let xAxis = raidepopup.xAxes.push(new am4charts.ValueAxis());
    let yAxis = raidepopup.yAxes.push(new am4charts.ValueAxis());

    add(xAxis.renderer.labels.template.adapter, "text", x => Math.floor(parseInt(x)/1000) + "+" + (parseInt(x)%1000));

    yAxis.dataFields.value = 'valueY';
    add(yAxis.renderer.labels.template.adapter, "text", x => x + 'm');

    let bullet                        = new am4core.Circle();
    bullet.radius                     = 2;
    bullet.tooltipText                = "Taitepisteen korkeus N2000: {valueY}m\n{ratakmsijainti}";
    bullet.states.create("hover").properties.scale = 1.5;

    var search;

    let initSeries = tunniste => {
        if (raidepopup.series.values.find(x => x.name == tunniste)) {
            return;
        }

        if (tunniste) {
            search.settings.create = x => ({tunniste: x, nimi: x});
            search.createItem(tunniste);
            search.settings.create = false;
        }

        let dataSource = new am4core.DataSource();
        dataSource.data = [];
        initDS(dataSource);
        monitor(dataSource, [tunniste]);

        let korkeudet = new am4charts.LineSeries();
        korkeudet.dataSource           = dataSource;
        korkeudet.fill                 = "blue";
        korkeudet.name                 = tunniste;
        korkeudet.dataFields.valueX    = 'valueX';
        korkeudet.dataFields.valueY    = 'valueY';
        korkeudet.bullets.push(bullet);

        let segment                 = korkeudet.segments.template;
        segment.tooltipText         = tunniste + "\n";
        segment.cloneTooltip        = false;
        segment.tooltipPosition     = "pointer";
        segment.interactionsEnabled = true;
        segment.states.create("hover").properties.strokeWidth = 2;

        on(korkeudet.segments.template.events, "hit", () => kartta(tunniste));
        
        on(dataSource.events, "parseended", ev => {
            if (ev.target.data.length == 0) {
                log('Ei dataa raiteelle', tunniste);
            } else {
                let objects = search.getValue();
                let title = objects instanceof Array ? objects.join(',') : objects;
                container.getElementsByClassName('title')[0].innerText = title;
                
                segment.tooltipText += ev.target.data[0].tunnus;
                ev.target.data = ev.target.data[0].korkeuspisteet;
                ev.target.data.forEach(x => {
                    x.valueX         = x.sijainti.ratakm*1000 + x.sijainti.etaisyys;
                    x.valueY         = x.korkeusN2000;
                    x.kmsijainti     = x.sijainti.ratakm  + '+' + muotoileEtaisyys(x.sijainti.etaisyys);
                    x.ratakmsijainti = muotoileRkm(x.sijainti);
                    x.tunnus         = ev.target.data[0].tunnus;
                    x.tunniste       = tunniste;
                });
            }
        });

        raidepopup.series.push(korkeudet);

        dataSource.url = raiteenKorkeudetUrl(tunniste);
        dataSource.load();

        return true;
    }

    let poista = tunniste => {
        raidepopup.series.values.filter(x => x.name == tunniste)
                               .forEach(x => {
                                let removed = raidepopup.series.removeIndex(raidepopup.series.indexOf(x));
                                setTimeout(() => {
                                    log("Viivästetysti siivotaan", tunniste);
                                    removed.dispose();
                                }, 60000);
                               });
    };
    
    search = initSearch(haku, initSeries, poista, false, true);
    search.settings.create = x => ({tunniste: x, nimi: x});
    search.disable();
    search.createItem(tunniste);
    search.enable();
    search.close();
    search.settings.create = false;
}