let juna2sijainti = data => {
    let ret = koordinaatti2sijainti(data.location);
    if (ret) {
        log("Juna", data.departureDate, data.trainNumber, "oli sijainnissa", ret);
    }
    return ret;
}

let etsiJunat = tunniste => window.junatSeries.dataSource.data.filter(j => j.departureDate + ' (' + j.trainNumber + ')' == tunniste ||  
                                                                           j.departureDate == tunniste);

let muunnaJunasijainti = data => {
    // TODO: muuta käyttämään suoraan DT:stä tulevaa ratakmsijaintia, kun sellainen tulee
    let pyoristettySijainti = data.location.coordinates.map(x => Number(Number(x).toFixed(3)));
    return {
        trainNumber:   data.trainNumber,
        departureDate: data.departureDate,
        timestamp:     new Date(data.timestamp),
        sijainti:      juna2sijainti(data) || koordinaatti2sijainti({type:'Point', coordinates: pyoristettySijainti}) || lataaSijainti(pyoristettySijainti),
        location:      pyoristettySijainti,
        speed:         data.speed
    };
};

let paivitaJunienRatakmsijainnit = series => () => {
    if (!series.hidden) {
        let paivitetty = series.dataSource.data.filter(x => x.sijainti === undefined)
                                               .map(x => {
            x.sijainti = koordinaatti2sijainti({type:'Point', coordinates: x.location});
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
            tunnettuJuna.sijainti  = data.sijainti || tunnettuJuna.sijainti;
            tunnettuJuna.speed     = data.speed;
            tunnettuJuna.location  = data.location;
        } else {
            series.dataSource.data.push(data);
            series.invalidateData();
        }
        series.dataSource.dispatchImmediately("done", {data: series.dataSource.data});
    }
};

let valitseJuna = juna => {
    if (onkoAktiivinen(juna)) {
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

let onkoAktiivinen = juna => aktiivisetJunatDS.data[juna.departureDate] &&
                             aktiivisetJunatDS.data[juna.departureDate][juna.trainNumber];