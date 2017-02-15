/**
 *	Use local configuration for the same purpose as on client side
 *	i.e. to map properties from file
 */
var data = require('./catalogJsonMaper.json');
var lodash = require('lodash');

var _getValue = function(object, property, defaultValue) {
	if ( object ) {
		var value = null;
		var kv = property.split("="); // Split by "=" to handle arrays
		if ( kv.length == 2 ) {
			// Array
			value = lodash.find(object, function(item) {
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
* Given a object Entry from feed-->Entry[i], will convert it into a webccompatible geojson feature object
*/
var _convertBackendEntryIntoFeature = function(objectEntryToConvert){
	var feature = {};
	feature.id = objectEntryToConvert.id;
	feature.type = "Feature";
	feature.properties = {};
	for (key in objectEntryToConvert){
		console.log(objectEntryToConvert[key]);
	}
	feature.geometry = "todo";

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

	convertBackendEntryIntoFeature: function(entries){
		//for(i=0; i<entries.length;i++){
			var objectEntryToConvert = entries[0];
			var feature = {};
			feature.id = objectEntryToConvert.id;
			feature.type = "Feature";
			feature.properties = {};
			for (key in objectEntryToConvert){
				feature.properties[key] = objectEntryToConvert[key]
				//console.log(objectEntryToConvert[key]);
			}
			feature.geometry = "todo";
			console.log(feature);
		//}
		return feature;
	}

};



