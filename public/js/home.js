(function() {
  'use strict';

  var globals = typeof window === 'undefined' ? global : window;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};
  var aliases = {};
  var has = ({}).hasOwnProperty;

  var endsWith = function(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
  };

  var _cmp = 'components/';
  var unalias = function(alias, loaderPath) {
    var start = 0;
    if (loaderPath) {
      if (loaderPath.indexOf(_cmp) === 0) {
        start = _cmp.length;
      }
      if (loaderPath.indexOf('/', start) > 0) {
        loaderPath = loaderPath.substring(start, loaderPath.indexOf('/', start));
      }
    }
    var result = aliases[alias + '/index.js'] || aliases[loaderPath + '/deps/' + alias + '/index.js'];
    if (result) {
      return _cmp + result.substring(0, result.length - '.js'.length);
    }
    return alias;
  };

  var _reg = /^\.\.?(\/|$)/;
  var expand = function(root, name) {
    var results = [], part;
    var parts = (_reg.test(name) ? root + '/' + name : name).split('/');
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function expanded(name) {
      var absolute = expand(dirname(path), name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var require = function(name, loaderPath) {
    var path = expand(name, '.');
    if (loaderPath == null) loaderPath = '/';
    path = unalias(name, loaderPath);

    if (has.call(cache, path)) return cache[path].exports;
    if (has.call(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (has.call(cache, dirIndex)) return cache[dirIndex].exports;
    if (has.call(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '" from '+ '"' + loaderPath + '"');
  };

  require.alias = function(from, to) {
    aliases[to] = from;
  };

  require.register = require.define = function(bundle, fn) {
    if (typeof bundle === 'object') {
      for (var key in bundle) {
        if (has.call(bundle, key)) {
          modules[key] = bundle[key];
        }
      }
    } else {
      modules[bundle] = fn;
    }
  };

  require.list = function() {
    var result = [];
    for (var item in modules) {
      if (has.call(modules, item)) {
        result.push(item);
      }
    }
    return result;
  };

  require.brunch = true;
  require._cache = cache;
  globals.require = require;
})();
require.register("configuration", function(exports, require, module) {
/**
 * Configuration module
 */

/**
 * Helper function to remove comments from the JSON file
 */
var removeComments = function(string) {
	var starCommentRe = new RegExp("/\\\*(.|[\r\n])*?\\\*/", "g");
	var slashCommentRe = new RegExp("(^[\/]|[^:]\/)\/.*[\r|\n]", "g");
	string = string.replace(slashCommentRe, "");
	string = string.replace(starCommentRe, "");

	return string;
};

/**
 * Helper recursive function to get a parameter from the configuration data
 */
var _getValue = function(object, property, defaultValue) {
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
};

var configuration = {

	// The base url to retreive the configurations
	url: '../conf',

	// The base server url
	baseServerUrl: '/ngeo-qs/ngeo',

	// The server host name
	serverHostName: window.location.protocol + '//' + window.location.host,

	// Local configuration
	localConfig: null,

	// Configuration
	data: {},

	// Load configurations
	load: function() {
		var externalData = {};
		return $.when(
			// Local configuration
			$.ajax({
				//url: this.serverHostName + "/client-dev/conf/localConfiguration.json",
				url: this.url + "/localConfiguration.json",
				dataType: 'json',
				success: function(data) {
					configuration.localConfig = data;
				},
				error: function(jqXHR, textStatus, errorThrown) {
					console.log("Local configuration not found " + textStatus + ' ' + errorThrown);
				}
			}),
			// Server configuration
			$.when(
				$.ajax({
					url: this.url + "/configuration.json",
					dataType: 'text',
					success: function(data) {
						configuration.setConfigurationData(data);
					},
					error: function(jqXHR, textStatus, errorThrown) {
						console.log("Configuration not found " + textStatus + ' ' + errorThrown);
					}
				}),
				$.ajax({
					url: this.baseServerUrl + "/webClientConfigurationData",
					dataType: 'text',
					success: function(data) {
						externalData = data;
					},
					error: function(jqXHR, textStatus, errorThrown) {
						console.log("Configuration not found " + textStatus + ' ' + errorThrown);
					}
				})
			).then(function(){
				// Override our's server configuration with one coming from WEBS
				configuration.buildServerConfiguration(externalData);
			})
		);
	},

	setConfigurationData: function(configurationData) {
		configuration.data = JSON.parse(removeComments(configurationData));
	},

	/**
	 *	Build server configuration
	 */
	buildServerConfiguration: function(externalData) {
		// Remove comments 
		externalData = JSON.parse(removeComments(externalData));

		// Merge configurations with priority to configuration coming from server
		$.extend(true, configuration.data, externalData);
	},

	// Get a configuration parameter
	get: function(path, defaultValue) {
		return this.data ? this.getFromPath(this.data, path, defaultValue) : defaultValue;
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
		//var propertyPath = this.get("serverPropertyMapper."+propertyId);
		var propertyPath = this.getFromPath(this.localConfig, "serverPropertyMapper." + propertyId);
		if (propertyPath) {
			var value = this.getFromPath(object, propertyPath, defaultValue);
			if (propertyId == "browses" && !_.isArray(value)) {
				// HACK: since WEBS sends browses as an Object when there is only one browse
				// we don't want to change all the logic in WEBC so convert it to array here for now
				// For more details see NGEO-2182 (in comments)
				value = [value];
			}
			return value;
		} else {
			return defaultValue;
		}
	},

	/**
	 *	Set mapped property
	 *	@see getMappedProperty for more
	 */
	setMappedProperty: function(object, propertyId, value) {

		//var propertyPath = this.get("serverPropertyMapper."+propertyId);
		var propertyPath = this.getFromPath(this.localConfig, "serverPropertyMapper." + propertyId);
		if (propertyPath) {
			var parentPath = propertyPath.substr(propertyPath, propertyPath.lastIndexOf("."));
			var prop = propertyPath.substr(propertyPath.lastIndexOf(".") + 1);
			var parentValue = this.getFromPath(object, parentPath, null)
			if (parentValue) {
				parentValue[prop] = value;
			} else {
				console.warn(parentPath + " doesn't exist");
			}
		} else {
			console.warn(propertyId + " wasn't found in serverPropertyMapper");
		}
	},

	/**
	 *	Helper imperative function to get a parameter from the configuration data
	 *	(much faster than recursive one...)
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
						obj2 = _getValue(obj2, names[k]);
					}
					if (obj2) {i=k; break;}
				}
				obj = obj2;
			} else {
				obj = _getValue(obj, names[i]);
			}
		}

		return _getValue(obj, names[names.length - 1], defaultValue);
	}
};

module.exports = configuration;
});

require.register("home", function(exports, require, module) {
"use strict";

var Configuration = require("configuration");

module.exports = {
	initialize: function(confPath) {
		// MS: Ugly hack to find the relative path to configuration
		Configuration.url = confPath ? confPath : "conf";
		Configuration.load().done(function() {
			$("body .contactUs").attr("href", "mailto:" + Configuration.get("mailto"));
		});
	}
};
});


//# sourceMappingURL=home.js.map