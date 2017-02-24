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
require.register("account/template/accountDARsContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='\r\n<div id="dataAccessMonitoringContent" class="widget-content">\r\n\t<div class="ui-grid-a">\r\n\t\t<div id="dmsDiv" class="ui-block-a widget-content">\r\n\t\t\t<h4>Assigned Download Managers : '+
((__t=( getOrderedStatuses().length ))==null?'':__t)+
'</h4>\r\n\t\t\t<ul id="downloadmnagers" data-role="listview" data-inset="true">\r\n\t\t\t\t';
 _.each(getOrderedStatuses(), function(newStatus) { 
__p+='\r\n\t\t\t\t<li id="'+
((__t=( newStatus.dlManagerId ))==null?'':__t)+
'" data-mini="true">'+
((__t=(
					newStatus.downloadManagerName ))==null?'':__t)+
' : '+
((__t=( newStatus.DARs.length ))==null?'':__t)+
'</li> ';
 }); 
__p+='\r\n\t\t\t</ul>\r\n\t\t</div>\r\n\r\n\t\t<div id="darsDiv" class="ui-block-b widget-content">\r\n\t\t</div>\r\n\r\n\t\t<div id="assignDMPopup" data-role="popup" data-theme="a" class="ui-content"></div>\r\n\t</div>\r\n</div>\r\n';
}
return __p;
};
});

require.register("account/template/darMonitoringFilterContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<h4>Assigned Download Managers : '+
((__t=( getOrderedStatuses().length ))==null?'':__t)+
'</h4>\n<ul id="downloadmnagers" data-role="listview" data-inset="true"\n    data-theme="a">\n    ';
 _.each(getOrderedStatuses(), function(newStatus) { 
__p+='\n    <li id="'+
((__t=( newStatus.dlManagerId ))==null?'':__t)+
'" data-mini="true">'+
((__t=(
        newStatus.downloadManagerName ))==null?'':__t)+
' : '+
((__t=( newStatus.DARs.length ))==null?'':__t)+
'</li> ';
 }); 
__p+='\n</ul>';
}
return __p;
};
});

require.register("account/template/dataAccessRequestMonitoringContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='\t\t\t\r\n';

var total = 0; 
 _.each(orderedStatusesToDisplay, function(newStatus) {
	total += newStatus.DARs.length
});

__p+='\r\n\t\t\t\r\n<h4>Data Access Requests : '+
((__t=( total ))==null?'':__t)+
'</h4>\r\n\t\r\n';
 _.each(orderedStatusesToDisplay, function(newStatus) {
	_.each(newStatus.DARs, function(dar) { 
__p+='\r\n\r\n\t\t<div style="width: 100%; text-align: right;">\r\n\t\t\t<span class="checkDar ui-icon ui-icon-checkbox-off"></span>\r\n\t\t\t<div id="'+
((__t=( dar.ID ))==null?'':__t)+
'" class="darStatus" data-role="collapsible"\r\n\t\t\t\tdata-collapsed="'+
((__t=( model.attributes.collapseDAR ))==null?'':__t)+
'" data-inset="true" data-theme="a" data-content-theme="c" data-mini="true">\r\n\t\t\t\t<!-- Name seems to be mandatory but just in case take ID if name doesn\'t exist -->\r\n\t\t\t\t';
 var darName = (dar.name ? dar.name : dar.ID) 
__p+='\r\n\t\t\t\t<h4>'+
((__t=( dar.type ))==null?'':__t)+
' : '+
((__t=( darName ))==null?'':__t)+
'</h4>\r\n\r\n\t\t\t\t<table cellpadding="0" cellspacing="0" border="0">\r\n\t\t\t\t\t<thead>\r\n\t\t\t\t\t\t<th>Type</th>\r\n\t\t\t\t\t\t<th>Status</th>\r\n\t\t\t\t\t\t<th>Download Manager</th>\r\n\t\t\t\t\t\t<th>Products</th>\r\n\t\t\t\t\t</thead>\r\n\t\t\t\t\t<tbody>\r\n\t\t\t\t\t\t<tr>\r\n\t\t\t\t\t\t\t<td>'+
((__t=( dar.type ))==null?'':__t)+
'</td>\r\n\t\t\t\t\t\t\t<td>'+
((__t=( model.getStatusReadableString (dar.status) ))==null?'':__t)+
'</td>\r\n\t\t\t\t\t\t\t<td>'+
((__t=( newStatus.dlManagerId ))==null?'':__t)+
'</td>\r\n\t\t\t\t\t\t\t<td>'+
((__t=( (dar.productStatuses)? dar.productStatuses.length : 0 ))==null?'':__t)+
'</td>\r\n\t\t\t\t\t\t</tr>\r\n\t\t\t\t\t</tbody>\r\n\t\t\t\t</table>\r\n\r\n\t\t\t\t<div data-role="collapsible" data-collapsed="'+
((__t=( model.attributes.collapseProducts ))==null?'':__t)+
'" data-mini="true"\tdata-inset="true" data-theme="d" data-content-theme="d">\r\n\t\t\t\t\t<h4>Products</h4>\r\n\t\t\t\t\t';
 if (dar.productStatuses) { 
__p+='\r\n\t\t\t\t\t\t<table cellpadding="0" cellspacing="0" border="0">\r\n\t\t\t\t\t\t\t<thead>\r\n\t\t\t\t\t\t\t\t<th>ProductURL</th>\r\n\t\t\t\t\t\t\t\t<th>Status</th>\r\n\t\t\t\t\t\t\t\t<th>%</th>\r\n\t\t\t\t\t\t\t\t<th>Size</th>\r\n\t\t\t\t\t\t\t</thead>\r\n\r\n\t\t\t\t\t\t\t';
 _.each(dar.productStatuses, function(productStatus, i) { 
__p+='\r\n\t\t\t\t\t\t\t\t<tbody>\r\n\t\t\t\t\t\t\t\t\t<tr>\r\n\t\t\t\t\t\t\t\t\t\t<td>'+
((__t=( productStatus.productURL ))==null?'':__t)+
'</td>\r\n\t\t\t\t\t\t\t\t\t\t<td>'+
((__t=( model.getStatusReadableString (productStatus.productStatus) ))==null?'':__t)+
'</td>\r\n\t\t\t\t\t\t\t\t\t\t<td>'+
((__t=( productStatus.percentageCompleted ))==null?'':__t)+
'</td>\r\n\t\t\t\t\t\t\t\t\t\t<td>'+
((__t=( filesize(productStatus.expectedSize) ))==null?'':__t)+
'</td>\r\n\t\t\t\t\t\t\t\t\t</tr>\r\n\t\t\t\t\t\t\t\t</tbody>\r\n\t\t\t\t\t\t\t';
 }); 
__p+='\r\n\t\t\t\t\t\t</table>\r\n\r\n\t\t\t\t\t';
 } else { 
__p+='\r\n\t\t\t\t\t\t<label data-mini="true"> No Products available </label>\r\n\t\t\t\t\t';
 } 
__p+='\r\n\t\t\t\t</div>\r\n\r\n\t\t\t\t<div class="popup-widget-footer">\r\n\t\t\t\t\r\n\t\t\t\t\t<div id="serverDARMonitoringResponse_'+
((__t=( dar.ID ))==null?'':__t)+
'" class="ui-message"></div>\r\n\t\t\t\t\t\r\n\t\t\t\t\t<button id="pause_'+
((__t=( dar.ID ))==null?'':__t)+
'" data-role="button" data-mini="true" data-inline="true" data-theme="a" class="pauseResumeButton">Pause</button>\r\n\t\t\t\t\t<button id="stop_'+
((__t=( dar.ID ))==null?'':__t)+
'" data-role="button" data-mini="true" data-inline="true" data-theme="a" class="stopDownloadButton">Stop definitively</button>\r\n\t\t\t\t</div>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t';
 }); 
__p+=' \r\n\r\n';
 }); 
__p+='\r\n\r\n<div class="ui-disabled" id="darFooterButtons">\r\n\t<button id="pauseAll" data-position-to="window" data-mini="true" data-inline="true" data-theme="a" >Pause</button>\r\n\t<button id="resumeAll" data-position-to="window" data-mini="true" data-inline="true" data-theme="a">Resume</button>\r\n\t<button id="stopAll" data-position-to="window" data-mini="true" data-inline="true" data-theme="a">Stop definitively</button>\r\n\t<button id="reassignDM" data-position-to="window" data-mini="true" data-inline="true" data-theme="a" >Assign download manager</button>\r\n</div>';
}
return __p;
};
});

require.register("account/template/downloadManagersMonitoringContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div id="downloadManagersMonitoringContent"\r\n\tclass="widget-content">\r\n</div>\r\n\r\n<div class="popup-widget-footer">\r\n\r\n\t<button id="stop_dm" data-mini="true" data-inline="true" data-theme="a">Stop</button>\r\n\r\n\t<div id="stopDMDialog">\r\n        You’re about to stop the selected Download Manager, do you wish to continue?\r\n\t\t<!--Do you want to stop the download manager immediately, without waiting for current downloads to finish?-->\r\n\t\t<div id="stopDMDialogButtons">\r\n            <label for="stopImmediately">Let current downloads finish</label>\r\n            <input id="stopImmediately" type="checkbox" data-mini="true" data-theme="d" checked="checked" />\r\n\t\t\t<button class="confirm" data-mini="true" data-inline="true" data-theme="a">OK</button>\r\n\t\t\t<button class="cancel" data-mini="true" data-inline="true" data-theme="a">Cancel</button>\r\n\t\t</div>\r\n\t</div>\r\n</div>\r\n\r\n';
}
return __p;
};
});

