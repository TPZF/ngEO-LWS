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
require.register("map/browsesLayer", function(exports, require, module) {
/**
 * Browses layer module
 */

var Configuration = require('configuration');
var MapUtils = require('map/utils');

// Helper function to format the numbers in range [0,9] by adding "0" before
var pad2 = function(num) {
    var s = num + "";
    if (s.length < 2) s = "0" + s;
    return s;
}

// Helper function to convert a date to an iso string, only the date part
var toWMTSTime = function(date) {
	return date.getUTCFullYear() + "-" + pad2(date.getUTCMonth()+1) + "-" + pad2(date.getUTCDate()) + "T" + pad2(date.getUTCHours()) + ":" + pad2(date.getUTCMinutes()) + ":" + pad2(date.getUTCSeconds()) + "Z";
};

/**
 *	Container of browses
 */
var BrowsesLayer = function(params, mapEngine) {
	this.params = params;
	
	// A map between feature id and internal browse layer
	var browseLayersMap = {};
	// The array of browse layers
	var browseLayers = [];
	
	/**
	 * Change visibility of browse layers
	 */
	this.setVisible = function(vis) {
		this.params.visible = vis;
		for ( var i = 0; i < browseLayers.length; i++ ) {
			browseLayers[i].params.visible = vis;
			mapEngine.setLayerVisible(browseLayers[i].engineLayer,vis);
		}

		// HACK: Load Map dynamically to avoid circular dependency
		var Map = require('map/map');
		Map.trigger("visibility:changed", this);
	};
	
	/**
	 * Clear the  browse layers
	 */
	this.clear = function() {
		for ( var i = 0; i < browseLayers.length; i++ ) {
			mapEngine.removeLayer(browseLayers[i].engineLayer);
		}
		browseLayersMap = {};
		browseLayers = [];
	};
	
	/**
	 * Add features to layer
	 */
	this.addBrowse = function(feature, browseUrl) {
		var browseId = browseUrl + feature.id;
		if (!browseLayersMap.hasOwnProperty(browseId)) {
			// Set browseUrl in map to mark the creation of browse to avoid double creating of
			// browse provoked by highlight event as well..
			browseLayersMap[browseId] = browseUrl;
			
			var layerDesc = MapUtils.createWmsLayerFromUrl(browseUrl);
			if ( !layerDesc.params.time ) {
				// Take the time from feature if no time has been defined in url
				// Fix NGEO-1031 : remove milliseconds from date
				var begin = Date.fromISOString(Configuration.getMappedProperty( feature, "start" ));
				begin.setUTCMilliseconds(0);
				var end = Date.fromISOString(Configuration.getMappedProperty( feature, "stop" ));
				end.setUTCMilliseconds(0);
				layerDesc.params.time = toWMTSTime(begin) + "/" + toWMTSTime(end);
			}

			if ( layerDesc.type.toUpperCase() == "WMTS" && !layerDesc.params.matrixSet ) {
				// If no matrixSet is defined, take ones from configuration
				var mapProjection = Configuration.get('map.projection', "EPSG:4326");
				var wmtsMap = Configuration.get('browseDisplay.wmtsParameters', {
					"EPSG:4326": {
						"params" : {
							"matrixSet": "WGS84"
						}
					},
					"EPSG:3857": {
						"params": {
							"matrixSet": "g"
						}
					}
				});
				layerDesc.projection = mapProjection;
				layerDesc.params.matrixSet = wmtsMap[mapProjection].params.matrixSet;
			}
			MapUtils.computeExtent(feature);

			// Update some WEBC intrinsic values which couldn't be extracted from browse url
			_.merge(layerDesc, {
				name: browseUrl,
				visible: this.params.visible,
				opacity: Configuration.get("map.browseDisplay.opacity", 1.0),
				bbox: feature.bbox,
				crossOrigin: Configuration.get("map.browseDisplay.crossOrigin", "anonymous")
			});
			layerDesc.params.transparent = true;

			var browseLayerDesc = {
				time:  Configuration.getMappedProperty( feature, "stop" ),
				params: layerDesc.params,
				engineLayer: mapEngine.addLayer(layerDesc)
			};

			// Finally set the real browseLayerDesc in browseLayerMap
			browseLayersMap[browseId] = browseLayerDesc;
			browseLayers.push( browseLayerDesc );
		}
	};

	/**
	 * Remove browse from layer
	 *
	 * @param id
	 *		Browse url
	 */
	this.removeBrowse = function(feature, browseUrl)  {
		var browseId = browseUrl + feature.id;
		// Remove the WMS only if it does exists
		if (browseLayersMap.hasOwnProperty(browseId)) {
		
			// Get the browse layer structure from the map
			var bl = browseLayersMap[ browseId ];
			
			// Delete it
			delete browseLayersMap[ browseId ];
			
			// Remove browse layer from the current engine
			mapEngine.removeLayer(bl.engineLayer);
			
			// Remove from array
			browseLayers.splice( browseLayers.indexOf(bl), 1 );
		}
	};
	
	this.isEmpty = function() {
		return browseLayers.length == 0;
	};
	
	/**
	 * Change engine
	 */
	this.changeEngine = function(me) {
		mapEngine = me;
		for ( var i = 0; i < browseLayers.length; i++ ) {
			browseLayers[i].engineLayer = mapEngine.addLayer( browseLayers[i].params );
		}
	};

	/**
	 *	Browses getter
	 */
	this.getBrowses = function() {
		return browseLayers;
	}
};

module.exports = BrowsesLayer;




});

require.register("map/degreeConvertor", function(exports, require, module) {
var dmsRe = /^\s*(-?)(\d+)°(\d+)'(\d+)"([EWNS]{0,1})\s*$/;

function filterFloat(value) {
	if (isNaN(value))
		return NaN;
	return parseFloat(value);
}

/**
 * Utility module to convert decimal degree to degree/minute/second and vice versa.
 */
module.exports = {
	/**
	 * Utility method to convert coordinates from decimal degree to
	 * degree/minute/second.
	 * 
	 * @param dd
	 *            coordinates in decimal degrees
	 * @param isLon
	 *            flag indicating if coordinates is on longitude or not
	 * @param options
	 *		- sep
	 *            separator
	 *		- positionFlag
	 *			  'letter': EW/NS at the end
	 *			  'number': +/- at the beginning
	 * @return coordinates in degree/minute/second
	 */
	toDMS: function(dd, isLon, options = {}) {

		var deg = dd | 0; // truncate dd to get degrees
		var frac = Math.abs(dd - deg); // get fractional part
		var min = (frac * 60) | 0; // multiply fraction by 60 and truncate
		var sec = (frac * 3600 - min * 60) | 0;
		var res = Math.abs(deg) + (options.sep || "°") + min + (options.sep || "'") + sec + (options.sep || '"');
		var positionFlag;
		if ( options.positionFlag == "letter" ) {
			positionFlag = "";
			if (isLon) {
				positionFlag = (dd >= 0) ? "E" : "W";
			} else {
				positionFlag = (dd >= 0) ? "N" : "S";
			}
			return res + positionFlag;
		} else {
			positionFlag = (dd >= 0) ? "" : "-";
			return positionFlag + res;
		}
	},

	/**
	 * Utility method to convert coordinate from degree/minute/second to
	 * decimal degrees.
	 * 
	 * @param dms
	 *            coordinate in degree/minute/second
	 * @return coordinate in decimal degrees.
	 */
	toDecimalDegrees: function(dms) {
		var match = dmsRe.exec(dms);

		if (match) {

			var coordinate = parseFloat(match[2]) + (parseFloat(match[3]) / 60.0) + (parseFloat(match[4]) / 3600.0);
			coordinate *= (match[4] == 'W' || match[4] == 'S' || match[1] == "-") ? -1.0 : 1.0;

			return coordinate;
		} else {
			return Number.NaN;
		}
	},

	/**
	 *	Parse the given value to decimal from whatever format (DMS or string)
	 */
	parseCoordinate: function(val) {
		if ( dmsRe.test(val) ) {
			return this.toDecimalDegrees(val);
		} else {
			return filterFloat(val);
		}
	},

	/**
	 * Utility method to convert coordinates from text in degree/minute/second to array of decimal
	 * degrees coordinates.
	 * NB: lat/lon convention is used
	 * 
	 * @param dms
	 *            text containing coordinates in degree/minute/second
	 * @return array of coordinates extracted from DMS text. Empty array if regexp don't found match. 
	 */
	textToDecimalDegrees: function(text) {

		var coordinates = [];
		// Convert every position in text to decimal
		var positions = text.trim().split('\n')
		for ( var i=0; i<positions.length; i++ ) {
			var position = positions[i].split(" ");
			var lat = this.parseCoordinate(position[0]);
			var lon = this.parseCoordinate(position[1]);
			coordinates.push([lon, lat]);
		}

		// Old version, keep it just for history :)
		// var polygonRe = /\s*(-?)(\d+)°(\d+)'(\d+)"([NS]{0,1})\s+(-?)(\d+)°(\d+)'(\d+)"([EW]){0,1}/gm;
		// var match = polygonRe.exec(text);
		// while (match) {
		// 	var lat = parseFloat(match[2]) + (parseFloat(match[3]) / 60.0) + (parseFloat(match[4]) / 3600.0);
		// 	var lon = parseFloat(match[7]) + (parseFloat(match[8]) / 60.0) + (parseFloat(match[9]) / 3600.0);
		// 	lat *= (match[5] == 'S' || match[1] == "-") ? -1.0 : 1.0;
		// 	lon *= (match[10] == 'W' || match[6] == "-") ? -1.0 : 1.0;
		// 	coordinates.push([lon, lat]);
		// 	match = polygonRe.exec(text);
		// }

		return coordinates;
	}
};
});

require.register("map/gazetteer", function(exports, require, module) {
/**
 * Gazetteer module.
 * The function to define the Gazetteer module
 */


var Configuration = require('configuration');

/**
 * Private function
 */

/**
 * Public interface
 */
module.exports = {

	/**
	 * Query the gazetter and return the result in a callback
	 */
	query: function(options) {

		var queryUrl = 'https://nominatim.openstreetmap.org/search?';
		queryUrl += 'q=' + encodeURIComponent(options.query);
		queryUrl += '&format=json';
		if (Configuration.data.gazetteer.outputPolygon) {
			queryUrl += '&polygon_text=1';
		}
		queryUrl += '&limit=' + Configuration.data.gazetteer.maxResults;

		$.ajax({
			url: queryUrl,
			dataType: 'jsonp',
			jsonp: 'json_callback',
			timeout: Configuration.data.gazetteer.timeout, // Timeout is needed to have an error callback
			success: function(data) {
				if (options.result) {
					options.result(data);
				}
			},
			error: function() {
				if (options.result) {
					options.result([]);
				}
			}
		});

	},

};
});

require.register("map/geojsonconverter", function(exports, require, module) {
/**
 * GeoJsonConverter based on OpenLayers
 */

//require('OpenLayers.min');
var Configuration = require('../configuration');

// Use to convert to GeoJSON 
var geoJsonFormat = new OpenLayers.Format.GeoJSON();

/*!
 * Convert a OpenLayer.Feature object to GeoJSON
 * @return a GeoJSON feature collection
 */
var _convertOL = function(features) {
	if (features && features.length > 0) {
		var json = geoJsonFormat.write(features);
		return JSON.parse(json);
	}
};

/**
 * @function _buildKMLDescription
 * @param {object} myFeature 
 * @returns {string}
 */
var _buildKMLDescription = function(myFeature) {
	let result = '';
	result += ' <description><![CDATA[';
	let urlIcon = Configuration.getFromPath(myFeature, 'properties.link[].@.rel=icon.href', '');
	if (urlIcon !== '') {
		result += ' <img width="100" height="100" src="' + urlIcon + '" >';
	}
	result += ' ]]></description>';
	return result;
};

var _buildKMLExtendedData = function(myFeature) {
	let aProp = ["identifier", "title", "published", "updated", "date", "originDatasetId", "productUrl", "polygon"];
	let result = '';
	result += ' <ExtendedData>';
	aProp.forEach(function(property) {
		if (myFeature.properties[property]) {
			result += '  <Data name="' + property + '">';
			result += '   <value>' + myFeature.properties[property] + '</value>';
			result += '  </Data>';
		}
	})
	result += ' </ExtendedData>';
	return result;
};

/**
 * @function _buildKMLGeometry
 * @param {*} myFeatureGeometry 
 * @returns {string}
 */
var _buildKMLGeometry = function(myFeatureGeometry) {
	let result = '';
	// Only type Polygon is treated
	if (myFeatureGeometry.type === 'Polygon') {
		result += ' <Polygon>';
		result += '  <outerBoundaryIs>';
		result += '   <LinearRing>';
		result += '    <coordinates>';
		myFeatureGeometry.coordinates[0].forEach(function(coord) {
			result += coord[0] + ',' + coord[1] + ' ';
		});
		result += '    </coordinates>';
		result += '   </LinearRing>';
		result += '  </outerBoundaryIs>';
		result += ' </Polygon>';
	}
	return result;
};

/**
 * Convert to KML, without use OpenLayers lib
 * 
 * @function _convertToKML
 * @param {object} myFeatureCollection 
 */
var _convertToKML = function(myFeatureCollection) {
	var result = '<kml xmlns="http://earth.google.com/kml/2.0">';
	result += '<Folder>';
    result += '<name>Export from ngEO</name>';
    result += '<description>Exported on ' + new Date() + '</description>';
	myFeatureCollection.features.forEach(function(feature) {
		result += '<Placemark id="' + feature.id + '">';
        result += ' <name>' + feature.properties.title + '</name>';
        result += _buildKMLDescription(feature);
		result += _buildKMLGeometry(feature.geometry);
		result += _buildKMLExtendedData(feature);
		result += '</Placemark>'
	});
    result += '</Folder>';
	result += '</kml>';
	return result;
}

/**
 * Public interface for GeoJsonConverter
 */
module.exports = {
	/*!
	 * Load layer data into GeoJSON
	 * @param layer the layer to load
	 * @param onload the callback to call when all data is loaded
	 */
	load: function(layer, onload) {

		// Create OpenLayers protocol according to its type
		var protocol;
		switch (layer.type) {
			case "GeoRSS":
				protocol = new OpenLayers.Protocol.HTTP({
					url: layer.location,
					format: new OpenLayers.Format.GeoRSS()
				});
				break;
			case "WFS":
				protocol = new OpenLayers.Protocol.WFS({
					url: layer.baseUrl,
					featureType: layer.featureType,
					featureNS: layer.featureNS
				});
				break;
		}

		// If protocol exists, call it to load data
		if (protocol) {
			protocol.read({
				callback: function(resp) {
					if (resp.features) {
						onload(_convertOL(resp.features));
					}
				}
			});
		}
	},

	/*!
	 * Convert GeoJSON features to any format
	 *
	 * @param features the features to convert
	 * @param format the format
	 *
	 * @return the data as a string
	 */
	convert: function(features, format) {
		var f = format.toUpperCase();

		var fc = {
			type: 'FeatureCollection',
			features: features
		};

		switch (f) {
			case "KML":
				// Convert to OpenLayers
				return _convertToKML(fc);
				/*var olFeatures = geoJsonFormat.read(fc);
				var kmlFormat = new OpenLayers.Format.KML();
				return kmlFormat.write(olFeatures);*/
				break;
			case "GML":
				var olFeatures = geoJsonFormat.read(fc);
				var gmlFormat = new OpenLayers.Format.GML();
				return gmlFormat.write(olFeatures);
				break;
			case "JSON":
			case "GEOJSON":
				return JSON.stringify(fc);
		}
	},

	/*!
	 * Convert a vector layer to GeoJSON
	 * The layer data is converted to GeoJSON
	 *
	 * @param layer the layer to convert
	 *
	 * @return if the function succeeds
	 */
	toGeoJSON: function(layer) {
		if (!layer.data) {
			return false;
		}

		var features;
		switch (layer.type.toUpperCase()) {
			case "KML":
				var kmlFormat = new OpenLayers.Format.KML({
					extractStyles: true,
					extractAttributes: true,
					maxDepth: 0
				});
				features = kmlFormat.read(layer.data);
				break;
			case "GML":
				var gmlFormat = new OpenLayers.Format.GML();
				features = gmlFormat.read(layer.data);
				break;
			case "JSON":
			case "GEOJSON":
				if (typeof layer.data == "string") {
					layer.data = JSON.parse(layer.data);
				}
				layer.type = 'GeoJSON';
				return true;
		}

		if (features && features.length > 0) {
			layer.data = _convertOL(features);
			layer.type = 'GeoJSON';
			return true;
		}

		return false;
	}
};
});

