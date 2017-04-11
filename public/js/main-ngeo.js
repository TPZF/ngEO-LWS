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
require.register("account/model/dataAccessRequestStatuses", function(exports, require, module) {
/**
 * Data Access Request Statuses model It is a singleton which :
 * 1-retrieves all DARs statuses.
 * 2-orders the DARs statuses by order download manager to insure filtering DARs by DM.
 * Theses functionalities are used for DAR monitoring.
 */

var Configuration = require('configuration');
var DownloadManagers = require('dataAccess/model/downloadManagers');
var validStatusesConfig = Configuration.localConfig.dataAccessRequestStatuses.validStatuses;

var DataAccessRequestStatuses = Backbone.Model.extend({

	defaults: {
		dataAccessRequestStatuses: [],
		collapseDAR: false,
		collapseProducts: false
	},

	initialize: function() {
		// The base url to retrieve the DARs'statuses list or submit DAR status changes
		this.url = Configuration.baseServerUrl + '/dataAccessRequestStatuses';
		this.listenTo(this, "error", this.onError);
	},

	/** Call when the model cannot be fetched from the server */
	onError: function(model, response) {
		if (response.status == 0) {
			location.reload();
		}
	},

	/**
	 * Reorder all the DARs'statuses in an array of objects each object has the following properties:
	 * "downloadManagerName" : download manager name
	 * "dlManagerId" : download manager id
	 * "DARs" : array of assignment data access request statuses to the DM.
	 * each DAR is a json as returned by the server.
	 * {"ID" : ID, "type":type, "status": status, "productStatuses" : product statuses}
	 * for Standing orders the productStatuses has the value undefined.
	 */
	getOrderedStatuses: function() {

		// TODO : the method is only used by the DARMonitoringView. Maybe remove it ?

		var dm2Dars = {};
		var orderedStatuses = [];

		var statuses = this.get("dataAccessRequestStatuses");
		for (var i = 0; i < statuses.length; i++) {
			var status = statuses[i];

			if (!dm2Dars[status.dlManagerId]) {
				var dmDars = {
					downloadManagerName: DownloadManagers.getDownloadManagerName(status.dlManagerId),
					dlManagerId: status.dlManagerId,
					DARs: []
				};
				dm2Dars[status.dlManagerId] = dmDars;
				orderedStatuses.push(dmDars);
			}

			dm2Dars[status.dlManagerId].DARs.push(status);

		}

		return orderedStatuses;

	},

	/**
	 * Get the json object containing all the DARs relative to one download manager 
	 * the result is returned as an array to still be compliant with the getOrderedStatuses
	 * result which is an array
	 */
	getFilterOrderedStatuses: function(dmID) {

		var foundStatus = null;

		_.each(this.getOrderedStatuses(), function(orderedStatus) {

			if (orderedStatus.dlManagerId == dmID) {

				foundStatus = orderedStatus
			}
		});

		var resultArray = [];

		resultArray.push(foundStatus);

		return resultArray;
	},

	/** 
	 * Get a DAR status index in the model array given its id 
	 * used by requestChangeStatus to update the DAR status after a successful DAR
	 * status change request submission
	 */
	getDARStatusIndex: function(id) {

		var index = null;
		_.each(this.get("dataAccessRequestStatuses"), function(dar, i) {
			if (dar.ID == id) {
				index = i;
			}
		});

		return index;
	},

	/** 
	 * Products do have statuses 0, 1, 2 or 3, however DARs can have also statuses 4 and 5
	 * this method returns the friendly readable status string from local configuration if it possible
	 */
	getStatusReadableString: function(status) {

		if (!isNaN(parseInt(status))) {
			// Status is an integer, try to find user-friendly translation
			for (var x in validStatusesConfig) {
				if (validStatusesConfig[x].value == parseInt(status)) {
					return validStatusesConfig[x].status;
				}
			}
		}
		return status;
	},

	/** 
	 * Find the dataAccessRequestStatus json object given the DAR id (simple DAR or STO)
	 */
	getDARStatusById: function(id) {

		var foundStatus = null;

		_.each(this.get("dataAccessRequestStatuses"), function(status) {

			if (status.ID == id) {
				foundStatus = status;
			}
		});

		return foundStatus;
	},

	/**
	 * Submit the change status request to the server
	 */
	requestChangeStatus: function(darID, newStatus) {

		var darStatus = this.getDARStatusById(darID);

		if (darStatus == null) { //should not happen!
			return;
		}

		var request = {
			DataAccessRequestStatus: {
				ID: darID,
				type: darStatus.type,
				status: newStatus,
				dlManagerId: darStatus.dlManagerId
			}
		};
		//console.log ("change Status request");
		//console.log (request);
		var self = this;
		var changeStatusURL = self.url + '/' + darID;
		//console.log ("changeStatusURL : ");
		//console.log (changeStatusURL);

		return $.ajax({
			url: changeStatusURL,
			type: 'POST',
			dataType: 'json',
			contentType: 'application/json',
			data: JSON.stringify(request),
			success: function(data) {

				// If the server sends back a message get it in order to be displayed
				var message = "";
				if (data.dataAccessRequestStatus.message) {
					message = data.dataAccessRequestStatus.message;
				}

				if (data.dataAccessRequestStatus.status == newStatus) {
					var darStatus = self.get("dataAccessRequestStatuses")[self.getDARStatusIndex(darID)];
					darStatus.status = newStatus;
					// Notify that the DAR status has been successfully changed
					self.trigger('update:status', darStatus, message)
				} else {
					self.trigger('error:statusUpdate', changeStatusURL);
				}
			},

			error: function(jqXHR, textStatus, errorThrown) {
				if (jqXHR.status == 0) {
					location.reload();
				} else {
					console.log("ERROR while updating status :" + textStatus + ' ' + errorThrown);
					// Notify that the download manager status change has Failed
					self.trigger('error:statusUpdate', changeStatusURL);
				}
			}
		});
	},

	/**
	 *	Reassign the given dars to a new download manager
	 */
	reassignDownloadManager : function( selectedDars, dmId ) {

		var groupedDars = _.groupBy(selectedDars, "status")
		for ( var status in groupedDars ) {
			if ( status != validStatusesConfig.completedStatus.value ) {
				var darIdList = _.map( groupedDars[status], function(a) {
					return a.ID
				});

				// Create request
				var request = {
					"DarIdList": darIdList,
					"DataAccessRequestStatus": {
						"status": String(status),
						"dlManagerId": dmId
					}
				};

				var self = this;
				$.ajax({
					url: this.url,
					type: "POST",
					dataType: 'json',
					contentType: 'application/json',
					data: JSON.stringify(request),
					success: function(response) {
						// Update each dar
						for ( var i=0; i<response.length; i++ ) {
							var updatedDar = response[i];
							var darStatus = self.get("dataAccessRequestStatuses")[self.getDARStatusIndex(updatedDar.ID)]
							darStatus.status = parseInt(updatedDar.status); // TODO: clairify the type of status (string or int) ?
							darStatus.dlManagerId = updatedDar.dlManagerId;
							self.trigger("update:status", darStatus, updatedDar.message);
						}
					},
					error: function(jqXHR, textStatus, errorThrown) {
						if (jqXHR.status == 0) {
							location.reload();
						} else {
							console.log("ERROR while updating status :" + textStatus + ' ' + errorThrown);
							self.trigger("error:statusUpdate", request);
						}
					}
				});
			}
		}
	}

});

module.exports = new DataAccessRequestStatuses();
});

require.register("account/view/createShopcartView", function(exports, require, module) {
var Logger = require('logger');
var nameShopcart_template = require('account/template/nameShopcartTemplate');
var ngeoWidget = require('ui/widget');
var Configuration = require('configuration');

var CreateShopcartView = Backbone.View.extend({

	events: {

		//called when the submit button is clicked
		'click #submitShopcart': function(event) {
			event.preventDefault();

			var name = this.$el.find('#shopcartNameField').val();
			if (name && name != "") {
				var self = this;
				this.submit(name, {
					success: function(model) {
						if (self.options.success) {
							self.options.success(model);
						}
						self.$el.ngeowidget('hide');
					},
					error: function() {
						self.$el.find('#serverMessage').html('<p>' + self.errorMessage() + '</p>');
						//$('#submitShopcart').button('disable');
					}
				});
			} else {
				this.$el.find('#serverMessage').append('<p>Error : name cannot be empty</p>');
			}
		}
	},

	/**
	 * submit the create shopcart request
	 */
	submit: function(name, options) {
		this.model.create({
			name: name
		}, options);
	},

	/** 
	 * Return an error message
	 */
	errorMessage: function() {
		return "Error : cannot create the shopcart on the server.";
	},

	/** 
	 * Render the view
	 */
	render: function() {

		this.$el.append(nameShopcart_template());
		this.$el.appendTo('.ui-page-active');
		this.$el.ngeowidget({
			title: this.options.title,
			hide: $.proxy(this.remove, this),
			theme: Configuration.localConfig.theme
		});

		this.$el.trigger('create');

		//Open the popup
		this.$el.ngeowidget("show");

		return this;
	}
});

module.exports = CreateShopcartView;
});

require.register("account/view/dataAccessRequestMonitoringView", function(exports, require, module) {
var Configuration = require('configuration');
var accountDARs_template = require('account/template/accountDARsContent');
var DAR_monitoring_template = require('account/template/dataAccessRequestMonitoringContent');
var darFilter_template = require('account/template/darMonitoringFilterContent');

var DownloadManagers = require('dataAccess/model/downloadManagers');
var reassingDownloadPopup_template = require('account/template/reassignDownloadPopupContent');

var validStatusesConfig = Configuration.localConfig.dataAccessRequestStatuses.validStatuses;

// Animation timeout callbacks
var timeouts = {};

var DataAccessRequestMonitoringView = Backbone.View.extend({

	initialize: function() {
		this.model.on("update:status", this.updateStatus, this);
		this.model.on("error:statusUpdate", function(request) {
			// TODO !
		});

		this.model.on("sync", this.render, this);
		this.model.on("error", this.error, this);
	},

	events: {

		// Pause/Unpause the given DAR handler
		'click .pauseResumeButton' : function(event) {
			var dar = $(event.currentTarget).closest('.darStatus').data("DAR");
			
			// Toggle status : processing/paused
			if (dar.status == validStatusesConfig.inProgressStatus.value) {
				this.model.requestChangeStatus(dar.ID, validStatusesConfig.pausedStatus.value);
			} else if (dar.status == validStatusesConfig.pausedStatus.value) {
				this.model.requestChangeStatus(dar.ID, validStatusesConfig.inProgressStatus.value);
			} else {
				//not supported case : should not happen !
				console.warn("Not supported status : " + status);
			}
		},

		// Stop the given DAR event handler
		'click .stopDownloadButton' : function(event) {
			var darId = $(event.currentTarget).closest('.darStatus').data("DAR").ID;
			
			// Stop the given dar
			this.model.requestChangeStatus(darId, validStatusesConfig.cancelledStatus.value);
		},

		// Reassign button
		'click #reassignDM' : function(event){
			var $button = $(event.currentTarget);

			// if ( $button.text() == "OK" ) {

				// Reassign dars
				var self = this;
				var selectedDars = [];
				this.$el.find('.ui-icon-checkbox-on').each(function(input) {
					var dar = $(this).next('.darStatus').data("DAR");
					selectedDars.push( dar );
				});

				if ( selectedDars.length ) {

					// Open download manager list
					var $openedPopup =
						$(reassingDownloadPopup_template( DownloadManagers.attributes ))
							.appendTo('.ui-page-active')
							.ngeowidget({
								title: "Select new download manager",
								hide: function() {
									$openedPopup.ngeowidget("destroy").remove();
								}
							}).ngeowidget("show");
					
					// Define callbacks for the given buttons
					$openedPopup
						.find('.submit').click(function(){
							// Send request
							self.model.reassignDownloadManager( selectedDars, $openedPopup.find("select").val() );
							$openedPopup.ngeowidget("hide");
						});
				}

				// this.$el.find('.checkDar').css({
				// 	// visibility: "hidden",
				// 	width: "0px"
				// 	//opacity: 0
				// });
				// $button.html("Re-assign download managers").button("refresh");
			// } else {
				// Show checkboxes to allow user to select dars which must be re-assigned
				// this.$el.find('.checkDar').removeClass('ui-icon-checkbox-on').addClass('ui-icon-checkbox-off').css({
				// 	// visibility: "visible",
				// 	width: "18px"
				// 	//opacity: 1
				// });
				// $button.html("OK").button("refresh");
			// }
		},

		// Pause all checked DAR statuses
		'click #pauseAll' : function(){
			var self = this;
			this.$el.find('.ui-icon-checkbox-on').each(function(input) {
				var dar = $(this).next('.darStatus').data("DAR");
				if ( dar.status == validStatusesConfig.inProgressStatus.value ) {
					self.model.requestChangeStatus(dar.ID, validStatusesConfig.pausedStatus.value);
				}
			});
		},

		// Resume all DAR checked statuses
		'click #resumeAll' : function(){
			var self = this;
			this.$el.find('.ui-icon-checkbox-on').each(function(input) {
				var dar = $(this).next('.darStatus').data("DAR");
				if ( dar.status == validStatusesConfig.pausedStatus.value ) {
					self.model.requestChangeStatus(dar.ID, validStatusesConfig.inProgressStatus.value);
				}
			});
		},

		// Stop all DAR checked statuses
		'click #stopAll' : function(){
			var self = this;
			this.$el.find('.ui-icon-checkbox-on').each(function(input) {
				var dar = $(this).next('.darStatus').data("DAR");
				if ( dar.status != validStatusesConfig.cancelledStatus.value ) {
					self.model.requestChangeStatus(dar.ID, validStatusesConfig.cancelledStatus.value);
				}
			});
		},

		// Update checked dar needed to reassign
		'click .checkDar' : function(event) {
			var $button = $(event.currentTarget);
			if ( $button.hasClass('ui-icon-checkbox-off') ) {
				$button.removeClass('ui-icon-checkbox-off').addClass('ui-icon-checkbox-on');
			} else {
				$button.removeClass('ui-icon-checkbox-on').addClass('ui-icon-checkbox-off');
			}
			this.updateFooterButtonsState();
		},

		// Filter statuses by download manager
		'click li': function(event) {
			//console.log($('#'+ event.currentTarget.id));
			var target = $('#' + event.currentTarget.id);
			var filtredStatuses;

			if (target.hasClass('ui-btn-active')) {
				target.removeClass('ui-btn-active');
				this.selectedDownloadManagertId = undefined;
				// No Download manager is selected so get the whole list of DARs
				this.orderedStatuses.orderedStatusesToDisplay = this.model.getOrderedStatuses();
				this.render();

			} else {

				this.$el.find('.ui-btn-active').removeClass('ui-btn-active');
				target.addClass('ui-btn-active');
				this.selectedDownloadManagertId = event.currentTarget.id;
				//set up the list of DARs according to the selected Download manager
				this.orderedStatuses.orderedStatusesToDisplay = this.model.getFilterOrderedStatuses(this.selectedDownloadManagertId);
				//the update view method is used rather than render method in order to keep the status of the download manager
				//selected in the list and just update the list and not all the view.
				this.updateView();
			}
		}
	},

	/**
	 *	Update footer buttons enabled/disabled layout according to dar statuses
	 */
	updateFooterButtonsState: function() {
		// Update global disabled/enabled state
		if ( this.$el.find('.ui-icon-checkbox-on').length == 0 ) {
			this.$el.find("#darFooterButtons").addClass("ui-disabled");
		} else {
			this.$el.find("#darFooterButtons").removeClass("ui-disabled");
		}

		// Update each button state depending on checked dars
		var checkedDars = this.$el.find('.ui-icon-checkbox-on').next('.darStatus');
		var enableStop = _.find(checkedDars, function(dar) {
			return $(dar).data("DAR").status == validStatusesConfig.inProgressStatus.value || $(dar).data("DAR").status == validStatusesConfig.pausedStatus.value;
		});
		var enablePause = _.find(checkedDars, function(dar) {
			return $(dar).data("DAR").status == validStatusesConfig.inProgressStatus.value;
		});
		var enableResume = _.find(checkedDars, function(dar) {
			return $(dar).data("DAR").status == validStatusesConfig.pausedStatus.value;
		});
		var enableReassign = _.find(checkedDars, function(dar) {
			return $(dar).data("DAR").status != validStatusesConfig.completedStatus.value;
		});
		this.$el.find('#stopAll').button(enableStop ? 'enable' : 'disable').button('refresh');
		this.$el.find('#resumeAll').button(enableResume ? 'enable' : 'disable').button('refresh');
		this.$el.find('#pauseAll').button(enablePause ? 'enable' : 'disable').button('refresh');
		this.$el.find('#reassignDM').button(enableReassign ? 'enable' : 'disable').button('refresh');
	},

	/**
	 * Call back method called after a DAR status change response received from the server.  
	 * The method changes the DAR icon and the status of the buttons according to the new changed status of the DAR
	 */
	updateStatus: function(darStatus, message) {
		var darDiv = $("#darsDiv div[id='" + darStatus.ID + "']");

		// Update download manager id
		darDiv.find("tbody tr:eq(0) td:eq(2)").html(darStatus.dlManagerId);

		var messageEltId = "#serverDARMonitoringResponse_" + darStatus.ID;
		this.showMessage("Status changed to " + this.model.getStatusReadableString(darStatus.status) + " : " + message, messageEltId);

		var collapsibleHeader = darDiv.find(".ui-btn-inner:eq(0)");
		var pauseButton = darDiv.find("button[id='pause_" + darStatus.ID + "']");
		var stopButton = darDiv.find("button[id='stop_" + darStatus.ID + "']");

		// Update status and icon
		switch (darStatus.status) {

			case validStatusesConfig.inProgressStatus.value:
				// Cancelled or Paused -> InProgress
				collapsibleHeader.find(".statusIcon").removeClass("ui-icon-cancelled ui-icon-paused").addClass("ui-icon-processing");
				pauseButton.html("Pause").button('enable').button("refresh");
				stopButton.button('enable');
				darDiv.find("tbody tr:eq(0) td:eq(1)").html(validStatusesConfig.inProgressStatus.status);
				break;

			case validStatusesConfig.pausedStatus.value:
				// Cancelled or InProgress -> Paused
				collapsibleHeader.find(".statusIcon").removeClass("ui-icon-cancelled ui-icon-processing").addClass("ui-icon-paused");
				pauseButton.html("Resume").button('enable').button("refresh");
				stopButton.button('enable');
				darDiv.find("tbody tr:eq(0) td:eq(1)").html(validStatusesConfig.pausedStatus.status);
				break;

			case validStatusesConfig.cancelledStatus.value:
				// InProgress or Paused -> Cancelled
				collapsibleHeader.find(".statusIcon").removeClass("ui-icon-processing ui-icon-paused").addClass("ui-icon-cancelled");
				pauseButton.button('disable');
				stopButton.button('disable');
				darDiv.find("tbody tr:eq(0) td:eq(1)").html(validStatusesConfig.cancelledStatus.status);
				break;
			default: // Unknown status
				collapsibleHeader.find(".statusIcon").removeClass('ui-icon-processing ui-icon-paused ui-icon-cancelled').addClass('ui-icon-unknown');
				pauseButton.button('disable');
				stopButton.button('disable');
				darDiv.find("tbody tr:eq(0) td:eq(1)").html("unknown");
				break;
		}
		this.$el.find("#dmsDiv").html(darFilter_template(this.model)).trigger("create");
		this.updateFooterButtonsState();
	},

	/** 
	 * Display a notification message inside the given elementId
	 */
	showMessage: function(message, elementId) {
		if (timeouts[elementId]) {
			clearTimeout(timeouts[elementId]);
		}
		$(elementId)
			.empty()
			.append(message)
			.slideDown();

		// Hide status message after a given time
		timeouts[elementId] = setTimeout(function() {
			$(elementId).slideUp();
		}, Configuration.data.dataAccessRequestStatuses.messagefadeOutTime);
	},

	/** 
	 * Update the list of selected data access statuses when a download manager has been selected.
	 */
	updateView: function() {
		//this.$el.find("#dmsDiv").html(darFilter_template(this.model));
		var darsContent = DAR_monitoring_template(this.orderedStatuses);
		this.$el.find("#darsDiv").html(darsContent);
		this.$el.trigger('create');
		this.setUpStatusIcons();
	},

	/**
	 *	Error callback
	 */
	error: function(model, xhr) {
		if (xhr.status == 404) {
			// This is normal, the user has no download managers so just render it.
			this.render();
		} else {
			this.$el.empty();
			this.$el.append("<div class='ui-error-message'><p><b> Failure: Error when loading the data access requests.</p></b>" +
				"<p><b> Please check the interface with the server.</p></b></div>");
		}
	},

	/**
	 * Refresh the view size
	 * Update dar list to have a good max height
	 */
	refreshSize: function() {
		var parentOffset = this.$el.offset();
		var $content = this.$el.find('#darsDiv');

		var height = $(window).height() - (parentOffset.top + this.$el.outerHeight()) + $content.height();

		$content.css('max-height', height);
	},

	/** 
	 * Display the list of DMs assigned to Data Access Requests in the left side and the list of 
	 * Data access request in the right side.
	 * By default all the DARS are displayed.
	 */
	render: function() {

		//orderedStatuses is the model for the monitoring view, it wrappes the DataAccessRequestStatuses model
		//and the orderedStatusesToDisplay which the array of the DARs to be displayed.
		//It is useful to update the orderedStatusesToDisplay according the DM selected.
		this.orderedStatuses = {
			orderedStatusesToDisplay: this.model.getOrderedStatuses(),
			model: this.model
		};

		var mainContent = accountDARs_template(this.model);
		this.$el.html(mainContent);

		this.$el.find("#dmsDiv").html(darFilter_template(this.model));

		var darsContent = DAR_monitoring_template(this.orderedStatuses);
		// var darsWidth = $('#darsDiv').width();
		// var slidingContent = '<div style="transition: all 0.2s; width: '+ (darsWidth*2) +'px; white-space: nowrap;" id="slidingContent">\
		// 	<div id="statuses" style="float: left; width: '+ darsWidth +'px;" class="slidingStep">'+ darsContent +'</div>\
		// 	<div id="dmSelection" style="float: left; width: '+ darsWidth +'px;" class="slidingStep">' + reassingDownloadPopup_template( DownloadManagers.attributes ) +'</div>\
		// </div>';
		this.$el.find("#darsDiv").html(darsContent);
		this.$el.trigger('create');
		this.setUpStatusIcons();
		this.refreshSize();
		return this;
	},

	/**
	 * Assign the correct status icon and update the buttons status for each data access request 
	 * depending on the DAR status.
	 */
	setUpStatusIcons: function() {

		var self = this;

		_.each(this.orderedStatuses.orderedStatusesToDisplay, function(orderedStatus) {
			_.each(orderedStatus.DARs, function(darStatus, i) {

				// Select the DAR element
				var selector = "div[id='" + darStatus.ID + "']";
				//					console.log("selector");
				//					console.log(selector);	
				var darDiv = $("#darsDiv").find(selector).data("DAR", darStatus);
				var collapsibleHeader = darDiv.find(".ui-btn-inner:eq(0)");
				var pauseButton = darDiv.find("button[id='pause_" + darStatus.ID + "']");
				var stopButton = darDiv.find("button[id='stop_" + darStatus.ID + "']");
				//					console.log(collapsibleHeader);
				//					console.log($(collapsibleHeader).find(".ui-btn-inner"));

				switch (darStatus.status) {

					// Processing
					case validStatusesConfig.inProgressStatus.value:
						collapsibleHeader.append('<span class="statusIcon ui-icon-processing ui-icon .ui-shadow">&nbsp;</span>');
						break;

						// Paused 
					case validStatusesConfig.pausedStatus.value:
						collapsibleHeader.append('<span class="statusIcon ui-icon-paused ui-icon .ui-shadow">&nbsp;</span>');
						pauseButton.html("Resume").button("refresh");
						break;

						// Completed
					case validStatusesConfig.completedStatus.value:
						collapsibleHeader.append('<span class="statusIcon ui-icon-completed ui-icon .ui-shadow">&nbsp;</span>');
						pauseButton.button('disable');
						stopButton.button('disable');
						break;

						// Cancelled
					case validStatusesConfig.cancelledStatus.value:
						collapsibleHeader.append('<span class="statusIcon ui-icon-cancelled ui-icon .ui-shadow">&nbsp;</span>');
						pauseButton.button('disable');
						stopButton.button('disable');
						break;

						// Unknown Status
					default:
						collapsibleHeader.append('<span class="ui-icon-unknown ui-icon .ui-shadow">&nbsp;</span>');
						pauseButton.button('disable');
						stopButton.button('disable');
						break;
				}

			});
		});

	}

});

module.exports = DataAccessRequestMonitoringView;
});

require.register("account/view/downloadManagersMonitoringView", function(exports, require, module) {
var Configuration = require('configuration');
var DownloadManagers = require('dataAccess/model/downloadManagers');
var downloadManagersMonitoring_template = require('account/template/downloadManagersMonitoringContent');
var downloadManagerInstall_template = require('dataAccess/template/downloadManagerInstallContent');
var downloadManagersList_template = require('account/template/downloadManagersTableContent');
var ngeoWidget = require('ui/widget');

var DownloadManagersMonitoringView = Backbone.View.extend({

	initialize: function() {
		this.model.on("sync", this.buildDownloadManagersTable, this);
		this.model.on("status:change", this.buildDownloadManagersTable, this);
		this.model.on("error", this.error, this);
	},

	events: {

		// Call when user clicks on a a button
		'click #stop_dm': function(event) {
			this.$stopDialog.ngeowidget("show").find("#stopImmediately").prop("checked", "checked").checkboxradio("refresh");
		},

		'click tbody tr': function(event) {
			// Allow a unique row selection
			$("tr").removeClass('dm_selected');
			$(event.currentTarget).toggleClass('dm_selected');
			// Each row id follows this expression: row_id where id is the related download manager id
			var dmID = $(event.currentTarget).attr('data-dmId');
			var status = this.model.getDownloadManagerStatus(dmID);

			if (status == "ACTIVE" || status == "INACTIVE") {
				$("#stop_dm").button('enable');
			} else {
				$("#stop_dm").button('disable');
			}
		}
	},

	/**
	 * Call when an error occurs on the server
	 */
	error: function(model, xhr) {
		if (xhr.status == 404) {
			// This is normal, the user has no download managers so just render it.
			this.render();
		} else {
			this.$el.empty();
			this.$el.append("<div class='ui-error-message'><p><b> Failure: Error when loading the download managers.</p></b>" +
				"<p><b> Please check the interface with the server.</p></b></div>");
		}
	},

	/**
	 * Refresh the view size
	 * Update download manager list to have a good max height
	 */
	refreshSize: function() {
		var parentOffset = this.$el.offset();
		var $content = this.$el.find('#downloadManagersMonitoringContent');

		var height = $(window).height() - (parentOffset.top + this.$el.outerHeight()) + $content.height() - 50;

		$content.css('max-height', height);
	},

	listTemplate: downloadManagersList_template,

	buildDownloadManagersTable: function() {
		if (this.model.get('downloadmanagers').length > 0) {
			this.$el.find('#downloadManagersMonitoringContent').html(this.listTemplate(this.model.attributes));
		} else {
			this.$el.find('#downloadManagersMonitoringContent').html("<p class='ui-error-message'><b>No download managers have been registered.</b></p>");
		}
		this.$el.trigger('create');
	},

	/**
	 * Call to build the view when the download managers are synced
	 */
	render: function() {

		this.$el.empty();

		// Add HTML to install a download manager
		var installContent = downloadManagerInstall_template({
			downloadManagerInstallationLink: Configuration.data.downloadManager.downloadManagerInstallationLink,
			downloadmanagers: this.model.get('downloadmanagers')
		});
		this.$el.append(installContent)
				.append(downloadManagersMonitoring_template());

		this.buildDownloadManagersTable();

		$("#stop_dm").button('disable');
		this.$stopDialog = this.$el.find('#stopDMDialog')
			.appendTo('.ui-page-active')
			.ngeowidget({
				title: "Stop Immediately?",
				closable: false
			});
		this.$stopDialog.ngeowidget('hide');

		var self = this;
		this.$stopDialog.find('button.confirm').click(function(event) {
			var dmID = $('tr.dm_selected').attr('data-dmId');
			if ( self.$stopDialog.find("#stopImmediately").is(":checked") ) {
				command = "STOP";
			} else {
				command = "STOP_IMMEDIATELY";
			}

			self.$stopDialog.ngeowidget('hide');
			self.model.requestChangeStatus(dmID, command);
			$("#stop_dm").button('disable');
		});
		
		this.$stopDialog.find('button.cancel').click(function(event) {
			self.$stopDialog.ngeowidget('hide');
		});

		this.refreshSize();

		return this;
	},
});

module.exports = DownloadManagersMonitoringView;
});

require.register("account/view/duplicateShopcartView", function(exports, require, module) {
var CreateShopcartView = require('account/view/createShopcartView');

/** The duplicate view is very similar to the createShopcart view 
 * except for the submit action request
 */
var DuplicateShopcartView = CreateShopcartView.extend({

	/** submit to the server */
	submit: function(name, options) {

		var features = this.model.getCurrent().featureCollection.features;

		var wrapSuccess = function(model) {
			model.addItems(features);
			if (options.success) options.success();
		};


		var attributes = {
			"name": name,
			"userId": "",
			"isDefault": false
		};

		this.model.create(attributes, {
			wait: true,
			success: wrapSuccess,
			error: options.error
		});

	}

});

module.exports = DuplicateShopcartView;
});

require.register("account/view/importShopcartView", function(exports, require, module) {
var Logger = require('logger');

var importShopcartView = Backbone.View.extend({

	events: {
		//TO BE IMPLEMENTED once the format is defined
	},

	// Render the view
	render: function() {

		this.$el.append('<div id="shopcartImportDiv"><div id="shopcartDropZone">\b Drop a Shopcart File Here (KML, GeoJSON or GML) \b</div><p id="shopcartImportMessage"></p></div>');
		this.$el.trigger('create');

		return this;
	}
});

module.exports = importShopcartView;
});

require.register("account/view/inquiriesView", function(exports, require, module) {
var Logger = require('logger');
var inquiries_template = require('account/template/inquiriesContent');
var Configuration = require('configuration');

/** the mode is the Inquiry object */
var InquiriesView = Backbone.View.extend({

	events: {
		//the button clicked to submit the inquiry 
		'click #submitInquiry': function(event) {
			event.preventDefault();

			if (this.validateInquiryForm())
				this.submit();
		},

		'change #inquiryType': function(event) {
			//at initialisation, the inquiry type choosen is '-1' and the '-1' option is unselectable.
			//the submit button is disabled at initialisation
			//so whenever we select an inquiryType, we forcely chose other than '-1' inquiryType
			//so enable the button submit
			event.preventDefault();
			$('#submitInquiryButtonContainer').removeClass("ui-disabled");
		}

	},

	/**
	 * Check if the texarea containing message is not empty and the chosen inquiryType is valid.
	 * If valid then enable button submit, otherwise disable it
	 * @return 
	 *	true if it is valid
	 *	false otherwise
	 */
	validateInquiryForm: function() {
		var message = this.$el.find('#inquiryMessage').val().trim();
		var iType = this.$el.find('select').val();
		var isValid = true;

		if (message == null || message == '') {
			Logger.inform("Please enter your inquiry message");
			isValid = false;
		} else if (iType == null || iType == '-1') {
			//normally, we will never enter here, because, this function is called whenever
			//the submit button is clicked.
			//And the submit button is enabled only if the 'inquiry type' is valid
			Logger.inform("Please choose an inquiry type");
			isValid = false;
		}

		return isValid;
	},

	// Submit an inquiry to the web server
	submit: function() {

		// Build the JSON to send to the server
		var body = {
			UserInquiry: {
				inquiryType: this.$el.find('select').val(),
				inquiryText: this.$el.find('#inquiryMessage').val().trim()
			}
		};

		var self = this;
		$.ajax({
			url: "/ngeo/userInquiry",
			data: JSON.stringify(body),
			type: 'POST',
			contentType: 'application/json',
			success: function() {
				Logger.inform('Inquiry successfully send to the server.');
				self.$el.find('select').val('-1');
				self.$el.find('select').selectmenu('refresh', true);
				self.$el.find('#inquiryMessage').val('');
				//as the select inquiry is reinitialized and the 'select' value is "-1", then disable button 'submit'
				//so user cannot send 'a not valid' inquiryType
				self.$el.find('#submitInquiryButtonContainer').addClass("ui-disabled");
			},
			error: function(jqXHR, textStatus, errorThrown) {
				Logger.error('Submit an inquiry failed  :  ' + errorThrown + ' (' + textStatus + ')');
			}
		});
	},

	// Render the view
	render: function() {

		this.$el.append(inquiries_template({
			theme: Configuration.localConfig.theme
		}));
		this.$el.find('#submitInquiryButtonContainer').addClass("ui-disabled");
		this.$el.trigger('create');
		return this;
	}
});

module.exports = InquiriesView;
});

require.register("account/view/layerManagerView", function(exports, require, module) {
var Logger = require('logger');
var Configuration = require('configuration');
var Map = require('map/map');
var MapUtils = require('map/utils');
var UserPrefs = require('userPrefs');
//require('highchecktree');
var layerManager_template = require('account/template/layerManagerContent');
var layerSearchPopup_template = require('account/template/layerSearchPopupContent');

/**
 *	Private module variables
 */
var $openedPopup;

/**
 *	OVER UGLY METHOD to make delete action on the object for the given key=value
 */
var nestedOp = function(theObject, key, value, action) {
	var result = null;
	if (theObject instanceof Array) {
		for (var i = 0; i < theObject.length && result == null; i++) {
			result = nestedOp(theObject[i], key, value, action);
		}

		// Remove the object from the array
		if (result && action == "delete") {
			theObject.splice(i - 1, 1);
			result = false;
		}
	} else {
		for (var prop in theObject) {

			if (result != null)
				break;

			if (prop == key && theObject[prop] == value) {
				if (action == "delete") {
					console.log("Deleting " + prop + ': ' + theObject[prop]);
					theObject = undefined;
					return true;
				}

				if (action == "get") {
					console.log(prop + ': ' + theObject[prop]);
					return theObject;
				}
			}

			if (theObject[prop] instanceof Object || theObject[prop] instanceof Array) {
				result = nestedOp(theObject[prop], key, value, action);
			}
		}
	}
	return result;
}

// var findObjectById = function(root, prop, value, action) {
//     if (root.nestedLayers) {
//     	for ( var i=root.nestedLayers.length-1; i>=0; i-- ) {
//     		var nLayer = root.nestedLayers[i];
//     		for ( var key in nLayer ) {
//     			if ( key == prop && nLayer[key] == value ) {
//     				if ( action == "fetch" ) {
//     					console.log("Fetching : ");
//     					return nLayer;
//     				} else {
//     					console.log("Deleting : " + key);
//     					delete nLayer;
//     					break;
//     				}
//     			} else if ( key == "nestedLayers" ) {
//     				return findObjectById( nLayer.nestedLayers, prop, value, action );
//     			}
//     		}
//     	}
//         // for (var k in root.nestedLayers) {
//         //     if (root.nestedLayers[k][prop] == value) {
//         //         if(action=="fetch") {
//         //           return root.nestedLayers[k]; 
//         //         }
//         //         else 
//         //         {
//         //         	console.log("Deleting " + k);
//         //            delete root.nestedLayers[k];
//         //         }
//         //     }
//         //     else if (root.nestedLayers[k].nestedLayers.length) {
//         //         return findObjectById(root.nestedLayers[k], prop, value, action);
//         //     }
//         // }
//     }
// }

/**
 * Callback called when a layer is checked
 */
var layerCheckedCallback = function() {
	var $this = $(this);
	$this.data('layer').setVisible($this.prop('checked'));
};

/**
 *	Build highchecktree item for the given layer
 *	@param layer
 *		Could come from 3 cases:
 *			<ul>
 *				<li>WMS layer coming from configuration</li>
 *				<li>Added by user within mapserver url(coming from "wmsCapabilitiesFormat.read")</li>
 *				<li>Added by user within full wms/wmts request(coming from "MapUtils.createWmsLayerFromUrl")</li>
 *			</ul>
 *	@return
 *		Item object for highCheckTree plugin
 */
var buildItem = function(layer) {
	var params;
	var isConfigurationLayer = layer.engineLayer;
	if (isConfigurationLayer) {
		// Already created layer by conf
		params = layer.params;
	} else if (layer.baseUrl || layer.type == "KML") {
		// WMS/KML url added by user
		params = layer;
	} else if (layer.name) {
		// Layers coming from get capabilities of WMS mapserver
		// Only layers with name attribute are accepted, otherwise it's just a group of layers
		params = {
			type: "WMS",
			name: layer.title,
			baseUrl: layer.baseUrl,
			visible: false,
			params: {
				layers: layer.name
			}
		}
	} else if (layer.tileMatrixSets && layer.identifier) {
		// Layers coming from get capabilities of WMTS mapserver

		// Get current map's projection
		var mapProjectionNumbers = [Configuration.get("map.projection").replace("EPSG:","")];

		// Add "G00gle" projection in case of Mercator
		if ( Configuration.get("map.projection") == "EPSG:3857" )
			mapProjectionNumbers.push("900913");

		// Extract the given matrix of current layer
		// Check out if mapserver(!) tileMatrixSets contains current map projection
		// NB: could have 4326 AND 3857, allows to extract matrixSet identifier
		var matrixSet = _.find(layer.tileMatrixSets, function(set) { return _.find(mapProjectionNumbers, function(projNum) { return set.supportedCRS.indexOf(projNum) >= 0 } ); });
		
		if ( matrixSet ) {
			// Check out if current layer is compatible with current map projection
			// NB: could be 3857 only
			var isCompatible = _.find(layer.tileMatrixSetLinks, function(link) { return link.tileMatrixSet == matrixSet.identifier });
			if ( isCompatible ) {
				// Add WMTS layers only compatible with current map projection
				params = {
					type: "WMTS",
					title: layer.title,
					name: layer.identifier,
					baseUrl: layer.baseUrl,
					visible: false,
					projection: Configuration.get("map.projection"),
					params: {
						layer: layer.identifier,
						matrixSet: matrixSet.identifier,
						format: layer.formats[0], // Take first one by default
						matrixIds: matrixSet.matrixIds.map(function(id) { return id.identifier })
					}
				}

				// Layer bounds should be in displayProjection -> 4326
				var boundsBase = layer.bounds ? layer.bounds : null;
				if ( boundsBase ) {
					params.bbox = [boundsBase.left, boundsBase.bottom,boundsBase.right,boundsBase.top];
				}
			} else {
				return null;
			}
		} else {
			return null;
		}
	}

	var label = params ? (params.title || params.name) : layer.title;
	return {
		item: {
			id: label,
			label: label,
			checked: isConfigurationLayer,
			layerDesc: params,
			layer: isConfigurationLayer ? layer : null
		}
	};
};

/**
 *	Creates highCheckTree structure from the given layers
 */
var buildHighCheckTreeData = function(layers, baseUrl) {
	var data = [];
	_.each(layers, function(layer) {
		var item = buildItem(layer);

		if ( item ) {
			if (item.item.layerDesc && !item.item.layerDesc.baseUrl) {
				// Update baseUrl for layers coming from GetCapabilities
				// NB: layerDesc doesn't exist for layer which serves only to group WMS layers
				item.item.layerDesc.baseUrl = baseUrl;
			}

			if (layer.nestedLayers && layer.nestedLayers.length > 0) {
				// Create children
				item.children = buildHighCheckTreeData(layer.nestedLayers, baseUrl);
			}
			data.push(item);
		}
	});

	return data;
};

/**
 *	Add a new data to trees
 */
var addToTrees = function($trees, data) {
	// Initialize high check tree
	$('<div>').appendTo($trees).highCheckTree({
		data: data,
		onCheck: function($li) {
			var layerDesc = $li.data("layerDesc");
			if (layerDesc) {

				// Store on $li to be able to remove later
				$li.data("layer", Map.addLayer(layerDesc));

				// KML layers cannot be used as background
				if (layerDesc.type == "KML") {
					$li.find("> .options").remove(); // A little bit radical..
				}
			}
		},
		onUnCheck: function($li) {
			var layer = $li.data("layer");
			var layerDesc = $li.data("layerDesc");
			if (layer) {
				Map.removeLayer(layer);
			}
		},
		onAddLi: function($li, node) {
			if (node.item.layerDesc) {
				$li.data("layerDesc", node.item.layerDesc);
			}
			if (node.item.layer) {
				$li.data("layer", node.item.layer);
			}
		},
		onDeleteLi: function($li) {
			var layer = $li.data("layer");
			var layerDesc = $li.data("layerDesc");
			if (layer) {
				Map.removeLayer(layer);
			}

			var parentName = $li.closest('.checktree').find(' > li').attr("rel");
			var userLayers = JSON.parse(UserPrefs.get("userLayers") || "[]");
			var parentLayer = _.findWhere(userLayers, {
				name: parentName
			});
			
			if ($li.attr("rel") == parentLayer.name) {
				userLayers.splice(userLayers.indexOf(parentLayer), 1);
			} else {
				nestedOp(parentLayer.data, "title", $li.attr("rel"), "delete");
			}
			UserPrefs.save("userLayers", JSON.stringify(userLayers));
		},
		options: {
			"isBackground": {
				callback: function($li, isChecked) {
					var layer = $li.data("layer");
					var layerDesc = $li.data("layerDesc");
					if (layer) {
						if (isChecked) {
							console.log("Becomes background");
							Map.removeLayer(layer);
							layerDesc.isBackground = true;
							$li.data("layer", Map.addLayer(layerDesc));
						} else {
							console.log("Becomes overlay");
							Map.removeLayer(layer);
							layerDesc.isBackground = undefined;
							$li.data("layer", Map.addLayer(layerDesc));
						}
						$li.data("layerDesc", layerDesc);
					} else {
						console.warn("NO LAYER BUILDED");
					}
				},
				labelOn: "Background",
				labelOff: "Overlay",
				type: "switch"
			}
		}
	});
};

/**
 *	Save layer to user prefs
 */
var saveLayer = function(layer, name, baseUrl) {
	// Update user prefereneces
	var userLayers = JSON.parse(UserPrefs.get('userLayers') || "[]");
	userLayers.push({
		name: name,
		baseUrl: baseUrl,
		data: layer
	});

	UserPrefs.save('userLayers', JSON.stringify(userLayers));
};

/**
 *	Layer manager view
 */
var LayerManagerView = Backbone.View.extend({

	events: {
		'click #addLayer': 'onAdd',
	},

	/**
	 *	Open popup to add layer to map
	 *	Could be: wms mapserver url, wms/wmts url of specific layer or url to KML layer
	 */
	onAdd: function(event) {

		// Create dynamic popup
		$openedPopup = $(layerSearchPopup_template()).appendTo('.ui-page-active');
		$openedPopup.popup()
			.bind("popupafterclose", function() {
				$(this).remove();
			});

		$openedPopup.popup("open").trigger("create");
		this.centerElement($openedPopup.closest('.ui-popup-container'));

		var baseUrl;
		var self = this;
		// On search callback
		var onSearch = function() {
			// Just some examples
			// Mapserver
			// baseUrl = "http://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r-t.cgi";
			// baseUrl = "http://neowms.sci.gsfc.nasa.gov/wms/wms";
			// baseUrl = "http://demonstrator.telespazio.com/wmspub";
			// baseUrl = "http://www.ign.es/wmts/pnoa-ma?SERVICE=WMTS";

			// Specific layer (wms/wmts)
			// baseUrl = "http://demonstrator.telespazio.com/wmspub?LAYERS=GTOPO&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&STYLES=&FORMAT=image%2Fjpeg&SRS=EPSG%3A4326&BBOX=90,0,112.5,22.5&WIDTH=256&HEIGHT=256"
			// baseUrl = "https://c.tiles.maps.eox.at/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=terrain-light&TILEMATRIXSET=WGS84&TILEMATRIX=2&TILEROW=1&TILECOL=0&FORMAT=image%2Fpng"
			// baseUrlMercator = "https://c.tiles.maps.eox.at/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=terrain_3857&TILEMATRIXSET=g&TILEMATRIX=2&TILEROW=1&TILECOL=0&FORMAT=image%2Fpng"
			// baseUrlMercatorOL3 = "http://services.arcgisonline.com/arcgis/rest/services/Demographics/USA_Population_Density/MapServer/WMTS/";

			// KML
			// baseUrl = "http://quakes.bgs.ac.uk/earthquakes/recent_world_events.kml"
			baseUrl = $openedPopup.find("input[name='layerUrl']").val();
			var type = $openedPopup.find('input[name="capabilities-type"]:checked').val()
			if (baseUrl != "") {
				$openedPopup.find(".status").hide();
				var name = $openedPopup.find("input[name='layerName']").val();
				var layer = {
					name: name,
					baseUrl: baseUrl,
					type: type
				};
				self.addLayer(layer, {
					onError: function(message) {
						$openedPopup.find(".status").show().html(message);
					},
					onSuccess: function(layer) {
						saveLayer(layer, name, baseUrl);
						$openedPopup.popup("close");
					}
				});

			} else {
				$openedPopup.find(".status").show().html("Please enter the mapserver or KML url");
			}
		};

		// Define callbacks for the given buttons
		$openedPopup
			.find('a[data-icon="search"]').click(onSearch).end()
			.find('input[name="layerUrl"]').on('input propertychange', function(event) {
				var layerUrl = $(this).val();
				if ( layerUrl.match(/LAYER|.kml/) ) {
					// Single layer or KML url
					$openedPopup.find('form').hide();
				} else {
					// MapServer url, so show the box allowing user to choose type
					$openedPopup.find('form').show();
				}
			});

	},

	/**
	 *	Add WMS/WMTS/KML layer to GUI
	 */
	addLayer: function(layer, options) {
		if (layer.baseUrl.endsWith(".kml")) {
			// KML
			var kmlDesc = {
				// Use proxy URL to avoid CORS problem
				location: Configuration.get("proxyUrl") + layer.baseUrl,
				name: layer.name,
				type: "KML",
				visible: true
			};

			var item = buildItem(kmlDesc);
			addToTrees(this.$el.find("#trees"), [item]);

			if (options && options.onSuccess)
				options.onSuccess(kmlDesc);

		} else if (layer.baseUrl.toUpperCase().indexOf("LAYER=") > 0) {
			// WMS/WMTS single url
			var wmsLayer = MapUtils.createWmsLayerFromUrl(layer.baseUrl);
			// Override title by user defined
			wmsLayer.title = layer.name;
			var item = buildItem(wmsLayer);
			if ( item ) {
				addToTrees(this.$el.find("#trees"), [item]);

				if (options && options.onSuccess)
					options.onSuccess(wmsLayer);
			} else {
				console.warn("Something wrong happend when adding " + layer.name);
			}

		} else {
			// WMS mapserver url
			if (options) {
				// Show loading
				$.mobile.loading("show", {
					text: "Loading mapserver layers..",
					textVisible: true
				});
				options.onComplete = function() {
					$.mobile.loading("hide", {
						textVisible: false
					});
				}
			}

			// Add all layers coming from GetCapabilities request
			this.exploreCapabilities(layer, options);
		}
	},

	/**
	 *	Explore capabilities of the given baseUrl
	 */
	exploreCapabilities: function(layer, options) {

		var self = this;
		// Launch search request to explore capabilities
		$.ajax({
			type: "GET",
			url: layer.baseUrl,
			data: {
				SERVICE: layer.type,
				//VERSION: '1.1.0', // No need to negociate version, since the highest one will be returned
				//@see http://cite.opengeospatial.org/OGCTestData/wms/1.1.1/spec/wms1.1.1.html#basic_elements.version.negotiation
				REQUEST: 'GetCapabilities'
			},
			success: function(doc) {

				var capabilities = layer.type == "WMS" ? new OpenLayers.Format.WMSCapabilities() : new OpenLayers.Format.WMTSCapabilities();
				var c = capabilities.read(doc);

				if (!c || !(c.capability || c.contents)) {
					if (options && options.onError)
						options.onError("Error while parsing capabilities");
					return;
				}

				var layers = layer.type == "WMS" ? c.capability.nestedLayers : c.contents.layers;
				
				// HACK: store tileMatrixSets on layer object for WMTS : used to extract projection on build
				if ( layer.type == "WMTS" ) {
					_.map(layers, function(layer) { layer.tileMatrixSets = c.contents.tileMatrixSets });
				}
				var tree = buildHighCheckTreeData(layers, layer.baseUrl);

				addToTrees(self.$el.find("#trees"), [{
					item: {
						id: layer.name,
						label: layer.name,
						checked: false
					},
					children: tree
				}]);

				if (options && options.onSuccess)
					options.onSuccess(layers);
			},
			error: function(r) {
				if (options && options.onError)
					options.onError("Error while searching on " + layer.baseUrl);
			},
			complete: function() {
				if (options && options.onComplete)
					options.onComplete();
			}
		});
	},

	/**
	 *	Center the given element
	 */
	centerElement: function(element) {
		$(element).css({
			'top': Math.abs((($(window).height() - $(element).outerHeight()) / 2) + $(window).scrollTop()),
			'left': Math.abs((($(window).width() - $(element).outerWidth()) / 2) + $(window).scrollLeft())
		});
	},

	/**
	 *	Add user layers
	 *	Currently method use local storage, in long term in must be something more appropriated
	 */
	addUserLayers: function() {
		var self = this;
		var userLayers = JSON.parse(UserPrefs.get("userLayers") || "[]");
		_.each(userLayers, function(layer) {
			// Check if layer contains data coming from GetCapabilities			
			if (_.isArray(layer.data)) {
				var tree = buildHighCheckTreeData(layer.data, layer.baseUrl);

				addToTrees(self.$el.find("#trees"), [{
					item: {
						id: layer.name,
						label: layer.name,
						checked: false
					},
					children: tree
				}]);
			} else if (layer.data.type == "WMS" || layer.data.type == "WMTS" || layer.data.type == "KML") {
				// Ordinary WMS/WMTS/KML layer
				self.addLayer(layer);
			} else {
				console.warn("Can't handle layer");
			}
		});
	},

	/**
	 *	Render
	 */
	render: function() {

		this.$el.append(layerManager_template());

		// Add WMS/KML layers coming from configuration to GUI
		var data = buildHighCheckTreeData(_.filter(Map.layers, function(layer) {
			return layer.params.type == "WMS" || layer.params.type == "KML";
		}));
		addToTrees(this.$el.find("#trees"), data);

		this.addUserLayers();

		this.$el.trigger('create');

		return this;
	}
});

module.exports = LayerManagerView;
});

require.register("account/view/renameShopcartView", function(exports, require, module) {
var CreateShopcartView = require('account/view/createShopcartView');

/** The rename view is very similar to the createShopcart view 
 * except for the submit action request
 */
var RenameShopcartView = CreateShopcartView.extend({

	/** submit the rename query to the server */
	submit: function(name, options) {
		this.model.getCurrent().save({
			"name": name
		}, options);
	},

	/** 
	 * Return an error message
	 */
	errorMessage: function() {
		return "Error : Shopcart cannot be renamed.";
	}

});

module.exports = RenameShopcartView;
});

require.register("account/view/shopcartManagerView", function(exports, require, module) {
var Configuration = require('configuration');
var CreateShopcartView = require('account/view/createShopcartView');
var RenameShopcartView = require('account/view/renameShopcartView');
var DuplicateShopcartView = require('account/view/duplicateShopcartView');
var ShopcartExportWidget = require('shopcart/widget/shopcartExportWidget');
var SharePopup = require('ui/sharePopup');
var shopcartManagerContent_template = require('account/template/shopcartManagerContent');

var ShopcartManagerView = Backbone.View.extend({

	initialize: function() {
		this.model.on("sync", this.render, this);
		this.model.on("error", this.error, this);
	},

	events: {
		'click label': function(event) {
			this.model.setCurrent(this.model.get(event.currentTarget.id));
		},

		'click #new_shp': function(event) {

			var createShopcartView = new CreateShopcartView({
				model: this.model,
				title: "New shopcart"
			});
			createShopcartView.render();
		},

		'click #duplicate_shp': function(event) {

			var duplicateShopcartView = new DuplicateShopcartView({
				model: this.model,
				title: "Duplicate shopcart"
			});
			duplicateShopcartView.render();
		},

		'click #rename_shp': function(event) {

			var renameShopcartView = new RenameShopcartView({
				model: this.model,
				title: "Rename shopcart"
			});
			renameShopcartView.render();
		},

		//called when the share button is clicked.
		'click #share_shp': function(event) {

			SharePopup.open({
				url: Configuration.serverHostName + (window.location.pathname) + this.model.getShopcartSharedURL(),
				positionTo: '#share_shp'
			});

		},

		'click #delete_shp': function(event) {
			var self = this;
			this.model.getCurrent().destroy()
				.done(function() {
					if (self.model.length > 0) {
						self.model.setCurrent(self.model.at(0));
					} else {
						self.model.setCurrent(null);
					}
					self.render();
				})
				.fail(function(xhr, textStatus, errorThrown) {
					self.showMessage(errorThrown);
				});
		},
		//added export as in the shopcart item view
		'click #export_shp': function(event) {

			var shopcartExportWidget = new ShopcartExportWidget();
			shopcartExportWidget.open();
		}
	},

	/**
	 * Refresh the view size
	 */
	refreshSize: function() {
		var parentOffset = this.$el.offset();
		var $content = this.$el.find('#shopcartListDiv');

		var height = $(window).height() - (parentOffset.top + this.$el.outerHeight()) + $content.height() - 50;

		$content.css('max-height', height);
	},

	render: function() {
		var mainContent = shopcartManagerContent_template({
			shopcarts: this.model
		});
		this.$el.html(mainContent);

		// Select the current one
		if (this.model.getCurrent()) {
			var currentShopcartSelect = "#" + this.model.getCurrent().id + "_input";
			this.$el.find(currentShopcartSelect).attr('checked', true);
		}

		this.$el.trigger("create");

		this.refreshSize();

		return this;
	},

	/** display the error message if any */
	showMessage: function(message) {
		if (this.timeOut) {
			clearTimeout(this.timeOut);
		}

		$("#errorMessageDiv")
			.html(message)
			.slideDown();

		// Hide status message after a given time
		this.timeOut = setTimeout(function() {
			$("#errorMessageDiv").slideUp();
		}, Configuration.data.dataAccessRequestStatuses.messagefadeOutTime);
	},

	/**
	 * this is a callback method to display an error message when an error occurs during 
	 * shopcart list retrieving. 
	 */
	error: function() {
		this.$el.html("<div class='ui-error-message'><p><b> Failure: Error when loading the shopcart list.</p></b>" +
			"<p><b> Please check the interface with the server.</p></b></div>");
	}

});

module.exports = ShopcartManagerView;
});

require.register("account/view/userPrefsView", function(exports, require, module) {
var UserPrefs = require('userPrefs');
var userPrefs_template = require('account/template/userPrefsContent');
var Configuration = require('configuration');

/**
 * The model is the UserPrefs singleton.
 * Simple Implemetantion with only the reset of the preferences 
 * without knowledge on the type of the feature to remove.
 */
var UserPrefsView = Backbone.View.extend({

	initialize: function() {
		UserPrefs.on("addedPreference removedPreference", this.refresh, this);
	},

	events: {

		'click #clearPrefs': function(event) {
			UserPrefs.reset();
		}
	},

	render: function() {

		this.$el.append(userPrefs_template({
			theme: Configuration.localConfig.theme,
			UserPrefs: UserPrefs
		}));
		this.$el.trigger('create');

		return this;
	},

	refresh: function() {
		this.$el.empty();
		this.render();
	}
});

module.exports = UserPrefsView;
});

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

/**
 * Buil base server url with window.location.pathname
 */
var _builBaseServerUrl = function() {
	// from pathname like /proxy-path/sec/ get /proxy-path
	// and set baseServerUrl to /proxy-path/ngeo
	var pathItems = window.location.pathname.split('/');
	var baseProxyPath = '';
	if (pathItems.length > 0) {
		for (var i=0; i<pathItems.length; i++) {
			if (pathItems[i]!=='sec' && pathItems[i]!=='' && pathItems[i]!=='index.html') {
				baseProxyPath = baseProxyPath + '/' + pathItems[i];
			}
		}
	}
	return baseProxyPath + '/ngeo';
};

var configuration = {

	// The base url to retreive the configurations
	url: '../conf',

	// The base server url
	baseServerUrl: _builBaseServerUrl(),

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
					url: this.serverHostName + this.baseServerUrl + "/webClientConfigurationData",
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

require.register("dataAccess/model/dataAccessRequest", function(exports, require, module) {
var Configuration = require('configuration');

/**
 * This module deals with the creation and submission of a generic data access request
 */
var DataAccessRequest = {

  id: "", //data access request id returned by the server 

  step: 0, //step is a counter of request steps. It is set to 0 when no request has been sent
  // it is set to 1 when a request has been sent

  requestStage: "",

  downloadLocation: {
    DownloadManagerId: "",
    DownloadDirectory: ""
  },

  createBulkOrder: false,

  firstRequest: {}, //keeps track of the first stage request in order to validate the second stage request 


  initialize: function() {

    this.step = 0;
    this.id = "";
    this.requestStage = Configuration.localConfig.dataAccessRequestStatuses.validationRequestStage;
    this.downloadLocation = {
      DownloadManagerId: "",
      DownloadDirectory: ""
    };

    this.resetRequest();
  },

  /** Submit the request to the server */
  submit: function() {

    //check that the request is valid before sending it to the server
    if (!this.isValid()) {
      return;
    }

    var self = this;

    return $.ajax({
      data: JSON.stringify(self.getRequest()),
      url: self.url,
      type: 'PUT',
      dataType: 'json',
      contentType: 'application/json',
      success: function(data) {

        //console.log(" SUCCESS : Received Validation Response from the server :");
        //console.log(data);

        //check the server response status with the configured server response statuses  
        var statusesConfig = Configuration.localConfig.dataAccessRequestStatuses;
        var validStatusesConfig = statusesConfig.validStatuses;

        switch (data.dataAccessRequestStatus.status) {

          case validStatusesConfig.validatedStatus.value:

            //initial stage
            if (self.step == 0 && self.id == "" && self.requestStage == statusesConfig.validationRequestStage) {
              self.step = 1;
              self.id = data.dataAccessRequestStatus.ID;
              self.requestStage = statusesConfig.confirmationRequestStage;

              self.validationProcessing(data.dataAccessRequestStatus);

              self.trigger('SuccessValidationRequest', data.dataAccessRequestStatus.message, validStatusesConfig.validatedStatus.message);

            } else {
              self.trigger('FailureRequest');

            }
            break;

          case validStatusesConfig.bulkOrderStatus.value:

            if (self.step == 0 && self.requestStage == statusesConfig.validationRequestStage) {
              self.step = 1;
              self.id = data.dataAccessRequestStatus.ID;
              //Bulk order is considered add the createBulkOrder
              self.createBulkOrder = true;
              self.requestStage = statusesConfig.confirmationRequestStage;

              self.trigger('SuccessValidationRequest', data.dataAccessRequestStatus.message, validStatusesConfig.bulkOrderStatus.message);
            } else {
              self.trigger('FailureRequest');
            }

            break;

          case validStatusesConfig.pausedStatus.value:
          case validStatusesConfig.inProgressStatus.value:

            if (self.step == 1 /*&& self.id == data.dataAccessRequestStatus.ID*/ &&
              self.requestStage == statusesConfig.confirmationRequestStage) { //2 steps done
              self.trigger('SuccessConfirmationRequest', data.dataAccessRequestStatus.message, validStatusesConfig.inProgressStatus.message);
            } else {
              self.trigger('FailureRequest');
            }
            break;

            /*					 // FL : this status should never happen?
  											case validStatusesConfig.pausedStatus.value:
  												  self.serverResponse = validStatusesConfig.pausedStatus.message;
  												  self.trigger('FailureValidationRequest');
  												  break;
  												  
  											  case validStatusesConfig.cancelledStatus.value:
  												  self.serverResponse = validStatusesConfig.cancelledStatus.message;
  												  self.trigger('FailureValidationRequest');
  												  break;*/

          default:
            self.serverResponse = Configuration.localConfig.dataAccessRequestStatuses.unExpectedStatusError;
            self.trigger('FailureRequest');
            break;
        }

      },

      error: function(jqXHR, textStatus, errorThrown) {
        if (jqXHR.status == 0) {
          location.reload();
        } else {
          console.log("ERROR when posting DAR :" + textStatus + ' ' + errorThrown);
          self.serverResponse = Configuration.localConfig.dataAccessRequestStatuses.requestSubmissionError;
          self.trigger('FailureRequest');
        }
      }
    });
  }

}

//add events method to object
_.extend(DataAccessRequest, Backbone.Events);

module.exports = DataAccessRequest;
});

require.register("dataAccess/model/downloadManagers", function(exports, require, module) {
/**
 * Download managers model 
 * The DownloadManagers is a singleton to be used for DAR and Download managers 
 * assignment and monitoring 
 */

var Configuration = require('configuration');
var SearchResults = require('logger');
var Logger = require('dataAccess/model/dataAccessRequest');

var DownloadManagers = Backbone.Model.extend({

	defaults: {
		downloadmanagers: []
	},

	initialize: function() {
		// The base url to retreive the download managers list
		this.url = Configuration.baseServerUrl + '/downloadManagers';
		this.listenTo(this, "error", this.onError);
	},

	/**
	 * Call when the model cannot be fetched from the server
	 */
	onError: function(model, response) {
		if (response.status == 0) {
			location.reload();
		}
	},

	/**
	 * Get a download manager user friendly name given its id
	 */
	getDownloadManagerName: function(id) {
		var dm = _.findWhere(this.get("downloadmanagers"), {
			downloadManagerId: id
		});
		return dm ? dm.downloadManagerFriendlyName : id;
	},

	/**
	 * Get a download manager status given its id
	 */
	getDownloadManagerStatus: function(id) {
		var dm = _.findWhere(this.get("downloadmanagers"), {
			downloadManagerId: id
		});
		return dm ? dm.status : null;
	},

	/** 
	 * Submit the DM change status request to the server.
	 */
	requestChangeStatus: function(dmID, newStatus) {

		var dm = _.findWhere(this.get("downloadmanagers"), {
			downloadManagerId: dmID
		});
		if (!dm)
			return;

		var self = this;
		var dmChangeStatusURL = self.url + '/' + dmID + '/changeStatus?new_status=' + newStatus;
		var prevStatus = dm.status;

		return $.ajax({
				url: dmChangeStatusURL,
				type: 'GET',
				dataType: 'json'
			})
			.done(function(data) {
				dm.status = data.status;
				self.trigger("status:change");
			})
			.fail(function(jqXHR, textStatus, errorThrown) {
				if (jqXHR.status == 0) {
					location.reload();
				} else {
					Logger.error("Cannot change downloand manager status request :" + textStatus + ' ' + errorThrown);
					// restore previous status
					dm.status = prevStatus;
				}
			});
	}

});

module.exports = new DownloadManagers();
});

require.register("dataAccess/model/simpleDataAccessRequest", function(exports, require, module) {
 var Configuration = require('configuration');
 var SearchResults = require('searchResults/model/searchResults');
 var DataAccessRequest = require('dataAccess/model/dataAccessRequest');
 var ShopCartCollection = require('shopcart/model/shopcartCollection');

 /**
  * This module deals with the creation and submission of simple data access requests 
  * It extends DataAccessRequest module
  */
 var SimpleDataAccessRequest = {

   url: Configuration.baseServerUrl + "/simpleDataAccessRequests",

   name: "download",

   rejectedProductsNB: 0, //nb of products checked but not having a url 

   productURLs: [],

   productSizes: [],

   totalSize: 0,

   dataType: null,

   /**
    * Reset specific parameters of a simple DAR
    */
   resetRequest: function() {

     this.rejectedProductsNB = 0;
     this.productURLs = [];
     this.hostedProcessId = null;
     this.name = "download";
   },

   /**
	 *	Get dataset included in request
	 */
	getDataType: function() {
    return this.dataType;
	},

   /**
    * Get the current request to submit
    */
   getRequest: function() {

     // The JSON to send to the server
     if (this.hostedProcessId) {
       this.url = Configuration.baseServerUrl + "/hostedProcessDataAccessRequests";
       var params = [];
       // Add hosted processing parameters
       for (var i = 0; i < this.productURLs.length; i++) {
         params.push({
           name: "productURL",
           value: this.productURLs[i]
         });
       }
       params = params.concat(this.parameters);

       var request = {
         hostedProcessDataAccessRequest: {
           requestStage: this.requestStage,
           hostedProcessId: this.hostedProcessId,
           downloadLocation: this.downloadLocation,
           parameter: params,
           name: this.name
         }
       };
     } else {
       this.url = Configuration.baseServerUrl + "/simpleDataAccessRequests";

       var request = {
         simpledataaccessrequest: {
           requestStage: this.requestStage,
           downloadLocation: this.downloadLocation,
           productURLs: [],
           name: this.name
         }
       };
       // Add create bulk order if needed
       if (this.createBulkOrder) {
         request.simpledataaccessrequest.createBulkOrder = true;
       }

       // Transform product URLs
       for (var i = 0; i < this.productURLs.length; i++) {
         var self = this;
         var _findExpectedSize = _.find(this.productSizes, function(item) {
           return item.productURL === self.productURLs[i];
         });
         var _expectedSize = "0";
         if (_findExpectedSize) {
           _expectedSize = _findExpectedSize.productSize;
         }
         request.simpledataaccessrequest.productURLs.push({
           productURL: this.productURLs[i],
           expectedSize: _expectedSize
         });
       }
     }

     //console.log(request);

     return request;
   },

   /** 
    * Get message the display when a simple DAT creation is triggered
    */
   getSpecificMessage: function() {

     /*		var collapsibleContent = "<h5>Selected Products : " + (this.productURLs.length + this.rejectedProductsNB) + "<h5>";
  				
  				if (this.rejectedProductsNB == 0){
  					collapsibleContent += "<p>All the selected items have been included in the request.<p>";
  				}else{
  					collapsibleContent += "<p> " + this.rejectedProductsNB + " products are not included in the request since they do not have a url.";
  				}
  				
  				return collapsibleContent; */

     if (this.productURLs.length == 1) {
       return "<p>One product is included in the request.</p>";
     } else {
       return "<p>" + this.productURLs.length + " products are included in the request.</p>";
     }
   },


   /** 
    * Set the list of products for the DAR 
    * if the file name is empty the product is rejected
    */
   setProducts: function(products) {
     this.productURLs = SearchResults.getProductUrls(products);
     this.productSizes = SearchResults.getProductSizes(products);
     this.rejectedProductsNB = products.length - this.productURLs.length;
     // dataType = name of shopcart or catalog
     if (_.find(products, function(product) {
       return (typeof product.properties.shopcart_id !== 'undefined');
      })) {
      this.dataType = ShopCartCollection._current.get('name');
     } else {
       this.dataType = products[0].properties.originDatasetId;
     }
   },

   /**
    * Check whether the request is valid or not
    */
   isValid: function() {

     var dataAccessConfig = Configuration.localConfig.dataAccessRequestStatuses;

     // If request not valid when no download manager then display the specific message
     // the validate button is not disabled since when the user selects a download manager the request
     if (this.downloadLocation.DownloadManagerId == "") {
       this.serverResponse = dataAccessConfig.invalidDownloadManagersError;
       return false;
     }

     // Request not valid when no product urls set then display the specific message
     if (this.productURLs.length == 0) {
       this.serverResponse = Configuration.localConfig.simpleDataAccess.invalidProductURLsError;
       this.trigger('RequestNotValidEvent');
       return false;
     }

     // Initial request : nominal case
     if (this.step == 0 &&
       this.id == "" &&
       this.requestStage == dataAccessConfig.validationRequestStage) {
       return true;
     }

     // Second stage submission with and without bulk order
     if (this.step == 1 &&
       this.id != "" &&
       this.requestStage == dataAccessConfig.confirmationRequestStage) {
       return true;
     }

     // Disable the request validation if the request is not valid
     this.trigger('RequestNotValidEvent');

     return false;
   },

   /** 
    * Specific simple DAR additional processing after validation request
    */
   validationProcessing: function(dataAccessRequestStatus) {

     // Calculate the total download estimated size  
     this.totalSize = 0;
     var productStatuses = dataAccessRequestStatus.productStatuses;
     var aPromises = [];
     for (var i = 0; i < productStatuses.length; i++) {
       var _expectedSize = _.find(this.productSizes, function(item) {
         return item.productURL === productStatuses[i].productURL;
       }).productSize;
       if (_expectedSize) {
          productStatuses[i].expectedSize = _expectedSize;
          this.totalSize += parseInt(_expectedSize);
       }
     }
   }
 }

 // Add DataAccessRequest methods to SimpleDataAccessRequest
 _.extend(SimpleDataAccessRequest, DataAccessRequest);

 module.exports = SimpleDataAccessRequest;
});

require.register("dataAccess/model/standingOrderDataAccessRequest", function(exports, require, module) {
var Configuration = require('configuration');
var DataAccessRequest = require('dataAccess/model/dataAccessRequest');
var DatasetSearch = require('search/model/datasetSearch');


// A constant
var ONE_MONTH = 24 * 30 * 3600 * 1000;

/**
 * This module deals with the creation and submission of a Standing order data access request
 * It extends DataAccessRequest module.
 */
var StandingOrderDataAccessRequest = {

	url: Configuration.baseServerUrl + "/standingOrderDataAccessRequest",

	OpenSearchURL: "",

	startDate: new Date(),

	endDate: new Date(new Date().getTime() + ONE_MONTH),

	timeDriven: false,

	repeatPeriod: 0,

	slideAcquisitionTime: false,

	DownloadOptions: {},

	SchedulingOptions: {},

	name: "subscription",

	resetRequest: function() {

		this.OpenSearchURL = "";
		this.DownloadOptions = {};
		this.SchedulingOptions = {};
		this.hostedProcessId = null;
		this.name = "subscription";
	},

	/**
	 *	Get dataset included in request
	 */
	getDataType: function() {
		var datasetNameRegExp = new RegExp(/catalogue\/(\w*)\//)
		return datasetNameRegExp.exec(this.OpenSearchURL)[1];
	},

	/** 
	 * Build the request to submit
	 */
	getRequest: function() {

		var request = {
			StandingOrderDataAccessRequest: {
				requestStage: this.requestStage,
				OpenSearchURL: this.OpenSearchURL,
				DownloadOptions: this.DownloadOptions,
				SchedulingOptions: this.getSchedulingOptions(),
				downloadLocation: this.downloadLocation,
				name: this.name
			}
		};

		// Add hosted processing parameters if defined
		if (this.hostedProcessId) {
			request.StandingOrderDataAccessRequest.hostedProcessId = this.hostedProcessId;
			request.StandingOrderDataAccessRequest.parameter = this.parameters;
		}

		// If createBulkOrder is set to true after a validation request
		// take into account the createBulkOrder for the confirmation request
		if (this.createBulkOrder) {
			request.StandingOrderDataAccessRequest.createBulkOrder = true;
		}

		// console.log(request);
		return request;
	},

	/** 
	 * The shared standing order url contains :
	 * 	1- all the search parameters as for as for a shared search url. 
	 *  2- scheduling options parameters relative to a standing order request
	 */
	getSharedURL: function(standingOrder) {

		var datasetId = standingOrder.dataset.get("datasetId");
		var url = "#data-services-area/sto/" + datasetId + '?';

		url += standingOrder.getOpenSearchParameters(datasetId);

		// Get the scheduling object either the STO is TimeDriven or Data-Driven
		var options = this.timeDriven ? this.getSchedulingOptions().TimeDriven : this.getSchedulingOptions().DataDriven;
		url += "&" + $.param(options);

		return url;
	},

	/** 
	 * Method used in the case of a shared standing order url.
	 * It fill in the STO request with the given values.
	 */
	populateModelfromURL: function(query, standingOrder) {

		this.initialize();

		var vars = query.split("&");

		for (var i = 0; i < vars.length; i++) {

			var pair = vars[i].split("=");

			switch (pair[0]) {

				case "startDate":
					this.startDate = Date.fromISOString(pair[1]);
					break;
				case "endDate":
					this.endDate = Date.fromISOString(pair[1]);
					break;
				case "repeatPeriod":
					this.repeatPeriod = pair[1];
					this.timeDriven = true;
					break;
				case "slideAcquisitionTime":
					this.slideAcquisitionTime = (pair[1] == "true"); //set boolean value not the string !
					this.timeDriven = true;
					break;

				default:
					break;
			}
		}

		// Set open search url
		this.OpenSearchURL = standingOrder.getOpenSearchURL();
		// Set selected download options
		this.DownloadOptions = standingOrder.getSelectedDownloadOptions();
	},

	/**
	 * Build the Scheduling option property depending on the STO type
	 */
	getSchedulingOptions: function() {

		if (this.timeDriven) {

			return {
				TimeDriven: {
					startDate: this.startDate.toISODateString(),
					endDate: this.endDate.toISODateString(),
					repeatPeriod: this.repeatPeriod,
					slideAcquisitionTime: this.slideAcquisitionTime
				}
			};

		} else {
			return {
				DataDriven: {
					startDate: this.startDate.toISODateString(),
					endDate: this.endDate.toISODateString()
				}
			};
		}
	},

	/** 
	 * Message to display as information 
	 * Display nothing for STO
	 */
	getSpecificMessage: function() {

		//		var collapsibleContent = "<h5> Standing Order info <h5>";
		//		
		//		collapsibleContent += "<p> OpenSearchURL: " + this.OpenSearchURL + "<p>";
		//		
		//		if (this.DownloadOptions === {} ){
		//			collapsibleContent += "<p> There are no download Options <p>";
		//		
		//		}else{	
		//
		//			_.each(this.DownloadOptions, function(value, key){
		//				collapsibleContent += "<p>" + value + " : " + key + "<p>";
		//			});
		//		}
		//		
		//		return collapsibleContent; 
	},


	/**
	 * Check whether the request is valid or not
	 */
	isValid: function() {

		var dataAccessConfig = Configuration.localConfig.dataAccessRequestStatuses;
		var standingOrderConfig = Configuration.localConfig.standingOrder;

		//if request not valid when no download manager then display the specific message
		//the validate button is not disabled since when the user selects a download manager the request
		if (this.downloadLocation.DownloadManagerId == "") {
			this.serverResponse = dataAccessConfig.invalidDownloadManagersError;
			return false;
		}

		if (this.OpenSearchURL == "" || !this.OpenSearchURL) {
			this.serverResponse = standingOrderConfig.invalidOpenSearchURLError;
			return false;
		}

		if (!this.DownloadOptions) {
			this.serverResponse = standingOrderConfig.invalidDownloadOptionsError;
			return false;
		}

		var computedShedulingOptions = this.getSchedulingOptions();

		//initial request : nominal case
		//slideAcquisitionTime is a boolean and repeatPeriod is number so compare with undefined
		//to avoid 0/boolean false tests 
		if (this.step == 0 &&
			this.id == "" &&
			this.requestStage == dataAccessConfig.validationRequestStage &&
			this.OpenSearchURL && this.DownloadOptions &&
			this.SchedulingOptions &&
			((computedShedulingOptions.DataDriven && computedShedulingOptions.DataDriven.endDate) ||
				(computedShedulingOptions.TimeDriven && computedShedulingOptions.TimeDriven.endDate &&
					computedShedulingOptions.TimeDriven.repeatPeriod != undefined &&
					computedShedulingOptions.TimeDriven.slideAcquisitionTime != undefined))) {
			return true;
		}

		//second stage submission with and without bulk order
		//no need to test the other properties because they cannot be changed in the meantime
		if (this.step == 1 &&
			this.id != "" &&
			this.requestStage == dataAccessConfig.confirmationRequestStage
		) {
			return true;
		}

		//disable the request validation if the request is not valid
		this.trigger('RequestNotValidEvent');

		return false;
	},

	/**
	 * Specific Standing order additional processing after validation request
	 */
	validationProcessing: function(dataAccessRequestStatus) {
		//there is nothing specific for standing orders
	}

}

// Add DataAccessRequest methods to StandingOrderDataAccessRequest
_.extend(StandingOrderDataAccessRequest, DataAccessRequest);

module.exports = StandingOrderDataAccessRequest;
});

require.register("dataAccess/view/dataAccessRequestView", function(exports, require, module) {
var Configuration = require('configuration');
var HostedProcessList = require('hostedProcesses/model/hostedProcessList');
var SelectHostedProcessView = require('hostedProcesses/view/selectHostedProcessesView');

var dataAccessRequestView_template = require('dataAccess/template/dataAccessRequestViewContent');
var downloadManagerInstall_template = require('dataAccess/template/downloadManagerInstallContent');


/**
 * This view handles the displaying of download managers and the assignment 
 * of a download manager to a data access request either a SimpleDataAccessRequest 
 * or a StandingOrderDataAccessRequest.
 * It handles hosted process configuration as well.
 * 
 * The attribute request is the request to be submitted.
 */
var DataAccessRequestView = Backbone.View.extend({

	events: {
		'click #validateRequest': function(event) {

			var hpIsSelected = this.selectHostedProcessView && this.selectHostedProcessView.$el.find('.selected').length > 0;
			if (!hpIsSelected || this.selectHostedProcessView.validateParameters()) {
				// No hosted process selected or selected one have valide parameters
				$("#serverMessage").empty();
				var dmId = this.request.downloadLocation.DownloadManagerId = this.$el.find("#downloadManagersList").val();
				var dir = this.request.downloadLocation.DownloadDirectory = this.$el.find("#downloadDirectory").val();

				// Disable the DMs list to avoid choosing a different DM once the
				// validation request has been submitted
				this.$el.find('#downloadManagersList').selectmenu('disable');
				this.$el.find('#downloadDirectory').textinput('disable').end()
					.find("#darName").textinput('disable');

				// Submit the request
				this.request.submit();

				// Store the used directories
				var dirs = localStorage.getItem("directories-" + dmId) || "";
				dirs = dirs.split(',');
				if (dirs.indexOf(dir) < 0) {
					dirs.push(dir);
				}
				localStorage.setItem("directories-" + dmId, dirs.join(','));
			} else {
				$("#serverMessage").html('<p style="color: red;">Please, configure the product processing parameters first</p>');
			}
		},

		'change #darName' : function(event) {
			this.request.name = $(event.target).val();
		}
	},

	/**
	 * Set the request to view
	 */
	setRequest: function(request) {
		if (this.request) {
			this.stopListening(this.request);
		}

		this.request = request;
		if (this.request) {
			this.listenTo(this.request, 'SuccessValidationRequest', this.onValidationSuccess);
			this.listenTo(this.request, 'SuccessConfirmationRequest', this.onConfirmationSuccess);
			this.listenTo(this.request, 'FailureRequest', this.onFailure);
			this.listenTo(this.request, 'RequestNotValidEvent', this.onFailure);
		}
	},

	/** 
	 * Change the button status to disabled in case the requests are not valid
	 */
	onFailure: function() {
		$("#validateRequest").button('disable');
		// TODO : improve message according to the failure ?
		// NGEO 782 : fixed failure response message content
		$("#serverMessage").html("Invalid server response");
	},

	/** 
	 * Change the button text to highlight the request stage "Confirmation" 
	 * Update the button text in the jqm span for button text to make the
	 * button text updated
	 */
	onValidationSuccess: function(serverMessage, configMessage) {
		$("#validateRequest").html("Confirm");
		$("#downloadManagersFooter .ui-btn-text").html("Confirm");

		var message = '<p>' + configMessage + '</p><p>' + serverMessage + '</p>';
		// Display the estimated size and a warning message if the size exceeds a thresold (REQ)
		if (this.request.totalSize) {
			message += "<p> Estimated Size : " + filesize(this.request.totalSize) + ".<p>";
			if (this.request.totalSize > Configuration.get('simpleDataAccessRequest.warningMaximumSize', 1e9)) {
				message += "<p>WARNING : The amount of data to download is huge.</p><p>Are you sure you want to confirm your request?</p>";
			}
		}
		// NGEO 782 : fixed failure response message content
		$("#serverMessage").html(message);
	},

	/**
	 * Called when the confirmation succeeds
	 */
	onConfirmationSuccess: function(serverMessage, configMessage) {
		// Disable the confirm button
		$("#validateRequest").button('disable');
		// Display the message
		// NGEO 782 : fixed failure response message content
		$("#serverMessage").html('<p>' + configMessage + '</p><p>' + serverMessage + '</p>');

		// NGEO-900 : close widget when finished
		var self = this;
		setTimeout(function() {
			self.$el.parent().ngeowidget('hide')
		}, 1000);
	},

	/**
	 * Directory suggestion, depends on the selected download manager
	 */
	directorySuggestion: function(term, response) {
		var dmId = this.$el.find("#downloadManagersList").val();
		var dirs = localStorage.getItem("directories-" + dmId);
		var suggestions = [];
		if (dirs) {
			dirs = dirs.split(',');
			for (var n = 0; n < dirs.length; n++) {
				if (dirs[n] !== term && dirs[n].indexOf(term) >= 0) {
					suggestions.push(dirs[n]);
				}
			}
		}
		response(suggestions);
	},

	/**
	 * Render the view
	 */
	render: function() {

		// NGEO-2079: Generate a default name for current request
		this.request.name += "-"+ this.request.getDataType() +"-" + new Date().toISOString();

		// After the download managers are retrieved
		// if (this.model.attributes.downloadmanagers != 0) {
		if (this.model.attributes.downloadmanagers == 0) {
			// No download manager is already registered : propose a link to the user to install one
			var installContent = downloadManagerInstall_template({
				downloadManagerInstallationLink: Configuration.data.downloadManager.downloadManagerInstallationLink,
				downloadmanagers: this.model.get('downloadmanagers')
			});
			this.$el.html("<p class='ui-error-message'><b>No download manager has been registered.<br>In order to download products, you need to install a download manager.</b></p>" + installContent);

		} else {
			// Render the data access request template
			var content = dataAccessRequestView_template({
				model: this.model,
				request: this.request,
				theme: Configuration.localConfig.theme
			});
			this.$el.html(content);

			this.$el.find("#downloadDirectory").autoComplete({
				minChars: 0,
				cache: false,
				source: $.proxy(this.directorySuggestion, this)
			});
		}

		// Create hosted process list
		var hostedProcessList = new HostedProcessList();
		var self = this;
		hostedProcessList.fetch()
			.done(function() {
				if ( hostedProcessList.get("hostedProcess").length > 0 ) {
					self.selectHostedProcessView = new SelectHostedProcessView({
						model: hostedProcessList,
						el: self.$el.find("#hostedProcesses"),
						request: self.request
					});

					self.selectHostedProcessView.render();
					self.$el.find("#hostedProcesses").trigger('create');
				} else {
					// NGEO-1942: hide panel when no product processing is available
					self.$el.find("#productProcessingContainer").remove();
					self.$el.trigger("create");
				}
			})
			.fail(function() {
				self.$el.find("#hostedProcesses").html('No product processing available.');
			});

		this.$el.find("#dataAccessSpecificMessage").append(this.request.getSpecificMessage());
		// Trigger JQM styling
		this.$el.trigger('create');

		return this;
	}

});

module.exports = DataAccessRequestView;
});

require.register("dataAccess/widget/dataAccessWidget", function(exports, require, module) {
/**
 * Data widget module
 * Used to assign a download manager/product processing to a data access request
 */

var Configuration = require('configuration');
var DataAccessRequestView = require('dataAccess/view/dataAccessRequestView');
var DownloadManagers = require('dataAccess/model/downloadManagers');
var ngeoWidget = require('ui/widget');

var DataAccessWidget = function() {

	var parentElement = $('<div id="dataAccessPopup">');
	var element = $('<div id="dataAccessPopupContent"></div>');
	element.appendTo(parentElement);
	parentElement.appendTo('.ui-page-active');
	var self = this;
	parentElement.ngeowidget({
		title: 'Data Access Request'
	});

	var dataAccessRequestView = new DataAccessRequestView({
		model: DownloadManagers,
		el: element
	});

	/**
	 *	Open the popup
	 *	@param request
	 *		The request to be used by widget: could be SimpleDataAccessRequest or StandingOrderDataAccessRequest
	 */
	this.open = function(request) {

		// Load the available download managers: even if fetch has failed
		DownloadManagers.fetch().complete(function() {
			// Build the given request
			dataAccessRequestView.setRequest(request);
			dataAccessRequestView.render();

			// Open the popup
			parentElement.ngeowidget("show");
		});
	};


	/**
	 *	For the moment not used since the popup can be 
	 *	closed by clicking out side its content.
	 */
	this.close = function() {
		parentElement.ngeowidget("hide");
	};
};

module.exports = new DataAccessWidget();
});

require.register("dataAccess/widget/directDownloadWidget", function(exports, require, module) {
var Configuration = require('configuration');
var DownloadManagers = require('dataAccess/model/downloadManagers');
var directDownload_template = require('dataAccess/template/directDownloadWidgetContent');


var DirectDownloadWidget = function(url) {

	var parentElement = $('<div id="directDownloadPopup" data-role="popup" data-overlay-theme="a" class="popup-widget-background">');
	parentElement = parentElement.appendTo('.ui-page-active');

	/**
	 *	Open the popup
	 */
	this.open = function(event) {


		parentElement.bind({
			popupafterclose: function(event, ui) {
				parentElement.remove();
			}
		});

		// Create the content
		if (DownloadManagers.get('downloadmanagers').length >= 1) {
			parentElement.html(directDownload_template({
				url: url,
				downloadHelperUrl: Configuration.baseServerUrl + "/downloadHelper" + "?productURI=" + encodeURIComponent(url + '.ngeo')
			}));
		} else {
			parentElement.html(directDownload_template({
				url: url,
				downloadHelperUrl: false
			}));

			// Try to fetch again  the download manages to display the special link
			DownloadManagers.fetch().done(function() {
				parentElement.html(directDownload_template({
					url: url,
					downloadHelperUrl: Configuration.baseServerUrl + "/downloadHelper" + "?productURI=" + encodeURIComponent(url + '.ngeo')
				}));
				parentElement.trigger('create');
			});
		}

		parentElement.trigger('create');

		parentElement.popup();
		parentElement.popup("open", {
			x: event.pageX,
			y: event.pageY,
			positionTo: "origin"
		});

	};


	/**
	 *	For the moment not used since the popup can be 
	 *	closed by clicking out side its content.
	 */
	this.close = function() {
		parentElement.popup("close");
	};
};

module.exports = DirectDownloadWidget;
});

require.register("globalEvents", function(exports, require, module) {
var globalEvents = {};

_.extend(globalEvents, Backbone.Events);

module.exports = globalEvents;
});

require.register("help", function(exports, require, module) {
/** 
	Load a page from help
 */
function loadPage(url) {
	$.ajax({
		url: url,
		dataType: 'text',
		success: function(data) {
			var $container = $('#contentContainer');

			// Fix image path
			// Use a regexp to have some preloading when using .html()
			var fixImgData = data.replace(/<img([^>]*)\ssrc=['"]([^'"]+)['"]/gi, "<img$1 src='pages/userManual/$2'");

			// Set HMTL and called trigger create to apply jQM styling
			$container
				.html(fixImgData)
				.trigger('create');

			// Manage fragment in the URL
			var posFrag = url.indexOf('#');
			if (posFrag >= 0) {
				var $fragment = $(url.substr(posFrag));
				if ($fragment.length > 0) {

					$container.imagesLoaded(function() {
						$container.scrollTop($fragment.offset().top + $container.scrollTop() - $container.offset().top);
					});
				}
			} else {
				$container.scrollTop(0);
			}
		}
	});
}

/** 
	Callback when window is resized
 */
function onWindowResize() {
	$('#contentContainer').height($(window).height() - $('header').outerHeight(true));
}

/** When the document is ready, clean-up styling */
$(document).ready(function() {

	var router = new Backbone.Router();
	router.route("chapter/:chapter(/:section)", "chapter", function(chapter, section) {
		var url = "pages/userManual/" + chapter + ".html";
		if (section) {
			url += "#" + section;
		}
		loadPage(url);
	});
	router.route("", "index", function() {
		loadPage("pages/userManual/overview.html");
	});

	// Remove some automatic styling from jQuery Mobile that don't fit in ngEO style
	$("body").removeClass("ui-mobile-viewport");
	$("header").find("a").removeClass("ui-link");

	onWindowResize();
	$(window).resize(onWindowResize);

	Backbone.history.start();
});
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

require.register("hostedProcesses/model/hostedProcessList", function(exports, require, module) {
var Configuration = require('configuration');

/**
 *	Hosted process list
 */
var HostedProcessList = Backbone.Model.extend({

	defaults: {
		hostedProcesses: []
	},

	// Constructor : initialize the url from the configuration
	initialize: function() {
		// The base url to retreive the hosted process list
		this.url = Configuration.baseServerUrl + '/hostedProcesses';
	}
});

module.exports = HostedProcessList;
});

require.register("hostedProcesses/view/hostedProcessConfigurationView", function(exports, require, module) {
var Configuration = require('configuration');
//require('jqm-datebox');
var hostedProcess_template = require('hostedProcesses/template/hostedProcessConfigurationContent');

/**
 *	Function checking the validity of string as url
 */
var isValidURL = function(str) {
	var pattern = new RegExp(/^(ht|f)tps?:\/\/[a-z0-9-\.]+\.[a-z]{2,4}\/?([^\s<>\#%"\,\{\}\\|\\\^\[\]`]+)?$/gi);
	if (!str.match(pattern)) {
		return false;
	} else {
		return true;
	}
}

/**
 * This view handles the displaying the configuration of the given process
 */
var HostedProcessConfigurationView = Backbone.View.extend({

	id: "hostedProcessConfiguration",
	initialize: function(options) {
		this.request = options.request;
	},
	events: {
		"click #validateHostedProcessConfiguration": function() {
			this.$el.find('#validateMessage').empty();

			// Create new properties
			var properties = []
			var selectOptions;
			var self = this;
			this.$el.find('input, div')
				.removeClass('invalid');
			this.$el.find('select, input')
				.each(function(i) {
					if (self.validateField(this)) {
						properties.push({
							name: $(this).attr("id"),
							value: $(this).val()
						});
					} else {
						if ($(this).data("role") == "datebox") {
							$(this).parent().addClass('invalid');
						} else {
							$(this).addClass('invalid');
						}
					}

				});

			if (this.$el.find('.invalid').length == 0) {
				this.request['parameters'] = properties;
				$('#dataAccessPopup').ngeowidget("show");
			}
		}
	},
	render: function() {
		// Todo create Backbone.Model ? or pass by options ?
		var content = hostedProcess_template({
			hostedProcess: this.model
		});
		this.$el.append(content);

		if (this.$el.find('.configurationInputs').length == 0) {
			this.$el.find('#validateHostedProcessConfiguration').before('<p style="text-align: center;">No parameter to configure by user</p>');
		}
	},

	/**
	 *	Check if field was filled by user and check its validity
	 */
	validateField: function(field) {
		var value = $(field).val();
		var isValid = true;
		if (value) {
			if ($(field).attr('type') == "number") {
				var min = parseFloat($(field).attr("min"));
				var max = parseFloat($(field).attr("max"));
				if (min > value || max < value) {
					this.$el.find('#validateMessage').append('<p style="color: red;">Value of ' + $(field).attr("id") + ' field must be between ' + min + ' and ' + max + '</p>');
					isValid = false;
				}
			}

			if ($(field).attr('type') == "url" && !isValidURL(value)) {
				this.$el.find('#validateMessage').append('<p style="color: red;">The url of ' + $(field).attr('id') + ' field is not valid</p>');
				isValid = false;
			}
		} else {
			if (this.$el.find('.missingError').length == 0) {
				this.$el.find('#validateMessage').prepend('<p style="color: red;" class="missingError">Please, fill all the missing parameters</p>')
			}
			isValid = false;
		}
		return isValid;
	}
});

module.exports = HostedProcessConfigurationView;
});

require.register("hostedProcesses/view/selectHostedProcessesView", function(exports, require, module) {
var Configuration = require('configuration');
var HostedProcessConfigurationView = require('hostedProcesses/view/hostedProcessConfigurationView');
var StandingOrderDataAccessRequest = require('dataAccess/model/standingOrderDataAccessRequest');
require('ui/widget');
var hostedProcessesList_template = require('hostedProcesses/template/hostedProcessesListContent');

/**
 * This view handles the displaying of hosted processes
 */
var SelectHostedProcessView = Backbone.View.extend({

	id: "hostedProcessView",
	initialize: function(options) {
		this.request = options.request;
	},
	events: {
		"click #configureHostedProcess": function() {
			$("#serverMessage").empty();

			var selectedHostedProcessIndex = this.$el.find('.selected').data("value");

			var element = $('<div id="hostedProcessConfiguration">');
			element.appendTo('.ui-page-active');

			element.ngeowidget({
				title: "Product processing",
				hide: function() {
					element.remove();
				}
			});

			var hostedProcessConfigurationView = new HostedProcessConfigurationView({
				model: this.model.get('hostedProcess')[selectedHostedProcessIndex],
				el: element,
				request: this.request
			});

			hostedProcessConfigurationView.render();
			element.trigger('create');
			element.ngeowidget("show");
		},
		"click .hostedProcess": function(event) {
			var $selectedHostedProcess = $(event.target).closest('.hostedProcess');

			// Set hostedProcessId and reinit parameters
			var selectedHostedProcessIndex = $selectedHostedProcess.data("value");
			this.request.hostedProcessId = this.model.get('hostedProcess')[selectedHostedProcessIndex].hostedProcessId;
			this.request.parameters = [];

			$selectedHostedProcess
				.siblings().removeClass('selected').end()
				.toggleClass('selected');

			var configureBtn = this.$el.find('#configureHostedProcess');
			if (this.$el.find('.selected').length > 0) {
				configureBtn.removeAttr('disabled');
			} else {
				configureBtn.attr('disabled', 'disabled');
			}
			configureBtn.button("refresh");
		}
	},

	render: function() {
		var content = hostedProcessesList_template({
			hostedProcesses: this.model.get('hostedProcess'),
			theme: Configuration.localConfig.theme
		});

		this.$el.html(content);

	},

	/**
	 *	Check if hosted process parameters are filled, handle EOProductURL type
	 */
	validateParameters: function() {
		var self = this;
		var hostedProcess = _.find(this.model.get('hostedProcess'), function(hp) {
			return hp.hostedProcessId == self.request.hostedProcessId;
		});
		for (var i = 0; i < hostedProcess.parameter.length; i++) {
			var parameter = hostedProcess.parameter[i];
			var parameterFilled = _.where(this.request.parameters, {
				name: parameter.name
			}).length > 0;
			if (parameter.type != "EOProductURL") {
				if (!parameterFilled)
					return false;
			}
			/*else
			{
				// Handle EOProductURL
				if ( !parameterFilled )
				{
					// Add EOProductParameter if doesn't exists
					var eoProductURLParameter = {
						name: parameter.name,
						value : []
					};
					
					// TODO find other way to differenciate standingOrderDataAccessRequest
					if ( this.request.url.search('standingOrderDataAccessRequest') < 0 )
					{
						// Simple or enhanced access request --> Fill EOProductURL parameter with the choosen products
						for ( var j=0; j<this.request.productURLs.length; j++ )
						{
							eoProductURLParameter.value.push( this.request.productURLs[j] );
						}
					}
					this.request.parameters.push(eoProductURLParameter);
				}
			}*/
		}

		return true;
	}
});

module.exports = SelectHostedProcessView;
});

require.register("jqm-config", function(exports, require, module) {
$(document).bind("mobileinit", function() {
	$.mobile.ignoreContentEnabled = true;
	$.mobile.ajaxEnabled = false;
	$.mobile.linkBindingEnabled = false;
	$.mobile.hashListeningEnabled = false;
	$.mobile.pushStateEnabled = false;
});
});

require.register("logger", function(exports, require, module) {
/** Console fix	: create a dummy console.log when console is not present. Otherwise it is not working on some browser configuration */
window.console || (console = {
	log: function() {}
});

// Store the opened popup in order to close it
// since jqm doesn't allow popup-chaining
var openedPopup;

module.exports = {
	error: function(message) {

		if (openedPopup)
			openedPopup.popup("close");

		console.log('Error : ' + message);
		// Create a pop-up to warn the user
		openedPopup = $('<div><p>Error : ' + message + '</p></div>')
			.appendTo('.ui-page-active')
			.popup({
				afterclose: function(event, ui) {
					$(this).remove();
					openedPopup = null;
				}
			})
			.popup('open');
	},

	inform: function(message) {

		if (openedPopup)
			openedPopup.popup("close");


		console.log(message);
		// Create a pop-up to warn the user
		openedPopup = $('<div><p>' + message + '</p></div>')
			.appendTo('.ui-page-active')
			.popup({
				afterclose: function(event, ui) {
					$(this).remove();
					openedPopup = null;
				}
			})
			.popup('open');
	},

	warning: function(message, object) {
		if (object != undefined) {
			console.log('Warning : ' + message, object);
		} else {
			console.log('Warning : ' + message);
		}

	},

	log: function(message, object) {
		if (object != undefined) {
			console.log('Log : ' + message, object);
		} else {
			console.log('Log : ' + message);
		}
	}
};
});

require.register("main", function(exports, require, module) {
/**
 * Main ngEO module
 */

"use strict";

var Configuration = require('configuration');
var MenuBar = require('ui/menubar');
var ContextHelp = require('ui/context-help');
var Logger = require('logger');

module.exports = {

	initialize: function init() {
		/** Use a defered object for document ready */
		var doc_ready = $.Deferred();

		// Remove history to avoid popups refreshing the page on close (related to migration of jqm from 1.2 to 1.3)
		// For more details see: http://stackoverflow.com/questions/11907944/closing-jquery-mobile-new-popup-cause-page-to-refresh-uselessly
		// TODO: find better solution
		$.mobile.popup.prototype.options.history = false;
		// Set it to false, to avoid breaking the route by Backbone
		$.mobile.hashListeningEnabled = false;

		// NGEO-1774: Check if the request contains "sharedUrl" parameter
		// TODO: Replace sharedUrl value by shared parameters to avoid another redirection
		var sharedUrlIndex = window.location.search.indexOf("sharedUrl=");
		if (sharedUrlIndex > 0) {
			// Redirect to the given shared url
			var sharedUrl = window.location.search.substr(sharedUrlIndex + "sharedUrl=".length);
			sharedUrl = decodeURIComponent(sharedUrl);
			window.location = sharedUrl;
		}

		/**
		 * When the document is ready and configuration is loaded load the rest of the application
		 */
		$.when(doc_ready, Configuration.load())
			.done(function() {

				// Update mailto coordinates
				$("body .contactUs").attr("href", "mailto:" + Configuration.get("mailto"));

				var Map = require('map/map');
				$.mobile.loading("show");

				// Remove some automatic styling from jQuery Mobile that don't fit in ngEO style
				$("body").removeClass("ui-mobile-viewport");
				$("header").find("a").removeClass("ui-link");
				// Initialize map
				Map.initialize("map");
				// Load the map module and initialize it

				// Initialize menu bar
				MenuBar.initialize("header nav");

				$.mobile.activePage.find('#helpToolbar').toolbar({
					onlyIcon: false
				});
				ContextHelp($.mobile.activePage);
			})
			.fail(function(jqXHR, textStatus, errorThrown) {
				Logger.error('Cannot load configuration : ' + errorThrown);
			});


		// When the document is ready, resolve the deferred object
		$(document).ready(doc_ready.resolve);
	}

};
});

require.register("search/dsa", function(exports, require, module) {
var Logger = require('logger');
var UserPrefs = require('userPrefs');
var MenuBar = require('ui/menubar');
var DatasetSearch = require('search/model/datasetSearch');
var DataSetPopulation = require('search/model/dataSetPopulation');
var DataSetAuthorizations = require('search/model/datasetAuthorizations');
var SearchResults = require('searchResults/model/searchResults');
var StandingOrderDataAccessRequest = require('dataAccess/model/standingOrderDataAccessRequest');
var DataSetSelectionView = require('search/view/datasetSelectionView');
var SearchCriteriaView = require('search/view/searchCriteriaView');
var StandingOrder = require('search/model/standingOrder');
var StandingOrderView = require('search/view/standingOrderView');

module.exports = {

	/**
	 * Initialize the search component for data-services-area.
	 *
	 * @param element 	The root element of the data-services-area
	 * @param router 	The data-services-area router
	 */
	initialize: function(element, router, panelManager) {

		// Create the main search view
		var datasetView = new DataSetSelectionView({
			model: DataSetPopulation
		});

		var datasetPopulationCallbacks = [];

		var onDatasetPopulationLoaded = function() {

			// Execute all registered callbacks
			for ( var i=0; i<datasetPopulationCallbacks.length; i++ ) {
				datasetPopulationCallbacks[i]();
			}

			$("#dataset").removeClass('ui-disabled');
			panelManager.on('leftResized', datasetView.updateContentHeight, datasetView);
			panelManager.left.add(datasetView, '#dataset');
			datasetView.render();
		};

		var onDatasetPopulationFailed = function() {
			if (dsaXHR.state() == "rejected") {
				Logger.error('Cannot retreive the DataSet Authorizations from the server');
				dspXHR.done(onDatasetPopulationLoaded);
			} else {
				$("#dataset").addClass('ui-disabled');
				Logger.error('Cannot retreive the DataSetPopulationMatrix and/or DataSet Authorizations from the server');
			}
		};

		// Fetch population and authorization from the server
		var dspXHR = DataSetPopulation.fetch();
		var dsaXHR = DataSetAuthorizations.fetch();

		$.when(dspXHR, dsaXHR).then(
			// Success
			onDatasetPopulationLoaded,
			// Error
			onDatasetPopulationFailed
		);

		// Create the view and append it to the panel manager
		var searchView = new SearchCriteriaView({
			model: DatasetSearch,
		});

		// Create the model for standing order		
		var standingOrder = new StandingOrder();

		// Create the standing order view and append it to the panel manager
		var standingOrderView = new StandingOrderView({
			model: standingOrder
		});

		panelManager.on('leftResized', searchView.updateContentHeight, searchView);
		panelManager.on('leftResized', standingOrderView.updateContentHeight, standingOrderView);
		panelManager.left.add(searchView, '#search');
		panelManager.left.add(standingOrderView, '#subscribe');
		searchView.render();
		standingOrderView.render();

		// Route search shared url
		router.route(
			"data-services-area/search?:query",
			"search",
			function(query) {
				// Query contains osParameters={...}, substr starting from "{"
				var sharedParameters = JSON.parse(query.substr(query.indexOf("{")));

				// Build dataset ids ta
				var datasetIds = _.keys(_.omit(sharedParameters, "commonCriteria"));

				// Variable used to count the number of fetched datasets
				var datasetsToBeFetched = datasetIds.length;

				// Show the page first
				MenuBar.showPage("data-services-area");

				// On dataset fetch callback
				var onFetch = function(dataset, status) {

					var datasetId = dataset.get('datasetId');
					if (status == "SUCCESS") {

						// Update datasetsearch from common criterias containing date&area + adv&do options of the given dataset
						var currentSharedParameters = sharedParameters['commonCriteria'];

						// Check if dataset has download or advanced options, add to shared params if so
						if ( sharedParameters[datasetId] )
							currentSharedParameters += "&" + sharedParameters[datasetId];
						DatasetSearch.populateModelfromURL(currentSharedParameters, datasetId);

						// Refresh the view
						searchView.refresh();

					} else {

						Logger.error('Cannot load the dataset ' + datasetId + '.<br> The search cannot be shared.');
						MenuBar.showPage("data-services-area");

					}

					// Unsubscribe onFetch event once there are no more shared datasets
					// to initialize
					if (--datasetsToBeFetched == 0) {
						DataSetPopulation.off("datasetFetch", onFetch);

						// Explicitely set start/stop dates to force the update of datetimeslider
						DatasetSearch.set({
							start: DatasetSearch.get('start'),
							stop: DatasetSearch.get('stop')
						});

						// And launch the search!
						SearchResults.launch(DatasetSearch);
						
						// Show search panel
						$('#search').click();
					}
				}

				datasetPopulationCallbacks.push(function() {
					DataSetPopulation.on("datasetFetch", onFetch);
					// Select & fetch all shared datasets
					_.each(datasetIds, function(id) {
						DataSetPopulation.select(id);
					});
				})
			});

		// Route standing order shared url
		router.route(
			"data-services-area/sto/:datasetId?:query",
			"sto",
			function(datasetId, query) {

				// Show the page first
				MenuBar.showPage("data-services-area");

				// Once dataset has been loaded, populate standing order's model
				DataSetPopulation.once("datasetFetch", function(dataset, status) {

					if (status == "SUCCESS") {

						standingOrder.populateModelfromURL(query);
						StandingOrderDataAccessRequest.populateModelfromURL(query, standingOrder);

						// Refresh the view
						standingOrderView.refresh();

						// Show standing order panel
						$('#subscribe').click();

					} else {

						Logger.error('Cannot load the dataset ' + dataset + '.<br> The standing order cannot be shared.');
						MenuBar.showPage("data-services-area");

					}
				});
				
				datasetPopulationCallbacks.push(function() {					
					// Set the datasetId from the URL, the dataset will be loaded, and if exists it will be initialized
					DataSetPopulation.select(datasetId);
				})

			});

		// Set the default route
		router.route(
			"data-services-area", "dsa",
			function() {

				datasetPopulationCallbacks.push(function() {
					// Select the dataset id stored in the prefs
					var prefsDS = UserPrefs.get("Dataset");
					if (prefsDS && prefsDS != "None" && _.isString(prefsDS)) {

						var datasets = prefsDS.split(',');
						for (var i = 0; i < datasets.length; i++) {
							DataSetPopulation.select(datasets[i]);
						}
					}
				});

				// Show the page
				MenuBar.showPage("data-services-area");

			});

		// Update interface when dataset selection has changed
		var onDatasetSelectionChanged = function(dataset) {
			var numDatasets = DatasetSearch.datasetIds.length;
			if (numDatasets == 0) {
				UserPrefs.save("Dataset", "None");

				$('#subscribe').addClass('ui-disabled');
				$('#search').addClass('ui-disabled');
			} else if (numDatasets == 1) {
				UserPrefs.save("Dataset", DatasetSearch.getDatasetPath());

				if (DataSetAuthorizations.hasDownloadAccess(DatasetSearch.getDatasetPath())) {
					$('#subscribe').removeClass('ui-disabled');
				} else {
					$('#subscribe').addClass('ui-disabled');
				}
				$('#search').removeClass('ui-disabled');
			} else {
				UserPrefs.save("Dataset", DatasetSearch.getDatasetPath());
				$('#subscribe').addClass('ui-disabled');
			}
		};

		DataSetPopulation.on("select", onDatasetSelectionChanged);
		DataSetPopulation.on("unselect", onDatasetSelectionChanged);

	},
};
});

require.register("search/model/dataSetPopulation", function(exports, require, module) {
var Configuration = require('configuration');
var DataSet = require('search/model/dataset');
var DataSetAuthorizations = require('search/model/datasetAuthorizations');

/**
 * Function to match a row from the matrix with the given filter
 */
var matchRow = function(filter, row) {
	for (var i = 0; i < filter.length; i++) {
		if (filter[i] && filter[i] != row[i]) {
			return false;
		}
	}
	return true;
};

/**
 * Small criteria structure
 */
var Criteria = function(name) {
	this.title = name;
	this.selectedValue = "";
	this.possibleValues = [];
};

Criteria.prototype.addValue = function(value) {
	if (value != '' && !_.contains(this.possibleValues, value)) {
		this.possibleValues.push(value);
	}
};

/**
 * Dataset population model 
 * Handled transparently the criteria received from the server.
 * Filters the datasets according to a criteria list
 */
var DataSetPopulation = Backbone.Model.extend({

	defaults: {
		criterias: null,
		matrix: null
	},

	// Constructor : initialize the url from the configuration
	initialize: function() {
		// The base url to retreive the datasets population matrix
		this.url = Configuration.baseServerUrl + '/datasetPopulationMatrix';
		this.selection = {};
		this.cache = {};
		this._usableForInterferomtry = {};
	},

	/**
	 * Fetch dataset
	 * Use a cache
	 */
	fetchDataset: function(datasetId, callback) {
		if (this.cache.hasOwnProperty(datasetId)) {
			if (callback) {
				callback(this.cache[datasetId]);
			}
		} else {
			var self = this;
			var dataset = new DataSet({
				datasetId: datasetId
			});
			dataset.fetch({
				success: function(model) {
					self.cache[datasetId] = model;
					callback(model);
				},
				error: function() {
					self.trigger('datasetFetch', datasetId, "ERROR");
				}
			});
		}
	},

	/**
	 * Select a dataset
	 */
	select: function(datasetId) {
		if (!this.selection.hasOwnProperty(datasetId)) {
			var self = this;
			this.fetchDataset(datasetId, function(model) {
				self.selection[datasetId] = model;
				self.trigger('select', model);
				self.trigger('datasetFetch', model, "SUCCESS");
			});
		}
	},

	/**
	 * Select exclusively a dataset
	 */
	selectExclusive: function(datasetId) {
		var prevSelection = this.selection;
		this.selection = {};
		for (var x in prevSelection) {
			this.trigger('unselect', prevSelection[x]);
		}
		this.select(datasetId);
	},

	/**
	 * Unselect a dataset
	 */
	unselect: function(datasetId) {
		if (this.selection.hasOwnProperty(datasetId)) {
			var dataset = this.selection[datasetId];
			delete this.selection[datasetId];
			this.trigger('unselect', dataset);
		}
	},

	/**
	 * Check if a dataset is usable by interferomretry
	 * See NGEOD-434
	 */
	usableForInterferometry: function(datasetId) {
		return this._usableForInterferomtry[datasetId];
	},

	/** 
	 * Parse the response from the server
	 * Row example: [ "", "", "Friendly ATS_TOA_1P", "", "false", "ATS_TOA_1P", "100" ],
	 *				[ criteria1, criteria2, ..., criteriaN, id, count ]
	 * Parse methode find special "name" criteria in response and put it in the end if exists
	 */
	parse: function(response) {

		var matrix = response.datasetpopulationmatrix.datasetPopulationValues;
		var criteriaTitles = response.datasetpopulationmatrix.criteriaTitles;
		var criterias = [];
		
		// See NGEOD-434
		// usableForInterferometry is stored in the criteria titles
		var usableForInterferomtryIndex = criteriaTitles.indexOf('usableForInterferometry');
		if (usableForInterferomtryIndex >= 0) {
			for (var n = 0; n < matrix.length; n++) {
				var row = matrix[n];
				this._usableForInterferomtry[row[row.length - 2]] = row[usableForInterferomtryIndex] == "true";
			}
		}
		
		// Special treatment for name : remove it as a criteria and push it at end in the matrix
		// <!> Modifies criteriaTitles length so must be executed after usableForInterferometry detection <!>
		var nameIndex = criteriaTitles.indexOf('name');
		if (nameIndex >= 0) {
			criteriaTitles.splice(nameIndex, 1);
			for (var n = 0; n < matrix.length; n++) {
				var row = matrix[n];
				row.push(row[nameIndex]);
				row.splice(nameIndex, 1);
			}
		}

		// Object which contains rows/keyword information to be able to filter dataset by criterias
		this.datasetInfoMap = {};

		// NGEO-2160 : Criterias are now build from "keyword" values
		this.keywordIndex = response.datasetpopulationmatrix.criteriaTitles.indexOf("keyword");
		for ( var i = 0; i < matrix.length; i++ ) {
			var datasetId = matrix[i][criteriaTitles.length];
			if ( !this.datasetInfoMap[datasetId] ) {
				this.datasetInfoMap[datasetId] = {
					rows: [],
					keywords: {}
				}
			}
			this.datasetInfoMap[datasetId].rows.push(matrix[i]);

			var keyword = matrix[i][this.keywordIndex].split(":"); // GROUP:VALUE
			// Continue if empty
			if ( keyword.length != 2 )
				continue;

			var criteria = _.findWhere(criterias, { "title": keyword[0] });
			if ( !criteria ) {
				criteria = new Criteria(keyword[0]);
				criterias.push(criteria);
			}
			criteria.addValue(keyword[1]);
			if ( !this.datasetInfoMap[datasetId].keywords[keyword[0]] )
				this.datasetInfoMap[datasetId].keywords[keyword[0]] = [];
			// Store group:value as a dictionary in datasetInfoMap
			this.datasetInfoMap[datasetId].keywords[keyword[0]].push(keyword[1]);
		}

		return {
			criterias: criterias,
			criteriaLength: criteriaTitles.length,
			matrix: matrix
		};
	},

	/**
	 *	Extract criteria values for the given datasets with the given criteria key
	 */
	filterCriteriaValues: function(datasets, criteria) {
		var criteriaValues = [];

		for ( var i = 0; i<datasets.length; i++ ) {
			var dataset = this.datasetInfoMap[datasets[i].datasetId];
			for ( var group in dataset.keywords ) {
				for ( var j = 0; j<dataset.keywords[group].length; j++ ) {
					var value = dataset.keywords[group][j];
					if ( group == criteria.title && (criteria.selectedValue == '' || criteria.selectedValue == value) && !_.contains(criteriaValues, value) ) {
						criteriaValues.push(value);
					}
				}
			}
		}
		return criteriaValues;
	},

	/**
	 *	Get user-friendly name for the given datasetId
	 */
	getFriendlyName: function(datasetId) {
		var idIndex = this.get('criteriaLength');
		var nameIndex = this.get('criteriaLength') + 2;

		var datasetRow = _.find(this.get('matrix'), function(row) { return row[idIndex] == datasetId } )
		return datasetRow[nameIndex] ? datasetRow[nameIndex] : datasetRow[idIndex];
	},

	/**
	 * Return the datasets filtered by the given filter
	 */
	filterDatasets: function(criteriaFilter) {

		var filteredDatasets = [];
		var treatedDatasets = {};

		// Keep the id and count index for the dataset population row
		var id_index = this.get('criteriaLength');
		var count_index = this.get('criteriaLength') + 1;
		var name_index = this.get('criteriaLength') + 2;

		// Process all grouped datasets
		for ( var datasetId in this.datasetInfoMap ) {

			var datasetInfos = this.datasetInfoMap[datasetId];
			var passedFilter = true;

			var selectedCriterias = _.filter(this.get('criterias'), function(o) { return o.selectedValue });
			if ( selectedCriterias.length ) {

				var row = datasetInfos.rows[0];
				// Need filter all the datasets
				for ( var i=0; i<selectedCriterias.length; i++ ) {
					var criteria = selectedCriterias[i];
					passedFilter &= _.contains(datasetInfos.keywords[criteria.title], criteria.selectedValue);
				}
			}

			if (passedFilter) {
				var row = datasetInfos.rows[0];
				// No need to filter take all the datasets
				filteredDatasets.push({
					datasetId: datasetId,
					tagFriendlyId: datasetId.replace(/\W/g,'_'),
					name: name_index < row.length ? row[name_index] : datasetId,
					itemsCount: row[count_index]
				})
			}
		}

		return filteredDatasets;
	},

});

module.exports = new DataSetPopulation();
});

require.register("search/model/dataset", function(exports, require, module) {
var Configuration = require('configuration');

var _ReservedNames = ['start', 'stop', 'geom', 'bbox', 'id', 'lat', 'lon', 'radius', 'rel', 'loc'];

var Dataset = Backbone.Model.extend({

	// Dataset attributes
	defaults: {
		description: "",
		keywords: null,
		downloadOptions: [],
		attributes: null,
		datasetId: "",
		startDate: null,
		endDate: null,
		validityEndDate: null,
		startIndex: 1
	},

	initialize: function() {
		// The base url to retreive the dataset Search Info
		this.url = Configuration.baseServerUrl + '/datasetSearchInfo/' + this.get('datasetId');
		this.listenTo(this, "error", this.onError);

		// NGEO-2171: datasetId can possibly have special characters so to use it as #id we need to remove them
		this.tagFriendlyId = this.get("datasetId").replace(/\W/g, '_'); // Used in HTML tag-id generation
	},

	/** 
	 * Call when the model cannot be fetched from the server
	 */
	onError: function(model, response) {
		if (response.status == 0) {
			location.reload();
		}
	},

	/**
	 * Check if the keywords exists
	 */
	hasKeyword: function(val) {
		return this.get('keywords').indexOf(val) >= 0;
	},

	/**
	 * Parse the response from server
	 */
	parse: function(response, options) {
		var resp = {};
		if (response.datasetSearchInfo) {
			resp.description = response.datasetSearchInfo.description;
			if (_.isArray(response.datasetSearchInfo.downloadOptions)) {
				// Remove reserved names
				resp.downloadOptions = _.reject(response.datasetSearchInfo.downloadOptions, function(o) {
					return _.contains(_ReservedNames, o.argumentName);
				});
			}
			if (_.isArray(response.datasetSearchInfo.attributes)) {
				// Remove reserved names
				resp.attributes = _.reject(response.datasetSearchInfo.attributes, function(a) {
					return _.contains(_ReservedNames, a.id);
				});
			}
			if (_.isArray(response.datasetSearchInfo.keywords)) {
				// 'Flattenize' the keyword array
				resp.keywords = _.pluck(response.datasetSearchInfo.keywords, 'keyword');
			}

			// Set the start/end date for the dataset, ensure there is always a valid time extent
			if (response.datasetSearchInfo.endDate) {
				resp.endDate = Date.fromISOString(response.datasetSearchInfo.endDate);
			} else {
				resp.endDate = new Date();
			}
			if (response.datasetSearchInfo.startDate) {
				resp.startDate = Date.fromISOString(response.datasetSearchInfo.startDate);
			} else {
				resp.startDate = new Date(resp.endDate.getTime());
				resp.startDate.setUTCFullYear(resp.endDate.getUTCFullYear() - 10);
			}

			if (response.datasetSearchInfo.validityEndDate) {
				resp.validityEndDate = Date.fromISOString(response.datasetSearchInfo.validityEndDate);
			} else {
				resp.validityEndDate = new Date(resp.endDate.getTime());
				resp.validityEndDate.setUTCFullYear(resp.endDate.getUTCFullYear() + 5);
			}

			if ( response.datasetSearchInfo.hasOwnProperty('startIndex') ) {
				resp.startIndex = response.datasetSearchInfo.startIndex;
			}
		}
		return resp;
	}

});

module.exports = Dataset;
});

require.register("search/model/datasetAuthorizations", function(exports, require, module) {
var Configuration = require('configuration');

/**
 * Dataset authorizations  
 */
var DataSetAuthorizations = Backbone.Model.extend({

	defaults: {
		authorizations: null,
	},

	// Constructor : initialize the url from the configuration
	initialize: function() {
		// The base url to retreive the datasets population matrix
		this.url = Configuration.baseServerUrl + '/datasetAuthorization';
	},

	// Parse the response
	parse: function(response) {

		return {
			authorizations: response.datasetAuthorisationInfo
		};
	},

	// Check if a dataset has search access
	hasSearchAccess: function(datasetId) {
		var auth = _.findWhere(this.get('authorizations'), {
			dataSetId: datasetId
		});
		return auth ? auth.searchAccessGranted == "YES" : true;
	},

	// Check if a dataset has download access
	hasDownloadAccess: function(datasetId) {
		var auth = _.findWhere(this.get('authorizations'), {
			dataSetId: datasetId
		});
		return auth ? auth.downloadAccessGranted == "YES" : true;
	},

	// Check browse authorization
	hasBrowseAuthorization: function(datasetId, layerName) {
		var auth = _.findWhere(this.get('authorizations'), {
			dataSetId: datasetId
		});
		if (!auth) {
			return true;
		}

		// Check viewAccessGranted : not in ICD but it is returned by WEBS so use it for now
		if (!_.isUndefined(auth.viewAccessGranted)) {
			return auth.viewAccessGranted == "YES";
		}

		// Use  browse layer authorizations (if it exists) to estimate view access
		var broweLayerAuthorizations = auth.browseLayerAuthorizations;
		if (!broweLayerAuthorizations || !_.isArray(broweLayerAuthorizations)) {
			return true;
		}

		for (var i = 0; i < broweLayerAuthorizations.length; i++) {
			if (broweLayerAuthorizations[i].browseLayerId == layerName) {
				return broweLayerAuthorizations[i].viewAccessGranted == "YES";
			}
		}
		return true;
	},

	// Check if a dataset has view access
	hasViewAccess: function(datasetId) {
		var auth = _.findWhere(this.get('authorizations'), {
			dataSetId: datasetId
		});
		if (!auth) {
			return true;
		}

		// Check viewAccessGranted : not in ICD but it is returned by WEBS so use it for now
		if (!_.isUndefined(auth.viewAccessGranted)) {
			return auth.viewAccessGranted == "YES";
		}

		// Use  browse layer authorizations (if it exists) to estimate view access
		var broweLayerAuthorizations = auth.browseLayerAuthorizations;
		if (!broweLayerAuthorizations || !_.isArray(broweLayerAuthorizations)) {
			return true;
		}

		var viewAccess = true;
		for (var i = 0; i < broweLayerAuthorizations.length; i++) {
			viewAccess &= broweLayerAuthorizations[i].viewAccessGranted == "YES";
		}
		return viewAccess;
	}

});

module.exports = new DataSetAuthorizations();
});

require.register("search/model/datasetSearch", function(exports, require, module) {
var Configuration = require('configuration');
var DatasetPopulation = require('search/model/dataSetPopulation');
var SearchCriteria = require('search/model/searchCriteria');


// A constant
var ONE_MONTH = 24 * 30 * 3600 * 1000;

/**
 * This class manages the criteria for search
 */
var DataSetSearch = SearchCriteria.extend({

	// Extend SearchCriteria defaults
	defaults: _.extend({}, SearchCriteria.prototype.defaults.call(this), {
		useTimeSlider: true, //flag for displaying time slider or not
		mode: "Simple",
		// Correlation/Interferometry parameters
		timeCover: [0, 30],
		spatialCover: 25,
		baseline: [0, 5],
		burstSync: [0, 100],
		master: ""
	}),

	name: "Search",

	/**
	 * Constructor
	 */
	initialize: function() {
		SearchCriteria.prototype.initialize.apply(this, arguments);

		// The array of selected dataset Ids
		this.datasetIds = [];

		// The array of slaves
		this.slaves = [];

		// The number of selected datasets
		this.numDatasets = 0;
	},

	/**
	 * Create the openSearch url. 
	 * The url contains spatial, temporal and search criteria parameters.
	 *
	 * @param options
	 *		<ul>
	 *			<li>format: atom or json</li>
	 *			<li>id: datasetId (optional, otherwise datasetIds will be used --> TODO: Explore this)</li>
	 *		</ul>
	 */
	getOpenSearchURL: function(options) {

		var url = Configuration.serverHostName + Configuration.baseServerUrl + "/catalogue/";
		var id = options.id;

		// Correlation/Interferometry
		if (this.get('mode') != "Simple") {

			url += this.get('master') + "/search?";
			url += this.getOpenSearchParameters(id);

			// Add interferometry specific parameters
			url += this.getInterferometryParameters(id);

		} else {
			// TODO !!!!!!
			var id = (options && options.hasOwnProperty('id')) ? options.id : this.datasetIds.join(',');
			url += id + "/search?";
			url += this.getOpenSearchParameters(id);
		}

		var format = (options && options.hasOwnProperty("format")) ? options.format : "json";
		url += "&format=" + format;

		return url;
	},

	/**
	 * @override TODO, think about how to manage this better
	 * Get the shared search URL
	 */
	getSharedSearchURL : function(){

		var url = "#data-services-area/search/" +  this.datasetIds.join(',') + '?';
		var sharedParameters = {};

		// Build shared open search parameters url for each dataset
		// since advanced&download options are independent between datasets
		for ( var i=0; i<this.datasetIds.length; i++ ) {
			var datasetId = this.datasetIds[i];
			//var osUrl = this.getOpenSearchParameters(datasetId);
			var osUrl = this.addAdvancedCriteria("", datasetId);
			osUrl = this.addDownloadOptions(osUrl, datasetId);

			// Remove the first "?" symbol
			osUrl = osUrl.substr(1);

			// Correlation/Interferometry
			if ( this.get('mode') != "Simple" ) {
				// Add interferometry specific parameters
				osUrl += "&dDiff=" + this.get('dDiff') + "&sOverP=" + this.get('sOverP') + "&nBase=" + this.get('nBase') + "&bSync=" + this.get('bSync');
				osUrl += "&mode=" + this.get('mode');
			}
			// Store open search url for the given datasetId
			sharedParameters[datasetId] = osUrl;
		}

		sharedParameters['commonCriteria'] = this.addGeoTemporalParams();
		
		return "#data-services-area/search?osParameters=" + escape(JSON.stringify(sharedParameters));
	},

	/**
	 *	Get interferometry/correlation parameters
	 */
	getInterferometryParameters: function(id) {
		var interferometryParams = "&timeCover=[" + this.get('timeCover') + "]&spatialCover=" + this.get('spatialCover') + "]&baseline=[" + this.get('baseline') + "]&burstSync=[" + this.get('burstSync') + "]";
		// Interferometry : only one dataset, correlation -> more than one(not implemented yet)
		var slaveUrl = Configuration.serverHostName + Configuration.baseServerUrl + "/catalogue/";
		slaveUrl += this.slaves + "/search?";
		slaveUrl += this.getOpenSearchParameters(id);

		// slaveUrl can be just a datasetId(not openSearch url)
		// slaveUrl = this.slaves;
		interferometryParams += "&correlatedTo=" + encodeURIComponent(slaveUrl) + "&corFunction=interferometry"; // OLD parameter: "with"

		return interferometryParams;
	},


	/**	
	 * Get the dataset path to build URLs
	 */
	getDatasetPath: function() {
		return this.get('mode') == "Simple" ? this.datasetIds.join(',') : this.get('master');
	},

	/**
	 * Compute the available date range from the selected datasets
	 */
	computeDateRange: function() {
		var dateRange = null;
		_.each(DatasetPopulation.selection, function(dataset) {
			if (!dateRange) {
				dateRange = {
					start: dataset.get('startDate'),
					stop: dataset.get('endDate')
					//validityStop: dataset.get('validityEndDate')
				};
			} else {
				if (dataset.get('startDate') < dateRange.start) {
					dateRange.start = dataset.get('startDate');
				}
				if (dataset.get('endDate') > dateRange.stop) {
					dateRange.stop = dataset.get('endDate');
				}
				// NGEO-1919: validityStop never used anymore
				// if (dataset.get('validityEndDate') > dateRange.validityStop) {
				// 	dateRange.validityStop = dataset.get('validityEndDate');
				// }
			}
		});

		this.set('dateRange', dateRange);
	},

	/**
	 * Set the master dataset for correlation/interferoemtry
	 */
	setMaster: function(val) {
		var i = this.datasetIds.indexOf(val);
		if (i >= 0) {
			this.slaves = this.datasetIds.slice(0);
			this.slaves.splice(i, 1);
			this.set('master', val);
		}
	},


	/**
	 * Set the mode for search : Simple, Correlation, Interferometry
	 */
	setMode: function(val) {

		if (val != 'Simple') {

			this.slaves = this.datasetIds.slice(0);
			var master = this.slaves.shift();

			// Take into account the case of interferometry/correlation on a single dataset
			if (this.slaves.length == 0) {
				this.slaves.push(master);
			}

			this.set('master', master);

		} else {

			this.set('master', '');
			this.slaves = "";

		}

		this.set('mode', val);
	},

	/**
	 * Check if interferometry is supported
	 */
	isInterferometrySupported: function() {

		if (this.datasetIds.length == 0) {
			return false;
		}

		if (this.datasetIds.length > 2) {
			return false;
		}

		for (var x in DatasetPopulation.selection) {
			var dataset = DatasetPopulation.selection[x];
			/* Old method to check if a dataset supports interferometry
			if ( !dataset.hasKeyword('interferometry') ) {
				return false;
			}*/

			// New method... use the criteria 'usableForInterferometry'
			if (!DatasetPopulation.usableForInterferometry(x)) {
				return false;
			}
		}

		return true;
	},

	/**
	 * Call when the dataset selection is changed
	 */
	onDatasetSelectionChanged: function(dataset) {

		// Recompute datasetIds parameter which is used in many places
		this.datasetIds = [];
		for (var x in DatasetPopulation.selection) {
			this.datasetIds.push(x);
		}

		// Use parent's onDatasetSelectionChanged implementation
		SearchCriteria.prototype.onDatasetSelectionChanged.call(this, dataset);

		// Recompute the date range
		this.computeDateRange();

		if (!this.get('dateRange'))
			return;

		// Compute a search time range from the dataset extent
		// The stop date is the dataset stop date
		var start = this.get('start');
		var stop = this.get('stop');
		var rangeStart = this.get('dateRange').start;
		var rangeStop = this.get('dateRange').stop;

		if (stop > rangeStop || start < rangeStart) {

			// Stop is current date, or dataset stop
			stop = new Date();
			if (stop < rangeStart) {
				stop = new Date(rangeStart.getTime() + ONE_MONTH);
			}

			if (stop > rangeStop) {
				stop = new Date(rangeStop.getTime());
			}

			// The start date is set to one month before the stop date (or the dataset start date if less than one month before)
			var diff = (rangeStop - rangeStart);
			if (diff > ONE_MONTH) {
				start = new Date(stop.getTime() - ONE_MONTH);
			} else {
				start = new Date(rangeStart.getTime());
			}

			// Reset start time
			start.setUTCHours(0);
			start.setUTCMinutes(0);
			start.setUTCSeconds(0);
			start.setUTCMilliseconds(0);

			// Reset stop time
			stop.setUTCHours(23);
			stop.setUTCMinutes(59);
			stop.setUTCSeconds(59);
			stop.setUTCMilliseconds(999);

			this.set({
				start: start,
				stop: stop
			});
		}

	}

});

module.exports = new DataSetSearch();
});

require.register("search/model/downloadOption", function(exports, require, module) {
/**
 *	Download option model contained by <DownloadOptions>
 *	
 *	@param parent
 *			Parent DownloadOptions model
 *	@param options
 *			Options initializing current download option
 *			Mandatory: argumentName, value
 *			Optionnal: caption, description, minOccurs, maxOccurs, preConditions, cropProductSearchArea
 */
var DownloadOption = function(parent, options) {
	this.parent = parent;

	this.argumentName = options.argumentName;
	this.caption = options.caption || "";
	this.description = options.description || "";
	this.minOccurs = options.hasOwnProperty("minOccurs") ? parseInt(options.minOccurs) : 1;
	this.maxOccurs = options.hasOwnProperty("maxOccurs") ? parseInt(options.maxOccurs) : 1;
	this.value = _.cloneDeep(options.value);
	this.preConditions = options.preConditions || null;

	// Special "crop" property
	this.cropProductSearchArea = options.hasOwnProperty("cropProductSearchArea") ? options.cropProductSearchArea : false;

	// Define the type of download option depending on minOccurs/maxOccurs
	this.type = (this.minOccurs == 1 && this.maxOccurs == 1) ? "select" :
				(this.minOccurs == 0 && this.maxOccurs == 1) ? "select-with-none" : "checkbox"

	// NGEO-2165: Add None value according to minOccurs & maxOccurs parameters
	if ( this.type == "select-with-none" ) {
		this.value.unshift({
			"humanReadable": "None",
			"name": "@none",
			"sizeFactor": 1
		});
	}
};

/**
 *   Get first valid value for the given option respecting the preconditions(coming from DownlaodOptions object)
 *
 *   @see NGEOD-729: Download options with pre-conditions
 */
DownloadOption.prototype.getValidValue = function() {
	var selectedValue = _.filter(this.value, function(v){ return Boolean(v.selected) == true; } );
	if ( this.type == "checkbox" ) {
		// Checkbox : return an array
		if ( selectedValue.length ) {
			var self = this;
			// Multiple value has been selected take only it names
			return _.filter(selectedValue, function(value) { return self.parent.hasValidPreconditions(value)}).map(function(value){return value.name});
		}

		// No value selected by default
		return [];
	} else {
		// Select : return a value
		if ( selectedValue.length == 1 && this.parent.hasValidPreconditions(selectedValue[0]) ) {
			return selectedValue[0].name;
		}
		
		// If selected isn't defined, get the first valid one
		for (var i = 0; i < this.value.length; i++) {
			var value = this.value[i];
			if (this.parent.hasValidPreconditions(value)) {
				return value.name;
			}
		}
	}

	return null;
}

module.exports = DownloadOption;
});

require.register("search/model/downloadOptions", function(exports, require, module) {
var DownloadOption = require('search/model/downloadOption');

/**
 *  Download options model
 */
var DownloadOptions = function(downloadOptions, options) {

	// TODO : refactor collection property, try to use Backbone.Collection object ?
	this.collection = [];
	this.attributes = {}; // Simplified form of currently visible options

	for (var i = 0; i < downloadOptions.length; i++) {
		var option = new DownloadOption(this, downloadOptions[i]);
		this.collection.push(option);

		if (options && options.init) {
			// Fill with valid values
			if (!option.cropProductSearchArea) {
				var selectedValue = option.getValidValue();
				this.setValue(option.argumentName, selectedValue);
			} else {
				this.setValue(option.argumentName, Boolean(option.cropProductSearchArea));
			}
		}
	}
};

/**
 * Static method allowing to extract download options from the given url
 */
DownloadOptions.extractParamsFromUrl = function(url) {

	var idx = url.indexOf("ngEO_DO={");
	if (idx >= 0) {
		// Case when ngEO_DO is present in url --> remove it
		url = url.substring(idx + 9, url.length - 1);
	}

	var res = {};
	// Extract keys/values from parameters
	var keys = url.match(/([\b\s\w]+):/gm);
	var parameters = [];
	for ( var j=0; j<keys.length-1; j++ ) {
		var current = url.substring(url.indexOf(keys[j]), url.indexOf(keys[j+1]) - 1);
		parameters.push(current);
	}
	parameters.push(url.substring(url.indexOf(keys[keys.length-1])))

	for ( var n = 0; n < parameters.length; n++ ) {
		var p = parameters[n].split(':');
		if (p.length != 2) 
			throw "Invalid OpenSearch URL : download option parameter " + parameters[n] + "not correctly defined."

		if ( p[1].indexOf("[") >= 0 ) {
			// Surround every item in array with '"' to be able to parse as JSON
			// WEBS spec rocks !
			p[1] = JSON.parse(p[1].replace(/([^,\[\]]*)/g, function(r, $1) { if (r){
				return '"'+$1+'"';
			} else {
				return "";
			} } ));
		}
		res[p[0]] = (p[0] == "cropProduct") ? true : p[1];
	}
	return res;
};


/**
 *	Populate download options object from the given url parameters
 *	@param urlParams Url parameters for ngEO_DO or the entire url containing ngEO_DO
 *		ex: {processing:RAW,Otherwise option:[val2,val3]}
 *		ex: http://ngeo?advancedProperties={}&ngEO_DO={key1:val1,key2:[val1,val2]}
 */
DownloadOptions.prototype.populateFromUrl = function(url) {

	// // Doesn't work !
	// // Use this regex to avoid splitting crop product
	// // which has multiple "," in it OR multiple values between  []
	// var commaNotBetweenParenthesisRe = new RegExp(/,(?!\(?[^\(\)]*\))(?!\[?[^,]*\])/g);
	// parameters = url.split(commaNotBetweenParenthesisRe);

	this.attributes = DownloadOptions.extractParamsFromUrl(url);
	// HACK: Set crop to false if doesn't exist in URL
	var cropDo = _.findWhere(this.collection, {cropProductSearchArea: "true"});
	if ( cropDo ) {
		this.attributes[cropDo.argumentName] = _.find(_.keys(this.attributes), function(p) { return p.indexOf("crop") >= 0 }) ? "true" : false;
	}
};

/**
 *  Update download options with the given options
 *	TODO: improve it
 */
DownloadOptions.prototype.updateFrom = function(downloadOptions) {
	this.collection = _.cloneDeep(downloadOptions.collection);
	this.attributes = _.cloneDeep(downloadOptions.attributes);
};

/**
 *  Set the attribute to the given value
 *  When null, delete the attribute from attributes
 */
DownloadOptions.prototype.setValue = function(attribute, value) {

	// Update download option "selected" attribute according to new value
	var doption = _.findWhere(this.collection, { "argumentName": attribute });
	if ( doption && doption.value ) {
		for ( var i=0; i<doption.value.length; i++ ) {
			var doptionValue = doption.value[i];
			if ( value && value.indexOf(doptionValue.name) != -1 ) {
				doptionValue.selected = true;
			} else {
				delete doptionValue.selected;
			}
		}
	}

	// Update attributes to hide attributes in form
	if (!value) {
		delete this.attributes[attribute]
	} else {
		this.attributes[attribute] = value;
	}
	this.updatePreconditions();
};

/**
 *  Get attributes filtering the null and conflict values
 */
DownloadOptions.prototype.getAttributes = function() {
	return _.omit(this.attributes, function(attr) {
		return attr == null || attr == "@conflict" || attr == "@none";
	});
};

/**
 *	Get currently selected download option values for the given download option
 */
DownloadOptions.prototype.getSelectedValues = function(doName) {
	var doption = _.findWhere(this.collection, {argumentName: doName});
	return _.filter(doption.value, function(v) { return v.selected == true; }).map(function(v) { return v.name });
};

/**
 *  Update model depending on its preconditions
 */
DownloadOptions.prototype.updatePreconditions = function() {
	var self = this;
	// Update model according to preconditions of each download option
	_.each(this.collection, function(option) {
		if (self.hasValidPreconditions(option)) {
			//var attributeToUpdate = _.findWhere( this.downloadOptions, { "argumentName": option.argumentName } );
			// cropProductSearchArea doesn't have any value
			if (!option.cropProductSearchArea) {
				var selectedValue = self.getSelectedValues(option.argumentName);
				if (selectedValue.length || self.attributes[option.argumentName] == "@conflict") {
					// Option has already the value set

					// Set valid value only in case when selected value is not in conflict and preconditions aren't respected
					// @see IICD-WC-WS 
					if (option.type == "checkbox") {
						// Checkboxes
						// Remove every invalid value
						var validOptions = _.filter(option.value, function(v) { return (v.selected && self.hasValidPreconditions(v)) })
						var newAttributes = validOptions.map(function(value) { return value.name });
						// TODO: refactor all this stuff from scratch...
						if ( newAttributes.length == 0 ) {
							delete self.attributes[option.argumentName];
						} else {
							self.attributes[option.argumentName] = newAttributes;
						}

					} else {

						// Check that set value respects it own preconditions
						var valueObject = _.findWhere(option.value, {
							name: selectedValue[0] // Select should have only one selected value
						});
						if (selectedValue != "@conflict" && valueObject && !self.hasValidPreconditions(valueObject)) {
							// Get the new random valid value
							self.attributes[option.argumentName] = option.getValidValue();
						} else {
							// Ensure that selected attribute is chosen
							self.attributes[option.argumentName] = selectedValue.length > 0 ? selectedValue[0] :
																							option.type == "select-with-none" ? '@none' : '@conflict'; // With none value
						}
					}

				} else {
					if ( option.type == "checkbox" ) {
						// Nothing to do
					} else {
						// Option respects the preconditions, update model with a valid value
						self.attributes[option.argumentName] = option.getValidValue();
					}
				}
			}
		} else {
			// Precondition isn't respected anymore, so we unset it from model
			delete self.attributes[option.argumentName];
		}
	});
};

/**
 *  Check if option/value has valid preconditions
 *  i.e. exist on object with the same value
 *
 *  @param param
 *      Could be value in "value" array, or option in downloadOptions
 *
 *  @see NGEOD-729: Download options with pre-conditions
 */
DownloadOptions.prototype.hasValidPreconditions = function(param) {
	if (!param.preConditions)
		return true;

	var self = this;
	var res = false;
	_.each(param.preConditions, function(precondition) {
		var doption = _.findWhere(self.collection, {argumentName: precondition.parentDownloadOption});
		if ( self.hasValidPreconditions(doption) ) {
			var doptionValue = _.findWhere(doption.value, {name: precondition.parentDownloadValue});
			res |= doptionValue.selected;
		}
		// res |= (self.attributes[precondition.parentDownloadOption] == precondition.parentDownloadValue);
	});
	return res;
};

/**
 *	Get parameters as a string {do1:value1,do2:value2,cropDo:searchArea-in-WKT}
 */
DownloadOptions.prototype.getParameters = function() {

	// CropProduct must be a WKT and not a boolean
	// NB: Use cropProductSearchArea to spot the argumentName of cropProduct
	var cropProductKey = _.find(this.collection, function(downloadOption) {
		return Boolean(downloadOption.cropProductSearchArea)
	});
	// TODO: resolve circular dependency
	var DataSetSearch = require('search/model/datasetSearch');
	var buildCropProduct = function(key, value) {
		if (cropProductKey && key == cropProductKey.argumentName && value === true) {
			value = DataSetSearch.searchArea.toWKT();
		}
		return value;
	};
	return JSON.stringify(this.getAttributes(), buildCropProduct).replace(/\"/g, ""); // No "" by spec;
};

/**
 * In case there are selected download options : 
 *      add download options to the given url by appending "&ngEO_DO={param_1:value_1,...,param_n:value_n} 
 *      to the url and returns the modified url.
 * otherwise : do not append "&ngEO_DO={} to the url 
 */
DownloadOptions.prototype.getAsUrlParameters = function() {
	var res = "";
	var values = this.getParameters();
	if (values != "{}") {
		res = "ngEO_DO="+values;
	}
	return res;
}

module.exports = DownloadOptions;
});

require.register("search/model/searchArea", function(exports, require, module) {
var Map = require('map/map');
var MapUtils = require('map/utils');
var GeoJSONConverter = require('map/geojsonconverter');
var Rectangle = require('map/rectangle');
var degreeConvertor = require('map/degreeConvertor');

function isValidLon(lon) {
	if (isNaN(lon))
		return false;

	return lon >= -180 && lon <= 180;
}

function isValidLat(lat) {
	if (isNaN(lat))
		return false;

	return lat >= -90 && lat <= 90;
}

var numberToString = function(number, precision) {
	if (typeof precision != 'undefined' && precision >= 0) {
		var factor = Math.pow(10, precision);
		return (Math.floor(number * factor) / factor).toString();
	} else {
		return number.toString();
	}
};

/**
 * An object to represent the search area
 */
var SearchArea = function() {

	/**
	 * Private variables
	 */

	// Search area is represented by a GeoJSON feature
	var _feature = {
		id: '0',
		bbox: [-180, -90, 180, 90],
		type: 'Feature',
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[-180, -90],
					[180, -90],
					[180, 90],
					[-180, 90],
					[-180, -90]
				]
			]
		},
		properties: {}
	};
	// The search area mode : BBOX or POLYGON
	var _mode = SearchArea.BBOX;

	/**
	 * Private methods
	 */

	// Update the feature when the mode or geometry has changed
	var _updateFeature = function() {
		if (_mode == SearchArea.BBOX) {

			// We really need to update the feature like that to be able to display wide rectangles, otherwise the shortest
			// segments will be taken..
			var rectangle = new Rectangle({
				west: _feature.bbox[0],
				south: _feature.bbox[1],
				east: _feature.bbox[2],
				north: _feature.bbox[3]
			});
			_feature.geometry.coordinates = rectangle.feature.geometry.coordinates;
			_feature.geometry.type = rectangle.feature.geometry.type;

			// Code hereafter doesn't really work, but should be.. improve it one day...
			// var rectangle = new Rectangle({
			// 	feature: _feature,
			// 	type: _feature.bbox[0] > _feature.bbox[2] ? "MultiLineString" : "Polygon"
			// });

		} else {
			// Compute the extent from the coordinates
			var coords = _feature.geometry.coordinates[0];
			var minX = coords[0][0];
			var minY = coords[0][1];
			var maxX = coords[0][0];
			var maxY = coords[0][1];
			for (var i = 1; i < coords.length; i++) {
				minX = Math.min(minX, coords[i][0]);
				minY = Math.min(minY, coords[i][1]);
				maxX = Math.max(maxX, coords[i][0]);
				maxY = Math.max(maxY, coords[i][1]);
			}
			_feature.bbox = [minX, minY, maxX, maxY];
		}
	};

	// Get a polygon from a layer
	var _getPolygonFromLayer = function(layer) {

		// First convert the layer to GeoJSON
		if (!GeoJSONConverter.toGeoJSON(layer)) {
			return {
				valid: false,
				message: 'format not supported or invalid.'
			};
		}

		var f;
		// Then check if the data is a feature collection or not
		if (layer.data.type == 'FeatureCollection') {
			if (layer.data.features.length == 1) {
				f = layer.data.features[0];
			} else {
				return {
					valid: false,
					message: 'file must have only one feature, ' + layer.data.features.length + ' found'
				};
			}
		} else {
			f = layer.data;
		}

		// Then check feature is geojson
		if (f.type != 'Feature') {
			return {
				valid: false,
				message: 'invalid feature'
			};
		}

		// Then check feature is polygon
		if (f.geometry.type != 'Polygon') {
			return {
				valid: false,
				message: 'feature must be a polygon'
			};
		}

		return {
			valid: true,
			feature: f
		};
	};

	// Get the mode for the search area
	this.getMode = function() {
		return _mode;
	};

	// Set the mode for the search area
	this.setMode = function(mode) {
		_mode = mode;
	};

	// Get the bbox as a object
	this.getBBox = function() {
		return {
			west: _feature.bbox[0],
			south: _feature.bbox[1],
			east: _feature.bbox[2],
			north: _feature.bbox[3]
		};
	};

	// Get the GeoJSON feature that represents the search area
	this.getFeature = function() {
		return _feature;
	};

	// Get the polygon text
	this.getPolygonText = function() {
		var coords = _feature.geometry.coordinates[0];
		var text = "";
		for (var i = 0; i < coords.length; i++) {
			text += degreeConvertor.toDMS(coords[i][1], true, {positionFlag: 'number'}) + " " + degreeConvertor.toDMS(coords[i][0], false, {positionFlag: 'number'}) + "\n";
		}
		return text;
	};

	//Transform to WKT
	//NGEO 509 : it is requested to rollback the changes !
	this.toWKT = function(precision) {

		var coords = _feature.geometry.coordinates;

		var param = "POLYGON(";
		if ( _feature.geometry.type == "MultiLineString" ) {
			// Create rectangle containing Polygon coordinates for the given feature
			var rectangle = new Rectangle({
				west: _feature.bbox[0],
				south: _feature.bbox[1],
				east: _feature.bbox[2],
				north: _feature.bbox[3],
				type: "Polygon"
			});
			coords = rectangle.feature.geometry.coordinates;
		} 

		// Convert polygon coordinates to WKT
		for (var j = 0; j < coords.length; j++) {
			if (j != 0) {
				param += ",";
			}
			param += "(";
			for (var i = 0; i < coords[j].length; i++) {
				if (i != 0) {
					param += ",";
				}
				param += numberToString(coords[j][i][0], precision) + " " + numberToString(coords[j][i][1], precision);
			}
			param += ")";
		}

		param += ")";

		return param;
	};

	// 	Get the opensearch parameter for the search area
	this.getOpenSearchParameter = function(precision) {
		var param;
		if (_mode == SearchArea.POLYGON) {
			// See http://www.opensearch.org/Specifications/OpenSearch/Extensions/Geo/1.0/Draft_2#The_.22geometry.22_parameter
			param = "geom=" + this.toWKT(precision);

		} else if (_mode == SearchArea.BBOX) {

			param = "bbox=" + numberToString(_feature.bbox[0], precision) + "," + numberToString(_feature.bbox[1], precision) + "," + numberToString(_feature.bbox[2], precision) + "," + numberToString(_feature.bbox[3], precision);
		}

		return param;
	};

	// Set an empty search area
	this.empty = function() {
		_feature.bbox = [0, 0, 0, 0];
		_feature.geometry.coordinates = [
			[
				[0, 0]
			]
		];
		_mode = SearchArea.EMPTY;
		_updateFeature();
	};

	// Set the BBox
	this.setBBox = function(bbox) {
		_feature.bbox = [bbox.west, bbox.south, bbox.east, bbox.north];
		_mode = SearchArea.BBOX;
		_updateFeature();
	};

	// Set the search area from a layer
	this.setFromLayer = function(layer) {
		var result = _getPolygonFromLayer(layer);
		if (result.valid) {
			_feature.geometry.coordinates = result.feature.geometry.coordinates;
			_mode = SearchArea.POLYGON;
			_updateFeature();
		}
		return result;
	};

	// Import polygon from text
	this.setPolygonFromText = function(text) {

		var coordinates = degreeConvertor.textToDecimalDegrees(text);
		if ( coordinates.length == 0 ) {
			this.empty();
			return false;
		}

		// Validate lon/lat values
		for ( var i=0; i<coordinates.length; i++ ) {
			if ( !isValidLon(coordinates[i][0]) || !isValidLat(coordinates[i][1]) ) {
				return false;
			}
		}
		
		// Close polygon if needed
		if (coordinates[0][0] != coordinates[coordinates.length - 1][0] || coordinates[0][1] != coordinates[coordinates.length - 1][1]) {
			coordinates.push(coordinates[0]);
		}
		_feature.geometry.coordinates = [coordinates];
		_mode = SearchArea.POLYGON;
		_updateFeature();
		return true;
	};

	// Import from WKT, POLYGON or MULTIPOLYGON
	this.setFromWKT = function(wkt) {
		var polygonRe = /POLYGON\(\(([^\)]+)\)\)/gm;
		var match = polygonRe.exec(decodeURIComponent(wkt));

		if (match) {
			data = match[1];
		} else {
			var multiPolygonRe = /MULTIPOLYGON\(\(\(([^\)]+)/gm;
			match = multiPolygonRe.exec(decodeURIComponent(wkt));
		}

		if (match) {
			var data = match[1];
			var strCoords = data.split(',');
			var coordinates = [];
			for (var i = 0; i < strCoords.length; i++) {
				var strLatLon = strCoords[i].split(/\s+/);
				var lat = parseFloat(strLatLon[1]);
				var lon = parseFloat(strLatLon[0]);
				coordinates.push([lon, lat]);
			}
			_feature.geometry.coordinates = [coordinates];
			_mode = SearchArea.POLYGON;
			_updateFeature();
		}
	};
};

SearchArea.BBOX = 0;
SearchArea.POLYGON = 1;
SearchArea.EMPTY = -1;


module.exports = SearchArea;
});

require.register("search/model/searchCriteria", function(exports, require, module) {
var Configuration = require('configuration');
var SearchArea = require('search/model/searchArea');
var DownloadOptions = require('search/model/downloadOptions');
var DatasetPopulation = require('search/model/dataSetPopulation');

function pad(num, size) {
	var s = num + "";
	while (s.length < size) s = "0" + s;
	return s;
}

// Helper function to convert a string in ISO format to date
Date.fromISOString = function(str) {

	var reDate = /(\d+)-(\d+)-(\d+)(?:T(\d+):(\d+)(?::(\d+)(?:.(\d+))?)?Z)?/;
	var match = reDate.exec(str);
	if (match) {
		// Hack to support bad date
		if (match[1].length < match[3].length) {
			var tmp = match[1];
			match[1] = match[3];
			match[3] = tmp;
		}

		// Need to cut the original precision to only first 3 digits since UTC constructor accepts milliseconds only in range between 0-999
		// @see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/UTC
		if (match[7] && match.length > 3) {
			match[7] = match[7].substr(0, 3);
		}

		var date = new Date(Date.UTC(match[1], match[2] - 1, match[3], match[4] || 0, match[5] || 0, match[6] || 0, match[7] || 0));

		return date;
	} else {
		throw "Invalid ISO date";
	}
};

// Helper function to convert a date to an iso string, only the date part
Date.prototype.toISODateString = function() {
	return this.getUTCFullYear() + "-" + pad(this.getUTCMonth() + 1, 2) + "-" + pad(this.getUTCDate(), 2);
};

// A constant
var ONE_MONTH = 24 * 30 * 3600 * 1000;

/**
 * This backbone model holds the search criteria attributes
 * Used as a base class for DatasetSearch & StandingOrder
 */
var SearchCriteria = Backbone.Model.extend({

	// Defaults is a function in aim to not share among instances
	defaults: function() {
		return {
			stop: new Date(),
			start: new Date(new Date().getTime() - ONE_MONTH),
			useExtent: true,
			advancedAttributes: {},
			downloadOptions: {}
		}
	},

	/**	
	 * Constructor
	 */
	initialize: function() {
		// The search area
		this.searchArea = new SearchArea();

		// Automatically load the dataset when the datasetId is changed
		this.listenTo(DatasetPopulation, 'select', this.onDatasetSelectionChanged);
		this.listenTo(DatasetPopulation, 'unselect', this.onDatasetSelectionChanged);
	},

	/**
	 * Get the url without base url with all search criteria
	 */
	getOpenSearchParameters: function(datasetId) {

		//add area criteria if set
		var params = this.addGeoTemporalParams();

		//always add the advanced criteria values selected and already set to the model
		params = this.addAdvancedCriteria(params, datasetId);

		//add the download options values selected and already set to the model
		params = this.addDownloadOptions(params, datasetId);

		//console.log("DatasetSearch module : getCoreURL method : " + url);

		return params;
	},

	/**
	 * Get the shared search URL
	 */
	getSharedSearchURL: function() {

		var url = "#data-services-area/search/" + this.getDatasetPath() + '?';
		url += this.getOpenSearchParameters();
		return url;
	},

	/**
	 * Populate the model with the parameters retrieved from the Shared URL
	 */
	populateModelfromURL: function(query, datasetId) {

		// Enhance bad queries case
		if ( query.charAt(0) == "?" || query.charAt(0) == "&" ) {
			query = query.substr(1);
		}

		var vars = query.split("&");

		// Force useExtent to false to avoid bug when setting the geometry
	    this.set('useExtent', false);

		for (var i = 0; i < vars.length; i++) {

			var pair = vars[i].split("=");
			if (pair.length != 2)
				throw "Invalid OpenSearch URL : parameter " + vars[i] + "not correctly defined."

			var key = pair[0];
	    	var value = pair[1];

			switch (key) {
				case "bbox":
					var coords = value.split(",");
					if (coords.length != 4)
						throw "Invalid OpenSearch URL : bbox parameter is not correct."
					this.searchArea.setBBox({
						west: parseFloat(coords[0]),
						south: parseFloat(coords[1]),
						east: parseFloat(coords[2]),
						north: parseFloat(coords[3])
					});
					break;
				case "geom":
					// TODO : check polygon is correct
					this.searchArea.setFromWKT(value);
					break;
				case "start":
					try {
						this.set('start', Date.fromISOString(value));
					} catch (err) {
						throw "Invalid OpenSearch URL : start parameter is not correct."
					}
					break;
				case "stop":
					try {
						this.set('stop', Date.fromISOString(value));
					} catch (err) {
						throw "Invalid OpenSearch URL : stop parameter is not correct."
					}
					break;

				case "ngEO_DO":
					var don = value.substr(1, value.length-2);
					var downloadOptions = this.get('downloadOptions')[datasetId];
					downloadOptions.populateFromUrl(don);
					// Force triggering since there is no set of 'downloadOptions'
					this.trigger("change:downloadOptions");
					break;


				default:
					if ( this.has(key) ) {
						// Interferometry parameters are stored directly on a model
						this.set(key, value);
					} else {
						// Check if Advanced attributes
						var advancedAttributes = this.get('advancedAttributes')[datasetId];
						var attributeToDefine = _.findWhere(advancedAttributes, {id: key});
						// Set parameter if it exists in advanced attribute of the given dataset
						// skip any other parameter
						if ( attributeToDefine ) {
							attributeToDefine.value = value;
							// Force triggering since object doesn't do it automatically
							this.trigger('change:advancedAttributes');
						}
					}
					break;
			}
		}

		// Manual trigger of a change:searchArea event because SearchArea is not (yet?) a Backbone model
		this.trigger('change:searchArea');

	},

	// Add date WITHOUT cf ngeo 368 time and area parameters
	addGeoTemporalParams: function() {

		var params = "start=" + this.get("start").toISOString() + "&" +
			"stop=" + this.get("stop").toISOString();

		var searchAreaParam = this.searchArea.getOpenSearchParameter(Configuration.get("search.geometryPrecision", 2));
		//if user has no search area parameter (for exmaple, in polygon mode, there are no area defined by user)
		//then do not provide search area criterion (issue NGEO-1723/NGEO-1394))		
		if (searchAreaParam)
			params += "&" + searchAreaParam

		//console.log("DatasetSearch module : addGeoTemporalParams : " + url);
		return params;
	},

	// Add advanced criteria to the given url
	addAdvancedCriteria: function(url, datasetId) {

		var self = this;
		// Get the advanced attributes corresponding to the datasetId
		// And append only the modified values(which contain "value" attribute)
		var advancedAttributes = this.get('advancedAttributes')[datasetId];
		if (advancedAttributes) {

			var values = [];
			_.each(advancedAttributes, function(attribute) {
				// Check if the avanced attribute has a value in the DatasetSearch
				if ( attribute.value ) {
					values.push( attribute.id + '=' + attribute.value );
				}
			});

			if ( values.length ) {
				// if ( url.indexOf("?") >= 0 ) {
		        	url += "&";
				// } else {
				// 	url += "?";
				// }
				url += values.join("&");
		    }
		}

		//console.log("DatasetSearch module : addAdvancedCriteria : " + url);
		return url;
	},

	/**
	 * In case there are selected download options : 
	 * 		add download options to the given url by appending "&ngEO_DO={param_1:value_1,...,param_n:value_n} 
	 * 		to the url and returns the modified url.
	 * otherwise : do not append "&ngEO_DO={} to the url 
	 */
	addDownloadOptions: function(url, datasetId) {

		var self = this;

		// Add the selected download options to the opensearch url
		var downloadOptionsStr = null;

		var downloadOptions = this.get('downloadOptions')[datasetId];
		if ( downloadOptions ) {
			var doUrl = downloadOptions.getAsUrlParameters();
			if ( doUrl ) {
				// if ( url.indexOf("?") >= 0 ) {
		        	url += "&";
				// } else {
				// 	url += "?";
				// }
				url += doUrl;
			}
		}
		//console.log("DatasetSearch module : addDownloadOptionsWithProductURIConvention : " + url);
		return url;
	},


	/**
	 * Get the selected download options as a json object.
	 * If the download options have been changed by the user, their are set as an attribute to the DatasetSearch
	 * otherwise the default value is got from the dataset.
	 */
	getSelectedDownloadOptions: function(dataset) {

		var selectedOptions = {};
		var datasetId = dataset.get("datasetId");
		var downloadOptions = this.get('downloadOptions')[datasetId];
		if ( downloadOptions ) {
			selectedOptions = downloadOptions.attributes;
		}
		return selectedOptions;
	},

	/**
	 *	Update advanced attributes & download options depending on dataset that has been changed
	 *	Overrided by DatasetSearch & StandingOrder objects
	 */
	onDatasetSelectionChanged : function(dataset) {

		var datasetId = dataset.get("datasetId");
		//console.log(datasetId + " : changed");
		if ( this.get("advancedAttributes")[datasetId] ) {
			// Already exists --> remove it
			delete this.get("advancedAttributes")[datasetId];
			delete this.get("downloadOptions")[datasetId];
		} else {
			this.get("advancedAttributes")[datasetId] = _.map(dataset.get("attributes"), _.clone);
			this.get('downloadOptions')[datasetId] = new DownloadOptions(dataset.get("downloadOptions"), {init: true});
		}
	}

});

module.exports = SearchCriteria;
});

require.register("search/model/standingOrder", function(exports, require, module) {
var Configuration = require('configuration');
var DatasetPopulation = require('search/model/dataSetPopulation');
var SearchCriteria = require('search/model/searchCriteria');


/**
 * Manage standing order criteria (except SchedulingOptions!)
 *
 */
var StandingOrder = SearchCriteria.extend({

	name: "Subscribe",

	/**	
	 * Constructor
	 */
	initialize: function() {

		SearchCriteria.prototype.initialize.apply(this, arguments);
		this.dataset = undefined;
	},

	/**	
	 * Get the dataset path to build URLs
	 */
	getDatasetPath: function() {
		return this.dataset ? this.dataset.get('datasetId') : "";
	},

	/**
 	 *	Populate model from URL only if dataset is defined
	 *	TODO: use SearchCriteria's method everytime : in other words,
	 *	this method mustn't be called if dataset isn't defined
	 */
	populateModelfromURL : function(query) {
		if ( this.dataset ) {
			SearchCriteria.prototype.populateModelfromURL.call(this, query, this.dataset.get("datasetId"));
		}
	},

	/**
	 * Create the openSearch url. 
	 * The url contains spatial, temporal and search criteria parameters.
	 */
	getOpenSearchURL: function(options) {

		var url = Configuration.serverHostName + Configuration.baseServerUrl + "/catalogue/";
		url += this.getDatasetPath() + "/search?";
		// TODO: should never happen.. check this more deeply
		if ( this.dataset )
			url += this.getOpenSearchParameters(this.dataset.get("datasetId"));

		var format = (options && options.hasOwnProperty("format")) ? options.format : "json";
		url += "&format=" + format;

		return url;
	},

	/**
	 *	Get selected download options for the selected dataset if exists
	 */
	getSelectedDownloadOptions : function() {
		if ( this.dataset ) {
			return SearchCriteria.prototype.getSelectedDownloadOptions.call(this, this.dataset);
		} else {
			return {};
		}
	},

	/** 
	 * Load the information for the selected dataset from the server
	 * unless if no dataset is selected set the dataset to undefined
	 */
	onDatasetSelectionChanged: function(dataset) {

		// Use parent's onDatasetSelectionChanged implementation
		SearchCriteria.prototype.onDatasetSelectionChanged.call(this, dataset);

		// Get the dataset : only one for standing order
		var datasets = _.values(DatasetPopulation.selection);
		if (datasets.length == 1) {
			this.dataset = datasets[0];
		} else {
			this.dataset = undefined;
		}

	}

});

module.exports = StandingOrder;
});

require.register("search/view/advancedSearchView", function(exports, require, module) {
var Configuration = require('configuration');
var advancedCriteria_template = require('search/template/advancedCriteriaContent');

var AdvancedSearchView = Backbone.View.extend({

	id: "advancedSearchView",

	/** 
	 * The model is the DatasetSearch (the search model containing search parameters)
	 * The dataset property of DatasetSearch is the Dataset backbone model containing the advanced criteria 
	 */

	initialize: function(options) {
		this.listenTo(this.model, 'change:advancedAttributes', this.render);
		this.dataset = options.dataset;
		this.advancedAttributes = this.model.get("advancedAttributes")[this.dataset.get("datasetId")];
	},

	events: {

		//catch the criterion range changes once the slider moving is finished
		'slidestop input': function(event) {
			this.setInputCriterionValues(event);
		},

		//catch the changes of criterion range and/or simple text values by entering values in the text field
		//do not use input 'change' event to avoid interference of handlers. 
		//In fact, when moving the slider change input event is triggered  
		//so this would make the handlers called twice.
		'blur input': function(event) {
			this.setInputCriterionValues(event);
		},

		// For every option modified by a select element
		'change select': function(event) {

			var name = event.currentTarget.id;
			var value = $(event.currentTarget).val();
			var attributeToUpdate = _.findWhere(this.advancedAttributes, {
				id: name
			});
			if ( value != "" ) {
				attributeToUpdate.value = value;
			} else {
				delete attributeToUpdate.value;
			}
		},

		// Update model values when checkbox has been clicked
		'change input[type="checkbox"]': function(event) {
			var isChecked = $(event.target).is(":checked");
			var name = $(event.currentTarget).attr('name')
			var newValue = $(event.target).val();
			var attributeToUpdate = _.findWhere(this.advancedAttributes, {
				id: name
			});

			var currentValue = attributeToUpdate.value;
			// Update the value
			if (isChecked) {

				// NGEO-2075: Surround value with quotes in case when value contains ","
				if (newValue.indexOf(",") != -1) {
					newValue = "\"" + newValue + "\"";
				}
				if (!currentValue) {
					currentValue = newValue;
				} else {
					currentValue += "," + newValue;
				}

				// Update attribute with new value
				attributeToUpdate.value = currentValue;

			} else {
				var currentValues = null;
				var hasQuotes = currentValue.indexOf("\"") >= 0;
				if ( hasQuotes ) {
					var regExp = new RegExp(/(\w{1,}[,-\s+\w{1,}]*)/g); // Take values with "," without quote sign
					currentValues = currentValue.match(regExp);
				} else {
					// Parameters without "," so split it as usual
					currentValues = currentValue.split(",");
				}

				currentValues = _.without(currentValues, newValue);

				// Re-surround array with quotes after "without" operation
				if ( hasQuotes ) {
					currentValues = currentValues.map(function(val){
						return "\"" + val + "\""; // NGEO-2075
					});
				}

				//set the new value or remove if empty
				if (currentValues.length == 0) {
					delete attributeToUpdate.value;
				} else {
					attributeToUpdate.value = currentValues.join(',');
				}
			}
		}
	},

	/**
	 * Update a range
	 */
	updateRange: function(name) {

		var $from = this.$el.find('#' + name + '_from');
		var $to = this.$el.find('#' + name + '_to');

		var from = $from.val();
		var to = $to.val();

		var attributeToUpdate = _.findWhere(this.advancedAttributes, {
			id: name
		});
		if (from == $from.attr('min') && to == $to.attr('max')) {
			delete attributeToUpdate.value;
		} else {
			var value = '[' + from + ',' + to + ']';
			attributeToUpdate.value = value;
		}
	},

	/**
	 * Handler called after a slideStop and blur events on an input field a criterion.
	 * handles range input changes and simple text field changes depending on the input id suffix
	 */
	setInputCriterionValues: function(event) {
		var name = event.currentTarget.id;
		if (name.match(/_from|_to/)) {
			name = name.replace(/_from|_to/, '');
			this.updateRange(name);
		} else {
			var attributeToUpdate = _.findWhere(this.advancedAttributes, {
				id: name
			});
			var value = $(event.currentTarget).val();
			attributeToUpdate.value = value;
		}

	},

	render: function() {
		var criterionLabels = Configuration.get("search.advancedCriteriaLabels", {});
		var content = advancedCriteria_template({
			advancedAttributes: this.model.get("advancedAttributes")[this.dataset.get("datasetId")],
			criterionLabels: criterionLabels,
			dataset: this.dataset,
			theme: Configuration.localConfig.theme
		});


		this.$el.html(content);
		this.$el.trigger('create');
		return this;
	}
});

module.exports = AdvancedSearchView;
});

require.register("search/view/boxView", function(exports, require, module) {
var Map = require('map/map');
var RectangleHandler = require('map/rectangleHandler');
var degreeConvertor = require('map/degreeConvertor');

function isValidLon(lon) {
	if (isNaN(lon))
		return false;

	return lon >= -180 && lon <= 180;
}

function isValidLat(lat) {
	if (isNaN(lat))
		return false;

	return lat >= -90 && lat <= 90;
}

/**
 * Will verify first if the value is a number or not,
 * if so then parse the value into float.
 * See issue NGEO-1370
 */
function filterFloat(value) {
	if (isNaN(value))
		return NaN;
	return parseFloat(value);
}

/**
 * The BoxView manages the view to define the search area as a box.
 * Embedded in the SpatialExtentView.
 */
var BoxView = Backbone.View.extend({

	// The model is a DatasetSearch

	// Constructor
	initialize: function(options) {
		this.parentView = options.parentView;

		// Listen when useExtent is changed to update the view
		this.model.on("change:useExtent", function() {
			var $cb = this.$el.find('.mapExtentCheckBoxLabel');
			var useExtent = $cb.hasClass('ui-checkbox-on');
			if (useExtent != this.model.get('useExtent')) {
				$cb.trigger('click');
			}
		}, this);
	},

	events: {
		'click #drawbbox': function(event) {
			this.model.set('useExtent', false);
			var self = this;
			var $button = $(event.target);
			$button.attr("disabled", "disabled").button("refresh");
			RectangleHandler.start({
				layer: this.parentView.searchAreaLayer,
				feature: this.model.searchArea.getFeature(),
				stop: function() {
					var bbox = self.model.searchArea.getBBox();

					bbox.south = Math.max(bbox.south, -90);
					bbox.north = Math.min(bbox.north, 90);
					self.model.searchArea.setBBox(bbox);
					self.updateInputs(bbox);

					$button.removeAttr("disabled").button("refresh");
				}
			});
		},

		//blur insure that values has been manually changed by the user
		//change the bbox in the model only and inly if it is valid
		'blur input': function(event) {

			var bbox = this.parseInputs();
			if (isValidLon(bbox.west) && isValidLon(bbox.east) &&
				isValidLat(bbox.south) && isValidLat(bbox.north)) {
				this.model.searchArea.setBBox(bbox);
			} else {
				bbox = this.model.searchArea.getBBox();
			}
			
			this.updateInputs(bbox);
			this.parentView.updateSearchAreaLayer();

		},

		'click .mapExtentCheckBoxLabel': function(event) {
			var $target = $(event.currentTarget);
			var useExtent = !($(event.currentTarget).hasClass('ui-checkbox-on'));
			this.model.set({
				"useExtent": useExtent
			}, {
				silent: true
			});
			if (useExtent) {
				this.activateUseExtent();
			} else {
				this.deactivateUseExtent();
			}
		},


	},

	// Update template inputs with the given bbox
	updateInputs: function(bbox) {
		this.$el.find("#west").val(degreeConvertor.toDMS(bbox.west, true, {positionFlag: "number"}));
		this.$el.find("#south").val(degreeConvertor.toDMS(bbox.south, false, {positionFlag: "number"}));
		this.$el.find("#east").val(degreeConvertor.toDMS(bbox.east, true, {positionFlag: "number"}));
		this.$el.find("#north").val(degreeConvertor.toDMS(bbox.north, false, {positionFlag: "number"}));
	},

	// Get decimal value for the given input
	getDecimal(value) {
		if ( value.indexOf("°") >= 0 || value.indexOf("'") >= 0 || value.indexOf("\"") >= 0) {
			return degreeConvertor.toDecimalDegrees(value);
		} else {
			return filterFloat(value);
		}
	},

	// Parse input returning the bbox
	parseInputs: function() {

		var west = this.$el.find("#west").val();
		var south = this.$el.find("#south").val();
		var east = this.$el.find("#east").val();
		var north = this.$el.find("#north").val();

		return {
			west: this.getDecimal(west),
			south: this.getDecimal(south),
			east: this.getDecimal(east),
			north: this.getDecimal(north)
		}
	},

	// Update from the model
	updateFromModel: function() {
		var bbox = this.model.searchArea.getBBox();
		this.updateInputs(bbox);
		
		// Update useExtent according to model
		// Used when clicked on "Get Criteria" importing the layer from gazetter
		// FIXME: find better solution..
		var mapExtent = Map.getViewportExtent();
		if ( mapExtent[0] != bbox.west || mapExtent[1] != bbox.south || mapExtent[2] != bbox.east || mapExtent[3] != bbox.north ) {
			this.model.set('useExtent', false);
		} else {
			this.model.set('useExtent', true);
		}
	},

	// Change the use extent
	onUseExtentChanged: function() {
		var $cb = this.$el.find('.mapExtentCheckBoxLabel');
		var useExtent = $cb.hasClass('ui-checkbox-on');
		if (useExtent != this.model.get('useExtent')) {
			$cb.trigger('click');
		}
	},

	activateUseExtent: function() {
		Map.on("extent:change", this.synchronizeWithMapExtent, this);
		this.synchronizeWithMapExtent();
		// Remove the search area layer when using extent
		if (this.parentView.searchAreaLayer) {
			Map.removeLayer(this.parentView.searchAreaLayer);
			this.parentView.searchAreaLayer = null;
		}
		this.$el.find("input").addClass("ui-disabled");
	},

	deactivateUseExtent: function() {
		Map.off("extent:change", this.synchronizeWithMapExtent, this);
		if (this.parentView.searchAreaLayer) {
			this.parentView.searchAreaLayer.clear(); // Remove all features before adding new layer
			this.parentView.searchAreaLayer = Map.addLayer(this.parentView.searchAreaLayer.params);
		}
		this.parentView.updateSearchAreaLayer();
		this.$el.find("input").removeClass("ui-disabled");
	},

	// Open the view
	open: function() {
		if (this.model.get("useExtent")) {
			this.activateUseExtent();
		} else {

			var bbox = this.parseInputs();
			this.model.searchArea.setBBox(bbox);
			this.parentView.updateSearchAreaLayer();
		}
		this.$el.show();
	},

	// Close the view
	close: function() {
		// Stop listening to map extent
		if (this.model.get("useExtent")) {
			this.deactivateUseExtent();
		}
		this.$el.hide();
	},

	// Synchronize map extent
	synchronizeWithMapExtent: function() {
		var mapExtent = Map.getViewportExtent();

		var bbox = {
			west: mapExtent[0],
			south: mapExtent[1],
			east: mapExtent[2],
			north: mapExtent[3]
		};
		this.model.searchArea.setBBox(bbox);

		this.updateInputs(bbox);
	}

});

module.exports = BoxView;
});

require.register("search/view/corrInterView", function(exports, require, module) {
//require('jqm-datebox');
//require('ui/dateRangeSlider');
var corrInterContent_template = require('search/template/corrInterContent');

/**
 * The backbone model is DatasetSearch
 */
var CorrInterView = Backbone.View.extend({

	// Events
	events: {
		"change #masterD": function(event) {
			this.model.setMaster($(event.currentTarget).val());
		},

		// Update model from sliders		
		"slidestop input": 'updateModel',
		// Update model from classic input on blur
		"blur input": 'updateModel'
	},

	// Update model properties from input
	updateModel: function(event) {
		var name = event.currentTarget.id;
		if (name.match(/_from|_to/)) {
			name = name.replace(/_from|_to/, '');
			this.updateRange(name);
		} else {
			this.model.set(name, $(event.currentTarget).val());
		}
	},

	// Update range
	updateRange: function(name) {
		var $from = this.$el.find('#' + name + '_from');
		var $to = this.$el.find('#' + name + '_to');

		var value = [$from.val(), $to.val()];
		this.model.set(name, value);
	},

	// Render the corr/infer view
	render: function() {
		var content = corrInterContent_template({
			model: this.model
		});
		this.$el.html(content);

		return this;
	}

});

module.exports = CorrInterView;
});

require.register("search/view/datasetSelectionView", function(exports, require, module) {
"use strict";

var Logger = require('logger');
var DatasetSearch = require('search/model/datasetSearch');
var DatasetAuthorizations = require('search/model/datasetAuthorizations');
var SearchResults = require('searchResults/model/searchResults');
var datasetsSelection_template = require('search/template/datasetsSelectionContent_template');
var datasetsList_template = require('search/template/datasetsListContent_template');

/**
 * The related model is DatasetsPopulationModel
 */
var DatasetSelectionView = Backbone.View.extend({

	/**
	 * Id for view div container
	 */
	id: 'datasetSelection',

	/**
	 * Events to manage on the view
	 */
	events: {

		'click li': function(event) {
			if (!$(event.target).hasClass('ui-icon')) {
				var datasetId = $(event.currentTarget).data("datasetid");
				this.model.fetchDataset(datasetId, function(model) {
					if (model.get('description')) {
						$('#dsPopupDescription').html('<p>' + model.get('description') + '</p>').popup('open', {
							positionTo: "#" + model.tagFriendlyId + " .ui-li-count"
						});
					}
				});
			}
		},

		'click .ui-icon': function(event) {
			var datasetId = $(event.currentTarget.parentElement).data("datasetid");
			if ($(event.currentTarget).hasClass("ui-icon-checkbox-off")) {
				this.model.select(datasetId);
			} else {
				this.model.unselect(datasetId);
			}
		},

		// Click on search
		"click #dsSearch": function(event) {
			SearchResults.launch(DatasetSearch);
		},

		'keyup [data-type="search"]' : 'filterDatasets',
		'change [data-type="search"]': 'filterDatasets'
	},

	/**
	 *	Filter dataset based on input
	 */
	filterDatasets: function(event) {
		var filter = $(event.target).val();

		// Set all datasets to visible
		var $liArray = this.$el.find('#datasetList li').removeClass('ui-screen-hidden')

		if ( filter != "" ) {
			// Hide all datasets with names which doesn't correspond to filter
			$liArray
				.find('.name')
				.filter(function(index, item) { return $(item).text().indexOf(filter) == -1; }).parent()
				.addClass('ui-screen-hidden');
		}
	},

	/**
	 * Constructor
	 */
	initialize: function() {

		this.filteredDatasets = [];

		this.listenTo(this.model, "select", this.onSelect);
		this.listenTo(this.model, "unselect", this.onUnselect);

		// Update the checkbox if no fetch possible
		this.listenTo(this.model, "datasetFetch", function(datasetId, status) {
			if (status == "ERROR") {
				Logger.error("Dataset " + datasetId + " is not available on the server.");
			}
		});
	},

	/**
	 * Call when a dataset is selected
	 */
	onSelect: function(dataset) {
		var $elt = this.$el.find('#' + dataset.tagFriendlyId + ' .ui-icon');
		$elt.removeClass("ui-icon-checkbox-off");
		$elt.addClass("ui-icon-checkbox-on");
	},

	/**
	 * Call when a dataset is unselected
	 */
	onUnselect: function(dataset) {
		var $elt = this.$el.find('#' + dataset.tagFriendlyId + ' .ui-icon');
		$elt.removeClass("ui-icon-checkbox-on");
		$elt.addClass("ui-icon-checkbox-off");
	},

	/**
	 * The template used to build the dataset list
	 */
	datasetsListTemplate: datasetsList_template,

	/**
	 * Call when the view is shown
	 */
	onShow: function() {
		this.updateContentHeight();
	},

	/**
	 * Call to set the height of content when the view size is changed
	 */
	updateContentHeight: function() {
		this.$el.find('#ds-content').css('height', this.$el.height() - this.$el.find('#ds-footer').outerHeight());
	},

	/**
	 * Render the view
	 */
	render: function() {

		//if datasets array has no items that means that the server has sent a response
		//since the fetch was a success (it is called from the dataseSelection widget).
		//However, there was problem since the datsets were not created. 
		if (!this.model.isValid()) {
			this.$el.append("<p>Error: There was a problem when creating the datasets.<p>");
			return this;
		}

		// Build the main content
		var mainContent = datasetsSelection_template(this.model);
		this.$el.append(mainContent);

		// Build the criteria select element and datasets list
		this.updateDatasetsList();
		this.updateSelectCriteria();

		this.$el.trigger('create');

		var self = this;

		//iterate on criteria to add a callback when the user selects a new criteria filter
		_.each(self.model.get('criterias'), function(criteria, index) {

			//bind a change event handler to the select id
			//Fixes the binding after the display of the widget in case of success
			self.$el.find("#criteria_" + index).change(function(event) {
				
				var value = $(this).val() ? $(this).val() : "";
				criteria.selectedValue = value;

				// Update datasets list and criteria according to the new criteria filter
				self.updateDatasetsList();
				self.updateSelectCriteria();
			});
		});

		return this;
	},

	/**
	 * Update the select elements for criterias with the given datasets
	 * The <option>'s should be updated according to filtered datasets
	 */
	updateSelectCriteria: function() {

		// Rebuilt the criterias to select
		var criterias = this.model.get('criterias');
		for (var i = 0; i < criterias.length; i++) {
			var criteria = criterias[i];
			var $selectCriteria = this.$el.find("#criteria_" + i);

			$selectCriteria.empty();
			$selectCriteria.append('<option value="">' + criterias[i].title + ' : None</option>');

			var criteriaValues = this.model.filterCriteriaValues( this.filteredDatasets, criteria );
			for (var j = 0; j < criteriaValues.length; j++) {

				// Add the option to the select element
				var $opt = $('<option value="' + criteriaValues[j] + '">' + criterias[i].title + ' : ' + criteriaValues[j] + '</option>')
					.appendTo($selectCriteria);

				// Add selected attr to option if is actually selected
				if (criteria.selectedValue == criteriaValues[j]) {
					$opt.attr('selected', 'selected');
				}
			}
		}

	},

	/** 
	 * Update only the list of datasets in the view 
	 */
	updateDatasetsList: function() {

		// Retrieve the datasets according to the current criteria
		var datasets = this.model.filterDatasets();

		// NGEO-2129: Sort by name
		datasets = _.sortBy(datasets, function(dataset) { return dataset.name.toLowerCase() });

		// Build the dataset list
		var $dslListContainer = this.$el.find("#datasetListContainer")
		var listContent = this.datasetsListTemplate({
			datasets: datasets
		});
		$dslListContainer.html(listContent);
		$dslListContainer.trigger('create');

		$dslListContainer.find('input[data-type="search"]').attr('placeholder', 'Filter on dataset names...');

		// Apply authorization
		// Warning : need to be done after jQuery Mobile has "enhanced" the markup otherwise images are not correctly placed
		for (var i = 0; i < datasets.length; i++) {
			if (!DatasetAuthorizations.hasDownloadAccess(datasets[i].tagFriendlyId)) {
				$('#' + datasets[i].tagFriendlyId).append('<img src="../images/nodownload.png" />');
			}
			if (!DatasetAuthorizations.hasViewAccess(datasets[i].tagFriendlyId)) {
				$('#' + datasets[i].tagFriendlyId).append('<img src="../images/noview.png" />');
			}
			if (!DatasetAuthorizations.hasSearchAccess(datasets[i].tagFriendlyId)) {
				$('#' + datasets[i].tagFriendlyId).addClass('ui-disabled');
			}
		}

		// Synchronize the selection with dataset list
		_.each(this.model.selection, function(dataset) {
			var $elt = $dslListContainer.find('#' + dataset.tagFriendlyId);
			if ($elt.length == 0) {
				this.model.unselect(dataset.tagFriendlyId);
				this.trigger("sizeChanged");
			} else {
				$elt.find('.ui-icon').addClass('ui-icon-checkbox-on');
				$elt.find('.ui-icon').removeClass('ui-icon-checkbox-off');
			}
		}, this);

		this.filteredDatasets = datasets;
	}

});

module.exports = DatasetSelectionView;
});

require.register("search/view/datasetView", function(exports, require, module) {
var Configuration = require('configuration');
var AdvancedSearchView = require('search/view/advancedSearchView');
var DownloadOptionsView = require('search/view/downloadOptionsView');
var OpenSearchURLView = require('search/view/openSearchURLView');
var datasetSearchContent_template = require('search/template/datasetSearchContent_template');
var DataSetPopulation = require('search/model/dataSetPopulation');
var DataSetSearch = require('search/model/datasetSearch');

/**
 * Dataset view containing the options related to selected dataset:
 *      Advanced options, Download options and opensearch url
 *
 * The model is a dataset
 */
var DatasetView = Backbone.View.extend({

    initialize: function(options) {
        this.dataset = options.dataset;
    },

    refresh: function() {
        this.advancedCriteriaView.render();
        this.downloadOptionsView.render();
        this.$el.trigger("create");
    },

    /**
     *  Appends ATOM url button to HTML header (after jqm transformation)
     */
    appendAtomUrl: function() {
        var self = this;
        var osAtomUrlBtn = '<div title="Atom feed" class="osAtomUrl"><div class="tb-icon"></div></div>';
        // Append Open Search Atom url invoker to accordion's header
        $(osAtomUrlBtn).appendTo(this.$el.find('.ui-collapsible-heading > a > span'))
            .click(function(event) {
                event.stopPropagation();
                // Generate link on fly since the DownloadOptions is not (yet) a backbone model
                var atomUrl = DataSetSearch.getOpenSearchURL({
                    id: self.dataset.get("datasetId"),
                    format: "atom"
                });
                window.open(atomUrl);
            });
    },

    /**
     *  Render
     */
    render: function() {

        var content = datasetSearchContent_template({
            dataset: this.dataset,
            name: DataSetPopulation.getFriendlyName(this.dataset.get("datasetId")),
            theme: Configuration.localConfig.theme
        });
        this.$el.append(content);

        this.advancedCriteriaView = new AdvancedSearchView({
            el: this.$el.find("#searchCriteria"),
            model: this.model,
            dataset: this.dataset
        });
        this.advancedCriteriaView.render();

        // Add download options view as a tab
        this.downloadOptionsView = new DownloadOptionsView({
            el: this.$el.find("#downloadOptions"),
            model: this.model.get("downloadOptions")[this.dataset.get("datasetId")]
        });
        this.downloadOptionsView.render();

        // OpenSearch URL view
        // this.openSearchURLView = new OpenSearchURLView({
        //     el: this.$el.find("#osUrl"),
        //     model: this.model
        // });
        // this.openSearchURLView.render();

        this.$el.trigger("create");

        // Since the html has been created, append atom feed button to header
        this.appendAtomUrl();

        // Update help labels
        this.$el
            .find("#sc-advanced-container h3 .ui-btn-inner").attr("data-help", Configuration.localConfig.contextHelp.advancedOptions).end()
            .find("#sc-do-container h3 .ui-btn-inner").attr("data-help", Configuration.localConfig.contextHelp.downloadOptions).end();
            //.find("#osUrl h3 .ui-btn-inner").attr("data-help", Configuration.localConfig.contextHelp.openSearch);
    },

    /**
     *  Remove current view
     */
    remove: function() {
        this.advancedCriteriaView.remove();
        this.downloadOptionsView.remove();
        // this.openSearchURLView.remove();
        Backbone.View.prototype.remove.apply(this);
    }

});

module.exports = DatasetView;
});

require.register("search/view/downloadOptionsView", function(exports, require, module) {
var downloadOptions_template = require('search/template/downloadOptionsContent');
var DatasetSearch = require('search/model/datasetSearch');
var Configuration = require('configuration');

/** 
 * The model is the DownloadOptions
 * There is another dependency on DatasetSearch (to be resolved later...)
 * The dataset property of DatasetSearch is the Dataset backbone model containing the download options
 */
var DownloadOptionsView = Backbone.View.extend({

	id: "downloadOptionsView",

	/**
	 *	@param options
	 *		<ul>
	 *			<li>updateCallback: {Function} If defined adds "Update" button to interface. The callback must be a deffered object.</li>
	 *		</ul>
	 */
	initialize: function(options) {
		this.listenTo(DatasetSearch, 'change:downloadOptions', this.onChangeDownloadOptions);
		this.updateCallback = options.hasOwnProperty('updateCallback') ? options.updateCallback : null;
	},

	events: {

		// For every option modified by a select element
		'change select': function(event) {

			var name = event.currentTarget.id;
			var value = $(event.currentTarget).val();
			this.model.setValue( name, value );
			var self = this;

			this.render();
		},

		// For input checkbox
		'change input': function(event) {
			var isChecked = $(event.target).is(":checked");
			var name = $(event.currentTarget).attr('name')
			var value = $(event.target).val();
			var currentValue = this.model.getSelectedValues(name);
			if ( !$(event.target).data("wkt") ) {
				if ( isChecked ) {
					if ( !currentValue ) {
						currentValue = [value];
					} else {
						currentValue.push(value);
					}
				} else {
					currentValue = _.without(currentValue, value);
					if ( currentValue.length == 0 ) {
						currentValue = null;
					}
				}
				this.model.setValue( name, currentValue );
			} else {
				this.model.setValue( name, isChecked ? true : null );
			}
			this.render();
		},
		
		// On update "event" handler
		'click #downloadOptionsUpdate': function(event) {
			if (this.updateCallback) {
				var self = this;
				this.updateCallback().done(function() {
					self.$el.find("#downloadOptionsMessage").empty();
					self.$el.find("#downloadOptionsMessage").append("<p>Download options updated.<p>");
				});	
			} 
		}
	},

	/**
	 *	Download options has changed
	 */
	onChangeDownloadOptions: function() {
		// console.log("ON CHANGE !");
		this.render();
	},

	/**
	 *	Render
	 */
	render: function() {

		var content = downloadOptions_template({
			model: this.model,
			updateCallback: this.updateCallback != null,
			theme: Configuration.localConfig.theme
		});
		var $prevForm = this.$el.find('> *');
		this.$el.attr('visiblity', 'none');
		this.$el.trigger('create');

		var self = this;
		// @see http://stackoverflow.com/questions/17003064/jquerymobile-uncaught-exception-when-removing-checkboxradio
		setTimeout(function() {
			$prevForm.remove();
			self.$el.append(content).removeAttr('visiblity');

			// Grey "Update" button in case if at least one @conflict option is selected
			if ( self.$el.find('option[value="@conflict"]').is(":selected") )
			{
				self.$el.find("#downloadOptionsUpdate").attr("disabled", "disabled");
			}
			self.$el.trigger('create');

		}, 1)

		return this;
	}

});

module.exports = DownloadOptionsView;
});

require.register("search/view/gazetteerView", function(exports, require, module) {
var Map = require('map/map');
var Gazetteer = require('map/gazetteer');

/**
 * The GazetteerView manages the view to define the search area using a gazetteer.
 * Embedded in the SpatialExtentView.
 */
var GazetteerView = Backbone.View.extend({

	// The model is a DatasetSearch

	// Constructor
	initialize: function(options) {
		this.parentView = options.parentView;
	},

	events: {
		'click #gazetteer-results li': function(event) {
			var $target = $(event.currentTarget);
			if (!$target.hasClass('ui-btn-active')) {
				this.selectGazetteerResult($target);
				Map.zoomTo(this.model.searchArea.getFeature().bbox);
			}
		},

		'change #search-gazetteer': function(event) {
			$('#gazetteer-results').empty();
			var queryTerm = $(event.currentTarget).val();
			if (queryTerm != "") {
				$('#search-gazetteer').textinput('disable');
				var self = this;
				Gazetteer.query({
					query: queryTerm,
					result: function(data) {

						$('#search-gazetteer').textinput('enable');
						//if no results are found clear the the search area layer
						if (data.length == 0) {
							self.model.searchArea.empty();
							self.parentView.updateSearchAreaLayer();
							return;
						}

						// Build a list view for the results
						var listView = $('<ul data-inset="true"></ul>');
						for (var i = 0; i < data.length; i++) {
							// Fix for Safari 5.x, do not use .class directly
							var fullName = data[i].display_name + ' (' + data[i]['class'] + ' ' + data[i].type + ')';
							$('<li>' + fullName + '</li>')
								// Store the data into the DOM element
								.data('data', data[i])
								.appendTo(listView);
						}
						listView
							.appendTo('#gazetteer-results')
							.listview();

						self.selectGazetteerResult($('#gazetteer-results').find('li:first'));
						Map.zoomTo(self.model.searchArea.getFeature().bbox);
					}
				});
			} else {
				this.model.searchArea.empty();
				this.parentView.updateSearchAreaLayer();
			}
		}

	},

	/**
	 * Select a gazetteer result given by its DOM element
	 * Update the model with bounding box of the gazetteer result and zoom on it.
	 */
	selectGazetteerResult: function($item) {
		if ($item.length == 0)
			return;

		$item.parent().find('.ui-btn-active').removeClass('ui-btn-active');
		$item.addClass('ui-btn-active');
		var data = $item.data('data');

		if (data.geotext) {
			this.model.searchArea.setFromWKT(data.geotext);
			this.parentView.updateSearchAreaLayer();
		} else {
			var south = parseFloat(data.boundingbox[0]);
			var north = parseFloat(data.boundingbox[1]);
			var west = parseFloat(data.boundingbox[2]);
			var east = parseFloat(data.boundingbox[3]);

			this.model.searchArea.setBBox({
				west: west,
				south: south,
				east: east,
				north: north
			});
			this.parentView.updateSearchAreaLayer();
		}
	},

	open: function() {
		var $item = $('#gazetteer-results').find('li.ui-btn-active');
		if ($item.length > 0) {
			this.selectGazetteerResult($item);
		} else {
			this.model.searchArea.empty();
		}
		this.parentView.updateSearchAreaLayer();
		this.$el.show();
	},

	close: function() {
		this.$el.hide();
	},


});

module.exports = GazetteerView;
});

require.register("search/view/importView", function(exports, require, module) {
var LayerImport = require('map/layerImport');

/**
 * The ImportView manages the view to define the search area using an imported layer.
 * Embedded in the SpatialExtentView.
 */
var ImportView = Backbone.View.extend({

	// The model is a DatasetSearch

	// Constructor
	initialize: function(options) {
		this.importedLayer = null;
		this.parentView = options.parentView;

		// Setup the drop area for import
		if (!LayerImport.isSupported()) {
			$('#import').html('<p class="ui-error-message"><b>Import is not supported by your browser.</b></p>');
		} else {
			LayerImport.addDropArea(this.$el.find('#dropZone').get(0), $.proxy(this.onFileLoaded, this));
		}
	},

	events: {

	},

	open: function() {
		// Restore the imported layer as search area
		if (this.importedLayer) {
			this.model.searchArea.setFromLayer(this.importedLayer);
		} else {
			this.model.searchArea.empty();
		}
		// Update the search area
		this.parentView.updateSearchAreaLayer();
		this.$el.show();
	},

	close: function() {
		this.$el.hide();
	},


	// Callback called when a file is loaded
	onFileLoaded: function(layer, file) {
		this.importedLayer = layer;
		var res = this.model.searchArea.setFromLayer(layer);
		if (!res.valid) {
			$('#importMessage').html('Failed to import ' + file.name + ' : ' + res.message + '.');
		} else {
			$('#importMessage').html("File sucessfully imported : " + file.name);
			this.parentView.updateSearchAreaLayer();
		}
	},

});

module.exports = ImportView;
});

require.register("search/view/openSearchURLView", function(exports, require, module) {
var Configuration = require('configuration');
var Logger = require('logger');
var DataSetPopulation = require('search/model/dataSetPopulation');


/**
 * The model for this view is a backbone model : SearchCriteria 
 */
var OpenSearchURLView = Backbone.View.extend({

	events: {
		// Update the search criteria from the OpenSearch URL
		"blur #osUrlText": function(event) {
			var newUrl = $(event.currentTarget).val();
			var prevUrl = this.model.getOpenSearchURL();
			if (newUrl != prevUrl) {
				this.applyOpenSearchUrl(newUrl);
			}
		}
	},

	/**
	 * Update the opensearch URL
	 */
	displayOpenSearchURL: function() {
		var url = this.model.getOpenSearchURL();
		this.$el.find("#osUrlText").val(url);
	},

	/**
	 * Apply a new OpenSearch URL to the view
	 */
	applyOpenSearchUrl: function(newUrl) {

		try {
			// Check if url is ok
			var re = new RegExp('^' + Configuration.serverHostName + Configuration.baseServerUrl + '/catalogue/([^/]+)/search\\?(.+)');
			var m = re.exec(newUrl);
			if (m) {
				// Url is ok, check if we need to change the dataset
				var datasetId = m[1];
				var currentDatasetId = this.model.getDatasetPath();

				if (datasetId == currentDatasetId) {
					// Directly populate the DatasetSearch with the URL parameters
					this.model.populateModelfromURL(m[2]);
				} else {
					// First wait for the new dataset to be loaded, otherwise fallback to previous dataset, and do not update the parameters
					DataSetPopulation.once("datasetFetch", function(dataset, status) {
						if (status == "SUCCESS") {
							this.model.populateModelfromURL(m[2]);
						} else {
							Logger.error("Invalid OpenSearch URL : cannot load the dataset " + datasetId + ".");
							this.model.set('datasetId', currentDatasetId);
						}
					}, this);
					DataSetPopulation.selectExclusive(datasetId);
				}
			} else {
				Logger.error("Invalid OpenSearch URL.");
			}

		} catch (err) {
			Logger.error("Invalid OpenSearch URL : " + err);
		}

	},

	/**
	 * Render the view
	 */
	render: function() {

		// Refresh the OpenSearch URL when the accordion is expand/collapse
		var self = this;
		this.$el.parent()
			.bind('collapse', function() {
				self.stopListening(self.model, 'change', self.displayOpenSearchURL);
			})
			.bind('expand', function() {
				self.displayOpenSearchURL();
				self.listenTo(self.model, 'change', self.displayOpenSearchURL);
			});

		return this;
	}

});

module.exports = OpenSearchURLView;
});

require.register("search/view/polygonView", function(exports, require, module) {
var Map = require('map/map');
var PolygonHandler = require('map/polygonHandler');
var degreeConvertor = require('map/degreeConvertor');

/**
 * The PolygonView manages the view to define the search area as a polygon.
 * Embedded in the SpatialExtentView.
 */
var PolygonView = Backbone.View.extend({

	// The model is a DatasetSearch

	// Constructor
	initialize: function(options) {
		this.searchArea = options.searchArea;
		this.parentView = options.parentView;
	},

	events: {

		'click #drawpolygon': function(event) {
			this.$el.find('#polygonTextError').hide();
			var self = this;
			$button = $(event.target);
			$button.attr("disabled", "disabled").button("refresh");
			PolygonHandler.start({
				layer: this.parentView.searchAreaLayer,
				feature: this.model.searchArea.getFeature(),
				stop: function() {
					$button.removeAttr("disabled").button("refresh");
					self.$el.find('#polygontext').val(self.model.searchArea.getPolygonText()).keyup();
					self.model.searchArea.setMode(1);
				}
			});
		},

		'focus #polygontext': function(event) {
			this.$el.find('#polygonTextError').hide();
		},

		'change #polygontext': function(event) {
			var text = $(event.currentTarget).val();
			if (/[a-zA-Z]+/.exec(text) || !this.model.searchArea.setPolygonFromText(text)) {
				// Restore input
				this.updateFromModel();
				// Erase content
				//$(event.currentTarget).val('');
				this.$el.find('#polygonTextError')
					.html("Please enter valid coordinates : D°M'S\"")
					.show();
			} else {
				// Format the entered values to DMS (in case when decimal values were entred)
				// NB: can't use update from model due to precision issue...
				var positions = text.trim().split('\n');
				res = "";
				for ( var i=0; i<positions.length; i++ ) {
					var position = positions[i].split(" ");
					res += this.getDMS(position[0] + " ");
					res += this.getDMS(position[1]) + "\n";
				}
				this.$el.find('#polygontext').val(res);
			}
			this.parentView.updateSearchAreaLayer();

		},

	},

	// Get DMS-formatted value
	getDMS(value) {
		if ( value.indexOf("°") >= 0 || value.indexOf("'") >= 0 || value.indexOf("\"") >= 0) {
			return value;
		} else {
			return degreeConvertor.toDMS(value);
		}
	},

	// Update from the model
	updateFromModel: function() {
		this.$el.find('#polygontext').val(this.model.searchArea.getPolygonText()).keyup();
	},

	// Open the view : show it and update the model
	open: function() {
		var text = this.$el.find('#polygontext').val();
		this.$el.find('#polygonTextError').hide();
		this.model.searchArea.setPolygonFromText(text);
		this.parentView.updateSearchAreaLayer();
		this.$el.show();
	},

	// Close the view : hide it
	close: function() {
		this.$el.hide();
	},

});

module.exports = PolygonView;
});

require.register("search/view/schedulingOptionsView", function(exports, require, module) {
var Configuration = require('configuration');
//require('jqm-datebox');
var schedulingOptions_template = require('search/template/schedulingOptions_template');

/**
 * This view handles the displaying of standing orders request parameters.
 * The attribute request is the request to be submitted.
 */
var SchedulingOptionsView = Backbone.View.extend({

	initialize: function(options) {
		this.request = options.request;
		this.parentWidget = options.parentWidget;
	},

	events: {

		'change #startDateSTO': function(event) {
			var date = $(event.currentTarget).val();
			this.request.startDate = Date.fromISOString(date + "T00:00:00.000Z");
			// NGEO-1814: Change of scheduling options start date must not affect the opensearch request date
			//this.model.set({"start" : Date.fromISOString(date+"T00:00:00.000Z")});
		},

		'change #endDateSTO': function(event) {
			var date = $(event.currentTarget).val();
			this.request.endDate = Date.fromISOString(date + "T23:59:59.999Z");
			// NGEO-1814: Change of scheduling options end date must not affect the opensearch request date
			//this.model.set({"stop" : Date.fromISOString(date+"T23:59:59.999Z")});
		},

		// Choose STO type : Data-driven or Time-driven
		'change input[name="STOType"]': function(event) {

			// Update the visibility of time-driven-element
			var timeDrivenElt = this.$el.find("#timeDrivenParams");
			if (event.currentTarget.id == "time-driven-input") {
				// Set standing order request type
				this.request.timeDriven = true;
				timeDrivenElt.show();
			} else { //click on the Data-driven radio button
				this.request.timeDriven = false;
				timeDrivenElt.hide();
			}
		},

		// Set repeat period
		'change #repeatPeriodInput': function(event) {
			this.request.repeatPeriod = $(event.currentTarget).val();
		},

		// Set slide time
		'change input#applyShiftCheckBox': function(event) {
			this.request.slideAcquisitionTime = $(event.target).is(':checked');
		}

	},

	/**
	 * Render the view
	 */
	render: function() {
		// Get the default values from the model
		var content = schedulingOptions_template(this.request);
		this.$el.html(content);
		this.$el.find("#standingOrderSpecificMessage").append(this.request.getSpecificMessage());
		if (!this.request.timeDriven) {
			this.$el.find("#timeDrivenParams").hide();
		}
		this.$el.trigger('create');
		return this;
	}

});

module.exports = SchedulingOptionsView;
});

require.register("search/view/searchCriteriaView", function(exports, require, module) {
var Configuration = require('configuration');
var Logger = require('logger');
var SearchView = require('search/view/searchView');
var SearchResults = require('searchResults/model/searchResults');
var CorrInterView = require('search/view/corrInterView');
var DatasetView = require('search/view/datasetView');
var SharePopup = require('ui/sharePopup');
var DataSetPopulation = require('search/model/dataSetPopulation');
var searchCriteria_template = require('search/template/searchCriteriaContent_template');


/**
 * The model for this view is a backbone model : DatasetSearch 
 */
var SearchCriteriaView = SearchView.extend({

	/**
	 * Id for view div container
	 */
	id: "datasetSearchCriteria",

	initialize: function() {
		SearchView.prototype.initialize.apply(this);
		this.listenTo(DataSetPopulation, 'select', this.onDatasetSelected );
		this.listenTo(DataSetPopulation, 'unselect', this.onDatasetUnselected );

		// Table containing the views which are dynamically added depending on selected datasets
		this.datasetDependingViews = {};
	},

	refresh: function() {
		for ( var x in this.datasetDependingViews ) {
			this.datasetDependingViews[x].refresh();
		}
	},

	onDatasetSelected: function(dataset) {
		var datasetView = new DatasetView({
			model: this.model,
			dataset: dataset
		});
		this.$el.find(".datasetSearch").append( datasetView.el );
		datasetView.render();
		this.$el.trigger("create");
		// Store the view to be able to remove later
		this.datasetDependingViews[dataset.get("datasetId")] = datasetView;
	},

	onDatasetUnselected: function(dataset) {
		var datasetId = dataset.get("datasetId");
		this.datasetDependingViews[datasetId].remove();
		delete this.datasetDependingViews[datasetId];
	},

	events: {
		// Click on search
		"click .scSubmit": function(event) {
			var rangeIsValid = this.model.get("start") <= this.model.get("stop");
			if (rangeIsValid) {
				SearchResults.launch(this.model);
			} else {
				// Prevent user that the range isn't valid
				$("#dateWarningPopup")
					.popup("open");
			}
		},

		// To share a search
		"click #share": function() {
			SharePopup.open({
				openSearchUrl: this.model.getOpenSearchURL({
					format: "atom"
				}),
				url: Configuration.serverHostName + (window.location.pathname) + this.model.getSharedSearchURL(),
				positionTo: this.$el.find('#share')[0]
			});
		},

		// To change the mode between simple, correlation and interferometry
		"change #sc-mode": function() {
			var value = this.$el.find('#sc-mode').val();

			// Remove previous accordion and view if any
			this.$el.find('#sc-corrinf-container').remove();
			if (this.corrInterView) {
				this.corrInterView.remove();
				this.corrInterView = null;
			}

			//this.model.set("mode",value);
			this.model.setMode(value);

			// Add the accordion for correlation/inteferometry
			if (value != "Simple") {
				this.$el.find('#sc-area-container').after(
					'<div id="sc-corrinf-container" data-role="collapsible" data-inset="false" data-mini="true">\
						<h3>' + value + '</h3>\
						<div id="sc-corrinf">	</div>\
					</div>'
				);

				this.corrInterView = new CorrInterView({
					el: this.$el.find("#sc-corrinf"),
					model: this.model
				});
				this.corrInterView.render();

			}
			this.$el.find('#sc-content').trigger('create');
			this.$el.find('#sc-corrinf-container h3 .ui-btn-inner').attr('data-help', Configuration.localConfig.contextHelp.interferometry);

		},
	},

	/**
	 * Update the Select to choose the search mode (Simple, Correlation or Interferometry)
	 */
	updateSelectMode: function() {

		this.$el.find('#sc-corrinf-container').remove();
		this.$el.find('#sc-mode-containter').remove();

		// Only interferometry supported for Task4
		//if ( this.model.datasetIds.length > 1 && this.model.datasetIds.length <= 4 ) {
		if (this.model.isInterferometrySupported()) {

			var $mode = $('<div id="sc-mode-containter" data-role="fieldcontain">\
				<label for="sc-mode">Mode: </label>\
				<select id="sc-mode" data-mini="true">\
					<option value="Simple">Simple</option>\
					<option value="Interferometry">Interferometry</option>\
				</select>\
			</div>');

			/*// Check correlation and interferometry
			if ( this.model.datasetIds.length == 2 ) {
				$mode.find('#sc-mode').append('<option value="Interferometry">Interferometry</option>');
			}*/

			this.$el.find('#sc-content')
				.prepend($mode)
				.trigger('create');
		}

	},

	/**
	 * Call when the view is shown
	 */
	onShow: function() {
		this.updateSelectMode();
		if (this.model.get("useTimeSlider") && _.keys(self.selection).length != 0) {
			$('#dateRangeSlider').dateRangeSlider('show'); // Assuming that there is only one slider on page
			//this.dateCriteriaView.addTimeSlider();
		}
		SearchView.prototype.onShow.apply(this);
	},

	/**
	 * Render the view
	 */
	render: function() {

		var content = searchCriteria_template({
			submitText: "Search",
			useDate: true
		});
		this.$el.append(content);

		SearchView.prototype.render.apply(this);

		// Update the date view when the dateRange is changed
		this.dateCriteriaView.listenTo(this.model, "change:dateRange", this.dateCriteriaView.updateDateRange);

		return this;
	}

});

module.exports = SearchCriteriaView;
});

require.register("search/view/searchView", function(exports, require, module) {
var Configuration = require('configuration');
var SpatialExtentView = require('search/view/spatialExtentView');
var TimeExtentView = require('search/view/timeExtentView');
var DataSetPopulation = require('search/model/dataSetPopulation');

/**
 * Basic search view designed to contain the common parts between StandingOrder or SearchCriteriaView
 * So the backbone model for this view can be : DatasetSearch or StandingOrder respectively
 */
var SearchView = Backbone.View.extend({

	initialize: function() {
		this.dateCriteriaView = null;
		this.areaCriteriaView = null;
	},

	/**
	 * Call to set the height of content when the view size is changed
	 */
	updateContentHeight: function() {
		this.$el.find('#sc-content').css('height', this.$el.height() - this.$el.find('#sc-footer').outerHeight());
	},

	/**
	 * Call when the view is shown
	 */
	onShow: function() {
		this.updateContentHeight();
		if ( this.areaCriteriaView.searchAreaLayer ) {
			this.areaCriteriaView.searchAreaLayer.setVisible(true);
		}
	},

	/**
	 *	Call when the view is hidden
	 */
	onHide: function() {
		if ( this.areaCriteriaView.searchAreaLayer ) {
			this.areaCriteriaView.searchAreaLayer.setVisible(false);
		}
	},

	/**
	 * Render the view
	 */
	render: function() {

		// Create the views for each criteria : time, spatial and opensearch url view
		this.dateCriteriaView = new TimeExtentView({
			el: this.$el.find("#date"),
			hasTimeSlider: this.model.name == "Search" ? true : false, // Standing order date doesn't have timeslider !
			model: this.model
		});
		this.dateCriteriaView.render();

		this.areaCriteriaView = new SpatialExtentView({
			el: this.$el.find("#area"),
			searchCriteriaView: this,
			model: this.model
		});
		this.areaCriteriaView.render();

		this.$el.trigger('create');

		// Init help attributes on created jqm composants
		this.$el.find("#sc-date-container h3 .ui-btn-inner").attr("data-help", Configuration.localConfig.contextHelp.date).end()
			.find("#sc-area-container h3 .ui-btn-inner").attr("data-help", Configuration.localConfig.contextHelp.area).end()

		return this;
	}

});

module.exports = SearchView;
});

require.register("search/view/spatialExtentView", function(exports, require, module) {
var Map = require('map/map');
var BoxView = require('search/view/boxView');
var PolygonView = require('search/view/polygonView');
var GazetteerView = require('search/view/gazetteerView');
var ImportView = require('search/view/importView');
var areaCriteria_template = require('search/template/areaCriteriaContent');

/**
 * The SpatialExtentView manages the different views to define the search area (or zone of interest).
 * The model of this view is DatasetSearch or StandingOrder
 */
var SpatialExtentView = Backbone.View.extend({

	// Constructor
	initialize: function(options) {

		this.searchAreaLayer = null;
		this.mode = "bbox";

		// Listen when the searchArea has changed to update the view
		this.model.on("change:searchArea", this.onModelChanged, this);
	},

	// Events
	events: {
		'change #toolsChoice': function(event) {
			var val = $(event.currentTarget).find('input:radio:checked').val();

			this.tools[this.mode].close();
			this.tools[val].open();

			this.mode = val;
		}
	},

	/**
	 * Update the search area layer
	 */
	updateSearchAreaLayer: function() {
		// Create the layer if not already done
		if (!this.searchAreaLayer) {
			// Create a layer for the search area
			var searchAreaParams = {
				name: this.model.name + " Area",
				type: "Feature",
				visible: true,
				style: "search-area",
				greatCircle: false
			};
			this.searchAreaLayer = Map.addLayer(searchAreaParams);
			this.searchAreaLayer.addFeature(this.model.searchArea.getFeature());
		} else {
			this.searchAreaLayer.updateFeature(this.model.searchArea.getFeature());
		}

		// TODO maybe a 'smart' zoomTo is needed?
		//Map.zoomTo( this.model.searchArea.getFeature().bbox );
	},

	// Called when model has changed from outside the view, i.e. when a search URL is given by the user
	onModelChanged: function() {
		if ( this.model.searchArea ) {
			if (this.model.searchArea.getMode() == 0) {
				this.tools['bbox'].updateFromModel();
				this.$el.find('#radio-bbox-label').trigger('click');
			} else if (this.model.searchArea.getMode() == 1) {
				this.tools['polygon'].updateFromModel();
				this.$el.find('#radio-polygon-label').trigger('click');
			}
		}
	},

	// Build the view
	render: function() {

		this.$el.append(areaCriteria_template(this.model));

		// Create the view for the different tools
		this.tools = {
			'bbox': new BoxView({
				model: this.model,
				parentView: this,
				el: this.$el.find('#bbox').get(0)
			}),
			'polygon': new PolygonView({
				model: this.model,
				parentView: this,
				el: this.$el.find('#polygon').get(0)
			}),
			'gazetteer': new GazetteerView({
				model: this.model,
				parentView: this,
				el: this.$el.find('#gazetteer').get(0)
			}),
			'import': new ImportView({
				model: this.model,
				parentView: this,
				el: this.$el.find('#import').get(0)
			})
		};

		// Close all the tools except the current one
		for (var t in this.tools) {
			if (this.tools.hasOwnProperty(t)) {
				if (t != this.mode) {
					this.tools[t].close();
				}
			}
		}

		// Open the current tools
		this.tools[this.mode].open();

		return this;
	},

});

module.exports = SpatialExtentView;
});

require.register("search/view/standingOrderView", function(exports, require, module) {
var Configuration = require('configuration');
var DataAccessWidget = require('dataAccess/widget/dataAccessWidget');
var SchedulingOptionsView = require('search/view/schedulingOptionsView');
var SearchView = require('search/view/searchView');
var StandingOrderDataAccessRequest = require('dataAccess/model/standingOrderDataAccessRequest');
var DatasetView = require('search/view/datasetView');
var SharePopup = require('ui/sharePopup');
var DataSetPopulation = require('search/model/dataSetPopulation');
var searchCriteria_template = require('search/template/searchCriteriaContent_template');
var DatasetSearch = require('search/model/datasetSearch');

/**
 * The model for this view is a backbone model : StandingOrder 
 */
var StandingOrderView = SearchView.extend({

	/**
	 * Id for view div container
	 */
	id: "standingOrderView",

	initialize: function() {
		SearchView.prototype.initialize.apply(this);
		this.listenTo(DataSetPopulation, 'select', this.onDatasetChanged );
		this.listenTo(DataSetPopulation, 'unselect', this.onDatasetChanged );
	},

	onDatasetChanged: function(dataset) {
		if ( this.model.dataset ) {
			this.datasetView = new DatasetView({
				model: this.model,
				dataset: this.model.dataset
			});
			this.datasetView.render();
			this.$el.find(".datasetSearch").append( this.datasetView.el );
			this.$el.trigger("create");
		} else if ( this.datasetView ) {
			var datasetId = dataset.get("datasetId");
			this.datasetView.remove();
			this.datasetView = null;
		}
	},

	events: {
		// Click on search
		"click .scSubmit": function(event) {

			// Reset request
			StandingOrderDataAccessRequest.initialize();

			// Set open search url
			StandingOrderDataAccessRequest.OpenSearchURL = this.model.getOpenSearchURL();

			// Set selected download options
			StandingOrderDataAccessRequest.DownloadOptions = this.model.getSelectedDownloadOptions();

			DataAccessWidget.open(StandingOrderDataAccessRequest);

		},

		// Click on "Get Criteria" button : import settings from search criteria
		"click .scImport": function() {

			// Import attributes from DatasetSearch
			this.model.set({
				"start": DatasetSearch.get("start"),
				"stop": DatasetSearch.get("stop"),
				"useExtent": DatasetSearch.get("useExtent"),
				"advancedAttributes":  _.clone(DatasetSearch.get("advancedAttributes")),
			});
			// NB: Can't use the line below since it doesn't fires "change" events for nested models
			// this.model.set(DatasetSearch.attributes);
			// .. so do the manual merge of download options (which is the only nested model)
			var searchDO = DatasetSearch.get("downloadOptions")[this.model.dataset.get("datasetId")];
			this.model.get("downloadOptions")[this.model.dataset.get("datasetId")].updateFrom(searchDO);

			// and search area which isn't included in attributes of model
			this.model.searchArea.setFromWKT( DatasetSearch.searchArea.toWKT() );
			this.model.searchArea.setMode( DatasetSearch.searchArea.getMode() ); // Set mode as well since WKT is always a polygon
			this.model.trigger('change:searchArea');
			this.refresh();
		},

		// To share a search
		"click #share": function() {

			SharePopup.open({
				openSearchUrl: this.model.getOpenSearchURL({
					format: "atom"
				}),
				url: Configuration.serverHostName + (window.location.pathname) + StandingOrderDataAccessRequest.getSharedURL(this.model),
				positionTo: this.$el.find('#share')[0]
			});
		}
	},

	onShow: function() {
		$('#dateRangeSlider').dateRangeSlider('hide'); // Assuming that there is only one slider on page
		//this.dateCriteriaView.removeTimeSlider();
		SearchView.prototype.onShow.apply(this);
	},

	/**
	 * Refresh the view : only for views that does not listen to model changes (for performance reasons)
	 */
	refresh: function() {
		this.schedulingOptionsView.render();
		if ( this.datasetView )
			this.datasetView.refresh();
	},

	/**
	 * Render the view
	 */
	render: function() {

		StandingOrderDataAccessRequest.initialize();

		var content = searchCriteria_template({
			submitText: "Subscribe"
		});
		this.$el.append(content);

		SearchView.prototype.render.apply(this);

		this.$el.find('#sc-content').prepend('<div id="sc-schedlingOptions-container" data-role="collapsible" data-inset="false" data-mini="true" data-collapsed="false">\
												<h3>Scheduling Options</h3>\
												<div id="schedulingOptions"></div>\
											</div>');

		this.schedulingOptionsView = new SchedulingOptionsView({
			el: this.$el.find('#schedulingOptions'),
			request: StandingOrderDataAccessRequest,
			model: this.model
		});
		this.schedulingOptionsView.render();

		this.$el.trigger('create');
		this.$el.find('#sc-schedlingOptions-container h3 .ui-btn-inner').attr("data-help", Configuration.localConfig.contextHelp.schedulingOptions);
		return this;
	}

});

module.exports = StandingOrderView;
});

require.register("search/view/timeExtentView", function(exports, require, module) {
var Configuration = require('configuration');
var SearchResults = require('searchResults/model/searchResults');
//require('jqm-datebox');
//require('ui/dateRangeSlider');
var dateCriteria_template = require('search/template/dateCriteriaContent');

/**
 * The backbone model is DatasetSearch
 */
var TimeExtentView = Backbone.View.extend({

	initialize: function(options) {

		this.hasTimeSlider = options.hasTimeSlider;

		// Refresh the dates and time slider checkbox when the values has been changed on the model 
		//typically for shared parameters urls
		this.listenTo(this.model, "change:start", this.update);
		this.listenTo(this.model, "change:stop", this.update);

		// Add events
		_.extend(this, Backbone.Events);
	},

	events: {
		//The 2 next handlers listen to start and stop date changes
		'change .fromDateInput': function(event) {
			if ( this.model.get("start").toISODateString() != $(event.currentTarget).datebox('getTheDate').toISODateString() ) {
				this.model.set({
					"start": Date.fromISOString($(event.currentTarget).val() + "T00:00:00.000Z")
				});
			}
		},
		'change .toDateInput': function(event) {
			if ( this.model.get("stop").toISODateString() != $(event.currentTarget).datebox('getTheDate').toISODateString() ) {
				this.model.set({
					"stop": Date.fromISOString($(event.currentTarget).val() + "T23:59:59.999Z")
				});
			}
		},
		/*		//the 2 following handlers deal with time setting: COMMENTED FOR THE MOMENT
				'change #fromTimeInput' : function(event){
					this.model.set({"startTime" : $(event.currentTarget).val()});
				},
				'change #toTimeInput' : function(event){
					this.model.set({"stopTime" : $(event.currentTarget).val()});
				},
		*/
		//check box changes to display or not the time slider widget
		'click .useTimeSliderLabel': function(event) {
			var $target = $(event.currentTarget);
			var checked = $target.hasClass('ui-checkbox-off');
			this.model.set({
				"useTimeSlider": checked
			});

			// Display the time slider in the bottom of the window when 
			if (checked) {
				//disable the dates start and stop widgets if the time slider is enabled
				this.$fromDateInput.datebox("disable");
				this.$toDateInput.datebox("disable");
				this.addTimeSlider();
			} else {
				this.removeTimeSlider();
				//enable the dates start and stop widgets if the time slider is disabled
				this.$fromDateInput.datebox("enable");
				this.$toDateInput.datebox("enable");
			}

		}

	},

	// Call to update the date range
	updateDateRange: function(model, dateRange) {
		// The dataset has not been loaded : do nothing, because the timeslider has already been removed when the datasetId has been changed, see below.
		var useTimeSlider = this.model.get('useTimeSlider');
		if (dateRange) {
			if (useTimeSlider) {
				this.addTimeSlider();
			}

			// Retrieve key dates from configuration.json
			var keyDates = Configuration.get("keyDates").slice(0);
			keyDates.push([(new Date()).toISODateString(), "Today"]);

			// Filter keyDates which aren't in range
			var startDate = dateRange.start;
			var stopDate = dateRange.stop;
			var i = keyDates.length;
			while (i--) {
				var keyDate = new Date(keyDates[i][0]);
				var inRange = (keyDate <= stopDate && keyDate >= startDate);
				if (!inRange) {
					keyDates.splice(i, 1);
				}
			}

			// Add start/stop dates
			keyDates.push([startDate.toISODateString(), "Start dataset"]);
			keyDates.push([stopDate.toISODateString(), "Stop dataset"]);

			// Sort dates
			keyDates.sort(function(a, b) {
				return new Date(a[0]) - new Date(b[0]);
			});

			var dateRangeOptions = {
				startYear: startDate.getFullYear(),
				endYear: stopDate.getFullYear(),
				calDateList: keyDates
			};

			if ( this.model.get("dateRange") ) {
				this.$fromDateInput.datebox("option", Object.assign(dateRangeOptions, {
					calYearPickMin: startDate.getFullYear() - this.model.get("dateRange").start.getFullYear(),
					calYearPickMax: this.model.get("dateRange").stop.getFullYear() - startDate.getFullYear()
				})).datebox("refresh");
				this.$toDateInput.datebox("option", Object.assign(dateRangeOptions, {
					calYearPickMin: stopDate.getFullYear() - this.model.get("dateRange").start.getFullYear(),
					calYearPickMax: this.model.get("dateRange").stop.getFullYear() - stopDate.getFullYear()
				})).datebox("refresh");
			}
		} else if (useTimeSlider) {
			this.removeTimeSlider();
		}
	},

	// Add the time slider to the map
	addTimeSlider: function() {

		this.$dateRangeSlider = $('#dateRangeSlider');
		this.$dateRangeSlider.dateRangeSlider('option', {
			boundsMaxLength: Configuration.localConfig.timeSlider.boundsMaxLength,
			boundsMinLength: Configuration.localConfig.timeSlider.boundsMinLength,
			bounds: {
				min: this.model.get("start"),
				max: this.model.get("stop")
			},
			scaleBounds: {
				min: this.model.get("dateRange").start,
				max: this.model.get("dateRange").stop
			},
			change: $.proxy(this.onTimeSliderChanged, this)
		});

		this.$dateRangeSlider.dateRangeSlider('show');
	},

	// Call when time slider has changed
	onTimeSliderChanged: function(bounds) {
		// Update the model
		// Silent to avoid double update
		this.model.set({
			start: bounds.min,
			stop: bounds.max
		});
		// Update the inputs
		this.$fromDateInput.val(bounds.min.toISODateString());
		this.$toDateInput.val(bounds.max.toISODateString());

		// Launch a new search
		SearchResults.launch(this.model);
	},

	// Remove the time slider
	removeTimeSlider: function() {

		var self = this;
		this.$dateRangeSlider.dateRangeSlider('hide', function() {
			// self.$dateRangeSlider.dateRangeSlider('destroy');
			self.$dateRangeSlider = $();
			self.trigger("removeTimeSlider");

			// Hack : update panel size when slider has been hidden
			$(window).trigger('resize');
		});
	},

	// Update the view when the model has changed
	update: function() {

		if (this.$dateRangeSlider.length > 0) {
			this.$dateRangeSlider.dateRangeSlider('option', 'bounds', {
				min: this.model.get("start"),
				max: this.model.get("stop")
			});
		}

		this.$fromDateInput.datebox("setTheDate", this.model.get("start"));
		this.$toDateInput.datebox("setTheDate", this.model.get("stop"));

		if ( this.model.get("dateRange") ) {			
			this.$fromDateInput.datebox("option", {
				calYearPickMin: this.model.get("start").getFullYear() - this.model.get("dateRange").start.getFullYear(),
				calYearPickMax: this.model.get("dateRange").stop.getFullYear() - this.model.get("start").getFullYear()
			}).datebox("refresh");
			this.$toDateInput.datebox("option", {
				calYearPickMin: this.model.get("stop").getFullYear()  - this.model.get("dateRange").start.getFullYear(),
				calYearPickMax: this.model.get("dateRange").stop.getFullYear() - this.model.get("stop").getFullYear()
			}).datebox("refresh");
		}
		//Uncomment to use back times
		//		$('#fromTimeInput').val( this.model.get("startTime") );
		//		$('#toTimeInput').val( this.model.get("stopTime") );
	},

	render: function() {

		var content = dateCriteria_template({
			model: this.model,
			keyDates: JSON.stringify(Configuration.get("keyDates"))
		});
		this.$el.append(content);

		// Keep the DOM elements needed by the view
		this.$fromDateInput = this.$el.find(".fromDateInput");
		this.$toDateInput = this.$el.find(".toDateInput");
		this.$dateRangeSlider = $();

		// Need to call create to disable the datebox when timeSlider is enabled by default
		this.$el.trigger('create');
		this.$fromDateInput.datebox();
		this.$toDateInput.datebox();

		// Append time slider
		if (this.hasTimeSlider) {
			this.$el.append('<label class="useTimeSliderLabel">Use Time Slider<input type="checkbox" ' + (this.model.get('useTimeSlider') ? "checked" : "") + ' class="useTimeSliderCheckBox" data-mini="true"></label>');

			if (this.model.get("useTimeSlider")) {
				//disable the dates start and stop widgets if the time slider is enabled
				this.$fromDateInput.datebox("disable");
				this.$toDateInput.datebox("disable");
			}
		}

		return this;
	}
});

module.exports = TimeExtentView;
});

require.register("searchResults/browsesManager", function(exports, require, module) {
var Logger = require('logger');
var Configuration = require('configuration');
var DatasetAuthorizations = require('search/model/datasetAuthorizations');
var DataSetPopulation = require('search/model/dataSetPopulation');
var Map = require('map/map');
var MapUtils = require('map/utils');
var SelectHandler = require('map/selectHandler');
var SearchResults = require('searchResults/model/searchResults');

var _browseLayerMap = {};
var _browseAccessInformationMap = {};

/**
 * Get the url to be used in the map for the given browse info
 */
var _getUrl = function(browse) {
	// TODO: parametrize from conf
	return browse.BrowseInformation.fileName.ServiceReference["@"]["href"];
};

/**
 *	Creates a dictionary containing the array of features depending on index
 *	Basically creates an object with keys(the same as _browseAccessInformationMap) with each key,
 *	containing the array with features belonging to this key
 *	Take url as a key
 */
var _buildDicoByKey = function(features) {
	var dico = {};
	for (var i = 0; i < features.length; i++) {
		var feature = features[i];
		var browseInfo = _getBrowseInformation(feature);
		if (browseInfo) {
			var url = _getUrl(browseInfo);
			if (!dico.hasOwnProperty(url)) {
				dico[url] = [];
			}
			dico[url].push(feature);
		}
	}
	return dico;
}

// Helper function to sort BrowsesLayer by time
var sortByTime = function(a, b) {
	return new Date(a.time) - new Date(b.time);
};

// Helper function to sort features by date
var sortFeatureByDate = function(a, b) {
	return new Date(a.properties.EarthObservation.gml_endPosition) - new Date(b.properties.EarthObservation.gml_endPosition);
}

/**
 *	Sort highlighted features on top of any other browse
 */
var sortHighlightedFeatures = function(highlightedFeatures, allBrowses) {

	var mapEngine = Map.getMapEngine();
	// Sort them by date
	highlightedFeatures.sort(sortFeatureByDate);
	_.each(highlightedFeatures, function(feature, i) {
		// Search for the given browse according to feature.id(could be multiple in case of shopcart)
		var highlightedBrowses = _.filter(allBrowses, function(browse) {
			return browse.params.name == feature.id;
		});

		// Finally set the layer index for the found browses to be on top of all other browses
		_.each(highlightedBrowses, function(browse, j) {
			// NGEO-1779: HACK use base layer index < 100 so the overlays/footprint layers are always over browses
			// TODO: add zIndex management for footprint/overlay layers
			mapEngine.setLayerIndex(browse.engineLayer, allBrowses.length /* + i + 100 */ );
		});
	});
}

module.exports = {

	/**
	 * Add a browse
	 *
	 * @param feature		The feature to add
	 * @param datasetId		The parent dataset id
	 */
	addBrowse: function(feature, datasetId, browseIndex) {

		var browses = Configuration.getMappedProperty(feature, "browses", null);
		var isPlanned = (Configuration.getMappedProperty(feature, "status") == "PLANNED"); // NGEO-1775 : no browse for planned features
		// NB: NGEO-1812: Use isEmptyObject to check that browses exists AND not empty (server sends the response not inline with ICD)
		if (!$.isEmptyObject(browses) && !isPlanned) {
			//var browseObject = _.find(browses, function(browse) { return browse.BrowseInformation._selected == true; });

			if ( !browseIndex ) {
				var fc = feature._featureCollection;
				browseIndex = fc.browseIndex;
			}

			for ( var i=0; i<browseIndex.length; i++ ) {
				var browseObject = browses[browseIndex[i]];
				if ( browseObject ) {
					browseObject.BrowseInformation._selected = true;

					var browseUrl = _getUrl(browseObject);
					var layerName = MapUtils.getLayerName(browseUrl);
					if (!layerName) {
						// Can't find the name of layer: it's impossible to add a new layer
						return null;
					}

					if (DatasetAuthorizations.hasBrowseAuthorization(datasetId, layerName)) {
						var browseLayer = _browseLayerMap[layerName];
						if (!browseLayer) {
							browseLayer = _browseLayerMap[layerName] = Map.addLayer({
								name: layerName,
								type: "Browses",
								visible: true
							});
						}
						browseLayer.addBrowse(feature, browseUrl);

					} else if (!_browseAccessInformationMap[browseUrl]) {
						Logger.inform("You do not have enough permission to browse the layer " + browseUrl + ".");
						_browseAccessInformationMap[browseUrl] = true;
					}
				}
			}
			
			
		}

	},

	/**
	 * Remove a browse
	 *
	 * @param feature		The feature to remove
	 */
	removeBrowse: function(feature, browseIndex) {

		var browses = Configuration.getMappedProperty(feature, "browses");
		if (browses) {
			// var selectedBrowse = _.find(browses, function(browse) { return browse.BrowseInformation._selected == true; });
			if ( !browseIndex ) {
				var fc = feature._featureCollection;
				// var browsesArray = Array.apply(null, Array(browses.length)).map(function (x, i) { return i; });
				// browseIndex = _.difference(browsesArray, fc.browseIndex);
				browseIndex = fc.browseIndex;
			}

			for ( var i=0; i<browseIndex.length; i++ ) {
				var browseObject = browses[browseIndex[i]];
				if ( browseObject ) {

					var layerName = MapUtils.getLayerName(_getUrl(browseObject));
					var browseLayer = _browseLayerMap[layerName];
					if (browseLayer) {
						var browseUrl = _getUrl(browseObject);
						browseLayer.removeBrowse(feature, browseUrl);

						if (browseLayer.isEmpty()) {
							Map.removeLayer(browseLayer);
							delete _browseLayerMap[layerName];
						}
					}
					delete browseObject.BrowseInformation._selected;
				}
			}

		}
	},

	/**
	 *	Get all selected browse layers for the given feature collection
	 */
	getSelectedBrowseLayers: function(fc) {
		var selectedBrowses = [];
		for ( var i=0; i<fc.features.length; i++ ) {
			var feature = fc.features[i];
			var browses = Configuration.getMappedProperty(feature, "browses");
			if (browses) {
				var selectedBrowse = _.find(browses, function(browse) { return browse.BrowseInformation._selected == true; });
				if ( selectedBrowse ) {
					var layerName = MapUtils.getLayerName(_getUrl(selectedBrowse));	
					if ( selectedBrowses.indexOf(_browseLayerMap[layerName]) == -1 ) {
						selectedBrowses.push(_browseLayerMap[layerName]);
					}
				}
			}
		}
		return selectedBrowses;
	},

	/**
	 *	Update order of browses rendering depending on time attribute of each browse
	 *	with highlighted features on top
	 *
	 *	@param highlightedFeatures
	 *		Features that were highlighted
	 */
	updateRenderOrder: function(highlightedFeatures) {

		// Extract all the browses for each feature collection and sort them by time
		var allBrowses = [];
		for (var key in _browseLayerMap) {
			allBrowses = allBrowses.concat(_browseLayerMap[key].getBrowses());
		}
		allBrowses.sort(sortByTime);

		if (allBrowses.length > 0) {
			var mapEngine = Map.getMapEngine();

			// Then modify the browse layer indices
			_.each(allBrowses, function(browse, i) {
				// NGEO-1779: HACK use base layer index < 100 so the overlays/footprint layers are always over browses
				// TODO: add zIndex management for footprint/overlay layers
				mapEngine.setLayerIndex(browse.engineLayer, i /* + 100 */ );
			});

			// NGEOD-890: The highlighted features need to be shown over any other browse
			if (highlightedFeatures) {
				sortHighlightedFeatures(highlightedFeatures, allBrowses);
			}
		}
	}
};
});

require.register("searchResults/dsa", function(exports, require, module) {
var Logger = require('logger');
var DataSetPopulation = require('search/model/dataSetPopulation');
var SearchResultsMap = require('searchResults/map');
var SelectHandler = require('map/selectHandler');
var SearchResults = require('searchResults/model/searchResults');
var SearchResultsView = require('searchResults/view/searchResultsView');
var SearchResultsTableView = require('searchResults/view/searchResultsTableView');
var MapPopup = require('map/widget/mapPopup');
var GanttView = require('ui/ganttView');

// Private variable
var _views = {};

// Private variables used for "swipe"-effect
var dragging = false;
var dx = 0; // Delta x needed between events (could probable replace dragging boolean)
var leftPos = 0; // Current position of beginning of scrollable element
var $bottomToolbar = null;

/**
 *	Computes total <command> width (icons containing dataset names)
 */
var computeCommandWidth = function() {
	var twidth=0;
	$bottomToolbar.find('command').each(function() {
		twidth += $(this).outerWidth( true );
	});
	return twidth;
}

/**
 *	Clamp the given position to not overflow the borders of available datasets
 */
var clampPos = function(pos) {

	var tdiff = computeCommandWidth() - $bottomDatasets.width();
	if ( pos > tdiff )
		pos = tdiff;
	if ( pos < 0 )
		pos = 0;
	return pos;
}

/*
 * Scroll-left with the given delta
 */
var dragTo = function(delta) {
	leftPos += delta;
	leftPos = clampPos(leftPos);
	$bottomDatasets.scrollLeft( leftPos );
}

module.exports = {

	/**
	 * Initialize the search results component for data-services-area.
	 *
	 * @param element 	The root element of the data-services-area
	 * @param router 	The data-services-area router
	 */
	initialize: function(element, router, panelManager) {

		$bottomToolbar = $('#bottomToolbar');
		$bottomDatasets = $bottomToolbar.find('#bottomDatasets');

		// Create the results table view
		var tableView = new SearchResultsTableView();
		panelManager.bottom.addView(tableView);
		tableView.render();

		// shopcartshared if 'shopcart' is in the url
		var isShopcartShared = (window.location.href.indexOf("shopcart") >= 0);
		/*
		if ( !isShopcartShared ) {
			// By default table view element is visible
			// In case of shared shopcart, it's showTable method who takes care about view visibility
			// tableView.$el.css('display', 'block');
		}
		*/

		// In case of shopcart sharing we shouldn"t trigger a click event on search datasets at least first 3 sec 
		// to ensure the display of shared shopcart content to user
		/*
		setTimeout(function() {
			isShopcartShared = false;
		}, 3000);
		*/

		// Create the GanttView (no Gantt view for now)
		// var ganttView = new GanttView();
		// panelManager.bottom.addView(ganttView);
		// ganttView.render();

		$('#table').click(function() {
			$(this).toggleClass("toggle");
			var bottom = parseInt(panelManager.bottom.$el.css('bottom'));
			var isOpened = (bottom >= 0);
			if ( isOpened ) {
				panelManager.hide("bottom", 400);
			} else {
				panelManager.show("bottom", 400);
			}
		});

		// Call when a new feature collection is available
		SearchResults.on('add:featureCollection', function(fc) {

			// Create the search results view
			// var searchResultsView = new SearchResultsView({
			// 	model: fc
			// });
			// _views[fc.id] = searchResultsView;
			// $('#statusBar').append(searchResultsView.$el);
			// searchResultsView.render();

			var tagFriendlyId = "result" + fc.id;
			var friendlyName;
			if ( fc.dataset ) {
				friendlyName = DataSetPopulation.getFriendlyName(fc.dataset.get("datasetId"));
			}
			if ( !friendlyName )
				friendlyName = fc.id;

			// Update the toolbar
			$bottomToolbar
				.find('command:last')
					.after('<command id="'+ tagFriendlyId +'" title="'+ friendlyName +'" label="' + friendlyName + '" class="result" />').end()
				.toolbar('refresh');

			
			// Update the daterange slider
			var slider = $("#dateRangeSlider").data("ui-dateRangeSlider");
			if (slider) {
				slider.refresh();
			}
			
			// Add to status bar
			panelManager.bottom.addStatus({
				activator: '#' + tagFriendlyId,
				$el: $(""),//searchResultsView.$el,
				views: [tableView],//, ganttView],
				viewActivators: [$('#table')],//, searchResultsView.$el.find('#ganttCB')],
				model: fc
			});

			// Add feature collection to the map
			SearchResultsMap.addFeatureCollection(fc, {
				layerName: fc.id + " Result",
				style: "results-footprint",
				hasBrowse: true
			});

			// Activate the new result
			if (!isShopcartShared) {
				$('#' + tagFriendlyId).click();
			}

			// Show user which dataset is currently selected
			dragTo($bottomToolbar.find('command:last').position().left);
		});

		// Call when a feature collection is removed
		SearchResults.on('remove:featureCollection', function(fc) {

			// WARNING : order of removal is important !

			var tagFriendlyId = "result" + fc.id;
			// Update the status bar
			panelManager.bottom.removeStatus('#' + tagFriendlyId);

			// Activate the last
			$('#bottomToolbar command:last-child').click();

			// Update the daterange slider
			var slider = $("#dateRangeSlider").data("ui-dateRangeSlider");
			if (slider) {
				slider.refresh();
			}

			// Remove the view
			// _views[fc.id].remove();
			// delete _views[fc.id];

			// Remove feature collection from the map
			SearchResultsMap.removeFeatureCollection(fc);
			
			// Show user which dataset is currently selected
			dragTo($bottomToolbar.find('command:last').position().left);
		});

		// Initialize the default handler
		SelectHandler.initialize();
		// Start it
		SelectHandler.start();

		// Create the popup for the map
		var mapPopup = new MapPopup('#mapContainer');
		mapPopup.close();

		// Do not stay on shopcart when a search is launched
		SearchResults.on('launch', function() {
			if ($('#shopcart').hasClass('toggle')) {
				$('#shopcart').next().click();
			}
		});
		
		this.initSwipeEffect();

		// Scroll through the datasets with mouse wheel
		$bottomToolbar.mousewheel( function(event, delta) {
			 dragTo(delta * 10);
		});
	},

	/**
	 *	Swipe-effect: click & drag to swipe though available datasets
	 */
	initSwipeEffect: function() {
		// "Swipe"-effect
		$bottomDatasets.on('mousedown', function(event) {
			// Apply swiping only if scroll is activated
			if ( $bottomDatasets.outerWidth() < computeCommandWidth() ) {
				dragging = true;
				_lastX = event.clientX;
			}
		});

		$bottomDatasets.on('mousemove', function(event) {
			if ( dragging ) {
				event.preventDefault();
				dx = _lastX - event.clientX;		
				dragTo(dx);
				_lastX = event.clientX;
			}
		});

		$(document).on('mouseup', function(event) {
			if ( dragging ) {
				event.preventDefault();

				leftPos = clampPos($bottomDatasets.scrollLeft() + (dx * 10));
				$bottomToolbar.stop().animate({
					'scrollLeft': leftPos
				}, Math.abs(dx * 30), "easeOutQuad");
				dragging = false;
			}
			dx = 0;
		});
	}
};
});

require.register("searchResults/map", function(exports, require, module) {
var Logger = require('logger');
var BrowsesManager = require('searchResults/browsesManager');
var Map = require('map/map');
var SelectHandler = require('map/selectHandler');

/**
 *	Update the array of selected/highlighted features
 *	which need to update its render order
 */
var _updateFeaturesWithBrowse = function(features) {
	var beforeLen = _featuresWithBrowse.length;
	_featuresWithBrowse = _.union(_featuresWithBrowse, features);
	if ( _featuresWithBrowse.length != beforeLen ) {
		_lazyRenderOrdering();
	}
}

// Called when feature is hidden
var _onHideFeatures = function(features, fc) {

	// Remove browses of all hidden features
	for (var i = 0; i < features.length; i++) {
		var feature = features[i];
		BrowsesManager.removeBrowse(feature);
	}
	// Remove footprints from map
	fc._footprintLayer.removeFeatures(features);
};

// Called when feature is shown
var _onShowFeatures = function(features, fc) {

	// Add browses for highlighted or selected features
	for (var i = 0; i < features.length; i++) {
		var feature = features[i];
		if (fc.isHighlighted(feature) || fc.isSelected(feature)) {
			BrowsesManager.addBrowse(feature);
		}
	}
	_updateFeaturesWithBrowse(features);

	// Add footprints to map
	fc._footprintLayer.addFeatures(features);
};

// Called when feature browse is hidden
var _onHideBrowses = function(features, fc) {
	for (var i=0; i<features.length; i++) {
		var feature = features[i];
		delete feature._browseShown;
		BrowsesManager.removeBrowse(feature);
	}
};

// Called when feature browse is shown
var _onShowBrowses = function(features, fc) {
	for (var i=0; i<features.length; i++) {
		var feature = features[i];
		feature._browseShown = true;
		BrowsesManager.addBrowse(feature, fc.id);
	}
};

// Call when a feature is selected to synchronize the map
var _onSelectFeatures = function(features, fc) {
	for (var i = 0; i < features.length; i++) {
		var feature = features[i];
		if (fc.isHighlighted(feature)) {
			fc._footprintLayer.modifyFeaturesStyle([feature], "highlight-select");
			//display browse if feature is highlighted
			BrowsesManager.addBrowse(feature, fc.getDatasetId(feature));
		} else {
			fc._footprintLayer.modifyFeaturesStyle([feature], "select");
		}
	}
	Map.trigger("selectFeatures", features);
	_updateFeaturesWithBrowse(features);
};


// Call when a feature is unselected to synchronize the map
var _onUnselectFeatures = function(features, fc) {
	for (var i = 0; i < features.length; i++) {
		var feature = features[i];
		if (fc.isHighlighted(feature)) {
			fc._footprintLayer.modifyFeaturesStyle([feature], "highlight");
		} else {
			fc._footprintLayer.modifyFeaturesStyle([feature], "default");
			BrowsesManager.removeBrowse(feature);
		}
	}
	Map.trigger("unselectFeatures");
};

// Selected or highlighted features with browse
var _featuresWithBrowse = [];
var waitTimeout = 10; // in ms
// Helper debounce function which triggers updateRenderOrder method
// after LAST highlight/select event has been triggered(in condition that it doesn't takes > waitTimeout)
var _lazyRenderOrdering = _.debounce(function() {
	BrowsesManager.updateRenderOrder(_featuresWithBrowse);
	_featuresWithBrowse = [];
}, waitTimeout);

// Call when a feature is highlighted to synchronize the map
var _onHighlightFeatures = function(features, prevFeatures, fc) {

	if (prevFeatures.length > 0) {

		// Set to default the footprint of previously selected features
		for (var i = 0; i < prevFeatures.length; i++) {

			if (fc.isSelected(prevFeatures[i])) {
				fc._footprintLayer.modifyFeaturesStyle([prevFeatures[i]], "select");
			} else {
				fc._footprintLayer.modifyFeaturesStyle([prevFeatures[i]], "default");
				BrowsesManager.removeBrowse(prevFeatures[i]);
			}
		}
	}

	var highlightedFeats = [];
	if (features.length > 0) {
		// Highlight currently selected features
		for (var i = 0; i < features.length; i++) {
			var feature = features[i];
			if (fc.isSelected(feature)) {
				fc._footprintLayer.modifyFeaturesStyle([feature], "highlight-select");
				BrowsesManager.addBrowse(feature, fc.getDatasetId(feature));

			} else {
				fc._footprintLayer.modifyFeaturesStyle([feature], "highlight");
			}
			//HACK add feature collection since it does not contain the feature collection
			feature._featureCollection = fc;
			highlightedFeats.push(feature);
		}
	}
	_updateFeaturesWithBrowse(features);
	Map.trigger("highlightFeatures", highlightedFeats);
};

module.exports = {

	/**
	 *	Initialize picked features event
	 *	Used only to ensure the ORDER of event binding
	 *
	 *	Highlight event should be triggered AFTER status panel reacted to 'pickedFeatures'
	 *	so table view could react on highlight to features which it contains
	 */
	initialize: function() {
		// Connect with map feature picking
		Map.on('pickedFeatures', function(features, featureCollections) {
			var highlights = {}
			for (var i = 0; i < featureCollections.length; i++) {
				highlights[featureCollections[i].id] = [];
			}

			for (var i = 0; i < features.length; i++) {
				var fc = features[i]._featureCollection;
				highlights[fc.id].push(features[i]);
			}

			for (var i = 0; i < featureCollections.length; i++) {
				featureCollections[i].highlight(highlights[featureCollections[i].id]);
			}
		});
	},

	/**
	 * Add a feature collection to be displayed on the map
	 *
	 * @param fc 			The feature collection
	 * @param options		Options for visualization
	 */
	addFeatureCollection: function(fc, options) {

		var footprintLayer = options.layer;

		if (!footprintLayer) {
			footprintLayer = Map.addLayer({
				name: options.layerName + " Footprints",
				type: "Feature",
				visible: true,
				style: options.style,
				greatCircle: true
			});

			// NGEO-1779: footprint layers should be always on top
			Map.getMapEngine().setLayerIndex(footprintLayer.engineLayer, 99999);
		}

		fc._footprintLayer = footprintLayer;
		fc.on('add:features', footprintLayer.addFeatures, footprintLayer);
		fc.on('remove:features', footprintLayer.removeFeatures, footprintLayer);
		fc.on('reset:features', footprintLayer.clear, footprintLayer);
		fc.on('add:child', this.addFeatureCollection);
		fc.on('remove:child', this.removeFeatureCollection);

		fc.on('show:features', _onShowFeatures, footprintLayer);
		fc.on('hide:features', _onHideFeatures, footprintLayer);
		fc.on('selectFeatures', _onSelectFeatures);
		fc.on('unselectFeatures', _onUnselectFeatures);
		fc.on('highlightFeatures', _onHighlightFeatures);
		fc.on('show:browses', _onShowBrowses);
		fc.on('hide:browses', _onHideBrowses);

		SelectHandler.addFeatureCollection(fc);
	},

	/**
	 * Remove a feature collection to be displayed on the map
	 *
	 * @param fc 	The feature collection
	 */
	removeFeatureCollection: function(fc, options) {

		fc.off('add:features', fc._footprintLayer.addFeatures, fc._footprintLayer);
		fc.off('remove:features', fc._footprintLayer.removeFeatures, fc._footprintLayer);
		fc.off('reset:features', fc._footprintLayer.resetFeatures, fc._footprintLayer);
		fc.off('add:child', this.addFeatureCollection);
		fc.off('remove:child', this.removeFeatureCollection);

		fc.off('show:features', fc._footprintLayer.addFeatures, fc._footprintLayer);
		fc.off('hide:features', fc._footprintLayer.removeFeatures, fc._footprintLayer);
		fc.off('selectFeatures', _onSelectFeatures);
		fc.off('unselectFeatures', _onUnselectFeatures);
		fc.off('highlightFeatures', _onHighlightFeatures);
		fc.off('show:browses', _onShowBrowses);
		fc.off('hide:browses', _onHideBrowses);

		if (!options || !options.keepLayer) {
			Map.removeLayer(fc._footprintLayer);
		}

		// Remove browse on highlight and selection
		for (var i = 0; i < fc.highlights.length; i++) {
			BrowsesManager.removeBrowse(fc.highlights[i]);
		}
		for (var i = 0; i < fc.selection.length; i++) {
			BrowsesManager.removeBrowse(fc.selection[i]);
		}

		SelectHandler.removeFeatureCollection(fc);

	}
};
});

require.register("searchResults/model/featureCollection", function(exports, require, module) {
/**
 * FeatureCollection received from search results
 */

var Configuration = require('configuration');
var DataSetPopulation = require('search/model/dataSetPopulation');
var DataSetSearch = require('search/model/datasetSearch');
var DownloadOptions = require('search/model/downloadOptions');

/**
 * Extract the download options from the product url
 */
var _getProductDownloadOptions = function(feature) {

	var productUrl = Configuration.getMappedProperty(feature, "productUrl", null);
	return DownloadOptions.extractParamsFromUrl(productUrl);
};


var FeatureCollection = function() {

	// Dictionary for features containing children feature collections
	this.children = {};

	// Keep the page results
	var _pageCache = [];

	// The URL for search results
	var _url = "";

	// Store the current page index
	this.currentPage = 1;

	// The last page
	this.lastPage = 0;

	// Store the count per page
	this.countPerPage = Configuration.get('searchResults.countPerPage', 100);

	// Store the number of total results
	this.totalResults = -1;

	// Array of features
	this.features = [];

	// The current selection
	this.selection = [];

	// The hightlighted features
	this.highlights = [];

	// View access
	this.viewAccess = true;

	// Download access
	this.downloadAccess = true;

	// The dataset
	this.dataset = null;

	// The id of the feature collection
	this.id = "";

	// Current browse index (in case of multiple browses) per feature collection
	// MS: Maybe move it to BrowsesManager.. (tbd on deploy)
	this.browseIndex = [0];

	var self = this;

	// fetch the results using the given start index
	var _fetch = function(startIndex, currentUrl) {
		var searchUrl = _url + "&startIndex=" + startIndex;

		$.ajax({
			url: searchUrl,
			dataType: 'json'

		}).done(function(data) {

			if (self.parse)
				data = self.parse(data);

			// Update data if a new launch has not been done, the launch is new if the url has changed
			// TODO : improve the mechanism?
			if (_url == currentUrl) {

				_pageCache[self.currentPage] = data.features;

				if (data.properties && data.properties.totalResults) {
					self.totalResults = parseInt(data.properties.totalResults);
				} else {
					self.totalResults = data.features.length;
				}

				self.lastPage = Math.ceil(self.totalResults / self.countPerPage);

				// Add the features to the results
				self.addFeatures(data.features);

				// Relaunch a search on next page if there is still some results
				/*if ( data.features.length == self.countPerPage ) {
				 	self.fetch(startIndex + self.countPerPage, currentUrl);
				} else {
				 	self.trigger('endLoading');
				}*/
				if (data.features.length < 1) {
					self.trigger('endLoading', 0);
				}
			}
		}).fail(function(jqXHR, textStatus, errorThrown) {
			if (jqXHR.status == 0) {
				location.reload();
			} else {
				console.log("ERROR when retrieving the products :" + textStatus + ' ' + errorThrown);
				//notify that the product search has Failed
				self.trigger('error:features', searchUrl);
				self.trigger('endLoading');
			}
		});
	};

	// Add features to collection
	this.addFeatures = function(features) {
		for (var i = 0; i < features.length; i++) {

			// HACK: currently server returns the same id for all children so we modify it to be unique
			var feature = features[i];
			if ( this.parent != null ) {
				feature.id = feature.id + i;
			}
			// HACK: store feature collection on each feature to avoid multiple problems on browse changing
			feature._featureCollection = this;

			self.features.push(feature);
		}

		if (features.length > 0) {
			// if lastPage = 0 (empty) => set to 1 (now not empty)
			if (self.lastPage === 0) {
				self.lastPage = 1;
			}

			self.trigger('add:features', features, self);
		}

	};

	// Remove features from the collection
	this.removeFeatures = function(features) {
		this.setSelection(_.difference(this.selection, features));
		this.highlight(_.difference(this.highlights, features));
		this.features = _.difference(this.features, features);
		self.trigger('remove:features', features, self);
	};

	// Show features
	this.showFeatures = function(features) {
		self.trigger('show:features', features, self);
		if ( features.length > 0 ) {
			// HACK: highlight all highlights, selected all selection for the moment
			this.trigger("highlightFeatures", this.highlights, this.highlights, this);
			this.trigger("selectFeatures", this.selection, this);
		}

	};
	
	// Hide features
	this.hideFeatures = function(features) { 
		self.trigger('hide:features', features, self);
	};

	// Show browses
	this.showBrowses = function(features) {
		self.trigger('show:browses', features, self);
	};

	// Hide browses
	this.hideBrowses = function(features) {
		self.trigger('hide:browses', features, self);
	};


	// Launch a search
	this.search = function(baseUrl) {

		// Build base url
		_url = baseUrl;
		_url += "&count=" + this.countPerPage;

		// Reset the cache
		_pageCache.length = 0;
		// Reset the count of results
		this.lastPage = 1;
		this.totalResults = 0;
		// Change to first page, will trigger the first search
		this.changePage(1);
	};

	// Reset the results
	this.reset = function() {
		// Reset all highlighted/selected features
		this.resetHighlighted();
		this.resetSelected();

		// Reset children
		for ( var x in this.children ) {
			this.removeChild(x);
		}
		this.children = {};

		_url = "";
		// Reset the cache
		_pageCache.length = 0;
		// Reset the count of results
		this.lastPage = 1;
		this.totalResults = 0;
		// Reset the features
		this.features.length = 0;
		this.trigger('reset:features', this);
	};

	// Method to change the current page of results
	this.changePage = function(page) {
		if (page >= 1 && page <= this.lastPage) {
			this.currentPage = page;
			this.features.length = 0;
			// Reset all highlighted/selected features
			this.resetHighlighted();
			this.resetSelected();

			// Reset children
			for ( var x in this.children ) {
				this.removeChild(x);
			}
			this.children = {};
			this.trigger('reset:features', this);
			if (_pageCache[this.currentPage]) {
				this.addFeatures(_pageCache[this.currentPage]);
			} else {
				this.trigger('startLoading', this);
				_fetch(this.getStartIndex() + (this.currentPage - 1) * this.countPerPage, _url);
			}
		}

	};

	// Append the given page to existing results
	this.appendPage = function(page) {
		this.currentPage = page;
		this.trigger('startLoading', this);
		_fetch(this.getStartIndex() + (this.currentPage - 1) * this.countPerPage, _url);
	};

	// Get start index according to current dataset
	this.getStartIndex = function() {
		if ( this.dataset ) {
			// Backend dataset
			return this.dataset.get('startIndex');
		} else {
			return 1; // Default start index according to OpenSearch spec
		}
	};

	// Set the selection, replace the previous one
	this.setSelection = function(features) {
		var unselected = _.difference(this.selection, features);
		var selected = _.difference(features, this.selection);
		this.selection = features;
		if (unselected.length != 0) {
			this.trigger("unselectFeatures", unselected, this);
		}
		if (selected.length != 0) {
			this.trigger("selectFeatures", selected, this);
		}
	};

	// Check if a feature is selected
	this.isSelected = function(feature) {
		return this.selection.indexOf(feature) >= 0;
	};

	// Check if a feature is highlighted
	this.isHighlighted = function(feature) {
		return this.highlights.indexOf(feature) >= 0;
	};

	// Reset all highlighted features
	this.resetHighlighted = function() {
		this.trigger("highlightFeatures", [], this.highlights, this);
		this.highlights = [];
	};

	// Reset all selected features
	this.resetSelected = function() {
		this.trigger("unselectFeatures", this.selection, this);
		this.selection = [];
	};

	// Highlight a feature, only one can be highlight at a time
	this.highlight = function(features) {

		if (features.length != 0 || this.highlights.length != 0) {
			var prevHighlights = this.highlights;
			// Copy highlighted items
			this.highlights = features.slice(0);
			// Trigger highlight event with features which belongs to "this" feature collection
			this.trigger("highlightFeatures", _.intersection(features, this.features), prevHighlights, this);
			this.showBrowses( _.intersection(features, this.features));
			// Trigger highlight event on every children feature collection with highlighted features which belongs to children[x] feature collection
			for ( var x in this.children ) {
				this.trigger("highlightFeatures", _.intersection(features, this.children[x].features), prevHighlights, this.children[x])
			}
		}
	};

	// Create a child feature collection for the given feature
	this.createChild = function(featureId) {
		var child = new FeatureCollection();
		var cleanedId = String(featureId).replace(/\W/g,'_'); // Id without special characters
		child.id = cleanedId;
		child.parent = this;
		child.countPerPage = Configuration.get('expandSearch.countPerPage', 100);
		this.children[cleanedId] = child;
		this.trigger('add:child', child, {
			layerName: "Child Result",
			style: "results-footprint",
			hasBrowse: true
		});
		return child;
	};

	// Remove child feature collection for the given feature
	this.removeChild = function(featureId) {
		var cleanedId = String(featureId).replace(/\W/g,'_'); // Id without special characters
		this.trigger('remove:child', this.children[cleanedId], {
			layerName: "Child Result",
			style: "results-footprint",
			hasBrowse: true
		});
		delete this.children[cleanedId];
	};

	// Select features
	this.select = function(features) {
		for ( var i=0; i<features.length; i++ ) {
			var feature = features[i];
			if ( this.selection.indexOf(feature) == -1 ) {
				this.selection.push(feature);
			}
		}
		this.trigger("selectFeatures", features, this);
	};

	// Unselect features
	this.unselect = function(features) {
		for ( var i=0; i<features.length; i++ ) {
			var feature = features[i];
			if ( this.selection.indexOf(feature) >= 0 ) {
				this.selection.splice(this.selection.indexOf(feature), 1);
			}
		}
		this.trigger("unselectFeatures", features, this);
	};

	/**
	 * Select all the items of the table which are not selected
	 *
	 * @param filteredFeatures
	 *		Features to select: used if features were filtered by table view
	 */
	this.selectAll = function(filteredFeatures) {

		// Use filtered features if defined otherwise select all present features
		var selected = _.difference(filteredFeatures ? filteredFeatures : this.features, this.selection);
		for (var i = 0; i < selected.length; i++) {
			this.selection.push(selected[i]);
		}

		if (selected.length != 0) {
			this.trigger("selectFeatures", selected, this);
		}
	};

	/**
	 * Unselect all the already selected table items
	 */
	this.unselectAll = function() {
		// Copy current selection into new array to be fired within the event
		var features = this.selection.slice(0);
		this.selection = [];
		this.trigger("unselectFeatures", features, this);
	};

	/**
	 * Get the list of products URLs from a list of features
	 * if the file name is empty the product is rejected
	 */
	this.getSelectedProductUrls = function() {

		var productUrls = [];

		for (var i = 0; i < this.selection.length; i++) {
			var f = this.selection[i];
			var url = Configuration.getMappedProperty(f, "productUrl", null);
			if (url) {
				productUrls.push(url);
			}
		}
		return productUrls;
	};

	/**
	 *	Update feature url property according to the given download options
	 *
	 *  The following method appends the download options using this convention ngEO product URI :
	 *		ngEO_DO={param_1:value1,....,param_n:value_n}
	 */
	this.updateProductUrl = function(feature, urlProperty, downloadOptions) {

		var url = Configuration.getMappedProperty(feature, urlProperty, null);
		if (url) {
			// console.log("product url initial = " + url);

			// Remove the already added download options : this fixes the already existing bug :
			// When none is chosen the download option is not removed from the url
			if (url.indexOf("ngEO_DO={") != -1) {
				url = url.substring(0, url.indexOf("ngEO_DO={") - 1);
				//console.log("product url removed download options  = " + url);
			}

			if (url.indexOf("?") == -1) {
				// First parameter
				url += "?";
			} else {
				// Otherwise
				url += "&";
			}
			url += downloadOptions.getAsUrlParameters();
			Configuration.setMappedProperty(feature, urlProperty, url);
			//console.log("product url updated = " + url);
		}
	};

	/**
	 * Update download options in product url/uri for the current selection
	 */
	this.updateDownloadOptions = function(downloadOptions) {

		var self = this;
		_.each(this.selection, function(feature) {

			self.updateProductUrl(feature, "productUrl", downloadOptions);
			// NGEO-1972: Update productUri (metadata report) as well...
			self.updateProductUrl(feature, "productUri", downloadOptions);
		});
		this.trigger("update:downloadOptions", this.selection);
	};

	/** 
	 * Get the download options on the selected products
	 */
	this.getSelectedDownloadOptions = function() {

		if (this.selection.length == 0)
			return {};

		// Retreive download options for first product in selection
		var selectedDownloadOptions = _getProductDownloadOptions(this.selection[0]);

		// Now check if the other have the same download options
		for (var i = 1; i < this.selection.length; i++) {
			var dos = _getProductDownloadOptions(this.selection[i]);

			for (var x in dos) {
				if ( _.isArray(dos[x]) ) {
					selectedDownloadOptions[x] = _.intersection( selectedDownloadOptions[x], dos[x] );
				} else if (! _.isEqual(selectedDownloadOptions[x], dos[x]) ) {
					selectedDownloadOptions[x] = "@conflict";
				}
			}

			for (var x in selectedDownloadOptions) {
				if ( _.isArray(selectedDownloadOptions[x]) ) {
					selectedDownloadOptions[x] = _.intersection( selectedDownloadOptions[x], dos[x] );
				} else if (! _.isEqual(selectedDownloadOptions[x], dos[x]) ) {
					selectedDownloadOptions[x] = "@conflict";
				}
			}
		}

		return selectedDownloadOptions;
	};

	/**
	 * Get the dataset id of a feature.
	 */
	this.getDatasetId = function(feature) {

		// If the feature collection has a dataset, just return its id
		if (this.dataset) {
			return this.dataset.get('datasetId');
		}

		// Otherwise extract the id from the feature
		return Configuration.getMappedProperty(feature, "originDatasetId", null);
	};

	/**
	 * Get the datasets from the selection
	 */
	this.getSelectionDatasetIds = function() {
		var datasetIds = [];
		for (var i = 0; i < this.selection.length; i++) {
			var datasetId = this.getDatasetId(this.selection[i]);
			if (datasetId) {
				if (datasetIds.indexOf(datasetId) < 0) {
					datasetIds.push(datasetId);
				}
			}
		}
		return datasetIds;
	};

	/** 
	 * Fetch the available download options for the selected products
	 */
	this.fetchAvailableDownloadOptions = function(callback) {

		if (this.dataset) {
			return callback(this.dataset.get('downloadOptions'));
		}

		var downloadOptions = [];
		var datasetIds = this.getSelectionDatasetIds();
		if (datasetIds.length == 1) {
			DataSetPopulation.fetchDataset(datasetIds[0], function(dataset) {
				callback(dataset.get('downloadOptions'));
			});
		} else {
			callback([]);
		}
	};

	/** return the non Planned features */
	/*	this.getSelectedNonPlannedFeatures = function() {
			
			var nonPlannedFeatures = [];
			var eoMeta;
			
			for ( var i = 0; i < this.selection.length; i++ ) {
				eoMeta = this.selection[i].properties.EarthObservation.EarthObservationMetaData;
				if ( eoMeta && eoMeta.eop_status && eoMeta.eop_status != "PLANNED") {
					nonPlannedFeatures.push(this.selection[i]);
				} 	
			}
			return nonPlannedFeatures;
		};*/

	/**
	 * The direct download uses the
	 *   OLD FORMAT: eor.eop_ProductInformation.eop_filename and not the feature.properties.productUrl
	 *	 NEW FORMAT: mapped "productUri" instead of "productUrl"
	 */
	this.getDirectDownloadProductUrl = function(feature) {
		return Configuration.getMappedProperty(feature, "productUri", "");
	};

	/**
	 * Check whether the given feature has a direct download url supported by a browser 
	 */
	this.isBrowserSupportedUrl = function(feature) {

		var downloadUrl = this.getDirectDownloadProductUrl(feature);
		if (downloadUrl.indexOf("http") != -1 || downloadUrl.indexOf("https") != -1) {
			return true;
		}
		return false;
	};

	// Add events
	_.extend(this, Backbone.Events);

};

module.exports = FeatureCollection;
});

require.register("searchResults/model/searchResults", function(exports, require, module) {
/**
 * Results table model as received from the server
 */

var Configuration = require('configuration');
var FeatureCollection = require('searchResults/model/featureCollection');
var DataSetPopulation = require('search/model/dataSetPopulation');
var DatasetSearch = require('search/model/datasetSearch');
var DatasetAuthorizations = require('search/model/datasetAuthorizations');

var SearchResults = {

	featureCollection: {},

	/**
	 * Launch a search
	 */
	launch: function(searchCriteria) {
		for (var x in this.featureCollection) {
			var fc = this.featureCollection[x];
			var baseUrl = searchCriteria.getOpenSearchURL({id: fc.getDatasetId()});
			fc.search(baseUrl);
		}

		this.trigger('launch');
	},

	/**
	 * Get the product urls of the features
	 */
	getProductUrls: function(features) {
		var productUrls = [];
		for (var i = 0; i < features.length; i++) {
			var f = features[i];
			var productUrl = Configuration.getMappedProperty(f, "productUrl", null);
			if (productUrl) {
				productUrls.push(productUrl);
			}
		}
		return productUrls;
	},

	/**
	 * Get the product sizes of the features
	 */
	getProductSizes: function(features) {
		var productSizes = [];
		for (var i = 0; i < features.length; i++) {
			var f = features[i];
			var productUrl = Configuration.getMappedProperty(f, "productUrl", null);
			var productSize = Configuration.getMappedProperty(f, "productSize", null);
			if (productUrl && productSize) {
				productSizes.push({productURL: productUrl, productSize: productSize});
			}
		}
		return productSizes;
	},
	/**
	 * The direct download uses the
	 *   OLD FORMAT: eor.eop_ProductInformation.eop_filename and not the feature.properties.productUrl
	 *	 NEW FORMAT: mapped "productUri" instead of "productUrl"
	 */
	getDirectDownloadProductUrl: function(feature) {
		return Configuration.getMappedProperty(feature, "productUri", "");
	},

	/**
	 * Check whether the given feature has a direct download url supported by a browser 
	 */
	isBrowserSupportedUrl: function(feature) {

		var downloadUrl = this.getDirectDownloadProductUrl(feature);
		if (downloadUrl.indexOf("http") != -1 || downloadUrl.indexOf("https") != -1) {
			return true;
		}
		return false;
	},

};

// Add events
_.extend(SearchResults, Backbone.Events);

// Listen to selected dataset to create the feature collection used to store the results
DataSetPopulation.on('select', function(dataset) {
	var datasetId = dataset.get('datasetId');
	if (!SearchResults.featureCollection.hasOwnProperty(datasetId)) {
		var fc = new FeatureCollection();
		// NGEO-2171: Use tag friendly id since datasetId can contain special characters as '/'
		fc.id = dataset.tagFriendlyId;
		fc.dataset = dataset;
		fc.viewAccess = DatasetAuthorizations.hasViewAccess(datasetId);
		fc.downloadAccess = DatasetAuthorizations.hasDownloadAccess(datasetId);
		SearchResults.featureCollection[datasetId] = fc;
		SearchResults.trigger('add:featureCollection', fc);
	}
});

// Listen to unselected dataset to remove the feature collection used to store the results
DataSetPopulation.on('unselect', function(dataset) {
	// If mode is correlation/interferometry, switch back to Simple
	if (DatasetSearch.get('mode') != "Simple") {
		DatasetSearch.set('mode', "Simple");
	} else {
		// Otherwise remove the dataset
		var datasetId = dataset.get('datasetId');

		if (SearchResults.featureCollection.hasOwnProperty(datasetId)) {
			SearchResults.featureCollection[datasetId].reset();
			SearchResults.trigger('remove:featureCollection', SearchResults.featureCollection[datasetId]);
			delete SearchResults.featureCollection[datasetId];
		}
	}
});

// Listen to search mode to take into acount correlation, interferometry search
DatasetSearch.on('change:mode', function(model, mode) {

	// Remove previous feature collection
	for (var id in SearchResults.featureCollection) {
		SearchResults.trigger('remove:featureCollection', SearchResults.featureCollection[id]);
		delete SearchResults.featureCollection[id];
	}

	switch (mode) {
		case "Simple":
			for (var datasetId in DataSetPopulation.selection) {
				var fc = new FeatureCollection();
				fc.id = datasetId;
				fc.dataset = DataSetPopulation.selection[datasetId];
				SearchResults.featureCollection[datasetId] = fc;
				SearchResults.trigger('add:featureCollection', fc);
			}
			break;
		case "Correlation":
		case "Interferometry":
			var fc = new FeatureCollection();
			fc.id = mode;
			SearchResults.featureCollection[fc.id] = fc;
			fc.countPerPage = 5;
			SearchResults.trigger('add:featureCollection', fc);
			break;
	}
});

module.exports = SearchResults;
});

require.register("searchResults/view/exportView", function(exports, require, module) {
var Configuration = require('configuration');
var GeoJsonConverter = require('map/geojsonconverter');
var exportViewContent_template = require('searchResults/template/exportViewContent');


/** TODO TO BE IMPLEMENTED */
var ExportView = Backbone.View.extend({

	/** the model is the DatasetSearch (the search model containing search parameters)
	/* the dataset property of DatasetSearch is the Dataset backbone model containing the download options
	 */

	mediaTypes: {
		'kml': 'application/vnd.google-earth.kml+xml',
		'gml': 'application/gml+xml',
		'geojson': 'application/json'
	},

	events: {

		'change #export-format': function(event) {
			var $download = this.$el.find('#download');
			var $select = $(event.currentTarget);

			if ($select.val() == '') {
				$download.addClass('ui-disabled');
			} else {
				var format = $select.val().toLowerCase();
				$download.removeClass('ui-disabled');

				// Export with original geometries, also remove other internal properties
				var featureWithOrigGeometries = $.extend(true, [], this.model.selection);
				$.each(featureWithOrigGeometries, function(index, feature) {
					if (feature._origGeometry) {
						feature.geometry = feature._origGeometry;
						delete feature._origGeometry;
					}

					// Remove internal properties
					if (feature._featureCollection)
						delete feature._featureCollection;
					if (feature._isHidden)
						delete feature._isHidden;
					if (feature.properties.styleHint)
						delete feature.properties.styleHint;
				});

				var blob = new Blob([GeoJsonConverter.convert(featureWithOrigGeometries, format)], {
					"type": this.mediaTypes[format]
				});
				$download.attr('download', 'export.' + format);
				$download.attr('href', URL.createObjectURL(blob));
			}
		},

	},

	render: function() {

		// Check for blob support
		var blob = null;
		if (window.Blob) {
			// For Safari 5.1, test if we can create Blob.
			try {
				blob = new Blob();
			} catch (err) {
				blob = null;
			}
		}

		if (!blob) {
			this.$el.append('<p class="ui-error-message"><b>Export is not supported in your browser</b></p>');
		} else {
			this.$el.append(exportViewContent_template());
			this.$el.trigger('create');
			this.$el.find('#download').addClass('ui-disabled');
		}
		return this;
	}

});

module.exports = ExportView;
});

require.register("searchResults/view/searchResultsTableView", function(exports, require, module) {
var Logger = require('logger');
var GlobalEvents = require('globalEvents');
var TableView = require('ui/tableView');
var Configuration = require('configuration');
var SearchResults = require('searchResults/model/searchResults');
var SimpleDataAccessRequest = require('dataAccess/model/simpleDataAccessRequest');
var DataAccessWidget = require('dataAccess/widget/dataAccessWidget');
var DirectDownloadWidget = require('dataAccess/widget/directDownloadWidget');
var DownloadOptionsWidget = require('searchResults/widget/downloadOptionsWidget');
var ExportWidget = require('searchResults/widget/exportWidget');

/**
 * The model is the backbone model SearchResults 
 */
var SearchResultsTableView = TableView.extend({

	/**
	 * Constructor
	 */
	initialize: function(options) {
		TableView.prototype.initialize.apply(this, arguments);

		this.events = _.extend({}, TableView.prototype.events, this.events);

		this.columnDefs = Configuration.data.tableView.columnsDef;

		// Set specific class for direct download of product
		var ddIndex = Configuration.get("tableView.directDownloadColumn", -1);
		if (ddIndex >= 0 && ddIndex < this.columnDefs.length) {
			this.columnDefs[ddIndex].getClasses = function(feature) {
				return SearchResults.isBrowserSupportedUrl(feature) ? "ui-direct-download" : "";
			};
		}
		
		// NGEO-1972: Class used to show download options in a user-friendly way
		var downloadOptionsColumn = _.findWhere(this.columnDefs, {sTitle: "Download options"});
		if (downloadOptionsColumn) {
			downloadOptionsColumn.getClasses = function(feature) {
				return "downloadOptions";
			};
		}

	},

	/**
	 * Manage events on the view
	 */
	events: {

		//Called when the user clicks on the product id of an item
		'click .ui-direct-download': function(event) {
			if (this.model.downloadAccess) {
				var feature = $(event.currentTarget).closest('tr').data('internal').feature;
				//The urls to uses for the direct download are those in the eop_filename property and not in feature.properties.productUrl.
				var directDownloadWidget = new DirectDownloadWidget(SearchResults.getDirectDownloadProductUrl(feature));
				directDownloadWidget.open(event);
			} else {
				Logger.inform("Cannot download the product : missing permissions.");
			}
		}
	},


	/**
	 * Call when selection has changed
	 */
	updateSelection: function(features) {

		TableView.prototype.updateSelection.apply(this, arguments);

		// Disable export if no product selected
		if (this.model.selection.length > 0) {
			this.exportButton.button('enable');
		} else {
			this.exportButton.button('disable');
		}

		//Disable the retrieve Product and download options button if no product item is selected 
		//and/or if the products checked do not have a product url
		if (this.model.getSelectedProductUrls().length == 0) {
			this.retrieveProduct.button('disable');
			this.downloadOptionsButton.button('disable');
			this.addToShopcart.button('disable');
		} else {

			// NGEO-1770: No retrieve button if selection contains at least one planned product
			var hasPlanned = _.find(this.model.selection, function(feature) {
				return Configuration.getMappedProperty(feature, "status", null) == "PLANNED";
			});
			this.retrieveProduct.button(hasPlanned ? 'disable' : 'enable');

			var hasDownloadOptions = (this.model.dataset && this.model.dataset.get('downloadOptions') && this.model.dataset.get('downloadOptions').length != 0);
			this.downloadOptionsButton.button(hasDownloadOptions ? 'enable' : 'disable');
			this.addToShopcart.button('enable');

			/*var nonPlannedSelectProducts = this.model.getSelectedNonPlannedFeatures();
			if ( nonPlannedSelectProducts.length == 0 ) {
				this.addToShopcart.button('disable');
			} else {
				this.addToShopcart.button('enable');
			}*/
		}
	},

	/**
	 * Render buttons
	 */
	renderButtons: function($buttonContainer) {

		this.retrieveProduct = $('<button data-role="button" data-inline="true" data-mini="true">Retrieve Product</button>').appendTo($buttonContainer);
		this.retrieveProduct.button();
		this.retrieveProduct.button('disable');

		//create a simpleDataAccessRequest and assign a download manager
		var self = this;
		this.retrieveProduct.click(function() {

			if (self.model.downloadAccess) {
				SimpleDataAccessRequest.initialize();
				SimpleDataAccessRequest.setProducts(self.model.selection);

				DataAccessWidget.open(SimpleDataAccessRequest);
			} else {
				Logger.inform("Cannot download the product : missing permissions.");
			}

		});
		//add selected items to the current or to a new shopcart
		this.addToShopcart = $('<button data-role="button" data-inline="true" data-mini="true">Add to Shopcart</button>').appendTo($buttonContainer);
		this.addToShopcart.button();
		this.addToShopcart.button('disable');
		this.addToShopcart.click(function() {
			GlobalEvents.trigger('addToShopcart', self.model.selection);
		});

		//add button to the widget footer in order to download products
		//do not display this button -> this.downloadOptionsButton = $('<button data-role="button" data-inline="true" data-mini="true">Download Options</button>').appendTo($buttonContainer);
		this.downloadOptionsButton = $('<button data-role="button" data-inline="true" data-mini="true">Download Options</button>');
		this.downloadOptionsButton.button();
		this.downloadOptionsButton.button('disable');

		//Displays the download options of the selected products in order to be changed in one shot
		//for the moment all product belong to the unique selected dataset 
		this.downloadOptionsButton.click(function() {

			var downloadOptionsWidget = new DownloadOptionsWidget({
				datasetId: self.model.dataset.get("datasetId"),
				featureCollection: self.model,
				callback: function(updatedDownloadOptions) {
					// Update the product url of the selected products with the selected download options
					return $.when(self.model.updateDownloadOptions(updatedDownloadOptions));
				}
			});
			downloadOptionsWidget.open();
		});

		//add button to the widget footer in order to download products		
		this.exportButton = $('<button title="Export" data-role="button" data-inline="true" data-mini="true">Export</button>').appendTo($buttonContainer);
		this.exportButton.button();
		this.exportButton.button('disable');

		//Displays the download options of the selected products in order tobe changed in one shot
		//for the moment all product belong to the unique selected dataset 
		this.exportButton.click(function() {

			var exportWidget = new ExportWidget(self.model);
			exportWidget.open();
		});
	}
});

module.exports = SearchResultsTableView;
});

require.register("searchResults/view/searchResultsView", function(exports, require, module) {
var Logger = require('logger');
var DatasetSearch = require('search/model/datasetSearch');
var searchResultsViewContent_template = require('searchResults/template/searchResultsViewContent');

/**
 * The view for search results
 * The model of this view is FeatureCollection
 */
var SearchResultsView = Backbone.View.extend({

	id: 'resultsBar',

	/**
	 * Constructor
	 */
	initialize: function() {

		this.listenTo(this.model, 'startLoading', this.onStartLoading);
		this.listenTo(this.model, 'reset:features', this.onResetFeatures);
		this.listenTo(this.model, 'add:features', this.onAddFeatures);
		this.listenTo(this.model, 'error:features', function(searchUrl) {
			Logger.error('An error occured when retrieving the products with the search url :<br>' + searchUrl);
			this.$el.find('#resultsMessage').removeClass("pulsating").html("No product found");
		});
	},

	/**
	 * Manage events on the view
	 */
	events: {
		// Manage paging through buttons
		'click #paging_first': function() {
			this.model.changePage(1);
		},
		'click #paging_last': function() {
			this.model.changePage(this.model.lastPage);
		},
		'click #paging_next': function() {
			this.model.changePage(this.model.currentPage + 1);
		},
		'click #paging_prev': function() {
			this.model.changePage(this.model.currentPage - 1);
		}
	},

	/**
	 * Called when the model start loading
	 */
	onStartLoading: function() {

		this.$el.find('#paging a').addClass('ui-disabled');

		var $resultsMessage = this.$el.find('#resultsMessage');
		$resultsMessage.html("Searching...");
		$resultsMessage.addClass("pulsating")
		$resultsMessage.show();
	},

	/**
	 * Called when features are added
	 */
	onAddFeatures: function(features) {

		var $resultsMessage = this.$el.find('#resultsMessage');
		$resultsMessage.removeClass("pulsating");

		if (this.model.totalResults > 0) {
			var startIndex = 1 + (this.model.currentPage - 1) * this.model.countPerPage;
			$resultsMessage.html('Showing ' + startIndex + ' to ' + (startIndex + features.length - 1) + " of " + this.model.totalResults + " products.");

			// Updage paging button according to the current page
			this.$el.find('#paging a').removeClass('ui-disabled');
			if (this.model.currentPage == 1) {
				this.$el.find('#paging_prev').addClass('ui-disabled');
				this.$el.find('#paging_first').addClass('ui-disabled');
			}
			if (this.model.currentPage == this.model.lastPage) {
				this.$el.find('#paging_next').addClass('ui-disabled');
				this.$el.find('#paging_last').addClass('ui-disabled');
			}
		} else if (this.model.totalResults == 0) {
			this.$el.find('#paging a').addClass('ui-disabled');
			$resultsMessage.html('No product found.');
		} else {
			$resultsMessage.html('No search done.');
		}
	},

	/**
	 * Called when the model is reset
	 */
	onResetFeatures: function() {

		this.$el.find('#paging a').addClass('ui-disabled');
		var $resultsMessage = this.$el.find('#resultsMessage');
		$resultsMessage.hide();
	},

	/**
	 * Render the view
	 */
	render: function() {

		this.$el
			//.addClass('ui-grid-c')
			.html(searchResultsViewContent_template());
		this.$el.trigger('create');

		// Set the dataset
		if (DatasetSearch.get('mode') == "Simple") {
			this.$el.find('#datasetMessage').html('Dataset : ' + this.model.id).attr("title", this.model.id);
		} else {
			var datasetName = DatasetSearch.get('master') + ' with ' + DatasetSearch.slaves.join(',');
			this.$el.find('#datasetMessage').html('Dataset : ' + datasetName).attr("title", datasetName);

			// Update message when master has changed
			DatasetSearch.on('change:master', function() {
				var datasetName = DatasetSearch.get('master') + ' with ' + DatasetSearch.slaves.join(',');
				this.$el.find('#datasetMessage').html('Dataset : ' + datasetName).attr("title", datasetName);
			}, this);
		}

		// To start paging is disable
		this.$el.find('#paging a').addClass('ui-disabled');
	}
});

module.exports = SearchResultsView;
});

require.register("searchResults/widget/downloadOptionsWidget", function(exports, require, module) {
var DownloadOptionsView = require('search/view/downloadOptionsView');
var DataSetSearch = require('search/model/datasetSearch');
var DataSetPopulation = require('search/model/dataSetPopulation');
var DownloadOptions = require('search/model/downloadOptions');

/**
 *	Download options widget allowing to update download options from table view
 *	Current widget could be initialized within a feature collection XOR download options
 *	In case of feature collection: widget will retrieve download options from dataset for selected products
 *	In case of download options it will use it as it is (used for shopcart for now)
 *	-> MS: second case seems to be not really necessary.. to be checked
 *	
 *	@param options 	Available options:
 *			<ul>
 *				<li>{Object} featureCollection: Feature collection</li>
 *				<li>{Object} downloadOptions: Download options</li>
 *				<li>{Function} callback: Callback function to be called when do has been updated</li>
 *			</ul>
 */
var DownloadOptionsWidget = function( options ) {

	this.featureCollection = options.featureCollection;
	this.datasetId = options.datasetId ? options.datasetId : options.featureCollection.dataset.get("datasetId");
	this.callback = options.callback;

	this.parentElement = $('<div id="downloadOptionsPopup">\
		<div id="downloadOptionsPopupContent"></div>\
	</div>').appendTo('.ui-page-active');

	var self = this;
	this.parentElement.ngeowidget({
		title: "Download Options",
		hide: function() {
			self.parentElement.remove();
		}
	});
};

/**
 *	Open the popup
 */
DownloadOptionsWidget.prototype.open = function() {
	var self = this;
	// Make request to know download options of given dataset
	DataSetPopulation.fetchDataset(this.datasetId, function(dataset) {
		var datasetDownloadOptions = dataset.get("downloadOptions");
		self.widgetDownloadOptions = new DownloadOptions(datasetDownloadOptions);

		var fcDownloadOptions = self.featureCollection.getSelectedDownloadOptions();
		for ( var i=0; i<datasetDownloadOptions.length; i++ ) {
			var key = datasetDownloadOptions[i].argumentName;
			if ( datasetDownloadOptions[i].cropProductSearchArea == "true" ) {
				// Should be true or false & not the real WKT value (to be verified)..
				self.widgetDownloadOptions.attributes[key] = fcDownloadOptions.hasOwnProperty(key) ? fcDownloadOptions.hasOwnProperty(key) : null;
			} else {
				if ( fcDownloadOptions[key] && fcDownloadOptions[key] != "@conflict" ) {
					self.widgetDownloadOptions.setValue( key, fcDownloadOptions[key] );
				} else {
					var doption = _.findWhere(self.widgetDownloadOptions.collection, {argumentName: key});
					for ( var j=0; j<doption.value.length; j++) {
						delete doption.value[j].selected;
					}
					self.widgetDownloadOptions.attributes[key] = (doption.type == 'select-with-none' ? '@none' : "@conflict");
				}
			}
		}
		self.spawnPopup();
	});
};

/**
 *	Close popup
 */
DownloadOptionsWidget.prototype.close = function() {
	this.parentElement.ngeowidget("hide");
};

/**
 *	When widgetDownloadOptions property is ready, spawn popup
 */
DownloadOptionsWidget.prototype.spawnPopup = function() {
	var self = this;
	var downloadOptionsView = new DownloadOptionsView({
		model: self.widgetDownloadOptions,
		el: this.parentElement.find('#downloadOptionsPopupContent'),
		updateCallback: function() {
			return $.when(self.callback(self.widgetDownloadOptions));
		}
	});
	downloadOptionsView.render();

	// Trigger jqm styling
	this.parentElement.ngeowidget("show");
};

module.exports = DownloadOptionsWidget;
});

require.register("searchResults/widget/exportWidget", function(exports, require, module) {
/**
 * export widget module
 * Used to display the supported export formats. 
 */
var Configuration = require('configuration');
var ExportView = require('searchResults/view/exportView');
var DataSetSearch = require('search/model/datasetSearch');
var ngeoWidget = require('ui/widget');

var ExportWidget = function(featureCollection) {

	var parentElement = $('<div id="exportPopup">');
	var element = $('<div id="exportPopupContent"></div>');
	element.css('min-width', '200px');
	element.appendTo(parentElement);
	parentElement.appendTo('.ui-page-active');
	parentElement.ngeowidget({
		title: "Export",
		// Reinit the standing order when the widget is closed (FL: is it really needed?)
		hide: function() {
			parentElement.remove();
		}
	});

	var exportView = new ExportView({
		model: featureCollection,
		el: element
	});

	/**
	 *	Open the popup
	 */
	this.open = function() {

		exportView.render();

		//trigger jqm styling
		parentElement.ngeowidget("show");
	};

	/**
	 *	For the moment not used since the popup can be 
	 *	closed by clicking out side its content.
	 */
	this.close = function() {
		parentElement.ngeowidget("hide");
	};
};

module.exports = ExportWidget;
});

require.register("searchResults/widget/multipleBrowseWidget", function(exports, require, module) {
/**  
 * Multiple browse selection widget module  
 */

var Configuration = require('configuration');
var BrowsesManager = require('searchResults/browsesManager');
var MapUtils = require('map/utils');
var multipleBrowse_template = require('searchResults/template/multipleBrowseContent');

/**  
 *  Popup allowing user to select browse
 */
module.exports = {
	open: function(options) {

		var feature = options.feature;
		var fc = options.featureCollection;

		var browses = Configuration.getMappedProperty(feature, "browses");
		var $popup = $(multipleBrowse_template({
			feature: feature,
			browses: browses,
			MapUtils: MapUtils
		}));

		$popup.appendTo('.ui-page-active');
		$popup.popup({
			afterclose: function(event, ui) {
				$(this).remove();
				$popup = null;
			}
		});
		$popup.trigger('create');

		$popup.find('.selectBrowse').click(function(event) {

			$popup.popup('close');
			var newIndex = parseInt($popup.find('input:checked').val());

			var checkedBrowseIdx = [];

			var selectedIndices = _.toArray($popup.find('input:checked').map(function(i, elem) { return parseInt($(elem).val()) }));
			var notSelectedIndices = _.toArray($popup.find('input:not(:checked)').map(function(i, elem) { return parseInt($(elem).val()) }));
			for ( var i=0; i<fc.features.length; i++ ) {
				// Feature loop
				var f = fc.features[i];
				var browses = Configuration.getMappedProperty(f, "browses");

				if ( f._featureCollection.isHighlighted(f) ) {
					BrowsesManager.addBrowse(f, fc.id, selectedIndices);
					BrowsesManager.removeBrowse(f, notSelectedIndices);
				}
			}
			fc.browseIndex = selectedIndices;

			if (options.onSelect) {
				options.onSelect();
			}
		});

		$popup.popup('open');
	}
};
});

require.register("shopcart/dsa", function(exports, require, module) {
var GlobalEvents = require('globalEvents');
var MenuBar = require('ui/menubar');
var ShopcartCollection = require('shopcart/model/shopcartCollection');
var Shopcart = require('shopcart/model/shopcart');
var ShopcartTableView = require('shopcart/view/shopcartTableView');
var ShopcartView = require('shopcart/view/shopcartView');
var CreateShopcartView = require('account/view/createShopcartView');
var DataSetPopulation = require('search/model/dataSetPopulation');
	
module.exports =  {
		
	/**
	 * Initialize the shopcart component for data-services-area.
	 *
	 * @param element 	The root element of the data-services-area
	 * @param router 	The data-services-area router
	 * @param panelManager
	 */
	initialize: function(element, router, panelManager) {

		// Create shopcart view
		var shopcartView = new ShopcartView({
			model: ShopcartCollection.getCurrent(),
			collection: ShopcartCollection
		});
		$('#statusBar').append(shopcartView.$el);
		shopcartView.render();
		
		// Create the shopcart table view and add it to panel
		var tableView = new ShopcartTableView();
		panelManager.bottom.addView( tableView );
		// display and set active by default
		tableView.$el.css('display', 'block');
		panelManager.bottom.setActiveView(tableView);

		tableView.listenTo(ShopcartCollection, 'change:current', function(shopcart) {
			tableView.setShopcart(shopcart);
			// Add shopcartView&tableView as a status to bottom bar
			var shopcartStatus = {
				activator: '#shopcart',
				$el: shopcartView.$el,
				views: [tableView],
				viewActivators: [ shopcartView.$el.find('#tableCB') ],
				model: shopcart.featureCollection
			};
			// Update shopcart's name
			$(shopcartStatus.activator).find('.datasetName').html(shopcart.get('name')).attr('title', shopcart.get('name'));

			// HACK : use addStatus method as well to update status listeners
			panelManager.bottom.addStatus(shopcartStatus);
		});
		tableView.render();

		// // Load the shopcart collection to display the current shopcart in the data services area
		ShopcartCollection.fetch();
		
		
		// Define route for share shopcart
		router.route(
				"data-services-area/shopcart/:shopcartId", 
				"shopcart", function(shopcartId) {		

			MenuBar.showPage("data-services-area");
			
			// Create a shared shopcart and load its content to be displayed
			var shareShopcart = new Shopcart({
				id: shopcartId, name: "Share Shopcart " + shopcartId,
				isShared: true
			});
			ShopcartCollection.setCurrent( shareShopcart );
			
			// Load content is not needed because it is already done by the shopcart widget when setCurrent is done
			//shareShopcart.loadContent();
			
			/*
			// Show the GUI once loaded
			shareShopcart.on("add:features", function() {
				// Toggle the shopcart button to be clicked
				$("#shopcart").trigger('click');
				panelManager.bottom.showTable();
			});
			*/
		});
		
		// Subscribe add to shopcart
		GlobalEvents.on('addToShopcart', function(features) {
		
			if (!ShopcartCollection.getCurrent()) {

				var createShopcartView = new CreateShopcartView({
					model : ShopcartCollection,
					title : "Create shopcart",
					success : function(model) {
						ShopcartCollection.setCurrent( model );
						ShopcartCollection.getCurrent().addItems( features );
					}
				});
				createShopcartView.render();
				
			} else {
				ShopcartCollection.getCurrent().addItems( features );
			}
		});
		
	},
};

});

require.register("shopcart/model/shopcart", function(exports, require, module) {
var Logger = require('logger');
var Configuration = require('configuration');
var FeatureCollection = require('searchResults/model/featureCollection');

// Check if a feature is planned or not
var isNotPlanned = function(feature) {
	return Configuration.getMappedProperty(feature, "status") != "PLANNED";
};

// Map from CRUD to HTTP for our default `Backbone.sync` implementation.
var methodMap = {
	'create': 'POST',
	'update': 'PUT',
	'patch': 'PATCH',
	'delete': 'DELETE',
	'read': 'GET'
};

/**
 *  This is the backbone Model of the Shopcart element
 */
var Shopcart = Backbone.Model.extend({

	defaults: {
		name: "Shopcart",
		isDefault: false
	},

	/**
		Initialize the shopcart
	 */
	initialize: function() {
		// The base url to retreive the shopcarts list
		this.urlRoot = Configuration.baseServerUrl + '/shopcarts';

		// The shopcart content is a feature collection
		this.featureCollection = new FeatureCollection();
		this.featureCollection.id = this.id;
		var self = this;
		this.listenTo(this.featureCollection, 'add:features', function(features){
			self.trigger("add:features", features)
		});
		this.listenTo(this.featureCollection, 'remove:features', function(features) {
			self.trigger("remove:features", features);
		});
	},

	/**
		Parse response from server
	 */
	parse: function(response) {
		if (response.shopcart) {
			return response.shopcart;
		}
		return response;
	},

	/**
		Sync model with server
	 */
	sync: function(method, model, options) {
		var type = methodMap[method];

		// Default JSON-request options.
		var params = {
			type: type,
			dataType: 'json'
		};

		// Ensure that we have a URL.
		if (!options.url) {
			params.url = _.result(model, 'url') || urlError();
		}

		// Ensure that we have the appropriate request data.
		if (options.data == null && model && (method === 'create' || method === 'update')) {
			params.contentType = 'application/json';

			var createJSON = {
				shopcart: this.attributes
			};
			params.data = JSON.stringify(createJSON);
		}

		// Don't process data on a non-GET request.
		if (params.type !== 'GET') {
			params.processData = false;
		}

		// Make the request, allowing the user to override any Ajax options.
		var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
		model.trigger('request', model, xhr, options);
		return xhr;
	},


	/**
    	Load the shopcart content
	*/
	loadContent: function() {
		this.featureCollection.search(this.url() + '/items/?format=json');
	},


	/** 
	 * Submit a POST request to the server in order to add the selected 
	 * products from the search results table to the shopcart.
	 * The product urls of the selected products are passed as arguments. 
	 */
	addItems: function(features) {

		// Build the request body
		var itemsToAdd = [];
		var productUrls = [];
		for (var i = 0; i < features.length; i++) {
			var feature = features[i];
			var productUrl = Configuration.getMappedProperty(feature, "productUrl", null);
			if (feature.properties && productUrl && isNotPlanned(feature)) {
				var myFeature = {
					id: feature.id,
					type: feature.type,
					geometry: feature.geometry,
					bbox: feature.bbox,
					properties: feature.properties
				};
				myFeature.properties.shopcart_id = this.id;
				myFeature.properties.productUrl = productUrl;
				itemsToAdd.push(myFeature);
				// update for webc
				feature.properties.shopcart_id = this.id;
				feature.properties.productUrl = productUrl;
				productUrls.push(productUrl);
			}
		}

		// Send the request
		var self = this;
		return $.ajax({

			url: this.url() + "/items",
			type: 'POST',
			dataType: 'json',
			contentType: 'application/json',
			data: JSON.stringify({
				'shopcartfeatures': itemsToAdd
			}),

			success: function(data) {

				// Check the response
				if (!data.shopcartfeatures || !_.isArray(data.shopcartfeatures)) {
					Logger.error("Invalid response from server when adding shopcart items.");
					return;
				}

				// Process reponse to see which items have been successfully added
				var featuresAdded = [];
				var itemsAddedResponse = data.shopcartfeatures;
				for (var i = 0; i < itemsAddedResponse.length; i++) {

					var indexOfProductUrls = productUrls.indexOf(itemsAddedResponse[i].properties.productUrl);
					if (indexOfProductUrls >= 0 && indexOfProductUrls < features.length) {

						// Clone the feature to be different from the selected one
						var feature = _.clone(features[indexOfProductUrls]);
						feature.properties = _.clone(feature.properties);
						feature.properties.shopcartItemId = itemsAddedResponse[i].id;

						featuresAdded.push(feature);


					} else {
						// TODO handle error
					}
				}

				// Display informative message
				var addToShopcartMsg;
				if (features.length != featuresAdded.length) {
					if (featuresAdded.length > 0)
						addToShopcartMsg = "Only " + featuresAdded.length + " product" + (featuresAdded.length > 1 ? 's' : '') + " on " + features.length + " added to shopcart " + self.get('name') + ".";
					else
						addToShopcartMsg = features.length + " product" + (featuresAdded.length > 1 ? 's' : '') + " not added to shopcart " + self.get('name') + ".";
					addToShopcartMsg += "<br>A product cannot be added if already exists in the shopcart or if it is a planned product.";
				} else {
					addToShopcartMsg = featuresAdded.length + " product" + (featuresAdded.length > 1 ? 's' : '') + " added to shopcart " + self.get('name') + ".";
				}
				Logger.inform(addToShopcartMsg);

				self.featureCollection.totalResults += featuresAdded.length;
				self.featureCollection.addFeatures(featuresAdded);
			},

			error: function(jqXHR, textStatus, errorThrown) {
				Logger.error("Unexpected server response when adding shopcart items (" + textStatus + " : " + errorThrown + ").");
			}

		});
	},

	/** 
	 * Helper function to get a feature from the shopcart item id
	 */
	_getFeatureFromShopcartItemId: function(id) {
		var features = this.featureCollection.features;
		for (var i = 0; i < features.length; i++) {
			if (features[i].properties.shopcartItemId == id) {
				return features[i];
			}
		}
	},

	/**
	 * Submit a delete request to the server in order to delete the selected 
	 * shopcart items.
	 */
	deleteSelection: function() {

		if (this.featureCollection.selection.length == 0)
			return;

		// Build the request body
		var itemsToRemove = [];
		for (var i = 0; i < this.featureCollection.selection.length; i++) {
			var f = this.featureCollection.selection[i];
			if (f.properties && f.properties.shopcartItemId) {
				itemsToRemove.push({
					shopcartId: this.id,
					id: f.properties.shopcartItemId
				});
			}
		}

		// Check if items are correct
		if (itemsToRemove.length != this.featureCollection.selection.length) {
			Logger.error("The selected shopcart items do not contain valid ID and cannot be removed.");
			return;
		}

		var self = this;
		return $.ajax({

			url: this.url() + '/items/delete',
			type: 'POST',
			dataType: 'json',
			contentType: 'application/json',
			data: JSON.stringify({
				shopcartfeatures: itemsToRemove
			}),

			success: function(data) {

				// Check the response is correct
				if (!data.shopcartfeatures || !_.isArray(data.shopcartfeatures)) {
					Logger.error("Invalid response from server when removing shopcart items.");
					return;
				}

				var removedItems = [];
				for (var i = 0; i < data.shopcartfeatures.length; i++) {
					removedItems.push(self._getFeatureFromShopcartItemId(data.shopcartfeatures[i].id));
				}

				// Check if items are correct
				if (removedItems.length != itemsToRemove.length) {
					Logger.inform((itemsToRemove.length - removedItems.length) + " items have not been successfully removed on the server, IDs are not valid.");
				}

				if (removedItems.length > 0) {
					self.featureCollection.totalResults -= removedItems.length;
					self.featureCollection.removeFeatures(removedItems);
				}
			},

			error: function(jqXHR, textStatus, errorThrown) {
				Logger.error("Unexpected server response when removing shopcart items (" + textStatus + " : " + errorThrown + ").");
			}

		});
	},

	/**
	 * Submit a PUT request to the server in order to update the selected 
	 * shopcart items with the given download options
	 */
	updateSelection: function(downloadOptions) {
		var itemsToUpdate = [];

		// Build the request body
		for (var i = 0; i < this.featureCollection.selection.length; i++) {
			var f = this.featureCollection.selection[i];
			if ( f.properties.shopcartItemId ) {
				itemsToUpdate.push({
					'shopcartId': this.id,
					'id': f.properties.shopcartItemId,
					'downloadOptions': downloadOptions
				});
			}
		}

		var self = this;
		return $.ajax({
			url: self.url() + '/items',
			type: 'PUT',
			dataType: 'json',
			contentType: 'application/json',
			data: JSON.stringify({
				'shopcartfeatures': itemsToUpdate
			}),
			success: function(data) {
				var response = data.items;
				self.trigger("itemsUpdated", response);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				self.trigger('updateItemsError');

			}
		});
	}
});

module.exports = Shopcart;
});

require.register("shopcart/model/shopcartCollection", function(exports, require, module) {
/**
 * These are the model components for Shopcarts Collection handling
 */

var Configuration = require('configuration');
var Shopcart = require('shopcart/model/shopcart');
var UserPrefs = require('userPrefs');

/** This is the backbone Collection modeling the shopcart list
 */
var ShopcartCollection = Backbone.Collection.extend({

	model: Shopcart,

	/**
	 * Initialize the collection
	 */
	initialize: function() {
		// The base url to retreive the shopcarts list
		this.url = Configuration.baseServerUrl + '/shopcarts';
		// The current shopcart
		this._current = null;

		// Synchronize the current shopcart when the collection has been fetched from the server
		this.on('sync', function() {

			// Do not change the current if it is a shared one
			if (this._current && this._current.get("isShared")) {
				return;
			}

			// Check if current shopcart is defined in user prefereneces
			var current = this.findWhere({ id: UserPrefs.get("Current shopcart") });
			if ( !current ) {

				// Use the default one or the first one if none has been defined
				var current = this.findWhere({
					isDefault: true
				});

				if ( !current ) {
					current = this.at(0);
				}
			}

			// Set current shopcart
			this.setCurrent(current);

		}, this);
	},

	/*fetch: function() {
		console.log('fetch');
		Backbone.Collection.prototype.fetch(this, arguments);
	},*/


	/**
	 * Needed because the server response is not what is expected from Backbone
	 */
	parse: function(response) {
		// Remove the shopcarts attributes from JSON
		if (response.shopcarts) {
			return response.shopcarts;
		} else {
			return [];
		}
	},

	/** 
	 *	Get the current shopcart 
	 */
	getCurrent: function() {
		return this._current;
	},

	/** 
	 *	Set the current shopcart 
	 */
	setCurrent: function(current) {
		if (current != this._current && current !== null) {
			var prevCurrent = this._current;
			this._current = current;
			this.trigger('change:current', this._current, prevCurrent);
		}
	},

	/**
	 * Get the current shopcart shared URL
	 */
	getShopcartSharedURL: function() {

		return "#data-services-area/shopcart/" + this.getCurrent().id;

	},

});

module.exports = new ShopcartCollection();
});

require.register("shopcart/view/shopcartExportView", function(exports, require, module) {

var Configuration = require('configuration');
var ShopcartCollection = require('shopcart/model/shopcartCollection');
var exportViewContent_template = require('shopcart/template/shopcartExportContent');

var ShopcartExportView = Backbone.View.extend({



	events: {

		'change #shopcart-export-format': function(event) {
			var $download = this.$el.find('#download-exported-shopcart');
			var $select = $(event.currentTarget);

			if ($select.val() == '') {
				$download.addClass('ui-disabled');
			} else {
				var format = $select.val();
				$download.removeClass('ui-disabled');
				$download.attr('href', ShopcartCollection.getCurrent().url() + "?format=" + format);
			}
		},

	},

	render: function() {
		this.$el.append(exportViewContent_template());
		this.$el.trigger('create');
		this.$el.find('#download-exported-shopcart').addClass('ui-disabled');

		return this;
	}

});

module.exports = ShopcartExportView;
});

require.register("shopcart/view/shopcartTableView", function(exports, require, module) {
var Logger = require('logger');
var TableView = require('ui/tableView');
var Configuration = require('configuration');
var SimpleDataAccessRequest = require('dataAccess/model/simpleDataAccessRequest');
var DataAccessWidget = require('dataAccess/widget/dataAccessWidget');
var DownloadOptionsWidget = require('searchResults/widget/downloadOptionsWidget');
var ShopcartExportWidget = require('shopcart/widget/shopcartExportWidget');
var DataSetPopulation = require('search/model/dataSetPopulation');
var DataSetAuthorizations = require('search/model/datasetAuthorizations');
var DirectDownloadWidget = require('dataAccess/widget/directDownloadWidget');

/**
 * The model is the backbone model FeatureCollection 
 */
var ShopcartTableView = TableView.extend({

	initialize: function() {

		let _this = this;

		TableView.prototype.initialize.apply(this, arguments);

		this.events = _.extend({}, TableView.prototype.events, this.events);
		this.columnDefs = Configuration.data.tableView.columnsDef;

		// Set specific class for direct download of product
		var ddIndex = Configuration.get("tableView.directDownloadColumn", -1);
		if (ddIndex >= 0 && ddIndex < this.columnDefs.length) {
			this.columnDefs[ddIndex].getClasses = function(feature) {
				return _this.model.isBrowserSupportedUrl(feature) ? "ui-direct-download" : "";
			};
		}

	},

	/**
	 * Manage events on the view
	 */
	events: {

		//Called when the user clicks on the product id of an item
		'click .ui-direct-download': function(event) {
			if (this.model.downloadAccess) {
				var feature = $(event.currentTarget).closest('tr').data('internal').feature;
				//The urls to uses for the direct download are those in the eop_filename property and not in feature.properties.productUrl.
				var directDownloadWidget = new DirectDownloadWidget(this.model.getDirectDownloadProductUrl(feature));
				directDownloadWidget.open(event);
			} else {
				Logger.inform("Cannot download the product : missing permissions.");
			}
		}
	},

	/**
	 * Update the footer button states
	 */
	updateSelection: function() {
		TableView.prototype.updateSelection.apply(this, arguments);

		// The products have to be a part of dataset so we extract dataset ids
		// to be sure that products are viable
		var selectedDatasetIds = this.model.getSelectionDatasetIds();
		if (selectedDatasetIds.length > 0) {
			this.deleteButton.button('enable');
			this.retrieveProduct.button('enable');
		} else {
			this.retrieveProduct.button('disable');
			this.deleteButton.button('disable');
		}

		// Add possibility to update download options only
		// if selected products are coming from the same dataset
		/*
		
		**** Inactive downloadOptions for the moment ****

		if ( selectedDatasetIds.length == 1 ) {
			this.downloadOptionsButton.attr("title", "Modify download options of selected products");
			this.downloadOptionsButton.button('enable');
		} else {
			this.downloadOptionsButton.attr("title", "You should select products coming from the same dataset");
			this.downloadOptionsButton.button('disable');
		}
		*/
	},


	/**
	 * Set the shopcart used by the view
	 */
	setShopcart: function(shopcart) {
		this.shopcart = shopcart;
		this.setModel(shopcart.featureCollection);
	},

	/**
	 * Render buttons
	 */
	renderButtons: function($buttonContainer) {
		var self = this;

		this.retrieveProduct = $('<button data-role="button" data-inline="true" data-mini="true">Retrieve Product</button>').appendTo($buttonContainer);
		this.retrieveProduct.button();
		this.retrieveProduct.button('disable');

		//create a simpleDataAccessRequest and assign a download manager
		var self = this;
		this.retrieveProduct.click(function() {

			var hasDownloadAccess = true;
			_.each(self.model.selection, function(feature) {
				hasDownloadAccess &= DataSetAuthorizations.hasDownloadAccess(self.model.getDatasetId(feature));
			});

			if (hasDownloadAccess) {
				SimpleDataAccessRequest.initialize();
				SimpleDataAccessRequest.setProducts(self.model.selection);

				DataAccessWidget.open(SimpleDataAccessRequest);
			} else {
				Logger.inform("Cannot download the product : missing permissions.");
			}
		});

		//add button to the widget footer in order to download products
		//do not display this button -> this.downloadOptionsButton = $('<button data-role="button" data-inline="true" data-mini="true">Download Options</button>').appendTo($buttonContainer);
		this.downloadOptionsButton = $('<button data-role="button" data-inline="true" data-mini="true">Download Options</button>');
		this.downloadOptionsButton.button();
		this.downloadOptionsButton.button('disable').hide();

		this.downloadOptionsButton.click(function() {
			var datasetId = self.model.getSelectionDatasetIds()[0]; // We are sure that there is only one dataset selected
			var downloadOptionsWidget = new DownloadOptionsWidget({
				datasetId: datasetId,
				featureCollection: self.model,
				callback: function(updatedDownloadOptions) {
					self.shopcart.updateSelection(updatedDownloadOptions.getAttributes()).then(function(response) {
						console.log(response);
						// TODO: handle a real response
						self.model.updateDownloadOptions(updatedDownloadOptions);
					});
				}
			});
			downloadOptionsWidget.open();
		});

		//add button to the widget footer in order to download products		
		this.deleteButton = $('<button data-role="button" data-inline="true" data-mini="true">Delete</button>').appendTo($buttonContainer);
		this.deleteButton.button();
		this.deleteButton.button('disable');

		this.deleteButton.click(function() {
			self.shopcart.deleteSelection();
		});

		//add button to the widget footer in order to export a shopcart
		this.exportButton = $('<button data-role="button" data-inline="true" data-mini="true">Export</button>').appendTo($buttonContainer);
		this.exportButton.button();
		this.exportButton.button('enable');

		this.exportButton.click(function() {
			var shopcartExportWidget = new ShopcartExportWidget();
			shopcartExportWidget.open();
		});

	}
});

module.exports = ShopcartTableView;
});

require.register("shopcart/view/shopcartView", function(exports, require, module) {
var SearchResultsMap = require('searchResults/map');
var Map = require('map/map');
var shopcartViewContent_template = require('shopcart/template/shopcartViewContent');
var UserPrefs = require('userPrefs');

/**
 * This view represents the status bar for shopcart dataset
 * The model of this view is Shopcart
 * This collection of this view is ShopcartCollection
 */
var ShopcartView = Backbone.View.extend({

    id: "shopcartBar",

    initialize: function() {
        // Connect shopcart with Map        
        var shopcartLayer = Map.addLayer({
            name: "Shopcart Footprints",
            type: "Feature",
            visible: true,
            style: "shopcart-footprint"
        });
        
        var self = this;
        var updateShopcartLabel = function() {
            var currentShopcart = self.collection.getCurrent();
            var numItems = currentShopcart.featureCollection.features.length;
            self.$el.find('#shopcartMessage').html( currentShopcart.get('name') + ' : ' + numItems + ' items' );
        };
        
        // Manage display of shopcart footprints
        this.collection.on('change:current', function( current, prevCurrent ) {
            if ( prevCurrent ) {
                prevCurrent.featureCollection.off('add:features', updateShopcartLabel );
                prevCurrent.featureCollection.off('remove:features', updateShopcartLabel );
                prevCurrent.off('change:name', updateShopcartLabel);
                
                SearchResultsMap.removeFeatureCollection( prevCurrent.featureCollection, { keepLayer: true } );
            }
            
            updateShopcartLabel();
            shopcartLayer.clear();
            
            SearchResultsMap.addFeatureCollection( current.featureCollection, {
                layer: shopcartLayer,
                hasBrowse: false
            });
            
            current.on('change:name', updateShopcartLabel);
            current.featureCollection.on('add:features', updateShopcartLabel );
            current.featureCollection.on('remove:features', updateShopcartLabel );

            // Change model on table when the shopcart is changed
            current.loadContent();

            // Store as user preference
            UserPrefs.save("Current shopcart", current.id);
        });
    },

    /**
     *  Render
     */
    render: function() {
        this.$el.html(shopcartViewContent_template())
                .trigger("create");
    }
});

module.exports = ShopcartView;
});

require.register("shopcart/widget/shopcartExportWidget", function(exports, require, module) {
/**
 * export widget module
 * Used to display the supported export formats. 
 */

var Configuration = require('configuration');
var ShopcartExportView = require('shopcart/view/shopcartExportView');
var ngeoWidget = require('ui/widget');


var ShopcartExportWidget = function() {

	var parentElement = $('<div id="exportShopcartPopup">');
	var element = $('<div id="exportShopcartPopupContent"></div>');
	element.css('min-width', '200px');
	element.appendTo(parentElement);
	parentElement.appendTo('.ui-page-active');
	parentElement.ngeowidget({
		title: "Export Shopcart",
		// Reinit the standing order when the widget is closed (FL: is it really needed?)
		hide: function() {
			parentElement.remove();
		}
	});

	var exportView = new ShopcartExportView({
		el: element
	});

	/**
	 *	Open the popup
	 */
	this.open = function() {

		exportView.render();

		//trigger jqm styling
		parentElement.ngeowidget("show");
	};

	/**
	 *	For the moment not used since the popup can be 
	 *	closed by clicking out side its content.
	 */
	this.close = function() {
		parentElement.ngeowidget("hide");
	};
};

module.exports = ShopcartExportWidget;
});

require.register("shopcart/widget/shopcartWidget", function(exports, require, module) {
/**
 * ShopcartWidget module
 */

var ShopcartCollection = require('shopcart/model/shopcartCollection');
var ShopcartTableView = require('shopcart/view/shopcartItemView');
var PanelManager = require('ui/panelManager');
var ngeoWidget = require('ui/widget');


module.exports = {

	create: function() {

		// Create the shopcart content view
		var shopcartTableView = new ShopcartTableView();

		// Add the shopcart table to the bottom panel 
		PanelManager.addPanelContent({
			element: shopcartTableView.$el,
			position: 'bottom',
			activator: '#shopcart',
			show: $.proxy(shopcartTableView.onShow, shopcartTableView),
			hide: $.proxy(shopcartTableView.onHide, shopcartTableView)
		});

		// Manage panel size
		shopcartTableView.$el.on('panel:show', $.proxy(shopcartTableView.onShow, shopcartItemView));
		shopcartTableView.$el.on('panel:hide', $.proxy(shopcartTableView.onHide, shopcartItemView));
		shopcartItemView.on("sizeChanged", function() {
			PanelManager.updatePanelSize('bottom');
		});

		shopcartTableView.listenTo(ShopcartCollection, 'change:current', shopcartItemView.setShopcart);

		shopcartTableView.render();

		// Manage error on shopcart collection fetch
		// Desactive the shopcart widget : cannot access to shopcart !
		$('#shopcart').addClass('ui-disabled');
		ShopcartCollection.on('error', function() {
			$('#shopcart').addClass('ui-disabled');
		});
		ShopcartCollection.on('sync', function() {
			$('#shopcart').removeClass('ui-disabled');
		});

		// load the shopcart collection to display the current shopcart in the data services area
		ShopcartCollection.fetch();

		return shopcartTableView.$el;
	},

	/**
	 * Update the shopcart item view whene the share shopcart is triggered.
	 * @returns
	 */
	updateView: function() {
		shopcartTableView.onShow();
	}

};
});

require.register("ui/context-help", function(exports, require, module) {

/*
* define(["jquery.mobile"]
*/
	
/**
 * The tooltip used to display context help
 */
var tooltip;

/**
 * Margin used by tooltip
 */
var topMargin = 10;

/**
 * Margin used by tooltip
 */
var startContent = "Mouse over interface elements for context help.";

/**
 * Current state of help component
 */
var helpActivated = false;

/**
 * Place the tooltip for context help
 */
var placeTooltip = function (element) {
	tooltip.show();
	// Two cases : tooltip is attached to an element or not
	if (!element) {
		// Center the tooltip
		tooltip.find('p').html( startContent );
		var offset = {
			top: $(window).height()/2 - tooltip.outerHeight()/2,
			left: $(window).width()/2 - tooltip.outerWidth()/2
		};
		tooltip.offset(offset);
	} else {
		// Place the tooltip just below the element
		var $element = $(element);
		tooltip.find('p').html( $element.data('help') );
		var offset = {
			top: $element.offset().top + $element.outerHeight(),
			left: $element.offset().left + $element.outerWidth()/2 - tooltip.outerWidth()/2
		};
		tooltip.offset(offset);
	}
};

/**
 *	Lazy hide function which debounces after 500ms
 *	Hides tooltip depending on hide boolean
 */
var lazyHide = _.debounce(function(hide) {
	if ( hide ) {
		tooltip.hide();
	} else {
		lazyHide(hide);
	}
}, 500)

/**
 * Handler to show help tooltip for elements containing "data-help" attribute
 * Checks the target element and its parent
 */
var onElementHelpClicked = function(event) {
	// OLD code to store data-help on tb-icon, discarded by NGEO-2003
	// var helpTarget = $(event.target).is('[data-help]') ? event.target : $(event.target.parentElement).is('[data-help]') ? event.target.parentElement : null;
	// if ( helpTarget ) {
	// 	placeTooltip(helpTarget);
	if ( helpActivated && !$(event.target).closest('#help').length ) {
		var helpTarget = $(event.target).is('[data-help]') ? $(event.target) : $(event.target).closest('[data-help]');
		if ( helpTarget.length ) {
			placeTooltip( helpTarget );
		}
		event.stopPropagation();
		event.preventDefault();
		return false;
	} else {
		return true;
	}
};

/**
 * Handler to show help tooltip for elements containing "data-help" attribute
 * Checks the target element and its parent
 */
var onElementHelpOver = function(event) {
	//var helpTarget = $(event.target).is('[data-help]') ? event.target : $(event.target.parentElement).is('[data-help]') ? event.target.parentElement : null;
	var helpTarget = $(event.target).is('[data-help]') ? $(event.target) : $(event.target).closest('[data-help]');
	if ( helpTarget ) {
		placeTooltip( helpTarget );
		lazyHide(false);
		event.stopPropagation();
		event.preventDefault();
		return false;
	} else {
		return true;
	}
};

module.exports = function(element) {

	// Add the tooltip element
	tooltip = $('<div class="helpTooltip ui-popup-container ui-popup-active">\
					<div class="ui-popup ui-overlay-shadow ui-corner-all ui-body-e"><p></p>\
					</div></div>').appendTo(element);
	// Increment the z-index, 1100 is for widget and popup, 1101 for icons in the popup (close button)
	// So 1102 is used for context help tooltip to be always above
	tooltip.css("z-index", 1102 );
	tooltip.hide();
	
	var hideTooltip = function(event) {
		if ( $(event.target).closest('.helpTooltip').length || $(event.target).is('[data-help]') || $(event.target).closest('[data-help]').length ) {
			// Do not hide tooltip while the mouse is over tooltip or help
			lazyHide(false);
		} else {
			// Hide it otherwise
			lazyHide(true);
		}
	}

	// Setup behavioir when the context help button is clicked
	$("#help").click( function() {
		var $this = $(this);
		if ( $this.hasClass('toggle') ) {
			tooltip.hide();
			$this.removeClass('toggle');
			$('[data-help]').removeClass('helpActivated');
			$('[data-help]').off("mouseover", onElementHelpOver);
			$('body').off("mousemove", hideTooltip)
			$('body').get(0).removeEventListener("click", onElementHelpClicked, true );
		} else {
			tooltip.show();
			placeTooltip();
			$('[data-help]').addClass('helpActivated');
			$('[data-help]').on("mouseover", onElementHelpOver);
			$('body').on("mousemove", hideTooltip);
			$('body').get(0).addEventListener("click", onElementHelpClicked, true );
			$this.addClass('toggle');
		}
		helpActivated = !helpActivated;
		
	});
};

});

require.register("ui/dateRangeSlider", function(exports, require, module) {
/**
 * define(['jquery','jquery.mobile','externs/jquery.mousewheel'], function($) {
 */
 
// Helper functions
function getDaysBetween(date1, date2) {
	return Math.floor((date1 - date2) / 86400000);
};

function pad(num, size) {
	var s = num + "";
	while (s.length < size) s = "0" + s;
	return s;
}

// For month representation
var monthArray = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The date slider
 */
$.widget("ui.dateRangeSlider", {
	// default options
	options: {
		// parameters
		scaleBounds: null,
		bounds: null,
		boundsMaxLength: 180, // 3 months
		boundsMinLength: 10, // 10 days
		wheelFactor: 7,
		wheelTimeout: 1000,

		// events
		change: $.noop
	},

	// the constructor
	_create: function() {

		var self = this;

		this.scalePosition = 0;

		// Create left and right arrows
		this.rightArrow = $('<div style="display: none;" class="dateSlider-rightArrow"></div>')
			.appendTo(this.element)
			.mousedown(function(event) {
				self.autoScaleDirection = self.options.wheelFactor;
				setTimeout($.proxy(self._autoScaleScroll, self), 50);
			})
			.mouseup($.proxy(this._onArrowMouseUp, this));

		this.leftArrow = $('<div style="display: none;" class="dateSlider-leftArrow"></div>')
			.appendTo(this.element)
			.mousedown(function(event) {
				self.autoScaleDirection = -self.options.wheelFactor;
				setTimeout($.proxy(self._autoScaleScroll, self), 50);
			})
			.mouseup($.proxy(this._onArrowMouseUp, this));


		// Create the bar that defines the date range
		this.dragBar = $('<div style="display: none;" class="dateSlider-bar"></div>')
			.appendTo(this.element)
			.mousedown(function(event) {
				$(document).on('mousemove', {
					lastX: event.pageX
				}, $.proxy(self._onDragBar, self));
				$(document).on('mouseup', $.proxy(self._onDragBarStop, self));
				event.preventDefault();
			});

		// Create the labels of the start and end date
		this.startLabel = $('<div style="display: none;" class="dateSlider-label"></div>')
			.appendTo(this.element)
			.mousedown(function(event) {
				$(document).on('mousemove', {
					lastX: event.pageX
				}, $.proxy(self._moveLeftDrag, self));
				$(document).one('mouseup', function() {
					$(document).off('mousemove', $.proxy(self._moveLeftDrag, self));
					self.options.change(self._computeCurrentDate());
				});
			});
		this.endLabel = $('<div style="display: none;" class="dateSlider-label"></div>')
			.appendTo(this.element)
			.mousedown(function(event) {
				$(document).on('mousemove', {
					lastX: event.pageX
				}, $.proxy(self._moveRightDrag, self));
				$(document).one('mouseup', function() {
					$(document).off('mousemove', $.proxy(self._moveRightDrag, self));
					self.options.change(self._computeCurrentDate());
				});
			});

		// Create a container for the scale bar, needed to manage scrolling
		this.container = $('<div class="dateSlider-container"></div>').appendTo(this.element);
		this.marginLeft = parseInt(this.container.css('marginLeft'));

		// Create the scale bar
		this._createScaleBar();

		// Get the initial scale postion
		this.scalePosition = this.container.scrollLeft();

		this.wheelTimeoutVar = null;
		this.element.on("mousewheel", $.proxy(this._onMouseWheel, this));

		// Cache the container width
		this.containerWidth = this.container.width();

		// Initialize dragging
		this._updateDragBar();

		// Add events
		_.extend(this, Backbone.Events);
	},

	// Refresh the date range slider when container width have changed
	refresh: function(force) {
		var cw = this.container.width();
		if (cw != this.containerWidth || force) {
			this.containerWidth = cw;
			// Get the scale position
			this.scalePosition = this.container.scrollLeft();
			if (this.scalePosition + cw > this.maxDays) {
				this.scalePosition = this.maxDays - cw;
				this.container.scrollLeft(this.scalePosition);
			}
			// Update the drag bar
			this._moveDrag(0);
		}
	},

	// Call when mouse up on an arrow
	_onArrowMouseUp: function() {
		this.autoScaleDirection = 0;
		this.options.change(this._computeCurrentDate());
	},

	// On mouse wheel event handler
	_onMouseWheel: function(event, delta) {

		this._moveDrag(delta * this.options.wheelFactor);

		// Call change after a few milliseconds
		if (this.options.change) {
			if (this.wheelTimeoutVar) {
				clearTimeout(this.wheelTimeoutVar);
			}
			var self = this;
			this.wheelTimeoutVar = setTimeout(function() {
				self.options.change(self._computeCurrentDate());
				self.wheelTimeoutVar = null;
			}, this.options.wheelTimeout);
		}
	},

	// Update the drag bar position
	_updateDragBar: function() {
		this.dragLeftDays = getDaysBetween(this.options.bounds.min, this.minDate);
		this.dragRightDays = getDaysBetween(this.options.bounds.max, this.minDate);

		// Check if length is valid, otherwise modify it
		var boundsLength = this.dragRightDays - this.dragLeftDays;
		if (boundsLength > this.options.boundsMaxLength) {
			this.dragLeftDays = this.dragRightDays - this.options.boundsMaxLength;
			//this.options.change( this._computeCurrentDate() ); 
		} else if (boundsLength < this.options.boundsMinLength) {
			this.dragLeftDays = this.dragRightDays - this.options.boundsMinLength;
			//this.options.change( this._computeCurrentDate() ); 
		}

		this.dragBar.width(this.dragRightDays - this.dragLeftDays);
		this._moveDrag(0);
	},

	// Create the scale
	_createScaleBar: function() {

		this.container.empty();

		var scale = $('<div class="dateSlider-scale"></div>');

		var scaleMin = this.options.scaleBounds && this.options.scaleBounds.min ? this.options.scaleBounds.min : this.options.bounds.min;
		var scaleMax = this.options.scaleBounds && this.options.scaleBounds.max ? this.options.scaleBounds.max : this.options.bounds.max;

		var startYear = parseInt(scaleMin.getUTCFullYear());
		var endYear = parseInt(scaleMax.getUTCFullYear());

		// // HACK : try to have the time slider big enough for the screen
		// if (endYear - startYear < 6) {
		// 	startYear = endYear - 6;
		// }
		// Even a better HACK : currently not handle dynamically the startYear
		// --> some problems when dataset has been checked/unchecked, so put a const year
		startYear = 1978;

		this.minDate = new Date(Date.UTC(startYear, 0, 1, 0, 0, 0));
		var maxDate = new Date(Date.UTC(endYear, 12, 31));

		// Compute the min/max days to limit the scale bar scrolling
		this.maxDays = getDaysBetween(scaleMax, this.minDate);
		this.minDays = getDaysBetween(scaleMin, this.minDate);

		var monthDay = ["31", "28", "31", "30", "31", "30", "31", "31", "30", "31", "30", "31"];
		for (var i = startYear; i <= endYear; i++) {
			var isBissextile = ((i % 4) == 0) && ((i % 400) != 0);
			scale.append('<span class="dateSlider-year dateSlider-y' + (isBissextile ? 'bi' : 'n') + '">' + i + '</span>');
			for (var j = 2; j < 12; j++) {
				scale.append('<span class="dateSlider-month dateSlider-m' + monthDay[j] + '">' + monthArray[j] + '</span>');
			}
		}

		scale.css('width', getDaysBetween(maxDate, this.minDate));
		scale.on('selectstart', function() {
			return false;
		});

		// Add it to the DOM
		this.scaleBar = scale.appendTo(this.container);
	},

	// Move the left side of the drag bar
	_moveLeftDrag: function(event) {
		var days = event.pageX - event.data.lastX;
		this.dragLeftDays += days;

		if (this.dragLeftDays < this.scalePosition) {
			this.dragLeftDays = this.scalePosition;
		} else if (this.dragLeftDays < this.minDays) {
			this.dragLeftDays = this.minDays;
		}

		if (this.dragRightDays > this.dragLeftDays + this.options.boundsMaxLength) {
			this.dragLeftDays = this.dragRightDays - this.options.boundsMaxLength;
		} else if (this.dragLeftDays > this.dragRightDays - this.options.boundsMinLength) {
			this.dragLeftDays = this.dragRightDays - this.options.boundsMinLength;
		}

		this.dragBar.width(this.dragRightDays - this.dragLeftDays);
		var leftPos = this.dragLeftDays + this.marginLeft - this.scalePosition;
		this.dragBar.css('left', leftPos);

		this._updateLabels();

		event.data.lastX = event.pageX;

		event.preventDefault();
	},

	// Move the right side of the drag bar
	_moveRightDrag: function(event) {
		var days = event.pageX - event.data.lastX;
		this.dragRightDays += days;

		if (this.dragRightDays > this.scalePosition + this.containerWidth) {
			this.dragRightDays = this.scalePosition + this.containerWidth;
		} else if (this.dragRightDays > this.dragLeftDays + this.options.boundsMaxLength) {
			this.dragRightDays = this.dragLeftDays + this.options.boundsMaxLength;
		} else if (this.dragRightDays < this.dragLeftDays + this.options.boundsMinLength) {
			this.dragRightDays = this.dragLeftDays + this.options.boundsMinLength;
		}

		this.dragBar.width(this.dragRightDays - this.dragLeftDays);

		this._updateLabels();

		event.data.lastX = event.pageX;

		event.preventDefault();
	},

	// Compute the current date
	_computeCurrentDate: function() {
		return {
			min: new Date(this.minDate.getTime() + this.dragLeftDays * 86400000),
			max: new Date(this.minDate.getTime() + this.dragRightDays * 86400000/* + (3600 * 1000 * 24 - 1)*/)
		};
	},

	// Format a date
	_formatDate: function(date) {
		return pad(date.getUTCDate(), 2) + "-" + pad(monthArray[date.getUTCMonth()], 2) + "-" + date.getUTCFullYear();
	},

	// Update date labels
	_updateLabels: function() {

		var bounds = this._computeCurrentDate();
		// Update text
		this.startLabel.html(this._formatDate(bounds.min));
		this.endLabel.html(this._formatDate(bounds.max));

		//console.log("Updating to [" + bounds.min + " " + bounds.max +" ]");

		// Compute label position
		var leftPos = this.dragLeftDays + this.marginLeft - this.scalePosition;
		var rightPos = this.dragRightDays + this.marginLeft - this.scalePosition;

		var startLeft = leftPos - this.startLabel.outerWidth() / 2;
		var endLeft = rightPos - this.endLabel.outerWidth() / 2;
		if (startLeft + this.startLabel.outerWidth() > endLeft) {
			endLeft = leftPos + this.dragBar.width() / 2 + 1;
			startLeft = endLeft - 2 - this.startLabel.outerWidth();
		}

		this.startLabel.css({
			'left': startLeft,
			'top': -this.startLabel.outerHeight()
		});
		this.endLabel.css({
			'left': endLeft,
			'top': -this.startLabel.outerHeight()
		});
	},

	// Move the drag given the days number
	_moveDrag: function(days) {

		if (this.dragLeftDays + days <= this.minDays) {
			this.dragRightDays += this.minDays - this.dragLeftDays;
			this.dragLeftDays = this.minDays;
			$('.dateSlider-leftArrow').addClass('ui-disabled');
		} else if (this.dragRightDays + days >= this.maxDays) {
			this.dragLeftDays += this.maxDays - this.dragRightDays;
			this.dragRightDays = this.maxDays;
			$('.dateSlider-rightArrow').addClass('ui-disabled');
		} else {
			$('.dateSlider-leftArrow').removeClass('ui-disabled');
			$('.dateSlider-rightArrow').removeClass('ui-disabled');
			this.dragLeftDays += days;
			this.dragRightDays += days;
		}

		var scaleDelta = 0.0;
		if (this.dragRightDays > this.scalePosition + this.containerWidth) {
			scaleDelta = this.dragRightDays - (this.scalePosition + this.containerWidth);
		} else if (this.dragLeftDays < this.scalePosition) {
			scaleDelta = this.dragLeftDays - this.scalePosition;
		}

		if (scaleDelta != 0.0) {
			this.scalePosition += scaleDelta;
			this.container.scrollLeft(this.scalePosition);
		}

		var leftPos = this.dragLeftDays + this.marginLeft - this.scalePosition;

		this.dragBar.css('left', leftPos);

		this._updateLabels();
	},

	// To animate scale scrolling
	_autoScaleScroll: function() {
		if (this.autoScaleDirection != 0.0) {
			this._moveDrag(this.autoScaleDirection);
			setTimeout($.proxy(this._autoScaleScroll, this), 50);
		}
	},

	// Called when dragging the bar
	_onDragBar: function(event) {
		var rightBlock = (this.dragRightDays == this.scalePosition + this.containerWidth) && event.pageX > event.data.lastX;
		var leftBlock = (this.dragLeftDays == this.scalePosition) && event.pageX < event.data.lastX;

		if (!rightBlock && !leftBlock) {
			this._moveDrag(event.pageX - event.data.lastX);
			event.data.lastX = event.pageX;
			this.autoScaleDirection = 0.0;
		} else {
			this.autoScaleDirection = rightBlock ? this.options.wheelFactor : -this.options.wheelFactor;
			setTimeout($.proxy(this._autoScaleScroll, this), 50);
		}
	},

	// Called when the dragging the bar is stopped
	_onDragBarStop: function(event) {
		this.autoScaleDirection = 0.0;
		$(document).off('mousemove', $.proxy(this._onDragBar, this));
		$(document).off('mouseup', $.proxy(this._onDragBarStop, this));

		this.options.change(this._computeCurrentDate());
	},

	// revert other modifications here
	_destroy: function() {
		this.element.empty();
		this.element.off("mousewheel", $.proxy(this._onMouseWheel, this));
	},

	// _setOptions is called with a hash of all options that are changing
	// always refresh when changing options
	_setOptions: function() {
		// in 1.9 would use _superApply
		$.Widget.prototype._setOptions.apply(this, arguments);
		// TODO : refresh?
	},

	/**
	 *	Show date range slider by animating the height
	 */
	show: function(callback){
		var self = this;
		if ( !self.element.height() ) {
			$(self.element).trigger('drs:show', []);
			setTimeout(function(){
				self.element.animate({
					height: 24
				}, 400, function() {
					$(self.element).find('> div').show();
					self.refresh(true);
					self.trigger("drs:show");
				});
			}, 0);
		}
	},

	/**
	 *	Hide date range slider by animating the height
	 */
	hide: function(callback){
		var self = this;
		if ( self.element.height() ) {
			$(self.element).trigger('drs:hide', []);
			this.element.stop(true,true).animate({
				height: 0
			}, 400, function(){
				if ( callback )
					callback();
				$(self.element).find('> div').not('.dateSlider-container').hide();
			});
		}
	},

	// _setOptions is called with a hash of all options that are changing
    // always refresh when changing options
    _setOptions: function() {
    	// _super and _superApply handle keeping the right this-context
		this._superApply( arguments );
		this.refresh();
	},

	// _setOption is called for each individual option that is changing
	_setOption: function(key, value) {

		switch (key) {
			case 'bounds':
				if (value.min != this.options.bounds.min || value.max != this.options.bounds.max) {
					this.options.bounds = value;
					this.scalePosition = this.scalePosition = this.container.scrollLeft();
					this._updateDragBar();
				}
				break;

			case 'scaleBounds':
				this.options.scaleBounds = value;
				this._createScaleBar();
				break;

		}

		// in 1.9 would use _super
		$.Widget.prototype._setOption.call(this, key, value);

	}
});
});

require.register("ui/ganttView", function(exports, require, module) {
var Configuration = require('configuration');
var Map = require('map/map');

var monthDay = ["31", "28", "31", "30", "31", "30", "31", "31", "30", "31", "30", "31"];

/**
 * A view to display a gantt chart.
 * The model contains a feature collection
 */
var GanttView = Backbone.View.extend({

	/**
	 * Constructor
	 * Connect to model change
	 */
	initialize: function(options) {
		this.scale = 'quarter-day';
	},

	id: 'ganttView',

	/**
	 * Manage events on the view
	 */
	events: {
		'change input[name=radio-time-scale]': function(event) {
			this.scale = event.currentTarget.value;
			if (this.model.features.length > 0) {
				this.clear();
				this.addData(this.model.features);
			}
		}
	},

	/**
	 * Set the model on the gantt view
	 */
	setModel: function(model) {
		if (this.model) {
			this.stopListening(this.model);
		}

		this.model = model;

		if (this.model) {
			this.listenTo(this.model, "reset:features", this.clear);
			this.listenTo(this.model, "add:features", this.addData);
		}
	},

	/**
	 * Clear the gantt chart
	 */
	clear: function() {
		this.$el.find('.gantt-data-panel').detach();
		this.$el.append('<div class="gantt-data-panel"><div class="gantt-nodata">No data to display</div></div>');
	},

	/**
	 * Add data to gantt chart
	 */
	addData: function(features) {

		if (features.length == 0) {
			return;
		}

		this.$el.find('.gantt-data-panel').empty();

		var minDate = Configuration.getMappedProperty(features[0], "start");
		var maxDate = Configuration.getMappedProperty(features[0], "stop");

		for (var i = 1; i < features.length; i++) {

			if (Configuration.getMappedProperty(features[i], "start") < minDate) {
				minDate = Configuration.getMappedProperty(features[i], "start");
			}

			if (Configuration.getMappedProperty(features[i], "stop") > maxDate) {
				maxDate = Configuration.getMappedProperty(features[i], "stop");
			}
		}

		this.buildTable(Date.fromISOString(minDate), Date.fromISOString(maxDate), features.length);

		for (var i = 0; i < features.length; i++) {
			this.addBar(features[i]);
		}

		this.$el.find('.gantt-body-scroll').scrollLeft(this.$el.find('table').width());
	},

	/**
	 * Show the table
	 */
	show: function() {
		this.$el.show();
	},

	/**
	 * Hide the table
	 */
	hide: function() {
		this.$el.hide();
	},

	/**
	 * Build the day scale
	 */
	buildDayScale: function(start, end) {

		var date = new Date(start.getFullYear(), start.getMonth(), 1, 0, 0, 0, 0);
		this.startDate = new Date(start.getFullYear(), start.getMonth(), 1, 0, 0, 0, 0);

		var $rowUp = $('<tr>');
		var $rowDown = $('<tr class="gantt-head-20">');
		while (date < end) {

			$rowUp.append('<th colspan="' + monthDay[date.getMonth()] + '">' + (date.getMonth() + 1) + '/' + date.getFullYear() + '</th>');
			for (var i = 0; i < monthDay[date.getMonth()]; i++) {
				$rowDown.append('<th>' + (i + 1) + '</th>');
			}
			date = new Date(date.getTime() + monthDay[date.getMonth()] * 24 * 3600 * 1000);
		}

		return $('<thead>').append($rowUp).append($rowDown);
	},

	/**
	 * Build the quarter-day scale
	 */
	buildQuarterDayScale: function(start, end) {

		var date = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
		this.startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);

		var $rowUp = $('<tr>');
		var $rowDown = $('<tr class="gantt-head-60">');
		while (date < end) {

			$rowUp.append('<th colspan="4">' + date.toDateString() + '</th>');
			for (var i = 0; i < 4; i++) {
				$rowDown.append('<th>' + i * 6 + '-' + (i + 1) * 6 + '</th>');
			}
			date = new Date(date.getTime() + 24 * 3600 * 1000);
		}

		return $('<thead>').append($rowUp).append($rowDown);
	},

	/**
	 * Build the hour scale
	 */
	buildHourScale: function(start, end) {

		var date = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
		this.startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);

		var $rowUp = $('<tr>');
		var $rowDown = $('<tr class="gantt-head-20">');
		while (date < end) {

			$rowUp.append('<th colspan="24">' + date.toDateString() + '</th>');
			for (var i = 0; i < 24; i++) {
				$rowDown.append('<th>' + i + '</th>');
			}
			date = new Date(date.getTime() + 24 * 3600 * 1000);
		}

		return $('<thead>').append($rowUp).append($rowDown);
	},

	/**
	 * Build the minute scale
	 */
	buildMinuteScale: function(start, end, step) {

		var date = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours() + (start.getTimezoneOffset() / 60), 0, 0, 0);
		var end2 = new Date(end.getFullYear(), end.getMonth(), end.getDate(), end.getHours() + (start.getTimezoneOffset() / 60), end.getMinutes(), end.getSeconds(), end.getMilliseconds());
		this.startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours() + (start.getTimezoneOffset() / 60), 0, 0, 0);

		var $rowUp = $('<tr>');
		var $rowDown = $('<tr class="gantt-head-20">');
		while (date < end2) {

			$rowUp.append('<th colspan="' + (60 / step) + '">' + date.toISODateString() + ' ' + date.getHours() + 'h</th>');
			for (var i = 0; i < 60; i += step) {
				$rowDown.append('<th>' + i + '</th>');
			}
			date = new Date(date.getTime() + 3600 * 1000);
		}

		return $('<thead>').append($rowUp).append($rowDown);
	},

	/**
	 * Get the position of a date in the gantt chart
	 * Depends of the chosen scale
	 */
	getPosition: function(date) {
		var diff = date - this.startDate + (date.getTimezoneOffset() * 60 * 1000);
		if (this.scale == 'day') {
			return (21 * diff) / (3600 * 1000 * 24);
		} else if (this.scale == 'quarter-day') {
			return (61 * diff) / (3600 * 1000 * 6);
		} else if (this.scale == 'hour') {
			return (21 * diff) / (3600 * 1000);
		} else if (this.scale == '10-minute') {
			return (21 * diff) / (600 * 1000);
		} else if (this.scale == 'minute') {
			return (21 * diff) / (60 * 1000);
		}
	},

	/**
	 * Add a bar to the gantt chart for the given feature
	 */
	addBar: function(feature) {

		var start = Date.fromISOString(Configuration.getMappedProperty(feature, "start"));
		var end = Date.fromISOString(Configuration.getMappedProperty(feature, "stop"));

		var tooltip = "Id : " + feature.id + "&#13;";
		tooltip += "Start : " + start.toISOString() + "&#13;";
		tooltip += "End  : " + end.toISOString();
		var $bar = $('<div title="' + tooltip + '" class="gantt-bar">');
		//var $table = this.$el.find('table');
		var hh = 34; //$table.find('thead').outerHeight();

		var s = this.getPosition(start);
		var e = this.getPosition(end);

		var numBars = this.$el.find('.gantt-body-scroll').children('.gantt-bar').length;
		$bar.css({
			top: 1 + numBars * 21,
			left: s,
			width: e - s
		});

		var self = this;
		$bar.appendTo(this.$el.find('.gantt-body-scroll'))
			// ZoomTo & highlight the selected feature
			.click(function() {
				if (self.model.highlight) {
					Map.zoomToFeature(feature);
					self.model.highlight([feature]);
				}
			});
	},

	/**
	 * Build the table : table is used to build headers, and to have grid on body
	 */
	buildTable: function(start, end, nbRows) {
		var $headTable = $('<table cellspacing="0" cellpadding="0">');

		if (this.scale == 'day') {
			$headTable.append(this.buildDayScale(start, end));
		}
		if (this.scale == 'quarter-day') {
			$headTable.append(this.buildQuarterDayScale(start, end));
		} else if (this.scale == 'hour') {
			$headTable.append(this.buildHourScale(start, end));
		} else if (this.scale == '10-minute') {
			$headTable.append(this.buildMinuteScale(start, end, 10));
		} else if (this.scale == 'minute') {
			$headTable.append(this.buildMinuteScale(start, end, 1));
		}

		var nbCells = $headTable.find('thead tr:last-child').children().length;

		if (nbCells > 1000) {
			this.$el.append('<div class="gantt-data-panel"><div class="gantt-nodata">Cannot display data for the selected time scale : ' + nbCells + ' steps needed.</div></div>');
			return;
		}

		// Build rows for table
		var $bodyTable = $('<table cellspacing="0" cellpadding="0">');

		var rowStr = '<tr';
		if (this.scale == 'quarter-day') {
			rowStr += ' class="gantt-body-60"';
		}
		rowStr += '>';
		for (var j = 0; j < nbCells; j++) {
			rowStr += '<td></td>';
		}
		rowStr += '</tr>';

		var tbodyStr = '<table cellspacing="0" cellpadding="0"><tbody>';
		for (var i = 0; i < nbRows; i++) {
			tbodyStr += rowStr;
		}
		tbodyStr += '</tbody></table>';

		var $headTable = $('<div class="gantt-head-scroll">').append($headTable);

		this.$el.find('.gantt-data-panel')
			.append($headTable)
			.append('<div class="gantt-body-scroll">' + tbodyStr + '</div>');


		//var diffWidth = this.$el.find('.gantt-head-scroll table').width() - this.$el.find('.gantt-body-scroll table').width();

		var $head = this.$el.find('.gantt-head-scroll');
		this.$el.find('.gantt-body-scroll').scroll(function(event) {
			$head.scrollLeft($(this).scrollLeft());
		});

	},

	/**
	 * Render the table
	 */
	render: function() {

		this.$el.addClass('gantt-view');
		this.$el.append('<div class="gantt-left-panel">\
		<fieldset data-role="controlgroup" data-mini="true">\
				<legend>Time scale:</legend>\
					<label>Minute<input type="radio" name="radio-time-scale" value="minute" /></label>\
					<label>10 minute<input type="radio" name="radio-time-scale" value="10-minute" /></label>\
					<label>Hour<input type="radio" name="radio-time-scale" value="hour" /></label>\
					<label>Quarter day<input type="radio" name="radio-time-scale" value="quarter-day" checked="checked" /></label>\
					<label>Day<input type="radio" name="radio-time-scale" value="day" /></label>\
		</fieldset></div>');

		this.clear();

		this.$el.trigger('create');

	}

});

module.exports = GanttView;
});

require.register("ui/menubar", function(exports, require, module) {
/**
 * MenuBar module
 * Manage page and module dynamic loading
 * Page are display above the map, with transparent background.
 */

var Logger = require('logger');
/**
 * The currently active menu item
 */
var activeMenuItem = null;

/**
 * The currently active page
 */
var activePage = null;

/**
 * Cache for menu page content
 */
var pageCache = {};

/**
 * Router used by the MenuBar
 */
var router = new Backbone.Router();


/**
 * Add page content
 */
var addPageContent = function($link, $div) {
	// Wrap the page co
	if (!$link.data('nowrap')) {
		$div.children().wrapAll('<div class="menuBarPageContent"></div>');
		$div.addClass('menuBarPage');
	}
	pageCache[$link.attr('href')] = $div;
	$div.hide();
	$('#mapContainer').prepend($div);
};

/**
 * Load a page
 */
var loadPage = function($link) {

	var href = $link.attr('href');
	if ($link.data('module')) {

		// Load and intialize the module
		var Module = require($link.data('module'));

		// First build the div and add it to build content
		var $div = Module.buildElement();
		addPageContent($link, $div);
		$div.data('module', Module);
		Module.initialize($div);

	}

};

/**
 * Show a page
 */
var _showPage = function(page) {
	page.slideDown(200);
	activePage = page;
	var module = activePage.data('module');
	if (module && module.show) {
		module.show();
	}
};

/**
 * Show a link
 */
var showInternalLink = function(link) {

	var linkRef = link.attr('href');
	var page = pageCache[linkRef];
	if (page) {
		if (activePage) {
			var module = activePage.data('module');
			if (module && module.hide) {
				module.hide();
			}
			activePage.slideUp(200, function() {
				_showPage(page);
			});
		} else {
			_showPage(page);
		}
	}

	// Update active menu item
	link.addClass('active');
	if (activeMenuItem) activeMenuItem.removeClass('active');
	activeMenuItem = link;
};

/**
 * Callbacks call when a page content is loaded
 */
var onPageLoaded = function() {
	$.mobile.loading("hide");

	// Start backbone history
	var routeMatch = Backbone.history.start();

	// Go to default page if none requested
	if (!routeMatch) {
		var defaut = $("header nav").data("default");
		Backbone.history.navigate(defaut, {
			trigger: true
		});
	}

};

module.exports = {
	/**
	 * Initialize the menubar component
	 */
	initialize: function(selector) {

		var links = $(selector).find('a');

		// Traverse all the links and search if the div is not already contained in the main page
		$(selector).find('a').each(function() {
			var $this = $(this);
			var linkRef = $this.attr('href');

			// If the link is contained in the document, process it.
			if (linkRef.charAt(0) == '#') {

				// Add content if aleady in the document, otherwise load the page
				var jContent = $($this.attr('href'));
				if (jContent.length > 0) {
					addPageContent($this, jContent);

				} else {
					loadPage($this);
				}

				//TODO: HACK because we already have a router.route("data-services-area") on dsa.js
				//and the router.route("data-services-area") calls the showPage with parameter "data-services-area"
				if (linkRef.substr(1) != "data-services-area") {
					// Add a route to show the link
					router.route(linkRef.substr(1), linkRef.substr(1), function() {
						showInternalLink($this);
					});
				}

			}
		});

		onPageLoaded();
	},

	/**
	 * Show a page of the menubar
	 */
	showPage: function(name) {
		showInternalLink($('a[href=#' + name + ']'));
	}
};
});

require.register("ui/pagination", function(exports, require, module) {

/**
 *	The model of this view is FeatureCollection
 */
var Pagination = Backbone.View.extend({

	initialize: function(options) {
		if ( this.model ) {
			this.setupListeners();
			this.updatePagination();
		}
		this.pagesRange = 5;
	},

	events: {
		// Manage paging through buttons
		'click .first': function() {
			this.model.changePage(1);
		},
		'click .last': function() {
			this.model.changePage(this.model.lastPage);
		},
		'click .next': function() {
			this.model.changePage(this.model.currentPage + 1);
		},
		'click .prev': function() {
			this.model.changePage(this.model.currentPage - 1);
		},
		'click .pageNum': function(event) {
			this.model.changePage(parseInt($(event.currentTarget).attr("value")));
		}
	},

	/**
	 * Called when features are added/removed
	 */
	updatePagination: function() {

		this.$el.find('.pageNum').remove();
		if (parseInt(this.model.totalResults) > 0) {
			// Updage paging button according to the current page
			this.$el.find('#globalPaging a').removeClass('ui-disabled');
			if (this.model.currentPage == 1) {
				this.$el.find('.prev').addClass('ui-disabled');
				this.$el.find('.first').addClass('ui-disabled');
			}
			if (this.model.currentPage == this.model.lastPage) {
				this.$el.find('.next').addClass('ui-disabled');
				this.$el.find('.last').addClass('ui-disabled');
			}
			this.generatePages();
		} else if (this.model.totalResults == 0) {
			this.$el.find('#globalPaging a').addClass('ui-disabled');
		}

		// Trigger is currently used only to update width of bottom datasets toolbar
		// TODO: improve behaviour with flex ?
		this.trigger('pagination:updated');
	},

	/**
	 *	Setup listeners of FeatureCollection to updating pagination GUI
	 */
	setupListeners: function() {
		this.listenTo(this.model, 'reset:features', this.updatePagination);
		this.listenTo(this.model, 'add:features', this.updatePagination);
		this.listenTo(this.model, 'error:features', function(searchUrl) {
			console.error("Error while retrieving features : " + searchUrl);
		});
	},

	/**
	 *	Set model representing the view
	 */
	setModel: function(model) {
		if ( this.model ) {
			this.stopListening(this.model);
		}
		this.model = model;
		this.setupListeners();
		this.updatePagination();		
	},

	/**
	 *	Generate pages between "Prev" and "Next" labels
	 */
	generatePages: function() {
		if ( this.model ) {

			var startIndex;
			var halfRange = Math.floor(this.pagesRange / 2) + 1;
			if ( this.model.lastPage <= this.pagesRange ) {
				// Case when the range is larger than available pages in dataset
				startIndex = 1;
				endIndex = this.model.lastPage;
			} else {
				if ( this.model.currentPage <= halfRange ) {
					// First half start from beginning
					startIndex = 1;
				} else {
					// Nominal case : compute from current page
					startIndex = this.model.currentPage - (halfRange - 1);
				}

				if ( this.model.currentPage + halfRange > this.model.lastPage )
				{
					// Almost at the end so clamp it by last page
					endIndex = this.model.lastPage;
				} else {
					// Nominal case : compute from current page
					endIndex = this.model.currentPage + (halfRange - 1);
				}
			}

			for ( var i=startIndex; i <= endIndex; i++ ) {
				this.$el.find('.next').before('<a class="pageNum" data-role="button" value="'+i+'">'+i+'</a>');
			}
			this.$el.find('.pageNum[value="'+ this.model.currentPage +'"]').addClass('ui-btn-active');
			this.$el.trigger("create");

		}
	},

	/**
	 *	Render
	 */
	render: function() {
		var content = '<div id="globalPaging" style="text-align: center; margin: 4px 15px;" data-role="controlgroup" data-type="horizontal" data-mini="true">\
			<a class="first" data-role="button"><<</a>\
			<a class="prev" data-role="button"><</a>\
			<a class="next" data-role="button">></a>\
			<a class="last" data-role="button">>></a>\
		</div>';
		this.$el.html(content).trigger("create");
		this.$el.find("a").addClass("ui-disabled");
		if ( this.model ) {
			this.updatePagination();
		}
	}

});

module.exports = Pagination;
});

require.register("ui/panelManager", function(exports, require, module) {
/**
 * The PanelManager manages a view with different panels : left, top, center, bottom...
 */
var PanelManager = Backbone.View.extend({

	/**
		Constructor
	 */
	initialize: function(options) {

		/**
		 *	Redraw the element, used for CHROME HACK
		 */
		jQuery.fn.redraw = function() {
			return this.hide(0, function() {
				$(this).show();
			});
		};

		this.$center = $(options.center);

		var self = this;
		this.centerResizedCallback = function() {
			// CHROME HACK
			var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
			if (isChrome) {
			// 	$('#statusBar').redraw();
			// 	if ($('#dateRangeSlider').is(':visible'))
			// 		$('#dateRangeSlider').redraw();
			// 	$('#bottomToolbar').redraw();
				$('#map').redraw();
			}
			self.trigger('centerResized');
		};
		this.leftResizedCallback = function() {
			self.trigger('leftResized');
		};

		var lazyResize = _.debounce(function() {
			self.trigger('centerResized');
			self.trigger('leftResized');
		}, 300);

		$(window).resize(lazyResize);

		$('#dateRangeSlider').on('drs:hide', function() {

			var currentBottom = parseFloat(self.left.$el.css("bottom"));
			self.left.$el.animate({
				"bottom": currentBottom - 24
			}, 400, self.leftResizedCallback);

		});

		// Update layout when dateRangeSlider visiblity has changed
		$('#dateRangeSlider').on('drs:show', function() {

			setTimeout(function() {
				var currentBottom = parseFloat(self.left.$el.css("bottom"));
				self.left.$el.animate({
					"bottom": currentBottom + 24
				}, 400, self.leftResizedCallback);
			}, 0)
		});

		this._centerState = null;
	},

	/**
		Add a panel to a region
	 */
	add: function(region, panel) {

		this[region] = panel;

		// Setup the panel
		panel.regionManager = this;
		panel.region = region;
	},

	/**
		Save the layout, and hide it
	 */
	save: function() {
		this.bottom.$el.hide();
		this.left.$el.hide();
		this._centerState = {
			bottom: this.$center.css('bottom'),
			left: this.$center.css('left')
		};
		this.$center.css({
			bottom: 0,
			left: 0
		});
		this.trigger('centerResized');
	},

	/**
		Restore the layout
	 */
	restore: function() {
		if (this._centerState) {
			this.bottom.$el.show();

			if (this.bottom.activeView && this.bottom.activeView.refresh) {
				this.bottom.activeView.refresh();
			}
			this.left.$el.show();
			this.$center.css(this._centerState);
			this.trigger('centerResized');
		}
	},

	/**
	  Called when the panel size has changed
	 */
	updatePanelSize: function(region) {
		var currentSize = this.getSize(region);
		var prevSize = parseFloat(this.$center.css(region));
		if (currentSize != prevSize) {
			var props = {};
			props[region] = currentSize;
			//this.$center.css(props);
			//this.trigger('centerResized');
			if (region == 'bottom') {
				this.left.$el.css(props);
				this.trigger('leftResized');
			}
		}
	},

	/**
		Get the size for one region
	*/
	getSize: function(region) {
		switch (region) {
			case 'left':
				return this.left.$el.outerWidth();
			case 'bottom':
				return this.bottom.$el.outerHeight();
		}
		return 0;
	},

	/**
		Show a panel
	*/
	show: function(region, duration) {
		var props = {};
		props[region] = this.getSize(region);
		// this.$center.animate(props, duration, this.centerResizedCallback);

		var offset = 0;
		if (region == 'bottom') {
			offset = /*$('#statusBar').height() +*/ $('#bottomToolbar').height() + $('#dateRangeSlider').height() + 2;

			this.$center.animate({
				"bottom": props.bottom - offset
			}, duration, this.centerResizedCallback);

			this.left.$el.animate({
				"bottom": props.bottom
			}, duration, this.leftResizedCallback);
		}

		props[region] = 0;
		this[region].$el.animate(props, duration);
		if ( region == 'left' ) {
			$('#searchToolbar').animate({'left': 402});
		}

		// Listen to size event on the panel
		this.listenTo(this[region], 'sizeChanged', _.bind(this.updatePanelSize, this, region));
	},

	/**
		Hide a panel
	*/
	hide: function(region, duration, callback) {
		var props = {};
		props[region] = 0;
		// this.$center.animate(props, duration, this.centerResizedCallback);

		var offset = 0;
		if (region == 'bottom') {
			this.$center.animate(props, duration, this.centerResizedCallback);
			offset = /*$('#statusBar').height() +*/ $('#bottomToolbar').height() + $('#dateRangeSlider').height() + 2;
			this.left.$el.animate({
				"bottom": props.bottom + offset
			}, duration, this.leftResizedCallback);
		}

		props[region] = -this.getSize(region) + offset;
		this[region].$el.animate(props, duration, callback);
		if ( region == 'left' ) {
			$('#searchToolbar').animate({'left': 0});
		}

		this.stopListening(this[region], 'sizeChanged');
	}

});

module.exports = PanelManager;
});

require.register("ui/sharePopup", function(exports, require, module) {
/**
 * Widget module
 */

var sharePopup_template = require('ui/template/sharePopup');

var $popup;

module.exports = {
	open: function(options) {
		if (!$popup) {
			$popup = $(sharePopup_template());

			$popup.find('#sharedUrlLinks a')
				.addClass('tb-elt')
				.wrapInner('<div class="tb-text"></div>')
				.prepend('<div class="tb-icon"></div>')
				.click(function() {
					$popup.popup('close');
				});

			$popup.appendTo('.ui-page-active');

			$popup.popup();
			$popup.trigger('create');

			$popup.find('#sharedUrlLinks a')
				.removeClass('ui-link')
		}

		var url = options.url;

		// NGEO-1774: Shared url is passed by sharedUrl parameter, since '#' is filtered by UM-SSO
		var sharedUrl = encodeURIComponent(window.location.origin + window.location.pathname + url.substr(url.indexOf("/sec/") + "/sec/".length));
		url = window.location.origin + window.location.pathname + "?sharedUrl=" + sharedUrl;

		$("#facebook").attr('href', 'https://www.facebook.com/sharer.php?u=' + encodeURIComponent(url));
		$("#twitter").attr('href', 'http://twitter.com/intent/tweet?status=' + encodeURIComponent(url));
		$("#email").attr('href', 'mailto:?body=' + encodeURIComponent(url));
		$("#raw").attr('href', url);

		$popup.popup('open', options);
	}
};
});

require.register("ui/stackPanel", function(exports, require, module) {
/**
 * The StackPanel manages a panel that contains different views, only one can be active at a time
 */

var defaultAreaView = null; // Default view with area to show
var currentAreaView = null; // View whose area is currently displayed on map

var StackPanel = Backbone.View.extend({

	// Constructor
	initialize: function(options) {

		this.regionManager = null;
		this.classes = options.classes;
		this.activeView = null;

	},

	add: function(view, activator) {
		this.$el.append(view.$el);

		view.on('sizeChanged', function() {
			this.trigger('sizeChanged');
		}, this);

		view.$el
			.hide()
			.addClass(this.classes);

		view.$activator = $(activator);

		var self = this;
		view.$activator.click(function() {
			self._toggle(view);
		});

		// Set default area view to be SearchCriteriaView for now
		if ( view.id == "datasetSearchCriteria" ) {
			defaultAreaView = view;
		}

		// Initialize current area view
		if ( view.hasOwnProperty("areaCriteriaView") ) {
			currentAreaView = view;
		}
	},

	_toggle: function(view) {

		if (view == this.activeView) {

			var self = this;
			this.regionManager.hide(this.region, 400, function() {
				self.activeView.$el.hide();
				if (self.activeView.onHide)
					self.activeView.onHide();
				self.activeView = null;

				// NGEO-1944: If view hasn't got area layer, set default one defined by defaultAreaViewId
				var currentAreaView = view.areaCriteriaView ? view : defaultAreaView;
				currentAreaView.onShow();
			});
			view.$activator.removeClass('toggle');

		} else {

			if (this.activeView) {
				this.activeView.$el.hide();
				this.activeView.$activator.removeClass('toggle');
				if (this.activeView.onHide)
					this.activeView.onHide();
			}

			// NGEO-1944: Only one area layer must be visible on map
			// Everytime set current layer visibility to false to handle the
			// case when no tab is opened but area is still on map
			currentAreaView.onHide();
			currentAreaView = view.areaCriteriaView ? view : defaultAreaView;
			currentAreaView.onShow();

			view.$el.show();
			if (view.onShow)
				view.onShow();
			view.$activator.addClass('toggle');

			if (!this.activeView) {
				this.regionManager.show(this.region, 400);
			}

			this.activeView = view;
		}
	},

});


module.exports = StackPanel;
});

require.register("ui/statusPanel", function(exports, require, module) {
var Configuration = require('configuration');
var Map = require('map/map');
var BrowsesManager = require('searchResults/browsesManager');
var DataSetSearch = require('search/model/datasetSearch');
var Pagination = require('ui/pagination');

// A constant
var ONE_MONTH = 24 * 30 * 3600 * 1000;

/**
 * The StatusPanel composed by statuses representing feature collection(dataset in other words)
 *
 * Each status could contain views:
 *	<ul>
 *		<li>Table view : Results table with metadata (instanciated by SearchResultsTableView)</li>
 *		<li>Gantt view : Temporal apperance of products</li>
 *	</ul>
 */
var StatusPanel = Backbone.View.extend({

	/**
	 * Constructor
	 */
	initialize: function(options) {

		var self = this;
		// Init the dateRangeSlider singleton here
		this.dateRangeSlider = $('#dateRangeSlider').dateRangeSlider({
			bounds: {
				min: DataSetSearch.get("start"),
				max: DataSetSearch.get("stop")
			}
		});

		this.regionManager = null;
		this.classes = options.classes;
		this.bottomActivator = null;

		this.activeStatus = null;
		this.activeView = null;
		
		// When a product has been picked, select the status with the most recent product
		Map.on('pickedFeatures', function(pickedFeatures) {
			var recentFeatureCollection = null;
			var maxDate = new Date("1980-01-01");
			for ( var i=0; i<pickedFeatures.length; i++ ) {
				var feature = pickedFeatures[i];
				var currentMaxDate = new Date(Configuration.getMappedProperty(feature, "start"));
				if (maxDate < currentMaxDate){
					maxDate = currentMaxDate;
					recentFeatureCollection = feature._featureCollection;
				}
			}

			// Very hacky method to click on status corresponding to picked features
			if ( recentFeatureCollection ) {
				if ( !recentFeatureCollection.dataset ) {
					// Actually shopcart doesn't have dataset, so since we have only one shopcart
					// click on shopcart
					// TODO: This issue will be resolved when multiple shopcarts could be chosen by user
					$('#shopcart').click();
				} else if ( recentFeatureCollection.id ) {
					// Otherwise the dataset containing products have been clicked
					$('#result' + recentFeatureCollection.id).click();
				}
			}
		});
		
		// Update statuses checkbox according to layer visibility
		Map.on('visibility:changed', function(layer) {
			
			if ( layer.params.type == "Browses" )
				return;

			// Very ugly method to find feature collection id from layer
			// TODO: improve !
			var fcId = layer.params.name.substr(0, layer.params.name.indexOf(" Result"));
			var selector = "#result"+fcId;
			if ( !fcId ) {
				// Shopcart special case
				fcId = layer.params.name.substr(0, layer.params.name.indexOf(" Footprint"));
				selector = "#shopcart";
			}

			if ( layer.params.visible ) {
				$(selector).find('.layerVisibility').removeClass('ui-icon-checkbox-off').addClass('ui-icon-checkbox-on');
			} else {
				$(selector).find('.layerVisibility').removeClass('ui-icon-checkbox-on').addClass('ui-icon-checkbox-off');
			}

		});

		this.pagination = new Pagination({
			model: null,
			el: this.$el.find('#statusPagination')
		});
		this.pagination.render();

		// Need to update bottom dataset width when several dataset has been chosen to hide overflow
		var updateBottomDatasetWidth = function() {
			var menuCommandWidth = 40; // Width of first button allowing to "Show table"
			$('#bottomDatasets').width($('#bottomToolbar').outerWidth() - self.$el.find('#statusPagination').width() - menuCommandWidth);
		};
		$(window).resize(updateBottomDatasetWidth)
		this.listenTo(this.pagination, 'pagination:updated', updateBottomDatasetWidth);
	},

	// Only used by shared shopcart. Should be removed later?
	showTable: function() {
		$('#table').click();
		this.toggleView(this.activeStatus.views[0]); // Supposing that actual selected view is ShopcartTableView
	},

	/**
	 * Add a view to the status panel
	 */
	addView: function(view) {

		view.on('sizeChanged', function() {
			this.trigger('sizeChanged');
		}, this);

		this.$el.append(view.$el);
		view.$el
			.hide()
			.addClass(this.classes);
	},

	/**
	 * Toggle a view state between visible or not
	 */
	toggleView: function(view) {

		if (view == this.activeView) {
			// No more view hiding since bottom-panel is relative for now
			// var viewToHide = this.activeView;
			this.regionManager.hide(this.region, 400/*, function() {
				viewToHide.hide();
			}*/);

			this.activeView = null;

		} else {
			if (this.activeView)
				this.activeView.hide();

			view.show();

			if (!this.activeView) {
				this.regionManager.show(this.region, 400);
			}

			this.activeView = view;
		}
	},

	/**
	 * Show a status
	 */
	showStatus: function(status) {
		// Desactivate previous status
		if (this.activeStatus) {
			this.activeStatus.$el.hide();
			$(this.activeStatus.activator).removeClass('toggle');

			// Reset the views
			for (var i = 0; i < this.activeStatus.views.length; i++) {
				this.activeStatus.views[i].setModel(null);
			}
		}

		// Show the status
		//status.$el.show();
		//status.views[0].$el.show();
		$(status.activator).addClass('toggle');

		// Manage active view : keep an active view if there is already one
		if (this.activeView) {

			var index = status.views.indexOf(this.activeView);
			if (index < 0) {
				this.toggleView(status.views[0]);
				this.activeView = status.views[0];
			}
		} else {
			this.toggleView(status.views[0]);
			this.activeView = status.views[0];
		}

		// Activate model for the views
		// NB: activate model after toggleView cuz element should be visible to compute width properly
		for (var i = 0; i < status.views.length; i++) {
			status.views[i].setModel(status.model);
		}
		this.pagination.setModel(status.model);

		this.activeStatus = status;
	},

	/**
	 *	Build result message
	 */
	buildResultMessage: function(features, fc) {
		var content = "";
		if ( fc.totalResults > 0 ) {
			var startIndex = 1 + (fc.currentPage - 1) * fc.countPerPage;
			var endIndex = Math.min(startIndex + fc.features.length - 1, fc.totalResults);
			content = startIndex + ' to ' + endIndex + " of " + fc.totalResults;
		} else if (fc.totalResults == 0) {
			content = 'No product found.';
		} else {
			content = 'No search done.';
		}
		return content;
	},

	/**
	 *	Add status to panel
	 */
	addStatus: function(status) {

		var self = this;

		// Link activators with views
		// $.each(status.views, function(index, view) {
		// 	console.log("Binding " + $(status.viewActivators[index]).attr("id") +" to " + view.cid);
		// 	status.viewActivators[index].unbind('click').click(function(event) {
		// 		self.toggleView(view);
		// 		$(this).toggleClass("toggle");
		// 		//self.removeClass("toggle");
		// 		// if (!self.activeView) {
		// 		// 	$(this).prop("checked", false).checkboxradio("refresh");
		// 		// }
		// 	});
		// });

		if ( status.model ) {

			this.listenTo(status.model, "startLoading", function() {
				$(status.activator).find('.nbFeatures').html("Searching...").addClass("pulsating");
			});

			// Update tiny red circle with number of features on search
			this.listenTo(status.model, "add:features", function(features, fc) {
				// Use of closure for status
				$(status.activator).find('.nbFeatures').removeClass("pulsating").html(this.buildResultMessage( features, fc ));
			});

			this.listenTo(status.model, "remove:features", function(features, fc) {
				$(status.activator).find('.nbFeatures').html(this.buildResultMessage( features, fc ));
			});

			this.listenTo(status.model, 'error:features', function(searchUrl) {
				$(status.activator).find('.nbFeatures').removeClass("pulsating").html("Error on search");
			});

			this.listenTo(status.model, "reset:features", function(fc){
				// Hide it only on first search, no need for pagination searches
				if ( fc.currentPage == 0 ) {
					$(status.activator).find('.nbFeatures').html("No search done");
				}
			});

			this.listenTo(status.model, "endLoading", function(nbFeatures) {
				if (typeof nbFeatures !== undefined && nbFeatures === 0) {
					$(status.activator).find('.nbFeatures').removeClass("pulsating").html("No data to display");
				}
			});
		}

		// React when the activator is toggled
		$(status.activator).unbind('click').click(function() {
			if (!$(this).hasClass('toggle')) {
				self.showStatus(status);
				self.activeView = status.views[0];
			}
		});

		// Update footprint/browses visibility when layerVisibility checkbox is toggled
		$(status.activator).find('.layerVisibility').click(function(event) {
			event.stopPropagation();
			var _footprintLayer = status.model._footprintLayer;
			var isVisible = !_footprintLayer.params.visible;
			_footprintLayer.setVisible(isVisible);
			
			// Show/Hide browses
			var browsesLayers = BrowsesManager.getSelectedBrowseLayers(status.model);
			for ( var i=0; i<browsesLayers.length; i++ ) {
				browsesLayers[i].setVisible(isVisible);
			}
		});

		// Activate the first 'status'
		if (!this.activeStatus) {
			this.showStatus(status);
		} else {
			status.$el.hide();
		}
	},

	/**
	 *	Remove status from panel
	 */
	removeStatus: function(activatorId) {
		$(activatorId).remove();
	},

	setActiveView(view) {
		this.activeView = view;
	}

});


module.exports = StatusPanel;
});

require.register("ui/tableView", function(exports, require, module) {
var Configuration = require('configuration');
var DataSetSearch = require('search/model/datasetSearch');
var Map = require('map/map');
var Pagination = require('ui/pagination');
var tableColumnsPopup_template = require('ui/template/tableColumnsPopup');
var FeatureCollection = require('searchResults/model/featureCollection');
var SearchResultsMap = require('searchResults/map');
var MultipleBrowseWidget = require('searchResults/widget/multipleBrowseWidget');

/**
 *	Get nested objects containing the given key
 *		@param options
 *			<ul>
 *			    <li>val : Filter by value</li>
 *			    <li>firstFound : Boolean indicating if you need to return the first found object</li>
 *			<ul>
 */
var _getObjects = function(obj, key, options) {
	if ( options ) {
		var val = options.hasOwnProperty("val") ? options.val : null;
		var firstFound = options.firstFound ? options.firstFound : false;
	}

	var objects = [];
	for (var i in obj) {
		if (!obj.hasOwnProperty(i))
			continue;
		if ( i == key && (val == undefined || obj[i] == val) ) {
			if ( firstFound )
				return obj;
			objects.push(obj);
		}

		if (typeof obj[i] == 'object') {
			var foundObjects = _getObjects(obj[i], key, options);
			if ( !_.isArray(foundObjects) && firstFound ){
				return foundObjects;
			}
			else
			{
				objects = objects.concat(foundObjects);
			}
		}
	}
	return objects;
}

var _allHighlights = [];
var ctrlPressed = false;
var shiftPressed = false;
var _lastSelectedRow = null;
var _clickInTable = false; // Terrible hack to avoid scrolling to most recent feature(FIXME please..)

/**
 *	Toggle arrays helper used to splice/push features depending on their presence in prevArray
 *	Used to handle Shift+click selection
 *	Ex: newArray = [1,2,3]; prevArray = [2,3,4] --> prevArray becomes = [1,4]
 */
var toggleArrays = function(newArray, prevArray) {
  	for ( var i=0; i<newArray.length; i++ ) {
  		var item = newArray[i];
  		var idx = _.indexOf(prevArray, item);
  		if ( idx !== -1 ) {
  			prevArray.splice(idx, 1);
  		} else {
  			prevArray.push(item);
  		}
  	}
}

/**
 * A view to display a table.
 * The model contains a feature collection
 */
var TableView = Backbone.View.extend({

	/**
	 * Constructor
	 * Connect to model change
	 */
	initialize: function(options) {

		this.setModel(this.model);

		if (options) {
			this.columnDefs = options.columnDefs;
		}

		this.hasExpandableRows = false;

		this.rowsData = [];
		this.visibleRowsData = [];
		this.feature2row = {};

		this.maxVisibleColumns = 10;
		var self = this;

		var onKeyDown = function(e) {
			if ( e.keyCode == '17' ) {
				ctrlPressed = true;
			}
			if ( e.keyCode == '16' ) {
				shiftPressed = true;
			}

			if ( ctrlPressed && e.keyCode == '65' ) {
				// Ctrl+A : select all
				e.preventDefault();

				if ( self.model )
					$(self.$el.find('.table-view-checkbox').get(0)).trigger('click');
			}
		}
		var onKeyUp = function(e) {
			if ( e.keyCode == '17' ) {
				ctrlPressed = false;
			}
			if ( e.keyCode == '16' ) {
				shiftPressed = false;
			}
		}
		document.addEventListener('keydown', onKeyDown);
		document.addEventListener('keyup', onKeyUp);

		/**
		 *	This code just temporary serves to trigger highlight on ALL the feature collections
		 *	TODO: Replace the mecanism by something more sexy..
		 */
		this.triggerHighlightFeature = _.debounce(function(){
			this.highlightFeature(_allHighlights);
			_allHighlights = [];
		}, 10);
	},

	/**
	 * Manage events on the view
	 */
	events: {

		// Call when the user enter text in the filter input
		'keyup input': function(event) {
			this.filterData($(event.currentTarget).val());
		},

		'dblclick tr': function(event) {
			var data = $(event.currentTarget).data('internal');
			if (data) {
				Map.zoomToFeature(data.feature);
			}
		},

		'click .multipleBrowse': function(event) {
			var data = $(event.currentTarget).closest('tr').data('internal')
			MultipleBrowseWidget.open({
				feature: data.feature,
				featureCollection: this.model
			});
		},

		// Call when a row is clicked
		'click tr': function(event) {
			var $row = $(event.currentTarget);
			var data = $row.data('internal');
			if ( data ) {
				var fc = this.model;
				var currentHighlights;
				if ( ctrlPressed ) {
					if ( fc.highlights.indexOf(data.feature) != -1 ) {
						currentHighlights = _.without(fc.highlights, data.feature);
					} else {
						currentHighlights = fc.highlights.concat(data.feature);
					}
				} else if ( shiftPressed && _lastSelectedRow ) {
					document.getSelection().removeAllRanges();
					var range = [_lastSelectedRow, $row].sort(function(a,b) { return a.index() - b.index() } );

					var selectedRows = range[0].nextUntil(range[1]);
					selectedRows.push(event.currentTarget);
					var selectedFeatures = _.map(selectedRows, function(row) {
						return $(row).data('internal').feature;
					});
					currentHighlights = fc.highlights.slice(0);
					toggleArrays(selectedFeatures, currentHighlights);
				} else {
					currentHighlights = [data.feature];
				}
				_clickInTable = true;
				_lastSelectedRow = $row;

				if (fc.highlight && data.feature) {
					fc.highlight(currentHighlights);
				}
			}
		},

		// Call when the header is clicked : sort
		'click th': function(event) {

			var $cell = $(event.currentTarget);
			$cell.siblings("th").removeClass('sorting_asc').removeClass('sorting_desc');

			if ($cell.find('.table-view-checkbox').length > 0)
				return;

			var cellIndex = this.columnDefs.indexOf(_.find(this.columnDefs, function(c) { return c.sTitle == $cell.html(); } ));
			if ($cell.hasClass('sorting_asc')) {
				$cell.removeClass('sorting_asc');
				this.sortData(-1, 'original');
			} else if ($cell.hasClass('sorting_desc')) {
				$cell.removeClass('sorting_desc');
				$cell.addClass('sorting_asc');
				this.sortData(cellIndex, 'asc');
			} else {
				$cell.addClass('sorting_desc');
				this.sortData(cellIndex, 'desc');
			}
		},

		// Call when the expand icon is clicked
		'click .table-view-expand': function(event) {
			// Change icon and return the row
			var $row = $(event.currentTarget)
				.toggleClass('ui-icon-minus')
				.toggleClass('ui-icon-plus')
				.closest('tr');

			var rowData = $row.data('internal');
			rowData.isExpanded = !rowData.isExpanded;
			if (rowData.isExpanded) {
				this.expandRow($row);
			} else {
				this.closeRow($row);
			}
		},

		// Called when the user clicks on "browse-visibility" checkbox in table
		'click .browse-visibility-checkbox': function(event) {
			var $target = $(event.currentTarget);
			var $row = $target.closest('tr');
			var data = $row.data('internal');

			// Based on css value, show/hide browses
			if ($target.hasClass('ui-icon-checkbox-off')) {
				this.model.showBrowses( $row.hasClass('row_selected') ? this.model.highlights : [data.feature] );
			} else {
				this.model.hideBrowses( $row.hasClass('row_selected') ? this.model.highlights : [data.feature] );
			}
		},

		// Called when the user clicks on the "selection" checkbox in table
		'click .table-view-checkbox': function(event) {
			// Retreive the position of the selected row
			var $target = $(event.currentTarget);
			var $row = $target.closest('tr');
			var data = $row.data('internal');

			if ($target.hasClass('ui-icon-checkbox-off')) {
				// Chose model between Dataset & children
				// HUGE problem with multiple feature collections cuz this view depends on model
				if (data) {
					var model = data.parent ? data.parent.childFc : this.model;
					// NGEO-2174: check every highlighted feature when clicking on already selected row
					model.select( $row.hasClass('row_selected') ? model.highlights : [data.feature] );
				} else {
					// "Select all" case
					var filteredFeatures = _.pluck(this.visibleRowsData, 'feature');
					this.model.selectAll(filteredFeatures);
					$target
						.removeClass('ui-icon-checkbox-off')
						.addClass('ui-icon-checkbox-on');
				}
			} else {
				if (data) {
					var model = data.parent ? data.parent.childFc : this.model;
					// NGEO-2174: uncheck every highlighted feature when clicking on already selected row
					model.unselect( $row.hasClass('row_selected') ? model.highlights : [data.feature] );
				} else {
					// "Unselect all" case
					this.model.unselectAll();
					$target
						.removeClass('ui-icon-checkbox-on')
						.addClass('ui-icon-checkbox-off');
				}
			}
		},

		'click #table-columns-button': function(event) {

			var self = this;
			$(tableColumnsPopup_template(this)).appendTo('.ui-page-active')
				.trigger('create')
				.popup({
					theme: 'c'
				})
				.on('change', 'input', function(event) {
					// Get the column to change
					var i = $(this).data('index');
					self.columnDefs[i].visible = $(this).is(':checked');

					// Rebuild the table with the new columns
					self.buildTable();
					self.buildTableContent();
				})
				.on('popupafterclose', function(event, ui) {
					$(this).remove();
				})
				.popup('open', {
					positionTo: this.$el.find('#table-columns-button')
				});
		},
		
		// Incremental pagination
		'click .loadMore' : function(event) {
			var rowData = $(event.currentTarget).closest('.paging').data("internal");
			// If row is already loading, exit !
			if (rowData.childFc.isLoading)
				return;

			rowData.childFc.appendPage( rowData.childFc.currentPage + 1 );
		}
	},

	/**
	 * Set the model to be used by the TableView
	 */
	setModel: function(model) {

		if (this.model) {
			// Clean-up previous data
			this.clear();

			// Clean-up callbacks
			this.stopListening(this.model);
		}

		this.model = model;
		var self = this;
		if (this.model) {
			this.listenTo(this.model, "reset:features", this.clear);
			this.listenTo(this.model, "add:features", this.addData);
			this.listenTo(this.model, "remove:features", this.removeData);
			this.listenTo(this.model, "selectFeatures", this.updateSelection);
			this.listenTo(this.model, "unselectFeatures", this.updateSelection);
			this.listenTo(this.model, "show:browses", this.showBrowses);
			this.listenTo(this.model, "hide:browses", this.hideBrowses);
			this.listenTo(this.model, "highlightFeatures", function(features){
				_allHighlights = _allHighlights.concat(features);
				self.triggerHighlightFeature();
			});
			this.listenTo(this.model, "update:downloadOptions", this.updateRows);

			if (this.model.features.length > 0) {
				this.addData(this.model.features);
			}

			// Apply filter for the new model
			if ( $('#filterTableInput').val() ) {
				this.filterData($('#filterTableInput').val());
			}
			
		}
	},
	
	/**
	 *	Update rows of given features
	 */
	updateRows: function(features) {

		for ( var i=0; i<features.length; i++ ) {
			var feature = features[i];
			var $row = this._getRowFromFeature(feature);
			var rowData = $row.data("internal");

			// Update offset
			var tdOffset = 1; // Since first <td> could be + and checkbox
			if ( rowData.isExpandable ) {
				tdOffset++;
			}

			// Update rowData according to columnDefs
			rowData.cellData.length = 0;
			for (var j = 0; j < this.columnDefs.length; j++) {
				var d = Configuration.getFromPath(feature, this.columnDefs[j].mData);
				rowData.cellData.push(d);
				$($row.find("td").get(j + tdOffset)).html(d);
			}

			this._updateRow(rowData, $row);
		}
		this.updateFixedHeader();
	},

	/**
	 * Expand a row
	 */
	expandRow: function($row) {

		var rowData = $row.data('internal');

		// If row is already loading, exit !
		if (rowData.isLoading)
			return;

		var expandUrl = null;
		if (DataSetSearch.get("mode") != "Simple") {
			// Interferometric search
			expandUrl = Configuration.getMappedProperty(rowData.feature, "interferometryUrl", null);
		} else {
			// Granules search
			expandUrl = Configuration.getMappedProperty(rowData.feature, "virtualProductUrl", null);
			// HACK: Update WEBS response from atom to json : to be fixed by WEBS later
			expandUrl = expandUrl.replace("format=atom", "format=json");
		}

		this.createChildrenFeatureCollection(rowData);
		// Launch search
		rowData.childFc.search(expandUrl);
	},

	/**
	 * Close a row
	 */
	closeRow: function($row) {

		var rowData = $row.data('internal');

		if (rowData.isLoading) {
			$row.next().remove();
		} else {

			if ( rowData.childFc ) {
				this.model.removeChild(rowData.feature.id);
			}

			rowData.children.length = 0;
			$row.nextAll('.child_of_'+ rowData.childFc.id).remove();
			$row.next('.paging_child_of_'+ rowData.childFc.id).remove();
		}
	},

	/**
	 * Highlight the features on the table when they have been highlighted on the map.
	 */
	highlightFeature: function(features, prevFeatures) {
		if (!this.$table) return;

		// Remove previous highlighted rows
		this.$table.find('.row_selected').removeClass('row_selected');

		if (features.length > 0) {
			var rows = this.$table.find("tbody tr");
			for (var i = 0; i < features.length; i++) {

				var $row = this._getRowFromFeature(features[i]);
				if ( $row ) {
					$row.addClass('row_selected');
				}
			}

			// NGEO-1941: Scroll to the most recent highlighted product in table
			var mostRecentFeature = _.max(features, function(f) {
				return new Date(Configuration.getMappedProperty(f, "stop"));
			});

			var $mostRecentRow = this._getRowFromFeature(mostRecentFeature);
			if ( $mostRecentRow && !_clickInTable ) {
				this._scrollTo($mostRecentRow);
			} else {
				_clickInTable = false;
			}

		}
	},

	/**
	 *	Scroll table elt to the given $row
	 *	Check if the the selected row isn't already visible btw
	 */
	_scrollTo: function($row) {
		var rowTop = $row.position().top;
		var offset = $row.height() / 2; // Take a half-height as an offset on both sides (top/bottom)
		var isVisibleInContent = (rowTop > offset && rowTop < this.$el.find(".table-content").height() - offset);
		if ( !isVisibleInContent ) {
			// Scroll only if not already visible in table content
			this.$el.find(".table-content").animate({
				scrollTop: rowTop - this.$el.find(".table-content tbody").position().top - 90 // "90" magic number to place in "center"
			}, {
				duration: 500,
				easing: "easeOutQuad"
			});
		}
	},

	/**
	 * Helper function to retreive a row from a feature
	 */
	_getRowFromFeature: function(feature) {
		if (this.feature2row.hasOwnProperty(feature.id)) {
			var $row = this.feature2row[feature.id];
			return $row;
		} else {
			return null;
		}
	},

	/**
	 *	Hide browses for the given features
	 */
	hideBrowses: function(features) {
		if (!this.$table) return;

		for (var i = 0; i < features.length; i++) {
			var $row = this._getRowFromFeature(features[i]);
			if ($row) { 
				$row.find('.browse-visibility-checkbox')
					.addClass('ui-icon-checkbox-off')
					.removeClass('ui-icon-checkbox-on');
			}
		}
	},

	/**
	 *	Show browses for the given features
	 */
	showBrowses: function(features) {
		if (!this.$table) return;

		for (var i = 0; i < features.length; i++) {
			var $row = this._getRowFromFeature(features[i]);
			if ($row) { 
				$row.find('.browse-visibility-checkbox')
					.removeClass('ui-icon-checkbox-off')
					.addClass('ui-icon-checkbox-on');
			}
		}
	},

	/**
	 * Update selection checkbox state for the given features
	 * based on "selection" property of current <FeatureCollection>
	 */
	updateSelection: function(features) {
		if (!this.$table) return;

		for (var i = 0; i < features.length; i++) {
			var $row = this._getRowFromFeature(features[i]);

			if ( $row && this.model.selection.indexOf(features[i]) >= 0 ) {
				// Feature is seleceted
				$row.find('.table-view-checkbox')
					.addClass('ui-icon-checkbox-on')
					.removeClass('ui-icon-checkbox-off');
			} else {
				// Feature isn't selected
				$row.find('.table-view-checkbox')
					.removeClass('ui-icon-checkbox-on')
					.addClass('ui-icon-checkbox-off');
			}
		}
	},

	/**
	 * Clear data
	 */
	clear: function() {
		if (this.$table) {
			this.$table.html('<div class="table-nodata">No data found</div>');

			this.rowsData = [];
			this.hasExpandableRows = false;

			// Reset the number of non-empty cells
			for (var i = 0; i < this.columnDefs.length; i++) {
				this.columnDefs[i].numValidCell = 0;
			}
		}
	},

	/**
	 *	Create row data for the given feature
	 */
	createRowData: function(feature, parentRowData) {

		var isExpandable = false;
		var hasGraticules = false;
		var links = Configuration.getMappedProperty(feature, "links", null);
		if (links) {
			// Is interferometric search
			isExpandable = Boolean(_.find(links, function(link) {
				return link['@rel'] == "related" && link['@title'] == "interferometry";
			}));
			hasGraticules |= Boolean(Configuration.getMappedProperty(feature, "virtualProductUrl", null));
			isExpandable |= hasGraticules;
		}

		var cleanedId = String(feature.id).replace(/\W/g,'_'); // Id without special characters
		var rowData = {
			feature: feature,
			cellData: [],
			isExpandable: isExpandable ? !parentRowData : false,
			isExpanded: this.model.children[cleanedId] ? true : false,
			hasGraticules: hasGraticules,
			isCheckable: (parentRowData && parentRowData.hasGraticules ? false : true),
			childFc: this.model.children[cleanedId],
			children: [],
			isLoading: false
		};

		var columns = this.columnDefs;
		for (var j = 0; j < columns.length; j++) {
			var d = Configuration.getFromPath(feature, columns[j].mData);
			rowData.cellData.push(d);
			if (d) {
				columns[j].numValidCell++;
			}
		}
		return rowData;
	},

	/**
	 * Add data 
	 */
	addData: function(features, model, parentRowData) {

		if (features.length > 0) {
			
			var hasGraticules = false;
			for (var i = 0; i < features.length; i++) {				
				var feature = features[i];
				var rowData = this.createRowData(feature, parentRowData);
				hasGraticules |= rowData.hasGraticules;

				if ( rowData.childFc ) {
					for ( var j=0; j<rowData.childFc.features.length; j++ ) {
						var childFeature = rowData.childFc.features[j];
						var childRowData = this.createRowData( childFeature, rowData );
						childRowData.parent = rowData;
						rowData.children.push(childRowData);
					}
				}

				if (parentRowData) {
					parentRowData.children.push(rowData);
					rowData.parent = parentRowData;
				} else {
					this.rowsData.push(rowData);
				}
			}

			// Interferometric mode or dataset containins graticules
			if (DataSetSearch.get("mode") != "Simple" || hasGraticules) {
				this.hasExpandableRows = true;
			}

			this.visibleRowsData = this.rowsData.slice(0);

			if ( !parentRowData ) {
				this.buildTable();
				this.buildTableContent();
			} else {
				// Update children only
				var $row = this._getRowFromFeature(parentRowData.feature);
				this.updateChildren(parentRowData, $row);
			}
		} else {
			if ( parentRowData ) {
				var $row = this._getRowFromFeature(parentRowData.feature);
				$('<tr><td></td><td></td><td colspan="' + this.columnDefs.length + '">No data found</td></tr>').insertAfter($row);
			} else if ( this.$table ) {
				this.$table.html('<div class="table-nodata">No data found</div>');
			}
		}
	},

	/**
	 * Remove data from the view
	 */
	removeData: function(features) {

		var rows = this.$table.find("tbody tr");
		for (var i = 0; i < features.length; i++) {

			var $row = this._getRowFromFeature(features[i]);
			if ($row) {
				$row.remove();

				for (var n = 0; n < this.visibleRowsData.length; n++) {
					if (this.visibleRowsData[n].feature == features[i]) {
						this.visibleRowsData.splice(n, 1);
						break;
					}
				}
			}

			for (var n = 0; n < this.rowsData.length; n++) {
				if (this.rowsData[n].feature == features[i]) {
					this.rowsData.splice(n, 1);
					break;
				}
			}

		}
	},

	/**
	 * Filter data
	 */
	filterData: function(val) {

		// Store previously visible rows to compute the newly hidden/shown features
		var previouslyVisibleRows = this.visibleRowsData.splice(0);

		// Reconstruct visible rows data after filtering
		this.visibleRowsData = [];
		for (var i = 0; i < this.rowsData.length; i++) {

			var match = false;
			for (var j = 0; !match && j < this.rowsData[i].cellData.length; j++) {
				match = String(this.rowsData[i].cellData[j]).search(val) >= 0;
			}

			if (match) {
				this.visibleRowsData.push(this.rowsData[i]);
			}
		}

		// Show/Hide filtered features on map
		var rowsToShow = _.difference(this.visibleRowsData, previouslyVisibleRows);
		var rowsToHide = _.difference(previouslyVisibleRows, this.visibleRowsData);
		this.model.showFeatures(_.map(rowsToShow, 'feature'));
		this.model.hideFeatures(_.map(rowsToHide, 'feature'));

		// Finally build the content
		this.buildTableContent();
	},

	/**
	 * Sort data
	 */
	sortData: function(columnIndex, order) {

		if (order == "original") {
			this.visibleRowsData = this.rowsData.slice(0);
		} else {
			this.visibleRowsData.sort(function(row1, row2) {
				if (row1.cellData[columnIndex] == row2.cellData[columnIndex]) {
					return 0;
				} else if (row1.cellData[columnIndex] < row2.cellData[columnIndex]) {
					return (order == "asc") ? -1 : 1;
				} else {
					return (order == "asc") ? 1 : -1;
				}
			});
		}

		this.buildTableContent();
	},

	/**
	 *	Create children feature collection for the given row data
	 */
	createChildrenFeatureCollection: function(rowData) {

		var $el;
		var child = this.model.createChild(rowData.feature.id);

		// Add "loading" label on start
		this.listenTo(child, 'startLoading', function(fc) {
			this.$el.find(".child_of_"+ child.id).remove();
			// Find element after which add 'loading'
			$el = this._getRowFromFeature(rowData.feature);

			var $loading = $('<tr class="loadingChildren">\
				<td></td>\
				<td></td>\
				<td colspan="' + this.columnDefs.length + '"><span class=""><img style="max-width: 20px; margin: 5px 0px;" src="../css/images/ajax-loader.gif"/></span></td>\
			</tr>').insertAfter($el);
			rowData.isLoading = true;
		});

		// Add features to table
		this.listenTo(child, 'add:features', function(features) {
			$el.next('.loadingChildren').remove();
			rowData.isLoading = false;
			if ( !rowData.isExpanded || !features )
				return;

			this.addData(features, this.model, rowData);
		});

		// Add "error message"
		this.listenTo(child, 'error:features', function(url) {
			rowData.isLoading = false;
			if ( !rowData.isExpanded )
				return;
			$el.next('.loadingChildren').remove();
			$('<tr>\
				<td></td>\
				<td></td>\
				<td colspan="' + this.columnDefs.length + '">Error while loading</td>\
			</tr>').insertAfter($el);
		});

		// Reset features
		this.listenTo(child, 'reset:features', function(fc) {
			rowData.children.length = 0;
		});
		var self = this;
		this.listenTo(child, "highlightFeatures", function(features) {
			_allHighlights = _allHighlights.concat(features);
			self.triggerHighlightFeature();
		});
		this.listenTo(child, "selectFeatures", this.updateSelection);
		this.listenTo(child, "unselectFeatures", this.updateSelection);

		// Attach to rowData
		rowData.childFc = child;
	},

	/**
	 *	Upate child (expanded) view
	 */
	updateChildren: function(rowData, $row) {
		$row.siblings('.child_of_'+ rowData.childFc.id).remove();
		$row.siblings('.paging_child_of_'+ rowData.childFc.id).remove();

		if ( rowData.children.length > 0 ) {
			for (var n = 0; n < rowData.children.length; n++) {
				this._createRow(rowData.children[n], $row, {
					className: "child_of_"+ rowData.childFc.id,
					isChild: true
				});
			}

			this._createPagination( rowData, $row );
		} else {
			$('<tr><td></td><td></td><td colspan="' + this.columnDefs.length + '">No data found</td></tr>').insertAfter($row);
		}
	},

	/**
	 *	Update the existing row with the given rowData
	 */
	_updateRow: function(rowData, $row) {

		var content = '';
		// Manage expand
		if (this.hasExpandableRows) {

			if (rowData.isExpandable) {
				if (rowData.isExpanded) {
					content += '<td><span class="table-view-expand ui-icon ui-icon-minus "></span></td>';
				} else {
					content += '<td><span class="table-view-expand ui-icon ui-icon-plus "></span></td>';
				}
			} else {
				content += '<td></td>';
			}
		}

		var checkedClass = 'ui-icon-checkbox-off'; // By default
		// Take into account the previous state of input
		if ($row.find(".table-view-checkbox").length > 0 && $row.find(".table-view-checkbox").hasClass("ui-icon-checkbox-on")) {
			checkedClass = 'ui-icon-checkbox-on';
		}

		// Layer selection checkbox
		var checkboxVisibility = (rowData.isCheckable ? "inline-block" : "none");
		content += '<td><span style="display:'+ checkboxVisibility +'" class="table-view-checkbox ui-icon '+ checkedClass +'"></span></td>';

		// Layer browse visibility checkbox
		/*
		//var browseVisibilityClass = rowData.feature._browseShown ? "ui-icon-checkbox-on" : "ui-icon-checkbox-off";
		var browseVisibilityClass = rowData.feature._featureCollection.isHighlighted(rowData.feature) ? "ui-icon-checkbox-on" : "ui-icon-checkbox-off";
		content += '<td><span class="browse-visibility-checkbox ui-icon '+ browseVisibilityClass + '"></span></td>';
		*/

		for (var j = 0; j < rowData.cellData.length; j++) {

			if (this.columnDefs[j].visible && this.columnDefs[j].numValidCell > 0) {
				// Check if column has some specific classes
				var classes = null;
				if (this.columnDefs[j].getClasses) {
					classes = this.columnDefs[j].getClasses(rowData.feature);
				}

				var cellDataColumn = rowData.cellData[j];
				if (classes && cellDataColumn) {
					if ( classes == "downloadOptions" ) {
						var doIndex = cellDataColumn.indexOf("ngEO_DO");
						if ( doIndex >= 0 )
							cellDataColumn = cellDataColumn.substr( doIndex+8 ).replace(/,(\w)/g,", $1"); // Just add whitespace between properties
						else
							cellDataColumn = "No download options";
					}
					content += '<td title="'+ cellDataColumn +'" class="' + classes + '">' + cellDataColumn + '</td>';
				} else {
					content += '<td title="'+ cellDataColumn +'">' + cellDataColumn + '</td>';
				}
			}
		}
		$row.html(content);

		var browses = Configuration.getMappedProperty(rowData.feature, "browses");
		if ( browses && browses.length > 1 ) {
			$row.find('.browse-visibility-checkbox').after('<span title="Multiple browse management" class="multipleBrowse"></span>');
		}
	},

	/**
	 * Create a row given rowData
	 */
	_createRow: function(rowData, $body, options) {
		// Update from options
		var className = null;
		var isChild = false;
		if ( options ) {
			className = options.className;
			isChild = options.isChild;
		}

		var $row = $('<tr '+ (className ? 'class="'+ className + '"' : "") +'></tr>');
		this._updateRow(rowData, $row);
		if ( isChild ) {
			$row = $row.insertAfter($body);
		} else {
			$row = $row.appendTo($body);
		}
		$row.data('internal', rowData);
		this.feature2row[rowData.feature.id] = $row;
	},

	/**
	 *	Create pagination for children elements
	 */
	_createPagination: function(rowData, $body) {

		var $lastChild = $body.nextAll('.child_of_'+ rowData.childFc.id +':last');
		// Incremental pagination
		// if ( rowData.childFc.currentPage != rowData.childFc.lastPage ) {
		// 	$('<tr class="paging_child_of_'+ rowData.childFc.id +'"><td></td><td></td>\
		// 		<td colspan="' + this.columnDefs.length + '">\
		// 			<div class="paging">\
		// 				<a class="loadMore" data-iconpos="notext" data-icon="plus" data-role="button" data-mini="true" data-inline="true">Load more</a>\
		// 			</div>\
		// 		</td>\
		// 	   </tr>')
		// 		.insertAfter($lastChild)
		// 		.trigger("create")
		// 		.find('.paging')
		// 			.data("internal", rowData);
		// }
		
		// Next/Prev pagination
		if ( rowData.childFc.totalResults > rowData.childFc.countPerPage ) {

			var $pagination = $('<tr class="paging_child_of_'+ rowData.childFc.id +'"><td></td><td></td>\
				<td colspan="' + this.columnDefs.length + '">\
				</td>\
			   </tr>')
				.insertAfter($lastChild);

			var pagination = new Pagination({
				model: rowData.childFc,
				el: $pagination.find("td:last")
			});
			pagination.render();

			$pagination.trigger("create");
		}
	},

	/**
	 * Build table content from data
	 */
	buildTableContent: function() {
		var $body = this.$table.find('tbody');
		$body.empty();

		this.feature2row = {};

		for (var i = 0; i < this.visibleRowsData.length; i++) {

			var rowData = this.visibleRowsData[i];
			this._createRow(rowData, $body);

			if (rowData.isExpanded) {
				var $row = this.feature2row[rowData.feature.id];
				this.updateChildren(rowData, $row);
			}

		}

		this.updateFixedHeader();
		this.updateSelection(this.model.selection);
		// TODO: Make this view dependent on model only ...
		// FIXME: check if hereafter commented line is really needed
		// _allHighlights = _allHighlights.concat(this.model.highlights);
		this.triggerHighlightFeature();
	},

	/**
	 * Update fixed header
	 */
	updateFixedHeader: function() {
		if (this.$table) {
			var $tableHeader = this.$el.find('.table-header');
			// Reinit min width of every "td/th" before computing the real width
			$tableHeader.css('margin-right', 0).end()
				.find('th').css('min-width',"");
			this.$table
				.find('colgroup').remove().end()
				.find('thead').show().end()
				.find('td').css('min-width', "");
			this.$headerTable.find('colgroup').remove();
			
			// Compute actual col-width per th
			var self = this;
			var colWidths = this.$table.find("tr:first").children().map(function(index) {
				var headerWidth = self.$table.find("th:nth-child("+(index+1)+")").outerWidth();
				return $(this).outerWidth() > headerWidth ? $(this).outerWidth : headerWidth;
			});

			// Create COLGROUP
			var $colgroup = $("<colgroup></colgroup>");
			var colSumWidth = _.reduce(colWidths, function(sum, w) { return sum+w;}, 0);
			var hasSlider = colSumWidth > $(window).width() - 1;
			for ( var i=0; i<colWidths.length; i++ ) {
				if ( hasSlider ) {
					// Set min-width since it forces table to be wider than window --> show slider
					$tableHeader.find('th:nth-child('+(i+1)+')')
						.css('min-width', colWidths[i]);
					this.$table.find('td:nth-child('+(i+1)+')')
						.css('min-width', colWidths[i]);
				} else {
					$colgroup.append("<col width=" + colWidths[i] + ">");
				}
			}

			if ( hasSlider ) {
				this.$el.find('.table-view').removeClass("fullscreenWidth");
			} else {
				this.$el.find('.table-view').addClass("fullscreenWidth");
				// Copy table COLGROUP to grid head and grid foot
				$colgroup
					.insertBefore(this.$table.find('thead'))
					.clone()
					.insertBefore(this.$headerTable.find('thead'));
			}

			this.$table.find('thead').hide();
			var diffWidth = this.$headerTable.width() - this.$table.width();
			$tableHeader.css('margin-right', diffWidth);
		}

	},

	/**
	 * Show the table
	 */
	show: function() {
		this.$el.show();
		if (this.rowsData.length > 0) {
			this.updateFixedHeader();
		}
		
		// Scroll to the most recent product if selected
		var selectedRows = this.$el.find('.row_selected');
		if ( selectedRows.length ) {
			var mostRecentRow = _.max(selectedRows, function(row) {
				var feature = $(row).data('internal').feature;
				return new Date(Configuration.getMappedProperty(feature, "stop"));
			});
			this._scrollTo($(mostRecentRow));
		}

		this.visible = true;
	},

	/**
	 * Hide the table
	 */
	hide: function() {
		this.$el.hide();
		this.visible = false;
	},

	/**
	 * Build the main table element
	 */
	buildTable: function() {

		this.$el.find('.inner-container').remove();
		this.$el.find('.table-nodata').remove();

		if (this.rowsData.length == 0) {
			this.$el.prepend('<div class="table-nodata">No data to display</div>');
			return;
		}


		// Build the table
		var $table = $('<table cellpadding="0" cellspacing="0" border="0" class="table-view"><thead></thead><tbody></tbody></table>');
		var $thead = $table.find('thead');
		var $row = $('<tr></tr>').appendTo($thead);
		var columns = this.columnDefs;
		if (this.hasExpandableRows) {
			$row.append('<th></th>');
		}
		$row.append('<th><span class="table-view-checkbox ui-icon ui-icon-checkbox-off "></th>');
		//$row.append('<th class="browseVisibility"></th>');

		for (var j = 0; j < columns.length; j++) {
			if (columns[j].visible && columns[j].numValidCell > 0) {
				$row.append('<th>' + columns[j].sTitle + '</th>');
			}
		}

		var $container = $('<div class="inner-container"></div>').prependTo(this.$el);
		// Override the tine rectangle on scrollbar crossing bars
		$('<div style="position: absolute;background: #292929;bottom: 0px;right: 0px;width: 15px; height: 16px;z-index: 1;"></div>').appendTo($container);

		this.$table = $table.prependTo($container);

		// Build the fixed header table
		this.$table.wrap('<div class="table-content"></div>');
		this.$headerTable = this.$table.clone().prependTo($container).wrap('<div class="table-header"></div>');
		this.$table.find('thead').hide();


		// Update header as well
		this.$el.find(".table-content").scroll(function () {
			$(".table-header").offset({ left: -1*this.scrollLeft });
		});
	},

	/**
	 * Render the table
	 */
	render: function() {

		// Update column definition  with the visible flag and a counter to know the number of non-empty cell
		for (var i = 0; i < this.columnDefs.length; i++) {
			this.columnDefs[i].visible = i < this.maxVisibleColumns;
			this.columnDefs[i].numValidCell = 0;
		}

		this.visible = false;
		this.featuresToAdd = [];
		$(window).resize($.proxy(this.updateFixedHeader, this));

		this.buildTable();

		this.renderFooter();

		this.$el.trigger('create');
	},

	/**
	 * Render footer
	 */
	renderFooter: function() {
		var footer = $('<div id="tableFooter" class="ui-grid-a"></div>')
			.append('<div class="table-filter ui-block-a">\
						<div data-role="fieldcontain" style="width: 300px; display: inline-block; top: 5px; vertical-align: super;" >\
							<label for="filterTableInput">Filter table:</label>\
							<input id="filterTableInput" data-inline="true" data-mini="true" type="text"/>\
						</div>\
						<button data-mini="true" data-inline="true" id="table-columns-button">Columns</button>\
					</div>\
					<div class="ui-block-b table-rightButtons"><div data-role="fieldcontain"></div></div>');
		var $buttonContainer = $(footer).find(".table-rightButtons [data-role='fieldcontain']");

		if (this.renderButtons)
			this.renderButtons($buttonContainer);

		this.$el.append(footer).trigger("create");
		// HACK jQm Firefox: Display text-input on the same level as label & button
		this.$el.find('.table-filter .ui-input-text').css("vertical-align","middle");
	},

	/**
	 *	Refresh method
	 */
	refresh: function() {
		this.updateFixedHeader();
	}
});

module.exports = TableView;
});

require.register("ui/tabs", function(exports, require, module) {
var Configuration = require('configuration');

/**
 * Tabs module
 */
$.widget("ngeo.tabs", {

	// default options
	options: {

		// A theme to be applied, added as a class on the whole tab
		theme: "a",

		// callbacks
		activate: null
	},

	// the constructor
	_create: function() {
		this.element.find('ul').addClass('ui-tabs').addClass('ui-tabs-' + this.options.theme);
		var self = this;

		// Style the link and div content
		// Also store the active link and div
		this.element.find('a')
			.each(function(index) {
				var $div = self.element.find($(this).attr('href'));
				$div.addClass('ui-body-'+Configuration.localConfig.theme+' ui-tabs-content');

				if (index == 0) {
					self.activeLink = $(this);
					self.activeLink.parent().addClass('ui-tabs-active');
					self.activeDiv = $div.show();
				} else {
					$div.hide();
				}
			});

		// Show/hide when a tab is clicked
		this.element.find('a').click(function(event) {

			var href = $(this).attr('href');
			self.activeLink.parent().removeClass('ui-tabs-active');
			self.activeDiv.hide();
			$(this).parent().addClass('ui-tabs-active');
			$(href).show();

			self.activeDiv = $(href);
			self.activeLink = $(this);

			if (self.options.activate) {
				self.options.activate(self.activeLink, self.activeDiv);
			}

			event.preventDefault();
		});

	},


	// events bound via _bind are removed automatically
	// revert other modifications here
	_destroy: function() {
		// TODO 
	},

	// _setOptions is called with a hash of all options that are changing
	// always refresh when changing options
	_setOptions: function() {
		// in 1.9 would use _superApply
		$.Widget.prototype._setOptions.apply(this, arguments);
		// TODO : refresh?
	},

	// _setOption is called for each individual option that is changing
	_setOption: function(key, value) {
		// TODO : manage options?
		// in 1.9 would use _super
		$.Widget.prototype._setOption.call(this, key, value);
	}
});
});

require.register("ui/toolbar", function(exports, require, module) {
/**
 * Toolbar module
 */

require('ui/widget');

// The function to define the Widget module
$.widget("ngeo.toolbar", {
	// default options
	options: {
		onlyIcon: false,
		withNumber: false,
		large: false	// Large button option (actually used for bottom panel)
	},

	// the constructor
	_create: function() {

		this._build(this.element.find('command'));

		if (this.options.onlyIcon) {
			this.element.find('.tb-separator').css({
				height: '24px'
			});
		}

	},

	// build some elements
	_build: function(elements) {

		if ( this.options.large ) {

			// Large buttons in bottom panel
			// TODO: create dedicated module
			elements.addClass('tb-elt');

			if ( $(this).data('notext') ) {

			} else {
				$('<div>\
				   </div>').appendTo(elements);
				
			}

			elements.each(function() {
				if ( $(this).data('notext') ) {
					$(this).append('<div class="tb-button"><div class="tb-icon"></div></div>');
					$(this).attr('title', $(this).attr('label'));
				} else {
					$(this).append('<div class="tb-large-button">\
							   			<div class="btnHeader"><span class="datasetName">'+$(this).attr('label')+'</span></div>\
					   					<div class="btnFooter"><span class="layerVisibility ui-icon ui-icon-checkbox-on"></span><span class="nbFeatures">No search done</span></div>\
				   					</div>');
					if ( $(this).data('icon') ) {
						$(this).find('.btnHeader').prepend('<img class="datasetTypeIcon" src="../images/'+$(this).data('icon')+'.png" />');
					}
				}
			});

		} else {
			// Wrap the image with a div to display both image and text below, and then add class for button styling
			elements
				.addClass('tb-elt');

			// Add text for each element
			var $tbButton = $('<div class="tb-button"><div class="tb-icon"></div></div>').appendTo(elements);

			if ( this.options.withNumber ) {
				$tbButton.find('.tb-icon').append('<span class="nbFeatures"></span>');
			}

			// Take care to set the data-help on the tb-icon (now the element to receive click)
			elements.each(function() {
				var $this = $(this);
				var contextHelp = $this.data('help');
				if (contextHelp) {
					// Add it the current element
					$this.attr('data-help', contextHelp);

					// OLD code to store data-help on tb-icon, discarded by NGEO-2003
					// Add it to the lowest element
					// $this.find('.tb-icon').attr('data-help', contextHelp);
					// Remove it from the container, not needed anymore
					// $this.removeAttr('data-help');
				}
			});

			if (this.options.onlyIcon) {
				elements.attr('title', function() {
					return $(this).attr('label');
				});
			} else {
				var self = this;
				elements.append(function() {
					var $elt;
					// Even if globally toolbar have labels, some elements still could be without label
					// Ex: "Table" .. check if data-notext exist and add title only
					if ( $(this).data('notext') ) {
						$(this).attr('title', $(this).attr('label'));
					} else {
						$elt = $('<div class="tb-text"> ' + $(this).attr('label') + '</div>');
					}
					return $elt;
				});
			}
		}

	},

	// refresh the toolbar
	refresh: function() {

		this._build(this.element.find('command:not(.tb-elt)'));

	},

	// events bound via _bind are removed automatically
	// revert other modifications here
	_destroy: function() {
		// TODO
	},

	// _setOptions is called with a hash of all options that are changing
	// always refresh when changing options
	_setOptions: function() {
		// in 1.9 would use _superApply
		$.Widget.prototype._setOptions.apply(this, arguments);
		// TODO : refresh?
	},

	// _setOption is called for each individual option that is changing
	_setOption: function(key, value) {
		// TODO : manage options?
		// in 1.9 would use _super
		$.Widget.prototype._setOption.call(this, key, value);
	}
});
});

require.register("ui/widget", function(exports, require, module) {
var Configuration = require('configuration');

var modalScreen = $('<div class="ui-popup-screen ui-overlay-a ui-screen-hidden"></div>').appendTo('.ui-page-active');
$._ngeoOpenedWidgets = [];

/**
 * An element to block user interactions when opening a modal pop-up
 */
$.widget("ngeo.ngeowidget", {

	// default options
	options: {
		title: "",
		activator: null,
		effectDuration: 1000,
		modal: true,
		closable: true,

		// callbacks
		show: null,
		hide: null
	},

	// the constructor
	_create: function() {

		var self = this;

		// Style the container
		this.element.addClass("widget-content");
		// Use jQM to style the content
		this.element.addClass("ui-body-"+Configuration.localConfig.theme);

		// Wrap with the parent div for widget
		this.element.wrap("<div class='widget'/>");
		this.parentElement = this.element.parent();

		if (this.options.title) {
			this.parentElement.prepend('<h2>' + this.options.title + '</h2>');
		}

		// Activator
		if (this.options.activator) {
			this.activator = $(this.options.activator);
			this.activator.click(function() {
				if (self.activator.hasClass('toggle')) {
					self.hide();
				} else {
					self.show();
				}
			});
		} else if (this.options.closable) {
			$('<a class="ui-btn-right" data-iconpos="notext" data-icon="delete" data-theme="a"\
				data-role="button" data-corners="true" data-shadow="true"\
				data-iconshadow="true" data-wrapperels="span" title="Close">')
				.prependTo(this.parentElement)
				.click($.proxy(this.hide, this));
		}

		this.parentElement
			.trigger("create")
			.hide();

		if (this.activator) {
			// Add Arrow
			this.arrow = $("<div class='widget-arrow-up' />")
				.insertBefore(this.parentElement);
			this.arrow.hide();
		}
		$._ngeoOpenedWidgets.push(this);
	},

	update: function() {
		var $tb = $('#mapToolbar');
		var toolbarBottom = $tb.position().top + $tb.outerHeight();
		if (this.activator) {
			// Recompute position for widget
			var posActivator = this.activator.offset();
			var widgetLeft = Math.max(10, posActivator.left - (this.parentElement.outerWidth() / 2) + (this.activator.outerWidth() / 2));
			this.parentElement
				.css('left', widgetLeft);
			this.arrow
				.css('left', posActivator.left);

			// Set top position for both arrow and widget content
			// Top position never changed because toolbar and activator are fixed... even with a window resize!
			this.parentElement
				.css('top', toolbarBottom + this.arrow.outerHeight());
			this.arrow
				.css('top', toolbarBottom);
		} else {
			var widgetLeft = this.options.left || ($(window).width() / 2 - (this.parentElement.outerWidth() / 2));
			var widgetTop = this.options.top || (($(window).height() - toolbarBottom) / 2 - (this.parentElement.outerHeight() / 2));
			this.parentElement.css({
				top: widgetTop,
				left: widgetLeft
			});
		}
	},

	show: function() {
		// Automatically hide other popup
		for (var i = 0; i < $._ngeoOpenedWidgets.length; i++) {
			if ($._ngeoOpenedWidgets[i] != this) {
				$._ngeoOpenedWidgets[i].hide();
			}
		}

		this.update();
		this.parentElement.fadeIn(this.options.durationEffect);
		if (this.arrow) this.arrow.fadeIn(this.options.durationEffect);

		if (this.activator) {
			this.activator.addClass('toggle');
		} else if (this.options.modal) {
			modalScreen.removeClass('ui-screen-hidden');
			modalScreen.addClass('in');
		}

		if (this.options.show) {
			this.options.show();
		}
	},

	hide: function() {
		this.parentElement.fadeOut(this.options.durationEffect, this.options.hide);
		if (this.arrow) this.arrow.fadeOut(this.options.durationEffect);
		if (this.activator) {
			this.activator.removeClass('toggle');
		} else if (this.options.modal) {
			modalScreen.addClass('ui-screen-hidden');
			modalScreen.removeClass('in');
		}
	},

	// events bound via _bind are removed automatically
	// revert other modifications here
	_destroy: function() {
		// Remove from widgets array
		var index = $._ngeoOpenedWidgets.indexOf(this);
		if (index >= 0) {
			$._ngeoOpenedWidgets.splice($._ngeoOpenedWidgets.indexOf(this), 1);
		}
		// Cleanup parent element
		this.parentElement.children().not(this.element).remove();
		// Remove parent element
		this.element.unwrap();
		//Remove arrow
		if (this.arrow) this.arrow.remove();
	},

	// _setOptions is called with a hash of all options that are changing
	// always refresh when changing options
	_setOptions: function() {
		// in 1.9 would use _superApply
		$.Widget.prototype._setOptions.apply(this, arguments);
		// TODO : refresh?
	},

	// _setOption is called for each individual option that is changing
	_setOption: function(key, value) {
		// TODO : manage options?
		// in 1.9 would use _super
		$.Widget.prototype._setOption.call(this, key, value);
	}
});
});

require.register("userPrefs", function(exports, require, module) {
var Logger = require('logger');
var Configuration = require('configuration');

/**
 * Singleton Model for storing and retrieving user preferences
 *
 * Each plain object that will be stored in the local storage 
 * by the current user, will have its key prefixxed by the user id
 * In order to allow many users save their prefs in the same "machine/browser"
 */
var UserPrefs = {
    //count for the same added object
    //count : 0, 

    /** user id to be retrieved...TODO be compliant with UM-SSO credentials*/
    //userId : "userId",

    //to avoid overwriting items in the local storage and conflicts with other applications*/
    preffix: 'ngeo_',

    //get the keys, use to display the stored preferences in the view
    keys: Configuration.localConfig.userPrefs.keys,

    /** get the string related to the given key */
    get: function(key) {

        if (localStorage) {
            return localStorage.getItem(this.preffix + key);
        } else {
            //notify the user if the browser does not support local storage
            Logger.warning('Your browser does not support HTML5 local storage.The preferences cannot be stored.');
        }
    },

    /**
     * Save the preferences key, value passed to the local storage
     */
    save: function(key, value) {

        if (localStorage && (_.isString(value) || _.isBoolean(value)) && !_.isArray(value) && !_.isFunction(value)) {

            var oldValue = localStorage.setItem(this.preffix + key, value);
            localStorage.setItem(this.preffix + key, value);

            if (this.keys.indexOf(key) == -1) {
                this.keys.push(key);
                this.trigger('addedPreference');
            }

            if (oldValue != value) {
                this.trigger('addedPreference');
            }
        } else {
            this.trigger("UnAllowedStorageException", key);
        }
    },

    /**
     * Save the preferences object passed to the local storage
     */
    saveObject: function(key, object) {

        if (_.isObject(localStorage) && _.isObject(object) && !_.isArray(object) && !_.isFunction(object)) {

            var oldValue = localStorage.setItem(this.preffix + key);
            localStorage.setItem(this.preffix + key, JSON.stringify(object));

            if (this.keys.indexOf(key) == -1) {
                this.keys.push(key);
                this.trigger('addedPreference');
            }

            if (oldValue != JSON.stringify(object)) {
                this.trigger('addedPreference');
            }

        } else {
            this.trigger("UnAllowedStorageException", object);
        }
    },

    /**
     * Remove all stored keys
     */
    reset: function() {
        var self = this;
        //remove stored keys
        _.each(this.keys, function(key) {
            var itemName = self.preffix + key;
            localStorage.removeItem(itemName);
            self.trigger('removedPreference', key);
        });

        this.keys = Configuration.localConfig.userPrefs.keys;

        //this.trigger('resetPreferences');
    }
};

// Add events method to object
_.extend(UserPrefs, Backbone.Events);

module.exports = UserPrefs;
});


//# sourceMappingURL=main-ngeo.js.map