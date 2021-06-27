let iconCache = {};
let highlightImage = image => {
    if (image && image.getSrc) {
        // must cache icons because openlayers sucks: https://github.com/openlayers/openlayers/issues/3137
        let cacheKey = image.getScale() + '_' + image.getRotateWithView() + '_' + image.anchor_ + '_' + image.getRotation() + image.getSrc();
        let cached = iconCache[cacheKey];
        if (cached) {
            return cached;
        }

        log('Creating new icon', cacheKey);
        let ret = new ol.style.Icon({
            src: image.getSrc(),
            scale: image.getScale(),
            rotateWithView: image.getRotateWithView(),
            anchor: image.anchor_,
            rotation: image.getRotation(),
            opacity: 0.75,
            crossOrigin: 'highlight' // OpenLayers uses src+crossOrigin+color as cache key, so we must separate highlighted icons from regular ones
        });
        iconCache[cacheKey] = ret;

        fetch(image.getSrc())
            .then(x => x.text())
            .then(x => {
                // need as base64, otherwise doesn't seem to work
                let result = 'data:image/svg+xml;base64,' + btoa(setHighlightStyles('#f00', x));
                // need to go under the API to be able to reload the new src.
                ret.iconImage_.src_ = result;
                ret.iconImage_.imageState_ = 0; //ol.ImageState.IDLE
                ret.load();
            });
        return ret;
    }
    return undefined;
};

let setHighlightStyles = (color, svg) => svg.replace(/<[^>]+ data-name="[^"]*(StyleStrokefill|StyleStroke|StyleFill)[^"]*"[^>]*>/g, (match, br1) => match + toStyle(color, br1));

let toStyle = (color, clazz) =>
    clazz == 'StyleStrokefill' ? `<style type="text/css">* {fill: ${color} !important; stroke: ${color} !important;}</style>` :
    clazz == 'StyleFill'       ? `<style type="text/css">* {fill: ${color} !important;}</style>` :
    clazz == 'StyleStroke'     ? `<style type="text/css">* {stroke: ${color} !important;}</style>` :
    undefined;

let styles = {
    // copy-pasted from ol source
    default: [
        new ol.style.Style({
            image: new ol.style.Circle({
                fill: new ol.style.Fill({
                    color: 'rgba(255,255,255,0.4)'
                    }),
                stroke: new ol.style.Stroke({
                    color: '#3399CC',
                    width: 1.25
                    }),
                radius: 5
            }),
            fill: new ol.style.Fill({
                color: 'rgba(255,255,255,0.4)'
            }),
            stroke: new ol.style.Stroke({
                color: '#3399CC',
                width: 1.25
            })
        })],

    // from ol source
    defaultWith: (fillColor, strokeColor, strokeWidth, origStyle) => new ol.style.Style({
            image: (origStyle ? highlightImage(origStyle instanceof Array ? origStyle.find(x => x.getImage && x.getImage().getSrc).getImage() : origStyle.getImage()) : new ol.style.Circle({
                fill: new ol.style.Fill({
                    color: fillColor
                }),
                stroke: new ol.style.Stroke({
                    color: strokeColor,
                    width: strokeWidth
                }),
                radius: 5
            })),
            fill: new ol.style.Fill({
                color: fillColor
            }),
            stroke: new ol.style.Stroke({
                color: strokeColor,
                width: strokeWidth
            })
        }),

    circle: (radius, color) => {
        var vcolor = ol.color.asArray(color);
        vcolor[3] = 1.0;
        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: radius,
                fill: new ol.style.Fill({
                    color: color
                }),
                stroke: new ol.style.Stroke({
                    color: vcolor,
                    width: 1.0
                })
            })
        });
    },
    
    line: (width, color) =>
        new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: color,
                width: width
            })
        })
    ,

    onLoad: func => func,
    
    icon: (url, flipped, rotation, anchor, scale, opacity) => {
        if (url.endsWith('undefined.svg')) {
            throw new Error("Whoops, trying to use invalid icon " + url);
        }
        return new ol.style.Style({
            image: new ol.style.Icon({
                src: url,
                scale: scale ? scale : 1,
                rotateWithView: true,
                anchor: anchor ? anchor : [0.5, 0.5],
                rotation: rotation ? 2*Math.PI*rotation/360 : 0,
                opacity: opacity ? opacity : 1.0
            })
        });
    }
    ,
    
    text: (color, txt, offsetY) =>
        new ol.style.Style({
            text: new ol.style.Text({
                text: txt,
                stroke: new ol.style.Stroke({
                    color: color
                }),
                fill: new ol.style.Fill({
                    color: color
                }),
                offsetY: offsetY || 0
            })
        })
};

