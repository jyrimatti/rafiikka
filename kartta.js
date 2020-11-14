
let luoKarttaElementti = (tunniste, title) => {
    let [container, elemHeader] = luoIkkuna(title);
    container.setAttribute("class", "popupContainer");

    let schema = document.createElement("label");
    schema.setAttribute("class", "schema");
    schema.innerText = 'kaavio';
    elemHeader.appendChild(schema);

    let check = document.createElement("input");
    check.setAttribute('type', 'checkbox');
    schema.appendChild(check);

    let open = document.createElement("div");
    open.setAttribute("class", "open");

    open.innerHTML = luoLinkit('kartta', tunniste);
    elemHeader.appendChild(open);

    let haku = document.createElement('input');
    haku.setAttribute('placeholder', 'hae...');
    haku.setAttribute('style', 'display: none');
    container.appendChild(haku);

    let kartta = document.createElement("div");
    kartta.setAttribute("class", "kartta");
    container.appendChild(kartta);

    return [container, kartta, haku, check];
};

let onDrop = lisaa => (source, target) => {
    let sourceMap = source.getElementsByClassName('kartta')[0].kartta;
    let targetMap = target.getElementsByClassName('kartta')[0].kartta;
    if (targetMap != sourceMap) {
        sourceMap.getLayers().getArray()
                 .filter(layer => !targetMap.getLayers().getArray().find(l => l.get('title') == layer.get('title')))
                 .forEach(x => {
            sourceMap.removeLayer(x);
            targetMap.addLayer(x);
            lisaa(x.get('shortName'));
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
        target.getElementsByClassName('header')[0].getElementsByTagName('a').forEach(e => e.innerHTML = '');
    }
}

let paivitaYksikot = (layer, map) => () => {
    if (layer.getVisible()) {
        layer.getSource().getFeatures().forEach(f => {
            let juna = f.getProperties().departureDate + ' (' + f.getProperties().trainNumber + ')';
            let junat = etsiJunat(juna);
            junat.forEach(juna => {
                f.setProperties({speed: juna.speed});
                layer.setVisible(true);
                let loc = mkPoint(juna.location);
                let geom = f.getGeometry();
                if (!geom.getGeometries) {
                    let history = new ol.geom.LineString([geom.getCoordinates()]);
                    geom = new ol.geom.GeometryCollection([geom, history]);
                    f.setGeometry(geom);
                }
                let currentGeom = geom.getGeometriesArray()[0];
                if (currentGeom.getCoordinates()[0] != loc.getCoordinates()[0] || currentGeom.getCoordinates()[1] != loc.getCoordinates()[1]) {
                    log("Siirretään junaa", juna, currentGeom.getCoordinates(), "->", loc.getCoordinates());
                    currentGeom.translate(loc.getCoordinates()[0] - currentGeom.getCoordinates()[0], loc.getCoordinates()[1] - currentGeom.getCoordinates()[1]);
                    log('Appending', currentGeom, 'to history', geom.getGeometriesArray()[1].getCoordinates());
                    geom.getGeometriesArray()[1].appendCoordinate(currentGeom.getCoordinates());
                    if (junat.length == 1 && map) {
                        map.getView().setCenter(loc.getCoordinates());
                    }
                }
            });
        });
        if (layer.getSource().getFeatures().length == 0) {
            log("Layerillä ei featureita, ladataan source uudestaan");
            layer.getSource().refresh();
        }
    }
};

let junaLayer = (map, tunniste) => {
    var layer;
    let src = new ol.source.Vector({
        strategy: ol.loadingstrategy.all,
        loader: _ => {
            etsiJunat(tunniste).forEach(juna => {
                let f = applyStyle(trainStyle)(new ol.Feature({
                    geometry:      mkPoint(juna.location),
                    departureDate: juna.departureDate,
                    trainNumber:   juna.trainNumber,
                    name:          juna.departureDate + ' (' + juna.trainNumber + ')',
                    speed:         juna.speed,
                    vari:          juna.trainCategory == 'Cargo' ? 'blue' : 'red'
                }));
                src.addFeature(f);
                setInterval(paivitaYksikot(layer), 1000);
            });
        }
    });

    layer = new ol.layer.Vector({
        title: mkLayerTitle(tunniste, tunniste),
        source: src
    });

    setInterval(paivitaYksikot(layer, map), 1000);
    junasijainnitPaalle();
    return layer;
}

let fitToView = map => ev => {
    let extent = ev.target.getSource().getExtent();
    if (extent && !ol.extent.isEmpty(extent)) {
        map.getView().fit(extent, {
            maxZoom: 10,
            padding: [50,50,50,50],
            duration: 1000
        });
    }
}

let wktLayer = (tunniste, nimi) => {
    let src = new ol.source.Vector({
        features: [new ol.format.WKT().readFeature(tunniste)]
    });
    return new ol.layer.Vector({
        title: mkLayerTitle(nimi, nimi),
        source: src
    });
}

let flatLayerGroups = layers => [].concat.apply([], layers.map(l => (l instanceof ol.layer.Group) ? l.getLayers().getArray() : l ));

let kartta = (tunniste, title) => {
    let [container, elem, haku, kaavioCheck] = luoKarttaElementti(tunniste, title || tunniste);
    let overlay = new ol.Overlay({
        element: elem.parentElement.getElementsByClassName('popup')[0],
        offset: [5, 5]
    });
    kaavioCheck.checked = moodiParam() == 'kaavio';
    let onkoKaavio = () => kaavioCheck.checked;
    let lrs = layers(onkoKaavio);
    window.map = new ol.Map({
        target: elem,
        overlays: [overlay],
        layers: lrs.concat(
            (onkoKaavio() ? [] : [tileLayer(mkLayerTitle('Tausta', 'Background'), new ol.source.OSM())]),
        ),
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
                coordinateFormat: c => Math.round(c[0]) + "," + Math.round(c[1])
            }),
            new ol.control.LayerSwitcher()
        ]
    });
    elem.kartta = map;
    map.addInteraction(hover(overlay, lrs));

    map.kaavio = onkoKaavio;
    kaavioCheck.onchange = _ => {
        log('Moodi vaihtui arvoon', onkoKaavio(), 'päivitetään layer data');
        flatLayerGroups(map.getLayers().getArray()).forEach(l => l.getSource().refresh());
    };

    onStyleChange(elem.parentElement, () => setTimeout(() => map.updateSize(), 200));

    map.highlightLayers = {};

    let lisaa = lisaaKartalle(map, overlay);
    let search = initSearch(haku, lisaa, poistaKartalta(map));
    search.settings.create = x => ({tunniste: x, nimi: title || x});
    search.disable();
    search.createItem(tunniste);
    search.enable();
    search.close();
    search.settings.create = false;

    dragElement(container, onDrop(x => {
        search.settings.create = true;
        search.disable();
        search.createItem(x);
        search.enable();
        search.close();
        search.settings.create = false;
    }));
    
    return map;
}

