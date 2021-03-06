
window.objektityypitDS = luoDatasource("Objektityypit", infraObjektityypitUrl, (ret, x) => {
    ret[x.tyyppinumero] = {fi: x.nimi, en: x.name};
});
let hakudataHandler = (ret, x) => {
    ret.hakudata = ret.hakudata || [];
    if (x instanceof Array) {
        ret.hakudata = ret.hakudata.concat(x);
    } else {
        ret.hakudata.push(x);
    }
};
window.hakuUrlitInfraDS = hakuUrlitInfra()                   .map( (url,i) => luoDatasource("Haku-Infra:" + i, () => url, hakudataHandler));
window.hakuUrlitEtj2DS  = hakuUrlitEtj2()                    .map( (url,i) => luoDatasource("Haku-Etj2:" + i,  () => url, hakudataHandler));
window.hakuUrlitRumaDS  = hakuUrlitRT().concat(hakuUrlitLR()).map( (url,i) => luoDatasource("Haku-Ruma:" + i,  () => url, hakudataHandler));

let initSearch = (elem, lisaaPopuppiin, poistaPopupista, vainJunat, eiPoistoa) => {
    let search = $(elem).selectize({
        plugins: eiPoistoa ? [] : ['remove_button'],
        valueField: 'tunniste',
        labelField: 'nimi',
        searchField: ['query'],
        hideSelected: false,
        highlight: false,
        maxOptions: 100,
        closeAfterSelect: lisaaPopuppiin !== undefined,
        optgroups: [{luokka: 'Infra'}, {luokka: 'Jeti'}, {luokka: 'Ruma'}, {luokka: 'Aikataulut'}, {luokka: 'Junat'}],
        optgroupField: 'luokka',
        optgroupValueField: 'luokka',
        optgroupLabelField: 'luokka',
        score: _ => item => item.score,
        render: {
            option: (item, escape) => {
                let tunniste = item.tunniste;
                let reitti = onkoReitti(item.tunniste);
                if (reitti) {
                    reitti = [reitti[1]].concat(reitti[2] ? reitti[2].split('=>').filter(x => x != '') : []).concat(reitti[3]);
                    reitti = reitti.map(x => !x ? x : Object.values(aikataulupaikatDS.data)
                                                            .filter(y => x == y.tunniste || ''+x == y.uicKoodi || y.lyhenne && x.toLowerCase() == y.lyhenne.toLowerCase())
                                                            .map(x => x.tunniste)
                                                            .find(x => x))
                    if (!reitti.includes(undefined)) {
                        tunniste = reitti[0] + '=>' + (reitti.length > 2 ? reitti.slice(1,-1).join('=>') + '=>' : '') + reitti[reitti.length-1];
                    }
                }
                return `
                <div>
                    <div class="title">
                        <span class="group">${['Linkit', 'Muunnokset', 'Raideosuus', 'Rautatieliikennepaikka tai liikennepaikan osa'].includes(item.ryhma) || item.nimi.startsWith(item.ryhma) ? '' : escape(item.ryhma)}</span>
                        <span class="name">${item.nimi} (${item.score})</span>
                    </div>
                    ${ lisaaPopuppiin ? '' : luoLinkit('', tunniste, escape(item.nimi)) }
                </div>
            `}
        },
        load: (query, callback) => {
            let cb = x => callback(x.map(y => { return {...y, query: query}; }));
            hakuMuodosta(query, cb, vainJunat);
            hakuDatasta(query, cb, vainJunat);
        },
        onItemAdd: value => {
            if (lisaaPopuppiin) {
                lisaaPopuppiin(value);
            } else {
                search.clear();
            }
        },
        onItemRemove: poistaPopupista,
        onType: query => {
            // tallennetaan käytetty hakusana queryksi, jotta voidaan sillä matchata aina kaikkiin riveihin
            Object.values(search.options)
                  .filter(x => x)
                  .forEach(x => x.query = query);
            search.clearOptions();
        },
        onLoad: () => {
            var lukot = 0;
            let originalPlaceholder = search.settings.placeholder;
            let vapautaLukko = () => {
                lukot -= 1;
                if (lukot <= 0) {
                    search.unlock();
                    search.settings.placeholder = originalPlaceholder;
                    search.updatePlaceholder();
                }
            }
            let initHaku = x => {
                lukot += 1;
                search.settings.placeholder = 'ladataan pohjadataa...';
                search.updatePlaceholder();
                x.load();
                on(x.events, "done", vapautaLukko);
                on(x.events, "error", vapautaLukko);
            }

            if (!window.objektityypitDS.data) {
                initHaku(window.objektityypitDS);
                window.hakuUrlitInfraDS.forEach(initHaku);
                window.hakuUrlitEtj2DS .forEach(initHaku);
                window.hakuUrlitRumaDS .forEach(initHaku);
            }
        }
    })[0].selectize;

    if (!lisaaPopuppiin) {
        // laitetaan clickit valumaan varsinaisiin linkkeihin saakka
        search.$dropdown_content.on('mousedown', () => false);

        var prev;
        search.$control.on('keydown', ev => {
            if (ev.key == "ArrowRight") {
                if (prev) {
                    prev.onmouseout();
                    prev = undefined;
                }
                let opt = search.$activeOption[0];
                prev = opt.querySelector('.karttaikoni');
                prev.onmouseover({ pageX: 0, pageY: 0});
            } else if (ev.key == 'ArrowLeft') {
                if (prev) {
                    prev.onmouseout();
                    prev = undefined;
                }
            }
        });
    }

    return search;
}