require.register("map/globweb", function(exports, require, module) {
/**
 * GlobWeb map engine
 */


var Configuration = require('configuration');
var GeojsonConverter = require('map/geojsonconverter');
//require('GlobWeb.min');

var baseZIndex = 365; // "Magic number" to make WMS/WMTS always on top

/**
 * GlobeWeb Map Engine constructor
 * parentElement : the parent element div for the map
 */
GlobWebMapEngine = function(parentElement) {
	this.groundOverlays = {};
	this.features = {};
	this.styles = {};
	this.parentElement = parentElement;
	this.nbAddedOverlays = 0;

	try {
		// Create the canvas element
		var canvas = document.createElement('canvas');
		canvas.id = "map";
		canvas.width = parentElement.clientWidth;
		canvas.height = parentElement.clientHeight;
		parentElement.appendChild(canvas);
		this.canvas = canvas;

		// Create element to show attributions
		var attributions = document.createElement('div');
		attributions.id = "attributions";
		attributions.className = "olControlAttribution"; // Use existing openlayers CSS rules
		parentElement.appendChild(attributions)
		this.attributions = attributions;

		// Create the globe
		var globe = new GlobWeb.Globe({
			canvas: canvas,
			tileErrorTreshold: Configuration.get('map.globweb.tileErrorTreshold', 2),
			continuousRendering: Configuration.get('map.globweb.continuousRendering', false)
		});

		// Add attribution handler
		new GlobWeb.AttributionHandler(globe, {
			element: 'attributions'
		});

		var elevationParams = Configuration.get('map.globweb.elevationLayer');
		if (elevationParams) {
			var elevationLayer = new GlobWeb.WCSElevationLayer(elevationParams);
			globe.setBaseElevation(elevationLayer);
		}

		// Display some stats
		if (Configuration.get('map.globweb.displayStats', false)) {
			this.stats = document.createElement('div');
			this.stats.id = "stats";
			parentElement.appendChild(this.stats);
			new GlobWeb.Stats(globe, {
				element: this.stats,
				verbose: true
			});
		}

		// Create the loading element
		this.$loading = $('<img src="../css/images/ajax-loader.gif" id="loading"></img>')
			.appendTo(parentElement);

		globe.subscribe("baseLayersReady", function() {
			$("#loading").hide();
		});

		// Add mouse navigation
		var navigation = new GlobWeb.Navigation(globe, {
			mouse: {
				zoomOnDblClick: false
			},
			zoomDuration: Configuration.get('map.globweb.zoomDuration', 500)
		});
		
		// Used for debug
		// globe.addLayer(new GlobWeb.TileWireframeLayer({outline: true}));

		this.globe = globe;
		this.navigation = navigation;
	} catch (err) {
		parentElement.removeChild(canvas);
		parentElement.removeChild(attributions);
		this.canvas = null;
		this.attributions = null;
		console.log("WebGL cannot be initialized.")
		throw 'WebGLNotFound';
	}
}

var createGWStyle = function(style) {
	var gwStyle = new GlobWeb.FeatureStyle(style);

	if (style.strokeColor) {
		gwStyle.strokeColor = GlobWeb.FeatureStyle.fromStringToColor(style.strokeColor);
	}

	return gwStyle;
};

/** 
 *  Create conditional GlobWeb styles from configuration
 *  @see For more details see NGEO-2222 
 */ 
GlobWebMapEngine.prototype.createConditionalStyles = function(baseStyle, condStyle) {
	var styleHints = ['default', 'select', 'highlight', 'highlight-select'];
	_.each(styleHints, function(styleHint) {
		if ( condStyle[styleHint] ) {
			var s = createGWStyle(condStyle[styleHint]);
			s.isApplicable = function(feature, style) {
				return style == styleHint && Configuration.getFromPath(feature, condStyle.attribute) == condStyle.value;
			}
			baseStyle[condStyle.attribute+"-"+condStyle.value+"-"+styleHint] = s;
		}
	} );
}

/**
 * Add a style
 */
GlobWebMapEngine.prototype.addStyle = function(name, style) {

	var gwStyle = {};

	if (style['default'] || name == "lut") {
		// It's a style map
		for (var x in style) {
			if ( x == "conditionals" ) {
				for (var i=0; i<style[x].length; i++) {
					this.createConditionalStyles(gwStyle, style[x][i]);
				}
			} else {
				if (style.hasOwnProperty(x)) {
					gwStyle[x] = createGWStyle(style[x]);
				}
			}
		}
	} else {
		// It's a simple style description
		gwStyle['default'] = createGWStyle(style);
	}

	this.styles[name] = gwStyle;
};

/**
 * Set the background layer
 */
GlobWebMapEngine.prototype.setBackgroundLayer = function(layer) {

	var gwLayer;

	switch (layer.type.toUpperCase()) {
		case "OSM":
			gwLayer = new GlobWeb.OSMLayer(layer);
			break;
		case "WMS":
			gwLayer = new GlobWeb.WMSLayer($.extend({
					name: layer.name,
					baseUrl: layer.baseUrl,
					projection: layer.projection,
					crossOrigin: layer.crossOrigin,
					attribution: layer.attribution
				},
				layer.params));
			break;
		case "WMTS":
			gwLayer = new GlobWeb.WMTSLayer($.extend({
					name: layer.name,
					baseUrl: layer.baseUrl,
					projection: layer.projection,
					crossOrigin: layer.crossOrigin,
					attribution: layer.attribution,
					layer: layer.params.layer,
					matrixSet: layer.params.matrixSet,
					startLevel: layer.projection == "EPSG:4326" ? 1 : 0
				},
				layer.params));
			break;
		case "BING":
			gwLayer = new GlobWeb.BingLayer(layer);
			break;
	}

	if (gwLayer)
		this.globe.setBaseImagery(gwLayer);

	this.$loading.show();

	return gwLayer;
}

/**
 * Set layer visibility
 */
GlobWebMapEngine.prototype.setLayerVisible = function(gwLayer, vis) {
	gwLayer.visible(vis);
}

/**
 * Set layer index
 */
GlobWebMapEngine.prototype.setLayerIndex = function(gwLayer, index) {
	gwLayer.zIndex = index;
	// Update stylemap to update vector layer z-index ordering
	for ( var x in gwLayer.styleMap ) {
		gwLayer.styleMap[x].zIndex = index;
	}
}

/**
 * Add a layer
 */
GlobWebMapEngine.prototype.addLayer = function(layer) {

	var gwLayer;
	switch (layer.type.toUpperCase()) {
		case "WMS":
			gwLayer = new GlobWeb.WMSLayer($.extend({
				name: layer.name,
				baseUrl: layer.baseUrl,
				projection: layer.projection,
				crossOrigin: layer.crossOrigin
			}, layer.params));
			break;
		case "WMTS":
			var config = {
				name: layer.name,
				baseUrl: layer.baseUrl,
				style: layer.params.style,
				layer: layer.params.layer,
				projection: layer.projection,
				format: layer.params.format,
				matrixSet: layer.params.matrixSet,
				startLevel: layer.projection == "EPSG:4326" ? 1 : 0,
				time: layer.params.time,
				crossOrigin: layer.crossOrigin
			};
			if (layer.bbox) {
				config.geoBound = new GlobWeb.GeoBound(layer.bbox[0], layer.bbox[1], layer.bbox[2], layer.bbox[3]);
			}
			gwLayer = new GlobWeb.WMTSLayer(config);
			break;
		case "FEATURE":
		case "JSON":
		case "GEOJSON":
			gwLayer = new GlobWeb.VectorLayer({
				name: layer.name,
				visible: layer.visible
			});
			if (layer.data) {
				if (typeof layer.data == "string") {
					this.addFeature(gwLayer, JSON.parse(layer.data));
				} else {
					this.addFeature(gwLayer, layer.data);
				}
			}
			break;
		case "WFS":
		case "GEORSS":
			gwLayer = new GlobWeb.VectorLayer({
				name: layer.name,
				visible: layer.visible,
				attribution: layer.attribution,
				style: new GlobWeb.FeatureStyle({
					iconUrl: '../images/point.png',
					pointMaxSize: 40000
				})
			});
			GeojsonConverter.load(layer, $.proxy(gwLayer.addFeatureCollection, gwLayer));
			break;
		case "KML":
			gwLayer = new GlobWeb.VectorLayer(layer);
			$.get(layer.location, function(data) {
				var features = GlobWeb.KMLParser.parse(data);
				gwLayer.addFeatureCollection(features);
			});
			break;
	}

	if (gwLayer) {
		if (layer.style && this.styles.hasOwnProperty(layer.style)) {
			gwLayer.style = this.styles[layer.style]['default'];
			gwLayer.styleMap = _.extend({}, this.styles["lut"], this.styles[layer.style]);
		}
		
		// NGEO-1779: Set zIndex to be always on top for overlay WMS/WMTS
		if ( layer.type.toUpperCase() == "WMS" || layer.type.toUpperCase() == "WMTS" ) {
			gwLayer.zIndex = baseZIndex + this.nbAddedOverlays;
			this.nbAddedOverlays++;
		}

		gwLayer.visible(layer.visible);
		this.globe.addLayer(gwLayer);
	}

	return gwLayer;
}

/**
 * Remove layer from the map engine
 */
GlobWebMapEngine.prototype.removeLayer = function(gwLayer) {
	this.globe.removeLayer(gwLayer);
	if ( gwLayer instanceof GlobWeb.WMTSLayer || gwLayer instanceof GlobWeb.WMSLayer ) {
		this.nbAddedOverlays--;
	}
}

/**
 * Subscribe to GlobWebMap events
 */
GlobWebMapEngine.prototype.subscribe = function(name, callback) {
	switch (name) {
		case "init":
			callback(this);
			break;
		case "navigationModified":
			this.navigation.subscribe("modified", callback);
			break;
		case "mousedown":
		case "mousemove":
		case "mouseup":
		case "click":
		case "dblclick":
			this.canvas.addEventListener(name, callback);
			break;
	}
}

/**
 * Unsubscribe to GlobWebMap events
 */
GlobWebMapEngine.prototype.unsubscribe = function(name, callback) {
	switch (name) {
		case "startNavigation":
			this.globe.unsubscribe("startNavigation", callback);
			break;
		case "endNavigation":
			this.globe.unsubscribe("endNavigation", callback);
			break;
		case "mousedown":
		case "mousemove":
		case "mouseup":
		case "click":
		case "dblclick":
			this.canvas.removeEventListener(name, callback);
			break;
	}
}

/**
 * Update the size of the map
 */
GlobWebMapEngine.prototype.updateSize = function() {
	this.canvas.width = this.parentElement.clientWidth;
	this.canvas.height = this.parentElement.clientHeight;
	this.globe.refresh();
}

/**
 * Get lon lat from pixel
 */
GlobWebMapEngine.prototype.getLonLatFromPixel = function(x, y) {
	var pt = this.globe.getLonLatFromPixel(x, y);
	if (pt) {
		// To be compliant with OpenLayers remove Z
		pt.length = 2;
	}
	return pt;
}

/**
 * Get pixel from lonlat
 */
GlobWebMapEngine.prototype.getPixelFromLonLat = function(lon, lat) {
	var pixel = this.globe.getPixelFromLonLat(lon, lat);
	return {
		x: pixel[0],
		y: pixel[1]
	};
}


/**
 * Get the current viewport extent
 */
GlobWebMapEngine.prototype.getViewportExtent = function() {
	// TODO : improve geobound
	var geoBound = this.globe.getViewportGeoBound();
	if (geoBound)
		return [geoBound.getWest(), geoBound.getSouth(), geoBound.getEast(), geoBound.getNorth()];

	return [-180, -90, 180, 90];
}

/**
 * Zoom in
 */
GlobWebMapEngine.prototype.zoomIn = function() {
	this.navigation.zoom(-2);
	this.globe.refresh();
}

/**
 * Zoom out
 */
GlobWebMapEngine.prototype.zoomOut = function() {
	this.navigation.zoom(2);
	this.globe.refresh();
}

/**
 * Zoom to the given extent
 */
GlobWebMapEngine.prototype.zoomToExtent = function(extent) {
	var lon = (extent[0] + extent[2]) * 0.5;
	var lat = (extent[1] + extent[3]) * 0.5;

	var lonInRad1 = extent[0] * Math.PI / 180;
	var lonInRad2 = extent[2] * Math.PI / 180;
	var latInRad = lat * Math.PI / 180;

	var R = 6371000;
	var x = (lonInRad2 - lonInRad1) * Math.cos(latInRad);
	var d = x * R;

	d = d / Math.cos(22.5 * Math.PI / 180);
	d = Math.min(d, R * 2);

	var geoPos = [lon, lat];
	this.navigation.zoomTo(geoPos, d, Configuration.get('map.globweb.zoomDuration', 500));
}


/**
 * Remove all features from a layer
 */
GlobWebMapEngine.prototype.removeAllFeatures = function(layer) {
	layer.removeAllFeatures();
}

/**
 * Add a feature on the map
 */
GlobWebMapEngine.prototype.addFeature = function(layer, feature) {
	var isCollection = feature.type == 'FeatureCollection';
	if (isCollection) {
		layer.addFeatureCollection(feature);
	} else {
		layer.addFeature(feature);
	}
}

/**
 * Modify the product style
 */
GlobWebMapEngine.prototype.modifyFeatureStyle = function(layer, feature, style) {
	layer.modifyFeatureStyle(feature, layer.styleMap[style]);
	this.globe.refresh();
}

/**
 * Block the navigation
 */
GlobWebMapEngine.prototype.blockNavigation = function(flag) {
	if (flag) {
		this.navigation.stop();
	} else {
		this.navigation.start();
	}
}

/**
 * Update a feature
 */
GlobWebMapEngine.prototype.updateFeature = function(layer, feature) {
	layer.removeFeature(feature);
	layer.addFeature(feature);
}

/**
 * Remove a feature
 */
GlobWebMapEngine.prototype.removeFeature = function(layer, feature) {
	layer.removeFeature(feature);
}

/**
 *	Updates style for the given feature according to conditional styling from configuration
 *	if applicable, otherwise return the initial style
 */
GlobWebMapEngine.prototype.applyConditionalStyling = function(layer, feature, style) {
	var currentStyle = style;
	var engineStyles = layer.styleMap;
	for ( var x in engineStyles ) {
		var engineStyle = engineStyles[x];
		if ( engineStyle.isApplicable && engineStyle.isApplicable(feature, style) ) {
			currentStyle = x;
		}
	}
	return currentStyle;
}

/**
 *  Destroy the map engine
 */
GlobWebMapEngine.prototype.destroy = function() {
	this.globe.dispose();

	this.parentElement.removeChild(this.canvas);
	this.parentElement.removeChild(this.attributions);
	if (this.stats) {
		this.parentElement.removeChild(this.stats);
	}
	this.$loading.remove();

	// Free the object
	this.globe = null;
	this.parentElement = null;
	this.canvas = null;
	this.attributions = null;
	this.navigation = null;
}

module.exports = GlobWebMapEngine;
});

require.register("map/handler", function(exports, require, module) {
var Map = require('map/map');

// Base object for handler
// Take as input the implementation
var Handler = function(impl) {

	// Private variables
	var _previousHandler = null;

	/**
	 * Public interface
	 */
	this.start = function(options) {
		_previousHandler = Map.handler;
		if (_previousHandler) {
			_previousHandler.stop();
		}
		Map.handler = this;

		impl.start(options);
	};

	this.stop = function() {
		impl.stop();

		Map.handler = null;
		if (_previousHandler) {
			_previousHandler.start();
			_previousHandler = null;
		}
	};

	// Copy other methods
	for (var x in impl) {
		if (impl[x] instanceof Function && x != 'start' && x != 'stop') {
			this[x] = impl[x];
		}
	}
};

module.exports = Handler;
});

