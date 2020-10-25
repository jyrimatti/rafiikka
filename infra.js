let ratakmsijaintiComparator = (a,b) => {
    if (a.ratanumero < b.ratanumero) {
        return -1;
    } else if (a.ratanumero > b.ratanumero) {
        return 1;
    } else if (a.ratakm*10000+a.etaisyys < b.ratakm*10000+b.etaisyys) {
        return -1;
    } else if (a.ratakm*10000+a.etaisyys > b.ratakm*10000+b.etaisyys) {
        return 1;
    }
    return 0;
};
let valissa = (ratakmsijainti,vali) => [vali[0],ratakmsijainti,vali[1]].sort(ratakmsijaintiComparator) == [vali[0],ratakmsijainti,vali[1]];

let ratakmvaliComparator = (a,b) => {
    if (a.ratanumero < b.ratanumero) {
        return -1;
    } else if (a.ratanumero > b.ratanumero) {
        return 1;
    } else if (a.alku.ratakm*10000+a.alku.etaisyys < b.alku.ratakm*10000+b.alku.etaisyys) {
        return -1;
    } else if (a.alku.ratakm*10000+a.alku.etaisyys > b.alku.ratakm*10000+b.alku.etaisyys) {
        return 1;
    } else if (a.loppu.ratakm*10000+a.loppu.etaisyys < b.loppu.ratakm*10000+b.loppu.etaisyys) {
        return -1;
    } else if (a.loppu.ratakm*10000+a.loppu.etaisyys > b.loppu.ratakm*10000+b.loppu.etaisyys) {
        return 1;
    }
    return 0;
};

let joinRatakmvalit = rkmvs => rkmvs.sort(ratakmvaliComparator)
                                    .reduce( (prev, cur) => {
    if (prev.length == 0) {
        return [cur];
    }
    let last = prev[prev.length-1];
    if (last.ratanumero == cur.ratanumero && ratakmsijaintiComparator(last.loppu, cur.alku) >= 0) {
        return prev.slice(0, -1).concat([{
            ratanumero: last.ratanumero,
            alku: {
                ratakm:   last.alku.ratakm,
                etaisyys: last.alku.etaisyys
            },
            loppu: {
                ratakm:   Math.max(last.loppu.ratakm, cur.loppu.ratakm),
                etaisyys: ratakmsijaintiComparator(last.loppu, cur.loppu) > 0 ? last.loppu.etaisyys : cur.loppu.etaisyys
            }
        }]);
    }
    return prev.concat([cur]);
}, []);

let muotoileEtaisyys = x => (x < 10 ? "000" : x < 100 ? "00" : x < 1000 ? "0" : "") + x;
let muotoileRkmv = x => '(' + x.ratanumero + ') ' + x.alku.ratakm  + '+' + muotoileEtaisyys(x.alku.etaisyys) + " - "
                                                  + x.loppu.ratakm + "+" + muotoileEtaisyys(x.loppu.etaisyys);

let leikkaa = a => b => a.ratanumero == b.ratanumero &&
                        ratakmsijaintiComparator(a.alku, b.loppu) <= 0 &&
                        ratakmsijaintiComparator(b.alku, a.loppu) <= 0;