setTimeout(() => {
    window.search = initSearch(document.getElementById('search'));
    search.focus();

    document.addEventListener('keydown', ev => {
        if (!ev.target.parentNode.classList.contains('selectize-input')) {
            search.focus();
        }
    });
}, 500);

let hakuMuodosta = (str, callback, vainJunat) => {
    setTimeout( () => {
        var ret = [];
        var m;

        if (!vainJunat) {
            // ETJ2
            m = str.match(/^(1\.2\.246\.586\.2(?:\.\d+)+)$/);
            if (m) {
                ret.push({
                    luokka:     'Jeti',
                    ryhma:      'Linkit',
                    tunniste:   str,
                    nimi:       m[1],
                    score:      93000
                });
            }
            m = str.match(/^(VS\d+)$/);
            if (m) {
                ret.push({
                    luokka:     'Jeti',
                    ryhma:      'Linkit',
                    tunniste:   str,
                    nimi:       'Vuosisuunnitelma ' + m[1],
                    score:      93000
                });
            }
            m = str.match(/^(ES\d+)$/);
            if (m) {
                ret.push( {
                    luokka:     'Jeti',
                    ryhma:      'Linkit',
                    tunniste:   str,
                    nimi:       'Ennakkosuunnitelma ' + m[1],
                    score:      93000
                });
            }
            m = str.match(/^(EI\d+)$/);
            if (m) {
                ret.push({
                    luokka:     'Jeti',
                    ryhma:      'Linkit',
                    tunniste:   str,
                    nimi:       'Ennakkoilmoitus ' + m[1],
                    score:      93000
                });
            }
            m = str.match(/^(LOI\d+)$/);
            if (m) {
                ret.push({
                    luokka:     'Jeti',
                    ryhma:      'Linkit',
                    tunniste:   str,
                    nimi:       'LOIlmoitus ' + m[1],
                    score:      93000
                });
            }

            // Infra
            m = str.match(/^(1\.2\.246\.586\.1(?:\.\d+)+)$/);
            if (m) {
                ret.push({
                    luokka:     'Infra',
                    ryhma:      'Linkit',
                    tunniste:   str,
                    nimi:       m[1],
                    score:      91000
                });
            }
            m = str.match(/^(\d+)(?:\.\d+)?,[ ]?(\d+)(?:\.\d+)?$/);
            if (m) {
                var srs = undefined;
                if (m[1] > 999 && m[2] > 999) {
                    // epsg:3067
                    srs = undefined;
                } else if (m[1] < 50 && m[2] > 50) {
                    // epsg:4326
                    srs = 'srsName=epsg:4326';
                } else if (m[1] > 50 && m[2] < 50) {
                    // crs:84
                    srs = 'srsName=crs:84';
                }

                let id = ''+Math.random();
                getJson(koordinaattiUrl(m[1] + ',' + m[2], srs), data => {
                    let rkm = data.flatMap(x => x.ratakmsijainnit.map(muotoileRkm)).join('<br />');
                    let pm  = data.flatMap(x => x.paikantamismerkkisijainnit.map(muotoilePm)).join('<br />');
                    document.getElementById(id).innerHTML = (rkm ? ' <br />' + rkm : '') + (pm ? ' <br />' + pm : '');
                });
                
                ret.push({
                    luokka:     'Infra',
                    ryhma:      'Muunnokset',
                    tunniste:   str,
                    nimi:       'Koordinaatti ' + m[1] + ',' + m[2] + '<span class="muunnos" id="' + id + '"></span>',
                    score:      999999
                });
            }
            m = str.match(/^\(([^)]+)\)\s*([^+]+)\+(\d+)$/);
            if (m) {
                let id = Math.random();
                getJson(ratakmSijaintiUrl(m[1], m[2], m[3]), data => {
                    let pm = data.flatMap(x => x.paikantamismerkkisijainnit.map(muotoilePm)).join('<br />');
                    document.getElementById(id).innerHTML = (pm ? ' <br />' + pm : '');
                });
                
                ret.push({
                    luokka:     'Infra',
                    ryhma:      'Muunnokset',
                    tunniste:   str,
                    nimi:       'Ratakilometrisijainti (' + m[1] + ') ' + m[2] + '+' + m[3] + '<span class="muunnos" id="' + id + '"></span>',
                    score:      999999
                });
            }
            m = str.match(/^\(([^)]+)\)\s*([^+]+)\+(\d+)\s*(?:->|-|>|\/)\s*([^+]+)\+(\d+)$/);
            if (m) {
                let id = Math.random();
                getJson(ratakmValiUrl(m[1], m[2], m[3], m[4], m[5]), data => {
                    let pm = data.flatMap(x => x.paikantamismerkkivalit.map(muotoilePmv)).join('<br />');
                    document.getElementById(id).innerHTML = (pm ? ' <br />' + pm : '');
                });

                ret.push({
                    luokka:     'Infra',
                    ryhma:      'Linkit',
                    tunniste:   str,
                    nimi:       'Ratakilometriväli (' + m[1] + ') ' + m[2] + '+' + m[3] + '-' + m[4] + '+' + m[5] + '<span class="muunnos" id="' + id + '"></span>',
                    score:      91000
                });
            }
            m = str.match(/^\(([^)]+)\)$/);
            if (m) {
                ret.push({
                    luokka:     'Infra',
                    ryhma:      'Linkit',
                    tunniste:   str,
                    nimi:       'Ratanumero (' + m[1] + ')',
                    score:      91000
                });
            }
            m = onkoReitti(str);
            if (m) {
                ret.push({
                    luokka:     'Infra',
                    ryhma:      'Linkit',
                    tunniste:   str,
                    nimi:       'Kaikki reitit ' + m[1] + (m[2] ? ' ' + m[2].split('=>').join(' => ') : '') + ' => ' + m[3],
                    score:      91000
                });
            }
            m = str.match(/^(\d+)([+-])(\d+)$/);
            if (m) {
                let id = Math.random();
                getJson(pmSijaintiUrl(m[1], m[2], m[3], m[4], m[5]), data => {
                    let rkm = data.flatMap(x => x.sijainnit).flatMap(x => x.ratakmsijainnit.map(muotoileRkm)).join('<br />');
                    document.getElementById(id).innerHTML = (rkm ? ' <br />' + rkm : '');
                });

                ret.push({
                    luokka:     'Infra',
                    ryhma:      'Muunnokset',
                    tunniste:   str,
                    nimi:       'Paikantamismerkkisijainti ' + m[1] + '+' + m[3] + (m[2] == '+' ? ' nousevaan' : ' laskevaan') + ' suuntaan' + '<span class="muunnos" id="' + id + '"></span>',
                    score:      999999
                });
            }

            // Rumat
            m = str.match(/^(1\.2\.246\.586\.7.1(?:\.\d+)+)$/);
            if (m) {
                ret.push({
                    luokka:     'Ruma',
                    ryhma:      'Linkit',
                    tunniste:   str,
                    nimi:       'Ratatyö ' + m[1],
                    score:      95000
                });
            }
            m = str.match(/^(1\.2\.246\.586\.7.2(?:\.\d+)+)$/);
            if (m) {
                ret.push({
                    luokka:     'Ruma',
                    ryhma:      'Linkit',
                    tunniste:   str,
                    nimi:       'Liikenteenrajoite ' + m[1],
                    score:      95000
                });
            }
            m = str.match(/^RT(\d+)$/);
            if (m) {
                ret.push({
                    luokka:     'Ruma',
                    ryhma:      'Linkit',
                    tunniste:   '1.2.246.586.7.1.' + m[1],
                    nimi:       'Ratatyö RT' + m[1],
                    score:      95000
                });
            }
            m = str.match(/^LR(\d+)$/);
            if (m) {
                ret.push({
                    luokka:     'Ruma',
                    ryhma:      'Linkit',
                    tunniste:   '1.2.246.586.7.2.' + m[1],
                    nimi:       'Liikenteenrajoite LR' + m[1],
                    score:      95000
                });
            }

            // aikataulut
            m = str.match(/^(\d\d\d\d-\d\d-\d\d)$/);
            if (m) {
                ret.push({
                    luokka:   'Aikataulut',
                    ryhma:    'Linkit',
                    tunniste: str,
                    nimi:     'Lähtöpäivän aikataulu ' + m[1],
                    score:    98000
                });
            }

            // geometriat
            m = onkoWKT(str);
            if (m) {
                ret.push({
                    luokka:   'Geometria',
                    ryhma:    'Geometria',
                    tunniste: m[0],
                    nimi:     m[1],
                    score:    100000
                });
            }
        }
        
        // junat
        m = str.match(/^(\d\d\d\d-\d\d-\d\d)\s+\(?(\d+)\)?$/);
        if (m) {
            ret.push({
                luokka:   'Junat',
                ryhma:    'Linkit',
                tunniste: str,
                nimi:     'Juna ' + m[1] + ' (' + m[2] + ')',
                score:    100000
            });
        }
        m = str.match(/^(\d+)$/);
        if (m) {
            let date = dateFns.dateFns.format(dateFns.dateFns.startOfToday(), 'yyyy-MM-dd')
            ret.push({
                luokka:   'Junat',
                ryhma:    'Linkit',
                tunniste: date + ' (' + m[1] + ')',
                nimi:     'Juna ' + date + ' (' + m[1] + ')',
                score:    100000
            });
        }

        callback(ret);
    }, 1);
};

