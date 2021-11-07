
let aikataulutGraphQL = departureDate => `{
  "query": "{
    viewer {
      getTrainsByDepartureDateUsingGET(departure_date: \\"${departureDate}\\") {
        departureDate
        trainNumber
        trainCategory
        timeTableRows {
          stationUICCode
          scheduledTime
          actualTime
          trainStopping
        }
      }
    }
  }" }`.replace(/\r?\n|\r/g,' ');

let parsiAikataulu = (paiva, data) => {
    log("Parsitaan aikataulut päivälle", paiva);
    let ret = data.filter(x => !x.cancelled)
        .map(train => {
            let data = {
                trainData: {
                    departureDate: train.departureDate,
                    trainNumber:   train.trainNumber,
                    lahtenyt:      false,
                    operator:      train.operatorShortCode,
                    trainType:     train.trainType,
                    trainCategory: train.trainCategory,
                    commuterLineID: train.commuterLineID,
                    vari:          train.trainCategory == 'Cargo' ? 'blue' : 'red'
                },
                rows: train.timeTableRows.map(row => {
                    let sijainti = null;
                    let paikka = aikataulupaikatDS.data[row.stationUICCode];
                    if (paikka != null) {
                        let ratanumero = valittunaRatanumero();
                        if (ratanumero) {
                            paikka.ratakmSijainnit.filter(x => x.ratanumero == ratanumero)
                                .forEach(x => {
                                    sijainti = x.ratakm * 1000 + x.etaisyys
                                });
                        } else if (valittunaAikataulupaikka()) {
                            let sij = valittuDS.data.findIndex(([uickoodi,distance]) => uickoodi == row.stationUICCode);
                            if (sij > -1) {
                                sijainti = sij;
                            }
                        }
                    } else {
                        log("Tuntematon UICKoodi!", row.stationUICCode);
                    }

                    return {
                        scheduledTime: new Date(row.scheduledTime),
                        actualTime:    row.actualTime ? new Date(row.actualTime) : null,
                        sijainti:      sijainti,
                        uicKoodi:      row.stationUICCode,
                        paikka:        paikka,
                        paaty:         0,
                        trainStopping: row.trainStopping || false,
                        commercialStop: row.commercialStop || false,
                        commercialTrack: row.commercialTrack === '' ? '?' : row.commercialTrack
                    };
                })
            };
            if (data.rows.length > 0) {
                data.rows[0].paaty = 1;
                data.rows[data.rows.length - 1].paaty = 1;
            }
            if (data.rows.find(x => x.actualTime)) {
                data.trainData.lahtenyt = true;
            }
            return data;
        });

    log("Parsittiin", ret.length, "aikataulua päivälle", paiva);
    ret = ret.filter(x => x.rows.filter(y => y.sijainti != null).length > 1);
    log("Jätettiin", ret.length, "aikataulua päivälle", paiva);
    return ret;
}

let lataaAikatauluRest = (paiva, callback) => {
    let aikataulutDS = new am4core.DataSource();
    aikataulutDS.url = aikatauluAPIUrl + paiva;
    monitor(aikataulutDS, paiva);
    initDS(aikataulutDS);
    on(aikataulutDS.events, "done", ev => {
        callback(parsiAikataulu(paiva, ev.target.data));
        setTimeout(() => ev.target.dispose(), 1000);
    });
    aikataulutDS.load();
};

let lataaAikatauluGraphQL = (paiva, callback) =>
    postJson(graphQLUrl, aikataulutGraphQL(paiva), data => callback(parsiAikataulu(paiva, data.data.viewer.getTrainsByDepartureDateUsingGET)));

let lataaAikataulu = lataaAikatauluRest;
//let lataaAikataulu = lataaAikatauluGraphQL;

let kutsuJunalle = (data, f) => Object.values(data).flatMap(Object.values).forEach(f);

let naytetaankoAikataulut = (min, max, seriesShown) => {
    let start = min || ikkuna()[0].getTime();
    let end   = max || ikkuna()[1].getTime();
    return end-start <= junienEsitysaikavali && seriesShown;
};

