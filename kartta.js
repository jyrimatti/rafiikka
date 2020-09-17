let world = [50199.4814, 6582464.0358, 761274.6247, 7799839.8902];
		
let dataExtent = {
    'EPSG:3067': [-24288,6553600,762144,7864320],
    'EPSG:3857': [1993605.70,8137522.85,3800073.33,11315415.76]
};
		
// JHS-180-recommendation, with two removed from beginning and four appended to the end
let resolutions = [ /*8192, 4096,*/ 2048,  1024,   512,   256,   128,    64,    32,    16,     8,     4,     2,     1,    0.5,   0.25,  0.125,  0.0625, 0.03125, 0.015625];
let tileSizes   = [ /* 128,  256,*/  128, 256*1, 256*2, 256*4, 256*1, 256*2, 256*4, 256*8, 256*1, 256*2, 256*4, 256*8, 256*16, 256*32, 256*64, 256*128, 256*256,  256*512];
    
// corresponding "good guesses" to svg-icon scalings
let scales      = [ /*0.25, 0.25,*/ 0.25,  0.25,  0.25,  0.25,  0.25,  0.25,  0.25,  0.25,  0.25,   0.5,  0.75,     1,   1.25,    1.5,      2,       3,       4,        5];

let format = new ol.format.GeoJSON();

proj4.defs("EPSG:3067", "+proj=utm +zone=35 +ellps=GRS80 +units=m +no_defs");
ol.proj.proj4.register(proj4);

let projection = ol.proj.get('EPSG:3067');

let tileGrid = new ol.tilegrid.TileGrid({
    resolutions: resolutions,
    tileSizes: tileSizes,
    extent: dataExtent[projection.getCode()]
});

let newVectorLayer = (url, shortName, title_fi, title_en, opacity, propertyName, styleOrHandler, typeNames) => {
    return newVectorLayerImpl(true, url, shortName, title_fi, title_en, opacity, propertyName, styleOrHandler, typeNames);
};

let newVectorLayerNoTile = (url, shortName, title_fi, title_en, opacity, propertyName, styleOrHandler, typeNames) => {
    return newVectorLayerImpl(false, url, shortName, title_fi, title_en, opacity, propertyName, styleOrHandler, typeNames);
};

let kaavio = false;

let newVectorLayerImpl = (tiling, url, shortName, title_fi, title_en, opacity, propertyName, styleOrHandler, typeNames) => {
    var u1 = url + (url.indexOf('?') < 0 ? '?' : '&');
    u1 = u1.indexOf('.geojson') < 0 ? u1.replace('?', '.geojson?') : u1; 
    var u2 = (!propertyName ? '' : '&propertyName=' + propertyName) +
             (projection.getCode() == '3067' ? '' : '&srsName=' + projection.getCode().toLowerCase()) +
             (url.indexOf('time=') >= 0 ? '' : infraAikavali()) +
             (!typeNames ? '' : '&typeNames=' + typeNames);

    var source = new ol.source.Vector({
        format: format,
        //projection: projection,
        strategy: tiling ? ol.loadingstrategy.tile(tileGrid) : ol.loadingstrategy.all,
        loader: extent => {
            fetch((u1 + (tiling ? '&bbox=' + extent.join(',') : '') + (kaavio ? '&presentation=diagram' : '') + u2).replace('?&','?'), {
                method: 'GET',
                headers: {'Digitraffic-User': 'Rafiikka'}
            }).then(response => response.json())
              .then(response => {
                var features = format.readFeatures(response);
                    if (styleOrHandler instanceof Function) {
                        if (styleOrHandler.length == 1) {
                            // on feature load
                            features.forEach(styleOrHandler);
                        } else {
                            // dynamic style
                            features.forEach(f => { f.setStyle(styleOrHandler); });
                        }
                    }
                    source.addFeatures(features);
                })
              .catch(errorHandler);
        }
    });
    var layer = new ol.layer.Vector({
        title: mkLayerTitle(title_fi, title_en),
        shortName: shortName,
        source: source,
        opacity: opacity || 1.0,
        style: styleOrHandler instanceof Function ? undefined : styleOrHandler,
        //extent: dataExtent[projection.getCode()],
        renderBuffer: 500,
        updateWhileInteracting: true,
        updateWhileAnimating: true
    });
    layer.setVisible(false);
    return layer;
};

