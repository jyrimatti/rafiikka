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
                    vari:          train.trainCategory == 'Cargo' ? 'blue' : 'red'
                },
                rows: train.timeTableRows.map(row => {
                    let sijainti = null;
                    let paikka = aikataulupaikatDS.data[row.stationUICCode];
                    if (paikka != null) {
                        if (valittunaRatanumero()) {
                            paikka.ratakmSijainnit.filter(x => x.ratanumero == valittuDS.data)
                                .forEach(x => {
                                    sijainti = x.ratakm * 1000 + x.etaisyys
                                });
                        } else if (valittunaAikataulupaikka()) {
                            let sij = valittuDS.data.indexOf(row.stationUICCode);
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
                        paikka:        paikka ? paikka.lyhenne : null,
                        paaty:         0
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

let lataaAikatauluGraphQL = (paiva, callback) => {
    fetch(graphQLUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'/*,
            'Digitraffic-User': 'Rafiikka'*/
        },
        body: aikataulutGraphQL(paiva)
    }).then(response => response.json())
      .then(data => callback(parsiAikataulu(paiva, data.data.viewer.getTrainsByDepartureDateUsingGET)))
      .catch(errorHandler);
};

let lataaAikataulu = lataaAikatauluRest;
//let lataaAikataulu = lataaAikatauluGraphQL;

let kutsuJunalle = (data, f) => Object.values(data).flatMap(Object.values).forEach(f);

let naytetaankoAikataulut = (min, max, seriesShown) => {
    let start = min || ikkuna()[0].getTime();
    let end   = max || ikkuna()[1].getTime();
    return end-start <= junienEsitysaikavali && seriesShown;
};

let luoJunaPopup = (lahtopaiva, junanumero) => {
    let ret = luoIkkuna(lahtopaiva + ' (' + junanumero + ')');
    let container = ret[0];
    container.setAttribute("class", "popupContainer infoPopup aikatauluPopup");

    let content = document.createElement("div");
    let id = lahtopaiva + '(' + junanumero + ')';
    content.setAttribute("id", id);
    content.setAttribute("class", "junaPopup");
    container.appendChild(content);

    dragElement(container);

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

    junapopup.dataSource = new am4core.DataSource();
    junapopup.dataSource.data = [];
    initDS(junapopup.dataSource);
    monitor(junapopup.dataSource, lahtopaiva + '(' + junanumero + ')');

    on(junapopup.dataSource.events, "parseended", ev => {
        if (ev.target.data.length == 0) {
            log('Ei dataa junalle', lahtopaiva, junanumero);
        } else {
            ev.target.data = ev.target.data[0].timeTableRows;
            ev.target.data.forEach((x,i) => {
                let aika = x.actualTime ? new Date(x.actualTime) : x.liveEstimateTime ? new Date(x.liveEstimateTime) : undefined;
                let viive = !aika ? aika : dateFns.durationFns.toSeconds({ milliseconds: Math.abs(aika.getTime() - (new Date(x.scheduledTime)).getTime()) });
                x.scheduledTime = new Date(x.scheduledTime);
                x.valueY        = aika; // || ev.target.data[0].scheduledTime;
                x.categoryX     = x.stationShortCode + '(' + i + ')';
                x.paikka        = aikataulupaikatDS.data['' + x.stationUICCode];
                x.viive         = !viive ? '' : (new Date(x.scheduledTime) < new Date(x.actualTime || x.liveEstimateTime) ? 'myöhässä ' : 'etuajassa ') + (viive < 60 ? viive + ' sekuntia' : viive < 120 ? '1 minuutti ' + (viive-60) + ' sekuntia' : 'n.' + Math.floor(viive/60) + ' minuuttia');
            });
        }
    });

    xAxis.renderer.labels.template.adapter.add("textOutput", x => !x ? x : x.replace(/\(.*/, ""));

    let bullet                        = new am4core.Circle();
    bullet.radius                     = 2;
    bullet.tooltipText                = "{paikka.tyyppi} {stationShortCode} ({stationUICCode}) {paikka.nimi}\n{valueY}\n{viive}";
    bullet.states.create("hover").properties.scale = 1.5;

    window.aikatauluPopup = new am4charts.LineSeries();
    aikatauluPopup.fill                 = "blue";
    aikatauluPopup.name                 = "Aikataulu";
    aikatauluPopup.dataFields.categoryX = 'categoryX';
    aikatauluPopup.dataFields.dateY     = 'scheduledTime';
    aikatauluPopup.bullets.push(bullet);
    
    window.toteumaPopup = new am4charts.LineSeries();
    toteumaPopup.fill                 = "red";
    toteumaPopup.name                 = "Toteuma";
    toteumaPopup.dataFields.categoryX = 'categoryX';
    toteumaPopup.dataFields.dateY     = 'valueY';
    toteumaPopup.bullets.push(bullet);

    junapopup.series.pushAll([aikatauluPopup,toteumaPopup]);

    junapopup.dataSource.url = aikatauluAPIUrl + lahtopaiva + '/' + junanumero;
    junapopup.dataSource.load();
}