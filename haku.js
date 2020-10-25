
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

let initSearch = (elem, lisaaKartalle, poistaKartalta) => {
    let search = $(elem).selectize({
        plugins: ['remove_button'],
        valueField: 'tunniste',
        labelField: 'nimi',
        searchField: ['query'],
        hideSelected: false,
        highlight: false,
        maxOptions: 100,
        closeAfterSelect: lisaaKartalle !== undefined,
        optgroups: [{luokka: 'Infra'}, {luokka: 'Jeti'}, {luokka: 'Ruma'}, {luokka: 'Aikataulut'}, {luokka: 'Junat'}],
        optgroupField: 'luokka',
        optgroupValueField: 'luokka',
        optgroupLabelField: 'luokka',
        score: _ => item => item.score,
        render: {
            option: (item, escape) => `
                <div>
                    <span class="title">
                        <span class="group">${item.ryhma == 'Linkit' || item.ryhma == 'Muunnokset' || item.ryhma == 'Raideosuus' || item.ryhma == 'Rautatieliikennepaikka tai liikennepaikan osa' ? '' : escape(item.ryhma)}</span>
                        <span class="name">${escape(item.nimi)}</span>
                        <span class="score">${escape(item.score)}</span>
                    </span>
                    <ul>
                    ${ lisaaKartalle ? '' :
                        (item.luokka != 'Junat' && item.luokka != 'Aikataulut'            ? luoInfoLinkki(escape(item.tunniste))     : '') +
                        (item.luokka == 'Infra'                                           ? luoInfraAPILinkki(escape(item.tunniste)) : '') +
                        (item.luokka == 'Jeti'                                            ? luoEtj2APILinkki(escape(item.tunniste))  : '') +
                        (item.luokka == 'Ruma'                                            ? luoKarttaLinkki(escape(item.tunniste), escape(item.nimi), escape(item.data.location)) : '') +
                        (item.luokka == 'Infra' || item.luokka == 'Jeti'                  ? luoKarttaLinkki(escape(item.tunniste), escape(item.nimi)) : '') +
                        (item.luokka == 'Junat'                                           ? luoKarttaLinkki(escape(item.tunniste), escape(item.nimi)) : '') +
                        (item.luokka == 'Aikataulut' && item.data && item.data.junanumero ? luoAikatauluLinkki(escape(item.data.lahtopaiva), escape(item.data.junanumero)) : '')
                    }
                    </ul>
                </div>
            `
        },
        load: (query, callback) => {
            let cb = x => callback(x.map(y => { return {...y, query: query}; }));
            hakuMuodosta(query, cb);
            hakuDatasta(query, cb);
        },
        onItemAdd: value => {
            if (lisaaKartalle) {
                lisaaKartalle(value);
            } else {
                search.clear();
            }
        },
        onItemRemove: poistaKartalta,
        onType: query => {
            // tallennetaan käytetty hakusana queryksi, jotta voidaan sillä matchata aina kaikkiin riveihin
            Object.values(search.options)
                  .filter(x => x)
                  .forEach(x => x.query = query);
            search.clearOptions();
        },
        onFocus: () => {
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

    if (!lisaaKartalle) {
        // laitetaan clickit valumaan varsinaisiin linkkeihin saakka
        search.$dropdown_content.on('mousedown', () => false);
    }

    return search;
}

setTimeout(() => {
    window.search = initSearch(document.getElementById('search'));
    search.focus();

    document.addEventListener('keydown', _ => {
        search.focus();
    });
}, 500);

let hakuMuodosta = (str, callback) => {
    setTimeout( () => {
        var ret = [];
        var m;

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
            ret.push({
                luokka:     'Infra',
                ryhma:      'Muunnokset',
                tunniste:   str,
                nimi:       'Koordinaatti ' + m[1] + ',' + m[2],
                path:       'koordinaatit/' + m[1] + ',' + m[2],
                query:      srs,
                score:      999999
            });
        }
        m = str.match(/^\(([^)]+)\)\s*([^+]+)\+(\d+)$/);
        if (m) {
            ret.push({
                luokka:     'Infra',
                ryhma:      'Muunnokset',
                tunniste:   str,
                nimi:       'Ratakilometrisijainti (' + m[1] + ') ' + m[2] + '+' + m[3],
                path:       'radat/' + m[1] + '/' + m[2] + '+' + m[3],
                score:      999999
            });
        }
        m = str.match(/^\(([^)]+)\)\s*([^+]+)\+(\d+)\s*(?:->|-|>|\/)\s*([^+]+)\+(\d+)$/);
        if (m) {
            ret.push({
                luokka:     'Infra',
                ryhma:      'Linkit',
                tunniste:   str,
                nimi:       'Ratakilometriväli (' + m[1] + ') ' + m[2] + '+' + m[3] + '-' + m[4] + '+' + m[5],
                path:       'radat/' + m[1] + '/' + m[2] + '+' + m[3] + '-' + m[4] + '+' + m[5],
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
                path:       'radat',
                query:      "cql_filter=ratanumero='" + m[1] + "'",
                score:      91000
            });
        }
        m = onkoReitti(str);
        if (m) {
            ret.push({
                luokka:     'Infra',
                ryhma:      'Linkit',
                tunniste:   str,
                nimi:       'Kaikki reitit ' + m[1] + ' => ' + m[2] + ' => ' + m[3],
                path:       reittiUrl(m[1], m[2].split(','), m[3]),
                score:      91000
            });
        }
        m = str.match(/^(\d+)([+-])(\d+)$/);
        if (m) {
            ret.push({
                luokka:     'Infra',
                ryhma:      'Muunnokset',
                tunniste:   str,
                nimi:       'Paikantamismerkkisijainti ' + m[1] + '+' + m[3] + (m[2] == '+' ? ' nousevaan' : ' laskevaan') + ' suuntaan',
                path:       'paikantamismerkit/' + m[1] + m[2] + m[3],
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
        m = str.match(/^(\d\d\d\d-\d\d-\d\d)\s+\(?(\d+)\)?$/);
        if (m) {
            ret.push({
                luokka:   'Aikataulut',
                ryhma:    'Linkit',
                tunniste: str,
                data:     {lahtopaiva: m[1], junanumero: m[2]},
                nimi:     'Junan aikataulu ' + m[1] + ' (' + m[2] + ')',
                path:     m[1] + '/' + m[2],
                score:    99000
            });
        }
        m = str.match(/^(\d\d\d\d-\d\d-\d\d)$/);
        if (m) {
            ret.push({
                luokka:   'Aikataulut',
                ryhma:    'Linkit',
                tunniste: str,
                nimi:     'Lähtöpäivän aikataulu ' + m[1],
                path:     m[1],
                score:    98000
            });
        }

        // junat
        m = str.match(/^(\d\d\d\d-\d\d-\d\d)\s+\(?(\d+)\)?$/);
        if (m) {
            ret.push({
                luokka:   'Junat',
                ryhma:    'Linkit',
                tunniste: str,
                nimi:     'Juna ' + m[1] + ' (' + m[2] + ')',
                path:     m[1] + '/' + m[2],
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
                path:     date + '/' + m[1],
                score:    100000
            });
        }
        m = str.match(/^(\d\d\d\d-\d\d-\d\d)$/);
        if (m) {
            ret.push({
                luokka:   'Junat',
                ryhma:    'Linkit',
                tunniste: str,
                nimi:     'Lähtöpäivän junat ' + m[1],
                path:     m[1],
                score:    100000
            });
        }

        callback(ret);
    }, 1);
};

let hakuDatasta = (str, callback) => {
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

    hakuUrlitInfraDS.forEach(suodata(r => {
        let ryhma = parsiInfraRyhma(r[0]);
        return {
            luokka:     'Infra',
            ryhma:      ryhma,
            tunniste:   r[0].tunniste,
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

let osuuko = str => row => [row, osuuko_(splitString(str).map(x =>
    new RegExp(x.match(/\d+/) ? '[^0-9]' + x + '[^0-9]|^' + x + '[^0-9]|[^0-9]' + x + '$|^' + x + '$' // numerot mätsätään kokonaisina lukuina
                              : escapeRegex(x), 'i')))(row)];
let osuuko_ = matchers => value => {
    let fieldName = value instanceof Array ? value[0] : undefined;
    let row = value instanceof Array ? value[1] : value;
    if (row === null || row === undefined) {
        return 0;
    } else if (row instanceof Array) {
        let scores = row.map(osuuko_(matchers));
        return scores.length == 1 && scores[0] > 0 ? [scores[0] + 100] // tarkempi match
                                                   : scores.reduce((a,b) => a+b, 0);
    } else if (typeof row == "object") {
        return Object.entries(row).map(osuuko_(matchers)).reduce((a,b) => a+b, 0);
    } else {
        let r = typeof row == 'string' ? row : ''+row;
        let numero = typeof row == 'number';
        let bool = typeof row == 'boolean';
        return matchers.map(matcher => {
            let oid = onkoOID(r);
            if (bool && fieldName.match(matcher)) {
                let m = fieldName.match(matcher);
                return m && m[0] == m.input ? 10 : 0;
            } else if (fieldName == 'ratanumero') {
                let m = (' (' + r + ')').match(matcher);
                return m && m[0] == m.input ? 200 : 0;
            } else if (fieldName == 'ratakm' || fieldName == 'etaisyys') {
                return 0;
            } else if (numero) {
                let m = r.match(matcher);
                return m && m[0] == m.input ? 200 : 0;
            } else if (oid) {
                let m = oid[1].match(matcher);
                return m && m[0] == m.input ? 200 : 0;
            } else {
                let m = r.match(matcher);
                return m ? (m[0] == m.input ? 50 : 10 + Math.floor((m[0].length / m.input.length) * 100))
                         : 0;
            }
        }).reduce((a,b) => a+b, 0);
    }
};

let parsiInfraNimi = (ryhma, row) => {
    let a = (row.tyyppi && row.tyyppi.toLowerCase() != ryhma.toLowerCase() ? row.tyyppi[0].toUpperCase() + row.tyyppi.slice(1) + ' ' : '');
    let b = (row.lyhenne || row.numero || row.uicKoodi || row.siltakoodi);
    let c = (row.tunnus || row.nimi || row.linjaraidetunnukset || row.turvalaiteNimi || (row.kaukoOhjausTunnisteet ? row.kaukoOhjausTunnisteet.map(x => x.kaukoOhjausPaikka + ' ' + x.kaukoOhjausNimi).join(', ') : undefined));
    let d = row.turvalaiteRaide ? '(' + row.turvalaiteRaide + ')' : undefined;
    let e = (b || c || d ? undefined : row.tunniste);
    return [a,b,c,d,e].filter(x => x).join(' ');
}

let parsiJetiNimi = row => row.sisainenTunniste;

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