let hakuDatasta = (str, callback, vainJunat) => {
    if (onkoWKT(str)) {
        return; // don't bother
    }

    let suodata = f => ds => {
        let handler = () => ds.data.hakudata ? callback(ds.data.hakudata.map(osuuko(str))
                                                                        .filter(x => x[1] > 0)
                                                                        .map(f))
                                             : log('ei hakudataa:', ds.url);
        if (ds.data) {
            handler();
        } else {
            on(ds.events, 'done', handler);
        }
    };

    if (!vainJunat) {
        hakuUrlitInfraDS.forEach(suodata(r => {
            let ryhma = parsiInfraRyhma(r[0]);
            return {
                luokka:     'Infra',
                ryhma:      ryhma,
                tunniste:   ryhma == 'Rata' ? '(' + r[0].ratanumero + ')' : r[0].tunniste,
                data:       r[0],
                nimi:       parsiInfraNimi(ryhma, r[0]),
                score:      r[1]
            }
        }));

        hakuUrlitEtj2DS.forEach(suodata(r => {
            return {
                luokka:     'Jeti',
                ryhma:      parsiJetiRyhma(r[0]),
                tunniste:   r[0].tunniste,
                data:       r[0],
                nimi:       parsiJetiNimi(r[0]),
                score:      r[1]
            }
        }));
        
        hakuUrlitRumaDS.forEach(suodata(r => {
            let ratatyo = r[0].id.startsWith('1.2.246.586.7.1.');
            return {
                luokka:     'Ruma',
                ryhma:      ratatyo ? 'Ratatyö' : 'Liikenteenrajoite',
                tunniste:   r[0].id,
                data:       r[0],
                nimi:       (ratatyo ? 'RT' : 'LR') + r[0].id.replaceAll(/.*[.]/g,''),
                score:      r[1]
            }
        }));
    }
}

