
setTimeout(() => {
    var estyypit = [];
    getJson(esTyypitUrl(), data => {
        estyypit = Object.values(data);
    });
    var asiat = [];
    getJson(asiatUrl(), data => {
        asiat = data.map(d => d.asia);
    });
}, 100);

let ennakkotietoIntervalComparator = (ennakkotietoA, ennakkotietoB) => {
    return ennakkotietoA.alkuX  < ennakkotietoB.alkuX  ? -1 : ennakkotietoA.alkuX  > ennakkotietoB.alkuX  ? 1 :
           ennakkotietoA.loppuX < ennakkotietoB.loppuX ? -1 : ennakkotietoA.loppuX > ennakkotietoB.loppuX ? 1 :
           0;
};

let ajankohtaAikavaleiksi = ajankohta => {
    if (ajankohta.yhtajaksoinen) {
        let ret = ajankohta.yhtajaksoinen.split("/").map(x => new Date(x));
        return ret[0] < rajat()[1] && rajat()[0] < ret[1]
              ? [ret.map(x => x < rajat()[0] ? rajat()[0] : x > rajat()[1] ? rajat()[1] : x)]
              : [];
    } else {
        let aloitusViikot           = ajankohta.toistuva.aloitusViikot;                     // viikottain|jokatoinen|jokaneljäs
        let aloitusViikonpaivat     = ajankohta.toistuva.aloitusViikonpaivat;               // [ma|ti|ke|to|pe|la|su]
        let timezone                = ajankohta.toistuva.timezone;                          // "Europe/Helsinki"
        let ensimmainenAloitusPaiva = dateFns.dateFnsTz.toDate(ajankohta.toistuva.ensimmainenAloitusPaiva, { timeZone: timezone }); // "2019-10-29"
        let viimeinenAloitusPaiva   = dateFns.dateFnsTz.toDate(ajankohta.toistuva.viimeinenAloitusPaiva,   { timeZone: timezone }); // "2020-05-29"
        let aloitusaika             = ajankohta.toistuva.aloitusaika;                       // "06:00:00"
        let kesto                   = dateFns.durationFns.parse(ajankohta.toistuva.kesto);  // "PT43200S";
        
        let viimeinenAlkuaika = dateFns.dateFnsTz.toDate(ajankohta.toistuva.viimeinenAloitusPaiva + 'T' + aloitusaika, { timeZone: timezone });
        let ajankohdanRajat = { start: ensimmainenAloitusPaiva, end: dateFns.dateFns.add(viimeinenAlkuaika, kesto)};
        if (!dateFns.dateFns.areIntervalsOverlapping(ajankohdanRajat, { start: rajat()[0], end: rajat()[1] })) {
            return [];
        }

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

        let interval = { start: dateFns.dateFns.max([ensimmainenAloitusPaiva, dateFns.dateFns.addDays(dateFns.dateFns.startOfDay(rajat()[0]), -1)]),
                         end:   dateFns.dateFns.min([viimeinenAloitusPaiva,   dateFns.dateFns.addDays(dateFns.dateFns.startOfDay(rajat()[1]),  1)])};
        let aloitusPaivat = dateFns.dateFns.eachDayOfInterval(interval)
                                           .filter(kelpaaViikonPerusteella)
                                           .filter(kelpaaViikonpaivanPerusteella);
        return aloitusPaivat.map(paiva => {
            let alku = dateFns.dateFnsTz.toDate(dateFns.dateFns.format(paiva, 'yyyy-MM-dd') + 'T' + aloitusaika, { timeZone: timezone });
            return [alku, dateFns.dateFns.add(alku, kesto)];
        });
    }
};

let muotoileAjanhetki = hetki => dateFns.dateFns.format(dateFns.dateFnsTz.utcToZonedTime(hetki, 'Europe/Helsinki'), "yyyy-MM-dd HH:mm");

let muotoileAikavali = vali => {
    let dates = vali.split("/").map(d => new Date(d));
    let ds = dates.map(d => dateFns.dateFnsTz.utcToZonedTime(d, 'Europe/Helsinki'));
    let format = 
        ds[0].getSeconds() + ds[0].getMinutes() + ds[0].getHours() + ds[0].getMonth() == 0 && ds[0].getDate() == 1 &&
        ds[1].getSeconds() == 0 && ds[1].getMinutes() == 59 && ds[1].getHours() == 23 && ds[1].getDate() == 31 && ds[1].getMonth() == 11
            ? "yyyy" :
        ds[0].getSeconds() + ds[0].getMinutes() + ds[0].getHours() == 0 &&
        ds[1].getSeconds() == 0 && ds[1].getMinutes() == 59 && ds[1].getHours() == 23
            ? "yyyy-MM-dd" :
              "yyyy-MM-dd HH:mm";
    let formatted = dates.map(d => dateFns.dateFns.format(d, format));
    return formatted[0] == formatted[1] ? formatted[0] : formatted.join(" - ");
};