require.register("account/template/downloadManagersTableContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<table cellpadding="0" cellspacing="0" border="0">\r\n\t<thead>\r\n\t\t<th></th>\r\n\t\t<th>Download Manager Name</th>\r\n\t\t<th>Status</th>\r\n\t\t<th>IP Address</th>\r\n\t\t<th>Last Accessed Date</th>\r\n\t</thead>\r\n\t<tbody>\r\n\t';
 _.each(downloadmanagers, function(downloadManager, i) { 
__p+='\r\n\t\r\n\t\t<tr data-dmId="'+
((__t=( downloadManager.downloadManagerId ))==null?'':__t)+
'">\r\n\t\t\t';
 if (downloadManager.status == 'ACTIVE'){ 
__p+='\r\n\t\t\t\t<td><span class="ui-icon-processing ui-icon ui-shadow">&nbsp;</span></td>\r\n\t\t\t';
 } else if (downloadManager.status == 'INACTIVE') { 
__p+='\r\n\t\t\t\t<td><span class="ui-icon-paused ui-icon ui-shadow">&nbsp;</span></td>\r\n\t\t\t';
 } else if (downloadManager.status == 'STOPPED') { 
__p+='\r\n\t\t\t\t<td><span class="ui-icon-cancelled ui-icon ui-shadow">&nbsp;</span></td>\r\n\t\t\t';
 } else { 
__p+='\r\n\t\t\t\t<td><span class="ui-icon-unknown ui-icon ui-shadow">&nbsp;</span></td> \r\n\t\t\t';
 } 
__p+='\r\n\t\t\t<td>'+
((__t=( downloadManager.downloadManagerFriendlyName ))==null?'':__t)+
'</td>\r\n\t\t\t<td>'+
((__t=( downloadManager.status ))==null?'':__t)+
'</td>\r\n\t\t\t<td>'+
((__t=( downloadManager.ipAddress ))==null?'':__t)+
'</td>\r\n\t\t\t<td>'+
((__t=( downloadManager.lastAccessDate ))==null?'':__t)+
'</td>\r\n\t\t</tr>\r\n\t';
 }); 
__p+='\r\n\t</tbody>\r\n</table>\r\n\r\n';
}
return __p;
};
});

require.register("account/template/inquiriesContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div id="inquiriesContent" class="widget-content ui-body-'+
((__t=( theme ))==null?'':__t)+
'">\r\n\t<form action="submit">\r\n\t\t<label for="inquiryType">Choose the inquiry type:</label>\r\n\t\t<select name="inquiryType" id="inquiryType" data-mini="true" data-theme="a">\r\n\t\t   <option value="-1" disabled selected>...</option>\r\n\t\t   <option value="0">Suggestion</option>\r\n\t\t   <option value="1">Question</option>\r\n\t\t   <option value="2">Complaint</option>\r\n\t\t   <option value="3">Request for bulk order</option>\r\n\t\t   <option value="4">Request on-demand media delivery</option>\r\n\t\t   <option value="5">Other</option>\r\n\t\t</select>\r\n\t\t\r\n\t\t<label for="inquiryMessage">Enter the inquiry message:</label>\r\n\t\t<textarea id="inquiryMessage" rows="10" data-theme="a"></textarea>\r\n\t\r\n\t\t<div class="popup-widget-footer" id="submitInquiryButtonContainer">\r\n\t\t\t<button id="submitInquiry" data-role="button" data-mini="true" data-inline="true" data-theme="a">Submit</button>\r\n\t\t</div>\r\n\t\r\n\t</form>\r\n\r\n</div>';
}
return __p;
};
});

require.register("account/template/layerManagerContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<!-- Contains available layers -->\r\n<h2>Available layers</h2>\r\n<div id="trees" style="max-height: 600px; overflow: auto;">\r\n</div>\r\n\r\n<div class="popup-widget-footer">\r\n\t<button id="addLayer" data-icon=\'plus\' data-role="button" data-mini="true" data-inline="true" data-theme="a">Add layer</button>\r\n</div>';
}
return __p;
};
});

require.register("account/template/layerSearchPopupContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div id="layerSearchPopup" data-transition="flip" data-theme="a" class="ui-content" data-role="popup" data-overlay-theme="a">\n    <a href="#" data-rel="back" data-role="button" data-theme="a" data-icon="delete" data-iconpos="notext" class="ui-btn-right">Close</a>\n    <div>\n        <label>Name:\n            <input name="layerName" type="text" placeholder="Name" value="" />\n        </label>\n        <label>Layer url:\n            <input name="layerUrl" type="text" placeholder="Mapserver url" value="" />\n        </label>\n        <form style="display: none;">\n\t\t\t<fieldset style="text-align: center" data-mini="true" data-role="controlgroup" data-type="horizontal">\n\t\t\t    <label>WMS\n\t\t\t    \t<input type="radio" name="capabilities-type" value="WMS" checked="checked">\n\t\t\t    </label>\n\t\t\t    <label>WMTS\n\t\t\t    \t<input type="radio" name="capabilities-type" value="WMTS">\n\t\t\t    </label>\n\t\t\t</fieldset>\n\t\t</form>\n        <a data-mini="true" data-role="button" data-icon="search" data-iconpos="right">Search</a>\n        <div style="display: none; margin-top: 10px; font-type:bold; font-weight: bold; color: red;" class="status"></div>\n    </div>\n</div>';
}
return __p;
};
});

require.register("account/template/nameShopcartTemplate", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<form>\r\n\r\n\t<label for="shopcartNameField">Enter a name : </label>\r\n\t<input type="text" name="shopcartNameField" id="shopcartNameField" data-mini="true" />\r\n\t\r\n\t<div class="popup-widget-footer">\r\n\t\t<div id="serverMessage"></div>\r\n\t\t<button id="submitShopcart" data-role="button" data-mini="true" data-inline="true" data-theme="a">Submit</button>\r\n\t</div>\r\n\r\n</form>\r\n';
}
return __p;
};
});

require.register("account/template/reassignDownloadPopupContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div id="reassignDMDialog">\n    <select id="downloadManagersList" data-mini="true" data-theme="a">\n    ';
 _.each(downloadmanagers, function( downloadManager ) { 
__p+='\n        <option value="'+
((__t=( downloadManager.downloadManagerId ))==null?'':__t)+
'" data-corners="false" data-theme="a">'+
((__t=( downloadManager.downloadManagerFriendlyName ))==null?'':__t)+
'</option>\n    ';
 }); 
__p+='\n    </select>\n    <a class="submit" data-mini=\'true\' data-inline=\'true\' data-theme=\'a\' data-role=\'button\' >OK</a>\n</div>';
}
return __p;
};
});

require.register("account/template/shopcartManagerContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div id="shopcartManagerContent" class="widget-content">\r\n\r\n\t<div id="shopcartListDiv">\r\n\t\t<fieldset id="shopcartList" data-role=controlgroup data-inset="true">\t\r\n\t\t\r\n\t\t\t';
 _.each(shopcarts.models, function(shopcart) { 
__p+='\r\n\t\t\t\t\r\n\t\t\t\t<label id="'+
((__t=( shopcart.id ))==null?'':__t)+
'"><input id="'+
((__t=( shopcart.id ))==null?'':__t)+
'_input" type="radio" name="shopcart" data-theme="a" data-mini="true"/>  '+
((__t=( shopcart.get('name') ))==null?'':__t)+
' </label> \r\n\t\t\t\r\n\t\t\t';
 }); 
__p+='\r\n\t\t\t\t\r\n\t\t</fieldset>\r\n\t</div>\r\n\t\t\r\n\t<div class="popup-widget-footer">\r\n\r\n\t\t<div id="errorMessageDiv" class=\'ui-error-message\'></div>\r\n\t\t\r\n\t\t<button id="new_shp" data-role="button" data-mini="true"\r\n\t\t\tdata-inline="true" data-theme="a">New</button>\r\n\t\t\t\r\n\t\t<button id="share_shp" data-role="button" data-mini="true"\r\n\t\t\tdata-inline="true" data-theme="a">Share</button>\r\n\t\t\t\t\r\n\t\t<button id="export_shp" data-mini="true" data-inline="true"\r\n\t\t\tdata-theme="a">Export</button>\r\n\t\t\t\r\n\t\t<button id="rename_shp" data-mini="true" data-inline="true"\r\n\t\t\tdata-theme="a">Rename</button>\r\n\t\t\t\r\n\t\t<button id="duplicate_shp" data-mini="true" data-inline="true"\r\n\t\tdata-theme="a">Duplicate</button>\r\n\t\t\r\n\t\t<button id="delete_shp" data-mini="true" data-inline="true"\r\n\t\tdata-theme="a">Delete</button>\r\n\t</div>\r\n\t\r\n</div>\r\n';
}
return __p;
};
});