let luoJunaPopup = (lahtopaiva, junanumero) => {
    try {
        return luoJunaPopup_(lahtopaiva, junanumero);
    } catch (e) {
        log(e);
        return e;
    }
};
let luoJunaPopup_ = (lahtopaiva, junanumero) => {
    let tunniste = !lahtopaiva ? undefined : lahtopaiva + ' (' + junanumero + ')';

    let [container, elemHeader] = luoIkkuna(tunniste);
    container.setAttribute("class", "popupContainer infoPopup aikatauluPopup");

    let open = document.createElement("div");
    open.setAttribute("class", "open");

    open.innerHTML = luoLinkit('aikataulu', tunniste, tunniste);
    elemHeader.appendChild(open);

    let content = document.createElement("div");
    
    let id = generateId();
    content.setAttribute("id", id);
    content.setAttribute("class", "junaPopup");
    container.appendChild(content);

    dragElement(container, tunniste);

    window.junapopup = am4core.create(id, am4charts.XYChart);
    junapopup.height = am4core.percent(100);
    junapopup.events.on("error", errorHandler);

    junapopup.legend = new am4charts.Legend();
    junapopup.dateFormatter.dateFormat = "dd.MM.yyyy HH:mm:ss";

    junapopup.scrollbarX = new am4core.Scrollbar();
    junapopup.scrollbarY = new am4core.Scrollbar();

    junapopup.cursor          = new am4charts.XYCursor();
    junapopup.cursor.behavior = "panXY";
    junapopup.numberFormatter.numberFormat = "#";

    let xAxis = junapopup.xAxes.push(new am4charts.CategoryAxis());
    let yAxis = junapopup.yAxes.push(new am4charts.DateAxis());

    xAxis.dataFields.category = 'categoryX';
    xAxis.renderer.minGridDistance = 40;
    xAxis.renderer.labels.template.tooltipText = "{paikka.tyyppi} {stationShortCode} ({stationUICCode}) {paikka.nimi}";
    on(xAxis.renderer.labels.template.events, "doublehit", ev => {
        let dc = ev.target.dataItem.dataContext;
        kartta(dc.paikka.tunniste, dc.paikka.tyyppi + ' ' + dc.paikka.nimi);
    });

    yAxis.tooltip.dx = 110;
    yAxis.renderer.labels.template.tooltipText = "{value.formatDate(dd.MM.yyyy HH:mm:ss)}";

    xAxis.renderer.labels.template.adapter.add("textOutput", x => !x ? x : x.replace(/\(.*/, ""));

    let bullet                        = new am4core.Circle();
    bullet.radius                     = 2;
    bullet.tooltipText                = "{paikka.tyyppi} {stationShortCode} ({stationUICCode}) {paikka.nimi}\n{valueY}\n{viive}";
    bullet.states.create("hover").properties.scale = 1.5;

    let initSeries = tunniste => {
        let dataSource = new am4core.DataSource();
        dataSource.data = [];
        initDS(dataSource);
        monitor(dataSource, tunniste);

        let aikatauluPopup = new am4charts.LineSeries();
        aikatauluPopup.dataSource = dataSource;
        aikatauluPopup.fill                 = "blue";
        aikatauluPopup.name                 = tunniste + " aikataulu";
        aikatauluPopup.dataFields.categoryX = 'categoryX';
        aikatauluPopup.dataFields.dateY     = 'scheduledTime';
        aikatauluPopup.bullets.push(bullet);
        
        let toteumaPopup = new am4charts.LineSeries();
        toteumaPopup.dataSource = dataSource;
        toteumaPopup.fill                 = "red";
        toteumaPopup.name                 = tunniste + " toteuma";
        toteumaPopup.dataFields.categoryX = 'categoryX';
        toteumaPopup.dataFields.dateY     = 'valueY';
        toteumaPopup.bullets.push(bullet);
        
        on(dataSource.events, "parseended", ev => {
            if (ev.target.data.length == 0) {
                log('Ei dataa junalle', tunniste);
            } else {
                ev.target.data = ev.target.data[0].timeTableRows;
                ev.target.data.forEach(x => {
                    let aika = x.actualTime ? new Date(x.actualTime) : x.liveEstimateTime ? new Date(x.liveEstimateTime) : undefined;
                    let viive = !aika ? aika : dateFns.durationFns.toSeconds({ milliseconds: Math.abs(aika.getTime() - (new Date(x.scheduledTime)).getTime()) });
                    x.scheduledTime = new Date(x.scheduledTime);
                    x.valueY        = aika; // || ev.target.data[0].scheduledTime;
                    x.categoryX     = x.stationShortCode;
                    x.paikka        = aikataulupaikatDS.data['' + x.stationUICCode];
                    x.viive         = !viive ? '' : (new Date(x.scheduledTime) < new Date(x.actualTime || x.liveEstimateTime) ? 'myöhässä ' : 'etuajassa ') + (viive < 60 ? viive + ' sekuntia' : viive < 120 ? '1 minuutti ' + (viive-60) + ' sekuntia' : 'n.' + Math.floor(viive/60) + ' minuuttia');
                });
            }

            let uudet = ev.target.data.filter(x => !junapopup.data.find(y => y.categoryX == x.categoryX));
            if (uudet.length > 0) {
                if (junapopup.data.length == 0) {
                    junapopup.data = uudet;    
                } else {
                    junapopup.data = junapopup.data.flatMap(x => {
                        let i = ev.target.data.indexOf(x);
                        if (i > -1) {
                            let suffix = ev.target.data.slice(i);
                            let firstIncluded = suffix.findIndex(x => junapopup.data.includes(x));
                            if (firstIncluded > -1) {
                                return [x, ...suffix.slice(0, firstIncluded)];
                            }
                            return [x, ...ev.target.data.slice(i)];
                        }
                        return [x];
                    }).filter( (value, index, self) => self.indexOf(value) === index);
                    let jaaneet = ev.target.data.filter(x => !junapopup.data.find(y => y.categoryX == x.categoryX));
                    junapopup.data = junapopup.data.concat(jaaneet);
                }
                junapopup.data = junapopup.data.concat(uudet);
                junapopup.series.values.map(x => x.invalidateData());
            }
        });

        junapopup.series.pushAll([aikatauluPopup, toteumaPopup]);

        dataSource.url = luoAikatauluUrl(tunniste);
        dataSource.load();
    }

    let haku = document.createElement('input');
    haku.setAttribute('placeholder', 'hae...');
    haku.setAttribute('style', 'display: none');
    container.appendChild(haku);

    let poista = tunniste => {
        junapopup.series.values.filter(x => x.name.startsWith(tunniste))
                               .forEach(x => {
                                let removed = junapopup.series.removeIndex(junapopup.series.indexOf(x));
                                setTimeout(() => {
                                    log("Viivästetysti siivotaan", tunniste);
                                    removed.dispose();
                                }, 60000);
                               });
    };
    let search = initSearch(haku, initSeries, poista, true, true);
    search.settings.create = x => ({tunniste: x, nimi: x});
    search.disable();
    search.createItem(tunniste);
    search.enable();
    search.close();
    search.settings.create = false;
}