let mkLayerTitle = (title_fi, title_en) => {
    return '<span class="fi">' + title_fi + '</span><span class="en">' + title_en + '</span>';
};

let tileLayer = (title, source, opacity) =>
    new ol.layer.Tile({
        title: title,
        tileGrid: tileGrid,
        opacity: opacity || 0.3,
        source: source,
        //extent: dataExtent[projection.getCode()],
        renderBuffer: 500,
        updateWhileInteracting: true,
        updateWhileAnimating: true
    });

let opacity = 1.0;

let layers = [
            new ol.layer.Group({
                title: mkLayerTitle('Ratapihapalvelut','Rail yard services'),
                layers: [].concat(
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
                )
            }),
            new ol.layer.Group({
                title: mkLayerTitle('Alueet','Areas'),
                layers: [].concat(
                    newVectorLayer(infraAPIUrl + 'toimialueet'              , 'toi', 'Toimialueet'              , 'Traffic control areas'        , opacity, 'nimi,tunniste,valit.geometria,vari', toimialueStyle),
                    newVectorLayer(infraAPIUrl + 'tilirataosat'             , 'til', 'Tilirataosat'             , 'Accounting railway sections'  , opacity, 'geometria,nimi,numero,tunniste'),
                    newVectorLayer(infraAPIUrl + 'nopeusrajoitusalueet'     , 'nop', 'Nopeusrajoitusalueet'     , 'Speed restriction areas'      , opacity, 'geometria'                         , nraStyle),
                    newVectorLayer(infraAPIUrl + 'liikennesuunnittelualueet', 'lis', 'Liikennesuunnittelualueet', 'Transportation planning areas', opacity, 'geometria,nimi,tunniste')
                )
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
                layers: [].concat(
                    newVectorLayer(infraAPIUrl + 'aikataulupaikat'       , 'aik', 'Aikataulupaikat'       , 'Timetable locations'     , opacity, 'geometria,tunniste,uickoodi'    , apStyle),
                    newVectorLayer(infraAPIUrl + 'liikennepaikanosat'    , 'osa', 'Liikennepaikan osat'   , 'Parts of station'        , opacity, 'geometria,lyhenne,nimi,tunniste', lpOsaStyle),
                    newVectorLayer(infraAPIUrl + 'rautatieliikennepaikat', 'rlv', 'Linjavaihteet'         , 'Line switches'           , opacity, 'geometria,lyhenne,nimi,tunniste', lvStyle    , 'linjavaihde'),
                    newVectorLayer(infraAPIUrl + 'rautatieliikennepaikat', 'rse', 'Seisakkeet'            , 'Stops'                   , opacity, 'geometria,lyhenne,nimi,tunniste', seStyle    , 'seisake'),
                    newVectorLayer(infraAPIUrl + 'rautatieliikennepaikat', 'rlp', 'Liikennepaikat'        , 'Stations'                , opacity, 'geometria,lyhenne,nimi,tunniste', lpStyle    , 'liikennepaikka'),
                    newVectorLayer(infraAPIUrl + 'liikennepaikkavalit'   , 'lpv', 'Liikennepaikkavälit'   , 'Station intervals'       , opacity, 'geometria,tunniste'             , lpValiStyle),
                )
            }),
            new ol.layer.Group({
                title: mkLayerTitle('Raiteet','Tracks'),
                layers: [].concat(
                    newVectorLayer(infraAPIUrl + 'raideosuudet', 'avi', 'Äänitaajuusvirtapiirit', 'Audio frequency track circuits', opacity, 'geometria,tunniste,turvalaiteNimi,turvalaiteRaide', aanitaajuusvirtapiiriStyle, 'aanitaajuusvirtapiiri'),
                    newVectorLayer(infraAPIUrl + 'raideosuudet', 'alo', 'Akselinlaskentaosuudet', 'Axle counting sections'        , opacity, 'geometria,tunniste,turvalaiteNimi,turvalaiteRaide', akselinlaskentaStyle      , 'akselinlaskentaosuus'),
                    newVectorLayer(infraAPIUrl + 'raideosuudet', 'ero', 'Eristysosuudet'        , 'Track circuits'                , opacity, 'geometria,tunniste,turvalaiteNimi,turvalaiteRaide', eristysosuusStyle         , 'eristysosuus'),
                    newVectorLayer(infraAPIUrl + 'elementit'   , 'aks', 'Akselinlaskijat'       , 'Axle counters'                 , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'          , elemStyle                 , 'akselinlaskija'),
                    newVectorLayer(infraAPIUrl + 'elementit'   , 'rae', 'Raide-eristykset'      , 'Rail insulations'              , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'          , elemStyle                 , 'raideeristys'),
                    newVectorLayer(infraAPIUrl + 'raiteet'     , 'rai', 'Raiteet'               , 'Tracks'                        , opacity, 'geometria,kuvaus,tunnus,tunniste'                 , raideStyle)
                )
            }),
            new ol.layer.Group({
                title: mkLayerTitle('Muut','Others'),
                layers: [].concat(
                    newVectorLayer(infraAPIUrl + 'liikenteenohjauksenrajat', 'lor', 'Liikenteenohjauksen rajat', 'Traffic control boundaries', opacity, 'ensimmaisenLuokanAlueidenRaja,leikkaukset.piste,rotaatio,tunniste', lorajaStyle),
                    newVectorLayer(infraAPIUrl + 'tunnelit'                , 'tun', 'Tunnelit'                 , 'Tunnels'                   , opacity, 'geometria,nimi,tunniste'                                          , tunneliStyle),
                    newVectorLayer(infraAPIUrl + 'sillat'                  , 'sil', 'Sillat'                   , 'Bridges'                   , opacity, 'geometria,nimi,siltakoodi,tunniste'                               , siltaStyle),
                    newVectorLayer(infraAPIUrl + 'laiturit'                , 'lai', 'Laiturit'                 , 'Platforms'                 , opacity, 'geometria,kaupallinenNumero,tunniste,tunnus'                      , laituriStyle),
                    newVectorLayer(infraAPIUrl + 'tasoristeykset'          , 'tas', 'Tasoristeykset'           , 'Level crossings'           , opacity, 'leikkaukset.piste,nimi,rotaatio,tunniste,tunnus'                  , tasoristeysStyle)
                )
            }),
            new ol.layer.Group({
                title: mkLayerTitle('Sähköistys','Electrification'),
                layers: [].concat(
                    newVectorLayer(infraAPIUrl + 'elementit'     , 'tyo', 'Työnaikaiset eristimet', 'Electrical work insulators', opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                 , elemStyle         , 'tyonaikaineneristin'),
                    newVectorLayer(infraAPIUrl + 'elementit'     , 'maa', 'Maadoittimet'          , 'Grounding devices'         , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                 , elemStyle         , 'maadoitin'),
                    newVectorLayer(infraAPIUrl + 'elementit'     , 'erk', 'Erotuskentät'          , 'Separation field'          , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                 , elemStyle         , 'erotuskentta'),
                    newVectorLayer(infraAPIUrl + 'elementit'     , 'erj', 'Erotusjaksot'          , 'Separation sections'       , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                 , elemStyle         , 'erotusjakso'),
                    newVectorLayer(infraAPIUrl + 'elementit'     , 'sah', 'Sähköistys päättyy'    , 'Electrification ends'      , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                 , elemStyle         , 'sahkoistyspaattyy'),
                    newVectorLayer(infraAPIUrl + 'elementit'     , 'ryh', 'Ryhmityseristimet'     , 'Grouping insulators'       , opacity, 'geometria,nimi,rotaatio,ryhmityseristin.nopeastiAjettava,tunniste,tyyppi', elemStyle         , 'ryhmityseristin'),
                    newVectorLayer(infraAPIUrl + 'kayttokeskukset', 'kay', 'Käyttökeskukset'      , 'Operations centres'        , opacity, 'geometria,nimi,tunniste'),
                    newVectorLayer(infraAPIUrl + 'kytkentaryhmat' , 'kyt', 'Kytkentäryhmät'       , 'Electrification groups'    , opacity, 'geometria,numero,tunniste,vari'                                          , kytkentaryhmaStyle)
                )
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
                layers: [].concat(
                    newVectorLayer(infraAPIUrl + 'elementit', 'sei', 'Seislevyt'                , 'Stop boards'           , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                                         , elemStyle, 'seislevy'),
                    newVectorLayer(infraAPIUrl + 'elementit', 'ras', 'Raiteensulut'             , 'Derailers'             , opacity, 'geometria,nimi,raiteensulku.kasinAsetettava,rotaatio,tunniste,tyyppi'                            , elemStyle, 'raiteensulku'),
                    newVectorLayer(infraAPIUrl + 'elementit', 'lir', 'Liikennepaikan rajamerkit', 'Station boundary marks', opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                                         , elemStyle, 'liikennepaikanraja'),
                    newVectorLayer(infraAPIUrl + 'elementit', 'bal', 'Baliisit'                 , 'Balises'               , opacity, 'baliisi.toistopiste,geometria,nimi,rotaatio,baliisi.suunta,tunniste,tyyppi'                      , elemStyle, 'baliisi'),
                    newVectorLayer(infraAPIUrl + 'elementit', 'opa', 'Opastimet'                , 'Signals'               , opacity, 'geometria,nimi,opastin.puoli,opastin.suunta,opastin.tyyppi,rotaatio,tunniste,tyyppi'             , elemStyle, 'opastin'),
                    newVectorLayer(infraAPIUrl + 'elementit', 'pus', 'Puskimet'                 , 'Buffers'               , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi'                                                         , elemStyle, 'puskin'),
                    newVectorLayer(infraAPIUrl + 'elementit', 'vai', 'Vaihteet'                 , 'Switches'              , opacity, 'geometria,nimi,rotaatio,tunniste,tyyppi,vaihde.kasikaantoisyys,vaihde.risteyssuhde,vaihde.tyyppi', elemStyle, 'vaihde')
                )
            }),

            new ol.layer.Group({
                title: mkLayerTitle('Ennakkotiedot','Plans & announcements'),
                layers: [].concat(
                    newVectorLayer(etj2APIUrl + 'vuosisuunnitelmat'  , 'vs' , 'Vuosisuunnitelmat'  , 'Yearly plans'                    , opacity, 'laskennallinenKarttapiste,tila,tunniste,voimassa', vsStyle),
                    newVectorLayer(etj2APIUrl + 'ennakkosuunnitelmat', 'es' , 'Ennakkosuunnitelmat', 'Preliminary plans'               , opacity, 'laskennallinenKarttapiste,tila,tunniste,voimassa', esStyle),
                    newVectorLayer(etj2APIUrl + 'ennakkoilmoitukset' , 'ei' , 'Ennakkoilmoitukset' , 'Route announcements'             , opacity, 'laskennallinenKarttapiste,tila,tunniste,voimassa', eiStyle),
                    newVectorLayer(etj2APIUrl + 'loilmoitukset'      , 'loi', 'LOilmoitukset'      , 'Traffic controller announcements', opacity, 'laskennallinenKarttapiste,tila,tunniste', loStyle)
                )})
        ];

let luoKarttaElementti = (tunniste, title) => {
    let [container, elemHeader] = luoIkkuna(title);
    container.setAttribute("class", "popupContainer");

    let open = document.createElement("div");
    open.setAttribute("class", "open");
    if (tunniste.startsWith('1.2.246.586.1')) {
        open.innerHTML = "<a href='https://rata.digitraffic.fi/infra-api/#" + tunniste + "' target='_blank'><img src='https://rata.digitraffic.fi/infra-api/r/favicon.ico' alt='Avaa Infra-API:ssa' /></a>";    
    } else if (tunniste.startsWith('1.2.246.586.2')) {
        open.innerHTML = "<a href='https://rata.digitraffic.fi/infra-api/#" + tunniste + "' target='_blank'><img src='https://rata.digitraffic.fi/infra-api/r/favicon.ico' alt='Avaa Infra-API:ssa' /></a>" +
                         "<a href='https://rata.digitraffic.fi/jeti-api/#"  + tunniste + "' target='_blank'><img src='https://rata.digitraffic.fi/jeti-api/r/favicon.ico' alt='Avaa Jeti-API:ssa' /></a>";    
    }
    elemHeader.appendChild(open);

    let kartta = document.createElement("div");
    kartta.setAttribute("class", "kartta");
    container.appendChild(kartta);

    dragElement(container, onDrop);

    return kartta;
};

let onDrop = (source, target) => {
    let sourceMap = source.getElementsByClassName('kartta')[0].kartta;
    let targetMap = target.getElementsByClassName('kartta')[0].kartta;
    if (targetMap != sourceMap) {
        sourceMap.getLayers().getArray()
                 .filter(layer => !targetMap.getLayers().getArray().find(l => l.get('title') == layer.get('title')))
                 .forEach(x => {
            sourceMap.removeLayer(x);
            targetMap.addLayer(x);
        });
        sourceMap.getInteractions().getArray().forEach(x => {
            sourceMap.removeInteraction(x);
            targetMap.addInteraction(x);
        });
        sourceMap.getOverlays().getArray().forEach(x => {
            sourceMap.removeOverlay(x);
            targetMap.addOverlay(x);
        });

        source.parentElement.removeChild(source);
        source.remove();
        target.getElementsByClassName('title')[0].innerText = '...';
        target.getElementsByClassName('header')[0].getElementsByTagName('a').forEach(e => { e.innerHTML = ''; });
    }
}

let etsiJuna = tunniste => window.junatSeries.dataSource.data.find(j => j.departureDate + ' (' + j.trainNumber + ')' == tunniste);

let mkPoint = coordinates => new ol.geom.Point(coordinates).transform(ol.proj.get('EPSG:4326'), projection);

let junaLayer = (map,tunniste) => {
    let src = new ol.source.Vector({
        strategy: ol.loadingstrategy.all,
        loader: _ => {
            let juna = etsiJuna(tunniste);
            if (juna) {
                src.addFeature(new ol.Feature({
                    geometry: mkPoint(juna.location),
                    name: tunniste
                }));
            };
        }
    });

    let layer = new ol.layer.Vector({
        title: mkLayerTitle(tunniste, tunniste),
        source: src
    });

    let paivitaYksikot = map => () => {
        if (layer.getVisible()) {
            src.getFeatures().forEach(f => {
                let juna = etsiJuna(tunniste);
                if (juna) {
                    layer.setVisible(true);
                    let loc = mkPoint(juna.location);
                    let geom = f.getGeometry();
                    if (geom.getCoordinates()[0] != loc.getCoordinates()[0] || geom.getCoordinates()[1] != loc.getCoordinates()[1]) {
                        log("Siirretään junaa", tunniste, geom.getCoordinates(), "->", loc.getCoordinates());
                        geom.translate(loc.getCoordinates()[0] - geom.getCoordinates()[0], loc.getCoordinates()[1] - geom.getCoordinates()[1]);
                        map.getView().setCenter(loc.getCoordinates());
                    }
                } else {
                    layer.setVisible(false);
                }
            });
        }
    }
    setInterval(paivitaYksikot(map), 1000);

    return layer;
}

let kartta = (tunniste, title, infraAPIPath) => {
    let elem = luoKarttaElementti(tunniste, title || tunniste);
    let overlay = new ol.Overlay({
        element: elem.parentElement.getElementsByClassName('popup')[0],
        offset: [5, 5]
    });
    let map = new ol.Map({
        target: elem,
        overlays: [overlay],
        layers: layers.concat([
            tileLayer(mkLayerTitle('Tausta', 'Background'), new ol.source.OSM()),
            //tileLayer('Debug', new ol.source.TileDebug({projection: projection, tileGrid: tileGrid}, opacity))
        ]),
        view: new ol.View({
            center: [342900, 6820390],//ol.proj.fromLonLat(center || [24.0490989,61.4858273]),
            resolution: 2048,
            resolutions: resolutions,
            projection: projection
        }),
        controls: [
            new ol.control.Attribution({collapsible: false}),
            new ol.control.Zoom(),
            new ol.control.ZoomSlider(),
            new ol.control.ScaleLine(),
            new ol.control.MousePosition({
                coordinateFormat: function(c) {
                    return Math.round(c[0]) + "," + Math.round(c[1]);
                }
            }),
            new ol.control.LayerSwitcher()
        ]
    });
    elem.kartta = map;
    map.addInteraction(hover(overlay, layers));

    let onkoJuna = tunniste.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}\s*\([0-9]+\)/);
    
    if (!onkoJuna) {
        avaaInfo(tunniste);
    }

    let preselectLayer = onkoJuna
        ? junaLayer(map,tunniste)
        : newVectorLayerNoTile((tunniste.startsWith('1.2.246.586.2') ? etj2APIUrl : infraAPIUrl) + (infraAPIPath || tunniste), tunniste, tunniste, tunniste);
    preselectLayer.setVisible(true);
    map.addLayer(preselectLayer);
    preselectLayer.once('change', () => {
        map.getView().fit(preselectLayer.getSource().getExtent(), {'maxZoom': 10, 'padding': [50,50,50,50], 'duration': 1000});
    });
    map.addInteraction(hover(overlay, [preselectLayer]));

    var observer = new MutationObserver(mutations => {
        mutations.forEach( () => {
            setTimeout( function() { map.updateSize();}, 200);
        });    
    });
    observer.observe(elem.parentElement, { attributes : true, attributeFilter : ['style'] });

    return map;
}

let hover = (overlay, layers) => {
    let hoverInteraction = new ol.interaction.Select({
        hitTolerance: 2,
        //multi: true,
        condition: ol.events.condition.pointerMove,
        layers: [].concat.apply([], layers.map(function(l) { return (l instanceof ol.layer.Group) ? l.getLayers().getArray() : l; }))
    });
    hoverInteraction.on('select', evt => {
        var hasFeature = false;
        evt.selected.forEach(feature => {
            var coordinate = evt.mapBrowserEvent.coordinate;
            if (overlay.getElement()) {
                overlay.getElement().innerHTML = prettyPrint(withoutProp(feature.getProperties(), 'geometry'));
            }
            overlay.setPosition(coordinate);
            hasFeature = true;

            tarkennaEnnakkotieto(evt.target.getMap(), feature.getProperties().tunniste);
        });
        if (!hasFeature) {
            overlay.setPosition(undefined);

            Object.values(evt.target.getMap().highlightLayers).forEach(function(layers) {
                layers.forEach(function(l) { l.setVisible(false); });
            });
        }
    });
    return hoverInteraction;
};

let cropIfConstrained = (voimassa, data, f) => {
    data.filter(pair => {
        // valitaan ennakkotiedon koko kohteesta oikea osakohde
        return pair.tunniste == f.getProperties().tunniste;
      }).map(pair => {
        let kmvali = pair.rajaus;
        // jos oli rajaus, niin tehdään taiat. Muuten jätetään geometria kokonaiseksi.
        if (kmvali) {
            var valiTaiSijainti = kmvali.alku.ratakm == kmvali.loppu.ratakm && kmvali.alku.etaisyys == kmvali.loppu.etaisyys
                    ? 'radat/' + kmvali.ratanumero + '/' + kmvali.alku.ratakm + '+' + kmvali.alku.etaisyys
                    : 'radat/' + kmvali.ratanumero + '/' + kmvali.alku.ratakm + '+' + kmvali.alku.etaisyys + '-' + kmvali.loppu.ratakm + '+' + kmvali.loppu.etaisyys;
            // haetaan rajausta vastaava geometria
            fetch(infraAPIUrl + valiTaiSijainti + '.geojson?propertyName=geometria&time=' + voimassa, {
                method: 'GET',
                headers: {'Digitraffic-User': 'Rafiikka'}
            }).then(response => response.json())
              .then(response => {
                let mask = format.readFeatures(response);
                    
                    var virheelliset = [];
                    var unionMask;
                    mask.forEach(function(feature) {
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
                        log('Hmm, geometry was null for: ', JSON.stringify(pair));
                      }
                    });
                    
                    // Hoidetaan default-end-cap-stylellä loput geometriat
                    virheelliset.forEach(function(jstsGeom) {
                        var buffered = jstsGeom.buffer(0.5, 8, 1 /* round */);
                        if (!unionMask) {
                            unionMask = buffered;
                        } else {
                            unionMask = unionMask.union(buffered);
                        }
                    });
                    
                    if (unionMask) {
                        var original = olParser.read(f.getGeometry());
                        f.setStyle(null);
                        f.setGeometry(olParser.write(unionMask.intersection(original)));
                    } else if (console) {
                        log('Hmm, could not resolve masking geometry for: ', JSON.stringify(pair));
                    }
                })
              .catch(errorHandler);
        }
    });
};