let osuuko = str => row => [row, osuuko_(splitString(str).map(x =>
    new RegExp(x.match(/\d+/) ? '[^0-9]' + escapeRegex(x) + '[^0-9]|^' + escapeRegex(x) + '[^0-9]|[^0-9]' + escapeRegex(x) + '$|^' + escapeRegex(x) + '$' // numerot mätsätään kokonaisina lukuina
                              : escapeRegex(x), 'i')))(row)];
let osuuko_ = matchers => value => {
    let fieldName = value instanceof Array ? value[0] : undefined;
    let fieldNameScore = typeof fieldName !== 'string' ? 0 :
                         fieldName.toLowerCase() == 'lyhenne' ? 5 :
                         fieldName.toLowerCase() == 'tunnus' ? 4 :
                         fieldName.toLowerCase() == 'nimi' ? 3 :
                         fieldName.toLowerCase() == 'ratanumero' ? 2 :
                         fieldName.toLowerCase() == 'kaukoohjauspaikka' ? -10 :
                         fieldName.toLowerCase() == 'kaukoohjausnimi' ? -10 :
                         0;
    let row = value instanceof Array ? value[1] : value;
    if (row === null || row === undefined) {
        return 0;
    } else if (row instanceof Array) {
        let scores = row.map(osuuko_(matchers));
        return scores.length == 1 && scores[0] > 0 ? scores[0] + 100 // tarkempi match
                                                   : scores.reduce((a,b) => a+b, 0);
    } else if (typeof row == "object") {
        if (row.ratanumero !== undefined && (row.ratakm !== undefined && row.etaisyys !== undefined || row.alku !== undefined && row.loppu !== undefined)) {
            // ei matchata ratakmsijainti/ratakmvali -objekteihin
            return 0;
        }
        return Object.entries(row).map(osuuko_(matchers)).reduce((a,b) => a+b, 0);
    } else {
        let r = typeof row == 'string' ? row : ''+row;
        let numero = typeof row == 'number';
        let bool = typeof row == 'boolean';
        let oid = onkoOID(r);
        let ret = matchers.map(matcher => {
            if (bool && fieldName.match(matcher)) {
                // boolean-arvoille matchataan kentän nimeen exact
                let m = fieldName.match(matcher);
                return m && m[0] == m.input ? 10 : 0;
            } else if (numero) {
                // numeroihin vaaditaan exact match
                let m = r.match(matcher);
                return m && m[0] == m.input ? 200 : 0;
            } else if (oid) {
                // oid vaaditaan exact match
                let m = oid[1].match(matcher);
                return m && m[0] == m.input ? 200 : 0;
            } else {
                // muussa tapauksessa säädetään osumatarkkuutta sen mukaan miten iso osa mätsäsi
                let m = r.match(matcher);
                let score = m ? (m[0] == m.input      ? 200 + 200*fieldNameScore :                                                  // tarkka osuma
                    m.input.split(' ').includes(m[0]) ? 100 + 50*fieldNameScore + Math.floor((m[0].length / m.input.length) * 10) : // tarkka osuma johonkin sanaan
                                                        10  + 10*fieldNameScore + Math.floor((m[0].length / m.input.length) * 10))
                                                      : 0;
                /*if (r == "TPEE/19") {
                    log(score, r, m);
                }*/
                return score;
            }
        });

        return ret.reduce((a,b) => a+b, 0);
    }
};

