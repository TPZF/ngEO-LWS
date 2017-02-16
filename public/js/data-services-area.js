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
require.register("data-services-area", function(exports, require, module) {
var Logger = require('logger');
var UserPrefs = require('userPrefs');
var Map = require('map/map');
var SearchResultsMap = require('searchResults/map');
var SearchDSA = require('search/dsa');
var SearchResultsDSA = require('searchResults/dsa');
var ShopcartDSA = require('shopcart/dsa');
var ToolBarMap = require('map/widget/toolbarMap');
var PanelManager = require('ui/panelManager');
var StackPanel = require('ui/stackPanel');
var StatusPanel = require('ui/statusPanel');
var dsa_template = require('../pages/data-services-area');
var Configuration = require('configuration');
require('ui/toolbar');
require('ui/dateRangeSlider');

var panelManager;
var toolbarMap;

module.exports = {

	/**
	 * Build the root element of the module and return it
	 */
	buildElement: function() {

		var dsa = $(dsa_template({
			theme: Configuration.localConfig.theme
		}));
		dsa.find('menu[type=toolbar]').not('#bottomToolbar').toolbar();
		dsa.find('#bottomToolbar').toolbar({
			withNumber: true,
			large: true
		});
		return dsa;
	},

	/**
	 * Called when the module main page is hidden
	 */
	hide: function() {
		panelManager.save();
		$('.mapPopup').hide();
		$('#statusBar').hide();
		$('#dateRangeSlider').hide();
		$('#searchToolbar').hide();
		$('#mapToolbar').hide();
		$('#bottomToolbar').hide();
	},

	/**
	 * Called when the module main page is shown
	 */
	show: function() {
		$('.mapPopup').show();
		$('#statusBar').show();

		var $dateRangeSlider = $('#dateRangeSlider');
		if ($dateRangeSlider.is(':ui-dateRangeSlider')) {
			$dateRangeSlider.show();
			$dateRangeSlider.dateRangeSlider('refresh');
		}

		$('#searchToolbar').show();
		$('#mapToolbar').show();
		$('#bottomToolbar').show();
		panelManager.restore();
	},

	/**
	 * Initialize the module.
	 * Called after buildElement
	 *
	 * @param element The root element of the module
	 */
	initialize: function(element) {

		// Create the panel manager and the panel used for the different view : search, result, table...
		panelManager = new PanelManager({
			el: '#mapContainer',
			center: '#map'
		});

		// Add left panel (use for search )
		panelManager.add('left', new StackPanel({
			el: '#left-panel',
			classes: 'ui-body-'+Configuration.localConfig.theme+' panel-content-left'
		}));

		// Add bottom panel (use for results and shopcart)
		panelManager.add('bottom', new StatusPanel({
			el: '#bottom-panel',
			classes: 'ui-body-'+Configuration.localConfig.theme+' panel-content-bottom'
		}));

		// Initialize "pickedFeatures"-event AFTER adding status panel
		// to ensure that click on map changes status depending on feature before
		// scrolling to highlighted feature in TableView thus the feature2row is consistent
		SearchResultsMap.initialize();

		panelManager.on('centerResized', function() {
			Map.updateViewportSize();
			// TODO : improve that
			var $dateRangeSlider = $('#dateRangeSlider');
			if ($dateRangeSlider.is(':ui-dateRangeSlider')) {
				$dateRangeSlider.dateRangeSlider('refresh');
			}
		});


		// Need to add some elements to map to have good positionning.
		// Not very pretty..
		// MS: work in progress.. commented parts should be deleted at the end..
		$('#statusBar')/*.appendTo('#map')*/.hide().trigger('create');
		// $('#dateRangeSlider').appendTo('#map').hide();
		// $('#searchToolbar').appendTo('#map').hide();
		$('#mapToolbar').appendTo('#map').hide();
		$('#bottomToolbar')/*.appendTo('#map')*/.hide();

		// Create the router
		var router = new Backbone.Router();

		// Create all widgets for diferent modules
		SearchDSA.initialize(element, router, panelManager);
		SearchResultsDSA.initialize(element, router, panelManager);
		ShopcartDSA.initialize(element, router, panelManager);

		// Initialize toolbar and context help
		toolbarMap = new ToolBarMap(element);
	}
};
});


//# sourceMappingURL=data-services-area.js.map