require.register("account/template/userPrefsContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div id="userPrefsContent" class="widget-content ui-body-'+
((__t=( theme ))==null?'':__t)+
'">\r\n\r\n\t<ul id="layersPrefsList" data-role=\'listview\' data-divider-theme="a" data-insets="true">\r\n\t\t';
 _.each(UserPrefs.keys, function(key) { 
__p+=' \r\n\t\t\t<li>'+
((__t=( key ))==null?'':__t)+
' : '+
((__t=( (!UserPrefs.get(key))? 'None' : UserPrefs.get(key)))==null?'':__t)+
'</li> \r\n\t\t';
 }); 
__p+='\r\n\t</ul>\r\n\t\r\n</div>\r\n\r\n<div class="popup-widget-footer">\r\n\t<button id="clearPrefs" data-role="button" data-mini="true" data-inline="true" data-theme="a">Reset Preferences</button>\r\n</div>';
}
return __p;
};
});

require.register("account/template/wmsSearchPopupContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div id="wmsSearchPopup" data-transition="flip" data-theme="a" class="ui-content" data-role="popup">\n    <a href="#" data-rel="back" data-role="button" data-theme="a" data-icon="delete" data-iconpos="notext" class="ui-btn-right">Close</a>\n    <div id="mapserverSearch">\n        <label>Name:\n            <input name="wmsLayerName" type="text" placeholder="Name" value="" />\n        </label>\n        <label>WMS server url:\n            <input name="wmsUrl" type="text" placeholder="Mapserver url" value="" />\n        </label>\n        <a data-mini="true" data-role="button" data-icon="search" data-iconpos="right">Search</a>\n        <div style="display: none; margin-top: 10px; font-type:bold; font-weight: bold; color: red;" class="status"></div>\n    </div>\n</div>';
}
return __p;
};
});

require.register("dataAccess/template/dataAccessRequestViewContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div data-role="fieldcontain">\r\n\t<label style="font-size: 14px" for="darName">Name :</label>\r\n\t<input placeholder="Enter optional name" type="text" id="darName" value="'+
((__t=( request.name  ))==null?'':__t)+
'" />\r\n</div>\r\n\r\n<div data-role="collapsible-set">\r\n\t<div data-role="collapsible" data-content-theme="'+
((__t=( theme ))==null?'':__t)+
'" data-collapsed="false">\r\n\r\n\t\t<h3>Download location</h3>\r\n\t\t<label>Download directory : \r\n\t\t\t<input type="text" id="downloadDirectory" />\r\n\t\t</label>\r\n\t\t\r\n\t\t<label>Download Manager : \r\n\t\t\t<select id="downloadManagersList" data-mini="true" data-theme="a">\r\n\t\t\t';
 _.each(model.get("downloadmanagers"), function(downloadManager) { 
__p+='\t\r\n\t\t\t\t<option value="'+
((__t=( downloadManager.downloadManagerId ))==null?'':__t)+
'" data-corners="false" data-theme="a">'+
((__t=( downloadManager.downloadManagerFriendlyName ))==null?'':__t)+
'</option> \r\n\t\t\t';
 }); 
__p+='\r\n\t\t\t</select>\r\n\t\t</label>\r\n\t</div>\r\n\t\t\r\n\t<div id="productProcessingContainer" data-role="collapsible" data-content-theme="'+
((__t=( theme ))==null?'':__t)+
'">\r\n\t\t<h3>Product processing</h3>\r\n\t\t<div id="hostedProcesses">\r\n\t\t\tLoading available products processing...\r\n\t\t</div>\r\n\t</div>\r\n\t\r\n</div>\r\n\r\n<div id="downloadManagersFooter" class="popup-widget-footer">\r\n\t\r\n\t<div id="dataAccessSpecificMessage"></div>\r\n\r\n\t<hr style="border: 0; height: 1px; background-color: #949494; width: 20%;">\r\n\t<div id="serverMessage"></div>\r\n\t\r\n\t<button id="validateRequest" data-role="button" data-mini="true" data-inline="true" data-theme="a" >Validate</button>\r\n\r\n\r\n</div>\t\r\n\t';
}
return __p;
};
});

require.register("dataAccess/template/directDownloadWidgetContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<ul data-role="listview" data-inset="true" style="min-width:210px;" data-theme="a">\r\n\t\r\n\t<li data-role="divider" data-theme="a">Direct Download Links</li>\r\n\t<li>\r\n\t\t<a href="'+
((__t=( url ))==null?'':__t)+
'" target="_blank">Via Browser</a>\r\n\t</li>\r\n\t';
 if (downloadHelperUrl){ 
__p+='\r\n\t\t<li>\r\n\t\t\t<a href="'+
((__t=( downloadHelperUrl ))==null?'':__t)+
'" target="_blank">Via Local Download Manager</a>\r\n\t\t</li>\r\n\t';
 } 
__p+='\t\r\n</ul>\r\n';
}
return __p;
};
});

require.register("dataAccess/template/downloadManagerInstallContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="ui-error-message widget-content">\r\n\t<p><b>To install a Download Manager click on the following buttons : </b></p>\r\n\t';
 _.each( downloadManagerInstallationLink, function(value,key) { 
__p+='\r\n\t\t<a data-mini=\'true\' data-inline=\'true\' data-theme=\'a\' data-role=\'button\' data-ajax=\'false\' target=\'_blank\' href=\''+
((__t=( value ))==null?'':__t)+
'\' download>'+
((__t=( key ))==null?'':__t)+
' Download Manager</a>\r\n\t';
 }); 
__p+='\r\n</div>';
}
return __p;
};
});

require.register("hostedProcesses/template/hostedProcessConfigurationContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div data-role="fieldcontain">\n\t<label style="display: inline-block; font-weight: bold; width: 23%;" for="'+
((__t=( hostedProcess.name ))==null?'':__t)+
'">Service: </label>\n\t<span id="'+
((__t=( hostedProcess.name ))==null?'':__t)+
'" style="display: inline-block; width: 75%">'+
((__t=( hostedProcess.displayName ))==null?'':__t)+
'</span>\n</div>\n\n<div style="text-align: justify;" data-role="fieldcontain">\n\t<label style="display: inline-block; vertical-align: top; font-weight: bold; width: 23%;" for="'+
((__t=( hostedProcess.description ))==null?'':__t)+
'">Description: </label>\n\t<span id="'+
((__t=( hostedProcess.description ))==null?'':__t)+
'" style="width: 75%; display: inline-block;">'+
((__t=( hostedProcess.description ))==null?'':__t)+
'</span>\n</div>\n\n';
 for ( var i=0; i<hostedProcess.parameter.length; i++ )
{
	var parameter = hostedProcess.parameter[i];
	/* Do not generate field for EOProductURL type */
	if ( parameter.type != "EOProductURL" )
	{ 
__p+='\n\t\t<div class="configurationInputs" data-role="fieldcontain">\n\t\t<label title="'+
((__t=( parameter.description ))==null?'':__t)+
'" for="'+
((__t=( parameter.name ))==null?'':__t)+
'">'+
((__t=( parameter.name ))==null?'':__t)+
': </label>\n\t\t';

		switch (parameter.type) { case "String" : 
__p+='\n\t\t\t\t\t<input type="text" id="'+
((__t=( parameter.name ))==null?'':__t)+
'" data-mini="true" />\n\n\t\t\t';
 break; case "Integer" : case "Float" : 
__p+='\n\t\t\t\t\t<input min="'+
((__t=( parameter.rangeMinValue ))==null?'':__t)+
'" max="'+
((__t=( parameter.rangeMaxValue ))==null?'':__t)+
'" type="number" id="'+
((__t=( parameter.name ))==null?'':__t)+
'" data-mini="true" />\n\n\t\t\t';
 break; case "DateTime" : 
__p+='\n\t\t\t\t\t<input type="text" data-role="datebox" data-mini="true" data-theme="a" data-options=\'{"mode": "calbox", "overrideDateFormat":"%Y-%m-%d",\n\t\t\t\t\t"useTodayButton": true, "themeDate":"c", "themeDatePick":"a", "calHighToday": true, "calUsePickers": true, "calNoHeader": true, "zindex": "2000"}\' id="'+
((__t=( parameter.name ))==null?'':__t)+
'" data-mini="true" />\n\n\t\t\t';
 break; case "enumeration" : 
__p+='\n\t\t\t\t\t<select id="'+
((__t=( parameter.name ))==null?'':__t)+
'" data-mini="true" data-theme="a">\n\n\t\t\t\t\t\t';
 for ( var j=0; j<parameter.values.length; j++ )
						{ 
__p+='\n\t\t\t\t\t\t\t<option value="'+
((__t=( parameter.values[j] ))==null?'':__t)+
'" data-corners="false" data-theme="a" data-mini="true">'+
((__t=( parameter.values[j] ))==null?'':__t)+
'</option> \n\t\t\t\t\t\t';
 } 
__p+='\n\t\t\t\t\t</select>\n\n\t\t\t';
 break; case "URL" : 
__p+='\n\t\t\t\t\t<input type="url" id="'+
((__t=( parameter.name ))==null?'':__t)+
'" data-mini="true" />\n\n\t\t\t';
 break; } 
__p+='\n\t\t</div>\n';
	} } 
__p+='\n\n<div style="text-align: center;">\n\t<button id="validateHostedProcessConfiguration" data-role="button" data-mini="true" data-inline="true" data-theme="a" >OK</button>\n</div>\n\n<div style="font-weight: bold; text-align: center;" id="validateMessage"></div>\n';
}
return __p;
};
});