require.register("map/layerImport", function(exports, require, module) {
/**
 * LayerImport module
 * The function to define the LayerImport module
 */

var Map = require('map/map');

/**
 * A function to cancel default drag event.
 * Needed when setup a droppable area.
 */
var cancelDefaultDrag = function(evt) {
	if (evt.preventDefault) {
		evt.preventDefault();
	}
	return false;
};

var handleDrop = function(event, onload) {
	event.stopPropagation(); // Stops some browsers from redirecting.
	event.preventDefault();

	var files = event.dataTransfer.files;
	for (var i = 0; i < files.length; i++) {
		// Read the File objects in this FileList.
		var reader = new FileReader();
		var file = files[i];
		var ext = file.name.substr(file.name.indexOf('.') + 1);

		// If we use onloadend, we need to check the readyState.
		reader.onloadend = function(evt) {
			if (evt.target.readyState == FileReader.DONE) { // DONE == 2

				// Fill the layer description
				var layerDesc = {
					name: "Imported File : " + file.name,
					type: ext,
					visible: true,
					style: "imported",
					data: evt.target.result
				};

				if (!onload) {
					//Add it to the map
					Map.addLayer(layerDesc);
				} else {
					onload(layerDesc, file);
				}
			}
		};

		reader.readAsText(file);
	}
};



/**
 * Public interface
 */
module.exports = {

	/**
	 * Add a drop area for import layer
	 *
	 * @param element  The HTML element for the drop area
	 * @param onload	A callback called when the layer has been successfully loaded, if no callback the layer is added to the map
	 */
	addDropArea: function(element, onload) {

		// Tells the browser that we *can* drop on this target
		element.addEventListener('dragover', cancelDefaultDrag);
		element.addEventListener('dragenter', cancelDefaultDrag);

		// Activate handle drop
		element.addEventListener("drop", function(event) {
			handleDrop(event, onload);
		});
	},

	isSupported: function() {
		return window.FileReader != undefined;
	},

};
});

require.register("map/map", function(exports, require, module) {
/**
 * Map module
 * The function to define the map module
 */


var Configuration = require('configuration');
var OpenLayersMapEngine = require('map/openlayers');
var GlobWebMapEngine = require('map/globweb');
var UserPrefs = require('userPrefs');
var BrowsesLayer = require('map/browsesLayer');
var MapUtils = require('map/utils');
var DegreeConvertor = require('map/degreeConvertor');


/**
 * Inner class
 */

/**
 * A basic static layer only for visualisation
 */
var Layer = function(params, engineLayer) {

	// The parameters of layer (name, visibility, type...)
	this.params = params;
	// The engine layer
	this.engineLayer = engineLayer;

	this.setVisible = function(vis) {
		this.params.visible = vis;

		if ( this.params.type != "Feature" ) {
			// Store only raster layers into user preferences for now
			var visibleLayers = JSON.parse(UserPrefs.get("Visible layers") || "[]");
			if ( vis ) {
				visibleLayers.push(this.params.name);
			} else {
				var idx = visibleLayers.indexOf(this.params.name);
				if ( idx != -1 ) {
					visibleLayers.splice(idx, 1);
				}
			}
			UserPrefs.save("Visible layers", JSON.stringify(visibleLayers));
		}

		mapEngine.setLayerVisible(this.engineLayer, vis);
		self.trigger("visibility:changed", this);
	};
	this.changeEngine = function(mapEngine) {
		this.engineLayer = mapEngine.addLayer(this.params);
	};
};

/**
 *	Tesselate great circle helper function
 *	NGEO-808: Fixes the rhumb line(constant azimuth) feature geometry to follow the great circles one
 *	@see http://it.mathworks.com/help/map/great-circles-rhumb-lines-and-small-circles.html
 *
 *	Also adds _origGeometry attribute on feature to be used on export
 */
var tesselateGreatCircle = function(params, feature) {
	var needToBeTesselated = (params.greatCircle && !feature._origGeometry);
	if (needToBeTesselated) {
		// NGEO-1778: Store original geometry on feature, used on KML/GeoJSON/other export
		feature._origGeometry = {
			coordinates: $.extend(true, [], feature.geometry.coordinates),
			type: feature.geometry.type
		};
		MapUtils.tesselateGreatCircle(feature);
	}
}

/**
 * A feature layer to add dynamically new feature
 */
var FeatureLayer = function(params, engineLayer) {
	Layer.prototype.constructor.call(this, params, engineLayer);

	// The features
	this.features = [];

	this.clear = function() {
		this.features = [];
		mapEngine.removeAllFeatures(this.engineLayer);
	};
	this.addFeatures = function(features) {
		for (var i = 0; i < features.length; i++) {
			this.addFeature(features[i]);
		}
	};
	this.addFeature = function(feature) {
		if (feature.geometry) {
			tesselateGreatCircle(params, feature);
			mapEngine.addFeature(this.engineLayer, feature);
			this.modifyFeaturesStyle([feature], "default");
			this.features.push(feature);
		}
	};
	this.removeFeatures = function(features) {
		for (var i = 0; i < features.length; i++) {
			mapEngine.removeFeature(this.engineLayer, features[i]);
			this.features.splice(this.features.indexOf(features[i]), 1);
		}
	};

	this.modifyFeaturesStyle = function(features, style) {
		for (var i = 0; i < features.length; i++) {
			var feature = features[i];
			style = mapEngine.applyConditionalStyling(this.engineLayer, feature, style);
			feature.renderHint = style;
			mapEngine.modifyFeatureStyle(this.engineLayer, feature, feature.renderHint);
		}
	};
	this.updateFeature = function(feature, customFixDateLine) {
		tesselateGreatCircle(params, feature);
		mapEngine.updateFeature(this.engineLayer, feature, customFixDateLine);
	};
	this.changeEngine = function(mapEngine) {
		this.engineLayer = mapEngine.addLayer(this.params);
		// Re-add the features to the engine
		for (var i = 0; i < this.features.length; i++) {
			var f = this.features[i];
			f.geometry = _.omit(f.geometry, '_bucket', '_tileIndices');
			mapEngine.addFeature(this.engineLayer, f);
			if (f.renderHint) {
				mapEngine.modifyFeatureStyle(this.engineLayer, f, f.renderHint);
			}
		}
	};
};


/**
 * Private attributes
 */

// Reference to the map singleton
var self = null;
// The different engines used by the map
var engines = {
	'2d': OpenLayersMapEngine,
	'3d': GlobWebMapEngine,
};
// The current map engine
var mapEngine = null;
// The map DOM element
var element = null;
// The current background layer
var backgroundLayer = null;
// Max extent of the map
var maxExtent = [-180, -85, 180, 85];
// To know if map is in geographic or not
var isGeo = false;

/**
 * Build the layer from its parameter
 */
var buildLayer = function(params) {
	if (params.type == "Browses") {
		return new BrowsesLayer(params, mapEngine);
	} else if (params.type == "Feature") {
		return new FeatureLayer(params, mapEngine.addLayer(params));
	} else {
		var engineLayer = mapEngine.addLayer(params);
		if (engineLayer) {
			return new Layer(params, engineLayer);
		}
	}
};

/**
 * Called when mouse is moved on map : update coordinates viewer
 */
var onMouseMove = function(event) {
	var point = self.getLonLatFromEvent(event);

	if (point) {
		var lon = DegreeConvertor.toDMS(point[0], true);
		var lat = DegreeConvertor.toDMS(point[1], false);

		// Append zero before decimals < 10 to have the same width 
		lon = lon.replace(/\b(\d{1})\b/g, '0$1');
		lat = lat.replace(/\b(\d{1})\b/g, '0$1');

		$('#coordinatesViewer')
			.html(lat + " " + lon);
	}
};

/**
 * Configure the map engine : set background layer, adjust style, connect events, etc...
 */
var configureMapEngine = function(mapConf) {

	mapEngine.setBackgroundLayer(backgroundLayer);

	// Add the style in conf to the engines
	for (var x in mapConf.styles) {
		if (mapConf.styles.hasOwnProperty(x)) {
			mapEngine.addStyle(x, mapConf.styles[x]);
		}
	}

	// Change the layer engine
	for (var i = 0; i < self.layers.length; i++) {
		self.layers[i].changeEngine(mapEngine);
	}

	// Zoom to max extent
	mapEngine.zoomToExtent(maxExtent);

	// Subscribe to event
	mapEngine.subscribe("navigationModified", function() {
		self.trigger("extent:change", self);
	});

	// Update coordinates viewer context on mouse move
	mapEngine.subscribe("mousemove", onMouseMove);
};

/**
 * Check if layers are compatible
 */
var isLayerCompatible = function(layer) {
	switch (layer.type) {
		case "Bing":
		case "OSM":
			return !isGeo;
		case "WMTS":
			return Configuration.data.map.projection == layer.projection;
		case "WMS":
			return layer.projection ? Configuration.data.map.projection == layer.projection : true;
		case "GeoJSON":
		case "KML":
		case "GeoRSS":
		case "WFS":
			return true;
		default:
			return false;
	}
}

/**
 * Public interface
 */
module.exports = {

	/**
	 * The handler used for interaction with the map : selection, polygon drawing, etc..
	 */
	handler: null,

	/**
	 * The background layers that can be used on the map.
	 * Loaded from configuration, this array only stores the 'compatible' background layers
	 */
	backgroundLayers: [],

	/**
	 * The layers applied on the map.
	 * Loaded from configuration, this array only stores the 'compatible' layers
	 */
	layers: [],

	/**
	 * Initialize module
	 */
	initialize: function(eltId) {

		// Keep the this
		self = this;

		_.extend(self, Backbone.Events);

		element = document.getElementById(eltId);

		var preferedMapEngine = UserPrefs.get("Map mode") ? UserPrefs.get("Map mode") : '2d';
		mapEngine = new engines[preferedMapEngine](element);

		// Check layers from configuration
		isGeo = Configuration.data.map.projection == "EPSG:4326";

		// Build the background layers from the configuration
		var confBackgroundLayers = Configuration.data.map.backgroundLayers;
		for (var i = 0; i < confBackgroundLayers.length; i++) {
			if (isLayerCompatible(confBackgroundLayers[i])) {
				self.backgroundLayers.push(confBackgroundLayers[i]);
			}
		}

		var visibleLayers = JSON.parse(UserPrefs.get("Visible layers") || "[]");
		// Build the addtionnal layers from the configuration
		var confLayers = Configuration.data.map.layers;
		for (var i = 0; i < confLayers.length; i++) {
			var layerConf = confLayers[i];
			if (isLayerCompatible(layerConf)) {

				// Update visibilty according to user preferences
				if ( visibleLayers.indexOf(layerConf.name) != -1 ) {
					layerConf.visible = true;
				}

				self.layers.push(new Layer(layerConf, null));
			}
		}

		// Set the background layer from the preferences if it exists,
		// otherwise set it to be the first one in the list of background layers
		var preferedBackgroundId = UserPrefs.get("Background");
		backgroundLayer = _.findWhere(self.backgroundLayers, {id: preferedBackgroundId});
		if ( !backgroundLayer ) {
			backgroundLayer = self.backgroundLayers[0];
		}

		configureMapEngine(Configuration.data.map);
	},

	/**
	 * Modify the background layer on the map and save it to the preferences.
	 *
	 * @param layer The layer to use as new background
	 */
	setBackgroundLayer: function(layer) {
		// Store background layer
		backgroundLayer = layer;
		// Set the active background
		var engineLayer = mapEngine.setBackgroundLayer(layer);
		UserPrefs.save('Background', layer.id);
		this.trigger('backgroundLayerSelected', layer);
		return engineLayer;
	},

	/**
	 * Get the selected background layer
	 */
	getBackgroundLayer: function() {
		return backgroundLayer;
	},

	/**
	 * Dynamically add a layer to the map
	 *
	 * @param layerDesc	The layer description
	 */
	addLayer: function(params) {
		var layer;
		if (!params.isBackground) {
			layer = buildLayer(params);
			self.layers.push(layer);
			self.trigger('layerAdded', layer);
			//console.log(layer.engineLayer.id + " added");
		} else {
			if (params.visible)
				layer = this.setBackgroundLayer(params);
			self.backgroundLayers.push(params);
			self.trigger('backgroundLayerAdded', params);
		}

		return layer;
	},

	/**
	 * Dynamically remove a layer from the map
	 *
	 * @param layer The layer (as returned by addLayer)
	 */
	removeLayer: function(layer) {
		if (!layer.params.isBackground) {
			//console.log("Try to remove" + layer.engineLayer.id);
			//var layer = _.findWhere(self.layers, {params: layerDesc});
			var index = self.layers.indexOf(layer);
			if (index >= 0) {
				var layer = self.layers[index];
				if (layer.clear) {
					layer.clear();
				}
				if (layer.engineLayer) {
					mapEngine.removeLayer(layer.engineLayer);
				}
				var index = self.layers.indexOf(layer);
				self.layers.splice(index, 1);
				self.trigger('layerRemoved', layer);
				return true;
			}
		} else {
			var index = self.backgroundLayers.indexOf(layer.params);
			// var index = self.backgroundLayers.indexOf(layerDesc);
			var layer = self.backgroundLayers[index];
			if (index >= 0) {
				self.backgroundLayers.splice(index, 1);

				// Check first one by default
				if (backgroundLayer == layer.params) {
					self.setBackgroundLayer(self.backgroundLayers[0]);
				}
				self.trigger('backgroundLayerRemoved', layer);
			}
			return true;
		}
		return false;
	},

	zoomIn: function() {
		mapEngine.zoomIn();
	},

	zoomOut: function() {
		mapEngine.zoomOut();
	},

	zoomToMaxExtent: function() {
		mapEngine.zoomToExtent(maxExtent);
	},

	zoomToFeature: function(feature) {
		// Zoom on the product in the carto
		if (!feature.bbox) {
			MapUtils.computeExtent(feature);
		}
		var extent = feature.bbox;
		var width = extent[2] - extent[0];
		var height = extent[3] - extent[1];
		var offsetExtent = [extent[0] - 2 * width, extent[1] - 2 * height, extent[2] + 2 * width, extent[3] + 2 * height];
		mapEngine.zoomToExtent(offsetExtent);
	},

	zoomTo: function(extent) {
		mapEngine.zoomToExtent(extent);
	},

	/**
	 * Get current viewport extent
	 * @return an array of 4 number : [west,south,east,north]
	 */
	getViewportExtent: function() {
		var extent = mapEngine.getViewportExtent();
		extent[0] = MapUtils.normalizeLon(extent[0]);
		extent[1] = Math.max(-90.0, extent[1]);
		extent[2] = MapUtils.normalizeLon(extent[2]);
		extent[3] = Math.min(90.0, extent[3]);
		return extent;
	},

	/**
	 * Get the pixel position (in the element) from a lonlat
	 */
	getPixelFromLonLat: function(lon, lat) {
		return mapEngine.getPixelFromLonLat(lon, lat);
	},

	/**
	 * Get the lonlat from a pixel position (in the element) 
	 */
	getLonLatFromPixel: function(x, y) {
		return mapEngine.getLonLatFromPixel(x, y);
	},

	/**
	 * Get the lonlat from an event
	 */
	getLonLatFromEvent: function(event) {
		var rect = element.getBoundingClientRect();
		var clientX = event.pageX - rect.left;
		var clientY = event.pageY - rect.top;
		return mapEngine.getLonLatFromPixel(clientX, clientY);
	},

	/**
	 * Switch the map engine
	 */
	switchMapEngine: function(id) {
		if (!engines[id]) {
			return false;
		}

		var previousHandler = null;

		if (mapEngine) {
			// Stop current handler because it depends on the map engine
			if (this.handler) {
				previousHandler = this.handler;
				this.handler.stop();
			}

			// Unsubscribe old on mouse move handler
			mapEngine.unsubscribe("mousemove", onMouseMove);

			// Retrieve the current viewport extent
			var extent = mapEngine.getViewportExtent();

			// Destroy the old map engine
			mapEngine.destroy();
			mapEngine = null;

		}

		// Callback called by the map engine when the map engine is initialized
		var initCallback = function(map) {
			// Configure the map engine
			configureMapEngine(Configuration.data.map);

			// Zoom to previous extent
			if (extent)
				map.zoomToExtent(extent);

			if (previousHandler)
				previousHandler.start();

		};

		// Create the new engine and catch any error
		try {
			mapEngine = new engines[id](element);
		} catch (err) {
			mapEngine = null;
		}

		UserPrefs.save("Map mode", id);

		if (mapEngine) {
			mapEngine.subscribe("init", initCallback);
		}

		return mapEngine != null;
	},

	/**
	 * Method to call when the map viewport is resized
	 */
	updateViewportSize: function() {
		if (mapEngine)
			mapEngine.updateSize();
	},

	getMapEngine: function() {
		return mapEngine;
	}
};
});

