// CORE
let express = require('express');
let _ = require('lodash');

// UTILS
let Logger = require('utils/logger');

// SERVICES
let AuthenticationService = require('services/authenticationService');
let AuthorizationService = require('services/authorizationService');
let DatabaseService = require('services/databaseService');

// CONST
let DATA_ACCESS_REQUEST_STATUS_NAME = 'DataAccessRequestStatus';
let DOWNLOAD_MANAGER_NAME = 'DownloadManager';

// ROUTER
let router = express.Router({
	mergeParams: true
});
router.use(function timeLog(req, res, next) {
	next();
});

/**
 * List DataAccessRequestStatus
 *
 * @function router.get
 * @param url - /ngeo/dataAccessRequestStatuses/
 */
router.get('/', (req, res) => {

	Logger.debug('GET /ngeo/dataAccessRequestStatuses/');

	// define call back function after listing downloadmnagers
	// send response
	let cbAfterSearchDM = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			_.map(response.datas, function(item) {
				item.downloadManagerId = item.id;
				delete item._id;
				delete item.id;
			});
			// filter DAR with dlManagerId in downloadmanagers array for current user
			let downloadmanagerIds = [];
			response.datas.forEach((item,index) => {
				// hack - force type as string - else request doesn't filter as expected
				downloadmanagerIds.push(''+item.downloadManagerId);
			});
			let jsonQueryFilterOnDMIds = {
				dlManagerId: { $in: downloadmanagerIds }
			};
			DatabaseService.list(DATA_ACCESS_REQUEST_STATUS_NAME, jsonQueryFilterOnDMIds, cbAfterSearchDAR);
		}
	};

	// define call back function after listing items
	// send response
	let cbAfterSearchDAR = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			_.map(response.datas, function(item) {
				item.ID = item.id;
				delete item._id;
				delete item.id;
			})
			res.json({"dataAccessRequestStatuses" : response.datas});
		}
	};

	// 
	let jsonQueryForfilterOnUserId = {
		userId: AuthenticationService.getUserId(req)
	};

	// call list downloadmanagers for current user
	DatabaseService.list(DOWNLOAD_MANAGER_NAME, jsonQueryForfilterOnUserId, cbAfterSearchDM);

});


/**
 * About : description of requests for dataAccessRequestStatuses
 * @function router.get
 * @param {String} url - /ngeo/dataAccessRequestStatuses/about
 */
router.get('/about', (req, res) => {

	Logger.debug('GET /ngeo/dataAccessRequestStatuses/about');

	res.status(200).send('Description of dataAccessRequestStatuses requests');
	
});

module.exports = router;