require.register("hostedProcesses/template/hostedProcessesListContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div id="hostedProcessesContent" class="widget-content ui-body-'+
((__t=( theme ))==null?'':__t)+
'">\n\n\t<div style="max-height: 150px; overflow: auto;">\n\t';
 for ( var i=0; i<hostedProcesses.length; i++ )
	{ 
__p+='\n\t\t<div data-value="'+
((__t=( i ))==null?'':__t)+
'" class="hostedProcess">\n\t\t\t<span style="font-weight: bold;">'+
((__t=( hostedProcesses[i].displayName ))==null?'':__t)+
':</span><span> '+
((__t=( hostedProcesses[i].description ))==null?'':__t)+
'</span><br/>\n\t\t</div>\n\t';
 } 
__p+='\n\t</div>\n\n\t<div style="text-align: center;">\n\t\t<button id="configureHostedProcess" data-role="button" data-mini="true" data-inline="true" data-theme="a" disabled="disabled" >Configure</button>\n\t</div>\n\n</div>';
}
return __p;
};
});

require.register("search/template/advancedCriteriaContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<!-- If the selected dataset has no advanced criteria display an information message to the user -->\r\n';
 if ( advancedAttributes.length == 0 ) { 
__p+='\r\n\t<div class="widget-content ui-body-a ui-error-message">\r\n\t\t<p><b>No advanced criteria available.</b></p>\r\n\t</div>\r\n\r\n';
 } else { 
__p+='\r\n\r\n\t<!-- Display search criteria -->\r\n\t<form>\t\t\t\r\n\r\n\t';
 _.each( advancedAttributes, function(criterion, i) { 
			var value = criterion.value;
			var label = criterionLabels[criterion.id] || criterion.id;
			var criterionType = criterion.type.toLowerCase();
			
__p+='\r\n\t\t   <!-- The criterion is an enumeration has multiple options so create a list of checkboxes  -->\r\n\t\t   <!-- NGEO-1862 possibleValues contains now a list of String which are the direct value to display instead of object mapped with the string possibleValue -->\r\n\t\t\t';
 if (criterionType == 'list' || criterionType == 'string') { 
__p+=' \r\n\t\t\t\t<!-- NGEO-2233: list and string must have possible values for now due to ease of configuration for Ops -->\r\n\t\t\t\t';
 if ( criterion.possibleValues && criterion.possibleValues.length > 0 ) { 
__p+='\r\n\t\t\t\t\t';
 if ( criterion.maxOccurs == 1 ) { 
__p+='\r\n\t\t\t\t\t\t<label id="'+
((__t=( label ))==null?'':__t)+
'_label" for="'+
((__t=( criterion.id ))==null?'':__t)+
'">'+
((__t=( label ))==null?'':__t)+
' : </label>\r\n\t\t\t\t\t\t<!-- Selectbox -->\r\n\t\t\t\t\t\t<select id="'+
((__t=( criterion.id ))==null?'':__t)+
'" data-mini="true"">\r\n\t\t\t\t\t\t\t<option value="">None</option>\r\n\t\t\t\t\t\t\t';
 _.each(criterion.possibleValues, function(possibleValue) { 
__p+='\r\n\t\t\t\t\t\t\t\t<option value="'+
((__t=( possibleValue ))==null?'':__t)+
'" ';
 if ( value && value.indexOf(possibleValue) != -1) { print('selected'); } 
__p+=' >'+
((__t=( possibleValue ))==null?'':__t)+
'</option>\r\n\t\t\t\t\t\t\t';
 }); 
__p+='\r\n\t\t\t\t\t\t</select>\r\n\t\t\t\t\t';
 } else { 
__p+='\r\n\t\t\t\t\t\t<div data-role="fieldcontain">\r\n\t\t\t\t\t\t\t<fieldset data-role="controlgroup">\r\n\t\t\t\t\t\t\t\t<legend>'+
((__t=( label ))==null?'':__t)+
':</legend>\r\n\t\t\t\t\t\t\t\t';
 _.each(criterion.possibleValues, function(possibleValue) { 
__p+='\r\n\t\t\t\t\t\t\t\t\t<label>\r\n\t\t\t\t\t\t\t\t\t\t<!-- select the check box if value is defined -->\r\n\t\t\t\t\t\t\t\t\t\t<input type="checkbox" name="'+
((__t=( criterion.id ))==null?'':__t)+
'" value="'+
((__t=( possibleValue ))==null?'':__t)+
'" data-mini="true" ';
 if ( value && value.indexOf(possibleValue) != -1 ) print('checked="checked"'); 
__p+=' />\r\n\t\t\t\t\t\t\t\t\t\t'+
((__t=( possibleValue ))==null?'':__t)+
'\r\n\t\t\t\t\t\t\t\t\t</label>\r\n\t\t\t\t\t\t\t\t';
 }); 
__p+='\r\n\t\t\t\t\t\t\t</fieldset>\r\n\t\t\t\t\t\t</div>\r\n\t\t\t\t\t';
 } 
__p+='\r\n\t\t\t\t';
 } else { 
__p+='\r\n\t\t\t\t\t<!-- The criterion has no possible values, show text field -->\r\n\t\t\t\t\t<div data-role="fieldcontain">\r\n\t\t\t\t\t\t<label class="capitalize" for="'+
((__t=( criterion.id ))==null?'':__t)+
'">'+
((__t=( label ))==null?'':__t)+
':</label>\r\n\t\t\t\t\t\t<input type="text" name="'+
((__t=( criterion.id ))==null?'':__t)+
'" id="'+
((__t=( criterion.id ))==null?'':__t)+
'" ';
 if ( value ) print('value='+value); 
__p+=' data-mini="true"/>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t';
 } 
__p+='\r\n\r\n\t\t\t<!-- The criterion is an integer within a range  -->\t\r\n\t\t\t';
 } else if ((criterionType == 'integer' || criterionType == 'float') && criterion.rangeMinValue && criterion.rangeMaxValue) { 
__p+='\t\r\n\t\t\t\t<label for="'+
((__t=( criterion.id ))==null?'':__t)+
'">'+
((__t=( label ))==null?'':__t)+
'</label>\r\n    \t\t\t<input data-mini="true" name="'+
((__t=( criterion.id ))==null?'':__t)+
'" id="'+
((__t=( criterion.id ))==null?'':__t)+
'" min="'+
((__t=( criterion.rangeMinValue ))==null?'':__t)+
'" max="'+
((__t=( criterion.rangeMaxValue ))==null?'':__t)+
'" ';
 if ( value ) print('value='+value); 
__p+=' type="range">\r\n\r\n    \t\t<!-- The criterion is a range -->\r\n    \t\t';
 } else if ((criterionType == 'range') && criterion.rangeMinValue && criterion.rangeMaxValue) { 
__p+='\t\r\n\t\t\t\t<div data-role="fieldcontain">\r\n\t\t\t    \t<div data-role="rangeslider" data-highlight="true" data-mini="true">\r\n\t\t\t\t        <label class="capitalize" for="'+
((__t=( criterion.id ))==null?'':__t)+
'_from">'+
((__t=( label ))==null?'':__t)+
':</label>\r\n\t\t\t\t        <input data-theme="a" type="range" step="';
 criterionType == "integer" ? print("1") : print(".1") 
__p+='" name="'+
((__t=( criterion.id ))==null?'':__t)+
'_from" id="'+
((__t=( criterion.id ))==null?'':__t)+
'_from" min="'+
((__t=( criterion.rangeMinValue ))==null?'':__t)+
'" max="'+
((__t=( criterion.rangeMaxValue ))==null?'':__t)+
'" value="';
 value ? print(value.substring(0, value.indexOf(','))) : print(criterion.rangeMinValue) 
__p+='">\r\n\t\t\t\t        <label class="capitalize" for="'+
((__t=( criterion.id ))==null?'':__t)+
'_to">'+
((__t=( label ))==null?'':__t)+
':</label>\r\n\t\t\t\t        <input data-theme="a" type="range" step="';
 criterionType == "integer" ? print("1") : print(".1") 
__p+='" name="'+
((__t=( criterion.id ))==null?'':__t)+
'_to" id="'+
((__t=( criterion.id ))==null?'':__t)+
'_to" min="'+
((__t=( criterion.rangeMinValue ))==null?'':__t)+
'" max="'+
((__t=( criterion.rangeMaxValue ))==null?'':__t)+
'" value="';
 value ? print(value.substring(value.indexOf(',')+1,value.length-1)) : print(criterion.rangeMaxValue) 
__p+='">\r\n\t\t\t\t    </div>\r\n\t\t\t\t</div>\r\n\r\n\t\t\t<!-- The criterion is a float  -->\t\r\n\t\t\t';
 } else if (criterionType == 'float' || criterion.type.toLowerCase() == 'integer') { 
__p+='\t\r\n\t\t\t\r\n\t\t\t\t<div data-role="fieldcontain">\r\n\t\t\t\t\t<label class="capitalize" for="'+
((__t=( criterion.id ))==null?'':__t)+
'">'+
((__t=( label ))==null?'':__t)+
':</label>\r\n\t\t\t\t\t<input type="number" name="'+
((__t=( criterion.id ))==null?'':__t)+
'" id="'+
((__t=( criterion.id ))==null?'':__t)+
'" ';
 if ( value ) print('value='+value); 
__p+=' data-mini="true"/>\r\n\t\t\t\t</div>\r\n\t\t\t';
 } else { 
__p+='\r\n\t\t\t\t<div class="ui-error-message">\r\n\t\t\t\t\t<p><b>ERROR: Invalid Criterion type '+
((__t=( criterion.type ))==null?'':__t)+
' for '+
((__t=( criterion.id ))==null?'':__t)+
' </b></p>\r\n\t\t\t\t </div>\r\n\t\t\t';
 } 
__p+='\r\n\t\r\n\t\t\t\r\n\t\t';
 }); 
__p+='\r\n\t\t</form>\r\n';
 } 
__p+='\r\n';
}
return __p;
};
});

