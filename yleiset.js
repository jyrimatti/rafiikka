
window.onkoSeed = () => window.location.hash == "#seed" || window.location.hash.endsWith("&seed")

let toISOStringNoMillis = (d) => {
    let pad = n => n < 10 ? '0' + n : n;
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z';
};

let hashPlaceholder = '&loading...';

window.addEventListener('hashchange', e => {
    if (e.newURL.indexOf(hashPlaceholder) > -1 || e.oldURL === e.newURL + hashPlaceholder) {
        window.location.hash = window.location.hash.replace(hashPlaceholder, '');
        e.stopImmediatePropagation();
    }
  }, false);



window.log = (msg1, msg2, msg3, msg4, msg5, msg6) => {
    if (console && console.log) {
        console.log(dateFns.dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS'), "      :",
                    msg1 == undefined ? '' : msg1,
                    msg2 == undefined ? '' : msg2,
                    msg3 == undefined ? '' : msg3,
                    msg4 == undefined ? '' : msg4,
                    msg5 == undefined ? '' : msg5,
                    msg6 == undefined ? '' : msg6);
    }
};

let logDiff = (msg1, msg2, msg3, msg4, msg5, msg6) => {
    let started = new Date();
    let lastGiven = [msg1, msg2, msg3, msg4, msg5, msg6].reverse().find(x => x !== undefined);
    let ret = lastGiven();
    if (console && console.log) {
        let ended = new Date();
        let dur = (ended.getTime() - started.getTime());
        console.log(dateFns.dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS'),
                    '(' + ' '.repeat(Math.max(0, 2 - (dur+'').length)) + dur + 'ms):',
                    msg1 instanceof Function || msg1 == undefined ? '' : msg1,
                    msg2 instanceof Function || msg2 == undefined ? '' : msg2,
                    msg3 instanceof Function || msg3 == undefined ? '' : msg3,
                    msg4 instanceof Function || msg4 == undefined ? '' : msg4,
                    msg5 instanceof Function || msg5 == undefined ? '' : msg5,
                    msg6 instanceof Function || msg6 == undefined ? '' : msg6);
    }
    return ret;
};

window.ikkuna = () => getMainState().aika;
window.rajat  = () => laajennaAikavali(getMainState().aika.slice(0, 2)); //[dateFns.dateFns.addDays(ikkuna()[0], -3), dateFns.dateFns.addDays(ikkuna()[1], 3)];

window.revisions = {
    infra: '',
    etj2: ''
};

let loggingDelegate = f => (a, b, c) => {
    try {
        return f(a, b, c);
    } catch (e) {
        errorHandler(e);
        throw e;
    }
};

window.progress = document.getElementById('progress');

let fetchJson = (url, opts, callback, errorCallback) => {
    let type = url.replace(/[?].*/,'')
                  .replace(/[.][^/]+$/, '')
                  .replace(/.*\/([^\/]+)$/, '$1');
    //progressStart(type);
    return fetch(url, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            'Digitraffic-User': 'Rafiikka'
        }
    }).then(response => opts.method == 'HEAD' ? response.text() : response.json())
      .then(x => {
          //progressEnd(type);
          return callback(x);
       })
      .catch(x => {
          //progressEnd(type);
          return (errorCallback || errorHandler)(x);
       });
}

window.GET  = (url, signal, errorCallback, callback, _) => onkoSeed() ? null : fetchJson(url, signal ? {method: 'GET', signal: signal} : {method: 'GET'}             , callback, errorCallback);
window.HEAD = (url, signal, errorCallback, callback, _) =>                   fetchJson(url, signal ? {method: 'HEAD', signal: signal} : {method: 'HEAD'}            , callback, errorCallback);
window.POST = (url, signal, errorCallback, callback, body) => onkoSeed() ? null : fetchJson(url, signal ? {method: 'POST', signal: signal, body: body} : {method: 'POST', body: body}, callback, errorCallback);

