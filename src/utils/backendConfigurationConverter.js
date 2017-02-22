/*
 *	Use local configuration for the same purpose as on client side
 *	i.e. to map properties from file
 */
let data = require('./catalogJsonMaper.json');
let _ = require('lodash');
let logger = require('./logger');

let _getValue = function (object, property, defaultValue) {
	if (object) {
		let value = null;
		let kv = property.split("="); // Split by "=" to handle arrays
		if (kv.length == 2) {
			// Array
			value = _.find(object, function (item) {
				return item[kv[0]] == kv[1];
			});
		} else {
			// Object
			console.log("prop searched is -->" + property);
			value = object[property];
		}

		if (typeof value != 'undefined') {
			console.log("not undefined " + value);
			return value;
		}
	}
	return defaultValue;
}

/**
 *	Helper imperative function to get a parameter from the configuration data
 *	(much faster than recursive one...)
 */
let _get = function (object, path, defaultValue) {
	let names = path.split('.');
	let obj = object;
	for (let i = 0; obj && i < names.length - 1; i++) {
		obj = _getValue(obj, names[i]);
	}

	return _getValue(obj, names[names.length - 1], defaultValue);
};

/**
 *	Helper function to set a paramater on object
 *	Even if one parameter of the path doesn't exists, all the tree of objects
 *	will be created
 */
let _set = function (object, path, value) {
	let kvs = path.split(".");

	let temp = object;
	for (let i = 0; i < kvs.length - 1; i++) {
		let kv = kvs[i];
		let fieldValue = _get(temp, kv, null);
		if (!fieldValue) {
			// Field doesn't exists -> create one
			let nObject = {};

			// Check if next kv is an array element
			if (kvs[i + 1].indexOf("=") > 0) {
				nObject = [];
			}

			if (kv.indexOf("=") > 0) {
				// Array containing the object
				nObject[kv.split("=")[0]] = kv.split("=")[1];
				temp.push(nObject);
			} else {
				// Object
				temp[kv] = nObject;
			}
			temp = nObject;
		} else {
			// Field already exists pass to the new one
			temp = fieldValue;
		}
	}

	// Finally set the value
	temp[kvs[kvs.length - 1]] = value;
}

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
let _convertGmlFpToInternalFp = function (gmlFpEntry) {
	let geometry = {};
	geometry.type = "Polygon";
	geometry.coordinates = [];
	geometry.coordinates[0] = [];
	let poslist = gmlFpEntry.Footprint.multiExtentOf.MultiSurface.surfaceMember.Polygon.exterior.LinearRing.posList;

	let arrList = poslist.split(" ", -1);

	for (let i = 0; i < arrList.length; i = i + 2) {
		let coord = [];
		coord[0] = parseFloat(arrList[i + 1]);
		coord[1] = parseFloat(arrList[i]);
		geometry.coordinates[0].push(coord);
	}

	return geometry;
}

/**
 * Convert entries from backend format to featurecollection format compatible with web client known format
 * @param entries
 *		entries to convert 
 * @return
 *		the feature collection geojson object in webc known format	
 */
let _convertBackendEntryIntoFeatureCollection = function (repJson) {
	let startTime = new Date();
	//for the moment replace all the xmlns in hardcoded manner so we have a json file compatible directly with webc protocol by just removing namespaces
	repJson = repJson.replace(/os\:|dc\:|georss\:|media\:|eop\:|ows\:|om\:|gml\:|xsi:\:|xlink\:|eo\:|geo\:|time\:|opt\:|sar\:/g, '')
	let ojson = JSON.parse(repJson);
	let entries = ojson['entry'];
	let featureCollection = {
		features: [],
		properties: _.omit(ojson, ['@','entry','generator'])
	};
	
	//convert the json into response compatible with webc format
	if (entries) {
		let features = [];
		for (i = 0; i < entries.length; i++) {
			let objectEntryToConvert = entries[i];
			if (objectEntryToConvert) {
				let feature = {};
				feature.id = objectEntryToConvert.id;
				feature.type = "Feature";
				feature.properties = {};
				for (key in objectEntryToConvert) {
					feature.properties[key] = objectEntryToConvert[key];
				}
				let gmlfoi = objectEntryToConvert.EarthObservation.featureOfInterest;
				if (gmlfoi) {
					feature.geometry = _convertGmlFpToInternalFp(gmlfoi);
				}
				features.push(feature);
			}
		}
		featureCollection.features = features;
	}
	logger.info('Our conversion from json to the webc format geojson data is : ', Date.now() - startTime);
	return featureCollection;
}

module.exports = {

	// Get a configuration parameter
	get: function (path, defaultValue) {
		return data ? _get(data, path, defaultValue) : defaultValue;
	},

	/**
	 *	Get mapped property for the given object
	 *	Ex: with "propertyId": "path.in.the.object" defined in configuration.json
	 *	and object = { path: { in: { the: { object: "someValue" } } } }
	 *	By calling:
	 *	>Configuration.getMappedProperty(object, "propertyId");
	 *	You will get:
	 *	>"someValue"
	 *
	 *	@param object
	 *		Object from which you need to extract the property
	 *	@param propertyId
	 *		The property id which is defined in configuration.json in serverPropertyMapper object
	 *	@param defaultValue
	 *		The default value if the path wasn't found
	 */
	getMappedProperty: function (object, propertyId, defaultValue) {
		let propertyPath = this.get("serverPropertyMapper." + propertyId);
		if (propertyPath)
			return _get(object, propertyPath, defaultValue);
		else
			return defaultValue;
	},

	/**
	 *	Set mapped property
	 *	@see getMappedProperty for more details
	 */
	setMappedProperty: function (object, propertyId, value) {
		let propertyPath = this.get("serverPropertyMapper." + propertyId);
		if (propertyPath) {
			let parentPath = propertyPath.substr(propertyPath, propertyPath.lastIndexOf("."));
			let prop = propertyPath.substr(propertyPath.lastIndexOf(".") + 1);
			let parentValue = _get(object, parentPath, null);
			if (parentValue) {
				parentValue[prop] = value;
			} else {
				//console.warn(parentPath + " doesn't exist");
				_set(object, propertyPath, value);
			}
		} else {
			//console.warn(propertyId + " wasn't found in serverPropertyMapper");
		}
	},

	/**
	 * Convert json to current ngeo WEBC format
	 * 
	 * @param {string} parsedJson
	 *      Json in SX-CAT format
	 * @return featureCollection
	 *      Feature collection compatible with WEBC format
	 */
	convertToNgeoWebCFormat: function (parsedJson) {
		return _convertBackendEntryIntoFeatureCollection(JSON.stringify(parsedJson))
	}

};