require.register("map/openlayers", function(exports, require, module) {
/**
 * OpenLayers map engine
 */

var Configuration = require('configuration');
var MapUtils = require('map/utils');
//require('OpenLayers');

var _projection = Configuration.get('map.projection', "EPSG:4326");

/**
 * Setup the resolution to be used by a WMTS layer using the grid for the given projection
 */
var _buildWMTSResolution = function() {
	if (_projection == "EPSG:4326") {
		var resolutions = [180.0 / 256];
		for (var i = 0; i < 15; i++) {
			resolutions.push(resolutions[resolutions.length - 1] * 0.5);
		}
		return resolutions;
	} else {
		//console.log("WMTS : no resolution exists for this projection  : " + _projection);
		return null;
	}
};

/**
 * Setup WMTS
 */
var _setupWMTS = function(config) {
	config.serverResolutions = _buildWMTSResolution();
	if (_projection == "EPSG:4326") {
		config.tileFullExtent = new OpenLayers.Bounds(-180, -90, 180, 90);
		config.tileOrigin = new OpenLayers.LonLat(-180, 90);
	} else if ( _projection == "EPSG:3857" ) {
		config.tileFullExtent = new OpenLayers.Bounds(-20037508.34278925, -20037508.34278925, 20037508.34278925, 20037508.34278925);
		config.tileOrigin = new OpenLayers.LonLat( -20037508.34278925, 20037508.34278925 );
	} /* else {
		console.log("WMTS : no setup exists for this projection  : " + _projection);
	} */
}


/**
 * Constructor
 * parentElement : the parent element div for the map
 */
OpenLayersMapEngine = function(element) {
	// Store element
	this.element = element;

	// Retreive restricted extent from configuration
	var resExtent = Configuration.get('map.openlayers.restrictedExtent', [-180, -90, 180, 90]);

	// Get projection
	var mapProjection = new OpenLayers.Projection(Configuration.get('map.projection', "EPSG:4326"));
	var displayProjection = new OpenLayers.Projection("EPSG:4326");

	// Transform restricted extent to the map projection
	var restrictedExtent = new OpenLayers.Bounds(resExtent);
	restrictedExtent.transform(displayProjection, mapProjection);

	// Setup the best resolutions to use with the following constraint :
	// fit the WMTS layers and depends on the viewport size
	var resolutions = this.computeResolutions(restrictedExtent);

	// Create the map
	this._map = new OpenLayers.Map(this.element, {
		controls: [
			new OpenLayers.Control.Navigation({
				zoomWheelEnabled: true,
				defaultDblClick: function(event) { return; }
			}),
			new OpenLayers.Control.Attribution()
		],
		projection: mapProjection,
		displayProjection: displayProjection,
		restrictedExtent: restrictedExtent,
		theme: null,
			// NEVER USE fractionnal zoom right now, break the WMTS display as overlay
			// fractionalZoom: true,
		autoUpdateSize: false,
		resolutions: resolutions,
		fallThrough: true
	});

	// Create the converter for GeoJSON format
	this._geoJsonFormat = new OpenLayers.Format.GeoJSON({
		externalProjection: this._map.displayProjection,
		internalProjection: this._map.projection
	});

	this.styles = {};
};


/**
 * Compute the resolutions array from the given extent and the element size
 */
OpenLayersMapEngine.prototype.computeResolutions = function(restrictedExtent) {
	// Setup the resolution, the same as used for WMTS
	var resolutions = _buildWMTSResolution();

	if (resolutions) {

		// Compute the max resolution
		var maxWRes = (restrictedExtent.right - restrictedExtent.left) / this.element.offsetWidth;
		var maxHRes = (restrictedExtent.top - restrictedExtent.bottom) / this.element.offsetHeight;
		var maxResolution = Math.min(maxWRes, maxHRes)

		// Modify the resolutions array to be strictly inferior to maxResolution
		while (resolutions[0] > maxResolution) {
			resolutions.shift();
		}

	}

	return resolutions;
};

/**
 *	Create conditional OpenLayers style from configuration
 *	@see For more details see NGEO-2222
 */
OpenLayersMapEngine.prototype.createConditionalStyles = function(baseStyle, condStyle) {
	var styleHints = ['default', 'select', 'highlight', 'highlight-select'];
	_.each(styleHints, function(styleHint) {
		if ( condStyle[styleHint] ) {
			var s = new OpenLayers.Style(condStyle[styleHint]);
			s.isApplicable = function(feature, style) {
				return style == styleHint && Configuration.getFromPath(feature, condStyle.attribute) == condStyle.value;
			}
			baseStyle.styles[ condStyle.attribute+"-"+condStyle.value+"-"+styleHint ] = s;
		}
	});
};

/**
 * Add a style
 */
OpenLayersMapEngine.prototype.addStyle = function(name, style) {
	this.styles[name] = new OpenLayers.StyleMap( style );
	if ( style.conditionals ) {
		var self = this;
		for ( var i=0; i<style.conditionals.length; i++ ) {
			self.createConditionalStyles(self.styles[name], style.conditionals[i]);
		}
	}
};

/**
 * Set the background layer
 */
OpenLayersMapEngine.prototype.setBackgroundLayer = function(layer) {

	var olLayer;
	switch (layer.type.toUpperCase()) {
		case "OSM":
			olLayer = new OpenLayers.Layer.OSM(layer.name, layer.baseUrl + "/${z}/${x}/${y}.png");
			break;
		case "WMS":
			olLayer = new OpenLayers.Layer.WMS(layer.name, layer.baseUrl, layer.params);
			break;
		case "BING":
			olLayer = new OpenLayers.Layer.Bing({
				name: layer.name,
				key: layer.key,
				type: layer.imageSet
			});
			break;
		case "WMTS":
			var config = {
				name: layer.name,
				url: layer.baseUrl,
				layer: layer.params.layer,
				matrixSet: layer.params.matrixSet,
				matrixIds: layer.params.matrixIds,
				format: layer.params.format,
				style: layer.params.style,
				isBaseLayer: true,
				projection: layer.projection
			};

			_setupWMTS(config);

			// Manage bbox(not really useful since background layer is generally covers a whole world, but just in case..)
			if (layer.bbox) {
				config.maxExtent = new OpenLayers.Bounds(layer.bbox);
			}

			olLayer = new OpenLayers.Layer.WMTS(config);

			break;
	}

	if (olLayer) {
		// Set common options
		olLayer.attribution = layer.attribution;
		olLayer.wrapDateLine = true;
		olLayer.transitionEffect = Configuration.get('map.openlayers.transitionEffect', null);

		// Finally add to map
		this._map.addLayer(olLayer);
		this._map.setBaseLayer(olLayer);

		// Fix wrong TILEMATRIX identifier for (at least) WMTS layer when it has been set on initialization
		// FIXME: Check if there is no better way to handle it..
		if ( olLayer.updateMatrixProperties ) {
			olLayer.updateMatrixProperties();
		}
	}
	return olLayer;
}

/**
 * Set layer visibility
 */
OpenLayersMapEngine.prototype.setLayerVisible = function(olLayer, vis) {
	olLayer.setVisibility(vis);
}

/**
 * Set layer index
 */
OpenLayersMapEngine.prototype.setLayerIndex = function(olLayer, index) {
	this._map.setLayerIndex(olLayer, index);
}

/**
 * Add a layer
 */
OpenLayersMapEngine.prototype.addLayer = function(layer) {

	var olLayer;
	switch (layer.type.toUpperCase()) {
		case "WMS":
			var maxExtent;
			if (layer.bbox) {
				maxExtent = new OpenLayers.Bounds(layer.bbox[0], layer.bbox[1], layer.bbox[2], layer.bbox[3]);
				maxExtent.transform(this._map.displayProjection, this._map.projection);
			}
			olLayer = new OpenLayers.Layer.WMS(layer.name,
				layer.baseUrl,
				layer.params, {
					maxExtent: maxExtent,
					isBaseLayer: false,
					opacity: layer.hasOwnProperty('opacity') ? layer.opacity : 1.0
				});
			break;
		case "WMTS":
			var config = {
				name: layer.name,
				url: layer.baseUrl,
				layer: layer.params.layer,
				matrixSet: layer.params.matrixSet,
				matrixIds: layer.params.matrixIds,
				format: layer.params.format,
				style: layer.params.style,
				isBaseLayer: false,
				projection: layer.projection,
				opacity: layer.hasOwnProperty('opacity') ? layer.opacity : 1.0,
				transitionEffect: Configuration.get('map.openlayers.transitionEffect', null)
			};

			_setupWMTS(config);

			// Manage time
			if (layer.params.time) {
				config.dimensions = ['TIME'];
				config.params = {
					'TIME': layer.params.time
				};
			}

			// Manage bbox
			if (layer.bbox) {
				config.maxExtent = new OpenLayers.Bounds(layer.bbox).transform(this._map.displayProjection, this._map.projection);
			}
			olLayer = new OpenLayers.Layer.WMTS(config);
			break;
		case "GEORSS":
			//olLayer = new OpenLayers.Layer.GeoRSS(layer.name, layer.location, { projection: "EPSG:4326" });	
			olLayer = new OpenLayers.Layer.Vector(layer.name, {
				strategies: [new OpenLayers.Strategy.Fixed()],
				protocol: new OpenLayers.Protocol.HTTP({
					url: layer.location,
					format: new OpenLayers.Format.GeoRSS()
				}),
				projection: "EPSG:4326"
			});

			break;
		case "WFS":
			olLayer = new OpenLayers.Layer.Vector(layer.name, {
				strategies: [new OpenLayers.Strategy.Fixed()],
				protocol: new OpenLayers.Protocol.WFS({
					url: layer.baseUrl,
					featureType: layer.featureType,
					featureNS: layer.featureNS
				}),
				projection: "EPSG:4326"
			});
			break;
		case "KML":
			if (layer.data) {
				var kmlFormat = new OpenLayers.Format.KML({
					extractStyles: true,
					extractAttributes: true,
					maxDepth: 0
				});
				var features = kmlFormat.read(layer.data);
				olLayer = new OpenLayers.Layer.Vector(layer.name, {
					projection: "EPSG:4326"
				});
				olLayer.addFeatures(features);
			} else if (layer.location) {
				olLayer = new OpenLayers.Layer.Vector(layer.name, {
					strategies: [new OpenLayers.Strategy.Fixed()],
					protocol: new OpenLayers.Protocol.HTTP({
						url: layer.location,
						format: new OpenLayers.Format.KML({
							extractStyles: true,
							extractAttributes: true,
							maxDepth: 0
						})
					}),
					projection: "EPSG:4326"
				});
			}
			break;
		case "FEATURE":
		case "JSON":
		case "GEOJSON":
			olLayer = new OpenLayers.Layer.Vector(layer.name, {
				// Use "canvas" renderer since "SVG" has a bug while rendering features crossing the dateline
				// Pros: no more bug. Cons: Less performant
				// @see https://github.com/openlayers/openlayers/issues/668
				renderers: ['Canvas', 'VML'],
				projection: "EPSG:4326"
			});
			if (layer.data) {
				var geojsonFormat = new OpenLayers.Format.GeoJSON();
				var features = geojsonFormat.read(layer.data);
				olLayer.addFeatures(features);
			}
	}

	if (olLayer) {

		// Set common options
		olLayer.attribution = layer.attribution;
		if (layer.style && this.styles[layer.style]) {
			olLayer.styleMap = this.styles[layer.style];
		}
		olLayer.setVisibility(layer.visible);

		// Finally add to map
		this._map.addLayer(olLayer);
	}

	return olLayer;
}

/**
 * Remove layer from the map engine
 */
OpenLayersMapEngine.prototype.removeLayer = function(olLayer) {
	olLayer.destroy();
}

/**
 * Subscribe to OpenLayersMap events
 */
OpenLayersMapEngine.prototype.subscribe = function(name, callback) {
	switch (name) {
		case "init":
			callback(this);
			break;
		case "navigationModified":
			// Attach events for navigation change
			this._map.events.register("move", undefined, callback);
			break;
		case "mousedown":
		case "mouseup":
		case "mousemove":
		case "click":
		case "dblclick":
			this._map.events.register(name, undefined, callback, true);
			break;
	}
}

/**
 * Subscribe to OpenLayersMap events
 */
OpenLayersMapEngine.prototype.unsubscribe = function(name, callback) {
	switch (name) {
		case "navigationModified":
			// Detach events for navigation change
			this._map.events.unregister("move", undefined, callback);
			break;
		case "mousedown":
		case "mouseup":
		case "mousemove":
		case "click":
		case "dblclick":
			this._map.events.unregister(name, undefined, callback, true);
			break;
	}
}


/**
 * Update the size of the map
 */
OpenLayersMapEngine.prototype.updateSize = function() {
	// Update the resolutions array
	this._map.resolutions = this.computeResolutions(this._map.restrictedExtent);
	this._map.baseLayer.initResolutions();

	// Then update the size
	this._map.updateSize();
}

/**
 * Get lon lat from pixel
 */
OpenLayersMapEngine.prototype.getLonLatFromPixel = function(x, y) {
	var olLonLat = this._map.getLonLatFromPixel(new OpenLayers.Pixel(x, y));
	olLonLat = olLonLat.transform(this._map.projection, this._map.displayProjection);
	return [olLonLat.lon, olLonLat.lat];
}

/**
 * Get pixel from lonlat
 */
OpenLayersMapEngine.prototype.getPixelFromLonLat = function(lon, lat) {
	var olLonLat = new OpenLayers.LonLat(lon, lat);
	olLonLat = olLonLat.transform(this._map.displayProjection, this._map.projection);
	var olPixel = this._map.getPixelFromLonLat(olLonLat);
	return {
		x: olPixel.x,
		y: olPixel.y
	};
}

/**
 * Get the current viewport extent
 */
OpenLayersMapEngine.prototype.getViewportExtent = function() {
	var boundsOrig = this._map.getExtent();
	if (boundsOrig) {
		var extent = [];
		//
		var bounds = boundsOrig.transform(this._map.projection, this._map.displayProjection);

		var w = Math.abs(bounds.getWidth());
		var h = Math.abs(bounds.getHeight());
		extent[0] = bounds.getCenterLonLat().lon - 0.5 * w;
		extent[1] = bounds.getCenterLonLat().lat - 0.5 * h;
		extent[2] = bounds.getCenterLonLat().lon + 0.5 * w;
		extent[3] = bounds.getCenterLonLat().lat + 0.5 * h;
		return extent;
	} else {
		return null;
	}
}

/**
 * Zoom to the given extent
 */
OpenLayersMapEngine.prototype.zoomToExtent = function(extent) {
	var bounds = new OpenLayers.Bounds(extent[0], extent[1], extent[2], extent[3]);
	bounds.transform(this._map.displayProjection, this._map.projection);
	var center = bounds.getCenterLonLat();
	this._map.setCenter(center, this._map.getZoomForExtent(bounds, true));
}


/**
 * Zoom in
 */
OpenLayersMapEngine.prototype.zoomIn = function() {
	this._map.zoomIn();
}

/**
 * Zoom out
 */
OpenLayersMapEngine.prototype.zoomOut = function() {
	this._map.zoomOut();
}

/**
 * Remove all features from a layer
 */
OpenLayersMapEngine.prototype.removeAllFeatures = function(layer) {
	layer.removeAllFeatures();
}

/**
 * Add a feature on the map
 */
OpenLayersMapEngine.prototype.addFeature = function(layer, feature) {
	var olFeatures = this._geoJsonFormat.read(MapUtils.fixDateLine(feature));
	layer.addFeatures(olFeatures);
	layer.drawFeature(layer.getFeatureByFid(feature.id), feature.renderHint);
}

/**
 * Modify the feature style
 */
OpenLayersMapEngine.prototype.modifyFeatureStyle = function(layer, feature, style) {
	var olFeature = layer.getFeatureByFid(feature.id);
	if (olFeature) {
		olFeature.renderIntent = style;
		layer.drawFeature(olFeature, style);
	}
}

/**
 *	Updates style for the given feature according to conditional styling from configuration
 *	if applicable, otherwise return the initial style
 */
OpenLayersMapEngine.prototype.applyConditionalStyling = function(layer, feature, style) {
	var currentStyle = style;
	var engineStyles = layer.styleMap.styles;
	for ( var x in engineStyles ) {
		var engineStyle = engineStyles[x];
		if ( engineStyle.isApplicable && engineStyle.isApplicable(feature, style) ) {
			currentStyle = x;
		}
	}
	return currentStyle;
}

/**
 * Block the navigation
 */
OpenLayersMapEngine.prototype.blockNavigation = function(flag) {
	if (flag) {
		this._map.controls[0].deactivate();
	} else {
		this._map.controls[0].activate();
	}
}

/**
 * Update a feature
 */
OpenLayersMapEngine.prototype.updateFeature = function(layer, feature, customFixDateLine) {
	if (customFixDateLine) {
		feature = customFixDateLine(feature);
	} else {
		feature = MapUtils.fixDateLine(feature);
	}
	var olFeature = layer.getFeatureByFid(feature.id);
	layer.removeFeatures(olFeature);
	layer.addFeatures(this._geoJsonFormat.read(feature));
}

/**
 * Remove a feature
 */
OpenLayersMapEngine.prototype.removeFeature = function(layer, feature) {
	var olFeature = layer.getFeatureByFid(feature.id);
	layer.removeFeatures(olFeature);
}

/**
 * Destroy the map
 */
OpenLayersMapEngine.prototype.destroy = function() {
	this._map.destroy();
	this.element.className = "";
}

module.exports = OpenLayersMapEngine;
});