let raideStyle = styles.line(1.0, 'rgb(0,0,0)');

let apStyle = styles.circle(5.0, 'rgba(128,128,128,0.3)');
let lpStyle = styles.circle(5.0, 'rgba(42,42,255,0.3)');
let seStyle = styles.circle(5.0, 'rgba(42,255,42,0.3)');
let lvStyle = styles.circle(5.0, 'rgba(255,42,42,0.3)');
let lpOsaStyle = styles.onLoad(feature => {
    let geometries = feature.getGeometry().getGeometries ? feature.getGeometry().getGeometries() : [feature.getGeometry()];
    feature.setStyle(geometries.map(g => {
        if (g.getType() == 'Point') {
            let s = styles.circle(5.0, 'rgba(42,42,255,0.6)');
            s.setGeometry(g);
            return s;
        } else {
            let s = styles.circle(2.0, 'rgba(42,42,255,0.2)');
            s.setGeometry(g);
            return s;
        }
    }));
});
let lpValiStyle = styles.line(3.0, 'rgba(42,42,255,0.3)');

let rataStyle = styles.line(1.0, 'rgb(255,42,42)');
let kmStyle = styles.icon(infraAPIUrl() + 'icons/kilometrimerkki.svg');
let tasoristeysStyle = (feature, resolution) => styles.icon(infraAPIUrl() + 'icons/tasoristeys.svg', undefined, feature.getProperties().rotaatio);
let lorajaStyle      = (feature, resolution) => styles.icon(infraAPIUrl() + 'icons/liikenteenohjauksenraja.svg', undefined, feature.getProperties().rotaatio);
let raiteensulkuStyle = (feature, resolution) => styles.icon(root + 'icons/raiteensulku' + (feature.getProperties().suistosuunta === 'vasen' ? 'Vasen' : 'Oikea') + (feature.getProperties().kasinAsetettava === true ? 'Kasin' : '') + '.svg', undefined, feature.getProperties().rotaatio);
let nraStyle = styles.line(1.0, 'rgb(89,161,183)');

let eristysosuusStyle = styles.line(1.0, 'rgba(0, 0, 255, 0.5)');
let akselinlaskentaStyle = styles.line(1.0, 'rgba(0, 255, 0, 0.5)');
let aanitaajuusvirtapiiriStyle = styles.line(1.0, 'rgba(255, 0, 0, 0.5)');

let siltaStyle = styles.line(1.0, 'rgb(128, 0, 0)');
let tunneliStyle = styles.line(1.0, 'rgb(0, 128, 0)');
let laituriStyle = styles.line(1.0, 'rgb(0, 0, 128)');

let toimialueStyle = styles.onLoad(feature => {
    let propVari = feature.getProperties().vari;
    if (propVari) {
        let vari = ol.color.asArray(propVari);
        vari[3] = 0.5;
        feature.setStyle(styles.line(5.0, vari));
    }
});

let kytkentaryhmaStyle = styles.onLoad(feature => {
    let propVari = feature.getProperties().vari;
    if (propVari) {
        let vari = ol.color.asArray(propVari);
        vari[3] = 0.5;
        feature.setStyle(styles.line(3.0, vari));
    }
});

let elemStyle = (feature, resolution) => {
    let elemType = feature.getProperties().tyyppi;
    if (!elemType) {
        log('Yritettiin saada tyyliä ei-elementille', feature.getProperties());
        return undefined;
    }
    let anchor = elemType == 'opastin' ? (feature.getProperties().opastin.puoli === 'vasen' ? [0,1.5] : [0,-0.5]) : null;
    let icon4elem = elemType == 'opastin' ? 'opastin_' + feature.getProperties().opastin.tyyppi :
                    elemType == 'baliisi' ? 'baliisi' + (feature.getProperties().baliisi.toistopiste === true ? 'toistopiste' : '') :
                    elemType == 'ryhmityseristin' ? 'ryhmityseristin' + (feature.getProperties().ryhmityseristin.nopeastiAjettava === true ? 'Nopea' : '') :
                    elemType == 'pysaytyslaite' ? 'pysaytyslaite' + (feature.getProperties().pysaytyslaite.suojaussuunta === 'molemmat' ? 'Molemmat' : '') + (feature.getProperties().pysaytyslaite.kasinAsetettava === true ? 'Kasin' : '') :
                    elemType == 'vaihde' ? 'vaihde_' + feature.getProperties().vaihde.tyyppi + (feature.getProperties().vaihde.kasikaantoisyys == 'ei' ? '' : '_' + feature.getProperties().vaihde.kasikaantoisyys) + (feature.getProperties().vaihde.risteyssuhde == null || parseFloat(feature.getProperties().vaihde.risteyssuhde.split(':')[1]) <= 10 ? '' : parseFloat(feature.getProperties().vaihde.risteyssuhde.split(':')[1]) <= 18 ? '_keskinopea' : '_nopea' ) :
                    elemType;
    let style = styles.icon(infraAPIUrl() + 'icons/' + icon4elem + '.svg', false, feature.getProperties().rotaatio, anchor, scales[resolutions.findIndex(x => x <= resolution)]);
    if (anchor) {
        style = [style, styles.circle(2.0, 'rgba(0,255,0,0.5)')];
    }
    return style;
};

