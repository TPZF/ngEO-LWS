let _ = require('lodash');

/**
 *  utilities file containing shared funccion
 */

module.exports = {

	/**
	 * Helper function to remove comments from the JSON file
	 */
	removeComments: function (string) {
		let starCommentRe = new RegExp("/\\\*(.|[\r\n])*?\\\*/", "g");
		let slashCommentRe = new RegExp("(^[\/]|[^:]\/)\/.*[\r|\n]", "g");
		string = string.replace(slashCommentRe, "");
		string = string.replace(starCommentRe, "");
		return string;
	},

	/**
	 * Helper function to get a property from an object
	 * 
	 * @function getValue
	 * @param {object} object - JSON object
	 * @param {string} property - property to find in object
	 * @param {object} defaultValue - default value if property is not found
	 * @returns {object}
	 */
	getValue: function (object, property, defaultValue) {
		if (object) {
			var value = null;
			var kv = property.split("="); // Split by "=" to handle arrays
			if (kv.length == 2) {
				// Array
				if (object[kv[0]] == kv[1]) {
					return object;
				}
			} else {
				// Object
				value = object[property];
			}

			if (typeof value != 'undefined') {
				return value;
			}
		}

		return defaultValue;
	},

	/**
	 * Get property from an array of paths
	 *
	 * @function getPropertyFromPaths
	 * @param object - Object from which you need to extract the property
	 * @param propertyPaths - Array of paths 
	 * @param defaultValue - The default value if none path was found
	 * @returns {string}
	*/
	getPropertyFromPaths: function (object, propertyPaths, defaultValue) {
		var _this = this;
		if (propertyPaths && _.isArray(propertyPaths) && propertyPaths.length > 0) {
			var value = defaultValue;
			propertyPaths.forEach(function (_propertyPath) {
				var _value = _this.getFromPath(object, _propertyPath, defaultValue);
				if (_value !== defaultValue && typeof _value !== 'object') {
					value = _value;
				}
			});
			return value;
		} else {
			return defaultValue;
		}
	},

	/**
	 * Helper iterative function to get a property from a json object
	 *
	 * @function getFromPath
	 * @param {object} object - JSON object
	 * @param {string} path - path to reach the value
	 * @param {object} defaultValue - value if path not found
	 * @returns {object}
	 */
	getFromPath: function (object, path, defaultValue) {
		var names = path.split('.');
		var obj = object;
		for (var i = 0; obj && i < names.length - 1; i++) {
			var nameKV = names[i].split('[]');
			if (nameKV.length === 2) {
				var obj2 = null;
				for (var j = 0; j < obj[nameKV[0]].length; j++) {
					var obj2 = obj[nameKV[0]][j];
					for (var k = i + 1; obj2 && k < names.length - 1; k++) {
						obj2 = this.getValue(obj2, names[k]);
					}
					if (obj2) { i = k; break; }
				}
				obj = obj2;
			} else {
				obj = this.getValue(obj, names[i]);
			}
		}

		return this.getValue(obj, names[names.length - 1], defaultValue);
	},

	/**
	 * @function findTagByXmlns
	 * @param {string} myJsonOSDD 
	 * @param {string} myPathXmlns
	 * @returns {string}
	 */
	findTagByXmlns: function (myJsonOSDD, myPathXmlns) {
		let _result = '';
		if (myJsonOSDD['@']) {
			for (var _node in myJsonOSDD['@']) {
				if (myJsonOSDD['@'][_node].indexOf(myPathXmlns) >= 0) {
					_result = _node.split(':')[1] + ':';
					break;
				}
			}
		}
		return _result;
	},

	/** 
	 * @function getTagObjectFromOSDD
	 * @param {JSON} myJsonOSDD the osdd in json format
	 * @param {string} tagName the tagname we want to search (give only the tagname without the namespace as from the xml osdd specification)
	 * @returns {Array} array of object that has key equal to the tagName we are searching from this OSDD
	*/
	getTagObjectFromOSDD: function (myJsonOSDD, tagName) {
		let resultNodes = [];
		_.forEach(myJsonOSDD, function (value, key) {
			if (key == tagName || key.endsWith(":" + tagName)) {
				resultNodes.push(myJsonOSDD[key]);
			}
		});
		//as the osdd xml is transformed in json and if we have stange config from the backend
		//for exmaple they can configure it like
		//<OpenSearchDescription> ...
		//	...
		//	<Url rel="self" template="http://fedeo.esa.int/opensearch/description.xml?parentIdentifier=ENVISAT.ASA.WSS_1P" type="application/opensearchdescription+xml"/>
		//	<os:Url xmlns:os="http://a9.com/-/spec/opensearch/1.1/" ...>
		//	<os:Url xmlns:os="http://a9.com/-/spec/opensearch/1.1/" ...>
		//	...
		//</OpenSearchDescription>
		//We had the case for fedeo for example returning such a response
		//So when this is transformed into json object by our translator then
		//it is like osddJson containing one object Url and other object os:url containing an array of Object url
		//That is why we flatten it so we have an array of Url or namespace:Url
		return _.flatten(resultNodes);
	}

};