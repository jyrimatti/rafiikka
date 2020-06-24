let lataaAikataulu = (paiva, callback) => {
    let aikataulutDS = new am4core.DataSource();
    aikataulutDS.url = aikatauluAPIUrl + paiva;
    monitor(aikataulutDS, paiva);
    on(aikataulutDS.events, "done", ev => {
        log("Parsitaan aikataulut päivälle " + paiva);
        let ret = ev.target.data.filter(x => !x.cancelled)
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
                                                      sijainti = x.ratakm*1000 + x.etaisyys
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
                data.rows[data.rows.length-1].paaty = 1;
            }
            if (data.rows.find(x => x.actualTime)) {
                data.trainData.lahtenyt = true;
            }
            return data;
        });
        log("Parsittiin " + ret.length + " aikataulua päivälle " + paiva);
        if (valittunaRatanumero()) {
            ret = ret.filter(x => x.rows.filter(y => y.sijainti != null).length > 1);
        } else if (valittunaAikataulupaikka()) {
            ret = ret.filter(x => x.rows.filter(y => y.sijainti != null).length > 1);
        }
        log("Jätettiin " + ret.length + " aikataulua päivälle " + paiva);
        callback(ret);
        setTimeout(() => ev.target.dispose(), 1000);
    });
    aikataulutDS.load();
};

let kutsuJunalle = (data, f) => Object.values(data).flatMap(Object.values).forEach(f);