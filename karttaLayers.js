let newVectorLayer =        (url, shortName, title_fi, title_en, opacity, propertyName, styleOrHandler, typeNames, projection, kaavio, ajanhetki, aikavali) =>
    newVectorLayerImpl(true, url, shortName, title_fi, title_en, opacity, propertyName, styleOrHandler, typeNames, projection, kaavio, ajanhetki, aikavali);

let newVectorLayerNoTile =   (url, shortName, title_fi, title_en, opacity, propertyName, styleOrHandler, typeNames, projection, kaavio, ajanhetki, aikavali) =>
    newVectorLayerImpl(false, url, shortName, title_fi, title_en, opacity, propertyName, styleOrHandler, typeNames, projection, kaavio, ajanhetki, aikavali);

let applyStyle = (styleOrHandler, ajanhetki, aikavali) => feature => {
    let voimassa = feature.getProperties().voimassa || feature.getProperties().haetunDatanVoimassaoloaika || (feature.getProperties().ensimmainenAktiivisuusaika ? feature.getProperties().ensimmainenAktiivisuusaika + '/' + feature.getProperties().viimeinenAktiivisuusaika : undefined);
    let vali = !voimassa ? undefined : voimassa.split('/').map(x => new Date(x));
    if (!aikavali()) {
        aikavali(vali[0], vali[1]);
    }
    let func = (a,b,c,d,e,f) => {
        let hetki = ajanhetki();
        let osuu = ([alkuaika,loppuaika]) => alkuaika <= hetki && hetki <= loppuaika;
        if (vali && hetki && !osuu(vali)) {
            // voimassaolo ei osu kartan ajanhetkeen -> piilotetaan feature
            return undefined;
        } else if (styleOrHandler instanceof Function && styleOrHandler.length == 1) {
            styleOrHandler(feature);
            return feature.getStyle();
        } else if (styleOrHandler instanceof Function) {
            return styleOrHandler(a,b,c,d,e,f);
        } else {
            return styleOrHandler || styles.default;
        }
    };
    func.getImage = () => undefined;
    func.getGeometryFunction = () => () => undefined;
    feature.setStyle(func);
    return feature;
}

let newVectorLayerImpl = (tiling, url, shortName, title_fi, title_en, opacity, propertyName, styleOrHandler, typeNames, prepareFeatures, kaavio, ajanhetki, aikavali) => {
    let u1 = url.replace(/time=[^&]*&?/, '');
    u1 = u1 + (u1.indexOf('?') < 0 ? '?' : '&');
    u1 = u1.indexOf('.json') >= 0 ? u1.replace('.json', '.geojson') : u1.indexOf('.geojson') < 0 ? u1.replace('?', '.geojson?') : u1; 

    var layer;
    let paivitetaanAjankohtamuutoksessa = url.indexOf('/jeti-api/') >= 0;
    var aborter = new AbortController();
    let source = new ol.source.Vector({
        format:     format,
        projection: projection,
        strategy:   tiling ? ol.loadingstrategy.tile(tileGrid) : ol.loadingstrategy.all,
        loader:     extent => {
            let u2 = (kaavio() && url.indexOf('-notifications') == -1 ? '&presentation=diagram' : '') +
                     (kaavio() && url.indexOf('-notifications') >= 0  ? '&schema=true' : '');
            let time = paivitetaanAjankohtamuutoksessa && ajanhetki() ? limitInterval(toISOStringNoMillis(ajanhetki()) + '/' + toISOStringNoMillis(ajanhetki()))
                                                                      : aikavali() ? limitInterval(toISOStringNoMillis(aikavali()[0]) + '/' + toISOStringNoMillis(aikavali()[1]))
                                                                      : undefined;
            let u3 = (!propertyName                                           ? '' : '&propertyName=' + propertyName) +
             (u1.indexOf('time=') >= 0 || u1.indexOf('start=') >= 0 || u1.indexOf('train-locations') >= 0 || u1.indexOf('-notifications') >= 0 || aikavali() == undefined ? '' : '&time=' + time) +
             (!typeNames                                              ? '' : '&typeNames=' + typeNames);

            layer.dispatchEvent("loadStart");
            getJson((u1 + (tiling ? '&bbox=' + extent.join(',') : '') + u2 + u3).replaceAll('?&','?'), data => {
                layer.dispatchEvent("loadSuccess");
                let features = format.readFeatures(data);
                features.forEach(applyStyle(styleOrHandler, ajanhetki, aikavali));
                if (prepareFeatures) {
                    source.addFeatures(prepareFeatures(features, layer));
                } else {
                    source.addFeatures(features);
                }
                source.dispatchEvent("featuresLoaded");
            }, aborter.signal, err => {
                if (err.name == 'AbortError') {
                    layer.dispatchEvent("loadAbort");
                } else {
                    errorHandler(err);
                    layer.dispatchEvent("loadFail");
                }
            });
        }
    });
    source.on('clear', () => {
        aborter.abort();
        aborter = new AbortController();
    });

    layer = new ol.layer.Vector({
        title:                  mkLayerTitle(title_fi, title_en),
        shortName:              shortName,
        source:                 source,
        opacity:                opacity || 1.0,
        style:                  styleOrHandler instanceof Function ? undefined : styleOrHandler,
        //extent: dataExtent[projection.getCode()],
        renderBuffer:           500,
        updateWhileInteracting: true,
        updateWhileAnimating:   true,
        paivitetaanAjankohtamuutoksessa: paivitetaanAjankohtamuutoksessa
    });
    layer.setVisible(false);
    return layer;
};

