let koordinaatti2sijainti = data => {
    if (valittunaAikataulupaikka()) {
        let junanKoordinaatti = geometryFactory.buildGeometry(javascript.util.Arrays.asList([geojsonReader.read(data.location)]));

        let sisaltyva = valittuDS.data.flatMap( (x,index) => {
            let paikka = aikataulupaikatDS.data[x];
            if (paikka.geometria.getGeometryType() != 'Point') {
                let mbc = new jsts.algorithm.MinimumBoundingCircle(paikka.geometria);
                if (mbc.getCircle().contains(junanKoordinaatti)) {
                    return [index];
                }
            }
            return [];
        });
        if (sisaltyva.length > 0) {
            log("Juna", data.departureDate, data.trainNumber, "oli sijainnissa", sisaltyva[0]);
            return sisaltyva[0];
        }

        let alueet = valittuDS.data.slice(1).map( (_,edellinenIndex) => {
            let edellinenUicKoodi = valittuDS.data[edellinenIndex];
            let seuraavaUicKoodi = valittuDS.data[edellinenIndex+1];
            let geomList = javascript.util.Arrays.asList([aikataulupaikatDS.data[edellinenUicKoodi].geometria, aikataulupaikatDS.data[seuraavaUicKoodi].geometria]);
            let mbc = new jsts.algorithm.MinimumBoundingCircle(geometryFactory.buildGeometry(geomList));
            return [edellinenUicKoodi, seuraavaUicKoodi, mbc.getCircle()];
        });
        let sijainti = alueet.filter(a => a[2].contains(junanKoordinaatti)).map(a => {
            let edellinen = aikataulupaikatDS.data[a[0]];
            let seuraava = aikataulupaikatDS.data[a[1]];
            let suht = edellinen.geometria.distance(junanKoordinaatti) / edellinen.geometria.distance(seuraava.geometria);
            let ret = valittuDS.data.indexOf(edellinen.uicKoodi) + suht;
            log("Laskettiin junalle", data.departureDate, data.trainNumber, "sijainti", ret);
            return ret;
        }).find(_ => true);
        return sijainti;
    }
    return undefined;
};

let ratakmsijainnit2sijainti = ratakmsijainnit => {
    if (valittunaRatanumero() && ratakmsijainnit) {
        let ratakmsijainti = ratakmsijainnit.find(r => r.ratanumero == valittuDS.data);
        if (ratakmsijainti) {
            return ratakmsijainti.ratakm*1000+ratakmsijainti.etaisyys;
        }
    }
    return undefined;
};

window.sijainnitMap = {};
let lataaSijainti = coord => {
    if (valittunaRatanumero() && valittuDS.data) {
        let sijaintiDS = new am4core.DataSource();
        initDS(sijaintiDS);
        sijaintiDS.url = ratakmMuunnosUrl.replace("{coord}", coord.join(","));
        on(sijaintiDS.events, "done", ev => {
            if (ev.target.data[0] && ev.target.data[0].ratakmsijainnit) {
                log("Saatiin koordinaatille", coord, "ratakmsijainnit", ev.target.data[0].ratakmsijainnit);
                sijainnitMap[coord] = ev.target.data[0].ratakmsijainnit;
            } else {
                log("Ei saatu ratakmsijainteja koordinaatille", coord);
            }
            setTimeout(() => ev.target.dispose(), 1000);
        });
        sijaintiDS.load();
        return 0;
    }
    return undefined;
};

let muunnaJunasijainti = data => {
    let pyoristettySijainti = data.location.coordinates.map(x => Number(Number(x).toFixed(3)));
    let ratakmsijainnit = sijainnitMap[pyoristettySijainti];
    return {
        trainNumber:   data.trainNumber,
        departureDate: data.departureDate,
        timestamp:     new Date(data.timestamp),
        sijainti:      koordinaatti2sijainti(data) || ratakmsijainnit2sijainti(ratakmsijainnit) || lataaSijainti(pyoristettySijainti),
        location:      pyoristettySijainti,
        speed:         data.speed
    };
};

let paivitaJunienRatakmsijainnit = series => () => {
    if (!series.hidden) {
        let paivitetty = series.dataSource.data.filter(x => x.sijainti <= 0).map(x => {
            x.sijainti = ratakmsijainnit2sijainti(sijainnitMap[x.location]) || 0;
            if (x.sijainti > 0) {
                log("Päivitettiin koordinaatille", x.location, "sijainti", x.sijainti);
                return true;
            }
            return false;
        });
        if (paivitetty.find(x => x)) {
            series.dataSource.dispatchImmediately("done", {data: series.dataSource.data});
        }
    }
};


window.junasijainnit = new Paho.MQTT.Client(mqttUrl, mqttPort, "rafiikka_" + parseInt(Math.random() * 10000, 10));
junasijainnit.onConnectionLost = errorHandler;
let junasijainnitPaalle = () => {
    junasijainnit.connect({
        useSSL: true,
        timeout: 3,
        onSuccess: () => {
            junasijainnit.subscribe(mqttTopic, {
                qos: 0
            });
        },
        onFailure: errorHandler
    });
};
let junasijainnitPois = () => {
    if (junasijainnit.isConnected()) {
        junasijainnit.disconnect();
    }
};

let onJunasijaintiArrived = series => message => {
    let data = muunnaJunasijainti(JSON.parse(message.payloadString));
    if (data.sijainti) {
        let tunnettuJuna = series.dataSource.data.find(x => x.trainNumber == data.trainNumber && x.departureDate == data.departureDate);
        if (tunnettuJuna) {
            tunnettuJuna.timestamp = data.timestamp;
            tunnettuJuna.sijainti = data.sijainti == 0 ? tunnettuJuna.sijainti : data.sijainti;
            tunnettuJuna.speed = data.speed;
            tunnettuJuna.location = data.location;
        } else {
            series.dataSource.data.push(data);
            series.invalidateData();
        }
        series.dataSource.dispatchImmediately("done", {data: series.dataSource.data});
    }
};

let valitseJuna = juna => {
    let aktiivinen = aktiivisetJunatDS.data[juna.departureDate] && aktiivisetJunatDS.data[juna.departureDate][juna.trainNumber];
    if (aktiivinen) {
        log("Valittiin pois juna", juna.departureDate, juna.trainNumber);
        delete aktiivisetJunatDS.data[juna.departureDate][juna.trainNumber];
    } else {
        log("Valittiin päälle juna", juna.departureDate, juna.trainNumber);
        if (!aktiivisetJunatDS.data[juna.departureDate]) {
            aktiivisetJunatDS.data[juna.departureDate] = {};
        }
        aktiivisetJunatDS.data[juna.departureDate][juna.trainNumber] = true;
    }
    aktiivisetJunatDS.dispatchImmediately("done", {departureDate: juna.departureDate, trainNumber: juna.trainNumber});
};

let onkoAktiivinen = juna => aktiivisetJunatDS.data[juna.departureDate] && aktiivisetJunatDS.data[juna.departureDate][juna.trainNumber] ? true : false;