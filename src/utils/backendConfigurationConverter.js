let _ = require('lodash');
let Logger = require('./logger');
let Utils = require('./utils');

//////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////specific converter from backend////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Will convert the gml footprint into the footprint frmat known by our webclient.
 * GML is lon lat and we will convert it into lat lon arrays
 * TODO make it as generic to convert all gml format
 * @param defaultValue
 *		The gml entry in format of gml object containing coordinates are in coordinates string (lon1 lat1 lon2 lat2 ... lonn latn)
 * @return
 *		the geometry json object in webc known format	
 */
let _convertGmlFpToInternalFp = function (gmlFpEntry, collectionId) {
	let geometry = {};
	geometry.type = "Polygon";
	geometry.coordinates = [];
	geometry.coordinates[0] = [];

	let posList = Utils.getFromPath(gmlFpEntry, 'multiExtentOf.MultiSurface.surfaceMember.Polygon.exterior.LinearRing.posList', '');
	if (posList === '') {
		posList = Utils.getFromPath(gmlFpEntry, 'multiExtentOf.MultiSurface.surfaceMembers.Polygon.exterior.LinearRing.posList', '');
	}
	if (posList === '') {
		Logger.warn('No posList for ' + gmlFpEntry + ' in collection ' + collectionId);
		return geometry;
	}
	let stringPosList = posList;
	if (posList['#']) {
		stringPosList = posList['#'];
	}
	
	let arrList = stringPosList.split(" ", -1);

	for (let i = 0; i < arrList.length; i = i + 2) {
		let coord = [];
		if (collectionId.indexOf('SENTINEL-1-PRODUCTS') === 0) {
			coord[0] = parseFloat(arrList[i]);
			coord[1] = parseFloat(arrList[i + 1]);
		} else {
			coord[0] = parseFloat(arrList[i + 1]);
			coord[1] = parseFloat(arrList[i]);
		}
		geometry.coordinates[0].push(coord);
	}

	return geometry;
}

let _addProductInformationForFeature = function(feature) {
	let product = Utils.getFromPath(feature, 'properties.EarthObservation.result.EarthObservationResult.product', null);
	if (product === null) {
		Logger.warn('No product information for feature ' + (feature.id ? feature.id : feature));
		return feature;
	}

	// TODO define this from catalog configuration
	let productUrl = Utils.getFromPath(feature, 'properties.link[].@.rel=enclosure.href', '');
	if (productUrl !== '') {
		let product = {
			ProductInformation : {
				fileName: {
					ServiceReference : {
						'@': {
							href: productUrl
						}
					}
				},
				size: {
					'#': ''
				}
			}
		};
		feature.properties.EarthObservation.result.EarthObservationResult.product = product;
	}
	return feature;

}
/**
 * Convert a single entry to GeoJSON feature
 * if feature has no EarthObservation attribute, then remove it
 */
let _convertEntryToFeature = function(entry, collectionId) {
	let feature = {};
	feature.id = (entry.id ? entry.id : collectionId + '-' + Math.round(Math.random() * 10000).toString());
	feature.type = "Feature";
	feature.properties = entry;

	let footPrint = Utils.getFromPath(entry, 'EarthObservation.featureOfInterest.Footprint', null);
	if (footPrint === null) {
		Logger.warn('No footprint info for feature ' + feature.id);
		return null;
	}
	feature.geometry = _convertGmlFpToInternalFp(footPrint, collectionId);
	feature = _addProductInformationForFeature(feature);
	return feature;
}

/**
 * Convert entries from backend format to GeoJSON format compatible with WEBC
 * 
 * @param parsedJson
 *		Backend XML response as json
 * @return
 *		The GeoJSON FeatureCollection object in webc known format
 */
let _convertEntriesIntoFeatureCollection = function (parsedJson, collectionId) {
	let featureCollection = {
		features: [],
		properties: _.omit(parsedJson, ['@','entry','generator'])
	};

	let entries = parsedJson['entry'];
	if (entries) {

		// If there is only one feature, the entries is not an array but the literal object
		if ( !Array.isArray(entries) ) {
			let feat = _convertEntryToFeature(entries, collectionId);
			if (feat) {featureCollection.features.push(feat); }
		} else {
			entries.forEach((entry) => {
				let feat = _convertEntryToFeature(entry, collectionId);
				if (feat) {featureCollection.features.push(feat); }
			});
		}

	}
	return featureCollection;
}

/**
 * Extract all the declared namespaces in xml and add ':' at the end to simplify removing in tags
 */
let _getNamespaces = function(parsedXml) {

	let namespaceRegexp = new RegExp('xmlns[^"]+(?=":"http)','g');
	return JSON.stringify(parsedXml).match(namespaceRegexp).map(item => {
		return item.split(':')[1] + ":";
	});
};

module.exports = {

	/**
	 * Convert parsed xml coming from search request to current ngeo WEBC format
	 * 
	 * @param {Object} parsedXml
	 *      XML search response in SX-CAT format as json
	 * @return featureCollection
	 *      Feature collection compatible with WEBC format
	 */
	convertSearchResponse: function (parsedXml, collectionId) {
		let startTime = new Date();
		// Replace all the xmlns so we have a json file compatible directly with webc protocol by just removing namespaces
		let removeNamespacesFromTags = new RegExp(_getNamespaces(parsedXml).join('|'), "g")
		let stringJsonWithoutNamespaces = JSON.stringify(parsedXml).replace(removeNamespacesFromTags, '');
		let result = _convertEntriesIntoFeatureCollection(JSON.parse(stringJsonWithoutNamespaces), collectionId);
		Logger.info('Conversion from json to the webc format geojson data took ', Date.now() - startTime + ' ms');
		return result;
	}

};