let poistaKartalta = map => tunniste => {
    map.removeLayer(flatLayerGroups(map.getLayers().getArray()).find(l => l.get('shortName') == tunniste));
}

let lisaaKartalle = (map, overlay) => tunniste => {
    let wkt = onkoWKT(tunniste);
    let preselectLayer =
        onkoJuna(tunniste)                   ? junaLayer(map, tunniste) :
        onkoRuma(tunniste)                   ? newVectorLayerNoTile(luoRumaUrl(tunniste)   , tunniste, tunniste, tunniste, undefined, undefined, rtStyle, undefined, rumaPrepareFeatures, map.kaavio) :
        onkoLOI(tunniste)                    ? newVectorLayerNoTile(luoEtj2APIUrl(tunniste), tunniste, tunniste, tunniste, undefined, undefined, loStyle, undefined, undefined, map.kaavio) :
        onkoEI(tunniste)                     ? newVectorLayerNoTile(luoEtj2APIUrl(tunniste), tunniste, tunniste, tunniste, undefined, undefined, eiStyle, undefined, undefined, map.kaavio) :
        onkoES(tunniste)                     ? newVectorLayerNoTile(luoEtj2APIUrl(tunniste), tunniste, tunniste, tunniste, undefined, undefined, esStyle, undefined, undefined, map.kaavio) :
        onkoVS(tunniste)                     ? newVectorLayerNoTile(luoEtj2APIUrl(tunniste), tunniste, tunniste, tunniste, undefined, undefined, vsStyle, undefined, undefined, map.kaavio) :
        onkoInfra(tunniste) || onkoTREX(tunniste) ? newVectorLayerNoTile(luoInfraAPIUrl(tunniste), tunniste, tunniste, tunniste, undefined, undefined, undefined, undefined, undefined, map.kaavio) :
        wkt ? wktLayer(tunniste, wkt[1]) :
        undefined;
    preselectLayer.setVisible(true);
    preselectLayer.once('change', fitToView(map));

    map.addLayer(preselectLayer);    
    map.addInteraction(hover(overlay, [preselectLayer]));
};

let hover = (overlay, layers) => {
    let hoverInteraction = new ol.interaction.Select({
        hitTolerance: 2,
        condition:    ol.events.condition.pointerMove,
        layers:       flatLayerGroups(layers)
    });
    hoverInteraction.on('select', evt => {
        let map = evt.target.getMap();
        evt.selected.forEach(feature => {
            var coordinate = evt.mapBrowserEvent.coordinate;
            if (overlay.getElement()) {
                overlay.getElement().innerHTML = prettyPrint(withoutProp(feature.getProperties(), 'geometry'));
            }
            overlay.setPosition(coordinate);

            let layer = tarkennaEnnakkotieto(map.highlightLayers, feature.getProperties().tunniste, map.kaavio);
            if (layer) {
                layer.setMap(map);
            }
        });
        if (evt.selected.length == 0) {
            overlay.setPosition(undefined);

            Object.values(map.highlightLayers)
                  .flat()
                  .forEach(l => l.setVisible(false));
        }
    });
    return hoverInteraction;
};