require.register("search/template/areaCriteriaContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<fieldset id="toolsChoice" data-role="controlgroup" data-type="horizontal" data-mini="true">\r\n\t\t\t\t     \r\n\t<input type="radio" name="radio-area-criteria-'+
((__t=( name ))==null?'':__t)+
'" id="radio-bbox" value="bbox" checked="checked">\r\n\t<label for="radio-bbox" id="radio-bbox-label" data-corners="false">Box</label>\r\n\t\r\n\t<input type="radio" name="radio-area-criteria-'+
((__t=( name ))==null?'':__t)+
'" id="radio-polygon" value="polygon">\r\n\t<label for="radio-polygon" id="radio-polygon-label" data-corners="false">Polygon</label>\r\n\t\t\t         \t\r\n\t<input type="radio" name="radio-area-criteria-'+
((__t=( name ))==null?'':__t)+
'" id="radio-gazetteer" value="gazetteer">\r\n\t<label for="radio-gazetteer" id="radio-gazetteer-label" data-corners="false">Gazetteer</label>\r\n\t\r\n\t<input type="radio" name="radio-area-criteria-'+
((__t=( name ))==null?'':__t)+
'" id="radio-import" value="import">\r\n\t<label for="radio-import" id="radio-import-label" data-corners="false">Import</label>\r\n\t    \t\r\n</fieldset>\r\n\r\n<div id="bbox">\r\n\r\n\t<div data-role="fieldcontain">\r\n\t\t<label  for="west">West:</label>\r\n\t\t<input type="text" name="west" id="west" data-mini="true" value="'+
((__t=(searchArea.getBBox().west))==null?'':__t)+
'">\r\n\t</div>\r\n\t\r\n\t\t<div data-role="fieldcontain">\r\n\t\t<label for="south">South:</label>\r\n\t\t<input type="text" name="south" id="south" data-mini="true" value="'+
((__t=(searchArea.getBBox().south))==null?'':__t)+
'">\r\n\t</div>\r\n\t\r\n\t<div data-role="fieldcontain">\r\n\t\t<label for="east">East:</label>\r\n\t\t<input type="text" name="east" id="east" data-mini="true" value="'+
((__t=(searchArea.getBBox().east))==null?'':__t)+
'">\r\n\t</div>\r\n\r\n\t<div data-role="fieldcontain">\r\n\t\t<label for="north">North:</label>\r\n\t\t<input type="text" name="north" id="north" data-mini="true" value="'+
((__t=(searchArea.getBBox().north))==null?'':__t)+
'">\r\n\t</div>\r\n\r\n\t<div id="mapExtent" data-role="fieldcontain">\r\n\t\t<label class="mapExtentCheckBoxLabel">Use map extent\r\n\t\t<input type="checkbox" name="mapExtent" id="mapExtentCheckBox" data-mini="true" ';
 if (attributes.useExtent) print('checked="checked"'); 
__p+=' ></label>\r\n\t</div>\r\n\t<button data-role="button" data-mini="true"  id="drawbbox">Draw</button>\r\n\r\n</div>\r\n\r\n<div id="polygon">\r\n\t<p id="polygonTextError"></p>\r\n\t<label>Enter coordinates:\r\n\t<textarea id="polygontext" rows="10"></textarea>\r\n\t</label>\r\n\t<button data-role="button" data-mini="true"  id="drawpolygon">Draw</button>\r\n</div>\r\n\r\n<div id="gazetteer">\r\n\t<input type="text" data-type="search" name="search" id="search-gazetteer" value="" />\r\n\t<div id="gazetteer-results"></div>\r\n</div>\r\n\r\n<div id="import">\r\n\t<!-- <input type="file" id="importFile"> -->\r\n\t<div id="dropZone">\r\n\t\tDrop a KML, GeoJSON or GML file\r\n\t</div>\r\n\t<p id="importMessage"></p>\r\n</div>\r\n';
}
return __p;
};
});

require.register("search/template/corrInterContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<label for="masterD">Master: </label>\r\n<select id="masterD" data-mini="true">\r\n';
 _.each( model.datasetIds, function(datasetId) { 
__p+='\r\n\t<option value="'+
((__t=( datasetId ))==null?'':__t)+
'">'+
((__t=( datasetId ))==null?'':__t)+
'</option>\r\n';
 }); 
__p+='\r\n</select>\r\n\r\n<label for="spatialCover"><b>Minimum Overlap %: </b></label>\r\n<input type="number" id="spatialCover" data-mini="true" value="'+
((__t=( model.get('spatialCover') ))==null?'':__t)+
'"/>\r\n\r\n<div data-role="fieldcontain">\r\n\t\t<legend><b>Date offset (days):</b></legend>\r\n\t\t<div data-role="fieldcontain">\r\n\t\t\t<label for="timeCover_from">Min:</label>\r\n\t\t\t<input name="timeCover_from" id="timeCover_from" value="'+
((__t=( model.get('timeCover')[0] ))==null?'':__t)+
'" type="number" data-mini="true" data-highlight="true" />\r\n\t\t</div>\r\n\t\t<div data-role="fieldcontain">\r\n\t\t\t<label for="timeCover_to">Max:</label>\r\n\t\t\t<input name="timeCover_to" id="timeCover_to" value="'+
((__t=( model.get('timeCover')[1] ))==null?'':__t)+
'" type="number" data-mini="true" data-highlight="true" />\r\n\t\t</div>\r\n</div>\r\n\r\n\r\n';
 if ( model.get('mode') == "Interferometry" ) { 
__p+='\r\n \t<fieldset data-role="controlgroup">\r\n\t\t<legend><b>Absolute Baseline Difference (m):</b></legend>\r\n\t\t<div data-role="fieldcontain">\r\n\t\t\t<label for="baseline_from">Min:</label>\r\n\t\t\t<input name="baseline_from" id="baseline_from" value="'+
((__t=( model.get('baseline')[0] ))==null?'':__t)+
'" type="number" data-mini="true" data-highlight="true" />\r\n\t\t</div>\r\n\t\t<div data-role="fieldcontain">\r\n\t\t\t<label for="baseline_to">Max:</label>\r\n\t\t\t<input name="baseline_to" id="baseline_to" value="'+
((__t=( model.get('baseline')[1] ))==null?'':__t)+
'" type="number" data-mini="true" data-highlight="true" />\r\n\t\t</div>\r\n\t</fieldset>\r\n\t\r\n\t<div data-role="fieldcontain" class="ui-hide-label">\r\n\t\t<legend><b>Burst Synchronization (%):</b></legend>\r\n\t\t<div style="margin-top: 5px" data-role="rangeslider" data-highlight="true" data-mini="true">\r\n\t\t    <label class="capitalize" for="burstSync_from" class="ui-hidden-accessible">Burst synchronization (%):</label>\r\n\t\t    <input type="range" name="burstSync_from" id="burstSync_from" min="0" max="100" value="'+
((__t=( model.get('burstSync')[0] ))==null?'':__t)+
'">\r\n\t\t    <label class="capitalize" for="burstSync_from">Burst synchronization (%):</label>\r\n\t\t    <input type="range" name="burstSync_to" id="burstSync_to" min="0" max="100" value="'+
((__t=( model.get('burstSync')[1] ))==null?'':__t)+
'">\r\n\t\t</div>\r\n\t</div>\r\n';
 } 
__p+='\r\n';
}
return __p;
};
});

require.register("search/template/datasetSearchContent_template", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="sc-dataset-container" data-role="collapsible" data-content-theme="'+
((__t=( theme ))==null?'':__t)+
'" data-mini="true">\n    <h3>'+
((__t=( name ))==null?'':__t)+
'</h3>\n    <div>\n        <!--<div id="sc-advanced-container" data-role="collapsible" data-inset="false" data-mini="true">-->\n            <div class="optionsLabel">Advanced Criteria</div>\n            <div id="searchCriteria"></div>\n        <!-- </div> -->\n\n        <!-- <div id="sc-do-container" data-role="collapsible" data-inset="false" data-mini="true"> -->\n            <div class="optionsLabel">Download Options</div>\n            <div id="downloadOptions"></div>\n        <!-- </div> -->\n\n        <!-- NGEO-1849: hide open search url -->\n        <!-- <div id="osUrl" data-role="collapsible" data-inset="false" data-mini="true">\n            <h3>OpenSearch URL</h3>\n            <div>\n                <textarea data-role="none" class="ui-input-text ui-body-'+
((__t=( theme ))==null?'':__t)+
' ui-corner-all ui-shadow-inset" id="osUrlText" cols="80" rows="5"></textarea>\n            </div>\n        </div> -->\n    </div>\n\n</div>';
}
return __p;
};
});

