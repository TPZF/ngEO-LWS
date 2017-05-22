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
require.register("account", function(exports, require, module) {
var Configuration = require('configuration');
var Logger = require('logger');
var DataAccessRequestStatuses = require('account/model/dataAccessRequestStatuses');
var DownloadManagers = require('dataAccess/model/downloadManagers');
var ShopcartCollection = require('shopcart/model/shopcartCollection');
var DataAccessRequestMonitoringView = require('account/view/dataAccessRequestMonitoringView');
var DownloadManagersMonitoringView = require('account/view/downloadManagersMonitoringView');
var ShopcartManagerView = require('account/view/shopcartManagerView');
// var InquiriesView = require('account/view/inquiriesView');
var UserPrefsView = require('account/view/userPrefsView');
var LayerManagerView = require('account/view/layerManagerView');
var account_template = require('../pages/account');
require('ui/tabs');



// Private variable : the different view of My Account page	
var dmView;
var darView;
// var inquiriesView;
var userPrefsView;
var shopcartManagerView;

var activeView;

var refreshViewOnResize = _.debounce(function() {
	if (activeView.refreshSize) activeView.refreshSize();
}, 300);

// Function call when a tab is activated
var onTabActivated = function($link) {

	switch ($link.attr('href')) {
		case "#downloadManagersMonitoring":
			DownloadManagers.fetch();
			activeView = dmView;
			break;
		case "#DARMonitoring":
			DataAccessRequestStatuses.fetch();
			activeView = darView;
			break;
		case "#userPrefs":
			activeView = userPrefsView;
			break;
		// case "#inquiries":
		// 	activeView = inquiriesView;
		// 	break;
		case "#shopcarts":
			ShopcartCollection.fetch();
			activeView = shopcartManagerView;
			break;
		case "#layerManager":
			activeView = layerManagerView;
			break;
	}

	if (activeView.refreshSize) activeView.refreshSize();
};

module.exports = {

	/**
	 * Build the root element of the module and return it
	 */

	buildElement: function() {
		var account_html = account_template(Configuration.localConfig.contextHelp);
		var acc = $(account_html);
		acc.find('#tabs').tabs({
			theme: "b",
			activate: onTabActivated
		});
		if (!Configuration.data.downloadManager.enable) {
			acc.find('a[href="#downloadManagersMonitoring"]').parent().hide();
			acc.find('a[href="#DARMonitoring"]').parent().hide();
		}
		return acc;
	},

	/**
	 * Called when the module main page is shown
	 */
	show: function() {
		if (activeView.refreshSize)
			activeView.refreshSize();
	},

	/**
	 * Initialize the module.
	 * Called after buildElement
	 */
	initialize: function() {

		$(window).resize(refreshViewOnResize);

		if (Configuration.data.downloadManager.enable) {
			// Create the download managers monitoring view
			dmView = new DownloadManagersMonitoringView({
				model: DownloadManagers,
				el: "#downloadManagersMonitoring"
			});
			dmView.render();

			// Create the view to monitor data access requests
			darView = new DataAccessRequestMonitoringView({
				model: DataAccessRequestStatuses,
				el: "#DARMonitoring"
			});

			// Fetch data for DM
			DownloadManagers.fetch();

			DataAccessRequestStatuses.set({
				collapseDAR: Configuration.data.dataAccessRequestStatuses.collapseDAR,
				collapseProducts: Configuration.data.dataAccessRequestStatuses.collapseProducts
			});

			// Fetch DAR : maybe not needed right now
			DataAccessRequestStatuses.fetch();
		}
		//Create the shopcart manager view 
		shopcartManagerView = new ShopcartManagerView({
			model: ShopcartCollection,
			el: "#shopcarts"
		});
		shopcartManagerView.render();

		// NGEO-1967: Replace inquiries view by "Contact Us" link
		// //Create the inquiries View
		// inquiriesView = new InquiriesView({
		// 	//model : inquiery,
		// 	el: "#inquiries"
		// });
		// inquiriesView.render();

		//Create the user prefs View
		userPrefsView = new UserPrefsView({
			el: "#userPrefs"
		});
		userPrefsView.render();

		//Create wms manager view
		layerManagerView = new LayerManagerView({
			el: "#layerManager"
		});
		layerManagerView.render();

		// The first active is download manager monitoring
		// if downloadManager is enable
		if (Configuration.data.downloadManager.enable) {
			activeView = dmView;
		} else {
			activeView = shopcartManagerView;
		}

	}

};
});


//# sourceMappingURL=account.js.map