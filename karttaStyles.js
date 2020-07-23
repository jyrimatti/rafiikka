let styles = {
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
    
    icon: (url, flipped, rotation, anchor, scale, opacity) =>
        new ol.style.Style({
            image: new ol.style.Icon({
                src: url,
                scale: scale ? scale : 1,
                rotateWithView: true,
                anchor: anchor ? anchor : [0.5, 0.5],
                rotation: rotation ? 2*Math.PI*rotation/360 : 0,
                opacity: opacity ? opacity : 1.0
            })
        })
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
let kmStyle = styles.icon(infraAPIUrl + 'icons/kilometrimerkki.svg');
let tasoristeysStyle = (feature, resolution) => styles.icon(infraAPIUrl + 'icons/tasoristeys.svg', undefined, feature.getProperties().rotaatio);
let lorajaStyle      = (feature, resolution) => styles.icon(infraAPIUrl + 'icons/liikenteenohjauksenraja.svg', undefined, feature.getProperties().rotaatio);
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
    let anchor = elemType == 'opastin' ? (feature.getProperties().opastin.puoli === 'vasen' ? [0,1.5] : [0,-0.5]) : null;
    let icon4elem = elemType == 'opastin' ? 'opastin_' + feature.getProperties().opastin.tyyppi :
                    elemType == 'baliisi' ? 'baliisi' + (feature.getProperties().baliisi.toistopiste === true ? 'toistopiste' : '') :
                    elemType == 'ryhmityseristin' ? 'ryhmityseristin' + (feature.getProperties().ryhmityseristin.nopeastiAjettava === true ? 'Nopea' : '') :
                    elemType == 'raiteensulku' ? 'raiteensulku' + (feature.getProperties().raiteensulku.kasinAsetettava === true ? 'Kasin' : '') :
                    elemType == 'vaihde' ? 'vaihde_' + feature.getProperties().vaihde.tyyppi + (feature.getProperties().vaihde.kasikaantoisyys == 'ei' ? '' : '_' + feature.getProperties().vaihde.kasikaantoisyys) + (feature.getProperties().vaihde.risteyssuhde == null || parseFloat(feature.getProperties().vaihde.risteyssuhde.split(':')[1]) <= 10 ? '' : parseFloat(feature.getProperties().vaihde.risteyssuhde.split(':')[1]) <= 18 ? '_keskinopea' : '_nopea' ) :
                    elemType;
    let style = styles.icon(infraAPIUrl + 'icons/' + icon4elem + '.svg', false, feature.getProperties().rotaatio, anchor, scales[resolutions.indexOf(resolution)]);
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
    return styles.icon(infraAPIUrl + 'icons/' + icon4elem + '.svg', false, feature.getProperties().rotaatio, anchor, scales[resolutions.indexOf(resolution)]);
};

let pmStyle = styles.onLoad(feature => {
    let sijainnit = feature.getProperties().sijainnit.slice(0);
    let styles = feature.getGeometry().getCoordinates().map((coords, index) => {
        for (let i = 0; i < sijainnit.length; ++i) {
            let sij = sijainnit[i];
            if (JSON.stringify(sij[0]) == JSON.stringify(coords)) {
                sijainnit.splice(i, 1);
                let iconStyle = styles.icon(infraAPIUrl + 'icons/paikantamismerkki_' + sij[1] + '.svg', sij[1] == 'nouseva');
                let textStyle = styles.text('white', '' + feature.getProperties().numero);
                iconStyle.zIndex = index;
                textStyle.zIndex = index;
                return [iconStyle, textStyle];
            }
        }
    });
    feature.setStyle([].concat.apply([], styles));
});


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

let esStyle = styles.onLoad(feature => {
    let props = feature.getProperties();
    let propTila = props.tila;
    if (propTila == 'poistettu') {
        feature.setStyle(styles.icon(etj2APIUrl + 'icons/ennakkosuunnitelma_poistettu.svg', null, null, null, null, ennakkotietoOpacity(props.voimassa)));
    } else if (propTila == 'hyväksytty') {
        feature.setStyle(styles.icon(etj2APIUrl + 'icons/ennakkosuunnitelma.svg', null, null, null, null, ennakkotietoOpacity(props.voimassa)));
    } else {
        feature.setStyle(styles.icon(etj2APIUrl + 'icons/ennakkosuunnitelma_kesken.svg', null, null, null, null, ennakkotietoOpacity(props.voimassa)));
    }
});

let eiStyle = styles.onLoad(feature => {
    let props = feature.getProperties();
    let propTila = props.tila;
    if (propTila == 'poistettu') {
        feature.setStyle(styles.icon(etj2APIUrl + 'icons/ennakkoilmoitus_poistettu.svg', null, null, null, null, ennakkotietoOpacity(props.voimassa)));
    } else if (propTila == 'hyväksytty') {
        feature.setStyle(styles.icon(etj2APIUrl + 'icons/ennakkoilmoitus.svg', null, null, null, null, ennakkotietoOpacity(props.voimassa)));
    } else {
        feature.setStyle(styles.icon(etj2APIUrl + 'icons/ennakkoilmoitus_kesken.svg', null, null, null, null, ennakkotietoOpacity(props.voimassa)));
    }
});

let vsStyle = styles.onLoad(feature => {
    let props = feature.getProperties();
    let propTila = props.tila;
    if (propTila == 'poistettu') {
        feature.setStyle(styles.icon(etj2APIUrl + 'icons/vuosisuunnitelma_poistettu.svg', null, null, null, null, ennakkotietoOpacity(props.voimassa)));
    } else {
        feature.setStyle(styles.icon(etj2APIUrl + 'icons/vuosisuunnitelma.svg', null, null, null, null, ennakkotietoOpacity(props.voimassa)));
    }
});

let loStyle = styles.onLoad(feature => {
    let propTila = feature.getProperties().tila;
    if (propTila == 'poistettu') {
        feature.setStyle(styles.icon(etj2APIUrl + 'icons/loilmoitus_poistettu.svg'));
    } else {
        feature.setStyle(styles.icon(etj2APIUrl + 'icons/loilmoitus.svg'));
    }
});