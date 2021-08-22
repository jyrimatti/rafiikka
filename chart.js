window.valittuDS = new am4core.DataSource();
on(aikataulupaikatDS.events, "done", ev => {
    if (!valittuDS.data && getMainState('sijainti').split("-").length >= 2) {
        let paikat = getMainState('sijainti').split("-").map(x => Object.values(ev.target.data).find(y => y.lyhenne == x || y.uicKoodi == x));
        if (paikat.includes(undefined)) {
            log('odotellaan aikataulupaikkojen latautumista...');
            return;
        }
        valittuDS.data = paikat.map(x => x.uicKoodi);
        log("Alustettu y-akseli:", valittuDS.data)
        valittuDS.dispatch("done", {target: {data: valittuDS.data}});
    }
});
on(ratanumerotDS.events, "done", () => {
    if (!valittuDS.data && getMainState('sijainti').split("-").length == 1) {
        valittuDS.data = getMainState('sijainti');
        log("Alustettu y-akseli:", window.valittuDS.data)
        valittuDS.dispatch("done", {target: {data: valittuDS.data}});
    }
});

let valittunaRatanumero = () => {
    let x = onkoRatanumero(valittuDS.data);
    return !x ? x : x[1];
};
let valittunaAikataulupaikka = () => valittuDS.data instanceof Array && valittuDS.data.length > 0;

window.aktiivisetJunatDS = new am4core.DataSource();
window.aktiivisetJunatDS.data = {};

on(valittuDS.events, "done", _ => setMainState('sijainti', valittuDS.data));

window.addEventListener('hashchange', () => {
    let uusiSijainti = getMainState('sijainti').split("-");
    if (uusiSijainti.length == 1) {
        uusiSijainti = uusiSijainti[0];
    } else if (uusiSijainti.every(x => x.match(/\d+/))) {
        uusiSijainti = uusiSijainti.map(x => parseInt(x));
    }
    if (JSON.stringify(uusiSijainti) != JSON.stringify(valittuDS.data)) {
        log("sijainti päivitetty arvosta", valittuDS.data, "arvoon", uusiSijainti);
        valittuDS.data = uusiSijainti;
        valittuDS.dispatch("done", {target: {data: valittuDS.data}});
    }
});

window.ratanumeroChanged = val => {
    if (!ratanumerotDS.data || ratanumerotDS.data.length == 0) {
        log("odotellaan ratanumeroiden latautumista...");
        return false;
    }
    val = '(' + val + ')';
    if (val != valittuDS.data) {
        log("Valittiin ratanumero: " + val);
        valittuDS.data = val;
        valittuDS.dispatch("done", {target: {data: valittuDS.data}});
    }
};

window.aikataulupaikkaChanged = (val1, val2, etapit) => {
    if (val1 == val2 && (!etapit || etapit.length == 0)) {
        valittuDS.data = [];
        valittuDS.dispatch("done", {target: {data: valittuDS.data}});
        return false;
    }
    let uusiVali = [val1].concat(etapit || []).concat([val2])
                         .map(x => x.replace(/ \(.*?\)/,''))
                         .map(x => Object.values(aikataulupaikatDS.data).find(a => a.lyhenne == x.trim() || a.tunniste == x.trim() || a.uicKoodi == x.trim()));
    if (uusiVali.includes(undefined)) {
        log('odotellaan aikataulupaikkojen latautumista...');
        return false;
    }
    uusiVali = uusiVali.map(x => x.tunniste);

    let reittiDS = new am4core.DataSource();
    reittiDS.url = reittiUrl(uusiVali[0], uusiVali.slice(1, -1), uusiVali[uusiVali.length-1]);
    initDS(reittiDS);
    monitor(reittiDS, uusiVali.map(x => aikataulupaikatDS.data[x].lyhenne).join("=>"));
    on(reittiDS.events, "done", ev => {
        let data = ev.target.data;
        let lpJaOsat = data.liikennepaikat.flatMap(x => aikataulupaikatDS.data[x.tunniste]
            ? [x.tunniste]
            : data.liikennepaikanOsat.filter(y => liikennepaikanOsatDS.data[y.tunniste].liikennepaikka == x.tunniste)
                                     .map(y => liikennepaikanOsatDS.data[y.tunniste].tunniste));
        let aikataulupaikat   = lpJaOsat.flatMap( (_,index) => {
            let edellinen     = lpJaOsat[index];
            if (index == 0) {
                return [edellinen];
            }
            if (index == lpJaOsat.length - 1) {
                return [];
            }

            let seuraava      = lpJaOsat[index+1];
            let edelRkm       = aikataulupaikatDS.data[edellinen].ratakmSijainnit;
            let seurRkm       = aikataulupaikatDS.data[seuraava].ratakmSijainnit;
            let edelYhteiset  = edelRkm.filter(y => seurRkm.map(z => z.ratanumero).includes(y.ratanumero)).sort(ratakmsijaintiComparator);
            let seurYhteiset  = seurRkm.filter(y => edelRkm.map(z => z.ratanumero).includes(y.ratanumero)).sort(ratakmsijaintiComparator);
            let yhteisetValit = edelYhteiset.map( (y,index) => [y, seurYhteiset[index]].sort(ratakmsijaintiComparator));
            if (yhteisetValit.length == 0) {
                throw "Ei yhteisiä välejä, jokin meni vikaan. Oliko reitti lineaarinen?";
            }
            let seLv = data.seisakkeet.concat(data.linjavaihteet)
                                      .map(rlp => rlp.tunniste)
                                      .filter(rlp => rautatieliikennepaikatDS.data[rlp].ratakmSijainnit.find(rkm => yhteisetValit.find(valissa(rkm))))
                                      .sort( (a,b) => ratakmsijaintiComparator(aikataulupaikatDS.data[a].ratakmSijainnit[0], aikataulupaikatDS.data[b].ratakmSijainnit[0]));
            if (ratakmsijaintiComparator(edelRkm[0], seurRkm[0]) > 0) {
                seLv = seLv.reverse();
            }
            return seLv.concat([seuraava]);
        });

        let ketju = [uusiVali[0]].concat(aikataulupaikat).concat([uusiVali[uusiVali.length-1]])
                                .filter( (item, pos, ary) => !pos || item != ary[pos - 1])
                                .map(x => aikataulupaikatDS.data[x].uicKoodi);
        if (JSON.stringify(valittuDS.data) != JSON.stringify(ketju)) {
            log("Valittiin aikataulupaikkaketju:", ketju);
            valittuDS.data = ketju;
            valittuDS.dispatch("done", {target: {data: valittuDS.data}});
        }
        setTimeout(() => ev.target.dispose(), 1000);
    });
    reittiDS.load();
    return true;
};