require.register("map/polygonHandler", function(exports, require, module) {
var Handler = require('map/handler');
var Map = require('map/map');


/**
 * Private variables
 */
var layer;
var feature;
var startPoint;
var mapEngine;
var coords;
var started = false;
var lastClickTime = -1;
var lastX = -1;
var lastY = -1;
var onstop = null;
var self = null;

// Called when a double click is detected
function finishHandler() {
	// Remove duplicated point (used for mouse move drawing)
	coords.splice(coords.length - 2, 1);
	self.stop();
}

// Detect a double-click event. Cannot use browser double-click to avoid multiple point added, and because of problem with OpenLayers and double click
function isDoubleClick(event) {

	var clickTime = Date.now();

	var isDoubleClick = (clickTime - lastClickTime) < 250 && Math.abs(event.pageX - lastX) < 1 && Math.abs(event.pageY - lastY) < 1;

	lastClickTime = clickTime;
	lastX = event.pageX;
	lastY = event.pageY;

	return isDoubleClick;
}

function updateFeature() {
	feature.geometry.type = "Polygon";
	feature.geometry.coordinates = [coords];
	// If there is any bbox, clear it, it is no longer valid.
	// Sometimes the map backend can compute the bbox for rendering purposes
	feature.bbox = null;
	layer.updateFeature(feature);
};

// Called on a click : add a new point in the polygon
function onClick(event) {
	if (started && event.button == 0) {

		if (isDoubleClick(event)) {
			started = false;
			setTimeout(finishHandler, 50);
		} else {
			var point = Map.getLonLatFromEvent(event);
			if (coords.length == 0) {
				coords.push(point, point, point);
			} else {
				// Update the last point
				coords[coords.length - 2] = point;
				// Duplicate the last point for mouse move update
				coords.splice(coords.length - 1, 0, point);
			}
			updateFeature();
		}
	}
};

// Called when mouse is moved : update the polygon
function onMouseMove(event) {
	if (started && coords.length > 0 && event.button == 0) {
		var point = Map.getLonLatFromEvent(event);
		coords[coords.length - 2] = point;
		updateFeature();
	}

};

/**
 * Public interface
 */
self = new Handler({
	// Start the handler
	start: function(options) {
		mapEngine = Map.getMapEngine();

		// Create the layer if not already created
		if (options.layer) {
			layer = options.layer;
			feature = options.feature;
			coords = feature.geometry.coordinates[0];
		} else if (!layer) {
			coords = [];
			feature = {
				id: '0',
				type: 'Feature',
				geometry: {
					type: 'Polygon',
					coordinates: [coords]
				}
			};
			var params = {
				name: "Draw Area",
				type: "Feature",
				visible: true,
				style: "imported",
				data: feature
			};
			layer = Map.addLayer(params);
		}

		// No navigation when drawing a polygon
		mapEngine.blockNavigation(true);

		// Subscribe to mouse events
		mapEngine.subscribe("mousemove", onMouseMove);
		mapEngine.subscribe("mouseup", onClick);

		onstop = options.stop;

		// Prepare mouse listening and reset coordinates
		coords.length = 0;
		started = true;
	},

	// Stop the handler
	stop: function() {
		// Restore navigation
		mapEngine.blockNavigation(false);
		// Unsubscribe to mouse events
		mapEngine.unsubscribe("mousemove", onMouseMove);
		mapEngine.unsubscribe("mouseup", onClick);

		if (onstop) {
			feature.geometry.type = "Polygon";
			feature.geometry.coordinates = [coords];
			onstop();
		}
	}
});

module.exports = self;
});

require.register("map/rectangle", function(exports, require, module) {
var MapUtils = require('map/utils');

/**
 *	Rectangle class allowing to handle WIDE polygon issues
 *	
 *	By adding some points in nominal case
 *	Changing type to MultiLineString when crossing dateline
 */
var Rectangle = function(options) {
    if ( options.feature ) {
    	// Compute bbox from feature

    	this.feature = options.feature;
    	var bbox = MapUtils.computeBbox(this.feature.geometry);
    	this.west = bbox[0];
    	this.south = bbox[1];
    	this.east = bbox[2];
    	this.north = bbox[3];
    	this.computeStep();
    	this.updateFeature({type: this.feature.geometry.type});
    } else {
    	// Compute feature from bbox coordinates
	    this.west = options.west;
	    this.south = options.south;
	    this.east = options.east;
	    this.north = options.north;
	    this.feature = {
	    	id: "Dynamic rectangle",
	    	type: "Feature",
	    	geometry: {}, // Will be computed afterwards
	    	properties: {}
	    }
	    this.updateFeature({type: options.type});
    }
}

/**
 *	Compute step for additional points depending if we cross dateline or not
 */
Rectangle.prototype.computeStep = function() {
	var nbSegments = 4;
	this.step = this.west > this.east ? ((180 - this.west) + 180 + this.east)/nbSegments : (this.east - this.west)/nbSegments;
}

/**
 *	Update feature according to new bbox parameters
 */
Rectangle.prototype.updateFeature = function(options) {
	var type = this.west > this.east ? "MultiLineString" : "Polygon"; // By default
	if ( options && options.type ) {
		type = options.type;
	}

	// Update step depending on crossing dateline attribut
	this.computeStep();

	this.feature.geometry.type = type;
	if ( type == "MultiLineString" ) {
		// MultiLine string
		this.feature.geometry.coordinates = [
			[ [ -180, this.north ], [ this.east, this.north ], [ this.east, this.south ], [ -180, this.south ] ],
			[ [ 180, this.north ], [ this.west, this.north ], [ this.west, this.south ], [ 180, this.south] ],
			[ [ -180, this.north ], [ this.west - 360, this.north ], [ this.west - 360, this.south ], [ -180, this.south] ],
			[ [ 180, this.north ], [ this.east + 360, this.north ], [ this.east + 360, this.south ], [ 180, this.south] ]
		];
	} else {
		// Polygon
	    this.feature.geometry.coordinates = [
	        [
	            [this.west, this.south],
	            [MapUtils.normalizeLon(this.west + this.step), this.south],
	            [MapUtils.normalizeLon(this.west + this.step * 2), this.south],
	            [MapUtils.normalizeLon(this.west + this.step * 3), this.south],
	            [this.east, this.south],
	            [this.east, this.north],
	            [MapUtils.normalizeLon(this.west + this.step * 3), this.north],
	            [MapUtils.normalizeLon(this.west + this.step * 2), this.north],
	            [MapUtils.normalizeLon(this.west + this.step), this.north],
	            [this.west, this.north],
	            [this.west, this.south]
	        ]
	    ];
	}
}

module.exports = Rectangle;
});

require.register("map/rectangleHandler", function(exports, require, module) {
var Handler = require('map/handler');
var Map = require('map/map');
var MapUtils = require('map/utils');
var Rectangle = require('map/rectangle');

/**
 * Private variables
 */
var layer;
var rectangle;
var feature;
var startPoint;
var endPoint;
var mapEngine;
var started = false;
var onstop = null;
var self = null;

// Current direction of user's mouse
var toEast;

// Used for debug
/*
var params = {
	name: "Points",
	type: "Feature",
	visible: true,
	style: "imported"
};
var pointsLayer = Map.addLayer(params);

// Adds additional points to polygon to handle better wide rectangles
var addPoints = function(polygon) {

	var minX = polygon[0][0][0];
	var minY = polygon[0][0][1];
	var maxX = polygon[0][2][0];
	var maxY = polygon[0][2][1];

	console.log("===");
	var oldOne= polygon[0].slice(0);
	console.log(oldOne);

	var step = Math.abs((maxX - minX) / 3);
	polygon[0].splice(1, 0, [minX + step, minY]);
	polygon[0].splice(2, 0, [minX + 2*step, minY]);
	polygon[0].splice(5, 0, [minX + 2*step, maxY]);
	polygon[0].splice(6, 0, [minX + step, maxY]);

	pointsLayer.clear();

	for ( var i=0; i<polygon[0].length; i++ ) {
		var pFeature = {
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: polygon[0][i]
			},
			properties: {}
		};
		pointsLayer.addFeature(pFeature);
	}
}
*/

/**
 *	Compute if user moves mouse in east direction or not
 */
var updateToEast = function(start, end) {
	if ( rectangle.feature.bbox ) {
		var pCurrent = {
			lat: end[1], 
			lon: end[0]
		};
		var p2 = {
			lat: end[1],
			lon: start[0]
		};

		var distanceDelta = 2007000;
		if ( MapUtils.distanceBetween(pCurrent, p2) < distanceDelta && rectangle.step < 30 ) {
			var seg1 = {
				lat: -1,
				lon: start[0]
			};
			var seg2 = {
				lat: 1,
				lon: start[0]
			};
			var d = MapUtils.crossTrackDistanceBetween(pCurrent, seg1, seg2);
			if ( d > 0 ) {
				toEast = true;
			} else {
				toEast = false;
			}
		}
	}
	return toEast;
}

// Update the feature used to represent the rectangle
function updateFeature(start, end) {

	if ( !start || !end )
		return;

	if ( updateToEast(start, end) ) {
		// Nominal case, user drags to east
		minX = start[0];
		maxX = end[0];
	} else {
		// Inverse start/end if user moves to west
		minX = end[0];
		maxX = start[0];
	}

	var minY = Math.min(start[1], end[1]);
	var maxY = Math.max(start[1], end[1]);
	
	rectangle.feature.bbox = [ minX, minY, maxX, maxY ];

	rectangle.west = minX;
	rectangle.east = maxX;
	rectangle.north = maxY;
	rectangle.south = minY;
	rectangle.updateFeature();

	// addPoints(rectangle.feature.geometry.coordinates);

	// No dateline fix when feature crosses dateline
	var noDateLineFixCallback = function(feature) {
		return feature;
	}
	layer.updateFeature(rectangle.feature, feature.geometry.type == "MultiLineString" ? noDateLineFixCallback : null);
};

// Called when left mouse button is pressed : start drawing the rectangle
function onMouseDown(event) {
	if (event.button == 0) {
		startPoint = Map.getLonLatFromEvent(event);
		endPoint = Map.getLonLatFromEvent(event);
		updateFeature(startPoint, startPoint);
		started = true;
	}
};

// Called when mouse is moved : update the rectangle
function onMouseMove(event) {
	if (started && event.button == 0) {
		// Check if previous point has passed by dateline
		endPoint = Map.getLonLatFromEvent(event);
		updateFeature(startPoint, endPoint);
	}
};

// Called when left mouse button is release : end drawing the rectangle
function onMouseUp(event) {
	if (started && event.button == 0) {
		endPoint = Map.getLonLatFromEvent(event);
		updateFeature(startPoint, endPoint);

		// end drawing
		self.stop();
		started = false;
	}
};

/**
 * Public interface
 */
self = new Handler({
	// Start the handler
	start: function(options) {
		mapEngine = Map.getMapEngine();

		// Create the layer if not already created
		if (options.layer) {
			layer = options.layer;
			feature = options.feature;
			rectangle = new Rectangle({
				feature: feature
			});
		} else if (!layer) {
			coords = [];

			rectangle = new Rectangle({
				west: 0,
				east: 1,
				south: 0,
				north: 1
			});

			var params = {
				name: "Draw Area",
				type: "Feature",
				visible: true,
				style: "imported",
				data: feature
			};
			layer = Map.addLayer(params);
		}

		// No navigation when drawing a rectangle
		mapEngine.blockNavigation(true);

		// Subscribe to mouse events
		mapEngine.subscribe("mousedown", onMouseDown);
		mapEngine.subscribe("mousemove", onMouseMove);
		mapEngine.subscribe("mouseup", onMouseUp);

		onstop = options.stop;
	},

	// Stop the handler
	stop: function() {
		// Restore navigation
		mapEngine.blockNavigation(false);

		// Unsubscribe to mouse events
		mapEngine.unsubscribe("mousedown", onMouseDown);
		mapEngine.unsubscribe("mousemove", onMouseMove);
		mapEngine.unsubscribe("mouseup", onMouseUp);

		if (onstop) {
			onstop();
		}
	}
});

module.exports = self;
});

require.register("map/selectHandler", function(exports, require, module) {
var Configuration = require('configuration');
var Handler = require('map/handler');
var Map = require('map/map');
var MapUtils = require('map/utils');
var SearchResults = require('searchResults/model/searchResults');


/**
 * Private variables
 */
// The current picked features
var pickedFeatures = [];
// The layers to be excluded on picking (TODO: very hacky way.. think how to centralize it)
var excludedLayers = [];
// The layer to pick
var featureCollections = [];
// The index when using stack picking
var stackPickingIndex = -1;
// The map engine
var mapEngine;
// Needed to detect click
var prevX, prevY, prevTime;
// Needed to clear stack when selection is changed from another way
var inPicking = false;
// The picking radius
var radius = -1.0;

/**
 * Private methods
 */

/**
 * Check if the point is inside the given ring
 */
var pointInRing = function(point, ring) {
	var nvert = ring.length;
	if (ring[0][0] == ring[nvert - 1][0] && ring[0][1] == ring[nvert - 1][1]) {
		nvert--;
	}
	var inPoly = false;

	var j = nvert - 1;
	for (var i = 0; i < nvert; j = i++) {
		if (((ring[i][1] > point[1]) != (ring[j][1] > point[1])) &&
			(point[0] < (ring[j][0] - ring[i][0]) * (point[1] - ring[i][1]) / (ring[j][1] - ring[i][1]) + ring[i][0])) {
			inPoly = !inPoly;
		}
	}
	return inPoly;
};

/**
 * Compute line-circle intersection
 */
var lineCircleIntersection = function(p1, p2, center, radius) {
	var dx = p2[0] - p1[0];
	var dy = p2[1] - p1[1];

	var lx = p1[0] - center[0];
	var ly = p1[1] - center[1];

	var a = dx * dx + dy * dy;
	var b = 2 * (lx * dx + ly * dy);
	var c = lx * lx + ly * ly - radius * radius;

	var discriminant = b * b - 4 * a * c;
	if (discriminant <= 0) {
		return false;
	}
	discriminant = Math.sqrt(discriminant);
	var t1 = (-b - discriminant) / (2 * a);
	var t2 = (-b + discriminant) / (2 * a);
	return ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1));
};

/**
 * Check if a point is inside a line
 */