let parsiInfraNimi = (ryhma, row) => {
    let a = (row.tyyppi && row.tyyppi.toLowerCase() != ryhma.toLowerCase() ? row.tyyppi[0].toUpperCase() + row.tyyppi.slice(1) + ' ' : '');
    let b = (row.lyhenne || row.numero || row.uicKoodi || row.siltakoodi || (row.ratanumero && row.ratakm ? '(' + row.ratanumero + ') ' + row.ratakm : row.ratanumero ? '(' + row.ratanumero + ')' : undefined) );
    let c = row.tunnus || row.kuvaus;
    let d = (row.nimi || row.linjaraidetunnukset || row.turvalaiteNimi || (row.kaukoOhjausTunnisteet ? row.kaukoOhjausTunnisteet.map(x => x.kaukoOhjausPaikka + ' ' + x.kaukoOhjausNimi).join(', ') : undefined));
    let e = row.turvalaiteRaide ? '(' + row.turvalaiteRaide + ')' : undefined;
    let f = (b || c || d || e ? undefined : row.tunniste);
    return [a,b,c,d,e,f].filter(x => x).map(x => '<span class="searchElem">' + x + '</span>').join(' ');
}

let parsiJetiNimi = row => {
    let a = row.sisainenTunniste;
    let b = row.tila;
    let c = row.asia || row.tyyppi || row.tyo;
    let d = row.voimassa ? muotoileAikavali(row.voimassa) : undefined;
    let e = row.tyonLisatiedot || row.vekSelite || row.eivekSelite || (row.tyonosat ? row.tyonosat.map(x => x.tyyppi + ': ' + x.selite).join('. ') : undefined);
    return [a,b,c,d,e].filter(x => x).map(x => '<span class="searchElem">' + x + '</span>').join(' ');
};

let parsiInfraRyhma = row => {
    let trex = onkoTREX(row.tunniste);
    if (trex && trex[1] == '15') {
        return "Silta";
    }
    let ryhma = row.tunniste.replace('1.2.246.586.1.', '').replaceAll(/[.].*/g,'');
    let d = objektityypitDS.data[ryhma];
    return d ? d.fi : '?';
};

let parsiJetiRyhma = row =>
    row.sisainenTunniste.startsWith('VS') ? 'Vuosisuunnitelma' :
    row.sisainenTunniste.startsWith('ES') ? 'Ennakkosuunnitelma' :
    row.sisainenTunniste.startsWith('EI') ? 'Ennakkoilmoitus' :
    row.sisainenTunniste.startsWith('LO') ? 'LO-ilmoitus' : undefined;
