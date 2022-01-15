
let tyorakoAikavaliksi = (alkupaiva, aloitusaika, kestoDuration) => {
    let aloitusPaiva = new Date(alkupaiva); // "2019-10-29"
    let kesto        = dateFns.durationFns.parse(kestoDuration);  // "PT43200S";
    
    let alku = dateFns.dateFnsTz.toDate(dateFns.dateFns.format(aloitusPaiva, 'yyyy-MM-dd') + 'T' + aloitusaika, { timeZone: 'Europe/Helsinki' });
    return [alku, dateFns.dateFns.add(alku, kesto)];
};

let parsiRT = rt => rt.workParts.flatMap(wp => {
    let aikavali = tyorakoAikavaliksi(wp.startDay, wp.plannedWorkingGap, wp.permissionMinimumDuration);
    let yleiset = {
        tunniste:         rt.id,
        sisainenTunniste: 'RT' + rt.id.replaceAll(/.*[.]/g,''),
        tila:             rt.state,
        lisatiedot:       rt.state + " - " + rt.organization + "\n" +
            [(rt.trafficSafetyPlan     ? "traffic safety" : undefined),
             (rt.personInChargePlan    ? "person in charge" : undefined),
             (rt.electricitySafetyPlan ? "electricity safety" : undefined),
             (rt.speedLimitRemovalPlan ? "speed limit removal" : undefined),
             (rt.speedLimitPlan        ? "speed limit" : undefined)].filter(x => x).join(", "),
        location:         rt.location,
        alkuX:            aikavali[0],
        loppuX:           aikavali[1]
    };
    return joinByRatakmvalit(wp.locations.flatMap(parseLocation(yleiset)))
        .map(setZIndex)
        .map(fixPoints)
        .map(joinSijainti);
});

let parsiLR = lr => {
    let aikavali = [new Date(lr.startDate), new Date(lr.endDate || "2030-01-01T00:00:00Z")];
    let yleiset = {
        tunniste:         lr.id,
        sisainenTunniste: 'LR' + lr.id.replaceAll(/.*[.]/g,''),
        tila:             lr.state,
        lisatiedot:       lr.state + " - " + lr.organization + "\n" + lr.limitation,
        location:         lr.location,
        alkuX:            aikavali[0],
        loppuX:           aikavali[1]
    };
    return joinByRatakmvalit(lr.locations.flatMap(parseLocation(yleiset)))
        .map(setZIndex)
        .map(fixPoints)
        .map(joinSijainti);
};

let joinSijainti = x => {
    return { ...x,
             sijainti: Object.keys(x.sijainti)
                             .map(k => x.sijainti[k].length == 0 ? k : k + ": " + x.sijainti[k].join(", "))
                             .join("\n")
           };
};

let setZIndex = x => {
    let z = {
        zIndex: -1 * (x.loppuY - x.alkuY) - 0.001*(x.loppuX.getTime() - x.alkuX.getTime())
    };
    return {...x, ...z};
};

let yComparator = (a,b) => {
    if (a.alkuY < b.alkuY) {
        return -1;
    } else if (a.alkuY > b.alkuY) {
        return 1;
    } else if (a.loppuY < b.loppuY) {
        return -1;
    } else if (a.loppuY > b.loppuY) {
        return 1;
    }
    return 0;
};

let mergeObjects = (o1, o2) => {
    if (!o2) {
        return o1;
    }
    let ret = {...o1};
    Object.keys(o2).forEach(k => {
        if (ret[k]) {
            ret[k] = [...new Set(ret[k].concat(o2[k]))];
        } else {
            ret[k] = o2[k];
        }
    });
    return ret;
}

let joinByRatakmvalit = xs => xs.sort(yComparator).reduce( (prev, cur) => {
    if (prev.length == 0) {
        return [cur];
    }
    let last = prev[prev.length-1];
    if (last.ratanumero == cur.ratanumero && last.loppuY >= cur.alkuY) {
        return prev.slice(0, -1).concat([{
            ...last,
            loppuY:   Math.max(last.loppuY, cur.loppuY),
            sijainti: last.sijainti == undefined ? cur.sijainti : mergeObjects(last.sijainti, cur.sijainti),
            raiteet:  [...new Set(!last.raiteet ? cur.raiteet : last.raiteet.concat(cur.raiteet || []))]
        }]);
    } else {
        return prev.concat([cur]);
    }
}, []);