let luoEnnakkotieto = (ennakkotieto, aikavali) => rkmv => {
    let alkuRkm  = rkmv.alku.ratakm*1000  + rkmv.alku.etaisyys;
    let loppuRkm = rkmv.loppu.ratakm*1000 + rkmv.loppu.etaisyys;
    let yhteiset = {
        tunniste:         ennakkotieto.tunniste,
        sisainenTunniste: ennakkotieto.sisainenTunniste,
        alkuX:            aikavali[0],
        loppuX:           aikavali[1],
        voimassa:         muotoileAikavali(ennakkotieto.voimassa),
        ratakmvali:       rkmv,
        zIndex:           -1 * (loppuRkm - alkuRkm) - 0.001*(aikavali[1].getTime() - aikavali[0].getTime())
    };

    let ratanumero = valittunaRatanumero();
    if (ratanumero) {
        if (rkmv.ratanumero != ratanumero) {
            return [];
        }
        yAxisMin = ratanumerotDS.data[ratanumero].alku.ratakm*1000 + atanumerotDS.data[ratanumero].alku.etaisyys;
        yAxisMax = ratanumerotDS.data[ratanumero].loppu.ratakm*1000 + atanumerotDS.data[ratanumero].loppu.etaisyys;
        let ratakmvalille = {
            alkuY:    Math.max(alkuRkm, yAxisMin),
            loppuY:   Math.min(loppuRkm, yAxisMax),
            sijainti: muotoileRkmv(rkmv)
        };
        return [{...yhteiset, ...ratakmvalille}];
    } else if (valittunaAikataulupaikka()) {
        let vali = aikataulupaikkavali(rkmv)
        if (vali.length == 0) {
            return [];
        }
        let aikataulupaikoille = {
            alkuY:             vali[0],
            loppuY:            vali[1],
            vaatiiTarkennusta: rkmv,
            sijainti:          muotoileRkmv(rkmv)
        };
        return [{...yhteiset, ...aikataulupaikoille}];
    }
};

let parsiEI = ei => {
    return ei.ajankohdat.flatMap(ajankohtaAikavaleiksi)
                        .flatMap(xs => joinRatakmvalit(ei.liikennevaikutusalue.laskennallisetRatakmvalit).flatMap(luoEnnakkotieto(ei, xs)))
                        .map(fixPoints);
};

let parsiLO = lo => {
    let xs = [lo.ensimmainenAktiivisuusaika, lo.viimeinenAktiivisuusaika].map(d => new Date(d).getTime());
    return joinRatakmvalit(lo.kohde.laskennallisetRatakmvalit).flatMap(luoEnnakkotieto(lo, xs))
                                                              .map(fixPoints);
};

let parsiES = es =>
    es.tyonosat.flatMap(to => to.ajankohdat.flatMap(ajankohtaAikavaleiksi)
                                           .flatMap(xs => joinRatakmvalit(to.tekopaikka.laskennallisetRatakmvalit).flatMap(luoEnnakkotieto(es, xs))))
               .map(fixPoints);

let parsiVS = vs =>
    vs.ajankohdat.flatMap(ajankohtaAikavaleiksi)
                 .flatMap(xs => joinRatakmvalit(vs.kohde.laskennallisetRatakmvalit).flatMap(luoEnnakkotieto(vs, xs)))
                 .map(fixPoints);

let jetiKohdePrefix = tunniste =>
    onkoEI(tunniste) ? 'liikennevaikutusalue' :
    onkoES(tunniste) ? 'tyonosat.tekopaikka' :
    onkoVS(tunniste) ? 'kohde'
                     : undefined;

let haeEnnakkotiedonRatanumerotJaVoimassaolo = (tunniste, callback) => {
    getJson(luoEtj2APIUrl(tunniste), data => {
        // valitaan pisin ratakmväli
        let kohde = onkoEI(tunniste) ? data.liikennevaikutusalue :
                    onkoES(tunniste) ? data.tyonosat[0].tekopaikka :
                    onkoVS(tunniste) ? data.kohde :
                    undefined;
        let ratanumero = kohde.laskennallisetRatakmvalit.sort( (a,b) => ratakmvalinPituus(b) - ratakmvalinPituus(a))[0].ratanumero;
        let voimassa = (data.voimassa || data.ensimmainenAktiivisuusaika + '/' + data.viimeinenAktiivisuusaika).split('/').map(x => new Date(x));
        callback(ratanumero, voimassa, data.tunniste, data.sisainenTunniste);
    });
};