var pointInLine = function(point, coords) {
	// Compute radius
	if (radius < 0.0) {
		var pixel = Map.getPixelFromLonLat(point[0], point[1]);
		var ul = Map.getLonLatFromPixel(pixel.x + 1, pixel.y + 1);
		radius = 1.5 * Math.sqrt((ul[0] - point[0]) * (ul[0] - point[0]) + (ul[1] - point[1]) * (ul[1] - point[1]));
	}

	for (var i = 0; i < coords.length - 1; i++) {
		if (lineCircleIntersection(coords[i], coords[i + 1], point, radius)) {
			return true;
		}
	}

	return false;
};

/**
 * Check if the point is inside the given geometry
 */
var pointInGeometry = function(point, geometry) {
	switch (geometry.type) {
		case "MultiPolygon":
			var inside = false;
			for (var i = 0; i < geometry.coordinates.length && !inside; i++) {
				inside = pointInRing(point, geometry.coordinates[i][0]);
			}
			return inside;
		case "Polygon":
			return pointInRing(point, geometry.coordinates[0]);
		case "LineString":
			return pointInLine(point, geometry.coordinates);
		case "MultiLineString":
			var inside = false;
			for (var i = 0; i < geometry.coordinates.length && !inside; i++) {
				inside = pointInLine(point, geometry.coordinates[i]);
			}
			return inside;
		default:
			return false;
	}
};


/**
 * Get the feature from a point : test if the point is inside the footprint
 */
var getFeaturesFromPoint = function(lonlat) {

	radius = -1;

	var features = [];
	for (var i = 0; i < featureCollections.length; i++) {
		var fc = featureCollections[i];
		if ( excludedLayers.indexOf(fc._footprintLayer) >= 0 )
			continue;

		for (var j = 0; j < fc.features.length; j++) {
			// Fix dateline to be able to pick dateline-crossing features
			// since its original geometry isn't modified
			var feature = MapUtils.fixDateLine(fc.features[j]);
			if (pointInGeometry(lonlat, feature.geometry)) {
				feature._featureCollection = fc;
				features.push(feature);
			}
		}
	}

	return features;
};

/** 
 *	Test if a new selection is equal to the previous selection
 */
var isSelectionEqual = function(newSelection) {
	if (pickedFeatures.length == newSelection.length) {

		for (var i = 0; i < pickedFeatures.length; i++) {
			if (pickedFeatures[i] != newSelection[i])
				return false;
		}

		return true;
	} else
		return false;
};

/**
 *	Helper function to sort features by date
 */
var sortFeatureByDate = function(a, b) {
	return new Date(Configuration.getMappedProperty(b, "start")) - new Date(Configuration.getMappedProperty(a, "start"));
}

/**
 * Call when the user click on the map
 */
var mapClickHandler = function(event) {
	if (event.button != 0) {
		return;
	}

	// Check there is data to select
	if (featureCollections.length == 0)
		return;

	// Check that we are on a click
	var dx = Math.abs(event.pageX - prevX);
	var dy = Math.abs(event.pageY - prevY);
	var dt = Date.now() - prevTime;
	if (dx > 1 || dy > 1 || dt > 500) {
		return;
	}

	var lonlat = Map.getLonLatFromEvent(event);
	if (lonlat) {
		var features = getFeaturesFromPoint(lonlat);

		// Pre-sort by date the selection
		features.sort(sortFeatureByDate);

		inPicking = true;

		if (isSelectionEqual(features)) {

			stackPickingIndex++;

			if (stackPickingIndex == pickedFeatures.length) {
				stackPickingIndex = -1;
				Map.trigger("pickedFeatures", pickedFeatures, featureCollections);
			} else {
				Map.trigger("pickedFeatures", [pickedFeatures[stackPickingIndex]], featureCollections);
			}

		} else {

			pickedFeatures = features;
			stackPickingIndex = -1;
			Map.trigger("pickedFeatures", pickedFeatures, featureCollections);

		}

		inPicking = false;
	}
};

/**
 * Call when the user pressed the left mouse button
 */
function onMouseDown(event) {
	if (event.button == 0) {
		prevX = event.pageX;
		prevY = event.pageY;
		prevTime = Date.now();
	}
};

/**
 * Clear stack when selection is changed
 */
function clearStack() {
	if (!inPicking) {
		pickedFeatures = [];
	}
};


/**
 * Public interface
 */
module.exports = new Handler({

	/**
	 * Initialize the select handler
	 */
	initialize: function(options) {
		//	layer = options.layer;
	},

	/**
	 * Add a feature collection to the selectHandler
	 */
	addFeatureCollection: function(fc) {
		featureCollections.push(fc);
	},

	/**
	 * Remove a feature collection from the selectHandler
	 */
	removeFeatureCollection: function(fc) {
		this.setPickable(fc._footprintLayer, true); // Remove it from excludedLayers array just in case
		var i = featureCollections.indexOf(fc);
		if (i >= 0) {
			featureCollections.splice(i, 1);
		}
	},

	/**
	 *	Set the given layer(not featureCollection) pickable
	 */
	setPickable: function(layer, isPickable) {
		if ( isPickable ) {
			var i = excludedLayers.indexOf(layer);
			if (i >= 0) {
				excludedLayers.splice(i, 1);
			}
		} else {
			excludedLayers.push(layer);	
		}
	},

	/**
	 * Start the handler
	 */
	start: function() {

		mapEngine = Map.getMapEngine();

		// Click is not used because OpenLayers is messing up with click when navigation is active
		mapEngine.subscribe('mousedown', onMouseDown);
		mapEngine.subscribe('mouseup', mapClickHandler);

		SearchResults.on('selectFeatures', clearStack);
		SearchResults.on('unselectFeatures', clearStack);

	},

	/**
	 * Stop the handler
	 */
	stop: function() {
		mapEngine.unsubscribe('mousedown', onMouseDown);
		mapEngine.unsubscribe('mouseup', mapClickHandler);
	}
});
});