let parseLocation = yleiset => location => {
    let paikka = location.operatingPointId;
    let vali = location.sectionBetweenOperatingPointsId;

    let lpaikka = rautatieliikennepaikatDS.data[paikka];
    if (paikka && !lpaikka) {
        log("Liikennepaikkaa ei löydy:", paikka);
        return [];
    }

    let lpvali = liikennepaikkavalitDS.data[vali];
    if (vali && !lpvali) {
        log("Liikennepaikkaväliä ei löydy:", vali);
        return [];
    }

    let paikkaText = paikka ? lpaikka.lyhenne : '?';
    let valiText = vali ? rautatieliikennepaikatDS.data[lpvali.alkuliikennepaikka].lyhenne + " - " +
                          rautatieliikennepaikatDS.data[lpvali.loppuliikennepaikka].lyhenne : '?';

    if (location.identifierRanges.length == 0) {
        if (vali) {
            let ratanumero = valittunaRatanumero();
            if (ratanumero) {
                return lpvali.ratakmvalit.filter(x => x.ratanumero == ratanumero)
                                         .map(rkmv => {
                    let sij = {
                        ratanumero: rkmv.ratanumero,
                        alkuY:      rkmv.alku.ratakm*1000+rkmv.alku.etaisyys,
                        loppuY:     rkmv.loppu.ratakm*1000+rkmv.loppu.etaisyys,
                        paikka:     paikka,
                        vali:       vali,
                        sijainti:   {[valiText]: []}
                    };
                    return {...yleiset, ...sij};
                });
            } else if (valittunaAikataulupaikka()) {
                return lpvali.ratakmvalit.map(aikataulupaikkavali)
                                         .filter(x => x.length > 0)
                                         .map(apv => {
                    let sij = {
                        alkuY:    apv[0],
                        loppuY:   apv[1],
                        paikka:   paikka,
                        vali:     vali,
                        sijainti: {[valiText]: []}
                    };
                    return {...yleiset, ...sij};
                });
            }
        } else if (paikka) {
            let ratanumero = valittunaRatanumero();
            if (ratanumero) {
                return lpaikka.ratakmvalit.filter(x => x.ratanumero == ratanumero)
                                          .map(rkmv => {
                    let sij = {
                        ratanumero: rkmv.ratanumero,
                        alkuY:      rkmv.alku.ratakm*1000+rkmv.alku.etaisyys,
                        loppuY:     rkmv.loppu.ratakm*1000+rkmv.loppu.etaisyys,
                        paikka:     paikka,
                        vali:       vali,
                        sijainti:   {[paikkaText]: []}
                    };
                    return {...yleiset, ...sij};
                });
            } else if (valittunaAikataulupaikka()) {
                return lpaikka.ratakmvalit.map(aikataulupaikkavali)
                                          .filter(x => x.length > 0)  
                                          .flatMap(apv => {
                    let sij = {
                        alkuY:    apv[0],
                        loppuY:   apv[1],
                        paikka:   paikka,
                        vali:     vali,
                        sijainti: {[paikkaText]: []}
                    };
                    return [{...yleiset, ...sij}];
                });
            }
        } else {
            throw new "waat?";
        }
    } else {
        return location.identifierRanges.flatMap(ir => {
            let elementti = ir.elementId;
            let elementtivalit = ir.elementRanges.map(er => ({
                elementti1: er.elementId1,
                elementti2: er.elementId2,
                raiteet:    er.trackIds
            }));

            if (elementtivalit.length > 0 && elementti) {
                throw new "Whoops";
            }

            if (elementtivalit.length > 0) {
                return elementtivalit.flatMap(ev => {
                    let e1 = ratatyoElementitDS.data[ev.elementti1];
                    if (!e1) {
                        log("Elementtiä ei löydy:", ev.elementti1);
                        return [];
                    }
                    let e2 = ratatyoElementitDS.data[ev.elementti2];
                    if (!e2) {
                        log("Elementtiä ei löydy:", ev.elementti2);
                        return [];
                    }

                    let alueText = (valiText   ? '(' + valiText   + ')' :
                                    paikkaText ? '(' + paikkaText + ')' : '');
                    let sijaintiText = e1.nimi + " - " + e2.nimi;

                    let ratanumero = valittunaRatanumero();
                    if (ratanumero) {
                        return e1.ratakmsijainnit.filter(x => x.ratanumero == ratanumero)
                                                 .flatMap(rkm1 =>
                            e2.ratakmsijainnit.filter(x => x.ratanumero == ratanumero)
                                              .map(rkm2 => {
                                let sij = {
                                    ratanumero: rkm1.ratanumero,
                                    alkuY:      rkm1.ratakm*1000+rkm1.etaisyys,
                                    loppuY:     rkm2.ratakm*1000+rkm2.etaisyys,
                                    raiteet:    ev.raiteet,
                                    paikka:     paikka,
                                    vali:       vali,
                                    sijainti:   {[alueText]: [sijaintiText]}
                                };
                                return {...yleiset, ...sij};
                            }));
                    } else if (valittunaAikataulupaikka()) {
                        let e1ratanumerot = e1.ratakmsijainnit.map(x => x.ratanumero);
                        let e2ratanumerot = e2.ratakmsijainnit.map(x => x.ratanumero);
                        let yhteisetRatanumerot = e1ratanumerot.filter(x => e2ratanumerot.includes(x));
                        if (yhteisetRatanumerot.length == 0) {
                            log("Elementeillä ei yhteisiä ratanumeroita:", e1, e2);
                            return [];
                        }

                        return yhteisetRatanumerot.flatMap(ratanumero => {
                            let e1rkm = e1.ratakmsijainnit.find(x => x.ratanumero == ratanumero);
                            let e2rkm = e2.ratakmsijainnit.find(x => x.ratanumero == ratanumero);
                            let rkms = [e1rkm, e2rkm].sort(ratakmsijaintiComparator);
                            let rkmv = {
                                ratanumero: ratanumero,
                                alku: rkms[0],
                                loppu: rkms[1]
                            };
                            let apv = aikataulupaikkavali(rkmv);
                            if (apv.length == 0) {
                                return [];
                            }
                            let sij = {
                                alkuY:    apv[0],
                                loppuY:   apv[1],
                                raiteet:  ev.raiteet,
                                paikka:   paikka,
                                vali:     vali,
                                sijainti: {[alueText]: [sijaintiText]}
                            };
                            return [{...yleiset, ...sij}];
                        });
                    }
                });
            } else if (elementti) {
                let e1 = ratatyoElementitDS.data[elementti];
                if (!e1) {
                    log("Elementtiä ei löydy:", elementti);
                    return [];
                }

                let alueText = (valiText   ? '(' + valiText   + ')' :
                                paikkaText ? '(' + paikkaText + ')' : '');
                let sijaintiText = e1.nimi;
                                               
                let ratanumero = valittunaRatanumero();
                if (ratanumero) {
                    return e1.ratakmsijainnit.filter(x => x.ratanumero == ratanumero).map(rkm => {
                        let sij = {
                            ratanumero: rkm.ratanumero,
                            alkuY:      rkm.ratakm*1000+rkm.etaisyys,
                            loppuY:     rkm.ratakm*1000+rkm.etaisyys,
                            paikka:     paikka,
                            vali:       vali,
                            sijainti:   {[alueText]: [sijaintiText]}
                        };
                        return {...yleiset, ...sij};
                    });
                } else if (valittunaAikataulupaikka()) {
                    return e1.ratakmsijainnit.map(rkm => ({ ratanumero: rkm.ratanumero, alku: rkm, loppu: rkm }))
                                             .map(aikataulupaikkavali)
                                             .filter(x => x.length > 0)
                                             .map(apv => {
                                                let sij = {
                                                    alkuY:    Math.abs(apv[0]-0.01),
                                                    loppuY:   apv[1]+0.01,
                                                    paikka:   paikka,
                                                    vali:     vali,
                                                    sijainti: {[alueText]: [sijaintiText]}
                                                };
                                                return {...yleiset, ...sij};
                                             });
                }
            } else {
                throw new "waat?";
            }
        });
    }
}; 


let groupRumaFeatures = features => {
    let grouped = {};
    features.forEach(f => {
        let props = f.getProperties();
        if (grouped[props.id || props.notificationId]) {
            grouped[props.id || props.notificationId].push(f);
        } else {
            grouped[props.id || props.notificationId] = [f];
        }
    });
    return Object.values(grouped).map(x => {
        let main = x.find(y => y.getProperties().id);
        let parts = x.filter(y => !y.getProperties().id);
        if (parts.length > 0) {
            let allGeoms = [main.getGeometry()].concat(parts.map(p => p.getGeometry()));
            main.setGeometry(new ol.geom.GeometryCollection(allGeoms));
        }
        return main;
    });
};