let aikataulupaikkavali = rkmv => {
    let valitutAikataulupaikat = valittuDS.data.map(uic => aikataulupaikatDS.data[uic]);
    let leikkaavienAikataulupaikkojenRatakmvalit = valitutAikataulupaikat.map(x => x.ratakmvalit.filter(leikkaa(rkmv)));

    let leikkaavatAikataulupaikkojenIndeksit = leikkaavienAikataulupaikkojenRatakmvalit
        .map( (x,index) => x.length == 0 ? undefined : index )
        .filter(x => x != undefined);

    let valit = (ap1, ap2) => {
        let ap1ratanumerot = ap1.ratakmSijainnit.map(x => x.ratanumero);
        let ap2ratanumerot = ap2.ratakmSijainnit.map(x => x.ratanumero);
        let yhteisetRatanumerot = ap1ratanumerot.filter(x => ap2ratanumerot.includes(x));
        
        if (yhteisetRatanumerot.length == 0) {
            throw new Error("Ei yhteisiä ratanumeroita, mikä meni vikaan?!?");
        }

        return yhteisetRatanumerot.map(ratanumero => {
            let ap1v = ap1.ratakmSijainnit.find(x => x.ratanumero == ratanumero);
            let ap2v = ap2.ratakmSijainnit.find(x => x.ratanumero == ratanumero);
            if (ap1v.ratakm < ap2v.ratakm || ap1v.ratakm == ap2v.ratakm && ap1v.etaisyys < ap2v.etaisyys) {
                return { ratanumero: ratanumero, alku: ap1v, loppu: ap2v };
            } else {
                return { ratanumero: ratanumero, alku: ap2v, loppu: ap1v };
            }
        });
    };

    let suhteellinenSijaintiValilla = rkm => rkmv => {
        let ret = suhteellinenSijaintiValilla_(rkm)(rkmv);
        return ret < 0 ? 0 : ret > 1 ? 1 : ret;
    };
    let suhteellinenSijaintiValilla_ = rkm => rkmv =>
        ( (rkm.ratakm*10000+rkm.etaisyys) - (rkmv.alku.ratakm*10000+rkmv.alku.etaisyys)) /
        ( (rkmv.loppu.ratakm*10000+rkmv.loppu.etaisyys) - (rkmv.alku.ratakm*10000+rkmv.alku.etaisyys));

    let aikataulupaikkojenValit = valitutAikataulupaikat
        .map( (_,i) => i == valitutAikataulupaikat.length-1 ? [] : valit(valitutAikataulupaikat[i], valitutAikataulupaikat[i+1]) );
    let leikkaavatAikataulupaikkavalienRatakmvalit = aikataulupaikkojenValit.map(x => x.filter(leikkaa(rkmv)));
    let leikkaavatAikataulupaikkavalienIndeksit = leikkaavatAikataulupaikkavalienRatakmvalit
        .flatMap( (x,index) => {
            if (x.length == 0) {
                return undefined;
            } else if (x.length > 1) {
                throw "Hmm, miksi näin?";
            }
            let a = suhteellinenSijaintiValilla(rkmv.alku)(x[0]);
            let b = suhteellinenSijaintiValilla(rkmv.loppu)(x[0]);

            return [index + Math.min(a,b), index + Math.max(a,b)];
        })
        .filter(x => x != undefined);

    let indeksit = leikkaavatAikataulupaikkojenIndeksit.concat(leikkaavatAikataulupaikkavalienIndeksit).sort();
    if (indeksit.length == 0) {
        return [];
    }
    return [indeksit[0], indeksit[indeksit.length-1]];
}

window.koordinaatitMap = {};
let lataaKoordinaatit = ratakmsijainti => {
    let koordinaatitDS = new am4core.DataSource();
    initDS(koordinaatitDS);
    koordinaatitDS.url = koordinaattiMuunnosUrl(ratakmsijainti.ratanumero, ratakmsijainti.ratakm, ratakmsijainti.etaisyys);
    on(koordinaatitDS.events, "done", ev => {
        if (ev.target.data.features.length > 0) {
            let jstsCoord = geojsonReader.read(ev.target.data.features[0].geometry);
            let centroid = jstsCoord.getCentroid();
            log("Saatiin ratakmsijainnille", ratakmsijainti, "koordinaatit", jstsCoord.getCoordinates(), "joille keskipisteeksi", centroid.getCoordinates());
            koordinaatitMap[ratakmsijainti] = centroid;
        } else {
            log("Ei saatu koordinaatteja ratakmsijainnille", ratakmsijainti);
        }
        setTimeout(() => ev.target.dispose(), 1000);
    });
    koordinaatitDS.load();
    return undefined;
};

window.sijainnitMap = {};
let lataaSijainti = coord => {
    let sijaintiDS = new am4core.DataSource();
    initDS(sijaintiDS);
    sijaintiDS.url = ratakmMuunnosUrl(coord.join(","));
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
    return undefined;
};

