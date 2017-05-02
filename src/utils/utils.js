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
	getValue: function(object, property, defaultValue) {
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
	 * Helper iterative function to get a property from a json object
	 *
	 * @function getFromPath
	 * @param {object} object - JSON object
	 * @param {string} path - path to reach the value
	 * @param {object} defaultValue - value if path not found
	 * @returns {object}
	 */
	getFromPath: function(object, path, defaultValue) {
		var names = path.split('.');
		var obj = object;
		for (var i = 0; obj && i < names.length - 1; i++) {
			var nameKV = names[i].split('[]');
			if (nameKV.length === 2) {
				var obj2 = null;
				for (var j=0; j<obj[nameKV[0]].length; j++) {
					var obj2 = obj[nameKV[0]][j];
					for (var k=i+1; obj2 && k < names.length -1; k++) {
						obj2 = this.getValue(obj2, names[k]);
					}
					if (obj2) {i=k; break;}
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
	findTagByXmlns: function(myJsonOSDD, myPathXmlns) {
		let _result = '';
		for (var _node in myJsonOSDD['@']) {
			if (myJsonOSDD['@'][_node].indexOf(myPathXmlns) >= 0) {
				_result = _node.split(':')[1] + ':';
				break;
			}
		}
		return _result;
	}

};