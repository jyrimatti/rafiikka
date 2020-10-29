let newVectorLayer =        (url, shortName, title_fi, title_en, opacity, propertyName, styleOrHandler, typeNames, projection) =>
    newVectorLayerImpl(true, url, shortName, title_fi, title_en, opacity, propertyName, styleOrHandler, typeNames, projection);

let newVectorLayerNoTile =   (url, shortName, title_fi, title_en, opacity, propertyName, styleOrHandler, typeNames, projection) =>
    newVectorLayerImpl(false, url, shortName, title_fi, title_en, opacity, propertyName, styleOrHandler, typeNames, projection);

// TODO:
let kaavio = false;

let newVectorLayerImpl = (tiling, url, shortName, title_fi, title_en, opacity, propertyName, styleOrHandler, typeNames, prepareFeatures) => {
    var u1 = url + (url.indexOf('?') < 0 ? '?' : '&');
    u1 = u1.indexOf('.json') >= 0 ? u1.replace('.json', '.geojson') : u1.indexOf('.geojson') < 0 ? u1.replace('?', '.geojson?') : u1; 
    var u2 = (!kaavio                                                 ? '' : '&presentation=diagram') +
             (!propertyName                                           ? '' : '&propertyName=' + propertyName) +
             (url.indexOf('time=') >= 0 || url.indexOf('start=') >= 0 ? '' : '&' + infraAikavali()) +
             (!typeNames                                              ? '' : '&typeNames=' + typeNames);

    let source = new ol.source.Vector({
        format:     format,
        projection: projection,
        strategy:   tiling ? ol.loadingstrategy.tile(tileGrid) : ol.loadingstrategy.all,
        loader:     extent => {
            fetch((u1 + (tiling ? '&bbox=' + extent.join(',') : '') + u2).replace('?&','?'), {
                method: 'GET'/*,
                headers: {'Digitraffic-User': 'Rafiikka'}*/
            }).then(response => response.json())
              .then(response => {
                    let features = format.readFeatures(response);
                    if (styleOrHandler instanceof Function) {
                        if (styleOrHandler.length == 1) {
                            // on feature load
                            features.forEach(styleOrHandler);
                        } else {
                            // dynamic style
                            features.forEach(f => f.setStyle(styleOrHandler));
                        }
                    }
                    if (prepareFeatures) {
                        source.addFeatures(prepareFeatures(features));
                    } else {
                        source.addFeatures(features);
                    }
                })
              .catch(errorHandler);
        }
    });
    var layer = new ol.layer.Vector({
        title:                  mkLayerTitle(title_fi, title_en),
        shortName:              shortName,
        source:                 source,
        opacity:                opacity || 1.0,
        style:                  styleOrHandler instanceof Function ? undefined : styleOrHandler,
        //extent: dataExtent[projection.getCode()],
        renderBuffer:           500,
        updateWhileInteracting: true,
        updateWhileAnimating:   true
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

let projectFeature = projection => f => f.setGeometry(f.getGeometry().transform(ol.proj.get('EPSG:4326'), projection));

let rumaPrepareFeatures = features => {
    features.forEach(projectFeature(projectionWGS));
    return groupRumaFeatures(features);
}
let opacity = 1.0;

let layers = [
    new ol.layer.Group({
        title: mkLayerTitle('Ratapihapalvelut','Rail yard services'),
        layers: [
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Vesiviskuri'                 , 'Water crane'            , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'vesiviskuri'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Vesipiste'                   , 'Water post'             , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'vesipiste'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Vaununsiirtolaite'           , 'Wagon transfer device'  , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'vaununsiirtolaite'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Varoallas'                   , 'Guard pool'             , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'varoallas'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Vaaka'                       , 'Scale'                  , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'vaaka'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Tankkauspiste'               , 'Refuelling point'       , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'tankkauspiste'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Sähkökeskus'                 , 'Electricity outlet'     , opacity, 'geometria,nimi,rotaatio,sahkokeskus.sahkokeskustyyppi,tunniste,tyyppi', ratapihapalveluStyle, 'sahkokeskus'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Raideleveyden vaihtolaite'   , 'Gauge conversion device', opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'raideleveydenvaihtolaite'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Paineilmaposti'              , 'Compressed air post'    , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'paineilmaposti'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'LVIposti'                    , 'Hvac post'              , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'lviposti'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Laskumäkijarrut'             , 'Hump brake'             , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'laskumakijarrut'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Lämmitysposti'               , 'Heating post'           , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'lammitysposti'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Laipanvoitelulaite'          , 'Flange lubricator'      , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'laipanvoitelulaite'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Kääntöpainikkeet'            , 'Reverse buttons'        , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'kaantopainikkeet'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Jarrujen koettelujärjestelmä', 'Brake test system'      , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'jarrujenkoettelujarjestelma'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Hiekanantolaite'             , 'Sand signaling device'  , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'hiekanantolaite'),
            newVectorLayer(infraAPIUrl + 'ratapihapalvelut', '', 'Alipainetyhjennyslaite'      , 'Vacuum drainage device' , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', ratapihapalveluStyle, 'alipainetyhjennyslaite')
        ]
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Alueet','Areas'),
        layers: [
            newVectorLayer(infraAPIUrl + 'toimialueet'              , 'toi', 'Toimialueet'              , 'Traffic control areas'        , opacity, 'nimi,tunniste,valit.geometria,vari', toimialueStyle),
            newVectorLayer(infraAPIUrl + 'tilirataosat'             , 'til', 'Tilirataosat'             , 'Accounting railway sections'  , opacity, 'geometria,nimi,numero,tunniste'),
            newVectorLayer(infraAPIUrl + 'nopeusrajoitusalueet'     , 'nop', 'Nopeusrajoitusalueet'     , 'Speed restriction areas'      , opacity, 'geometria'                         , nraStyle),
            newVectorLayer(infraAPIUrl + 'liikennesuunnittelualueet', 'lis', 'Liikennesuunnittelualueet', 'Transportation planning areas', opacity, 'geometria,nimi,tunniste')
        ]
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Sijainninmääritys','Positioning'),
        layers: [
            newVectorLayer(infraAPIUrl + 'paikantamismerkit', 'pai', 'Paikantamismerkit', 'Positioning markers', opacity, 'geometria,numero,sijainnit,tunniste'        , pmStyle),
            newVectorLayer(infraAPIUrl + 'kilometrimerkit'  , 'kil', 'Kilometrimerkit'  , 'Milestones',          opacity, 'geometria,pituus,ratakm,ratanumero,tunniste', kmStyle),
            newVectorLayer(infraAPIUrl + 'radat'            , 'rat', 'Radat'            , 'Railways',            opacity, 'geometria,ratanumero,tunniste'              , rataStyle)
        ]
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Paikat','Locations'),
        layers: [
            newVectorLayer(infraAPIUrl + 'aikataulupaikat'       , 'aik', 'Aikataulupaikat'       , 'Timetable locations'     , opacity, 'geometria,tunniste,uickoodi'    , apStyle),
            newVectorLayer(infraAPIUrl + 'liikennepaikanosat'    , 'osa', 'Liikennepaikan osat'   , 'Parts of station'        , opacity, 'geometria,lyhenne,nimi,tunniste', lpOsaStyle),
            newVectorLayer(infraAPIUrl + 'rautatieliikennepaikat', 'rlv', 'Linjavaihteet'         , 'Line switches'           , opacity, 'geometria,lyhenne,nimi,tunniste', lvStyle    , 'linjavaihde'),
            newVectorLayer(infraAPIUrl + 'rautatieliikennepaikat', 'rse', 'Seisakkeet'            , 'Stops'                   , opacity, 'geometria,lyhenne,nimi,tunniste', seStyle    , 'seisake'),
            newVectorLayer(infraAPIUrl + 'rautatieliikennepaikat', 'rlp', 'Liikennepaikat'        , 'Stations'                , opacity, 'geometria,lyhenne,nimi,tunniste', lpStyle    , 'liikennepaikka'),
            newVectorLayer(infraAPIUrl + 'liikennepaikkavalit'   , 'lpv', 'Liikennepaikkavälit'   , 'Station intervals'       , opacity, 'geometria,tunniste'             , lpValiStyle),
        ]
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Raiteet','Tracks'),
        layers: [
            newVectorLayer(infraAPIUrl + 'raideosuudet', 'avi', 'Äänitaajuusvirtapiirit', 'Audio frequency track circuits', opacity, 'geometria,tunniste,turvalaiteNimi,turvalaiteRaide', aanitaajuusvirtapiiriStyle, 'aanitaajuusvirtapiiri'),
            newVectorLayer(infraAPIUrl + 'raideosuudet', 'alo', 'Akselinlaskentaosuudet', 'Axle counting sections'        , opacity, 'geometria,tunniste,turvalaiteNimi,turvalaiteRaide', akselinlaskentaStyle      , 'akselinlaskentaosuus'),
            newVectorLayer(infraAPIUrl + 'raideosuudet', 'ero', 'Eristysosuudet'        , 'Track circuits'                , opacity, 'geometria,tunniste,turvalaiteNimi,turvalaiteRaide', eristysosuusStyle         , 'eristysosuus'),
            newVectorLayer(infraAPIUrl + 'elementit'   , 'aks', 'Akselinlaskijat'       , 'Axle counters'                 , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'          , elemStyle                 , 'akselinlaskija'),
            newVectorLayer(infraAPIUrl + 'elementit'   , 'rae', 'Raide-eristykset'      , 'Rail insulations'              , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'          , elemStyle                 , 'raideeristys'),
            newVectorLayer(infraAPIUrl + 'raiteet'     , 'rai', 'Raiteet'               , 'Tracks'                        , opacity, 'geometria,kuvaus,tunnus,tunniste'                 , raideStyle)
        ]
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Muut','Others'),
        layers: [
            newVectorLayer(infraAPIUrl + 'liikenteenohjauksenrajat', 'lor', 'Liikenteenohjauksen rajat', 'Traffic control boundaries', opacity, 'ensimmaisenLuokanAlueidenRaja,leikkaukset.piste,rotaatio,tunniste', lorajaStyle),
            newVectorLayer(infraAPIUrl + 'tunnelit'                , 'tun', 'Tunnelit'                 , 'Tunnels'                   , opacity, 'geometria,nimi,tunniste'                                          , tunneliStyle),
            newVectorLayer(infraAPIUrl + 'sillat'                  , 'sil', 'Sillat'                   , 'Bridges'                   , opacity, 'geometria,nimi,siltakoodi,tunniste'                               , siltaStyle),
            newVectorLayer(infraAPIUrl + 'laiturit'                , 'lai', 'Laiturit'                 , 'Platforms'                 , opacity, 'geometria,kaupallinenNumero,tunniste,tunnus'                      , laituriStyle),
            newVectorLayer(infraAPIUrl + 'tasoristeykset'          , 'tas', 'Tasoristeykset'           , 'Level crossings'           , opacity, 'leikkaukset.piste,nimi,rotaatio,tunniste,tunnus'                  , tasoristeysStyle)
        ]
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Sähköistys','Electrification'),
        layers: [
            newVectorLayer(infraAPIUrl + 'elementit'     , 'tyo', 'Työnaikaiset eristimet', 'Electrical work insulators', opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                 , elemStyle         , 'tyonaikaineneristin'),
            newVectorLayer(infraAPIUrl + 'elementit'     , 'maa', 'Maadoittimet'          , 'Grounding devices'         , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                 , elemStyle         , 'maadoitin'),
            newVectorLayer(infraAPIUrl + 'elementit'     , 'erk', 'Erotuskentät'          , 'Separation field'          , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                 , elemStyle         , 'erotuskentta'),
            newVectorLayer(infraAPIUrl + 'elementit'     , 'erj', 'Erotusjaksot'          , 'Separation sections'       , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                 , elemStyle         , 'erotusjakso'),
            newVectorLayer(infraAPIUrl + 'elementit'     , 'sah', 'Sähköistys päättyy'    , 'Electrification ends'      , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                 , elemStyle         , 'sahkoistyspaattyy'),
            newVectorLayer(infraAPIUrl + 'elementit'     , 'ryh', 'Ryhmityseristimet'     , 'Grouping insulators'       , opacity, 'geometria,nimi,rotaatio,ryhmityseristin.nopeastiAjettava,tunniste,tyyppi', elemStyle         , 'ryhmityseristin'),
            newVectorLayer(infraAPIUrl + 'kayttokeskukset', 'kay', 'Käyttökeskukset'      , 'Operations centres'        , opacity, 'geometria,nimi,tunniste'),
            newVectorLayer(infraAPIUrl + 'kytkentaryhmat' , 'kyt', 'Kytkentäryhmät'       , 'Electrification groups'    , opacity, 'geometria,numero,tunniste,vari'                                          , kytkentaryhmaStyle)
        ]
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Valvonta','Supervision'),
        layers: [].concat(
            newVectorLayer(infraAPIUrl + 'elementit', 'vir', 'Virroitinvalvontakamerat', 'Pantograph monitoring cameras', opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', elemStyle, 'virroitinvalvontakamera'),
            newVectorLayer(infraAPIUrl + 'elementit', 'rfi', 'RFID-lukijat'            , 'RFID-readers'                 , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', elemStyle, 'rfidlukija'),
            newVectorLayer(infraAPIUrl + 'elementit', 'pyo', 'Pyörävoimailmaisimet'    , 'Wheel force indicators'       , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', elemStyle, 'pyoravoimailmaisin'),
            newVectorLayer(infraAPIUrl + 'elementit', 'kuu', 'Kuumakäynti-ilmaisimet'  , 'Hotbox detectors'             , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi', elemStyle, 'kuumakayntiilmaisin')
        )
    }),
    new ol.layer.Group({
        title: mkLayerTitle('Elementit','Elements'),
        layers: [
            newVectorLayer(infraAPIUrl + 'elementit', 'sei', 'Seislevyt'                , 'Stop boards'           , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                                         , elemStyle, 'seislevy'),
            newVectorLayer(infraAPIUrl + 'elementit', 'ras', 'Raiteensulut'             , 'Derailers'             , opacity, 'geometria,nimi,raiteensulku.kasinAsetettava,rotaatio,tunniste,tyyppi'                            , elemStyle, 'raiteensulku'),
            newVectorLayer(infraAPIUrl + 'elementit', 'lir', 'Liikennepaikan rajamerkit', 'Station boundary marks', opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                                         , elemStyle, 'liikennepaikanraja'),
            newVectorLayer(infraAPIUrl + 'elementit', 'bal', 'Baliisit'                 , 'Balises'               , opacity, 'baliisi.toistopiste,geometria,nimi,rotaatio,baliisi.suunta,tunniste,tyyppi'                      , elemStyle, 'baliisi'),
            newVectorLayer(infraAPIUrl + 'elementit', 'opa', 'Opastimet'                , 'Signals'               , opacity, 'geometria,nimi,opastin.puoli,opastin.suunta,opastin.tyyppi,rotaatio,tunniste,tyyppi'             , elemStyle, 'opastin'),
            newVectorLayer(infraAPIUrl + 'elementit', 'pus', 'Puskimet'                 , 'Buffers'               , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                                         , elemStyle, 'puskin'),
            newVectorLayer(infraAPIUrl + 'elementit', 'vai', 'Vaihteet'                 , 'Switches'              , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,vaihde.kasikaantoisyys,vaihde.risteyssuhde,vaihde.tyyppi', elemStyle, 'vaihde')
        ]
    }),

    new ol.layer.Group({
        title: mkLayerTitle('Ennakkotiedot','Plans & announcements'),
        layers: [
            newVectorLayer(etj2APIUrl + 'vuosisuunnitelmat'  , 'vs' , 'Vuosisuunnitelmat'  , 'Yearly plans'                    , opacity, 'laskennallinenKarttapiste,tila,tunniste,voimassa', vsStyle),
            newVectorLayer(etj2APIUrl + 'ennakkosuunnitelmat', 'es' , 'Ennakkosuunnitelmat', 'Preliminary plans'               , opacity, 'laskennallinenKarttapiste,tila,tunniste,voimassa', esStyle),
            newVectorLayer(etj2APIUrl + 'ennakkoilmoitukset' , 'ei' , 'Ennakkoilmoitukset' , 'Route announcements'             , opacity, 'laskennallinenKarttapiste,tila,tunniste,voimassa', eiStyle),
            newVectorLayer(etj2APIUrl + 'loilmoitukset'      , 'loi', 'LOilmoitukset'      , 'Traffic controller announcements', opacity, 'laskennallinenKarttapiste,tila,tunniste', loStyle)
        ]
    }),

    new ol.layer.Group({
        title: mkLayerTitle('Ruma','Ruma'),
        layers: [
            newVectorLayerNoTile(rtGeojsonUrl(), 'rt', 'Ratatyöt'            , 'Track works'         , opacity, undefined, rtStyle, undefined, rumaPrepareFeatures),
            newVectorLayerNoTile(lrGeojsonUrl(), 'lr', 'Liikenteenrajoitteet', 'Traffic restrictions', opacity, undefined, lrStyle, undefined, rumaPrepareFeatures)
        ]
    })
];