if (onkoSeed()) {
    let seed = urls => {
        if (urls.length > 0) {
            log("seedataan", urls[0]);
            headJson(urls[0], () => seed(urls.slice(1)), undefined, () => seed(urls.slice(1)));
        } else {
            log("seedattu");
        }
    };

    seed([]
     .concat([ratanumerotUrl(), liikennepaikkavalitUrl(), rautatieliikennepaikatUrl(), liikennepaikanOsatUrl(), raideosuudetUrl(), laituritUrl(),
              elementitUrl(), lorajatUrl(), infraObjektityypitUrl(),
              junasijainnitUrl, junasijainnitGeojsonUrl, kunnossapitoalueetMetaUrl(), liikenteenohjausalueetMetaUrl(), kayttokeskuksetMetaUrl(), liikennesuunnittelualueetMetaUrl(),
              ratapihapalveluTyypitUrl(), opastinTyypitUrl(), vaihdeTyypitUrl()])
     .concat(eiTilat.flatMap(tila => [eiUrlRatanumero(tila), eiUrlAikataulupaikka()(tila)]))
     .concat(esTilat.flatMap(tila => [esUrlRatanumero(tila), esUrlAikataulupaikka()(tila)]))
     .concat(vsTilat.flatMap(tila => [vsUrlRatanumero(tila), vsUrlAikataulupaikka()(tila)]))
     .concat(loiTilat.flatMap(tila => [loUrlRatanumero(tila), loUrlAikataulupaikka()(tila)]))
     .concat(hakuUrlitInfra())
     .concat(hakuUrlitEtj2())
     .concat(hakuUrlitRuma())
     .concat(muutoksetInfra(document.getElementById('delta1').value + 'P' + document.getElementById('delta2').value + document.getElementById('delta3').value).flatMap(x => [x.luotuja, x.poistuneita]))
     .concat(muutoksetEtj2(document.getElementById('delta1').value + 'P' + document.getElementById('delta2').value + document.getElementById('delta3').value).flatMap(x => [x.luotuja, x.poistuneita]))
     .concat([asiatUrl(), eiUrlTilasto(), esUrlTilasto(), vsUrlTilasto()])
     .concat([ratapihapalvelutUrlTilasto(), toimialueetUrlTilasto(), tilirataosatUrlTilasto(), liikennesuunnittelualueetUrlTilasto(), paikantamismerkitUrlTilasto(),
            kilometrimerkitUrlTilasto(), radatUrlTilasto(), liikennepaikanOsatUrlTilasto(), rautatieliikennepaikatUrlTilasto(), liikennepaikkavalitUrlTilasto(), raideosuudetUrlTilasto(),
            akselinlaskijaUrlTilasto(), baliisiUrlTilasto(), kuumakayntiilmaisinUrlTilasto(), liikennepaikanrajaUrlTilasto(), opastinUrlTilasto(), puskinUrlTilasto(),
            pyoravoimailmaisinUrlTilasto(), raideeristysUrlTilasto(), pysaytyslaiteUrlTilasto(), rfidlukijaUrlTilasto(), ryhmityseristinUrlTilasto(), 
            sahkoistyspaattyyUrlTilasto(), seislevyUrlTilasto(), vaihdeUrlTilasto(), virroitinvalvontakameraUrlTilasto(), erotusjaksoUrlTilasto(), 
            erotuskenttaUrlTilasto(), maadoitinUrlTilasto(), tyonaikaineneristinUrlTilasto(), kaantopoytaUrlTilasto(), pyoraprofiilimittalaiteUrlTilasto(),
            telivalvontaUrlTilasto(), erotinUrlTilasto(), tasoristeysvalojenpyoratunnistinUrlTilasto(), raiteensulutUrlTilasto(), raiteetUrlTilasto(),
            liikenteenohjauksenrajatUrlTilasto(), tunnelitUrlTilasto(), sillatUrlTilasto(), laituritUrlTilasto(), tasoristeyksetUrlTilasto(), kayttokeskuksetUrlTilasto(), 
            kytkentaryhmatUrlTilasto()]));
};

