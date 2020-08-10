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
             (url.indexOf('time=') >= 0 ? '' : '&time=' + instant + '/' + instant) +
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
    let container = document.createElement("div");
    container.setAttribute("class", "karttaContainer");
    document.body.appendChild(container);
    
    let elemHeader = document.createElement("div");
    elemHeader.setAttribute("class", "header");
    container.appendChild(elemHeader);

    let elemTitle = document.createElement("div");
    elemTitle.setAttribute("class", "title");
    elemTitle.innerText = title;
    elemHeader.appendChild(elemTitle);

    let open = document.createElement("div");
    open.setAttribute("class", "open");
    open.innerHTML = (tunniste.startsWith('1.2.246.586.2') ? '' : "<a href='https://rata.digitraffic.fi/infra-api/#" + tunniste + "' target='_blank'><img src='https://rata.digitraffic.fi/infra-api/r/favicon.ico' alt='Avaa Infra-API:ssa' /></a>") +
                                                                  "<a href='https://rata.digitraffic.fi/jeti-api/#"  + tunniste + "' target='_blank'><img src='https://rata.digitraffic.fi/jeti-api/r/favicon.ico' alt='Avaa Jeti-API:ssa' /></a>";;
    elemHeader.appendChild(open);

    let close = document.createElement("div");
    close.setAttribute("class", "close");
    close.innerText = "x";
    close.onclick = () => {
        container.parentElement.removeChild(container);
        container.remove();
    };
    elemHeader.appendChild(close);

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
                 .forEach(layer => {
            sourceMap.removeLayer(layer);
            targetMap.addLayer(layer);
        });
        source.parentElement.removeChild(source);
        source.remove();
        target.getElementsByClassName('title')[0].innerText = '...';
        target.getElementsByClassName('header')[0].getElementsByTagName('a').forEach(e => { e.innerHTML = ''; });
    }
}

let kartta = (tunniste, title, infraAPIPath) => {
    let elem = luoKarttaElementti(tunniste, title || tunniste);
    let overlay = new ol.Overlay({
        element: document.getElementById('hovertitle'),
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
    hover(map, overlay, layers);

    let preselectLayer = newVectorLayerNoTile((tunniste.startsWith('1.2.246.586.2') ? etj2APIUrl : infraAPIUrl) + (infraAPIPath || tunniste), tunniste, tunniste, tunniste);
    preselectLayer.setVisible(true);
    map.addLayer(preselectLayer);
    preselectLayer.once('change', () => {
        map.getView().fit(preselectLayer.getSource().getExtent(), {'maxZoom': 10, 'padding': [50,50,50,50], 'duration': 1000});
    });
    hover(map, overlay, [preselectLayer]);

    var observer = new MutationObserver(mutations => {
        mutations.forEach( () => {
            setTimeout( function() { map.updateSize();}, 200);
        });    
    });
    observer.observe(elem.parentElement, { attributes : true, attributeFilter : ['style'] });

    return map;
}

let hover = (map, overlay, layers) => {
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
            let popup = document.getElementById('hovertitle');
            if (popup) {
                popup.innerHTML = prettyPrint(withoutProp(feature.getProperties(), 'geometry'));
            }
            overlay.setPosition(coordinate);
            hasFeature = true;
        });
        if (!hasFeature) {
            overlay.setPosition(undefined);
        }
    });
    map.addInteraction(hoverInteraction);
}