let cropIfConstrained = (voimassa, kaavio, f) => kohteet =>
    kohteet.filter(kohde => kohde.tunniste == f.getProperties().tunniste)
           .filter(kohde => kohde.rajaus) // jos oli rajaus, niin tehdään taiat. Muuten jätetään geometria kokonaiseksi.
           .forEach(kohde => resolveMask(kohde.rajaus, voimassa, kaavio, mask => {
            if (mask) {
                var original = olParser.read(f.getGeometry());
                f.setStyle(null);
                f.setGeometry(olParser.write(mask.intersection(original)));
            } else {
                log('Hmm, could not resolve masking geometry for:', JSON.stringify(kohde));
            }
    }));

let kohdeProps = ['.raiteet.tunniste.geometria',
                  '.raiteet.tunniste.tunniste',
                  '.raiteet',
                  '.elementit.geometria',
                  '.liikennepaikat.geometria',
                  '.tilirataosat.geometria',
                  '.toimialueet.geometria',
                  '.tasoristeykset.geometria',
                  '.liikennesuunnittelualueet.geometria',
                  '.radat.tunniste.geometria',
                  '.radat.tunniste.tunniste',
                  '.radat',
                  '.liikennepaikkavalit.tunniste.geometria',
                  '.liikennepaikkavalit.tunniste.tunniste',
                  '.liikennepaikkavalit',
                  '.paikantamismerkkisijainnit.tunniste.geometria'];

let getAllGeometries = f => {
    // gather all geometries, also inside geometrycollections
    let geometryOrCollection = f.getGeometry();
    if (geometryOrCollection.getGeometries) {
        return geometryOrCollection.getGeometries().map(olParser.read);
    } else {
        return [olParser.read(geometryOrCollection)];
    }
};

let tarkennaEnnakkotieto = (highlightLayers, tunniste, kaavio) => {
    let prefix = onkoEI(tunniste) ? 'liikennevaikutusalue' :
                 onkoES(tunniste) ? 'tyonosat.tekopaikka' :
                 onkoVS(tunniste) ? 'kohde' : undefined;

    if (prefix) {
        let props = 'voimassa,' + kohdeProps.map(x => prefix + x).join(',');
        
        if (highlightLayers[tunniste + '_' + kaavio()]) {
            highlightLayers[tunniste + '_' + kaavio()].forEach(l => l.setVisible(true));
        } else {
            highlightLayers[tunniste + '_' + kaavio()] = [];
            var raiteet;
            var radat;
            var lpvalit;
            var voimassa;
            
            var newLayer;

            // minimum bounding circle for the whole etj2 feature
            let mbcFeature = new ol.Feature();
            mbcFeature._mbc = true;
            mbcFeature.setStyle(mbcStyle);
            
            let onchange = () => {
                let geometries = newLayer.getSource().getFeatures()
                                         .filter(f => !f._mbc) // exclude mbc feature
                                         .flatMap(getAllGeometries);
                // calculate mbc with jsts
                mbcFeature.setGeometry(olMBC(geometries));
                
                // re-calculate mbc whenever the hightlight layer contents change (like when a feature is cropped)
                newLayer.getSource().once('change', onchange);
            };
            
            newLayer = newVectorLayerNoTile(etj2APIUrl + tunniste + '.geojson', '-', 'Korostus', 'Highlight', undefined, props, f => {
                let ps = f.getProperties();
                if (!raiteet) {
                    // yes, this assumes that the first feature is the "original" one containing all the data. Not the most elegant this way...
                    let prefixParts = prefix.split('.');
                    let getKohde = prop => prefixParts[1] ? ps[prefixParts[0]].flatMap(x => x[prefixParts[1]][prop])
                                                          : ps[prefix][prop];

                    raiteet  = getKohde('raiteet');
                    radat    = getKohde('radat');
                    lpvalit  = getKohde('lpvalit');
                    voimassa = limitInterval(ps.voimassa);
                }

                // possibly constraint target kinds
                if (ps._source) {
                    let kohteet = ps._source.indexOf('.raiteet')             > -1 ? [raiteet] :
                                  ps._source.indexOf('.radat')               > -1 ? [radat] :
                                  ps._source.indexOf('.liikennepaikkavalit') > -1 ? [lpvalit] :
                                  [];

                    kohteet.forEach(k => {
                        f.setStyle(loadingIndicatorStyle);
                        cropIfConstrained(voimassa, kaavio, f)(k);
                    });
                }
                
                newLayer.getSource().once('change', onchange);
            }, undefined, undefined, kaavio);

            newLayer.getSource().addFeature(mbcFeature);

            highlightLayers[tunniste + '_' + kaavio()].push(newLayer);
            newLayer.setVisible(true);
            return newLayer;
        }
    }
};