window.on   = (obj, event, f) => obj.on(event,   loggingDelegate(f));
window.once = (obj, event, f) => obj.once(event, loggingDelegate(f));
window.add  = (obj, name,  f) => obj.add(name,   loggingDelegate(f));

// charts ei piirrä näkyviin laatikoita, jotka ovat 0-mittaisia suuntaan tai toiseen.
let fixPoints = x => {
    if (x.alkuX == x.loppuX) {
        x.loppuX = x.loppuX + 1;
    }
    if (x.alkuY == x.loppuY) {
        x.loppuY = x.loppuY + 1;
    }
    return x;
};

let withoutProp = (obj, unwantedProp) => {
    var ret = {};
    for (var key in obj) {
        if (key !== unwantedProp) {
            ret[key] = obj[key];
        }
    }
    return ret;
};

let customPrettyPrinting = obj => {
    if (obj == null) {
        return null;
    } else if (obj.ratanumero && obj.alku && obj.loppu) {
        var x = '(' + obj.ratanumero + ') ' + obj.alku.ratakm + '+' + obj.alku.etaisyys + ' - ' + obj.loppu.ratakm + '+' + obj.loppu.etaisyys;
        return x + (obj.kohtaamissuunta == 'nouseva' ? ' ↑' : obj.kohtaamissuunta == 'laskeva' ? ' ↓' : (obj.kohtaamissuunta || ''));
    } else if (obj.ratanumero && obj.ratakm && obj.etaisyys) {
        var x = '(' + obj.ratanumero + ') ' + obj.ratakm + '+' + obj.etaisyys;
        return x + (obj.kohtaamissuunta == 'nouseva' ? ' ↑' : obj.kohtaamissuunta == 'laskeva' ? ' ↓' : (obj.kohtaamissuunta || ''));
    } else if (obj.numero && obj.etaisyys && obj.suunta) {
        var x = obj.numero + (obj.suunta == 'n' ? '+' : obj.suunta == 'l' ? '-' : obj.suunta) + obj.etaisyys;
        return x + (obj.kohtaamissuunta == 'nouseva' ? ' ↑' : obj.kohtaamissuunta == 'laskeva' ? ' ↓' : (obj.kohtaamissuunta || ''));
    } else if (typeof obj == 'string' && obj.startsWith('1.2.246.586.')) {
        return obj;
    } else if (typeof obj == 'string') {
        let dur = obj.match(/^(-?)P(\d+)([DWMY])$/);
        if (dur) {
            return (dur[1] == '-' ? 'edelliset ' : 'seuraavat ') + dur[2] + (
                dur[3] == 'D' ? ' päivää' :
                dur[3] == 'W' ? ' viikkoa' :
                dur[3] == 'M' ? ' kuukautta' :
                dur[3] == 'Y' ? ' vuotta' :
                obj);
        }
    }
    return obj;
};

let prettyPrint = obj => {
    if (obj == null) {
        return null;
    } else if (obj instanceof Array && obj.length > 0) {
        return '<span class="array">' + obj.map(prettyPrint).join('<br />') + '</span>';
    } else {
        let r = customPrettyPrinting(obj);
        if (typeof r == 'object') {
            r = Object.keys(obj)
                      .filter(x => obj.hasOwnProperty(x))
                      .map(key => {
                let val = obj[key];
                if (val instanceof Array && val.length === 0) {
                    // skip empty arrays
                    return '';
                } else {
                    return `<tr><th>${key}</th><td>${prettyPrint(val)}</td></tr>`;
                }
            }).join('');
            r = r === '' ? '' : '<table>' + r + '</table>';
        }
        return r;
    }
};

let escapeRegex = str => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

let splitString = str => {
    let m = str.match(/"[^"]+"|[^ ]+/g);
    return m ? m.map(x => x.replace(/^"|"$/g, '')) : [];
}