let mkLayerTitle = (title_fi, title_en) => `<span class="fi">${title_fi}</span><span class="en">${title_en}</span>`;

let tileLayer = (title, source, opacity) => new ol.layer.Tile({
    title:                  title,
    tileGrid:               tileGrid,
    opacity:                opacity || 0.3,
    source:                 source,
    renderBuffer:           500,
    updateWhileInteracting: true,
    updateWhileAnimating:   true
});

let projectFeature = sourceProjection => f => {
    f.setGeometry(f.getGeometry().transform(sourceProjection, projection));
    return f;
}

let rumaPrepareFeatures = features => {
    features.forEach(projectFeature(projectionWGS));
    return groupRumaFeatures(features);
}

let junaPrepareFeatures = (features, layer) => {
    features.forEach(projectFeature(projectionWGS));
    setInterval(paivitaYksikot(layer), 1000);
    return features;
}

let opacity = 1.0;

let layers = (kaavio, ajanhetki, aikavali) => [
    new ol.layer.Group({
        title: mkLayerTitle('Ratapihapalvelut','Rail yard services'),
        layers: [
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Vesiviskuri'                 , 'Water crane'            , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'vesiviskuri', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Vesipiste'                   , 'Water post'             , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'vesipiste', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Vaununsiirtolaite'           , 'Wagon transfer device'  , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'vaununsiirtolaite', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Varoallas'                   , 'Guard pool'             , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'varoallas', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Vaaka'                       , 'Scale'                  , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'vaaka', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Tankkauspiste'               , 'Refuelling point'       , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'tankkauspiste', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Sähkökeskus'                 , 'Electricity outlet'     , opacity, 'geometria,nimi,rotaatio,sahkokeskus.sahkokeskustyyppi,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'sahkokeskus', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Raideleveyden vaihtolaite'   , 'Gauge conversion device', opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'raideleveydenvaihtolaite', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Paineilmaposti'              , 'Compressed air post'    , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'paineilmaposti', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'LVIposti'                    , 'Hvac post'              , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'lviposti', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Laskumäkijarrut'             , 'Hump brake'             , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'laskumakijarrut', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Lämmitysposti'               , 'Heating post'           , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'lammitysposti', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Laipanvoitelulaite'          , 'Flange lubricator'      , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'laipanvoitelulaite', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Kääntöpainikkeet'            , 'Reverse buttons'        , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'kaantopainikkeet', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Jarrujen koettelujärjestelmä', 'Brake test system'      , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'jarrujenkoettelujarjestelma', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Hiekanantolaite'             , 'Sand signaling device'  , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'hiekanantolaite', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Alipainetyhjennyslaite'      , 'Vacuum drainage device' , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', ratapihapalveluStyle, 'alipainetyhjennyslaite', undefined, kaavio, ajanhetki, aikavali)
        ]
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Alueet','Areas'),
        layers: [
            newVectorLayer(infraAPIUrl + 'toimialueet'              , 'toi', 'Toimialueet'              , 'Traffic control areas'        , opacity, 'nimi,tunniste,valit.geometria,vari,haetunDatanVoimassaoloaika', toimialueStyle, undefined, undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'tilirataosat'             , 'til', 'Tilirataosat'             , 'Accounting railway sections'  , opacity, 'geometria,nimi,numero,tunniste,haetunDatanVoimassaoloaika', undefined, undefined, undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'nopeusrajoitusalueet'     , 'nop', 'Nopeusrajoitusalueet'     , 'Speed restriction areas'      , opacity, 'geometria,haetunDatanVoimassaoloaika'                         , nraStyle, undefined, undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'liikennesuunnittelualueet', 'lis', 'Liikennesuunnittelualueet', 'Transportation planning areas', opacity, 'geometria,nimi,tunniste,haetunDatanVoimassaoloaika', undefined, undefined, undefined, kaavio, ajanhetki, aikavali)
        ]
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Sijainninmääritys','Positioning'),
        layers: [
            newVectorLayer(infraAPIUrl + 'paikantamismerkit', 'pai', 'Paikantamismerkit', 'Positioning markers', opacity, 'geometria,numero,sijainnit,tunniste,haetunDatanVoimassaoloaika'        , pmStyle, undefined, undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'kilometrimerkit'  , 'kil', 'Kilometrimerkit'  , 'Milestones',          opacity, 'geometria,pituus,ratakm,ratanumero,tunniste,haetunDatanVoimassaoloaika', kmStyle, undefined, undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'radat'            , 'rat', 'Radat'            , 'Railways',            opacity, 'geometria,ratanumero,tunniste,haetunDatanVoimassaoloaika'              , rataStyle, undefined, undefined, kaavio, ajanhetki, aikavali)
        ]
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Paikat','Locations'),
        layers: [
            newVectorLayer(infraAPIUrl + 'aikataulupaikat'       , 'aik', 'Aikataulupaikat'       , 'Timetable locations'     , opacity, 'geometria,tunniste,uickoodi,haetunDatanVoimassaoloaika'    , apStyle, undefined, undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'liikennepaikanosat'    , 'osa', 'Liikennepaikan osat'   , 'Parts of station'        , opacity, 'geometria,lyhenne,nimi,tunniste,haetunDatanVoimassaoloaika', lpOsaStyle, undefined, undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'rautatieliikennepaikat', 'rlv', 'Linjavaihteet'         , 'Line switches'           , opacity, 'geometria,lyhenne,nimi,tunniste,haetunDatanVoimassaoloaika', lvStyle    , 'linjavaihde', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'rautatieliikennepaikat', 'rse', 'Seisakkeet'            , 'Stops'                   , opacity, 'geometria,lyhenne,nimi,tunniste,haetunDatanVoimassaoloaika', seStyle    , 'seisake', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'rautatieliikennepaikat', 'rlp', 'Liikennepaikat'        , 'Stations'                , opacity, 'geometria,lyhenne,nimi,tunniste,haetunDatanVoimassaoloaika', lpStyle    , 'liikennepaikka', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'liikennepaikkavalit'   , 'lpv', 'Liikennepaikkavälit'   , 'Station intervals'       , opacity, 'geometria,tunniste,haetunDatanVoimassaoloaika'             , lpValiStyle, undefined, undefined, kaavio, ajanhetki, aikavali),
        ]
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Raiteet','Tracks'),
        layers: [
            newVectorLayer(infraAPIUrl + 'raideosuudet', 'avi', 'Äänitaajuusvirtapiirit', 'Audio frequency track circuits', opacity, 'geometria,tunniste,turvalaiteNimi,turvalaiteRaide,haetunDatanVoimassaoloaika', aanitaajuusvirtapiiriStyle, 'aanitaajuusvirtapiiri', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'raideosuudet', 'alo', 'Akselinlaskentaosuudet', 'Axle counting sections'        , opacity, 'geometria,tunniste,turvalaiteNimi,turvalaiteRaide,haetunDatanVoimassaoloaika', akselinlaskentaStyle      , 'akselinlaskentaosuus', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'raideosuudet', 'ero', 'Eristysosuudet'        , 'Track circuits'                , opacity, 'geometria,tunniste,turvalaiteNimi,turvalaiteRaide,haetunDatanVoimassaoloaika', eristysosuusStyle         , 'eristysosuus', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit'   , 'aks', 'Akselinlaskijat'       , 'Axle counters'                 , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika'          , elemStyle                 , 'akselinlaskija', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit'   , 'rae', 'Raide-eristykset'      , 'Rail insulations'              , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika'          , elemStyle                 , 'raideeristys', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'raiteet'     , 'rai', 'Raiteet'               , 'Tracks'                        , opacity, 'geometria,kuvaus,tunnus,tunniste,haetunDatanVoimassaoloaika'                 , raideStyle, undefined, undefined, kaavio, ajanhetki, aikavali)
        ]
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Muut','Others'),
        layers: [
            newVectorLayer(infraAPIUrl + 'liikenteenohjauksenrajat', 'lor', 'Liikenteenohjauksen rajat', 'Traffic control boundaries', opacity, 'ensimmaisenLuokanAlueidenRaja,leikkaukset.piste,rotaatio,tunniste,haetunDatanVoimassaoloaika', lorajaStyle, undefined, undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'tunnelit'                , 'tun', 'Tunnelit'                 , 'Tunnels'                   , opacity, 'geometria,nimi,tunniste,haetunDatanVoimassaoloaika'                                          , tunneliStyle, undefined, undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'sillat'                  , 'sil', 'Sillat'                   , 'Bridges'                   , opacity, 'geometria,nimi,siltakoodi,tunniste,haetunDatanVoimassaoloaika'                               , siltaStyle, undefined, undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'laiturit'                , 'lai', 'Laiturit'                 , 'Platforms'                 , opacity, 'geometria,kaupallinenNumero,tunniste,tunnus,haetunDatanVoimassaoloaika'                      , laituriStyle, undefined, undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'tasoristeykset'          , 'tas', 'Tasoristeykset'           , 'Level crossings'           , opacity, 'leikkaukset.piste,nimi,rotaatio,tunniste,tunnus,haetunDatanVoimassaoloaika'                  , tasoristeysStyle, undefined, undefined, kaavio, ajanhetki, aikavali)
        ]
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Sähköistys','Electrification'),
        layers: [
            newVectorLayer(infraAPIUrl + 'elementit'     , 'tyo', 'Työnaikaiset eristimet', 'Electrical work insulators', opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika'                                 , elemStyle         , 'tyonaikaineneristin', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit'     , 'maa', 'Maadoittimet'          , 'Grounding devices'         , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika'                                 , elemStyle         , 'maadoitin', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit'     , 'erk', 'Erotuskentät'          , 'Separation field'          , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika'                                 , elemStyle         , 'erotuskentta', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit'     , 'erj', 'Erotusjaksot'          , 'Separation sections'       , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika'                                 , elemStyle         , 'erotusjakso', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit'     , 'sah', 'Sähköistys päättyy'    , 'Electrification ends'      , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika'                                 , elemStyle         , 'sahkoistyspaattyy', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit'     , 'ryh', 'Ryhmityseristimet'     , 'Grouping insulators'       , opacity, 'geometria,nimi,rotaatio,ryhmityseristin.nopeastiAjettava,tunniste,tyyppi,haetunDatanVoimassaoloaika', elemStyle         , 'ryhmityseristin', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'kayttokeskukset', 'kay', 'Käyttökeskukset'      , 'Operations centres'        , opacity, 'geometria,nimi,tunniste,haetunDatanVoimassaoloaika', undefined, undefined, undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'kytkentaryhmat' , 'kyt', 'Kytkentäryhmät'       , 'Electrification groups'    , opacity, 'geometria,numero,tunniste,vari,haetunDatanVoimassaoloaika'                                          , kytkentaryhmaStyle, undefined, undefined, kaavio, ajanhetki, aikavali)
        ]
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Valvonta','Supervision'),
        layers: [].concat(
            newVectorLayer(infraAPIUrl + 'elementit', 'vir', 'Virroitinvalvontakamerat', 'Pantograph monitoring cameras', opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', elemStyle, 'virroitinvalvontakamera', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit', 'rfi', 'RFID-lukijat'            , 'RFID-readers'                 , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', elemStyle, 'rfidlukija', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit', 'pyo', 'Pyörävoimailmaisimet'    , 'Wheel force indicators'       , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', elemStyle, 'pyoravoimailmaisin', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit', 'kuu', 'Kuumakäynti-ilmaisimet'  , 'Hotbox detectors'             , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika', elemStyle, 'kuumakayntiilmaisin', undefined, kaavio, ajanhetki, aikavali)
        )
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Elementit','Elements'),
        layers: [
            newVectorLayer(infraAPIUrl + 'elementit', 'sei', 'Seislevyt'                , 'Stop boards'           , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika'                                                         , elemStyle, 'seislevy', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit', 'pys', 'Pysäytyslaitteet'         , 'Stop devices'          , opacity, 'geometria,nimi,pysaytyslaite.kasinAsetettava,pysaytyslaite.suojaussuunta,pysaytyslaite.varmuuslukittu,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika'                            , elemStyle, 'raiteensulku', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit', 'lir', 'Liikennepaikan rajamerkit', 'Station boundary marks', opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika'                                                         , elemStyle, 'liikennepaikanraja', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit', 'bal', 'Baliisit'                 , 'Balises'               , opacity, 'baliisi.toistopiste,geometria,nimi,rotaatio,baliisi.suunta,tunniste,tyyppi,haetunDatanVoimassaoloaika'                      , elemStyle, 'baliisi', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit', 'opa', 'Opastimet'                , 'Signals'               , opacity, 'geometria,nimi,opastin.puoli,opastin.suunta,opastin.tyyppi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika'             , elemStyle, 'opastin', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit', 'pus', 'Puskimet'                 , 'Buffers'               , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,haetunDatanVoimassaoloaika'                                                         , elemStyle, 'puskin', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'elementit', 'vai', 'Vaihteet'                 , 'Switches'              , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,vaihde.kasikaantoisyys,vaihde.risteyssuhde,vaihde.tyyppi,haetunDatanVoimassaoloaika', elemStyle, 'vaihde', undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(infraAPIUrl + 'raiteensulut', 'ras', 'Raiteensulut'          , 'Derailers'             , opacity, 'leikkaukset.piste,nimi,kasinAsetettava,suistosuunta,rotaatio,tunniste,haetunDatanVoimassaoloaika'                           , raiteensulkuStyle, undefined, undefined, kaavio, ajanhetki, aikavali)
        ]
    }),

    new ol.layer.Group({
        title: mkLayerTitle('Ennakkotiedot','Plans & announcements'),
        layers: [
            newVectorLayer(etj2APIUrl + 'vuosisuunnitelmat'  , 'vs' , 'Vuosisuunnitelmat'  , 'Yearly plans'                    , opacity, 'laskennallinenKarttapiste,tila,tunniste,voimassa', vsStyle, undefined, undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(etj2APIUrl + 'ennakkosuunnitelmat', 'es' , 'Ennakkosuunnitelmat', 'Preliminary plans'               , opacity, 'laskennallinenKarttapiste,tila,tunniste,voimassa', esStyle, undefined, undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(etj2APIUrl + 'ennakkoilmoitukset' , 'ei' , 'Ennakkoilmoitukset' , 'Route announcements'             , opacity, 'laskennallinenKarttapiste,tila,tunniste,voimassa', eiStyle, undefined, undefined, kaavio, ajanhetki, aikavali),
            newVectorLayer(etj2APIUrl + 'loilmoitukset'      , 'loi', 'LOilmoitukset'      , 'Traffic controller announcements', opacity, 'ensimmainenAktiivisuusaika,laskennallinenKarttapiste,tila,tunniste,viimeinenAktiivisuusaika', loStyle, undefined, undefined, kaavio, ajanhetki, aikavali)
        ]
    }),

    new ol.layer.Group({
        title: mkLayerTitle('Ruma','Ruma'),
        layers: [
            newVectorLayerNoTile(rtGeojsonUrl(), 'rt', 'Ratatyöt'            , 'Track works'         , opacity, undefined, rtStyle, undefined, rumaPrepareFeatures, kaavio, ajanhetki, aikavali),
            newVectorLayerNoTile(lrGeojsonUrl(), 'lr', 'Liikenteenrajoitteet', 'Traffic restrictions', opacity, undefined, lrStyle, undefined, rumaPrepareFeatures, kaavio, ajanhetki, aikavali)
        ]
    }),

    new ol.layer.Group({
        title: mkLayerTitle('Junat','Trains'),
        layers: [
            newVectorLayerNoTile(junasijainnitGeojsonUrl(), 'tr', 'Junat', 'Trains', opacity, undefined, trainStyle, undefined, junaPrepareFeatures, kaavio, ajanhetki, aikavali),
        ]
    })
];