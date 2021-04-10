let world = [50199.4814, 6582464.0358, 761274.6247, 7799839.8902];
		
let dataExtent = {
    'EPSG:3067': [-24288,6553600,762144,7864320],
    'EPSG:3857': [1993605.70,8137522.85,3800073.33,11315415.76]
};
		
// JHS-180-recommendation, with two removed from beginning and four appended to the end
let resolutions = [ /*8192, 4096,*/ 2048,  1024,   512,   256,   128,    64,    32,    16,     8,     4,     2,     1,    0.5,   0.25,  0.125,  0.0625, 0.03125, 0.015625];
let tileSizes   = [ /* 128,  256,*/  128, 256*1, 256*2, 256*4, 256*1, 256*2, 256*4, 256*8, 256*1, 256*2, 256*4, 256*8, 256*16, 256*32, 256*64, 256*128, 256*256,  256*512];
    
// corresponding "good guesses" to svg-icon scalings
let scales      = [ /*0.25, 0.25,*/ 0.25,  0.25,  0.25,  0.25,  0.25,  0.25,  0.25,  0.25,  0.25,  0.25,  0.25,  0.25,    0.5,   0.75,      1,    1.25,       2.25,  4.25];

let format = new ol.format.GeoJSON();

proj4.defs("EPSG:3067", "+proj=utm +zone=35 +ellps=GRS80 +units=m +no_defs");
ol.proj.proj4.register(proj4);

let projection = ol.proj.get('EPSG:3067');
let projectionWGS = ol.proj.get('EPSG:4326');

let tileGrid = new ol.tilegrid.TileGrid({
    resolutions: resolutions,
    tileSizes:   tileSizes,
    extent:      dataExtent[projection.getCode()]
});

let geometryFactory = new jsts.geom.GeometryFactory();
let geojsonReader = new jsts.io.GeoJSONReader(geometryFactory);
let olParser = new jsts.io.OL3Parser();
olParser.inject(ol.geom.Point, ol.geom.LineString, ol.geom.LinearRing, ol.geom.Polygon, ol.geom.MultiPoint, ol.geom.MultiLineString, ol.geom.MultiPolygon, ol.geom.GeometryCollection);

let buildGeometries = geometries => geometryFactory.buildGeometry(javascript.util.Arrays.asList(geometries));

let buildGeometry = geojson => buildGeometries([geojsonReader.read(geojson)]);

let mkPoint = coordinates => new ol.geom.Point(coordinates).transform(ol.proj.get('EPSG:4326'), projection);

let olMBC = geometries => olParser.write(new jsts.algorithm.MinimumBoundingCircle(buildGeometries(geometries)).getCircle());