let tarkennaEnnakkotieto = (map, tunniste) => {
    if (!map.highlightLayers) {
        map.highlightLayers = {};
    }
    if (tunniste && tunniste.indexOf('1.2.246.586.2') == 0) {
        var prefix;
        if (tunniste.indexOf('.81.') > 0) {
            // Ennakkoilmoitus
            prefix = 'liikennevaikutusalue';
        } else if (tunniste.indexOf('.82.') > 0) {
            // Ennnakkosuunnitelma
            prefix = 'tyonosat.tekopaikka';
        } else if (tunniste.indexOf('.83.') > 0) {
            // Vuosisuunnitelma
            prefix = 'kohde';
        }
        var props = 'voimassa,' + prefix + '.raiteet.tunniste.geometria,' + prefix + '.raiteet.tunniste.tunniste,' + prefix + '.raiteet,' + prefix + '.elementit.geometria,' + prefix + '.liikennepaikat.geometria,' + prefix + '.tilirataosat.geometria,' + prefix + '.toimialueet.geometria,' + prefix + '.tasoristeykset.geometria,' + prefix + '.liikennesuunnittelualueet.geometria,' + prefix + '.radat.tunniste.geometria,' + prefix + '.radat.tunniste.tunniste,' + prefix + '.radat,' + prefix + '.liikennepaikkavalit.tunniste.geometria,' + prefix + '.liikennepaikkavalit.tunniste.tunniste,' + prefix + '.liikennepaikkavalit,' + prefix + '.paikantamismerkkisijainnit.tunniste.geometria';
        if (map.highlightLayers[tunniste] == undefined) {
            map.highlightLayers[tunniste] = [];
            var raiteet;
            var radat;
            var lpvalit;
            var voimassa;
            
            var newLayer;
            
            var onchange = function() {
                var geometries = [];
                newLayer.getSource().getFeatures().forEach(function(f) {
                    if (f._mbc) {
                        // exclude mbc feature
                        return;
                    }
                    
                    // gather all geometries, also inside geometrycollections
                    var geometryOrCollection = f.getGeometry();
                    if (geometryOrCollection.getGeometries) {
                        geometryOrCollection.getGeometries().forEach(function(g) {
                            geometries = geometries.concat([olParser.read(g)]);
                        });
                    } else {
                        geometries = geometries.concat([olParser.read(geometryOrCollection)]);
                    }
                });
                // calculate mbc with jsts
                mbcFeature.setGeometry(olParser.write(new jsts.algorithm.MinimumBoundingCircle(new jsts.geom.GeometryFactory().buildGeometry(javascript.util.Arrays.asList(geometries))).getCircle()));
                
                // re-calculate mbc whenever the hightlight layer contents change (like when a feature is cropped)
                newLayer.getSource().once('change', onchange);
            };
            
            newLayer = newVectorLayerNoTile(etj2APIUrl + tunniste + '.geojson', '-', 'Korostus', 'Highlight', undefined, props, f => {
                var ps = f.getProperties();
                if (!raiteet) {
                    // yes, this assumes that the first feature is the "original" one containing all the data. Not the most elegant this way...
                    raiteet = ps[prefix].raiteet;
                    radat = ps[prefix].radat;
                    lpvalit = ps[prefix].lpvalit;
                    voimassa = limitInterval(ps.voimassa);
                }
                
                var loadingIndicator = new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: 'rgba(0, 0, 0, 0.1)',
                        width: 1
                    })
                });
                
                // possibly constraint target kinds
                if (ps._source) {
                    if (ps._source.indexOf('.raiteet') > -1) {
                        f.setStyle(loadingIndicator);
                        cropIfConstrained(voimassa, raiteet, f);
                    } else if (ps._source.indexOf('.radat') > -1) {
                        f.setStyle(loadingIndicator);
                        cropIfConstrained(voimassa, radat, f);
                    } else if (ps._source.indexOf('.liikennepaikkavalit') > -1) {
                        f.setStyle(loadingIndicator);
                        cropIfConstrained(voimassa, lpvalit, f);
                    }
                }
                
                newLayer.getSource().once('change', onchange);
            });
            map.highlightLayers[tunniste] = map.highlightLayers[tunniste].concat([newLayer]);
            newLayer.setMap(map);
            newLayer.setVisible(true);
            
            // minimum bounding circle for the whole etj2 feature
            var mbcFeature = new ol.Feature();
            mbcFeature._mbc = true;
            mbcFeature.setStyle(new ol.style.Style({
                stroke: new ol.style.Stroke({
                    width: 2,
                    color: 'rgb(255, 0, 0)'
                })
            }));
            newLayer.getSource().addFeature(mbcFeature);
        } else {
            map.highlightLayers[tunniste].forEach(function(l) { l.setVisible(true); });
        }
    }
};