require.register("map/utils", function(exports, require, module) {
var Vector3d = require('map/vector3d');

var toRadians = function(num) {
	return num * Math.PI / 180;
}

/**
 * MapUtils module
 */
module.exports = {

	earthRadius: 6371e3,

	/**
	 * Normalize longitude to always be betwwen -180 and 180
	 */
	normalizeLon: function(lon) {
		while (lon > 180)
			lon -= 360;
		while (lon < -180)
			lon += 360;
		return lon;
	},

	/**
	 * Compute the bbox of a geometry
	 */
	computeBbox: function(geometry) {
		//list of array of coordinates from which we have to compute the extent bbox
		var coordsList = [];
		switch (geometry.type) {
			case "Point":
				var pointCoords = geometry.coordinates;
				return [pointCoords[0], pointCoords[1], pointCoords[0], pointCoords[1]];
			case "MultiPoint":
				coordsList.push(geometry.coordinates);
				break;
			case "Polygon":
				coordsList.push(geometry.coordinates[0]);
				break;
			case "MultiPolygon":
				var numOuterRings = geometry.coordinates.length;
				for (var j = 0; j < numOuterRings; j++) {
					coordsList.push(geometry.coordinates[j][0]);
				}
				break;
			case "LineString":
				coordsList.push(geometry.coordinates);
				break;
			case "MultiLineString":
				var numOuterRings = geometry.coordinates.length;
				for (var j = 0; j < numOuterRings; j++) {
					coordsList.push(geometry.coordinates[j]);
				}
				break;
		}

		//if there is nothing to compute then just return
		if (coordsList.length == 0)
			return;


		var minX = 10000;
		var minY = 10000;
		var maxX = -10000;
		var maxY = -10000

		for (var j = 0; j < coordsList.length; j++) {
			var coords = coordsList[j];
			for (var i = 0; i < coords.length; i++) {
				minX = Math.min(minX, coords[i][0]);
				minY = Math.min(minY, coords[i][1]);
				maxX = Math.max(maxX, coords[i][0]);
				maxY = Math.max(maxY, coords[i][1]);
			}
		}
		return [minX, minY, maxX, maxY];
	},

	/**
	 * Compute the bbox of a feature and set it as a property
	 */
	computeExtent: function(feature) {
		if (feature.bbox)
			return;
		feature.bbox = this.computeBbox(feature.geometry);
	},

	/**
	 * Tesselate the feature to follow great-circle
	 */
	tesselateGreatCircle: function(feature) {

		// Tesselate polygon to follow great circle
		// TODO : holes are not managed
		var geometry = feature.geometry;
		switch (geometry.type) {
			case "Polygon":
				geometry.coordinates[0] = this.tesselateGreatCircleCoordinates(geometry.coordinates[0]);
				break;
			case "MultiPolygon":
				for (var i = 0; i < geometry.coordinates.length; i++) {
					geometry.coordinates[i][0] = this.tesselateGreatCircleCoordinates(geometry.coordinates[i][0]);
				}
				break;
			case "LineString":
				geometry.coordinates = this.tesselateGreatCircleCoordinates(geometry.coordinates);
				break;
			case "MultiLineString":
				for (var i = 0; i < geometry.coordinates.length; i++) {
					geometry.coordinates[i] = this.tesselateGreatCircleCoordinates(geometry.coordinates[i]);
				}
				break;
		}
	},

	/**
	 *	Check if array of coordinates crossing the dateline
	 */
	crossDateLine: function(coords) {
		var posc = [];
		var negc = [];
		for (var n = 0; n < coords.length - 1; n++) {
			var x1 = coords[n][0];
			var x2 = coords[n + 1][0];

			if (Math.abs(x1 - x2) > 180)
				return true;
		}

		return false;
	},

	/**
	 * Fix dateline
	 */
	fixDateLine: function(feature) {

		// Fix dateline if needed
		var crossDateLine = false;
		var geometry = feature.geometry;
		switch (geometry.type) {
			case "Polygon":
				crossDateLine = this.crossDateLine(geometry.coordinates[0]);
				break;
			case "MultiPolygon":
				var allCoords = [];
				for (var i = 0; i < geometry.coordinates.length; i++) {
					crossDateLine |= this.crossDateLine(geometry.coordinates[i][0]);
					allCoords = allCoords.concat(geometry.coordinates[i][0]);
				}
				// NGEO-1863: Check if dataline is crossed between polygons
				// NB: Sometimes server splits polygon crossing dateline
				crossDateLine |= this.crossDateLine(allCoords);
				break;
			case "LineString":
				crossDateLine = this.crossDateLine(geometry.coordinates);
				break;
			case "MultiLineString":
				for (var i = 0; i < geometry.coordinates.length; i++) {
					crossDateLine |= this.crossDateLine(geometry.coordinates[i]);
				}
				break;
		}

		if (crossDateLine) {
			return this.splitFeature(feature);
		} else {
			return feature;
		}

	},

	/**
	 *	Splits feature's geometry into MultiPolygon which fixes the date line issue
	 *	
	 *	@return
	 *		New feature with splitted geometry
	 */
	splitFeature: function(feature) {
		var geometry = feature.geometry;
		var featureCopy = {
			id: feature.id,
			type: "Feature",
			geometry: {},
			properties: feature.properties
		};
		switch (geometry.type) {
			case "Polygon":
				var out = this.fixDateLineCoords(geometry.coordinates[0]);
				featureCopy.geometry.type = "MultiPolygon";
				featureCopy.geometry.coordinates = [
					[out[0]],
					[out[1]]
				];
				break;
			case "MultiPolygon":
				var dateLineCoords = [];
				for (var i = 0; i < geometry.coordinates.length; i++) {
					var out = this.fixDateLineCoords(geometry.coordinates[i][0]);
					dateLineCoords.push([out[0]], [out[1]]);
				}
				featureCopy.geometry.type = "MultiPolygon";
				featureCopy.geometry.coordinates = dateLineCoords;
				break;
			case "LineString":
				featureCopy.geometry.type = "MultiLineString";
				featureCopy.geometry.coordinates = this.fixDateLineCoords(geometry.coordinates);
				break;
			case "MultiLineString":
				var dateLineCoords = [];
				for (var i = 0; i < geometry.coordinates.length; i++) {
					var out = this.fixDateLineCoords(geometry.coordinates[i]);
					dateLineCoords.push(out[0], out[1]);
				}
				featureCopy.geometry.type = "MultiLineString";
				featureCopy.geometry.coordinates = dateLineCoords;
				break;
		}

		// Copy intern 3D property too..
		if ( geometry._bucket )
		 	featureCopy.geometry._bucket = geometry._bucket;
		
		return featureCopy;
	},

	/**
	 * Fix date line on coordinates
	 */
	fixDateLineCoords: function(coords) {

		var posc = [];
		var negc = [];
		for (var n = 0; n < coords.length; n++) {
			var coord = [coords[n][0], coords[n][1]];
			if (coord[0] < 0) {
				coord[0] += 360;
			}
			posc.push(coord);
			negc.push([coord[0] - 360, coord[1]]);
		}

		return [posc, negc];
	},

	/**
	 * Tesselate coordinates to follow great circle
	 */
	tesselateGreatCircleCoordinates: function(coords) {

		var output = [];
		for (var i = 0; i < coords.length - 1; i++) {
			output.push(coords[i]);
			this.tesselateGreatCircleLine(coords[i], coords[i + 1], output);
		}

		output.push(coords[coords.length - 1]);

		return output;
	},

	/**
	 * Tesselate an edge (point1,point2) to follow great circle
	 */
	tesselateGreatCircleLine: function(point1, point2, output) {

		var lat1 = point1[1];
		var lon1 = point1[0];
		var lat2 = point2[1];
		var lon2 = point2[0];
		lat1 = lat1 * (Math.PI / 180);
		lon1 = lon1 * (Math.PI / 180);
		lat2 = lat2 * (Math.PI / 180);
		lon2 = lon2 * (Math.PI / 180);
		var d = 2 * Math.asin(Math.sqrt(Math.pow((Math.sin((lat1 - lat2) / 2)), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow((Math.sin((lon1 - lon2) / 2)), 2)));
		var numsegs = Math.floor(d * 6371.0 / 200.0);
		var f = 0.0;
		for (var i = 0; i < numsegs - 1; i++) {
			f += 1.0 / numsegs;
			var A = Math.sin((1 - f) * d) / Math.sin(d);
			var B = Math.sin(f * d) / Math.sin(d);
			var x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
			var y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
			var z = A * Math.sin(lat1) + B * Math.sin(lat2);
			var latr = Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
			var lonr = Math.atan2(y, x);
			var lat = latr * (180 / Math.PI);
			var lon = lonr * (180 / Math.PI);

			output.push([lon, lat]);
		}
	},

	/**
	 *	Parse url extracting all the parameters which respecting key=value
	 *	Ex: http://base_url?key1=val1&key2=val2
	 *
	 *	Returns a dictionary containing parameters + BASEURL
	 */
	parseUrl: function(url) {
		var parsed = {};
		var params = url.split(/\?|\&/);
		parsed["BASEURL"] = params[0];
		_.each(params, function(param) {
			var kv = param.split("=");
			if (kv.length == 2)
				parsed[kv[0].toUpperCase()] = kv[1];
		});

		return parsed;
	},

	/**
	 *	Get WMS/WMTS layer name from url
	 */
	getLayerName: function(url) {
		var parsed = this.parseUrl(url);
		if ( !parsed['SERVICE'] ) {
			console.warn("Url " + url + " hasn't got a SERVICE parameter");
			return null;
		}
		var layerTag = parsed['SERVICE'].toUpperCase() == 'WMS' ? 'LAYERS' : 'LAYER';
		return parsed[layerTag];
	},

	/**
	 *	Create WMS/WMTS layer from url
	 *	Not really appropriate here, move it ?
	 */
	createWmsLayerFromUrl: function(url) {

		var parsed = this.parseUrl(url);
		
		// TODO: Check SRS --> must be 4326 ?
		var layerTag = parsed['SERVICE'].toUpperCase() == 'WMS' ? 'LAYERS' : 'LAYER';
		var wmsLayer = {
			type: parsed['SERVICE'],
			baseUrl: parsed["BASEURL"],
			name: parsed[layerTag],
			title: parsed[layerTag],
			params: {
				format: parsed['FORMAT'] ? decodeURIComponent(parsed['FORMAT']) : 'image/png',
				style: parsed['STYLE'],
				time: parsed['TIME'] ? decodeURIComponent(parsed['TIME']) : null
			}
		};
		if ( parsed['SERVICE'].toUpperCase() == 'WMTS' ) {
			wmsLayer.params.matrixSet = parsed['TILEMATRIXSET'];
			wmsLayer.params.layer = parsed[layerTag];
		} else {
			wmsLayer.params.layers = parsed[layerTag];
		}
		return wmsLayer;
	},

	/**
	 *	The following part is extracted from http://www.movable-type.co.uk/scripts/latlong.html
	 *	(c) Chris Veness 2011-2015
	 *	MIT Licence
	 */

	/**
	 *	Convert the given lat/lon to Vector3 object
	 */
	toVector: function(latLon) {
		var phi = toRadians(latLon.lat);
		var lambda = toRadians(latLon.lon);

		// Right-handed vector: x -> 0°E,0°N; y -> 90°E,0°N, z -> 90°N
		var x = Math.cos(phi) * Math.cos(lambda);
		var y = Math.cos(phi) * Math.sin(lambda);
		var z = Math.sin(phi);
		return new Vector3d(x,y,z);
	},

	/**
	 * Great circle obtained by heading on given bearing from the given lat/lon
	 *
	 * Direction of vector is such that initial bearing vector b = c × p.
	 *
	 * @param   {number}   bearing - Compass bearing in degrees.
	 * @returns {Vector3d} Normalised vector representing great circle.
	 *
	 * @example
	 *   var p1 = new LatLon(53.3206, -1.7297);
	 *   var gc = p1.greatCircle(96.0); // gc.toString(): [-0.794,0.129,0.594]
	 */
	greatCircle: function(lat, lon, bearing) {
		var phi = toRadians(lat);
		var lambda = toRadians(lon);
		var theta = toRadians(Number(bearing));

		var x =  Math.sin(lambda) * Math.cos(theta) - Math.sin(phi) * Math.cos(lambda) * Math.sin(theta);
		var y = -Math.cos(lambda) * Math.cos(theta) - Math.sin(phi) * Math.sin(lambda) * Math.sin(theta);
		var z =  Math.cos(phi) * Math.sin(theta);
		return new Vector3d(x, y, z);
	},

	/**
	 *	Distance between to points on earth
	 *	@param {Object} p1 : Geo-point {lat: int, lon: int}
	 *	@param {Object} p2 : Geo-point {lat: int, lon: int}
	 *	@param {number} radius : Earth radius in meters
	 *	@returns
	 *		Distance between to points in same units as radius
	 */
	distanceBetween: function(p1, p2, radius) {
	    // if (!(point instanceof LatLon)) throw new TypeError('point is not LatLon object');
		radius = (radius === undefined) ? this.earthRadius : Number(radius);

		var v1 = this.toVector(p1);
		var v2 = this.toVector(p2);
		var delta = v1.angleTo(v2);
		var d = delta * radius;
		return d;
	},

	crossTrackDistanceBetween: function(latLon, pathStart, pathEnd, radius) {
	    radius = (radius === undefined) ? this.earthRadius : Number(radius);

	    var p = this.toVector(latLon);

	    // Great circle defined by two points
	    // console.log("pathStart", pathStart);
	    var v1 = this.toVector(pathStart);
	    // console.log("v1", v1);
	    // console.log("pathEnd", pathEnd);
	    var v2 = this.toVector(pathEnd);
	    // console.log("v2", v2);
	    var gc = v1.cross(v2);
	    // console.log(gc);

	    var alpha = gc.angleTo(p, p.cross(gc)); // (signed) angle between point & great-circle normal vector
	    alpha = alpha<0 ? -Math.PI/2 - alpha : Math.PI/2 - alpha; // (signed) angle between point & great-circle

	    var d = alpha * radius;

	    return d;
	},

	distanceToSegment: function(latLon, point1, point2, radius) {
	    var v0 = this.toVector(latLon),
	    	v1 = this.toVector(point1),
	    	v2 = this.toVector(point2);

	    // Dot product p10⋅p12 tells us if p0 is on p2 side of p1, similarly for p20⋅p21
	    var p10 = v0.minus(v1), p12 = v2.minus(v1);
	    var p20 = v0.minus(v2), p21 = v1.minus(v2);

	    var extent1 = p10.dot(p12);
	    var extent2 = p20.dot(p21);

	    var withinExtent = extent1>=0 && extent2>=0;

	    if (withinExtent) {
	        // closer to segment than to its endpoints, use cross-track distance
	        var d = Math.abs(this.crossTrackDistanceBetween(latLon, point1, point2, radius));
	    } else {
	        // beyond segment extent, take smaller of distances to endpoints
	        var d1 = this.distanceBetween(latLon, point1, radius);
	        var d2 = this.distanceBetween(latLon, point2, radius);
	        var d = Math.min(d1, d2);
	    }

	    return d;
	}
}
});

;require.register("map/vector3d", function(exports, require, module) {
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Vector handling functions                                          (c) Chris Veness 2011-2016  */
/*                                                                                   MIT Licence  */
/* www.movable-type.co.uk/scripts/geodesy/docs/module-vector3d.html                               */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';


/**
 * Library of 3-d vector manipulation routines.
 *
 * In a geodesy context, these vectors may be used to represent:
 *  - n-vector representing a normal to point on Earth's surface
 *  - earth-centered, earth fixed vector (≡ Gade’s ‘p-vector’)
 *  - great circle normal to vector (on spherical earth model)
 *  - motion vector on Earth's surface
 *  - etc
 *
 * Functions return vectors as return results, so that operations can be chained.
 * @example var v = v1.cross(v2).dot(v3) // ≡ v1×v2⋅v3
 *
 * @module vector3d
 */


/**
 * Creates a 3-d vector.
 *
 * The vector may be normalised, or use x/y/z values for eg height relative to the sphere or
 * ellipsoid, distance from earth centre, etc.
 *
 * @constructor
 * @param {number} x - X component of vector.
 * @param {number} y - Y component of vector.
 * @param {number} z - Z component of vector.
 */
function Vector3d(x, y, z) {
    // allow instantiation without 'new'
    if (!(this instanceof Vector3d)) return new Vector3d(x, y, z);

    this.x = Number(x);
    this.y = Number(y);
    this.z = Number(z);
}


/**
 * Adds supplied vector to ‘this’ vector.
 *
 * @param   {Vector3d} v - Vector to be added to this vector.
 * @returns {Vector3d} Vector representing sum of this and v.
 */
Vector3d.prototype.plus = function(v) {
    if (!(v instanceof Vector3d)) throw new TypeError('v is not Vector3d object');

    return new Vector3d(this.x + v.x, this.y + v.y, this.z + v.z);
};


/**
 * Subtracts supplied vector from ‘this’ vector.
 *
 * @param   {Vector3d} v - Vector to be subtracted from this vector.
 * @returns {Vector3d} Vector representing difference between this and v.
 */
Vector3d.prototype.minus = function(v) {
    if (!(v instanceof Vector3d)) throw new TypeError('v is not Vector3d object');

    return new Vector3d(this.x - v.x, this.y - v.y, this.z - v.z);
};


/**
 * Multiplies ‘this’ vector by a scalar value.
 *
 * @param   {number}   x - Factor to multiply this vector by.
 * @returns {Vector3d} Vector scaled by x.
 */
Vector3d.prototype.times = function(x) {
    x = Number(x);

    return new Vector3d(this.x * x, this.y * x, this.z * x);
};


/**
 * Divides ‘this’ vector by a scalar value.
 *
 * @param   {number}   x - Factor to divide this vector by.
 * @returns {Vector3d} Vector divided by x.
 */
Vector3d.prototype.dividedBy = function(x) {
    x = Number(x);

    return new Vector3d(this.x / x, this.y / x, this.z / x);
};


/**
 * Multiplies ‘this’ vector by the supplied vector using dot (scalar) product.
 *
 * @param   {Vector3d} v - Vector to be dotted with this vector.
 * @returns {number} Dot product of ‘this’ and v.
 */
Vector3d.prototype.dot = function(v) {
    if (!(v instanceof Vector3d)) throw new TypeError('v is not Vector3d object');

    return this.x*v.x + this.y*v.y + this.z*v.z;
};


/**
 * Multiplies ‘this’ vector by the supplied vector using cross (vector) product.
 *
 * @param   {Vector3d} v - Vector to be crossed with this vector.
 * @returns {Vector3d} Cross product of ‘this’ and v.
 */
Vector3d.prototype.cross = function(v) {
    if (!(v instanceof Vector3d)) throw new TypeError('v is not Vector3d object');

    var x = this.y*v.z - this.z*v.y;
    var y = this.z*v.x - this.x*v.z;
    var z = this.x*v.y - this.y*v.x;

    return new Vector3d(x, y, z);
};


/**
 * Negates a vector to point in the opposite direction
 *
 * @returns {Vector3d} Negated vector.
 */
Vector3d.prototype.negate = function() {
    return new Vector3d(-this.x, -this.y, -this.z);
};


/**
 * Length (magnitude or norm) of ‘this’ vector
 *
 * @returns {number} Magnitude of this vector.
 */
Vector3d.prototype.length = function() {
    return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
};


/**
 * Normalizes a vector to its unit vector
 * – if the vector is already unit or is zero magnitude, this is a no-op.
 *
 * @returns {Vector3d} Normalised version of this vector.
 */
Vector3d.prototype.unit = function() {
    var norm = this.length();
    if (norm == 1) return this;
    if (norm == 0) return this;

    var x = this.x/norm;
    var y = this.y/norm;
    var z = this.z/norm;

    return new Vector3d(x, y, z);
};


/**
 * Calculates the angle between ‘this’ vector and supplied vector.
 *
 * @param   {Vector3d} v
 * @param   {Vector3d} [vSign] - If supplied (and out of plane of this and v), angle is signed +ve if
 *     this->v is clockwise looking along vSign, -ve in opposite direction (otherwise unsigned angle).
 * @returns {number} Angle (in radians) between this vector and supplied vector.
 */
Vector3d.prototype.angleTo = function(v, vSign) {
    if (!(v instanceof Vector3d)) throw new TypeError('v is not Vector3d object');

    var sinθ = this.cross(v).length();
    var cosθ = this.dot(v);

    if (vSign !== undefined) {
        if (!(vSign instanceof Vector3d)) throw new TypeError('vSign is not Vector3d object');
        // use vSign as reference to get sign of sinθ
        sinθ = this.cross(v).dot(vSign)<0 ? -sinθ : sinθ;
    }

    return Math.atan2(sinθ, cosθ);
};


/**
 * Rotates ‘this’ point around an axis by a specified angle.
 *
 * @param   {Vector3d} axis - The axis being rotated around.
 * @param   {number}   theta - The angle of rotation (in radians).
 * @returns {Vector3d} The rotated point.
 */
Vector3d.prototype.rotateAround = function(axis, theta) {
    if (!(axis instanceof Vector3d)) throw new TypeError('axis is not Vector3d object');

    // en.wikipedia.org/wiki/Rotation_matrix#Rotation_matrix_from_axis_and_angle
    // en.wikipedia.org/wiki/Quaternions_and_spatial_rotation#Quaternion-derived_rotation_matrix
    var p1 = this.unit();
    var p = [ p1.x, p1.y, p1.z ]; // the point being rotated
    var a = axis.unit();          // the axis being rotated around
    var s = Math.sin(theta);
    var c = Math.cos(theta);
    // quaternion-derived rotation matrix
    var q = [
        [ a.x*a.x*(1-c) + c,     a.x*a.y*(1-c) - a.z*s, a.x*a.z*(1-c) + a.y*s ],
        [ a.y*a.x*(1-c) + a.z*s, a.y*a.y*(1-c) + c,     a.y*a.z*(1-c) - a.x*s ],
        [ a.z*a.x*(1-c) - a.y*s, a.z*a.y*(1-c) + a.x*s, a.z*a.z*(1-c) + c     ],
    ];
    // multiply q × p
    var qp = [ 0, 0, 0 ];
    for (var i=0; i<3; i++) {
        for (var j=0; j<3; j++) {
            qp[i] += q[i][j] * p[j];
        }
    }
    var p2 = new Vector3d(qp[0], qp[1], qp[2]);
    return p2;
    // qv en.wikipedia.org/wiki/Rodrigues'_rotation_formula...
};


/**
 * String representation of vector.
 *
 * @param   {number} [precision=3] - Number of decimal places to be used.
 * @returns {string} Vector represented as [x,y,z].
 */
Vector3d.prototype.toString = function(precision) {
    var p = (precision === undefined) ? 3 : Number(precision);

    var str = '[' + this.x.toFixed(p) + ',' + this.y.toFixed(p) + ',' + this.z.toFixed(p) + ']';

    return str;
};

module.exports = Vector3d;
});

require.register("map/widget/background", function(exports, require, module) {
/**
 * Background widget module
 */

var Map = require('map/map');
var ngeoWidget = require('ui/widget');

/**
 * The background widget
 */
var backbroundWidget;

/**
 * Function to change the background when selected
 */
var changeBackground = function() {
	var layer = $(this).closest('fieldset').find('input[name="background-choice"]:checked').data("layer")
	Map.setBackgroundLayer(layer);
	backbroundWidget.ngeowidget("hide");
};

var BackgroundWidget = function(dsa) {
	// Add the background widget to the data services area
	dsa.append('<div id="backgroundWidget"/>');

	// Build background layers panel 
	this.container = $('<fieldset data-role="controlgroup"></fieldset>');
	var bgLayers = Map.backgroundLayers;
	for (var i = 0; i < bgLayers.length; i++) {
		this.buildHtml(bgLayers[i]);
	}

	backbroundWidget = $("#backgroundWidget")
		.append(this.container).ngeowidget({
			activator: '#background'
		});

	var self = this;
	Map.on('backgroundLayerAdded', function(layer) {
		self.buildHtml(layer);
		$(backgroundWidget).trigger("create");
	})
	Map.on('backgroundLayerRemoved', function(layer) {
		self.container.find('input').each(function() {
			if ($(this).data('layer') == layer) {
				$(this).parent().remove();
			}
		});
		$(backgroundWidget).trigger('create');
	});
	Map.on('backgroundLayerSelected', function(layer) {
		var input = _.find(self.container.find('input'), function(input) {
			return $(input).data("layer") == layer;
		});
		$(input).prop("checked", true).checkboxradio("refresh");
	});

	// Select the background used from the preferences unless select the first one
	var selector = '#' + Map.getBackgroundLayer().id;
	//check the background layer radio box 
	$(dsa).find(selector).prop('checked', 'checked').checkboxradio("refresh");
};

/**
 *	Build the HTML for background layer
 */
BackgroundWidget.prototype.buildHtml = function(layer) {

	// Add radio button + attribute callback on change
	var isChecked = layer.visible ? 'checked="checked"' : "";
	var id = layer.id ? layer.id : layer.name.replace(/\s+/g,"_");
	var input = $('<input id="' + id + '" type="radio" name="background-choice" '+ isChecked +' />')
		.data("layer", layer)
		.change(changeBackground);

	// Build the label for input and add it to the group
	$('<label for="'+id+'" data-mini="true">' + layer.name + '</label>')
		.append(input)
		.appendTo(this.container);
};

module.exports = BackgroundWidget
});

;require.register("map/widget/layers", function(exports, require, module) {
/**
 * Layers widget module
 */

var Map = require('map/map');
var ngeoWidget = require('ui/widget');
var SelectHandler = require('map/selectHandler');

/**
 * Callback called when a layer is checked
 */
var layerCheckedCallback = function() {
	var layer = $(this).data('layer');
	var isVisible = !layer.params.visible;
	layer.setVisible(isVisible);	
};

var LayersWidget = function(element) {

	var $layersWidget = $('<div id="layersWidget"/>').appendTo(element);

	// Build overlays panel
	this.container = $("<fieldset data-role='controlgroup'></fieldset>");

	var layers = Map.layers;

	// Update checkboxes when layers visibility has changed
	Map.on("visibility:changed", function(layer) {
		var $input = null;
		// Fins input according to layer
		self.container.find('input').each(function() {
			if ($(this).data('layer') == layer) {
				$input = $(this);
				return;
			}
		});

		var isVisible = layer.params.visible;
		if ($input) {
			if ( isVisible ) {
				$input.prop('checked', 'checked').checkboxradio("refresh");
			} else {
				$input.removeProp('checked').checkboxradio("refresh");
			}
		}
		// FIXME: nothing to do here..
		SelectHandler.setPickable(layer, isVisible);
	});

	for (var i = 0; i < layers.length; i++) {
		this.buildHTML(layers[i]);
	}
	this.container.appendTo($layersWidget);

	var self = this;
	// Callback when a layer is added on the map
	Map.on('layerAdded', function(layer) {
		if ( layer.params.type != "Browses" && layer.params.name.indexOf("Footprints") == -1 ) {
			self.buildHTML(layer);
			$layersWidget.trigger('create');
		}
	});

	// Callback when a layer is removed from the map
	Map.on('layerRemoved', function(layer) {
		if ( layer.type != "Browses" && layer.params.name.indexOf("Footprints") == -1 ) {
			self.container.find('input').each(function() {
				if ($(this).data('layer') == layer) {
					$(this).parent().remove();
				}
			});
			$layersWidget.trigger('create');
		}
	});

	this.$el = $layersWidget;
};

/**
 * Build the HTML for a layer
 */
LayersWidget.prototype.buildHTML = function(layer) {

	if ( layer.params.name.indexOf('Footprints') == -1 ) {
		// Build the input
		var input = $("<input type='checkbox'" + (layer.params.visible ? "checked='checked'" : "") + ">")
			.data('layer', layer);

		// Callback called when the input is changed
		input.change(layerCheckedCallback);

		// Build the label for input and add it to the group
		$("<label data-mini='true'>" + (layer.params.title ? layer.params.title : layer.params.name) + "</label>")
			.prepend(input)
			.appendTo(this.container);
	}
};

/**
 *	Refresh visibility of layers
 */
LayersWidget.prototype.refresh = function() {
	// Not the best solution ever.. satisfying for now
	this.container.empty();
	var layers = Map.layers;
	for (var i = 0; i < layers.length; i++) {
		this.buildHTML(layers[i]);
	}
	this.$el.trigger('create');

};

module.exports = LayersWidget;
});

require.register("map/widget/mapPopup", function(exports, require, module) {
/**
 * MapPopup module
 */

var GlobalEvents = require('globalEvents');
var Logger = require('logger');
var Configuration = require('configuration');
var Map = require('map/map');
var DownloadOptions = require('search/model/downloadOptions');
var SimpleDataAccessRequest = require('dataAccess/model/simpleDataAccessRequest');
var DataAccessWidget = require('dataAccess/widget/dataAccessWidget');
var SearchResults = require('searchResults/model/searchResults');
var Utils = require('map/utils');
var UserPrefs = require('userPrefs');
var MultipleBrowseWidget = require('searchResults/widget/multipleBrowseWidget');
var ProductService = require('ui/productService');

var MapPopup = function(container) {

	/**
	 * Private variables
	 */
	var self = this;
	var element;
	var parentElement;
	var arrow;
	var products = null;
	var isOpened = false;
	var currentIndice = null;

	element = $(
		'<div class="widget-content mapPopup">\
			<div id="mpText"></div>\
			<div id="mpButtons" data-mini="true" data-role="controlgroup" data-type="horizontal"></div>\
		</div>');

	// Wrap with the parent div for widget
	element.wrap("<div id='mapPopup' class='widget'></div>");
	parentElement = element.parent();

	// Add buttons for some simple actions

	// Select
	btn = $("<button data-icon='check' data-iconpos='notext' data-role='button' data-inline='true' data-mini='true'>Check highlighted products</button>")
		.appendTo(element.find('#mpButtons'))
		.click(function() {
			
			var isSelected = $(this).parent().hasClass('ui-btn-active');
			// Update button's layout
			if (isSelected) {
				$(this).parent().removeClass('ui-btn-active ui-focus');
			} else {
				$(this).parent().addClass('ui-btn-active');
			}
			var _wProducts = products;
			for (var i = 0; i < _wProducts.length; i++) {  
				var p = _wProducts[i];  
				if (isSelected) {  
					p._featureCollection.unselect([p]);
					p._featureCollection.unsetHighlight([p]);
				} else {  
					p._featureCollection.select([p]);
					p._featureCollection.setHighlight([p]);
				}
			}
			self.openOrCloseDialog();
		});

	// Browse
	btn = $("<button data-icon='browse' data-iconpos='notext' data-role='button' data-inline='true' data-mini='true'>Display browse</button>")
		.appendTo(element.find("#mpButtons"))
		.click(function() {
			var isSelected = $(this).parent().hasClass('ui-btn-active');
			// Update button's layout
			if (isSelected) {
				$(this).parent().removeClass('ui-btn-active ui-focus');
			} else {
				$(this).parent().addClass('ui-btn-active');
			}
			var _wProducts = products;

			for (var i = 0; i < _wProducts.length; i++) {
				var p = _wProducts[i];
				if (ProductService.getBrowsedProducts().indexOf(p) >= 0) {
					p._featureCollection.hideBrowses([p]);
					ProductService.removeBrowsedProducts([p]);
				} else {
					p._featureCollection.showBrowses([p]);
					ProductService.addBrowsedProducts([p]);
				}
			}
		});
	// Multiple browse management
	btn = $("<button data-icon='browse-multiple' data-iconpos='notext' data-role='button' data-inline='true' data-mini='true'>Multiple browse management</button>")
		.appendTo(element.find("#mpButtons"))
		.click(function() {
			MultipleBrowseWidget.open({
				feature: products[0],
				featureCollection: products[0]._featureCollection
			});
		});

	// DAR
	btn = $("<button data-icon='save' data-iconpos='notext' data-role='button' data-inline='true' data-mini='true'>Retrieve product</button>")
		.appendTo(element.find('#mpButtons'))
		.click(function() {

			var allowedProducts = [];
			for (var i = 0; i < products.length; i++) {
				if (products[i]._featureCollection.downloadAccess) {
					allowedProducts.push(products[i]);
				}
			}

			if (allowedProducts.length > 0) {
				SimpleDataAccessRequest.initialize();
				SimpleDataAccessRequest.setProducts(allowedProducts);

				DataAccessWidget.open(SimpleDataAccessRequest);
			} else {
				Logger.inform("Cannot download product : missing permissions.");
			}

		});

	// Shopcart
	btn = $("<button data-icon='shop' data-iconpos='notext' data-role='button' data-inline='true' data-mini='true'>Add to shopcart</button>")
		.appendTo(element.find('#mpButtons'))
		.click(function() {
			GlobalEvents.trigger('addToShopcart', products);
		});

	parentElement.appendTo(container);
	parentElement.trigger("create");

	parentElement.hide();

	/**
	* When we hightligth feature, update information linked to those features if the dialod is open.
	* Otherwise , do nothing
	*/
	Map.on('highlightFeatures', function(highlightedFeatures) {
		self.openOrCloseDialog('highlight', highlightedFeatures);
	});
	Map.on('unhighlightFeatures', function(highlightedFeatures) {
		self.openOrCloseDialog('highlight', highlightedFeatures);
	});

	/**
	* When we unselect features, just close the window
	*/
	
	Map.on('unselectFeatures', function() {
		self.openOrCloseDialog('select', []);
	});

	Map.on('selectFeatures', function(selectedFeatures) {
		self.openOrCloseDialog('select', selectedFeatures);
	});
	
	/**
		Get data from a path
	 */
	var getData = function(product, path) {
		var names = path.split('.');
		var obj = product;
		for (var i = 0; obj && i < names.length - 1; i++) {
			obj = obj[names[i]];
		}
		if (obj && obj.hasOwnProperty(names[names.length - 1])) {
			return obj[names[names.length - 1]];
		} else {
			return "";
		}
	};

	/**
		Build the content of the popup from the given product
	 */
	var buildContent = function(nbProducts, indice) {

		// Show default browse / Hide multiple browse by default
		element.find('#mpButtons button[data-icon="browse"]').parent().show();
		element.find('#mpButtons button[data-icon="browse-multiple"]').parent().hide();

		var content = "";
		if (nbProducts === 1) {
			currentIndice = 0;
		} else {
			currentIndice = indice;
			content += "" + products.length + " products highlighted. <span class='ui-icon btnNext' title='Focus on next product'></span><br>";
			content += "Click on arrow to cycle through products.<br>";
		}

		if ((nbProducts > 1 && currentIndice !== null) || (nbProducts===1)) {
			var product = products[currentIndice];
			// Build product title according to NGEO-1969
			var productTitle = '';
			var param = Configuration.getMappedProperty(product, "sensor");
			if (param) {
				productTitle += param + ' / ';
			}
			param = Configuration.getMappedProperty(product, "operationalMode");
			if (param) {
				productTitle += param + ' / ';
			}
			param = Configuration.getMappedProperty(product, "productType");
			if (param) {
				productTitle += param;
			}
			content += '<p><b>' + productTitle + '</b></p>';
			var columnDefs = Configuration.data.tableView.columnsDef;
			for (var i = 0; i < columnDefs.length; i++) {
				if (columnDefs[i].sTitle != 'Product') {
					var value = Configuration.getFromPath(product, columnDefs[i].mData);
					if ( columnDefs[i].sTitle == 'Download options' && value ) {
						// HACK: Skip it for now, we should store it somewhere, or WEBS should send it for us
							continue;
						/*
						// Snippet to handle download options depending on current search area
							var downloadOptions = new DownloadOptions();
							downloadOptions.initFromUrl(value);
							var value = downloadOptions.getParameters();
							if ( !value.length )
								value = "No download options";
						*/
						
					}

					if (value) {
						content += '<p>' + columnDefs[i].sTitle + ': <span title="'+value+'">' + value + '</span></p>';
					}
				}
			}

			// Show only if product has multiple browses
			var browses = Configuration.getMappedProperty(product, "browses");
			if ( browses && browses.length > 1 ) {
				element.find('#mpButtons button[data-icon="browse-multiple"]').parent().show();
				element.find('#mpButtons button[data-icon="browse"]').parent().hide();
			}

		} else {
			content += "<p>Products: </p>";
			for (var i = 0; i < products.length; i++) {
				content += "<p class='oneproduct' title='"+ products[i].id +"'>";
				var type = Configuration.getMappedProperty(products[i], "productType", null);
				if (type !== null) {
					content += type + " / ";
				} else {
					var sensor = Configuration.getMappedProperty(products[i], "sensor", null);
					if (sensor !== null) {
						content += sensor + ' / ';
					}
				}
				content += Configuration.getMappedProperty(products[i], "start");
				content += "</p>";
			}
		}

		// if feature is highlighted >> save and shop are enable
		var isHighlighted = _.find(products, function(feature) { return feature._featureCollection.isHighlighted(feature); });
		if ( isHighlighted ) {
			element.find('#mpButtons button[data-icon="save"]').button('enable');
			element.find('#mpButtons button[data-icon="shop"]').button('enable');
		} else {
			element.find('#mpButtons button[data-icon="save"]').button('disable');
			element.find('#mpButtons button[data-icon="shop"]').button('disable');
		}
		// if feature is selected >> check button is active
		var isSelected = _.find(products, function(feature) { return feature._featureCollection.isSelected(feature); });
		if (isSelected) {
			element.find('#mpButtons button[data-icon="check"]').parent().addClass('ui-btn-active');
		} else {
			element.find('#mpButtons button[data-icon="check"]').parent().removeClass('ui-btn-active');
		}
		//active browse if feature is highlighted
		element.find('#mpButtons button[data-icon="browse"]').button('disable');

		var isMultipleBrowsed = _.find(products, function(feature) {
			var browses = Configuration.getMappedProperty(feature, "browses");
			var bDisplay = false;
			if (browses && browses.length > 0 && browses[0] !== undefined) {
				_.each(browses, function(browse) {
					let url = browse.BrowseInformation.fileName.ServiceReference["@"]["href"];
					if (url.indexOf('SERVICE') > -1) {
						bDisplay = true;
					}
				});
			}
			return bDisplay;
		});
		if ( isMultipleBrowsed ) {
			element.find('#mpButtons button[data-icon="browse-multiple"]').button('enable');
		} else {
			element.find('#mpButtons button[data-icon="browse-multiple"]').button('disable');
		}

		// NGEO-1770: No retrieve button if selection contains at least one planned product or product url doesn't exist
		var hasPlannedOrNoProductUrl = _.find(products, function(feature) {
			return Configuration.getMappedProperty(feature, "status", null) == "PLANNED" ||
				!Configuration.getMappedProperty(feature, "productUrl");
		});
		if (hasPlannedOrNoProductUrl) {
			element.find('#mpButtons button[data-icon="save"]').button('disable');
		}
		element.find('#mpText').html(content);
		element.find('#mpText .btnNext').click(function() {
			var next;
			var changeDataset = false;
			if (currentIndice === null) {
				next = 0;
			} else if (currentIndice === nbProducts - 1) {
				next = null;
			} else {
				next = currentIndice + 1;
			}
			if (next !== null) {
				if (currentIndice === null) {
					changeDataset = true;
				} else if (products[currentIndice]._featureCollection.id !== products[next]._featureCollection.id) {
					changeDataset = true;
				}
				if (changeDataset) {
					if (!products[next]._featureCollection.dataset) {
						$('#shopcart').click();
					} else {
						$('#result' + products[next]._featureCollection.id).click();
					}
				}
				products[next]._featureCollection.focus(products[next]);
			}
			if (currentIndice !== null) {
				products[currentIndice]._featureCollection.unfocus(products[currentIndice]);
			}
			buildContent(nbProducts, next);
		});
	};


	/**
		Open the popup
	 */
	this.open = function(highlightedFeatures) {

		products = highlightedFeatures;

		// Clean-up previous state
		$('#info').parent().removeClass('ui-btn-active ui-focus');

		buildContent(products.length, null);

		parentElement.fadeIn();

		isOpened = true;
	};


	/**
		Close the popup
	 */
	this.close = function() {

		if (isOpened) {
			parentElement.stop(true).fadeOut();
			isOpened = false;
		}

	};

	/**
	* Depending on the feature list, if empty, close the dialog, otherwise open the dialog and update content
	*/
	this.openOrCloseDialog = function(from, featuresList) {
		if (from !== 'pick') {
			featuresList = ProductService.getHighlightedProducts();
		}
		if (!featuresList || featuresList.length == 0) {
			this.close();
		} else {
			this.open(featuresList);
		}
	};

	SearchResults.on('reset:features', this.close, this);

};

module.exports = MapPopup;
});

require.register("map/widget/toolbarMap", function(exports, require, module) {
var Map = require('map/map');
var LayersWidget = require('map/widget/layers');
var BackgroundWidget = require('map/widget/background');
var UserPrefs = require('userPrefs');

var mode2D = UserPrefs.get('Map mode') ? UserPrefs.get('Map mode') == '2d' : true;

module.exports = function(dsa) {

	this.layersWidget = new LayersWidget(dsa);

	// Create widget
	this.layersWidget.$el.ngeowidget({
		activator: '#layers'
	});

	new BackgroundWidget(dsa);

	$("#zoomIn").click(function() {
		Map.zoomIn();
	});
	$("#zoomOut").click(function() {
		Map.zoomOut();
	});
	$("#home").click(function() {
		Map.zoomToMaxExtent();
	});

	$("#switch").click(function() {
		mode2D = !mode2D;
		if (!Map.switchMapEngine(mode2D ? '2d' : '3d')) {
			// Create a pop-up to warn the user
			$('<div><p>3D map is not available because WebGL is not supported by your browser, see <a href="http://get.webgl.org/">here</a> for more details.</p></div>')
				.appendTo('#mapContainer')
				.popup()
				.popup('open');
			mode2D = true;
			// Switch back to 2D
			Map.switchMapEngine('2d');
		}
	});

	// TEMPO : use draw button to launch drawing, useful for testing
	/*	dsa.find("#draw").click( function(event) {
			var $this = $(this);
			$this.toggleClass('toggle');
			mapEngine = Map.getMapEngine();
			if ( $this.hasClass('toggle') ) {
				RectangleHandler.start({
					stop: function() {
						$this.toggleClass('toggle');
					}
				});
			} else {
				RectangleHandler.stop();
			}
		});*/

};
});


//# sourceMappingURL=map.js.map