require.register("search/template/datasetsListContent_template", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='\r\n<ul id="datasetList" data-filter-theme="a" data-role="listview" data-filter="true" data-inset="true">\t\r\n\r\n\t';
 _.each(datasets, function(dataset) { 
__p+='\r\n\t\t<li  id="'+
((__t=( dataset.tagFriendlyId ))==null?'':__t)+
'" data-datasetid="'+
((__t=( dataset.datasetId ))==null?'':__t)+
'" data-mini="true" >\r\n\t\t\t<span class="ui-icon ui-icon-checkbox-off" />'+
((__t=( dataset.name ))==null?'':__t)+
'\r\n\t\t\t<span class="ui-li-count ui-btn-up-c ui-btn-corner-all">'+
((__t=( dataset.itemsCount ))==null?'':__t)+
'</span>\t\r\n\t\t</li> \r\n\t';
 }); 
__p+='\r\n\t\t\r\n</ul>\r\n\t\r\n';
}
return __p;
};
});

require.register("search/template/datasetsSelectionContent_template", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='\r\n<div id="ds-content">\r\n\r\n\t<div data-role="collapsible" data-inset="false" data-mini="true" data-collapsed="false" data-help="Filter the dataset list using various criterias.">\r\n\t   <h3>Keywords</h3>\r\n\t\t<div id="filters" class="ui-grid-a">\r\n\r\n\t\t\t';
 _.each( get("criterias"), function(criteria, i) { 
__p+='\t\t\r\n\r\n\t\t\t\t';
 if (i%2 == 0) { 
__p+='\r\n\t\t\t\t\t<div class="ui-block-a"> \r\n\t\t\t\t';
 } else if (i%2 == 1) { 
__p+='\t\r\n\t\t\t\t\t<div class="ui-block-b"> \r\n\t\t\t\t';
 } else { 
__p+='\t\r\n\t\t\t\t\t<div class="ui-block-c"> \t\r\n\t\t\t\t';
 } 
__p+='\r\n\r\n\t\t\t\t<select id="criteria_'+
((__t=( i))==null?'':__t)+
'" data-mini="true">\r\n\t\t\t\t</select>\r\n\t\t\t\t\t\r\n\t\t\t\t</div>\r\n\t\t\t';
 }); 
__p+='\r\n\t\t</div>\r\n\t</div>\r\n\r\n\t<div id="datasetListContainer">\r\n\t</div>\r\n\r\n</div>\r\n\r\n<div data-role="popup"  data-theme="e" id="dsPopupDescription">\r\n</div>\r\n\r\n<!-- Range isn\'t valid popup -->\r\n<div id="dateWarningPopup" data-theme="e" data-role="popup">\r\n\t<div data-role="header" class="ui-corner-top ui-content">\r\n\t\t<h1 class="ui-title">Warning</h1>\r\n\t</div>\r\n\t<div data-role="content" class="ui-corner-bottom ui-content">\r\n\t\tSearch date range is not correct\r\n\t</div>\r\n</div>\r\n\r\n\r\n<!-- The footer for buttons -->\r\n<div id="ds-footer">\r\n\t<button data-role=\'button\' data-inline=\'true\' data-mini=\'true\' id="dsSearch" >Search</button>\r\n</div>\r\n';
}
return __p;
};
});

require.register("search/template/dateCriteriaContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='\r\n\t<label>Acquisition Start Date :\r\n\t<input name="From" class="fromDateInput" data-theme="a" type="text" data-role="datebox" data-mini="true"  value="';
 print(model.attributes.start) 
__p+='"\r\n\t\t  data-options=\'{"mode": "calbox", "overrideDateFormat":"%Y-%m-%d", "defaultDate": "';
 print(model.attributes.start) 
__p+='", \r\n\t\t  "themeDate":"a", "themeDatePick":"b", "calHighToday": false, "calUsePickers": true, "calNoHeader": true, "zindex": "2000", "calShowDateList": true, "lockInput": false, "calDateList": '+
((__t=( keyDates ))==null?'':__t)+
', "overrideCalDateListLabel": "Key dates"}\'  /></label> \r\n \r\n<!-- ACCORDING TO GARIN CF ISSUE 368 TIME NOT NEEDED AS A SEARCH CRITERIA -->\r\n<!-- <div data-role="fieldcontain"> -->\r\n\t\t\r\n<!-- \t<label id="fromTimeLabel" for="fromTimeInput" data-mini="true">Start Time:</label> -->\r\n<!-- \t<input name="startTime" id="fromTimeInput" type="text" data-role="datebox" data-mini="true" value="'+
((__t=(model.attributes.startTime ))==null?'':__t)+
'" -->\r\n<!--   \t\t\tdata-options=\'{"mode": "timebox", "overrideTimeFormat": "24", "zindex": "2000"}\'> -->\r\n<!-- </div> -->\r\n\r\n\t<label>Acquisition End Date :\r\n\t<input name="toDate" class="toDateInput" data-theme="a" type="text" data-role="datebox" data-mini="true"  value="';
 print(model.attributes.stop) 
__p+='"\r\n\t   data-options=\'{"mode": "calbox", "overrideDateFormat":"%Y-%m-%d", "defaultDate": "';
 print(model.attributes.stop) 
__p+='", \r\n\t   \t"themeDate":"a", "themeDatePick":"b", "calHighToday": false, "calUsePickers": true, "calNoHeader": true, "zindex": "2000", "calShowDateList": true, "lockInput": false, "calDateList": '+
((__t=( keyDates ))==null?'':__t)+
', "overrideCalDateListLabel": "Key dates"}\'></label>\r\n\r\n\r\n<!-- ACCORDING TO GARIN CF ISSUE 368 TIME NOT NEEDED AS A SEARCH CRITERIA -->\r\n<!-- <div data-role="fieldcontain"> -->\r\n\t\r\n<!-- \t<label id="toTimeLabel" for="toTimeInput" data-mini="true">End Time:</label> -->\r\n<!-- \t<input name="endTime" id="toTimeInput" type="text" data-role="datebox" data-mini="true" value="'+
((__t=(model.attributes.stopTime ))==null?'':__t)+
'" -->\r\n<!--   \t\t\tdata-options=\'{"mode": "timebox", "overrideTimeFormat": "24", "zindex": "2000"}\'> -->\r\n<!-- </div> -->\r\n\r\n';
}
return __p;
};
});

require.register("search/template/downloadOptionsContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<!-- if the selected dataset has no download options display an information message to the user -->\r\n\r\n';
 if ( model.collection.length == 0 ) { 
__p+='\r\n\t<div id="downloadOptionsMessage" class="widget-content ui-body-a ui-error-message">\r\n\t\t<p><b>No download options available.</b></p>\r\n\t</div>\t\r\n';
 } else { 
__p+='\r\n\r\n\t<!--\r\n\t\tDisplay  download options. \r\n\t\tSee (IICD-WC-WS)-(ngEO-14-ICD-ELC-075)-(Internal ICD Web Client - Web Server) issue 2.12 §4.4.3.1.1.2 for more information on the configuration of the downloadOptions\r\n\t-->\r\n\t<form>\r\n\t\t';
 _.each(model.collection, function(option) { 
			var selectedValue = model.attributes[option.argumentName];
			
__p+='\r\n\t\t\t<span value="'+
((__t=( selectedValue ))==null?'':__t)+
'"></span>\r\n\t\t\t';
 if ( model.hasValidPreconditions( option ) ) {
				if (!option.cropProductSearchArea) {
					if (option.type == "checkbox") {
					
__p+='\r\n\t\t\t\t\t\t<fieldset data-role="controlgroup">\r\n\t\t\t\t\t\t<label id="'+
((__t=( option.argumentName ))==null?'':__t)+
'_label" for="'+
((__t=( option.argumentName ))==null?'':__t)+
'">'+
((__t=( option.caption || option.description ))==null?'':__t)+
' : </label>\r\n\t\t\t\t\t\t\t';
 _.each(option.value, function(value) { 
__p+='\r\n\t\t\t\t\t\t\t\t';
 if ( model.hasValidPreconditions(value) ) { 
__p+='\r\n\t\t\t\t\t\t\t\t\t<label>\r\n\t\t\t\t\t\t\t\t\t\t<!-- Select the check box if value is defined -->\r\n\t\t\t\t\t\t\t\t\t\t<input type="checkbox" name="'+
((__t=( option.argumentName ))==null?'':__t)+
'" value="'+
((__t=( value.name ))==null?'':__t)+
'" data-mini="true" ';
 if ( value && value.selected && selectedValue != "@conflict" ) print('checked="checked"'); 
__p+=' />\r\n\t\t\t\t\t\t\t\t\t\t'+
((__t=( value.humanReadable ))==null?'':__t)+
'\r\n\t\t\t\t\t\t\t\t\t</label>\r\n\t\t\t\t\t\t\t\t';
 } 
__p+='\r\n\t\t\t\t\t\t\t';
 }); 
__p+='\r\n\t\t\t\t\t\t</fieldset>\r\n\t\t\t\t\t';
 } else { 
__p+='\r\n\t\t\t\t\t\t<label id="'+
((__t=( option.argumentName ))==null?'':__t)+
'_label" for="'+
((__t=( option.argumentName ))==null?'':__t)+
'">'+
((__t=( option.caption || option.description ))==null?'':__t)+
' : </label>\r\n\t\t\t\t\t\t<select id="'+
((__t=( option.argumentName ))==null?'':__t)+
'" data-mini="true" data-theme="'+
((__t=( theme ))==null?'':__t)+
'">\r\n\t\t\t\t\t\t\t<!-- None is possible depending on option properties : NGEO-1811, NGEO-2165 -->\r\n\r\n\t\t\t\t\t\t\t<!-- NGEO-1916: Add "???" field in case of conflict between the selected products -->\r\n\t\t\t\t\t\t\t';
 if ( selectedValue == "@conflict" ) { 
__p+='\r\n\t\t\t\t\t\t\t\t<option value="@conflict" selected>???</option>\r\n\t\t\t\t\t\t\t';
 } 
__p+='\r\n\t\t\t\t\t\t\t';
 _.each(option.value, function(value) { 
__p+='\r\n\t\t\t\t\t\t\t\t';
 if ( !model.hasValidPreconditions(value) ) { 
__p+='\r\n\t\t\t\t\t\t\t\t\t<option value="" style="display: none;"></option>\r\n\t\t\t\t\t\t\t\t';
 } else { 
__p+='\r\n\t\t\t\t\t\t\t\t\t<option value="'+
((__t=( value.name))==null?'':__t)+
'" ';
 if ( selectedValue == value.name) { print('selected'); } 
__p+=' >'+
((__t=( value.humanReadable ))==null?'':__t)+
'</option>\r\n\t\t\t\t\t\t\t\t';
 } 
__p+='\r\n\t\t\t\t\t\t\t';
 }); 
__p+='\r\n\t\t\t\t\t\t</select>\r\n\t\t\t\t\t';
 } 
__p+='\r\n\t\t\t\t';
 } else { 
__p+='\r\n\t\t\t\t\t<label id="'+
((__t=( option.argumentName ))==null?'':__t)+
'_label">'+
((__t=( option.caption || option.description ))==null?'':__t)+
'\r\n\t\t\t\t\t\t<input name="'+
((__t=( option.argumentName))==null?'':__t)+
'" data-wkt="true" type="checkbox" value="true" ';
 if( selectedValue ) print('checked="checked"'); 
__p+=' data-mini="true" />\r\n\t\t\t\t\t</label>\r\n\t\t\t\t';
 }
			}
		}); 
__p+='\r\n\t</form>\r\n\r\n\t';
 if (updateCallback) { 
__p+='\r\n\t\t<div class="popup-widget-footer">\r\n\t\t\t<button id="downloadOptionsUpdate" data-role="button" data-mini="true" data-inline="true" data-theme="'+
((__t=( theme ))==null?'':__t)+
'">Update</button>\r\n\t\t\t<div id="downloadOptionsMessage"></div>\r\n\t\t</div>\r\n\t';
 } 
__p+='\r\n\r\n';
 } 
__p+='\r\n\r\n';
}
return __p;
};
});