let ratapihapalveluStyle = (feature, resolution) => {
    let elemType = feature.getProperties().tyyppi;
    let anchor = null;
    let icon4elem = elemType == 'sahkokeskus' ? 'sahkokeskus_' + feature.getProperties().sahkokeskus.sahkokeskustyyppi.replace(/\/.*/,'').toLowerCase() :
                    elemType;
    return styles.icon(infraAPIUrl() + 'icons/' + icon4elem + '.svg', false, feature.getProperties().rotaatio, anchor, scales[resolutions.findIndex(x => x <= resolution)]);
};

let pmStyle = styles.onLoad(feature => {
    let sijainnit = feature.getProperties().sijainnit.slice(0);
    let styles = feature.getGeometry().getCoordinates().map((coords, index) => {
        for (let i = 0; i < sijainnit.length; ++i) {
            let sij = sijainnit[i];
            if (JSON.stringify(sij[0]) == JSON.stringify(coords)) {
                sijainnit.splice(i, 1);
                let iconStyle = styles.icon(infraAPIUrl() + 'icons/paikantamismerkki_' + sij[1] + '.svg', sij[1] == 'nouseva');
                let textStyle = styles.text('white', '' + feature.getProperties().numero);
                iconStyle.zIndex = index;
                textStyle.zIndex = index;
                return [iconStyle, textStyle];
            }
        }
    });
    feature.setStyle([].concat.apply([], styles));
});

let resolveStyleForFeature = feature => resolveStyle(feature.getProperties().tunniste);

let resolveStyle = tunniste => {
    let tyyppi = onkoTREX(tunniste);
    if (tyyppi) {
        if (tyyppi[1] == 15) {
            return siltaStyle;
        } else if (tyyppi[1] == 17) {
            return tunneliStyle;
        }
    }
    tyyppi = onkoInfraOID(tunniste);
    if (tyyppi) {
        let t = tyyppi[1];
        return t == 44 ? raideStyle :
            t == 39 ? lpStyle : // mites tästä erotetaan alityyppi?
            t == 40 ? lpValiStyle :
            t == 45 ? rataStyle :
            t == 41 ? kmStyle :
            t == 23 ? tasoristeysStyle :
            t == 69 ? lorajaStyle :
            t == 18 ? raiteensulkuStyle :
            t == 38 ? nraStyle :
            t == 36 ? eristysosuusStyle : // mites alityypit?
            t == 37 ? laituriStyle :
            t == 48 ? toimialueStyle :
            t == 33 ? kytkentaryhmaStyle :
            t == 43 ? pmStyle :
            t == 32 ? undefined : // tilirataosalla default-tyyli
            t == 29 ? undefined : // lisualueilla default-tyyli
            t == 72 ? undefined : // käyttökeskuksella default-tyyli
            [49,50,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66].includes(t) ? ratapihapalveluStyle :
            elemStyle;
    }
    return undefined;
}; 


let ennakkotietoOpacity = voimassa => {
    let leimat = voimassa.split('/').map(t => new Date(t).getTime());
    let nytMs = new Date().getTime();
    let viikkoMs = 1000*60*60*24*7;
    let puolivuottaMs = viikkoMs*26;
    let etaisyysMs = Math.min(Math.abs(leimat[0]-nytMs), Math.abs(leimat[1]-nytMs));

    if (leimat[0] <= nytMs && leimat[1] >= nytMs) {
        // voimassa nykyhetkellä
        return 1.0;
    } else if (etaisyysMs <= viikkoMs) {
        // voimassa viikon sisällä nykyhetkestä
        return 0.95;
    } else if (etaisyysMs >= puolivuottaMs) {
        // ei voimassa puolivuotta nykyhetkestä kumpaankaan suuntaan
        return 0.4;
    } else {
        return 0.4 + (etaisyysMs / puolivuottaMs);
    }
};

let jetiAnchor = [0.5,1];

