let _ = require('lodash');
let Logger = require('./logger');
let Utils = require('./utils');

//////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////specific converter from backend////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @function _addPolygonGeometry
 * @param {string} myGeo 
 * @return {object}
 */
let _addPolygonGeometry = function (myGeo) {
	let geometry = {};
	geometry.type = "Polygon";
	geometry.coordinates = [];
	geometry.coordinates[0] = [];

	let arrList = myGeo.split(" ", -1);

	for (let i = 0; i < arrList.length; i = i + 2) {
		let coord = [];
		coord[0] = parseFloat(arrList[i + 1]);
		coord[1] = parseFloat(arrList[i]);
		geometry.coordinates[0].push(coord);
	}
	return geometry;

}

/**
 * @function _addBoxGeometry
 * @param {string} myGeo 
 * @return {object}
 */
let _addBoxGeometry = function (myGeo) {
	let geometry = {};
	geometry.type = "Polygon";
	geometry.coordinates = [];
	geometry.coordinates[0] = [];

	let arrList = myGeo.split(" ", -1);

	let west = parseFloat(arrList[0]);
	let south = parseFloat(arrList[1]);
	let east = parseFloat(arrList[2]);
	let north = parseFloat(arrList[3]);

	let coord = [];
	coord[0] = south;
	coord[1] = west;
	geometry.coordinates[0].push(coord);
	coord = [];
	coord[0] = south;
	coord[1] = east;
	geometry.coordinates[0].push(coord);
	coord = [];
	coord[0] = north;
	coord[1] = east;
	geometry.coordinates[0].push(coord);
	coord = [];
	coord[0] = north;
	coord[1] = west;
	geometry.coordinates[0].push(coord);
	coord = [];
	coord[0] = south;
	coord[1] = west;
	geometry.coordinates[0].push(coord);

	return geometry;

}

/**
 * @function _addLineGeometry
 * @param {string} myGeo 
 * @return {object}
 */
let _addLineGeometry = function (myGeo) {
	let geometry = {};
	geometry.type = "MultiLineString";
	geometry.coordinates = [];
	geometry.coordinates[0] = [];

	let arrList = myGeo.split(" ", -1);

	for (let i = 0; i < arrList.length; i = i + 2) {
		let coord = [];
		coord[0] = parseFloat(arrList[i + 1]);
		coord[1] = parseFloat(arrList[i]);
		geometry.coordinates[0].push(coord);
	}
	return geometry;

}

/**
 * @function _addPointGeometry
 * @param {string} myGeo 
 * @return {object}
 */
let _addPointGeometry = function (myGeo) {
	let geometry = {};
	geometry.type = "Point";
	geometry.coordinates = [];
	geometry.coordinates[0] = [];

	let arrList = myGeo.split(" ", -1);

	for (let i = 0; i < arrList.length; i = i + 2) {
		let coord = [];
		coord[0] = parseFloat(arrList[i + 1]);
		coord[1] = parseFloat(arrList[i]);
		geometry.coordinates = coord;
	}
	return geometry;

}

/**
 * @function _convertGeoRssFpToInternalFp
 * @param {object} myEntry
 * @returns {object}
 */
let _convertGeoRssFpToInternalFp = function (myEntry) {

	let geo;

	geo = Utils.getFromPath(myEntry, 'polygon', '');
	if (geo !== '') {
		return _addPolygonGeometry(geo);
	}
	geo = Utils.getFromPath(myEntry, 'line', '');
	if (geo !== '') {
		return _addLineGeometry(geo);
	}
	geo = Utils.getFromPath(myEntry, 'point', '');
	if (geo !== '') {
		return _addPointGeometry(geo);
	}
	geo = Utils.getFromPath(myEntry, 'box', '');
	if (geo !== '') {
		return _addBoxGeometry(geo);
	}
	return _addPolygonGeometry(geo);
}

/**
 * @function _addProductInformationForFeature
 * @param {object} feature 
 */
let _addProductInformationForFeature = function (feature) {
	let eoResult = Utils.getFromPath(feature, 'properties.EarthObservation.result.EarthObservationResult', null);
	if (eoResult === null) {
		Logger.warn('No Earth Observation Result for feature ' + (feature.id ? feature.id : feature));
		return feature;
	}
	let product = Utils.getFromPath(feature, 'properties.EarthObservation.result.EarthObservationResult.product', null);
	if (product === null) {
		Logger.warn('No product information for feature ' + (feature.id ? feature.id : feature));
		// try to set product object for feature with rel=enclosure
		let productUrl = Utils.getFromPath(feature, 'properties.link[].@.rel=enclosure.href', '');
		if (productUrl !== '') {
			let product = {
				ProductInformation: {
					fileName: {
						ServiceReference: {
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
	}
	return feature;

}
/**
 * Convert a single entry to GeoJSON feature
 * if feature has no EarthObservation attribute, then remove it
 */
let _convertEntryToFeature = function (entry, collectionId) {
	let feature = {};
	feature.id = (entry.id ? entry.id : collectionId + '-' + Math.round(Math.random() * 10000).toString());
	feature.type = "Feature";
	feature.properties = entry;
	feature.geometry = _convertGeoRssFpToInternalFp(entry);
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
		properties: _.omit(parsedJson, ['@', 'entry', 'generator'])
	};

	let entries = parsedJson['entry'];
	if (entries) {

		// If there is only one feature, the entries is not an array but the literal object
		if (!Array.isArray(entries)) {
			let feat = _convertEntryToFeature(entries, collectionId);
			if (feat) { featureCollection.features.push(feat); }
		} else {
			entries.forEach((entry) => {
				let feat = _convertEntryToFeature(entry, collectionId);
				if (feat) { featureCollection.features.push(feat); }
			});
		}

	}
	return featureCollection;
}

/**
 * Extract all the declared namespaces in xml and add ':' at the end to simplify removing in tags
 */
let _getNamespaces = function (parsedXml) {

	let namespaceRegexp = new RegExp('xmlns[^"]+(?=":"http)', 'g');
	return JSON.stringify(parsedXml).match(namespaceRegexp).map(item => {
		return item.split(':')[1] + ":";
	});
};

module.exports = {

	/**
	 * Convert parsed xml coming from search request to current ngeo WEBC format
	 * 
	 * @param {Object} parsedXml - XML search response in SX-CAT format as json
	 * @param {string} collectionId - id of collection (dataset)
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