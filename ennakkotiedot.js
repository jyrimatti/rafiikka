let ennakkotietoIntervalComparator = (ennakkotietoA,ennakkotietoB) => {
    return ennakkotietoA.alkuX  < ennakkotietoB.alkuX  ? -1 : ennakkotietoA.alkuX  > ennakkotietoB.alkuX  ? 1 :
            ennakkotietoA.loppuX < ennakkotietoB.loppuX ? -1 : ennakkotietoA.loppuX > ennakkotietoB.loppuX ? 1 :
            0;
};

let ajankohtaAikavaleiksi = ajankohta => {
    if (ajankohta.yhtajaksoinen) {
        let ret = ajankohta.yhtajaksoinen.split("/").map(x => new Date(x));
        return ret[0] < rajat[1] && rajat[0] < ret[1]
              ? [ret.map(function(x) { return x < rajat[0] ? rajat[0] : x > rajat[1] ? rajat[1] : x })]
              : [];
    } else {
        let ensimmainenAloitusPaiva = new Date(ajankohta.toistuva.ensimmainenAloitusPaiva); // "2019-10-29"
        let viimeinenAloitusPaiva   = new Date(ajankohta.toistuva.viimeinenAloitusPaiva);   // "2020-05-29"
        let aloitusViikot           = ajankohta.toistuva.aloitusViikot;                     // viikottain|jokatoinen|jokaneljäs
        let aloitusViikonpaivat     = ajankohta.toistuva.aloitusViikonpaivat;               // [ma|ti|ke|to|pe|la|su]
        let timezone                = ajankohta.toistuva.timezone;                          // "Europe/Helsinki"
        let aloitusaika             = ajankohta.toistuva.aloitusaika;                       // "06:00:00"
        let kesto                   = dateFns.durationFns.parse(ajankohta.toistuva.kesto);  // "PT43200S";
        
        let kelpaaViikonPerusteella = paiva => {
            if (aloitusViikot == 'viikottain') {
                return true;
            } else if (aloitusViikot == 'jokatoinen') {
                return (dateFns.dateFns.differenceInCalendarISOWeeks(paiva, ensimmainenAloitusPaiva)) % 2 == 0;
            } else if (aloitusViikot == 'jokaneljas') {
                return (dateFns.dateFns.differenceInCalendarISOWeeks(paiva, ensimmainenAloitusPaiva)) % 4 == 0;
            } else {
                throw 'Virheellinen aloitusViikot: ' + aloitusViikot;
            }
        };

        let ma = aloitusViikonpaivat.includes('ma');
        let ti = aloitusViikonpaivat.includes('ti');
        let ke = aloitusViikonpaivat.includes('ke');
        let to = aloitusViikonpaivat.includes('to');
        let pe = aloitusViikonpaivat.includes('pe');
        let la = aloitusViikonpaivat.includes('la');
        let su = aloitusViikonpaivat.includes('su');
        let kelpaaViikonpaivanPerusteella = paiva => {
            return ma && dateFns.dateFns.isMonday(paiva) ||
                   ti && dateFns.dateFns.isTuesday(paiva) ||
                   ke && dateFns.dateFns.isWednesday(paiva) ||
                   to && dateFns.dateFns.isThursday(paiva) ||
                   pe && dateFns.dateFns.isFriday(paiva) ||
                   la && dateFns.dateFns.isSaturday(paiva) ||
                   su && dateFns.dateFns.isSunday(paiva);
        };

        let aloitusPaivat = dateFns.dateFns.eachDayOfInterval({ start: ensimmainenAloitusPaiva, end: viimeinenAloitusPaiva})
                                           .filter(x => x >= rajat[0] && x <= rajat[1])
                                           .filter(kelpaaViikonPerusteella)
                                           .filter(kelpaaViikonpaivanPerusteella);

        return aloitusPaivat.map(paiva => {
            let alku = dateFns.dateFnsTz.toDate(dateFns.dateFns.format(paiva, 'yyyy-MM-dd') + 'T' + aloitusaika, { timeZone: timezone });
            return [alku, dateFns.dateFns.add(alku, kesto)];
        });
    }
};

let muotoileAikavali = vali => vali.split("/")
                                   .map(d => dateFns.dateFns.format(new Date(d), "dd.MM.yyyy HH:mm:ss"))
                                   .join(" - ");

let muotoileKohde = kohde => kohde.laskennallisetRatakmvalit.map(muotoileRkmv)
                                                            .join("\n");

let ennakkotiedonKohteet = ennakkotieto =>
    [ennakkotieto.liikennevaikutusalue ||              // ei:n lva
     ennakkotieto.kohde ||                             // vs:n kohde
     ennakkotieto.tyonosat.flatMap(y => y.tekopaikka)] // es:n tekopaikat
    .flat(); 