let luoInfoLinkki = (tunniste, time, peek) => onkoInfra(tunniste) || onkoJeti(tunniste) || onkoRatanumero(tunniste) || onkoJuna(tunniste) || onkoRuma(tunniste) ? `
    <li>
        <a href=""
           title='Avaa tietoja'
           class='infoikoni'
           onclick='avaaInfo("${tunniste}", event.pageX, event.pageY, ${time ? '"' + toISOStringNoMillis(time[0]) + '/' + toISOStringNoMillis(time[1]) + '"' : time}); return false;'
           ` + (peek ? `onmouseenter='kurkistaInfo(this, "${tunniste}", [...document.querySelectorAll(".selectize-dropdown").values()].filter(x => x.style.display!="none").map(x => (x.offsetLeft + x.offsetWidth) + "px")[0], (event.pageY-20) + "px", ${time ? '"' + time + '"' : time}); return false;'` : '') + `>
            ℹ️
        </a>
    </li>` : '';

let luoInfraAPILinkki = (tunniste, time) => onkoInfra(tunniste) ? `
    <li>
        <a href="${luoInfraAPIUrl(tunniste, time).replace('.json', '.html')}"
           title='Avaa Infra-API:ssa'
           class='infoikoni'
           onclick='window.open(this.getAttribute("href"),"_blank"); return false;'>
           <img src='https://rata.digitraffic.fi/infra-api/r/favicon.ico'
                alt='Avaa Infra-API:ssa' />
        </a>
    </li>
` : '';

let luoEtj2APILinkki = (tunniste, time) => onkoJeti(tunniste) ? `
    <li>
        <a href="${luoEtj2APIUrl(tunniste, time).replace('.json', '.html')}"
           title='Avaa Jeti-API:ssa'
           class='infoikoni'
           onclick='window.open(this.getAttribute("href"),"_blank"); return false;'>
            <img src='https://rata.digitraffic.fi/jeti-api/r/favicon.ico'
                 alt='Avaa Jeti-API:ssa' />
        </a>
    </li>
` : '';

let luoKarttaLinkki = (tunniste, title, time, peek) => onkoInfra(tunniste) || onkoTREX(tunniste) || onkoJeti(tunniste) || onkoRuma(tunniste) || onkoJuna(tunniste) ? `
    <li>
        <a href=""
           title='Avaa kartalla'
           class='infoikoni karttaikoni'
           onclick='kartta("${tunniste}", "${title.replaceAll(/<[^>]*>|&lt;.*?&gt;/g,'')}", ${time ? '"' + toISOStringNoMillis(time[0]) + '/' + toISOStringNoMillis(time[1]) + '"' : time}, true, event.pageX, event.pageY); return false;'
           ` + (peek ? `onmouseenter='kurkistaKartta(this, "${tunniste}", "${title.replaceAll(/<[^>]*>|&lt;.*?&gt;|\n/g,'')}", ${time ? '"' + toISOStringNoMillis(time[0]) + '/' + toISOStringNoMillis(time[1]) + '"' : time}, [...document.querySelectorAll(".selectize-dropdown").values()].filter(x => x.style.display!="none").map(x => (x.offsetLeft + x.offsetWidth) + "px")[0], (event.pageY-20) + "px"); return false;'` : '') + `/>
           🗺
        </a>
    </li>
` : '';

let luoAikatauluLinkki = (tunniste) => onkoJuna(tunniste) ? `
    <li>
        <a href=""
           title='Avaa aikataulu'
           class='infoikoni'
           onclick='luoJunaPopup("${onkoJuna(tunniste).departureDate}", "${onkoJuna(tunniste).trainNumber}"); return false;' />
           📅
        </a>
    </li>
` : '';

let luoRaideLinkki = (tunniste) => onkoInfraOID(tunniste) == 44 ? `
    <li>
        <a href=""
           title='Avaa raiteen korkeuskäyrä'
           class='infoikoni'
           onclick='luoRaidePopup("${tunniste}"); return false;' />
           ⦧
        </a>
    </li>
` : '';