let koordinaatti2sijainti = koordinaatti => {
    if (valittunaAikataulupaikka()) {
        let coord = buildGeometry(koordinaatti);

        let sisaltyva = valittuDS.data.flatMap( (x,index) => {
            let paikka = aikataulupaikatDS.data[x];
            if (paikka.geometria.getGeometryType() != 'Point') {
                let mbc = new jsts.algorithm.MinimumBoundingCircle(paikka.geometria);
                if (mbc.getCircle().contains(coord)) {
                    return [index];
                }
            }
            return [];
        });
        if (sisaltyva.length > 0) {
            return sisaltyva[0];
        }

        let alueet = valittuDS.data.slice(1).map( (_,edellinenIndex) => {
            let edellinenUicKoodi = valittuDS.data[edellinenIndex];
            let seuraavaUicKoodi = valittuDS.data[edellinenIndex+1];
            let geomList = javascript.util.Arrays.asList([aikataulupaikatDS.data[edellinenUicKoodi].geometria, aikataulupaikatDS.data[seuraavaUicKoodi].geometria]);
            let mbc = new jsts.algorithm.MinimumBoundingCircle(geometryFactory.buildGeometry(geomList));
            return [edellinenUicKoodi, seuraavaUicKoodi, mbc.getCircle()];
        });
        let sijainti = alueet.filter(a => a[2].contains(coord)).map(a => {
            let edellinen = aikataulupaikatDS.data[a[0]];
            let seuraava = aikataulupaikatDS.data[a[1]];
            let suht = edellinen.geometria.distance(coord) / edellinen.geometria.distance(seuraava.geometria);
            return valittuDS.data.indexOf(edellinen.uicKoodi) + suht;
        }).find(_ => true);
        return sijainti;
    } else if (valittunaRatanumero()) {
        let cachetettu = sijainnitMap[koordinaatti.coordinates];
        if (cachetettu) {
            let ratakmsijainti = cachetettu.find(r => r.ratanumero == valittuDS.data);
            if (ratakmsijainti) {
                return ratakmsijainti.ratakm*1000+ratakmsijainti.etaisyys;
            }
        }
    }
    return undefined;
};

let resolveMask = (kmvali, voimassa, callback) => {
    // haetaan rajausta vastaava geometria
    var valiTaiSijainti = kmvali.alku.ratakm == kmvali.loppu.ratakm && kmvali.alku.etaisyys == kmvali.loppu.etaisyys
            ? 'radat/' + kmvali.ratanumero + '/' + kmvali.alku.ratakm + '+' + kmvali.alku.etaisyys
            : 'radat/' + kmvali.ratanumero + '/' + kmvali.alku.ratakm + '+' + kmvali.alku.etaisyys + '-' + kmvali.loppu.ratakm + '+' + kmvali.loppu.etaisyys;
    let url = infraAPIUrl + valiTaiSijainti + '.geojson?propertyName=geometria&time=' + voimassa;
    fetch(url, {
        method: 'GET'/*,
        headers: {'Digitraffic-User': 'Rafiikka'}*/
    }).then(response => response.json())
      .then(response => {
        let mask = format.readFeatures(response);
        var virheelliset = [];
        var unionMask;
        mask.forEach(feature => {
            var geom = feature.getGeometry();
            if (geom) {
                // paksunnetaan rajausgeometriaa hieman (puoli metriä lienee fine)
                var jstsGeom = olParser.read(geom)
                var buffered = jstsGeom.buffer(0.5, 8, 2 /* flat */);
                if (buffered.isEmpty()) {
                    virheelliset.push(jstsGeom);
                } else if (!unionMask) {
                    unionMask = buffered;
                } else {
                    try {
                        unionMask = unionMask.union(buffered);
                    } catch (e) {
                        virheelliset.push(jstsGeom);
                    }
                }
            } else {
                log('Hmm, geometry was null for:', url);
            }
        });
        
        // Hoidetaan default-end-cap-stylellä loput geometriat
        virheelliset.forEach(jstsGeom => {
            var buffered = jstsGeom.buffer(0.5, 8, 1 /* round */);
            if (!unionMask) {
                unionMask = buffered;
            } else {
                unionMask = unionMask.union(buffered);
            }
        });
        
        callback(unionMask);
      })
      .catch(errorHandler);
}