let luoEnnakkotieto = (ennakkotieto, aikavali) => rkmvTaiAikataulupaikat => {
    let yhteiset = {
        tunniste:         ennakkotieto.tunniste,
        sisainenTunniste: ennakkotieto.sisainenTunniste,
        alkuX:            aikavali[0],
        loppuX:           aikavali[1],
        voimassa:         muotoileAikavali(ennakkotieto.voimassa)
    };

    if (valittunaRatanumero()) {
        let alkuRkm  = rkmvTaiAikataulupaikat.alku.ratakm*1000  + rkmvTaiAikataulupaikat.alku.etaisyys;
        let loppuRkm = rkmvTaiAikataulupaikat.loppu.ratakm*1000 + rkmvTaiAikataulupaikat.loppu.etaisyys;
        yAxisMin = ratanumerotDS.data[valittuDS.data][0];
        yAxisMax = ratanumerotDS.data[valittuDS.data][1];
        let ratakmvalille = {
            alkuY:    Math.max(alkuRkm, yAxisMin),
            loppuY:   Math.min(loppuRkm, yAxisMax),
            sijainti: muotoileRkmv(rkmvTaiAikataulupaikat),
            zIndex:   -1 * (loppuRkm - alkuRkm) * (aikavali[1].getTime() - aikavali[0].getTime())
        };
        return {...yhteiset, ...ratakmvalille};
    } else if (valittunaAikataulupaikka()) {
        let lp  = ennakkotiedonKohteet(ennakkotieto).flatMap(x => x.laskennallisetLiikennepaikat);
        let lpv = ennakkotiedonKohteet(ennakkotieto).flatMap(x => x.laskennallisetLiikennepaikkavalit);
        let aikataulupaikoille = {
            alkuY:    rkmvTaiAikataulupaikat[0],
            loppuY:   rkmvTaiAikataulupaikat[rkmvTaiAikataulupaikat.length-1],
            sijainti: lp.map(y => !rautatieliikennepaikatDS.data[y] ? '?' : rautatieliikennepaikatDS.data[y].lyhenne).join(", ") + "\n" +
                        lpv.map(y => !liikennepaikkavalitDS.data[y] ? '?' :
                                    rautatieliikennepaikatDS.data[liikennepaikkavalitDS.data[y].alkuliikennepaikka].lyhenne + "-" +
                                    rautatieliikennepaikatDS.data[liikennepaikkavalitDS.data[y].loppuliikennepaikka].lyhenne).join(", "),
            zIndex:   -1 * (aikavali[1].getTime() - aikavali[0].getTime())
        };
        return {...yhteiset, ...aikataulupaikoille};
    }
};

let parsiEI = ei => {
    let kohteet = ennakkotiedonKohteet(ei);
    return ei.ajankohdat.flatMap(ajankohtaAikavaleiksi)
                        .flatMap(xs => {
        if (valittunaRatanumero()) {
            return kohteet.flatMap(x => x.laskennallisetRatakmvalit).filter(x => x.ratanumero == valittuDS.data)
                                                                    .map(luoEnnakkotieto(ei, xs));
        } else if (valittunaAikataulupaikka()) {
            let lpv = kohteet.flatMap(x => x.laskennallisetLiikennepaikkavalit).flatMap(x => {
                let vali = liikennepaikkavalitDS.data[x];
                if (!vali) {
                    log("Tuntematon liikennepaikkaväli EI:n", ei.sisainenTunniste, "liikennevaikutusalueessa");
                    return [];
                }
                return [vali.alkuliikennepaikka, vali.loppuliikennepaikka];
            });
            let lp = kohteet.flatMap(x => x.laskennallisetLiikennepaikat);
            
            return aikataulupaikkaUlottumat(lp, lpv).map(luoEnnakkotieto(ei, xs));
        };
    });
};

let parsiLO = lo => {
    let xs = [lo.ensimmainenAktiivisuusaika, lo.viimeinenAktiivisuusaika].map(d => new Date(d).getTime());
    // TODO: aikataulupaikka
    return lo.kohde.laskennallisetRatakmvalit.filter(x => x.ratanumero == valittuDS.data)
                                                .map(luoEnnakkotieto(lo, xs));
};

let parsiES = es =>
    es.tyonosat.flatMap(to =>
        to.ajankohdat.flatMap(ajankohtaAikavaleiksi)
                        .flatMap(xs => {
            if (valittunaRatanumero()) {
                return to.tekopaikka.laskennallisetRatakmvalit.filter(x => x.ratanumero == valittuDS.data)
                                                                .map(luoEnnakkotieto(es, xs));
            } else if (valittunaAikataulupaikka()) {
                let lpv = to.tekopaikka.laskennallisetLiikennepaikkavalit.flatMap(x => {
                    let vali = liikennepaikkavalitDS.data[x];
                    if (!vali) {
                        log("Tuntematon liikennepaikkaväli ES:n", es.sisainenTunniste, "liikennevaikutusalueessa");
                        return [];
                    }
                    return [vali.alkuliikennepaikka, vali.loppuliikennepaikka];
                });
                let lp = to.tekopaikka.laskennallisetLiikennepaikat;
                
                return aikataulupaikkaUlottumat(lp, lpv).map(luoEnnakkotieto(es, xs));
            }
        }));

let parsiVS = vs =>
    vs.ajankohdat.flatMap(ajankohtaAikavaleiksi)
                    .flatMap(xs => {
        if (valittunaRatanumero()) {
            return vs.kohde.laskennallisetRatakmvalit.filter(x => x.ratanumero == valittuDS.data)
                                                        .map(luoEnnakkotieto(vs, xs));
        } else if (valittunaAikataulupaikka()) {
            let lpv = vs.kohde.laskennallisetLiikennepaikkavalit.flatMap(x => {
                let vali = liikennepaikkavalitDS.data[x];
                if (!vali) {
                    log("Tuntematon liikennepaikkaväli VS:n", vs.sisainenTunniste, "liikennevaikutusalueessa");
                    return [];
                }
                return [vali.alkuliikennepaikka, vali.loppuliikennepaikka];
            });
            let lp = vs.kohde.laskennallisetLiikennepaikat;
            
            return aikataulupaikkaUlottumat(lp, lpv).map(luoEnnakkotieto(vs, xs));
        }
    });