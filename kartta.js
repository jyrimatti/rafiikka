
let luoKarttaElementti = (tunniste, title, offsetX, offsetY, onClose) => {
    let [container, elemHeader] = luoIkkuna(title, offsetX, offsetY, onClose);
    container.setAttribute("class", "popupContainer karttaPopup");

    let schema = document.createElement("label");
    schema.setAttribute("class", "schema");
    schema.setAttribute("title", "Kaavionäkymä päälle/pois");
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

    let aikavalinta = document.createElement('div');
    aikavalinta.setAttribute('class', 'aikavalinta');
    container.appendChild(aikavalinta);

    let alkuaika = document.createElement('input');
    alkuaika.setAttribute('class', 'ajanhetki alkuaika');
    alkuaika.setAttribute('title', 'alkuaika');

    let loppuaika = document.createElement('input');
    loppuaika.setAttribute('class', 'ajanhetki loppuaika');
    loppuaika.setAttribute('title', 'loppuaika');

    let sliderParent = document.createElement('span');
    sliderParent.setAttribute('title', '');
    let ticks = document.createElement('datalist');
    sliderParent.appendChild(ticks);
    ticks.id = ''+Math.random();
    let slider = document.createElement('input');
    sliderParent.appendChild(slider);
    slider.setAttribute('type', 'range');
    slider.setAttribute('class', 'slider');
    slider.disabled = true;
    slider.step = 1;
    slider.setAttribute('list', ticks.id);
    slider.getTickList = () => ticks;

    aikavalinta.appendChild(alkuaika);
    aikavalinta.appendChild(sliderParent);
    aikavalinta.appendChild(loppuaika);

    let [aa,la] = [alkuaika, loppuaika].map(x => flatpickr(x, { enableTime: true }));
    alkuaika.onchange = () => aa.setDate(new Date(alkuaika.value));
    loppuaika.onchange = () => la.setDate(new Date(loppuaika.value));
    [aa, la].forEach(x => x.config.onChange.push( () => {
        if (aa.selectedDates[0] > la.selectedDates[0]) {
            la.setDate(aa.selectedDates[0]);
        }
        slider.min = aa.selectedDates[0].getTime();
        slider.max = la.selectedDates[0].getTime();
        if (aa.selectedDates[0] == la.selectedDates[0]) {
            slider.disabled = true;
        }
        if (slider.disabled) {
            slider.value = slider.min;
        }
    }));
    slider.parentElement.onclick = _ => {
        let a = aa.selectedDates[0];
        let b = la.selectedDates[0];
        if (a.getTime() != b.getTime()) {
            slider.disabled = false;
            slider.value = a.getTime();
            slider.onchange();
        }
    };
    slider.onclick = () => {
        slider.disabled = true;
        slider.onchange();
    };
    slider.onchange = ev => {
        let a = aa.selectedDates[0];
        let b = la.selectedDates[0];
        if (a.getTime() == b.getTime() || !slider.disabled) {
            slider.parentElement.title = 'Näytetään ajanhetki ' + dateFns.dateFns.format(dateFns.dateFnsTz.utcToZonedTime(a, 'Europe/Helsinki'), "dd.MM.yyyy HH:mm");
        } else {
            slider.parentElement.title = 'Näytetään aikaväli ' + dateFns.dateFns.format(a, "dd.MM.yyyy HH:mm") + ' - ' + dateFns.dateFns.format(b, "dd.MM.yyyy HH:mm") + '. Klikkaa valitaksesi ajanhetken.';
        }
        if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            ev.stopImmediatePropagation();
        }
        let stored1 = slider.onclick
        let stored2 = slider.parentElement.onclick
        slider.onclick = undefined;
        slider.parentElement.onclick = undefined;
        setTimeout(() => {
                slider.onclick = stored1;
                slider.parentElement.onclick = stored2;
            } , 10);
    };

    return [container, kartta, haku, check, slider, alkuaika, loppuaika];
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
                let f = applyStyle(trainStyle, map.ajanhetki, map.aikavali)(new ol.Feature({
                    geometry:      mkPoint(juna.location),
                    departureDate: juna.departureDate,
                    trainNumber:   juna.trainNumber,
                    name:          juna.departureDate + ' (' + juna.trainNumber + ')',
                    speed:         juna.speed,
                    vari:          juna.trainCategory == 'Cargo' ? 'blue' : 'red'
                }));
                src.addFeature(f);
                setTimeout(paivitaYksikot(layer), 1000);
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
    let extent = ev.target.getExtent() || (ev.target.getSource ? ev.target.getSource().getExtent() : undefined);
    if (extent && !ol.extent.isEmpty(extent)) {
        log('Fitting map to extent', extent);
        map.getView().cancelAnimations();
        map.getView().fit(extent, {
            maxZoom: 14,
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

let featuresOnScreen = map => {
    let mapExtent = map.getView().calculateExtent(map.getSize());
    return flatLayerGroups(map.getLayers().getArray()).filter(l => l.getVisible())
                        .flatMap( layer =>
        layer.getSource && layer.getSource().getFeaturesInExtent
            ? layer.getSource().getFeaturesInExtent(mapExtent)
            : []);
}

let voimassaolot = props => [props.haetunDatanVoimassaoloaika ? props.haetunDatanVoimassaoloaika.split('/') : [], props.ensimmainenAktiivisuusaika ? [props.ensimmainenAktiivisuusaika, props.viimeinenAktiivisuusaika] : []]
    .filter(x => x.length > 0)
    .flat();

let haeMuutosajankohdat = map =>
    [...new Set(featuresOnScreen(map).flatMap(f => voimassaolot(f.getProperties())))]
        .map(d => new Date(d).getTime())
        .filter(d => {
            let av = map.aikavali();
            return d >= av[0].getTime() && d <= av[1].getTime();
        })
        .concat(map.aikavali().map(x => x.getTime()))
        .sort((a,b) => a - b)
        .map(d => new Date(d));

let kartta = (tunniste, title, offsetX, offsetY, time, persistState) => {
    try {
        return kartta_(tunniste, title, offsetX, offsetY, time, persistState);
    } catch (e) {
        log(e);
        return e;
    }
};

let kartanIndeksi = map => {
    let kartat = [...document.body.querySelectorAll('.persistent.kartta')];
    let ret = kartat.findIndex(x => x.kartta == map);
    if (ret == -1) {
        throw new "Map not found!";
    }
    return ret + 1;
};

let kartta_ = (tunniste, title, offsetX, offsetY, time, persistState) => {
    persistState = persistState === undefined ? true : false;
    var elem;
    let onClose = () => {
        if (persistState) {
            clearSubState(kartanIndeksi(elem.kartta));
        }
    };
    let [container, elem_, haku, kaavioCheck, slider, alkuaika, loppuaika] = luoKarttaElementti(tunniste, title || tunniste, offsetX, offsetY, onClose);
    elem = elem_;

    if (persistState) {
        elem.classList.add('persistent');
    }

    let elemPopup = document.createElement("div");
    elemPopup.setAttribute("class", "popup");
    container.appendChild(elemPopup);
    
    let overlay = new ol.Overlay({
        element: elem.parentElement.getElementsByClassName('popup')[0],
        offset: [5, 0]
    });

    let onkoKaavio = () => kaavioCheck.checked;
    let ajanhetki = () => slider.min == slider.max                                             ? new Date(parseInt(slider.min)) :
                          (slider.disabled || slider.value === undefined || slider.value == 0) ? undefined 
                                                                                               : new Date(parseInt(slider.value));
    let aikavali = (alku, loppu) => {
        if (alku) {
            alkuaika.value = muotoileAjanhetki(alku);
            loppuaika.value = muotoileAjanhetki(loppu);
            slider.min = alku.getTime();
            slider.max = loppu.getTime();
            alkuaika.onchange();
            loppuaika.onchange();
            if (persistState) {
                setSubState(kartanIndeksi(elem.kartta))('aika', [alku, loppu]);
            }
        } else {
            return slider.min === undefined || slider.min == 0 ? undefined : [new Date(parseInt(slider.min)), new Date(parseInt(slider.max))];
        }
    }

    let lrs = layers(onkoKaavio, ajanhetki, aikavali);
    let taustaLayer = tileLayer(mkLayerTitle('Tausta', 'Background'), new ol.source.OSM());
    if (onkoKaavio()) {
        taustaLayer.setVisible(false);
    }
    let map = new ol.Map({
        target: elem,
        overlays: [overlay],
        layers: [taustaLayer],
        view: new ol.View({
            center: [342900, 6820390],
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
    window.map = map;
    elem.kartta = map;

    kaavioCheck.checked = persistState && getSubState(kartanIndeksi(elem.kartta))('moodi') == 'kaavio';

    if (persistState) {
        setSubState(kartanIndeksi(elem.kartta))('sijainti', tunniste);
    }

    initTooltips(container);

    let paivitaMuutosajankohdat = () => {
        if (!slider.disabled) {
            let ajankohdat = haeMuutosajankohdat(map);
            log('Muutosajankohdat kartalla', ajankohdat);
            slider.getTickList().innerHTML = ajankohdat.map(x => '<option value="' + x.getTime() + '" label="' + muotoileAjanhetki(x) + '"></option>').join('');
        }
    };
    map.getLayers().on('add', ev => flatLayerGroups([ev.element]).forEach(x => {
        x.getSource().on('featuresLoaded', paivitaMuutosajankohdat);
        x.on('change:visible', paivitaMuutosajankohdat);

        let update = diff => {
            let e = elem.querySelector('.layer-switcher');
            e.setAttribute('data-loading', parseInt(e.getAttribute('data-loading') || '0') + diff);
        };
        x.on('loadStart', () => update(1));
        x.on('loadSuccess', () => update(-1));
        x.on('loadFail', () => update(-1));
        x.on('loadAbort', () => update(-1));
    }));
    map.getView().on('change', paivitaMuutosajankohdat);

    lrs.forEach(l => map.addLayer(l));
    map.addInteraction(hover(overlay, lrs));
    map.addInteraction(select(lrs));

    map.kaavio = onkoKaavio;
    map.ajanhetki = ajanhetki;
    map.aikavali = aikavali;

    // muille kuin Jetille kartta globaaliin kontekstiin
    if (!onkoJeti(tunniste)) {
        map.aikavali(time && new Date(time.split('/')[0]) || persistState && pyoristaAjanhetki(getSubState(kartanIndeksi(map))('aika')[0]),
                     time && new Date(time.split('/')[1]) || persistState && pyoristaAjanhetki(getSubState(kartanIndeksi(map))('aika')[1]));
    }

    kaavioCheck.onchange = _ => {
        if (persistState) {
            setSubState(kartanIndeksi(elem.kartta))('moodi', onkoKaavio() ? 'kaavio' : 'kartta');
        }
        log('Moodi vaihtui arvoon', onkoKaavio(), 'päivitetään layer data');
        flatLayerGroups(map.getLayers().getArray()).forEach(l => l.getSource().refresh());
        Object.values(map.highlightLayers).forEach(x => x.getSource().refresh());
    };
    let paivitaTitle = () => {
        let av = aikavali();
        if (av) {
            let a = av[0];
            let b = av[1];
            if (a.getTime() == b.getTime() || !slider.disabled) {
                slider.parentElement.title = 'Näytetään ajanhetki ' + muotoileAjanhetki(ajanhetki());
            } else {
                slider.parentElement.title = 'Näytetään aikaväli ' + muotoileAjanhetki(a) + ' - ' + muotoileAjanhetki(b) + '. Klikkaa valitaksesi ajanhetken.';
            }
            if (a.getTime() == b.getTime()) {
                slider.disabled = true;
            }
        }
    };
    [alkuaika, loppuaika].forEach(x => {
        let orig = x.onchange;
        x.onchange = ev => {
            if (orig) {
                orig(ev);
            }
            if (persistState) {
                setSubState(kartanIndeksi(elem.kartta))('aika', aikavali());
            }
            logDiff('Aikaväli vaihtui arvoon', aikavali(), 'päivitetään layer data', () => {
                paivitaTitle();
                flatLayerGroups(map.getLayers().getArray()).forEach(l => l.getSource().refresh());
            });
        };
    });

    let orig = slider.onchange;
    slider.onchange = ev => {
        orig(ev);
        let ajankohdat = haeMuutosajankohdat(map);
        let sliderValue = parseInt(slider.value);
        if (!ajankohdat.includes(new Date(sliderValue))) {
            let lahin = ajankohdat.map(x => [Math.abs(x.getTime() - sliderValue), x])
                                  .sort((a,b) => a[0]-b[0])[0][1];
            slider.value = lahin.getTime();
        }
        if (persistState) {
            setSubState(kartanIndeksi(elem.kartta))('aika', aikavali());
        }
        logDiff('Aikavalinta vaihtui, renderöidään kartta', () => {
            paivitaTitle();
            flatLayerGroups(map.getLayers().getArray()).forEach(l => l.getSource().changed());
            flatLayerGroups(map.getLayers().getArray()).filter(l => l.get('paivitetaanAjankohtamuutoksessa'))
                                                       .forEach(l => l.getSource().refresh());
        });
    };

    onStyleChange(elem.parentElement, () => setTimeout(() => map.updateSize(), 200));

    map.highlightLayers = {};

    let lisaa = lisaaKartalle(map, overlay);
    let search = initSearch(haku, lisaa, poistaKartalta(map));
    search.settings.create = x => ({tunniste: x, nimi: title || x});
    search.disable();
    if (tunniste) {
        tunniste.split(',').forEach(x => {
            search.createItem(x);
            if (!lisaa(x)) {
                log("Odotellaan", x);
                let handler = () => {
                    let loading = window.loadingIndicator.values.count.value;
                    if (loading <= 1) {
                        // ei enää paljon latauksia jäljellä -> voidaan etsiä osumaa
                        let found = Object.entries(search.options).sort((a,b) => b[1].score - a[1].score).find(x => x[1].score >= (loading > 0 ? 500 : 0));
                        if (found) {
                            search.off('load', handler);
                            log("Saatiin riittävän hyvä osuma", found);
                            lisaa(found[0]);
                        }
                    }
                };
                search.on('load', handler);
                search.onSearchChange(x);
            }
        });
    }
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
    
    return container;
}

let kurkistaKartta = (elem, tunniste, title, offsetX, offsetY, time) => {
    let container = kartta(tunniste, title, offsetX, offsetY, time, false);
    let f = () => {
        if (container.parentElement) {
            container.parentElement.removeChild(container);
            container.remove();
        }
    };
    elem.addEventListener("mouseout", f, { once: true });
    elem.addEventListener("click", f, { once: true });
};

let poistaKartalta = map => tunniste => {
    map.removeLayer(flatLayerGroups(map.getLayers().getArray()).find(l => l.get('shortName') == tunniste));
}

let lisaaKartalle = (map, overlay) => tunniste => {
    let wkt = onkoWKT(tunniste);
    let preselectLayer =
        onkoJuna(tunniste)                   ? junaLayer(map, tunniste) :
        onkoRuma(tunniste)                   ? newVectorLayerNoTile(luoRumaUrl(tunniste)   , tunniste, tunniste, tunniste, undefined, undefined, rtStyle, undefined, rumaPrepareFeatures, map.kaavio, map.ajanhetki, map.aikavali) :
        onkoLOI(tunniste)                    ? newVectorLayerNoTile(luoEtj2APIUrl(tunniste), tunniste, tunniste, tunniste, undefined, 'ensimmainenAktiivisuusaika,laskennallinenKarttapiste,tila,tunniste,viimeinenAktiivisuusaika', loStyle, undefined, undefined, map.kaavio, map.ajanhetki, map.aikavali) :
        onkoEI(tunniste)                     ? newVectorLayerNoTile(luoEtj2APIUrl(tunniste), tunniste, tunniste, tunniste, undefined, 'laskennallinenKarttapiste,tila,tunniste,voimassa', eiStyle, undefined, undefined, map.kaavio, map.ajanhetki, map.aikavali) :
        onkoES(tunniste)                     ? newVectorLayerNoTile(luoEtj2APIUrl(tunniste), tunniste, tunniste, tunniste, undefined, 'laskennallinenKarttapiste,tila,tunniste,voimassa', esStyle, undefined, undefined, map.kaavio, map.ajanhetki, map.aikavali) :
        onkoVS(tunniste)                     ? newVectorLayerNoTile(luoEtj2APIUrl(tunniste), tunniste, tunniste, tunniste, undefined, 'laskennallinenKarttapiste,tila,tunniste,voimassa', vsStyle, undefined, undefined, map.kaavio, map.ajanhetki, map.aikavali) :
        onkoInfra(tunniste) || onkoTREX(tunniste) ? newVectorLayerNoTile(luoInfraAPIUrl(tunniste), tunniste, tunniste, tunniste, undefined, undefined, resolveStyle(tunniste), undefined, undefined, map.kaavio, map.ajanhetki, map.aikavali) :
        wkt ? wktLayer(tunniste, wkt[1]) :
        undefined;
    if (preselectLayer) {
        preselectLayer.setVisible(true);
        preselectLayer.getSource().on('featuresLoaded', fitToView(map));

        map.addLayer(preselectLayer);    
        map.addInteraction(hover(overlay, [preselectLayer]));
        map.addInteraction(select([preselectLayer]));
    }

    return preselectLayer !== undefined;
};

let hover = (overlay, layers) => {
    let hoverInteraction = new ol.interaction.Select({
        hitTolerance: 2,
        condition:    ol.events.condition.pointerMove,
        layers:       flatLayerGroups(layers),
        style:        null
    });
    hoverInteraction.on('select', evt => {
        let map = evt.target.getMap();
        evt.selected.forEach(feature => {
            var coordinate = evt.mapBrowserEvent.coordinate;
            if (overlay.getElement()) {
                overlay.getElement().innerHTML = prettyPrint(withoutProp(feature.getProperties(), 'geometry'));
            }
            overlay.setPosition(coordinate);
        });
        evt.selected.forEach(x => {
            korostus(map, x);
        });
        evt.deselected.forEach(x => {
            korostusPois(map, x);
        });
        if (evt.selected.length == 0) {
            overlay.setPosition(undefined);
        }
    });

    let clickInteraction = new ol.interaction.Select({
        hitTolerance: 2,
        condition:    ol.events.condition.click,
        layers:       flatLayerGroups(layers),
        style:        null
    });

    return hoverInteraction;
};

let select = layers => {
    let source = new ol.source.Vector();
    map.addLayer(new ol.layer.Vector({source: source}));

    let selectInteraction = new ol.interaction.Select({
        hitTolerance: 2,
        condition:    ol.events.condition.click,
        layers:       flatLayerGroups(layers),
        style:        null
    });
    selectInteraction.on('select', evt => {
        let map = evt.target.getMap();
        evt.selected.forEach(feature => {
            let tunniste = feature.getProperties().tunniste;

            var overlay;
            let coordinate = evt.mapBrowserEvent.coordinate;
            var line;
            
            let onClose = () => {
                map.removeOverlay(overlay)
                source.removeFeature(line);
                korostusPois(map, feature);
            };
            let [container,header] = luoIkkuna(tunniste, undefined, undefined, onClose);
            container.setAttribute("class", "popupContainer karttaInfoPopup");
            createPopupContent(tunniste, container);

            overlay = new ol.Overlay({
                element: container
            });
            
            let centerCoordinate = overlayPosition => {
                let overlayPixel = map.getPixelFromCoordinate(overlayPosition);
                let centerPixel = [overlayPixel[0] + overlay.getElement().offsetWidth/2, overlayPixel[1] + overlay.getElement().offsetHeight/2];
                return map.getCoordinateFromPixel(centerPixel);
            };
            onStyleChange(container, () => line.getGeometry().setCoordinates([coordinate, centerCoordinate(overlay.getPosition())]));

            line = new ol.Feature(new ol.geom.LineString([coordinate, centerCoordinate(coordinate)]));

            header.addEventListener('mousedown', () => {
                let move = evt => {
                    let coord = map.getEventCoordinate(evt);
                    overlay.setPosition(coord);
                    line.getGeometry().setCoordinates([coordinate, centerCoordinate(coord)]);
                }
                let end = () => {
                    window.removeEventListener('mousemove', move);
                    window.removeEventListener('mouseup', end);
                }
                window.addEventListener('mousemove', move);
                window.addEventListener('mouseup', end);
            });

            overlay.setPosition(coordinate);
            map.addOverlay(overlay);
            source.addFeature(line);

            korostus(map, feature);
        });
    });

    return selectInteraction;
};

let createPopupContent = (tunniste, container) => {
    let content = document.createElement("div");
    content.setAttribute('class', 'info');
    container.appendChild(content);

    let time = undefined;
    let url = onkoInfra(tunniste) || onkoTREX(tunniste) ? luoInfraAPIUrl(tunniste, time) :
              onkoJeti(tunniste)                        ? luoEtj2APIUrl(tunniste, time) :
              onkoJuna(tunniste)                        ? luoAikatauluUrl(tunniste) :
              onkoRuma(tunniste)                        ? luoRumaUrl(tunniste) :
              undefined;
    if (onkoJuna(tunniste) || onkoRuma(tunniste)) {
        getJson(url, data => {
            content.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        });
    } else {
        content.innerHTML = '<iframe src="' + (url.indexOf('.json') > -1 ? url.replace('.json', '.html')
                                                                         : url) + '"></iframe>';
    }
}

let cropIfConstrained = (voimassa, kaavio, f, source, kohde) => {
    if (kohde.rajaus) { // jos oli rajaus, niin tehdään taiat. Muuten jätetään geometria kokonaiseksi.
        resolveMask(kohde.rajaus, voimassa, kaavio, mask => {
            if (mask) {
                log('Masking geometry of', f.getProperties().tunniste);
                var original = olParser.read(f.getGeometry());
                f.setStyle(highlightStyle(resolveStyleForFeature(f)));
                let intersection = mask.intersection(original);
                let newGeom = intersection.getNumPoints() > 0
                    ? olParser.write(intersection)
                    : new ol.geom.GeometryCollection([]);
                f.setGeometry(newGeom);
                source.dispatchEvent("geometriesUpdated");
            } else {
                log('Hmm, could not resolve masking geometry for:', JSON.stringify(kohde));
            }
        });
    }
};

let cropEnds = (tunniste, features) => {
    let fs = features.filter(f => f.getGeometry())
                     .filter(f => !f._mbc);
    let allLines = [];
    
    fs.forEach(f => {
        let original = olParser.read(f.getGeometry());
        if (original.getGeometryType() == 'LineString' || original.getGeometryType() == 'MultiLineString') {
            let geometries = original.getNumGeometries();
            for (let i = 0; i < geometries; ++i) {
                let geom = original.getGeometryN(i);
                allLines.push(geom);
            };
        }
    });

    let endpoints = allLines.flatMap(x => [
        geometryFactory.createPoint(x.getCoordinateN(0)),
        geometryFactory.createPoint(x.getCoordinateN(x.getNumPoints()-1))]);
    
    // accept only endpoint, who intersect with all geometries exactly once (that is, is contained in the geometrycollection exactly once). Otherwise it's not an endpoint.
    let mask = endpoints.filter(x => allLines.filter(y => y.intersects(x)).length == 1)
                        .map(x => x.buffer(1 /* meters */, 8, 1 /* round */));

    if (mask.length > 0) {
        log('Cropping ends of the geometry of', tunniste);
        let maskGeom = buildGeometries(mask);
        fs.forEach(f => {
            let geom = olParser.read(f.getGeometry());
            let diff = geom.difference(maskGeom);
            let newGeom = diff.getNumPoints() > 0
                ? olParser.write(diff)
                : new ol.geom.GeometryCollection([]);
            f.setGeometry(newGeom);
        });
    } else {
        log('No mask left for cropping', tunniste, 'with', endpoints.length, 'endpoints');
    }
};


let kohdeProps = ['.raiteet.tunniste.geometria',
                  '.raiteet.tunniste.tunniste',
                  '.raiteet',
                  '.elementit.',
                  '.liikennepaikat.tunniste.geometria',
                  '.liikennepaikat.tunniste.tunniste',
                  '.tilirataosat.tunniste.geometria',
                  '.tilirataosat.tunniste.tunniste',
                  '.toimialueet.tunniste.*',
                  '.tasoristeykset.tunniste.geometria',
                  '.tasoristeykset.tunniste.tunniste',
                  '.tasoristeykset.tunniste.rotaatio',
                  '.liikennesuunnittelualueet.tunniste.geometria',
                  '.liikennesuunnittelualueet.tunniste.tunniste',
                  '.radat.tunniste.geometria',
                  '.radat.tunniste.tunniste',
                  '.radat',
                  '.liikennepaikkavalit.tunniste.geometria',
                  '.liikennepaikkavalit.tunniste.tunniste',
                  '.liikennepaikkavalit',
                  '.paikantamismerkkisijainnit.tunniste.geometria', // pmtunnistetta ei tarvi koska sille ei kuitenkaan piirretä tyyliä
                  '.kytkentaryhmat.',
                  '.laiturit.tunniste.geometria',
                  '.laiturit.tunniste.tunniste',
                  '.raideosuudet.tunniste.geometria',
                  '.raideosuudet.tunniste.tunniste',
                  '.sillat.tunniste.geometria',
                  '.sillat.tunniste.tunniste',
                  '.tunnelit.tunniste.geometria',
                  '.tunnelit.tunniste.tunniste'];

let getAllGeometries = f => {
    // gather all geometries, also inside geometrycollections
    let geometryOrCollection = f.getGeometry();
    if (geometryOrCollection && geometryOrCollection.getGeometries) {
        return geometryOrCollection.getGeometries().map(x => olParser.read(x));
    } else {
        return [olParser.read(geometryOrCollection)];
    }
};

let korostus = (map, f) => {
    if (highlightFeature(map)(f)) {
        let layer = korostaEnnakkotieto(map, f.getProperties().tunniste, map.kaavio, map.ajanhetki, map.aikavali);
        if (layer) {
            layer.setMap(map);
            layer.getSource().on('featuresLoaded', fitToView(map));
            layer.on('mbcUpdated', fitToView(map));
        }
    }
};

let korostusPois = (map, f) => {
    if (dehighlightFeature(map)(f)) {
        let avain = f.getProperties().tunniste + '_' + map.kaavio() + '-' + map.ajanhetki();
        if (map.highlightLayers[avain]) {
            map.highlightLayers[avain].setVisible(false);
        }
    }
};

let korostaEnnakkotieto = (map, tunniste, kaavio, ajanhetki, aikavali) => {
    let highlightLayers = map.highlightLayers;
    let prefix = jetiKohdePrefix(tunniste);
    if (prefix) {
        let props = '-laskennallinenKarttapiste,tunniste,voimassa,' + kohdeProps.map(x => prefix + x).join(',');
        let avain = tunniste + '_' + kaavio() + '-' + ajanhetki();

        if (highlightLayers[avain]) {
            highlightLayers[avain].setVisible(true);
        } else {
            var raiteet;
            var radat;
            var lpvalit;
            var voimassa;

            // minimum bounding circle for the whole etj2 feature
            let mbcFeature = new ol.Feature();
            mbcFeature._mbc = true;

            let prepareFeatures = (fs, layer) => {
                fs.forEach(f => {
                    let resolvedStyle = resolveStyleForFeature(f);
                    if (resolvedStyle) {
                        f.setStyle(highlightStyle(resolvedStyle));
                    }
                });

                fs.filter(f => !f.getProperties()._resolved)
                  .forEach(f => {
                    let ps = f.getProperties();
                    let prefixParts = prefix.split('.');
                    let getKohde = prop => prefixParts[1] ? ps[prefixParts[0]].flatMap(x => x[prefixParts[1]][prop])
                                                          : ps[prefix][prop];

                    raiteet  = getKohde('raiteet');
                    radat    = getKohde('radat');
                    lpvalit  = getKohde('liikennepaikkavalit');
                    voimassa = limitInterval(ps.voimassa);

                    let rajattavia = [raiteet, radat, lpvalit].filter(x => x != undefined).flat().filter(x => x.rajaus).length;
                    log("Geometries to restrict:", rajattavia);
                    var count = 0;
                    let endCropper = () => {
                        count += 1;
                        // crop ends when all restricted substructures and features have loaded
                        if (count == rajattavia + 1) {
                            logDiff('Ends cropped', () => {
                                cropEnds(tunniste, layer.getSource().getFeatures());
                                layer.getSource().dispatchEvent('endsCropped');
                            });
                        }
                    };

                    let updateMBC = () => {
                        logDiff('MBC updated', () => {
                            let geometries = layer.getSource().getFeatures()
                                                    .filter(f => !f._mbc) // exclude mbc feature
                                                    .filter(f => f.getGeometry()) // exclude the main feature (no geometry)
                                                    .flatMap(getAllGeometries);
                            // calculate mbc with jsts
                            mbcFeature.setGeometry(olMBC(geometries));
                            mbcFeature.setStyle(mbcStyle);
                            layer.dispatchEvent('mbcUpdated');
                        });
                    };

                    layer.getSource().on('featuresLoaded', endCropper);
                    layer.getSource().on('geometriesUpdated', endCropper);
                    layer.getSource().on('endsCropped', updateMBC);

                    if (rajattavia > 0) {
                        // löytyy ainakin jokin rajaus, joten asetetaan style väliaikaiseksi
                        f.setStyle(loadingIndicatorStyle);
                        mbcFeature.setStyle(() => undefined);
                    } else {
                        mbcFeature.setStyle(mbcStyle);
                    }
                });
                return fs;
            };

            let newLayer = newVectorLayerNoTile(etj2APIUrl + tunniste + '.geojson', '-', 'Korostus', 'Highlight', undefined, props, undefined, undefined, prepareFeatures, kaavio, ajanhetki, aikavali);

            let doCroppingOfConstrained = () => {
                let fs = newLayer.getSource().getFeatures()
                                 .filter(f => f.getProperties()._source);

                raiteet.concat(radat).concat(lpvalit)
                       .forEach(k => cropIfConstrained(voimassa, kaavio, removeItemOnce(fs, x => k.tunniste == x.getProperties().tunniste), newLayer.getSource(), k));
            }

            newLayer.getSource().on('featuresLoaded', doCroppingOfConstrained);            
            newLayer.getSource().addFeature(mbcFeature);

            highlightLayers[avain] = newLayer;
            newLayer.setVisible(true);
            return newLayer;
        }
    }
};

let removeItemOnce = (arr, pred) => {
    var index = arr.findIndex(pred);
    if (index > -1) {
      return arr.splice(index, 1)[0];
    }
    return undefined;
};
