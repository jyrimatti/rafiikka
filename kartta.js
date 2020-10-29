
let luoKarttaElementti = (tunniste, title) => {
    let [container, elemHeader] = luoIkkuna(title);
    container.setAttribute("class", "popupContainer");

    let open = document.createElement("div");
    open.setAttribute("class", "open");

    let juna = onkoJuna(tunniste);
    let reitti = onkoReitti(tunniste);
    let ratanumero = onkoRatanumero(tunniste);
    open.innerHTML = `<ul>${
        (ratanumero                                ? luoGrafiikkaLinkkiRatanumerolle(ratanumero[1])   : '') +
        (reitti                                    ? luoGrafiikkaLinkkiReitille([reitti[1]].concat(reitti[2] ? reitti[2].split(',') : []).concat(reitti[3])) : '') +
        (onkoInfra(tunniste) || onkoJeti(tunniste) || onkoRatanumero(tunniste) ? luoInfoLinkki(tunniste) : '') +
        (onkoInfra(tunniste)                       ? luoInfraAPILinkki(tunniste)                 : '') +
        (onkoJeti(tunniste)                        ? luoEtj2APILinkki(tunniste)                  : '') +
        (juna                                      ? luoAikatauluLinkki(juna[1], juna[2])        : '')
    }</ul>`
    elemHeader.appendChild(open);

    let haku = document.createElement('input');
    haku.setAttribute('placeholder', 'hae...');
    haku.setAttribute('style', 'display: none');
    container.appendChild(haku);

    let kartta = document.createElement("div");
    kartta.setAttribute("class", "kartta");
    container.appendChild(kartta);

    return [container, kartta, haku];
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
            let juna = f.departureDate + ' (' + f.trainNumber + ')';
            let junat = etsiJunat(juna);
            junat.forEach(juna => {
                layer.setVisible(true);
                let loc = mkPoint(juna.location);
                let geom = f.getGeometry();
                if (geom.getCoordinates()[0] != loc.getCoordinates()[0] || geom.getCoordinates()[1] != loc.getCoordinates()[1]) {
                    log("Siirretään junaa", tunniste, geom.getCoordinates(), "->", loc.getCoordinates());
                    geom.translate(loc.getCoordinates()[0] - geom.getCoordinates()[0], loc.getCoordinates()[1] - geom.getCoordinates()[1]);
                    if (junat.length == 1) {
                        map.getView().setCenter(loc.getCoordinates());
                    }
                }
            });
        });
    }
};

let junaLayer = (map, tunniste) => {
    let src = new ol.source.Vector({
        strategy: ol.loadingstrategy.all,
        loader: _ => {
            etsiJunat(tunniste).forEach(juna => {
                src.addFeature(new ol.Feature({
                    geometry:      mkPoint(juna.location),
                    departureDate: juna.departureDate,
                    trainNumber:   juna.trainNumber,
                    name:          juna.departureDate + ' (' + juna.trainNumber + ')'
                }));
            });
        }
    });

    let layer = new ol.layer.Vector({
        title: mkLayerTitle(tunniste, tunniste),
        source: src
    });

    setInterval(paivitaYksikot(layer, map), 1000);
    return layer;
}

let fitToView = map => ev => {
    map.getView().fit(ev.target.getSource().getExtent(), {
        maxZoom: 10,
        padding: [50,50,50,50],
        duration: 1000
    });
}

let rumaLayer = (tunniste, location) => {
    let src = new ol.source.Vector({
        strategy: ol.loadingstrategy.all,
        loader: _ => {
            src.addFeature(new ol.Feature({
                geometry: mkPoint(location),
                name: tunniste
            }));
        }
    })
    return new ol.layer.Vector({
        title: mkLayerTitle(tunniste, tunniste),
        source: src
    });
}

let kartta = (tunniste, title, rumaLocation) => {
    let [container, elem,haku] = luoKarttaElementti(tunniste, title || tunniste);
    let overlay = new ol.Overlay({
        element: elem.parentElement.getElementsByClassName('popup')[0],
        offset: [5, 5]
    });
    let map = new ol.Map({
        target: elem,
        overlays: [overlay],
        layers: layers.concat([
            tileLayer(mkLayerTitle('Tausta', 'Background'), new ol.source.OSM()),
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
                coordinateFormat: c => Math.round(c[0]) + "," + Math.round(c[1])
            }),
            new ol.control.LayerSwitcher()
        ]
    });
    elem.kartta = map;
    map.addInteraction(hover(overlay, layers));

    onStyleChange(elem.parentElement, () => setTimeout(() => map.updateSize(), 200));

    map.highlightLayers = {};

    let lisaa = lisaaKartalle(map, overlay);
    let search = initSearch(haku, lisaa, poistaKartalta(map));
    search.settings.create = true;
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
    map.removeLayer(map.getLayers().getArray().find(l => l.get('shortName') == tunniste));
}

let lisaaKartalle = (map, overlay) => (tunniste, rumaLocation) => {
    let preselectLayer =
        onkoJuna(tunniste)                   ? junaLayer(map, tunniste) :
        onkoRT(tunniste) || onkoLR(tunniste) ? rumaLayer(tunniste, rumaLocation) :
        onkoJeti(tunniste)                   ? newVectorLayerNoTile(luoEtj2APIUrl(tunniste), tunniste, tunniste, tunniste) :
        onkoInfra(tunniste) || onkoTREX(tunniste) ? newVectorLayerNoTile(luoInfraAPIUrl(tunniste), tunniste, tunniste, tunniste) :
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
        layers:       [].concat.apply([], layers.map(l => (l instanceof ol.layer.Group) ? l.getLayers().getArray() : l ))
    });
    hoverInteraction.on('select', evt => {
        let map = evt.target.getMap();
        evt.selected.forEach(feature => {
            var coordinate = evt.mapBrowserEvent.coordinate;
            if (overlay.getElement()) {
                overlay.getElement().innerHTML = prettyPrint(withoutProp(feature.getProperties(), 'geometry'));
            }
            overlay.setPosition(coordinate);

            let layer = tarkennaEnnakkotieto(map.highlightLayers, feature.getProperties().tunniste);
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

let cropIfConstrained = (voimassa, f) => kohteet =>
    kohteet.filter(kohde => kohde.tunniste == f.getProperties().tunniste)
           .filter(kohde => kohde.rajaus) // jos oli rajaus, niin tehdään taiat. Muuten jätetään geometria kokonaiseksi.
           .forEach(kohde => resolveMask(kohde.rajaus, voimassa, mask => {
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

let tarkennaEnnakkotieto = (highlightLayers, tunniste) => {
    let prefix = onkoEI(tunniste) ? 'liikennevaikutusalue' :
                 onkoES(tunniste) ? 'tyonosat.tekopaikka' :
                 onkoVS(tunniste) ? 'kohde' : undefined;

    if (prefix) {
        let props = 'voimassa,' + kohdeProps.map(x => prefix + x).join(',');
        
        if (highlightLayers[tunniste]) {
            highlightLayers[tunniste].forEach(l => l.setVisible(true));
        } else {
            highlightLayers[tunniste] = [];
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
                        cropIfConstrained(voimassa, f)(k);
                    });
                }
                
                newLayer.getSource().once('change', onchange);
            });

            newLayer.getSource().addFeature(mbcFeature);

            highlightLayers[tunniste].push(newLayer);
            newLayer.setVisible(true);
            return newLayer;
        }
    }
};