window.onload = () => {
    am4core.useTheme(am4themes_animated);
    am4core.ready(() => {
        log("Aloitetaan grafiikan alustus");
        window.chart = am4core.create("chartdiv", am4charts.XYChart);

        chart.events.on("error", errorHandler);
        chart.zoomOutButton.dispose(); // default-nappi pois

        chart.dummyData                = {};
        chart.language.locale          = am4lang_fi_FI;
        chart.arrangeTooltips          = false;
        chart.preloader.disabled       = true; // tuntuisi aiheuttavan muunkin datan uudelleenlatausta?
        chart.dateFormatter.dateFormat = "dd.MM.yyyy HH:mm:ss";

        chart.legend                  = new am4charts.Legend();
        chart.legend.position         = "right";
        chart.legend.exportable       = false; 
        chart.legend.useDefaultMarker = true; // https://github.com/amcharts/amcharts4/issues/2444
        chart.legend.itemContainers.template.paddingTop = 5;
        chart.legend.itemContainers.template.paddingBottom = 5;

        chart.tooltip.label.maxWidth = 400;
        chart.tooltip.label.wrap = true;

        let luoAktiivinenListaus = (series, dataSource, onRemove) => {
            let legend = chart.legend.itemContainers.values.find(x => x.dataItem.name == series.name);
            let aktiiviset             = new am4charts.Legend();
            aktiiviset.dataSource      = dataSource || new am4core.DataSource();
            aktiiviset.dataSource.data = [];
            aktiiviset.fontSize        = 11;
            aktiiviset.position        = "left";
            aktiiviset.maxHeight       = 50;
            aktiiviset.scrollable      = true;
            aktiiviset.paddingLeft     = 16;
            aktiiviset.parent          = legend.parent;
            aktiiviset.layout          = 'vertical';
            aktiiviset.valign          = 'top';
            aktiiviset.marginTop       = 0;
            aktiiviset.marginBottom    = 0;
            aktiiviset.insertAfter(legend);
            aktiiviset.markers.template.disabled             = true;
            aktiiviset.itemContainers.template.paddingTop    = 0;
            aktiiviset.itemContainers.template.paddingBottom = 0;

            on(aktiiviset.itemContainers.template.events, "doublehit", ev => {
                if (onRemove) {
                    onRemove(ev.target.dataItem.dataContext);
                }
                let nimi = ev.target.dataItem.dataContext.name;
                aktiiviset.dataSource.data.splice(aktiiviset.dataSource.data.findIndex(x => x.name == nimi), 1);
                aktiiviset.dataSource.dispatchImmediately("done", {data: aktiiviset.dataSource.data}); // pitää laittaa data mukaan, muuten legend ei populoidu :shrug:
            });
            
            aktiiviset.itemContainers.template.reverseOrder = true;
            let labTemplate = aktiiviset.itemContainers.template.createChild(am4core.Label)
            labTemplate.html = "{name}";
            add(labTemplate.adapter, 'htmlOutput', tunniste => luoLinkit('', tunniste, tunniste));

            return aktiiviset;
        };

        chart.exporting.menu                = new am4core.ExportMenu();
        chart.exporting.title               = "Rafiikka";
        chart.exporting.filePrefix          = "Rafiikka";
        chart.exporting.menu.items[0].label = "⤵";

        //chart.scrollbarX = new am4core.Scrollbar();
        //chart.scrollbarY = new am4core.Scrollbar();
        chart.scrollbarX = new am4charts.XYChartScrollbar();
        chart.scrollbarY = new am4charts.XYChartScrollbar();
        [chart.scrollbarX, chart.scrollbarY].forEach(x => {
            x.showSystemTooltip = false;
            x.thumb.showSystemTooltip = false;
            x.startGrip.showSystemTooltip = false;
            x.endGrip.showSystemTooltip = false;
            x.exportable = false;
        });

        let lisaaScrollbareihin = series => {
            lisaaScrollbariin(chart.scrollbarX)(series);
            lisaaScrollbariin(chart.scrollbarY)(series);
        };
        let lisaaScrollbariin = scrollbar => series => {
            scrollbar.series.push(series);
            scrollbar.series.push(series);

            // ei tooltippejä scrollbareihin
            scrollbar.scrollbarChart.series.values.forEach(x => x.tooltip = undefined);

            scrollbar.scrollbarChart.series.each(x => x.hidden = true); // muuten kääntää legendin päälle vaikka onkin piilossa...

            // scrollbar-seriesit näkymään/piiloon tarkalleen silloin kun pääserieskin menee.
            on(series.events, "shown", ev => {
                scrollbar.scrollbarChart.series.values.filter(x => x.name == ev.target.name).forEach(x => x.show());
            });
            on(series.events, "hidden", ev => {
                scrollbar.scrollbarChart.series.values.filter(x => x.name == ev.target.name).forEach(x => x.hide());
            });

            // scrollbar-axeseista sälät pois
            scrollbar.scrollbarChart.xAxes.values.concat(scrollbar.scrollbarChart.yAxes.values).forEach(y => {
                y.renderer.labels.template.disabled = true;
                y.renderer.grid.template.disabled = true; 
            });
        };

        chart.cursor          = new am4charts.XYCursor();
        chart.cursor.behavior = "panXY";
        //chart.cursor.maxTooltipDistance = 10;
        [chart.cursor.lineX, chart.cursor.lineY].forEach(x => {
            x.stroke          = am4core.color("#8F3985");
            x.strokeWidth     = 1;
            x.strokeDasharray = "";
        });


        let xAxis = chart.xAxes.push(new am4charts.DateAxis());
        window.xAxis = xAxis;
        xAxis.showOnInit       = false;
        xAxis.snapTooltip      = false;
        xAxis.keepSelection    = true;
        xAxis.minZoomCount     = 60*15;
        xAxis.baseInterval     = { timeUnit: "second" }; // automatiikka tuntuu asettavan joksikin muuksi
        xAxis.mainBaseInterval = { timeUnit: "second" };
        xAxis.strictMinMax     = true;

        let paivitaBounds = () => {
            xAxis.min = rajat()[0].getTime();
            xAxis.max = rajat()[1].getTime();
        };
        paivitaBounds();
        
        //xAxis.renderer.labels.template.tooltip     = new am4core.Tooltip();
        xAxis.renderer.labels.template.location    = 0.0001; // akselin labelit mielellään aina grid-viivojen kohdalle
        xAxis.renderer.labels.template.tooltipText = "{value.formatDate('dd.MM.yyyy HH:mm:ss')}";
        
        let setXAxis = () => {
            let target = ikkuna();
            log("Zoomataan ikkunaan", target);
            paivitaBounds();
            // pitää tehdä async, muuten amcharts sekoaa
            setTimeout( () => {
                xAxis.zoomToDates(target[0], target[1], false, true, false);
            }, 100);
        };
        on(chart.events, "ready", setXAxis);
        window.addEventListener('hashchange', () => {
            setXAxis();
        });

        let yAxis = chart.yAxes.push(new am4charts.ValueAxis());
        yAxis.showOnInit    = false;
        yAxis.snapTooltip   = false;
        yAxis.keepSelection = true;
        yAxis.extraMax      = 0.1;
        yAxis.maxZoomFactor = 10000;
        yAxis.renderer.numberFormatter.numberFormat = "#";

        add(yAxis.renderer.labels.template.adapter, "paddingRight", () => valittunaAikataulupaikka() ? 0 : 40);
        let renderLabel = text => {
            if (text) {
                let n = parseInt(text);
                return valittunaAikataulupaikka() ? "" : Math.floor(n/1000) + "+" + (n%1000);
            } else {
                return text;
            }
        };
        add(yAxis.renderer.labels.template.adapter, "text",           renderLabel);
        on(yAxis.renderer.labels.template.events, "doublehit", ev => {
            if (valittunaRatanumero() && ev.target.currentText) {
                let rkmsijainti = valittuDS.data + ' ' + ev.target.currentText;
                if (onkoRatakmSijainti(rkmsijainti)) {
                    kartta(rkmsijainti);
                }
            }
        });
        add(yAxis.adapter,                          "getTooltipText", renderLabel);

        
        // säädetään scrollbar-charttien zoomit samalla kun päächartin zoomi muuttuu
        on(xAxis.events, "startendchanged", () => chart.scrollbarY.scrollbarChart.xAxes.each(x => x.zoomToDates(xAxis.minZoomed, xAxis.maxZoomed, false, false, false)));
        on(yAxis.events, "startendchanged", () => chart.scrollbarX.scrollbarChart.yAxes.each(x => x.zoomToValues(yAxis.minZoomed, yAxis.maxZoomed, false, false, false)));


        on(valittuDS.events, "done", ev => {
            let ratanumero = valittunaRatanumero();
            if (ratanumero) {
                if (!ratanumerotDS.data || ratanumerotDS.data.length == 0) {
                    log('odotellaan ratanumeroiden latautumista...');
                    return;
                }
                yAxis.title.text = "(" + ratanumero + ")";
                on(yAxis.title.events, 'doublehit', () => kartta(yAxis.title.text));
                yAxis.min = ratanumerotDS.data[ratanumero][0];
                yAxis.max = ratanumerotDS.data[ratanumero][1];
            } else if (valittunaAikataulupaikka()) {
                if (!aikataulupaikatDS.data || aikataulupaikatDS.data.length == 0) {
                    log('odotellaan aikataulupaikkojen latautumista...');
                    return;
                }
                yAxis.title.text = ev.target.data.map(x => aikataulupaikatDS.data[x].lyhenne).join(" - ");
                yAxis.min = 0;
                yAxis.max = ev.target.data.length - 1;
            }
            log("Rajoitettiin y-akseli välille: " + yAxis.min + " - " + yAxis.max);
        });



        let yAkseliValintaContainer = chart.legend.createChild(am4core.Container);
        yAkseliValintaContainer.layout = "vertical";
        yAkseliValintaContainer.paddingBottom = 20;
        yAkseliValintaContainer.paddingLeft = 12;

        let ratanumeroContainer = yAkseliValintaContainer.createChild(am4core.Container);
        let radioButton1 = ratanumeroContainer.createChild(am4core.Label);
        let paivitaRatanumerovalinta = () => {
            radioButton1.html = "<input type='radio' id='ratanumeroRadio' name='yAkseliValinta' " + (valittunaAikataulupaikka() ? "" : "checked='checked'") + " onclick='window.ratanumeroChanged(document.getElementById(\"ratanumero\").value)' />";
        };
        on(chart.events, "ready", paivitaRatanumerovalinta);

        let ratanumeroSelect = ratanumeroContainer.createChild(am4core.Label);
        ratanumeroSelect.paddingLeft = 25;
        on(ratanumerotDS.events, "done", ev => {
            if (!ev.target.data || ev.target.data.length == 0) {
                log("odotellaan ratanumeroiden latautumista...");
                return false;
            }
            let ratanumerot = Object.keys(ev.target.data).sort();
            ratanumeroSelect.html = "<label for='ratanumeroRadio'><select id='ratanumero' onchange='window.ratanumeroChanged(this.value)'>{}</select></label>";
            ratanumeroSelect.html = ratanumeroSelect.html.replace("{}", ratanumerot.map(x => "<option " + (getMainState('sijainti') === '(' + x + ')' ? "selected='selected'" : "") + ">" + x + "</option>").join(""));
        });

        let aikataulupaikkaContainer = yAkseliValintaContainer.createChild(am4core.Container);
        let radioButton2 = aikataulupaikkaContainer.createChild(am4core.Label);
        let paivitaAikataulupaikkavalinta = () => {
            radioButton2.html = "<input type='radio' id='aikataulupaikkaRadio' name='yAkseliValinta' " + (valittunaAikataulupaikka() ? "checked='checked'" : "") + "onclick='window.aikataulupaikkaChanged(document.getElementById(\"aikataulupaikka1\").value,document.getElementById(\"aikataulupaikka2\").value)' />";
        };
        on(chart.events, "ready", paivitaAikataulupaikkavalinta);
        let aikataulupaikkaSelect = aikataulupaikkaContainer.createChild(am4core.Label);
        aikataulupaikkaSelect.paddingLeft = 25;
        on(aikataulupaikatDS.events, "done", ev => {
            if (!ev.target.data || ev.target.data.length == 0) {
                log("odotellaan aikataulupaikkojen latautumista...");
                return false;
            }
            aikataulupaikkaSelect.html = "<label for='aikataulupaikkaRadio'><select id='aikataulupaikka1' onchange='window.aikataulupaikkaChanged(this.value, document.getElementById(\"aikataulupaikka2\").value)'><option></option>{1}</select> - " +
                                                                            "<select id='aikataulupaikka2' onchange='window.aikataulupaikkaChanged(document.getElementById(\"aikataulupaikka1\").value, this.value)'><option></option>{2}</select></label>";
            let aikataulupaikat1 = Object.keys(ev.target.data).filter(x => x.indexOf(".") > -1).map(x => ev.target.data[x]).sort( (a,b) => a.lyhenne < b.lyhenne ? -1 : a.lyhenne > b.lyhenne ? 1 : 0);
            let aikataulupaikat2 = [...aikataulupaikat1];
            let sijaintiParams = getMainState('sijainti').split("-");
            let valittu1 = Object.values(ev.target.data).find(x => x.lyhenne == sijaintiParams[0] || x.uicKoodi == sijaintiParams[0]);
            let valittu2 = Object.values(ev.target.data).find(x => x.lyhenne == sijaintiParams[sijaintiParams.length-1] || x.uicKoodi == sijaintiParams[sijaintiParams.length-1]);
            if (valittu1) {
                // järjestetään toinen lista ensimmäisestä valinnasta etäisyyden mukaan.
                aikataulupaikat2.sort( (a,b) => {
                    let da = valittu1.geometria.distance(a.geometria);
                    let db = valittu1.geometria.distance(b.geometria);
                    return da < db ? -1 : da > db ? 1 : 0;
                });

                if (valittu2 && valittu1 != valittu2) {
                    // molemmat saatavilla:
                    let mkOption = (aikataulupaikat, lyhenne) => aikataulupaikat.map(x => "<option " + (lyhenne == x.lyhenne ? "selected='selected'" : "") + ">" + x.lyhenne + " (" + x.nimi + ")" + "</option>").join("");
                    aikataulupaikkaSelect.html = aikataulupaikkaSelect.html.replace("{1}", mkOption(aikataulupaikat1, valittu1.lyhenne))
                                                                        .replace("{2}", mkOption(aikataulupaikat2, valittu2.lyhenne));
                    return;
                }
            }
            let mkOption = aikataulupaikat => aikataulupaikat.map(x => "<option>" + x.lyhenne + " (" + x.nimi + ")" + "</option>").join("");
            aikataulupaikkaSelect.html = aikataulupaikkaSelect.html.replace("{1}", mkOption(aikataulupaikat1))
                                                                   .replace("{2}", mkOption(aikataulupaikat2));
        });

        on(valittuDS.events, "done", ev => {
            if (ev.target.data.length > 0) {
                paivitaRatanumerovalinta();
                paivitaAikataulupaikkavalinta();
                ratanumerotDS.dispatch("done", {target: {data: ratanumerotDS.data}});
                aikataulupaikatDS.dispatch("done", {target: {data: aikataulupaikatDS.data}});
            }
            if (valittunaRatanumero()) {
                ratanumeroSelect.show();
                aikataulupaikkaSelect.hide();
            } else {
                ratanumeroSelect.hide();
                aikataulupaikkaSelect.show();
            }
        });
        


        let buttonContainer = chart.plotContainer.createChild(am4core.Container);
        buttonContainer.align       = "right";
        buttonContainer.valign      = "top";
        buttonContainer.layout      = "horizontal";
        buttonContainer.zIndex      = Number.MAX_SAFE_INTEGER;
        buttonContainer.exportable  = false;
        buttonContainer.shouldClone = false;
        buttonContainer.marginTop   = 5;
        buttonContainer.marginRight = 5;


        var zoomButton; 
        var selectButton;

        let alustaMoodiNappi = (text, behavior, title) => {
            let button = buttonContainer.createChild(am4core.Button);
            button.label.text = text;
            button.tooltipText = title;
            button.background.states.create("active").properties.fill = button.background.fill.lighten(-0.5);
            on(button.events, "hit", ev => {
                if (ev.target.isActive) {
                    chart.cursor.behavior = "panXY";
                } else {
                    chart.cursor.behavior = behavior;
                    zoomButton.isActive = false;
                    selectButton.isActive = false;
                }
                ev.target.isActive = !ev.target.isActive;
            });
            return button;
        }

        zoomButton = alustaMoodiNappi("zoom", "zoomXY", 'Zoomaa alueeseen');
        on(chart.cursor.events, "zoomended", () => {
            chart.cursor.behavior = "panXY";
            zoomButton.isActive = false;
        });


        window.selectionSeries = new am4charts.ColumnSeries()
        selectionSeries.name = 'Valinnat';
        selectionSeries.dataSource = new am4core.DataSource();
        selectionSeries.dataSource.data = [];
        selectionSeries.fill                  = am4core.color("gray");
        selectionSeries.stroke                = selectionSeries.fill.lighten(-0.75);
        selectionSeries.baseAxis              = yAxis; // https://github.com/amcharts/amcharts4/issues/2379
        selectionSeries.dataFields.openValueY = "alkuY";
        selectionSeries.dataFields.valueY     = "loppuY";
        selectionSeries.dataFields.openDateX  = "alkuX";
        selectionSeries.dataFields.dateX      = "loppuX";
        selectionSeries.cursorTooltipEnabled  = false;
        selectionSeries.showOnInit            = false;
        selectionSeries.simplifiedProcessing  = true;
        selectionSeries.strokeWidth           = 1;
        selectionSeries.hiddenState.transitionDuration  = 0;
        selectionSeries.defaultState.transitionDuration = 0;
        selectionSeries.tooltip.pointerOrientation             = 'down';
        selectionSeries.columns.template.tooltipY              = am4core.percent(0); // objektin yläreunaan
        selectionSeries.columns.template.tooltipText           = "{alkuX} -> {loppuX}\n{ratakmvali}";
        selectionSeries.columns.template.cloneTooltip          = false;
        selectionSeries.columns.template.zIndex                = 999;
        selectionSeries.columns.template.minWidth              = 5;
        selectionSeries.columns.template.minHeight             = 5;
        selectionSeries.columns.template.align                 = 'center';
        selectionSeries.columns.template.propertyFields.hidden = 'hidden';
        chart.series.push(selectionSeries);

        ["active", "hover"].forEach(stateName => {
            let state = selectionSeries.columns.template.states.create(stateName);
            state.properties.zIndex = 999;
            state.properties.fill   = selectionSeries.fill.lighten(0.75);
        });

        let columnLabel         = selectionSeries.columns.template.children.push(new am4core.Label());
        columnLabel.fill        = selectionSeries.stroke;
        columnLabel.text        = "{name}";
        columnLabel.fontSize    = 15;
        columnLabel.strokeWidth = 0;

        on(chart.events, "ready", () => {
            let aktiiviset = luoAktiivinenListaus(selectionSeries, selectionSeries.dataSource);

            on(aktiiviset.itemContainers.template.events, "hit", ev => {
                let nimi = ev.target.dataItem.dataContext.name;
                let akt = aktiiviset.dataSource.data.find(x => x.name == nimi);
                akt.hidden = !akt.hidden;
                aktiiviset.dataSource.dispatchImmediately("done", {data: aktiiviset.dataSource.data}); // pitää laittaa data mukaan, muuten legend ei populoidu :shrug:
            });
        });


        selectButton = alustaMoodiNappi("select", "selectXY", "Rajaa työrako");
        on(chart.cursor.events, "selectended", ev => {
            let x = ev.target.xRange;
            let y = ev.target.yRange;
            if (x && y) {
                chart.cursor.behavior = "panXY";
                ev.target.isActive = false;
                selectButton.isActive = false;

                let fromX = xAxis.positionToDate(xAxis.toAxisPosition(x.start));
                let toX   = xAxis.positionToDate(xAxis.toAxisPosition(x.end));
                let fromY = yAxis.positionToValue(yAxis.toAxisPosition(y.start));
                let toY   = yAxis.positionToValue(yAxis.toAxisPosition(y.end));
                let ratakmvali = {
                    ratanumero: valittunaRatanumero() || 'TODO: ?',
                    alku: {
                        ratakm: Math.floor(fromY/1000),
                        etaisyys: Math.floor(fromY % 1000)
                    },
                    loppu: {
                        ratakm: Math.floor(toY/1000),
                        etaisyys: Math.floor(toY % 1000)
                    }
                };
                log("Selected:", fromX + "->" + toX, ratakmvali);
                selectionSeries.dataSource.data.push({
                    alkuX: fromX,
                    loppuX: toX,
                    alkuY: fromY,
                    loppuY: toY,
                    ratakmvali: muotoileRkmv(ratakmvali),
                    name: selectionSeries.dataSource.data.length == 0 ? 1 : selectionSeries.dataSource.data[selectionSeries.dataSource.data.length-1].name + 1
                });
                selectionSeries.dataSource.dispatchImmediately("done", {data: selectionSeries.dataSource.data});
            }
        });

        let luoAikavalinSiirtoButton = (label, deltaMin, deltaMax, title) => {
            let button = buttonContainer.createChild(am4core.Button);
            button.label.text = label;
            button.tooltipText = title;
            on(button.events, "hit", () => {
                let diff = Math.abs(xAxis.maxZoomed - xAxis.minZoomed);
                xAxis.zoomToDates(new Date(xAxis.minZoomed + deltaMin(diff)),
                                  new Date(xAxis.maxZoomed + deltaMax(diff)));
            });
            return button;
        }

        luoAikavalinSiirtoButton("<", (x => -0.5  * x), (x => -0.5  * x), 'Siirry ajassa taaksepäin').marginLeft = 10;
        luoAikavalinSiirtoButton(">", (x =>  0.5  * x), (x =>  0.5  * x), 'Siirry ajassa eteenpäin');

        let nowButton = buttonContainer.createChild(am4core.Button);
        nowButton.label.text = "|";
        nowButton.tooltipText = 'Siirry nykyhetkeen';
        on(nowButton.events, "hit", () => {
            let diff = xAxis.maxZoomed - xAxis.minZoomed;
            xAxis.zoomToDates(new Date(new Date().getTime() - diff/2),
                              new Date(new Date().getTime() + diff/2));
        });

        luoAikavalinSiirtoButton("-", (x => -0.25 * x), (x =>  0.25 * x), 'Kavenna aikajaksoa').marginLeft = 10;
        luoAikavalinSiirtoButton("+", (x =>  0.2  * x), (x => -0.2  * x), 'Levennä aikajaksoa');

        

        window.loading = chart.plotContainer.createChild(am4core.Label);
        loading.dataItem = loadingIndicator;
        loading.fontSize = 10;
        add(loading.adapter, "text", (text, target) => {
            if (!target.dataItem) {
                return text;
            }
            let aktiiviset = target.dataItem.categories.aktiiviset;
            return aktiiviset == "" ? "" : "Ladataan: " + aktiiviset.trim().split(" ").join(", ");
        });



        let nykyhetki                  = xAxis.axisRanges.create();
        nykyhetki.date                 = new Date();
        nykyhetki.grid.stroke          = "red";
        nykyhetki.grid.strokeWidth     = 2;
        nykyhetki.grid.strokeDasharray = "8,4";
        nykyhetki.bullet                  = new am4core.Triangle();
        nykyhetki.bullet.fill             = am4core.color("red");
        nykyhetki.bullet.width            = 10;
        nykyhetki.bullet.height           = 10;
        nykyhetki.bullet.tooltipText      = "{date}";
        nykyhetki.bullet.horizontalCenter = "middle";

        setInterval(() => nykyhetki.date = new Date(), 1000);

        

        let luoRangetJaBreakit = ev => {
            logDiff("Luodaan rangeja ja breakkeja", () => {
                Object.values(ev.target.data).flat().forEach(x => {
                    x.ratakmvalit.filter(x => '(' + x.ratanumero + ')' == valittuDS.data)
                                    .forEach(function(r) {
                        let range                        = new am4charts.ValueAxisDataItem();
                        yAxis.axisRanges.push(range);
                        range.value                      = r.alku.ratakm*1000 + r.alku.etaisyys;
                        range.endValue                   = r.loppu.ratakm*1000 + r.loppu.etaisyys;
                        range.grid.stroke                = am4core.color("blue").lighten(0.5);
                        range.label.inside               = true;
                        range.label.fontSize             = 12;

                        if (x.uicKoodi) {
                            range.label.dx               = -30;
                        } else {
                            range.label.dx               = -9;
                            range.label.dy               = -15;
                            range.label.verticalCenter   = "bottom"
                            range.label.horizontalCenter = "middle"
                            range.label.rotation         = 270;
                        }

                        range.label.tooltipText = x.tyyppi + "\n" + x.nimi;
                        range.label.adapter.add("text", () => x.lyhenne);
                        on(range.label.events, "doublehit", () => kartta(x.tunniste, x.tyyppi + ' ' + x.nimi + (x.lyhenne != x.nimi ? ' (' + x.lyhenne + ')' : '')));

                        if (range.value != range.endValue) {
                            range.grid.strokeWidth = 0;

                            let axisBreak = new am4charts.ValueAxisBreak();
                            yAxis.axisBreaks.insert(axisBreak); // pitää insertoida aluksi, koska ylikirjottaa endLinet sun muut...

                            axisBreak.stroke                = range.grid.stroke;
                            axisBreak.breakSize             = 0.05;
                            axisBreak.startValue            = range.value;
                            axisBreak.endValue              = range.endValue;
                            axisBreak.fillShape.opacity     = 0.2;
                            axisBreak.endLine.strokeWidth   = 0;
                            axisBreak.startLine.strokeWidth = 0;

                            on(range.label.events, "over", () => axisBreak.animate([{ property: "breakSize", to: 1    }], 100, am4core.ease.sinOut));
                            on(range.label.events, "hit",  () => axisBreak.animate([{ property: "breakSize", to: 0.05 }], 100, am4core.ease.quadOut));
                        }
                    });

                });
            });
        };

        let luoRanget = () => {
            logDiff("Luodaan rangeja", () => {
                Object.values(valittuDS.data).forEach((uicKoodi,index) => {
                    let x = aikataulupaikatDS.data[uicKoodi];
                    let range               = new am4charts.ValueAxisDataItem();
                    yAxis.axisRanges.push(range);
                    range.value             = index;
                    range.endValue          = index;
                    range.grid.stroke       = am4core.color("blue").lighten(0.5);
                    range.label.dx          = -30;
                    range.label.inside      = true;
                    range.label.fontSize    = 12;
                    range.label.tooltipText = x.tyyppi + "\n" + x.nimi;
                    range.label.adapter.add("text", () => x.lyhenne);
                    on(range.label.events, "doublehit", () => kartta(x.tunniste, x.tyyppi + ' ' + x.nimi + (x.lyhenne != x.nimi ? ' (' + x.lyhenne + ')' : '')));
                });
            });
        };
        
        on(rautatieliikennepaikatDS.events, "done", luoRangetJaBreakit);
        on(liikennepaikanOsatDS.events,     "done", luoRangetJaBreakit);
        on(raideosuudetDS.events,           "done", luoRangetJaBreakit);
        on(laituritDS.events,               "done", luoRangetJaBreakit);

        on(valittuDS.events, "done", () => {
            yAxis.axisBreaks.clear();
            yAxis.axisRanges.clear();

            if (valittunaRatanumero()) {
                rautatieliikennepaikatDS.load();
                liikennepaikanOsatDS.load();
                raideosuudetDS.load();
                laituritDS.load();
            } else if (valittunaAikataulupaikka()) {
                luoRanget();
            }
        });


        let luoEnnakkotietoSeries = (nimi, vari, tilat) => {
            log("Alustetaan", nimi);

            let series = new am4charts.ColumnSeries()
            series.name                  = nimi;
            series.fill                  = vari;
            series.stroke                = vari.lighten(-0.2);
            series.baseAxis              = yAxis; // https://github.com/amcharts/amcharts4/issues/2379
            series.dataFields.openValueY = "alkuY";
            series.dataFields.valueY     = "loppuY";
            series.dataFields.openDateX  = "alkuX";
            series.dataFields.dateX      = "loppuX";
            series.cursorTooltipEnabled  = false;
            series.showOnInit            = false;
            series.simplifiedProcessing  = true;
            series.strokeWidth           = 1;
            series.hidden                = true;
            series.hiddenState.transitionDuration  = 0;
            series.defaultState.transitionDuration = 0;

            series.tooltip.label.maxWidth = 400;
            series.tooltip.label.wrap = true;

            let ds = tilat.map(t => {
                let d = new am4core.DataSource();
                initDS(d);
                monitor(d, nimi + "(" + t + ")");

                on(d.events, "done", () => {
                    series.dataSource.data = ds.filter(x => x[1].isActive).flatMap(x => x[1].data || []);
                    series.dataSource.dispatchImmediately("parseended", {data: series.dataSource.data});
                    series.dataSource.dispatchImmediately("done", {data: series.dataSource.data});
                });
                return [t,d];
            });

            let objectCache = {}
            on(series.dataSource.events, "parseended", () => {
                objectCache = {};
            });

            on(chart.events, "ready", () => {
                let aktiiviset = luoAktiivinenListaus(series);

                on(series.columns.template.events, "hit", ev => {
                    let nimi = ev.target.dataItem.dataContext.sisainenTunniste;
                    let index = aktiiviset.dataSource.data.findIndex(x => x.name == nimi);
                    if (index > -1) {
                        aktiiviset.dataSource.data.splice(index, 1);
                    } else {
                        aktiiviset.dataSource.data.push({name: nimi, tunniste: ev.target.dataItem.dataContext.tunniste});
                    }
                    aktiiviset.dataSource.dispatchImmediately("done", {data: aktiiviset.dataSource.data}); // pitää laittaa data mukaan, muuten legend ei populoidu :shrug:
                });

                on(aktiiviset.dataSource.events, "done", ev => {
                    Object.entries(objectCache)
                        .forEach(x => {
                            let isActive = ev.target.data.findIndex(y => y.name == x[0]) > -1;
                            x[1].filter(x => !x.isDisposed()) // vain jos ei ole disposed. Jostain syystä lentää välillä amchartsista virhettä ilman tätä...
                                .forEach(y => y.isActive = isActive);
                        });
                });
                on(series.columns.template.events, 'doublehit', ev => kartta(ev.target.dataItem.dataContext.tunniste, ev.target.dataItem.dataContext.sisainenTunniste));
            });

            on(series.events, "datavalidated", ev => {
                logDiff('Populoidaan', ev.target.name, 'object cache', () => {
                    ev.target.columns.each(x => {
                        let sisainenTunniste = x.dataItem.dataContext.sisainenTunniste;
                        let columns = objectCache[sisainenTunniste];
                        if (!columns) {
                            columns = [];
                            objectCache[sisainenTunniste] = columns;
                        }
                        columns.push(x);
                    });
                });
            });

            let hoveroi = val => ev => objectCache[ev.target.dataItem.dataContext.sisainenTunniste]
                .filter(x => !x.isDisposed()) // vain jos ei ole disposed. Jostain syystä lentää välillä amchartsista virhettä ilman tätä...
                .forEach(x => x.isHover = val);
            on(series.columns.template.events, "over", hoveroi(true));
            on(series.columns.template.events, "out" , hoveroi(false));

            on(valittuDS.events, "done", () => {
                if (!series.isHidden) {
                    series.dataSource.load();
                }
            });

            on(chart.events, "ready", () => {
                let leg = new am4charts.Legend();
                leg.dataSource = new am4core.DataSource();
                let legend = chart.legend.itemContainers.values.find(x => x.dataItem.name == series.name);
                leg.dataSource.data = tilat.map(x => { return {name: x}; });
                leg.parent          = legend.parent;
                leg.fontSize        = 10;
                leg.position        = "left";
                leg.maxHeight       = 12;
                leg.layout          = 'horizontal';
                leg.paddingLeft     = 26;
                leg.dy              = -30;
                leg.markers.template.disabled = true;
                leg.itemContainers.template.paddingTop    = 0;
                leg.itemContainers.template.paddingBottom = 0;
                leg.itemContainers.template.marginLeft    = 0;
                leg.itemContainers.template.marginRight   = 0;
                leg.labels.template.ellipsis = '';
                leg.labels.template.align    = 'center';
                leg.itemContainers.template.width=160/tilat.length;
                leg.itemContainers.template.tooltip = new am4core.Tooltip(); // muuten katoaa näkyvistä kun series päälle...
                leg.itemContainers.template.tooltipText = 'Tila: {name}';
                add(leg.labels.template.adapter, 'textOutput', x => x.toUpperCase());
                leg.insertAfter(legend);

                on(leg.itemContainers.template.events, "hit", ev => {
                    let d = ds.find(x => x[0] == ev.target.dataItem.dataContext.name)[1];
                    d.isActive = ev.target.isActive;
                    if (ev.target.isActive) {
                        if (series.isHidden) {
                            series.show();
                        }
                        d.load();
                    } else {
                        d.dispatchImmediately("done", {data: d.data});
                    }
                });
                leg.dataSource.dispatchImmediately("done", {data: leg.dataSource.data});
                on(leg.itemContainers.template.events, "ready", ev => {
                    if (ev.target.dataItem.dataContext.name == tilat[0]) {
                        ds.find(x => x[0] == ev.target.dataItem.dataContext.name)[1].isActive = true;
                    } else {
                        ev.target.setState('active');
                    }
                });
            });

            series.dataSource.url = f => {
                ds.forEach(x => x[1].url = f(x[0]));
            };
            series.dataSource.load = () => ds.filter(x => x[1].isActive).forEach(x => x[1].load());

            return series;
        };

        let viimeisteleEnnakkotietoSeries = (series, urlRatanumero, urlAikataulupaikka) => {
            series.fillOpacity           = 0.15;

            //series.columns.template.tooltipPosition       = "pointer";
            series.tooltip.pointerOrientation             = 'down';
            series.columns.template.tooltipY              = am4core.percent(0); // objektin yläreunaan
            series.columns.template.tooltipText           = "{sisainenTunniste} ({tunniste})\n{alkuX} - {loppuX} \n{sijainti}\n{lisatiedot}";
            series.columns.template.cloneTooltip          = false;
            series.columns.template.propertyFields.zIndex = "zIndex";
            series.columns.template.minWidth              = 5;
            series.columns.template.minHeight             = 5;

            let columnLabel         = series.columns.template.children.push(new am4core.Label());
            columnLabel.fill        = series.stroke;
            columnLabel.text        = "{sisainenTunniste}";
            columnLabel.fontSize    = 13;
            columnLabel.strokeWidth = 0;

            ["active", "hover"].forEach(stateName => {
                let state = series.columns.template.states.create(stateName);
                state.properties.zIndex      = 999;
                state.properties.stroke      = series.fill.lighten(-0.8);
                state.properties.fillOpacity = 1;
            });

            let paivitaUrl = () => {
                let uusiUrl = valittunaRatanumero() ? urlRatanumero() : valittunaAikataulupaikka() ? urlAikataulupaikka() : undefined;
                if (series.isReady() && !series.isHidden && uusiUrl && series.dataSource.url != uusiUrl) {
                    series.dataSource.url(uusiUrl);
                    series.dataSource.load();
                }
            };
            on(series.events, "shown", paivitaUrl);
            on(valittuDS.events, "done", paivitaUrl);
        };

        window.seriesEI = luoEnnakkotietoSeries("Ennakkoilmoitukset", am4core.color("orange"), eiTilat);
        on(seriesEI.dataSource.events, "parseended", ev => {
            log("Parsitaan EI");
            ev.target.data = ev.target.data.flatMap(parsiEI).sort(ennakkotietoIntervalComparator);
            log("Parsittu EI:", ev.target.data.length);
        });

        window.seriesLO = luoEnnakkotietoSeries("LOilmoitukset", am4core.color("purple"), loTilat);
        on(seriesLO.dataSource.events, "parseended", ev => {
            log("Parsitaan LO done");
            ev.target.data = ev.target.data.flatMap(parsiLO).sort(ennakkotietoIntervalComparator);
            log("Parsittu LO:", ev.target.data.length);
        });

        window.seriesES = luoEnnakkotietoSeries("Ennakkosuunnitelmat", am4core.color("green"), esTilat);
        on(seriesES.dataSource.events, "parseended", ev => {
            log("Parsitaan ES done");
            ev.target.data = ev.target.data.flatMap(parsiES).sort(ennakkotietoIntervalComparator);
            log("Parsittu ES:", ev.target.data.length);
        });

        window.seriesVS = luoEnnakkotietoSeries("Vuosisuunnitelmat", am4core.color("violet"), vsTilat);
        on(seriesVS.dataSource.events, "parseended", ev => {
            log("Parsitaan VS done");
            ev.target.data = ev.target.data.flatMap(parsiVS).sort(ennakkotietoIntervalComparator);
            log("Parsittu VS:", ev.target.data.length);
        });

        window.seriesRT = luoEnnakkotietoSeries("Ratatyöt", am4core.color('salmon'), ['ACTIVE', 'PASSIVE', 'SENT', 'FINISHED']);
        on(seriesRT.dataSource.events, "parseended", ev => {
            log("Parsitaan RT done");
            ev.target.data = ev.target.data.flatMap(parsiRT).sort(ennakkotietoIntervalComparator);
            log("Parsittu RT:", ev.target.data.length);
        });

        window.seriesLR = luoEnnakkotietoSeries("Liikenteenrajoitteet", am4core.color('turquoise'), ['SENT', 'FINISHED']);
        on(seriesLR.dataSource.events, "parseended", ev => {
            log("Parsitaan LR done");
            ev.target.data = ev.target.data.flatMap(parsiLR).sort(ennakkotietoIntervalComparator);
            log("Parsittu LR:", ev.target.data.length);
        });
        
        seriesVS.zIndex = 10;
        seriesES.zIndex = 20;
        seriesEI.zIndex = 30;
        seriesRT.zIndex = 40;
        seriesLR.zIndex = 50;
        seriesLO.zIndex = 60;
        chart.series.pushAll([seriesLO, seriesLR, seriesRT, seriesEI, seriesES, seriesVS]);

        [seriesVS, seriesES, seriesEI, seriesRT, seriesLR, seriesLO].forEach(lisaaScrollbareihin);
        viimeisteleEnnakkotietoSeries(seriesLO, loUrlRatanumero, loUrlAikataulupaikka);
        viimeisteleEnnakkotietoSeries(seriesLR, lrUrl, lrUrl);
        viimeisteleEnnakkotietoSeries(seriesRT, rtUrl, rtUrl);
        viimeisteleEnnakkotietoSeries(seriesEI, eiUrlRatanumero, eiUrlAikataulupaikka);
        viimeisteleEnnakkotietoSeries(seriesES, esUrlRatanumero, esUrlAikataulupaikka);
        viimeisteleEnnakkotietoSeries(seriesVS, vsUrlRatanumero, vsUrlAikataulupaikka);

        

        window.junatSeries            = new am4charts.XYSeries()
        junatSeries.name              = "Junat";
        junatSeries.fill              = "red";
        junatSeries.data              = [];
        junatSeries.hidden            = true;
        junatSeries.zIndex            = 90; // aikataulujen/toteumien yläpuolelle
        junatSeries.dataFields.dateX  = "timestamp";
        junatSeries.dataFields.valueY = "sijainti";
        junatSeries.dataSource.data = [];
        junatSeries.dataSource.updateCurrentData = true;
        junatSeries.dataSource.events.on("error", errorHandler);
        initDS(junatSeries.dataSource);

        chart.series.push(junatSeries);

        lisaaScrollbareihin(junatSeries);

        let bullet           = new am4charts.CircleBullet();
        bullet.circle.fill   = am4core.color("red").lighten(0.5);
        bullet.circle.stroke = am4core.color("red");
        bullet.circle.radius = 3;
        bullet.cloneTooltip  = false;
        bullet.tooltipText   = 'Lähtöpäivä: {departureDate}\nJunanumero: {trainNumber}';
        bullet.states.create("hover").properties.scale  = 1.5;
        bullet.states.create("active").properties.scale = 1.5;
        junatSeries.bullets.push(bullet);
        
        let label         = bullet.children.push(new am4core.Label());
        label.strokeWidth = 0;
        label.fontSize    = 11;
        label.dx          = 2;
        label.dy          = 2;
        label.fill        = bullet.circle.fill;
        label.text        = "{trainNumber}";

        initDS(junatSeries.dataSource);
        on(junatSeries.events, "shown", () => {
            junatSeries.dataSource.url = junasijainnitUrl();
            junatSeries.dataSource.load();
        });

        on(junatSeries.dataSource.events, "parseended", ev => {
            ev.target.data = ev.target.data.map(muunnaJunasijainti);
            log("Ladattiin", ev.target.data.length, "junaa");
        });
        
        setInterval(paivitaJunienRatakmsijainnit(junatSeries), 1000);

        on(bullet.events, "hit", ev => valitseJuna(ev.target.dataItem.dataContext));
        on(bullet.events, "inited", ev => ev.target.isActive = onkoAktiivinen(ev.target.dataItem.dataContext));
        on(bullet.events, "doublehit", ev => {
            kartta(ev.target.dataItem.dataContext.departureDate + ' (' + ev.target.dataItem.dataContext.trainNumber + ')');
        });

        on(aktiivisetJunatDS.events, "done", ev => {
            let juna = ev;
            junatSeries.bulletsContainer.children.each(b => {
                let dc = b.dataItem.dataContext;
                if (dc.departureDate == juna.departureDate && dc.trainNumber == juna.trainNumber) {
                    let isActive = ev.target.data[dc.departureDate] && ev.target.data[dc.departureDate][dc.trainNumber];
                    log("Asetetaan junan", dc.departureDate, dc.trainNumber, "aktiivisuudeksi", isActive);
                    b.isActive = isActive;
                }
            });
        });
        
        on(chart.events, "ready", () => {
            let aktiiviset = luoAktiivinenListaus(junatSeries, undefined, valitseJuna);
            on(aktiivisetJunatDS.events, "done", ev => {
                aktiiviset.dataSource.data = Object.keys(ev.target.data).flatMap(departureDate => Object.keys(ev.target.data[departureDate]).map(trainNumber => [departureDate, trainNumber])).map(e => {
                    return { name: e[0] + " (" + e[1] + ")",
                                departureDate: e[0],
                                trainNumber: e[1]
                    };
                });
                aktiiviset.dataSource.dispatchImmediately("done", {data: aktiiviset.dataSource.data});
                junatSeries.show();
            });
        });
        
        junasijainnit.onMessageArrived = onJunasijaintiArrived(junatSeries);

        on(junatSeries.events, "shown", () => junasijainnitPaalle());
        on(junatSeries.events, "hidden", () => junasijainnitPois());


        log("Alustetaan aikataulut ja toteumat");

        let luoJunaSeries = () => {
            let series                          = new am4charts.LineSeries();
            series.showOnInit                   = false;
            series.hiddenInLegend               = true;
            series.dataFields.valueY            = "sijainti";
            series.simplifiedProcessing         = true;
            series.numberFormatter.numberFormat = "#";

            series.hiddenState.transitionDuration = 0;
            series.defaultState.transitionDuration = 0;

            return series;
        }

        let viimeisteleJunaSeries = series => {
            let bullet                        = new am4core.Circle();
            bullet.radius                     = 2;
            bullet.tooltipText                = "{dateX}\n" +
                                                "{paikka.nimi} -> {commercialTrack}\n" +
                                                "🛑:{trainStopping}, $:{commercialStop}";
            bullet.cloneTooltip               = false;
            bullet.propertyFields.fillOpacity = "paaty";
            bullet.states.create("hover").properties.scale = 1.5;
            series.bullets.push(bullet);

            let segment                 = series.segments.template;
            segment.tooltipText         = series.dummyData.trainType + series.dummyData.trainNumber + ' (' + series.dummyData.departureDate + ")\n" +
                                          (series.dummyData.commuterLineID ? series.dummyData.commuterLineID + ' ' : '') + series.dummyData.trainCategory + " (" + series.dummyData.operator + ")"; // jostain syystä placeholder-syntax ei näitä löydä...
            segment.cloneTooltip        = false;
            segment.tooltipPosition     = "pointer";
            segment.interactionsEnabled = true;
            segment.states.create("hover").properties.strokeWidth  = 3;
            segment.states.create("active").properties.strokeWidth = 3;

            on(segment.events, "inited", ev => ev.target.isActive = onkoAktiivinen(series.dummyData));
        };

        
        window.ladatutAikataulut = {};
        window.ladatutToteumat = {};
        window.kokonaanLadatutAikataulut = {};
        window.kokonaanLadatutToteumat = {};

        let luoAikatauluToteumaToggle = (nimi, vari, xField, ladatut) => {
            let toggle               = new am4charts.LineSeries();
            toggle.name              = nimi;
            toggle.fill              = am4core.color(vari);
            toggle.stroke            = toggle.fill;
            toggle.hidden            = true;
            toggle.dataFields.dateX  = xField;
            toggle.dataFields.valueY = "sijainti";
            on(toggle.events, "hidden", () => kutsuJunalle(ladatut, x => x.hide()));
            on(toggle.events, "shown",  () => kutsuJunalle(ladatut, x => x.show()));
            return toggle;
        };

        let aikataulutToggle = luoAikatauluToteumaToggle("Aikataulut", "blue", "scheduledTime", ladatutAikataulut);
        let toteumatToggle   = luoAikatauluToteumaToggle("Toteumat", "blue", "actualTime", ladatutToteumat);
        chart.series.pushAll([aikataulutToggle, toteumatToggle]);

        let junaOverAction = (series, train, luo, viimeistele) => {
            let juna = train.trainData;
            if (series) {
                if (series.isHidden) {
                    log("Näytetään", series.name, "junalle", juna.trainNumber, juna.departureDate);
                    series.show();
                }
            } else {
                log("Luodaan aikataulu/toteuma junalle", juna.trainNumber, juna.departureDate);
                luo(train).forEach(x => {
                    x.hidden = false;
                    chart.series.push(x);
                    lisaaScrollbariin(chart.scrollbarX)(x);
                    viimeistele(x);
                });
            };
        };

        let junaOver = (juna, rows) => {
            junaOverAction(ladatutAikataulut[juna.departureDate][juna.trainNumber], {trainData: juna, rows: rows}, luoAikataulu, viimeisteleAikataulu);
            junaOverAction(ladatutToteumat[juna.departureDate][juna.trainNumber], {trainData: juna, rows: rows}, luoToteuma, viimeisteleToteuma);
        };

        let junaOut = juna => {
            let isActive = onkoAktiivinen(juna);

            if (aikataulutToggle.isHidden && !isActive) {
                log("Piilotetaan aikataulu junalle", juna.trainNumber, juna.departureDate);
                if (ladatutAikataulut[juna.departureDate] && ladatutAikataulut[juna.departureDate][juna.trainNumber]) {
                    ladatutAikataulut[juna.departureDate][juna.trainNumber].hide();
                }
            }

            if (toteumatToggle.isHidden && !isActive) {
                log("Piilotetaan toteuma junalle", juna.trainNumber, juna.departureDate);
                if (ladatutToteumat[juna.departureDate] && ladatutToteumat[juna.departureDate][juna.trainNumber]) {
                    ladatutToteumat[juna.departureDate][juna.trainNumber].hide();
                }
            }
        }

        let asetaJunanAktiivisuus = (juna, series, toggleHidden) => {
            let isActive = onkoAktiivinen(juna);
            
            if (series && !series.isHidden) {
                series.isActive = isActive;
                series.segments.each(s => s.isActive = isActive);
            }

            if (isActive) {
                if (series) {
                    junaOver(juna, series.data);
                }
            } else {
                if (series && !series.isHidden && toggleHidden) {
                    log("Piilotetaan", series.name, "junalle", juna.trainNumber, juna.departureDate);
                    series.hide();
                }
            }
        };

        on(aktiivisetJunatDS.events, "done", ev => {
            let juna = ev;
            asetaJunanAktiivisuus(juna, ladatutAikataulut[juna.departureDate] && ladatutAikataulut[juna.departureDate][juna.trainNumber], aikataulutToggle.hidden);
            asetaJunanAktiivisuus(juna, ladatutToteumat[juna.departureDate] && ladatutToteumat[juna.departureDate][juna.trainNumber], toteumatToggle.hidden);
        });

        let luoAikataulu = train => {
            if (ladatutAikataulut[train.trainData.departureDate][train.trainData.trainNumber]) {
                return [];
            }
            let series              = luoJunaSeries();
            series.name             = "Aikataulu";
            series.data             = train.rows;
            series.fill             = am4core.color(train.trainData.vari);
            series.stroke           = series.fill;
            series.hidden           = aikataulutToggle.isHidden;
            series.zIndex           = 70;
            series.dummyData        = train.trainData;
            series.strokeWidth      = 1;
            series.dataFields.dateX = "scheduledTime";

            return [series];
        };
        let viimeisteleAikataulu = series => {
            viimeisteleJunaSeries(series);
            series.strokeDasharray = "4 2";
            let juna = series.dummyData;
            
            ladatutAikataulut[juna.departureDate][juna.trainNumber] = series;

            on(series.events, "over", () => junaOver(juna, series.data));
            on(series.events, "out", () => junaOut(juna));

            series.bullets.each(x => on(x.events, "hit", ev => {
                let dc = ev.target.dataItem.dataContext;
                kartta(dc.paikka.tunniste, dc.paikka.nimi, undefined, undefined, ev.point.x, ev.point.y);
            }));
            on(series.segments.template.events, "hit", () => valitseJuna(juna));
        };

        let luoToteuma = train => {
            if (ladatutToteumat[train.trainData.departureDate][train.trainData.trainNumber]) {
                return [];
            }
            let series              = luoJunaSeries();
            series.name             = "Toteuma";
            series.data             = train.rows;
            series.fill             = am4core.color(train.trainData.vari);
            series.stroke           = series.fill;
            series.hidden           = toteumatToggle.isHidden;
            series.zIndex           = 80;
            series.dummyData        = train.trainData;
            series.strokeWidth      = 2;
            series.dataFields.dateX = "actualTime";
            return [series];
        };
        let viimeisteleToteuma = series => {
            viimeisteleJunaSeries(series);
            let juna = series.dummyData;

            ladatutToteumat[juna.departureDate][juna.trainNumber] = series;

            on(series.events, "over", () => junaOver(juna, series.data));
            on(series.events, "out", () => junaOut(juna));
                
            series.bullets.each(x => on(x.events, "hit", () => valitseJuna(juna)));
            on(series.segments.template.events, "hit", () => valitseJuna(juna));
        };

        let luoAikataulut = data => {
            let aikataulut = data.flatMap(luoAikataulu);
            chart.series.pushAll(aikataulut);
            //aikataulut.forEach(lisaaScrollbariin(chart.scrollbarX)); // ei riitä suorituskyky
            aikataulut.forEach(viimeisteleAikataulu);
        };
        var luoToteumat = data => {
            let toteumat = data.flatMap(luoToteuma);
            chart.series.pushAll(toteumat);
            //toteumat.forEach(lisaaScrollbariin(chart.scrollbarX)); // ei riitä suorituskyky
            toteumat.forEach(viimeisteleToteuma);
        };
        
        let hae = (kokonaanLadatut, luo) => lahtopaiva => {
            let paiva = dateFns.dateFns.format(lahtopaiva, 'yyyy-MM-dd');
            if (!ladatutAikataulut[paiva]) {
                ladatutAikataulut[paiva] = {};
            }
            if (!ladatutToteumat[paiva]) {
                ladatutToteumat[paiva] = {};
            }
            if (!kokonaanLadatut) {
                kokonaanLadatut = {};
            }
            if (!kokonaanLadatut[paiva]) {
                lataaAikataulu(paiva, luo);
                kokonaanLadatut[paiva] = true;
            }
        };

        let haeAikataulujaTaiToteumia = (hae, series) => {
            let min = Math.min(xAxis.minZoomed, xAxis.maxZoomed);
            let max = Math.max(xAxis.minZoomed, xAxis.maxZoomed);
            if (naytetaankoAikataulut(min, max, !series.isHidden)) {
                dateFns.dateFns.eachDayOfInterval({start: new Date(min), end: new Date(max)}).forEach(hae);
            } else {
                series.hide();
            }
        };

        let haeAikatauluja = () => haeAikataulujaTaiToteumia(hae(kokonaanLadatutAikataulut, luoAikataulut), aikataulutToggle);
        let haeToteumia = () => haeAikataulujaTaiToteumia(hae(kokonaanLadatutToteumat, luoToteumat), toteumatToggle);

        let poistaAikataulu = series => {
            let juna = series.dummyData;
            log("Siivotaan pois juna", juna.departureDate, juna.trainNumber);
            delete kokonaanLadatutAikataulut[juna.departureDate];
            delete kokonaanLadatutToteumat[juna.departureDate];
            delete ladatutAikataulut[juna.departureDate][juna.trainNumber];
            delete ladatutToteumat[juna.departureDate][juna.trainNumber];
            let index = chart.series.indexOf(series);
            if (index >= 0) {
                let removed = chart.series.removeIndex(index);
                setTimeout(() => {
                    log("Viivästetysti siivotaan juna", juna.departureDate, juna.trainNumber);
                    removed.dispose();
                }, 60000);
            }
        };

        on(xAxis.events, "startendchanged", haeAikatauluja);
        on(xAxis.events, "startendchanged", haeToteumia);
        on(aikataulutToggle.events, "shown", haeAikatauluja);
        on(toteumatToggle.events,   "shown", haeToteumia);
        on(valittuDS.events, "done", () => {
            kutsuJunalle(ladatutAikataulut, poistaAikataulu);
            kutsuJunalle(ladatutToteumat,   poistaAikataulu);
            haeAikatauluja();
            haeToteumia();
        });

        on(xAxis.events, "startendchanged", ev => {
            let start = xAxis.minZoomed || ikkuna()[0].getTime();
            let end = xAxis.maxZoomed || ikkuna()[1].getTime();
            // amcharts palauttaa joskus minZoomed > maxZoomed :shrug:
            if (start > end) {
                log("Start > end!", new Date(start), new Date(end), new Date(xAxis.min), new Date(xAxis.max), ikkuna());
                return;
            }
            if (start == xAxis.min && end == xAxis.max) {
                // I don't know why amcharts does this...
                return;
            }
            setMainState('aika', [new Date(start), new Date(end)]);
        });

        on(xAxis.events, "startendchanged", ev => {
            if (!naytetaankoAikataulut(ev.target.minZoomed, ev.target.maxZoomed, !aikataulutToggle.hidden || !toteumatToggle.hidden)) {
                log("Piilotetaan junat");
                aikataulutToggle.hide();
                toteumatToggle.hide();
                kutsuJunalle(ladatutAikataulut, x => x.hide());
                kutsuJunalle(ladatutToteumat,   x => x.hide());
            }
        });

        let poistaKaukaisetJunat = target => series => {
            let disposeFurtherThanDays = 3;
            let start = target.minZoomed;
            let end = target.maxZoomed;
            if (series.dummyData.departureDate < dateFns.dateFns.addDays(start, -1*disposeFurtherThanDays) ||
                series.dummyData.departureDate > dateFns.dateFns.addDays(end,      disposeFurtherThanDays)) {
                poistaAikataulu(series);
            }
        }
        on(xAxis.events, "startendchanged", ev => {
            kutsuJunalle(ladatutAikataulut, poistaKaukaisetJunat(ev.target));
            kutsuJunalle(ladatutToteumat,   poistaKaukaisetJunat(ev.target));
        });

        log("Grafiikka valmis");
    });

    for (let i = 1; i < getStates().length; ++i) {
        let offsetX1;
        let offsetY1;
        let offsetX2;
        let offsetY2;
        if (getStates().length == 2) {
            offsetX1 = '4em';
            offsetY1 = '10em';
            offsetX2 = '4em';
            offsetY2 = '4em';
        } else {
            offsetX1 = (1 + ((i-1)%2)*60 + Math.random()*5) + '%';
            offsetY1 = (1 + ((i-1)%4)*20 + Math.random()*5) + '%';
        }
        kartta(getSubState(i)('sijainti'), undefined, getSubState(i)('time'), true, offsetX1, offsetY1, offsetX2, offsetY2);
    }

    window.asetaAikavali = voimassa => {
        xAxis.zoomToDates(voimassa[0], voimassa[1]);
    };

    getMainState('sijainti')
            .split(',')
            .filter(onkoJeti)
            .slice(0,1)
            .forEach(tunniste => {
                haeEnnakkotiedonRatanumerotJaVoimassaolo(tunniste, (ratanumero, voimassa) => {
                    ratanumeroChanged(ratanumero);
                    asetaAikavali(voimassa);
                });
    });
}