require.register("search/template/schedulingOptions_template", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='\n<label data-mini="true">Subscription Start Date :\n<input name="startDateSTO" id="startDateSTO"\n\ttype="text" data-role="datebox" data-mini="true" data-theme="a"\n\tvalue="'+
((__t=( startDate.toISODateString() ))==null?'':__t)+
'"\n\tdata-options=\'{"mode": "calbox", "overrideDateFormat":"%Y-%m-%d", "defaultDate": "'+
((__t=( startDate.toISODateString() ))==null?'':__t)+
'", \n   "useTodayButton": true, "themeDate":"c", "themeDatePick":"a", "calHighToday": true, "calUsePickers": true, "calNoHeader": true, "zindex": "2000"}\' />\n</label> \n\n<label data-mini="true">Subscription Stop Date :\n<input name="endDateSTO" id="endDateSTO"\n\ttype="text" data-role="datebox" data-mini="true" data-theme="a"\n\tvalue="'+
((__t=( endDate.toISODateString() ))==null?'':__t)+
'"\n\tdata-options=\'{"mode": "calbox", "overrideDateFormat":"%Y-%m-%d", "defaultDate": "'+
((__t=( endDate.toISODateString() ))==null?'':__t)+
'", \n   "useTodayButton": true, "themeDate":"c", "themeDatePick":"a", "calHighToday": true, "calUsePickers": true, "calNoHeader": true, "zindex": "2000"}\' />\n</label> \n\n<!-- NGEO-2214 & NGEO-2221: Hide time driven panel for now.. -->\n<!--\n<div id="type" class="ui-grid-a">\n\n\t<div class="ui-block-a"> \n\t\t';
 if (timeDriven == false) {  
__p+='\n\t\t\t<input id="data-driven-input" type="radio" name="STOType" data-mini="true" checked>\t\t\n\t\t';
 } else { 
__p+='\t \n\t\t\t<input id="data-driven-input" type="radio" name="STOType" data-mini="true">\n\t\t';
 } 
__p+='\t \n\t\t<label for="data-driven-input" id="data-driven-label" data-mini="true" data-corners="false">Data-Driven Subscription</label>         \t\n\t</div>\n\n\t  <div class="ui-block-b"> \n\t\t';
 if (timeDriven == true) {  
__p+='\n\t\t\t<input id="time-driven-input" type="radio" name="STOType" data-mini="true" checked>\t\t\n\t\t';
 } else { 
__p+='\t \n\t\t\t<input id="time-driven-input" type="radio" name="STOType" data-mini="true">\t\n\t\t';
 } 
__p+='\t \n\t\t\n\t\t<label for="time-driven-input" id="time-driven-label" data-mini="true" data-corners="false">Time-Driven Subscription</label>         \t\n\t</div>\n</div>\n\n<div id="timeDrivenParams" class="widget-content">\n\n<div data-role="fieldcontain">\n\t<label id="repeatPeriodLabel" for="repeatPeriod" data-mini="true">Repetition Period (in days) : </label>\n\t<input type="number" name="repeatPeriod" id="repeatPeriodInput" data-mini="true" value="'+
((__t=( repeatPeriod ))==null?'':__t)+
'">\n</div>\n\n<div data-role="fieldcontain">\n\t<label id="applyShiftLabel" for="applyShiftCheckBox" data-mini="true">Shift Acquisition Date criteria at every repetition</label>\n\t';
 if (slideAcquisitionTime == true) {  
__p+='\n\t\t<input type="checkbox" name="applyShiftCheckBox" id="applyShiftCheckBox" data-mini="true" checked>\t\t\n\t';
 } else { 
__p+='\n\t\t<input type="checkbox" name="applyShiftCheckBox" id="applyShiftCheckBox" data-mini="true">\t\n\t';
 } 
__p+='\n\t\n</div>\n\n-->\n\n</div>\n';
}
return __p;
};
});

require.register("search/template/searchCriteriaContent_template", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='\r\n<div id="sc-content">\r\n\t\r\n\t<div id="sc-date-container" data-role="collapsible" data-inset="false" data-mini="true">\r\n\t\t<h3>Acquisition Dates</h3>\r\n\t\t<div id="date">\t</div>\r\n\t</div>\r\n\t\r\n\t<div id="sc-area-container" data-role="collapsible" data-inset="false" data-mini="true">\r\n\t\t<h3>Area Of Interest</h3>\r\n\t\t<div id="area">\t</div>\r\n\t</div>\r\n\t<div id="sc-datasets-container" data-role="collapsible" data-inset="false" data-mini="true">\r\n\t\t<h3>Advanced Filters and Download Options</h3>\r\n\t\t<div class="datasetSearch"></div>\r\n\t</div>\r\n</div>\r\n<!--\r\n<div data-role="collapsible-set" data-inset="false" data-mini="true">\r\n</div>\r\n-->\t\r\n\r\n<!-- The footer for buttons -->\r\n<div id="sc-footer">\r\n\t<div class="widget-footer-right">\r\n\t\t<button data-role=\'button\' data-inline=\'true\' data-mini=\'true\' class="scSubmit" >'+
((__t=( submitText ))==null?'':__t)+
'</button>\r\n\t</div>\r\n\t<button data-role=\'button\' data-inline=\'true\' data-mini=\'true\' id="share">Share</button>\r\n\t<!-- NGEO-1971 : add special button to import criteria from search panel -->\r\n\t';
 if (submitText == "Subscribe") { 
__p+='\r\n\t\t<button title="Import criteria from search panel" data-role=\'button\' data-inline=\'true\' data-mini=\'true\' class="scImport" >Get Criteria</button>\r\n\t';
 } 
__p+='\r\n</div>\r\n\r\n';
}
return __p;
};
});

require.register("searchResults/template/exportViewContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<label for="export-format">Choose format:</label>\r\n<select name="export-format" id="export-format" data-mini="true">\r\n   <option value="">...</option>\r\n   <option value="kml">KML</option>\r\n   <option value="gml">GML</option>\r\n   <option value="geojson">GeoJson</option>\r\n</select>\r\n\r\n\r\n<div class="popup-widget-footer">\r\n\t<a id="download" target="_blank" data-role="button" data-mini="true"\r\n\t\tdata-inline="true" data-theme="a">Download</a>\r\n</div>';
}
return __p;
};
});

require.register("searchResults/template/multipleBrowseContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div id="multipleBrowsePopup" data-transition="flip" data-role=popup data-theme="a" data-overlay-theme="a" class="ui-content"> \n    <a href="#" data-rel="back" data-role="button" data-theme="a" data-icon="delete" data-iconpos="notext" class="ui-btn-right">Close</a> \n   \n    <h4>Select browse to use in list:</h4> \n    <ul style="max-height: 500px; max-width: 500px; overflow: auto; padding-right: 10px;" id="multipleBrowseSelection" data-role="listview" data-inset="true" \n      data-theme="a"> \n\t\t<fieldset data-role="controlgroup"> \n\t\t    ';
 _.each(browses, function(browse, index) { 
		    	var url = browse.BrowseInformation.fileName.ServiceReference["@href"]
		    	
__p+=' \n\t\t\t\t<label title="'+
((__t=( url ))==null?'':__t)+
'"><input type="checkbox" name="shopcart" data-theme="a" data-mini="true" value="'+
((__t=( index ))==null?'':__t)+
'" ';
 if(browse.BrowseInformation._selected) print('checked="checked"') 
__p+=' />  '+
((__t=( MapUtils.getLayerName(url) ))==null?'':__t)+
' </label> \n\t\t\t';
 }); 
__p+=' \n     \n\t\t</fieldset> \n\t</ul>\n\n\t<a class="selectBrowse" data-mini="true" data-role="button" data-icon="select" data-iconpos="right">Select</a> \n</div>';
}
return __p;
};
});