let luoGrafiikkaLinkki = tunniste => {
    let m = onkoRatanumero(tunniste);
    if (m) {
        return luoGrafiikkaLinkkiRatanumerolle(m[1]);
    }
    m = onkoReitti(tunniste);
    if (m) {
        return luoGrafiikkaLinkkiReitille([m.start].concat(m.legs.filter(x => x != '')).concat([m.end]));
    }
    m = onkoJuna(tunniste);
    if (m) {
        return luoGrafiikkaLinkkiJunalle(m.trainNumber, m.departureDate);
    }
    m = onkoJeti(tunniste);
    if (m) {
        return luoGrafiikkaLinkkiJetille(tunniste);
    }
    return '';
}

let luoGrafiikkaLinkkiRatanumerolle = ratanumero => `
    <li>
        <a href=""
           title='Avaa työrakografiikalla'
           class='infoikoni'
           onclick='ratanumeroChanged("${ratanumero}"); return false;' />
           📈
        </a>
    </li>
`;

let luoGrafiikkaLinkkiReitille = reitti => {
    var r;
    if (reitti instanceof Array) {
        r = reitti;
    } else {
        let rr = onkoReitti(reitti);
        r = [rr.start].concat(rr.legs.filter(x => x != '')).concat([rr.end]);
    }
    return `
        <li>
            <a href=""
            title='Avaa työrakografiikalla'
            class='infoikoni'
            onclick='aikataulupaikkaChanged("${r[0]}","${r[r.length-1]}",[${r.length > 2 ? r[1].split(',').map(x => '"' + x + '"').join(',') : ''}]); return false;' />
            📈
            </a>
        </li>
    `;
}

let luoGrafiikkaLinkkiJunalle = (lahtopaiva, junanumero) => `
    <li>
        <a href=""
           title='Avaa työrakografiikalla'
           class='infoikoni'
           onclick='valitseJuna({departureDate: "${lahtopaiva}", trainNumber: ${junanumero}}); return false;' />
           📈
        </a>
    </li>
`;

window.asetaEnnakkotietoGrafiikalle = (tunniste, f) => {
    haeEnnakkotiedonRatanumerotJaVoimassaolo(tunniste, (ratanumero, voimassa) => {
        if (f) {
            f(ratanumero, voimassa);
        }
        ratanumeroChanged(ratanumero);
        let aikaNyt = getMainState().aika;
        if (voimassa[0] < aikaNyt[1] && aikaNyt[0] < voimassa[1]) {
            // voimassaolo leikkaa jo näytettävää aikaväliä
        } else {
            let st = getMainState();
            st.aika = voimassa[1] <= aikaNyt[0] ? [dateFns.dateFns.add(voimassa[1], {hours: -4}), voimassa[1]]
                                                : [voimassa[0], dateFns.dateFns.add(voimassa[0], dateFns.durationFns.toString({hours: 4}))];
            setMainState(st);
            window.dispatchEvent(new HashChangeEvent("hashchange"));
        }
    });
};

let luoGrafiikkaLinkkiJetille = tunniste => !onkoJeti(tunniste) ? '' : `
<li>
    <a href=""
       title='Avaa työrakografiikalla'
       class='infoikoni'
       onclick='asetaEnnakkotietoGrafiikalle("${tunniste}"); return false;' />
       📈
    </a>
</li>
`;

let luoLinkit = (tyyppi, tunniste, karttaTitle, time) => `
<ul class="ikonit">${
    (tyyppi == 'grafiikka' ? '' : luoGrafiikkaLinkki(tunniste)) +
    (tyyppi == 'info'      ? '' : luoInfoLinkki(tunniste, time, tyyppi == '')) +
    (tyyppi == 'kartta'    ? '' : karttaTitle ? luoKarttaLinkki(tunniste, karttaTitle, time, tyyppi == '') : '') +
    (tyyppi == 'aikataulu' ? '' : luoAikatauluLinkki(tunniste)) +
    (tyyppi == 'raide'     ? '' : luoRaideLinkki(tunniste)) +
    luoInfraAPILinkki(tunniste, time) +
    luoEtj2APILinkki(tunniste, time)
}</ul>`

let lueTunniste = obj => obj.tunniste || (obj.trainNumber ? obj.departureDate + '(' + obj.trainNumber + ')' : undefined) || obj.id;