let esStyle = styles.onLoad(feature => {
    let props = feature.getProperties();
    let propTila = props.tila;
    if (propTila == 'poistettu') {
        feature.setStyle(styles.icon(etj2APIUrl() + 'icons/ennakkosuunnitelma_poistettu.svg', null, null, jetiAnchor, null, ennakkotietoOpacity(props.voimassa)));
    } else if (propTila == 'hyväksytty') {
        feature.setStyle(styles.icon(etj2APIUrl() + 'icons/ennakkosuunnitelma.svg', null, null, jetiAnchor, null, ennakkotietoOpacity(props.voimassa)));
    } else {
        feature.setStyle(styles.icon(etj2APIUrl() + 'icons/ennakkosuunnitelma_kesken.svg', null, null, jetiAnchor, null, ennakkotietoOpacity(props.voimassa)));
    }
});

let eiStyle = styles.onLoad(feature => {
    let props = feature.getProperties();
    let propTila = props.tila;
    if (propTila == 'poistettu') {
        feature.setStyle(styles.icon(etj2APIUrl() + 'icons/ennakkoilmoitus_poistettu.svg', null, null, jetiAnchor, null, ennakkotietoOpacity(props.voimassa)));
    } else if (propTila == 'hyväksytty') {
        feature.setStyle(styles.icon(etj2APIUrl() + 'icons/ennakkoilmoitus.svg', null, null, jetiAnchor, null, ennakkotietoOpacity(props.voimassa)));
    } else {
        feature.setStyle(styles.icon(etj2APIUrl() + 'icons/ennakkoilmoitus_kesken.svg', null, null, jetiAnchor, null, ennakkotietoOpacity(props.voimassa)));
    }
});

let vsStyle = styles.onLoad(feature => {
    let props = feature.getProperties();
    let propTila = props.tila;
    if (propTila == 'poistettu') {
        feature.setStyle(styles.icon(etj2APIUrl() + 'icons/vuosisuunnitelma_poistettu.svg', null, null, jetiAnchor, null, ennakkotietoOpacity(props.voimassa)));
    } else {
        feature.setStyle(styles.icon(etj2APIUrl() + 'icons/vuosisuunnitelma.svg', null, null, jetiAnchor, null, ennakkotietoOpacity(props.voimassa)));
    }
});

let loStyle = styles.onLoad(feature => {
    let propTila = feature.getProperties().tila;
    if (propTila == 'poistettu') {
        feature.setStyle(styles.icon(etj2APIUrl() + 'icons/loilmoitus_poistettu.svg', null, null, jetiAnchor));
    } else {
        feature.setStyle(styles.icon(etj2APIUrl() + 'icons/loilmoitus.svg', null, null, jetiAnchor));
    }
});

let rtStyle = styles.onLoad(feature => {
    let propTila = feature.getProperties().state;
    feature.setStyle(styles.circle(5.0, propTila == 'SENT'     ? 'rgba(250, 128, 114, 0.5)' : 
                                        propTila == 'ACTIVE'   ? 'rgba(250, 128, 114, 1.0)' :
                                        propTila == 'PASSIVE'  ? 'rgba(250, 128, 114, 0.75)' :
                                        propTila == 'FINISHED' ? 'rgba(250, 128, 114, 0.25)' :
                                                                 'rgb(0,0,0)'));
});

let lrStyle = styles.onLoad(feature => {
    let propTila = feature.getProperties().state;
    feature.setStyle(styles.circle(5.0, propTila == 'SENT'     ? 'rgba(64, 224, 208, 0.5)' : 
                                        propTila == 'FINISHED' ? 'rgba(64, 224, 208, 1.0)' :
                                                                 'rgb(0,0,0)'));
});

let trainStyle = styles.onLoad(feature => {
    let props = feature.getProperties();
    let vari = junanVari(props);
    feature.setStyle([styles.circle(Math.max(1.0, props.speed/10), vari),
                      styles.line(2.0, vari == 'blue' ? 'rgba(0,0,255,0.5)' : props.vari == 'red' ? 'rgba(255,0,0,0.5)' : 'rgba(0,0,0,0.5)')]);
});

let loadingIndicatorStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: 'rgba(0, 0, 0, 0.1)',
        width: 1
    })
});

let mbcStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
        width: 2,
        color: 'rgba(255, 0, 0, 0.5)'
    })
});

let highlightStyle = origStyle => typeof origStyle == 'function'
    ? (f,r) => [styles.defaultWith('rgba(255,0,0,0.75)', 'rgba(255,0,0,0.75)', 3, origStyle(f,r)), styles.circle(5, 'rgba(255,0,0,0.1)')]
    : [styles.defaultWith('rgba(255,0,0,0.75)', 'rgba(255,0,0,0.75)', 3, origStyle), styles.circle(5, 'rgba(255,0,0,0.1)')];