require.register("searchResults/template/searchResultsViewContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<!-- The status bar to give information on the search results -->\r\n<div id="datasetMessage" class="status-message">\r\n\tDataset : None\r\n</div>\r\n<div id="paging" data-role="controlgroup" data-type="horizontal" data-mini="true">\r\n\t<a id="paging_first" data-role="button">First</a>\r\n\t<a id="paging_prev" data-role="button">Previous</a>\r\n\t<a id="paging_next" data-role="button">Next</a>\r\n\t<a id="paging_last" data-role="button">Last</a>\r\n</div>\r\n<div class="status-block">\r\n\t<div id="resultsMessage">No search done.</div>\r\n\t<fieldset id="tableCG" data-role="controlgroup" data-mini="true" data-type="horizontal">\r\n\t   <label><input type="radio" id="tableCB" name="view"/>Table</label>\r\n\t   <!-- NGEO-1849: Hide Gantt panel for the moment -->\r\n\t   <!-- <label><input type="radio" id="ganttCB" name="view"/>Gantt</label> -->\r\n   </fieldset>\r\n</div>\r\n';
}
return __p;
};
});

require.register("shopcart/template/shopcartExportContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<label for="export-format">Choose format:</label>\r\n<select name="export-format" id="shopcart-export-format" data-mini="true">\r\n   <option value="">...</option>\r\n   <option value="kml">KML</option>\r\n   <option value="atom">Atom 1.0</option>\r\n   <option value="html">HTML</option>\r\n   <option value="json">JSON</option>\r\n<select>\r\n\r\n\r\n<div class="popup-widget-footer">\r\n\t<a id="download-exported-shopcart" target="_blank" data-role="button" data-mini="true"\r\n\t\tdata-inline="true" data-theme="a">Download</a>\r\n</div>';
}
return __p;
};
});

require.register("shopcart/template/shopcartViewContent", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div id="shopcartMessage" class="status-message ui-block-a">\n    No shopcart\n</div>\n\n<!-- TODO: add pagination here if needed -->\n\n<div class="status-block">\n    <fieldset id="tableCG" data-role="controlgroup" data-mini="true" data-type="horizontal">\n       <input type="checkbox" name="tableCB" id="tableCB" />\n       <label for="tableCB">Table</label>\n   </fieldset>\n</div>';
}
return __p;
};
});

require.register("ui/template/sharePopup", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div id="sharedUrlPopup" data-role=popup data-theme="a" data-overlay-theme="a" class="ui-content">\r\n\t<a href="#" id="closeSharedUrlPopup" data-rel="back" data-role="button" data-theme="a" data-icon="delete" data-iconpos="notext" class="ui-btn-right">Close</a>\r\n\t\t\r\n\t<div id="sharedUrlLinks">\r\n\t\t<a id="facebook" target="_blank" href="#">Facebook</a>\r\n\t\t<a id="twitter" target="_blank" href="#">Twitter</a>\r\n\t\t<a id="email" target="_blank" href="#">Email</a>\r\n\t\t<a id="raw" target="_blank" href="#">Url</a>\r\n\t</div>\r\n</div>';
}
return __p;
};
});

require.register("ui/template/tableColumnsPopup", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div>\r\n\t<fieldset data-role="controlgroup" data-mini="true" data-theme="a">\r\n\t\t';
 for (var i = 0; i < columnDefs.length; i++) { if (columnDefs[i].numValidCell > 0) {
__p+='\r\n\t\t   <label><input type="checkbox" data-theme="a" data-index="'+
((__t=( i ))==null?'':__t)+
'" '+
((__t=( columnDefs[i].visible ? 'checked': '' ))==null?'':__t)+
' />'+
((__t=( columnDefs[i].sTitle ))==null?'':__t)+
'</label>\r\n\t   ';
 }} 
__p+='\r\n\t</fieldset>\r\n</div>';
}
return __p;
};
});

require.register("pages/account", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div id="account">\r\n<h2 id="account-header">My Account</h2> <a class="ui-link" data-ajax="false" target=\'_blank\' href="account">Access to UMSSO profile management</a>\r\n\t<div id="tabs">\r\n\t\t<ul>\r\n\t\t\t<li><a data-help="'+
((__t=( downloadManagers ))==null?'':__t)+
'" href="#downloadManagersMonitoring">Download Managers</a></li>\r\n\t\t\t<li><a data-help="'+
((__t=( dar ))==null?'':__t)+
'" href="#DARMonitoring">Data Access Requests</a></li>\r\n\t\t\t<li><a data-help="'+
((__t=( shopcart ))==null?'':__t)+
'"href="#shopcarts">Shopcarts</a></li>\r\n\t\t\t<!-- <li><a data-help="'+
((__t=( inquiries ))==null?'':__t)+
'"href="#inquiries">Inquiries</a></li> -->\r\n\t\t\t<li><a data-help="'+
((__t=( userPrefs ))==null?'':__t)+
'"href="#userPrefs">User Preferences</a></li>\r\n\t\t\t<li><a data-help="'+
((__t=( layerManager ))==null?'':__t)+
'"href="#layerManager">Layer Manager</a></li>\r\n\t\t</ul>\r\n\t\t<div id="downloadManagersMonitoring"></div>\r\n\t\t<div id="DARMonitoring"></div>\r\n\t\t<div id="shopcarts"></div>\r\n\t\t<!-- NGEO-1967: Replace inquiries view by "Contact Us" link -->\r\n\t\t<!-- <div id="inquiries"></div> -->\r\n\t\t<div id="userPrefs"></div>\r\n\t\t<div id="layerManager"></div>\r\n\t</div>\r\n</div>';
}
return __p;
};
});

require.register("pages/data-services-area", function(exports, require, module) {
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div id="data-services-area">\r\n\t<!-- A button to show/hide the toolbar -->\r\n\t<!-- <a id="showHideToolbar" data-role="button" data-mini="true" data-inline="true" data-icon="minus" data-iconpos="notext">Show/Hide</a> -->\r\n\r\n\t<!-- The main toolbar in the data-services-area -->\r\n\t<menu id="searchToolbar" type="toolbar" direction="vertical">\r\n\t\t<command id="dataset" class="ui-disabled" label="Datasets" data-help="Select a dataset for searching products.<br>\r\n\t\t\tSee <a target=\'_blank\' href=\'help.html#chapter/dataAccessServices/datasetSelection\'>here</a> for more details."></command>\r\n\t\t<command id="search" class="ui-disabled" label="Filters" data-help="Submit a search for the selected dataset.<br>\r\n\t\t\tSee <a target=\'_blank\' href=\'help.html#chapter/dataAccessServices/searchCriteria\'>here</a> for more details."></command>\r\n\t\t<command id="subscribe"  class="ui-disabled" label="Subscribe" data-help="Submit an order for the selected dataset.<br>"></command>\r\n\t</menu>\r\n\t\r\n\t\r\n\t<menu id="mapToolbar" type="toolbar">\r\n\t\t<command id="home" label="Start View" data-help="Return to map start view"/>\r\n\t\t<command id="zoomOut" label="Zoom Out" data-help="Zoom out on the map"/>\r\n\t\t<command id="zoomIn" label="Zoom In" data-help="Zoom in on the map"/>\r\n\t\t<command id="background" label="Background" data-help="Change the background layer used by the map"/>\r\n\t\t<command id="layers" label="Layers" data-help="Configure layers on the map"/>\r\n\t\t<command id="switch" label="2D/3D" data-help="Switch map mode between 2D and 3D"/>\r\n\t</menu>\r\n\t\r\n\t\r\n\t<!-- bottom panel -->\r\n\t<div id="bottom-panel" class="panel ui-body-'+
((__t=( theme ))==null?'':__t)+
'">\r\n\t\t<!-- The date range slide use for product search -->\r\n\t\t<div style="height: 0px; display: none;" id="dateRangeSlider">\r\n\t\t</div>\r\n\r\n\t\t<menu id="bottomToolbar" type="toolbar">\r\n\t\t\t<command id="table" data-notext="true" label="Show table"/>\r\n\t\t\t<div id="bottomDatasets">\r\n\t\t\t<!--\t<command id="result" label="Results"/> -->\r\n\t\t\t\t<command id="shopcart" data-icon="shopcart" label="Shopcart"/>\r\n\t\t\t</div>\r\n\t\t\t<span id="statusPagination"></span>\r\n\t\t</menu>\r\n\t</div>\r\n\t\r\n\t<!-- left panel -->\r\n\t<div id="left-panel" class="panel ui-body-'+
((__t=( theme ))==null?'':__t)+
'">\r\n\t</div>\r\n</div>';
}
return __p;
};
});


//# sourceMappingURL=main-templates.js.map