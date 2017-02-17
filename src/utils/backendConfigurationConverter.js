/**
 *	Use local configuration for the same purpose as on client side
 *	i.e. to map properties from file
 */
var data = require('./catalogJsonMaper.json');
var _ = require('lodash');
let Xml2JsonParser = require('../utils/xml2jsonParser');
var logger = require('./logger');

var _getValue = function(object, property, defaultValue) {
	if ( object ) {
		var value = null;
		var kv = property.split("="); // Split by "=" to handle arrays
		if ( kv.length == 2 ) {
			// Array
			value = _.find(object, function(item) {
				return item[kv[0]] == kv[1];
			});
		} else {
			// Object
			console.log("prop searched is -->" + property);
			value = object[property];
		}

		if ( typeof value != 'undefined' ) {
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
var _get = function(object, path, defaultValue) {
	var names = path.split('.');
	var obj = object;
	for ( var i = 0; obj && i < names.length-1; i++ ) {
		obj = _getValue( obj, names[i] );
	}

	return _getValue( obj, names[names.length-1], defaultValue );
};

/**
 *	Helper function to set a paramater on object
 *	Even if one parameter of the path doesn't exists, all the tree of objects
 *	will be created
 */
var _set = function(object, path, value) {
	var kvs = path.split(".");

	var temp = object;
	for ( var i = 0; i<kvs.length - 1; i++ ) {
		var kv = kvs[i];
		var fieldValue = _get(temp, kv, null);
		if ( !fieldValue ) {
			// Field doesn't exists -> create one
			var nObject = {};

			// Check if next kv is an array element
			if ( kvs[i+1].indexOf("=") > 0 ) {
				nObject = [];
			}

			if ( kv.indexOf("=") > 0 ) {
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
	temp[kvs[ kvs.length-1 ]] = value;
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
var _convertGmlFpToInternalFp = function(gmlFpEntry){
	var geometry = {};
	geometry.type = "Polygon";
	geometry.coordinates = [];
	geometry.coordinates[0] = [];
	var poslist = gmlFpEntry.Footprint.multiExtentOf.MultiSurface.surfaceMember.Polygon.exterior.LinearRing.posList;

	var arrList = poslist.split(" ",-1);
	
	for (var i=0 ; i < arrList.length ; i=i+2){
		var coord = [];
		coord[0] = arrList[i+1];
		coord[1] = arrList[i];
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
var	_convertBackendEntryIntoFeatureCollection = function(repJson){
	var startTime = new Date();
	//for the moment replace all the xmlns in hard coded manner so we have a json file compatoble direct with webc response by just doing some
	//replacement at some place
	var repJson = repJson.replace(/os\:|dc\:|georss\:|media\:|eop\:|ows\:|om\:|gml\:|xsi:\:|xlink\:|eo\:|geo\:|time\:|opt\:|sar\:/g,'')
	var ojson = JSON.parse(repJson);
	//convert the json into response compatible with webc format
	var entries = ojson['entry']; // depending on expat lib
	var featureCollection = {};
	if(entries){
		var features = [];
			for(i=0; i<entries.length;i++){
			var objectEntryToConvert = entries[i];
			if(objectEntryToConvert){
				var feature = {};
				feature.id = objectEntryToConvert.id;
				feature.type = "Feature";
				feature.properties = {};
				for (key in objectEntryToConvert){
					feature.properties[key] = objectEntryToConvert[key];
				}
				var gmlfoi = objectEntryToConvert.EarthObservation.featureOfInterest;
				if(gmlfoi){
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
	get: function(path,defaultValue) {
		return data ? _get(data,path,defaultValue) : defaultValue;
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
	getMappedProperty: function(object, propertyId, defaultValue) {
		var propertyPath = this.get("serverPropertyMapper."+propertyId);
		if ( propertyPath )
			return _get(object, propertyPath, defaultValue);
		else
			return defaultValue;
	},

	/**
	 *	Set mapped property
	 *	@see getMappedProperty for more details
	 */
	setMappedProperty: function(object, propertyId, value) {
		var propertyPath = this.get("serverPropertyMapper."+propertyId);
		if ( propertyPath ) {
			var parentPath = propertyPath.substr(propertyPath, propertyPath.lastIndexOf("."));
			var prop = propertyPath.substr(propertyPath.lastIndexOf(".") + 1);
			var parentValue = _get(object, parentPath, null);
			if ( parentValue ) {
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
	 * @param {string} body
	 *      Xml received from backend converted to json as string
	 * @return featureCollection
	 *      Feature collection compatible with WEBC format
	 */
	convertToNgeoWebCFormat: function(body) {
		var featureCollection;
		Xml2JsonParser.parse(body, function(parsedJson) {
			featureCollection = _convertBackendEntryIntoFeatureCollection(JSON.stringify(parsedJson))
		}, function(errorMessage) {
			featureCollection = [];
		});
		return featureCollection;
	}

};



