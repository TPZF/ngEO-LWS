// CORE
let express = require('express');
let ObjectId = require('mongodb').ObjectID;
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

/**
 * check request inputs (method, params, values, ...)
 * @function _checkRequest
 * @param request
 * @return boolean
 * @private
 */
function _checkRequest(request) {
	if (request.method === 'DELETE') {
		if (!DatabaseService.checkParamId(request.params.dar_id)) {
			Logger.debug(request.params.dar_id);
			Logger.debug('no valid dar_id');
			return false;
		}
	}
	return true;
}

// ROUTER
let router = express.Router({
	mergeParams: true
});
router.use(function authenticate(req, res, next) {
	// for all dar request, authentication is required
	AuthenticationService.isAuthenticated(req, res, next);
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
	let cbAfterSearchDM = function (response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			_.map(response.datas, function (item) {
				item.downloadManagerId = item.id;
				delete item._id;
				delete item.id;
			});
			// filter DAR with dlManagerId in downloadmanagers array for current user
			let downloadmanagerIds = [];
			response.datas.forEach((item, index) => {
				// hack - force type as string - else request doesn't filter as expected
				downloadmanagerIds.push('' + item.downloadManagerId);
			});
			let jsonQueryFilterOnDMIds = {
				dlManagerId: { $in: downloadmanagerIds }
			};
			DatabaseService.list(DATA_ACCESS_REQUEST_STATUS_NAME, jsonQueryFilterOnDMIds, cbAfterSearchDAR);
		}
	};

	// define call back function after listing items
	// send response
	let cbAfterSearchDAR = function (response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			_.map(response.datas, function (item) {
				item.ID = item.id;
				delete item._id;
				delete item.id;
			})
			res.json({ "dataAccessRequestStatuses": response.datas });
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

/**
 * Delete a dataAccessRequestStatus
 */
router.delete('/:dar_id', (req, res) => {

	Logger.debug('DELETE /ngeo/dataAccessRequestStatuses/:dar_id');

	// check if request is valid
	if (!_checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	let idToDelete = req.params.dar_id;

	// define callback function after deleting DownloadManager
	let cbDeleteDar = function (response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			res.status(204).send();
		}
	};

	// callback after getting DM for current DAR
	let cbAfterListDM = function (response) {
		// catch error
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
			return;
		}
		// catch length != 1
		if (response.datas.length !== 1) {
			res.status(400).json('Bad request !');
			return;
		}
		// call delete
		DatabaseService.delete(DATA_ACCESS_REQUEST_STATUS_NAME, idToDelete, cbDeleteDar);
	}

	// callback after getting DAR
	let cbAfterListDAR = function (response) {
		// catch error
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
			return;
		}
		// catch length != 1
		if (response.datas.length !== 1) {
			res.status(400).json('Bad request !');
			return;
		}
		let dar = response.datas[0];
		// define query to find DM with :
		// - DM id from current DAR
		// - current user id from authentification
		let myQueryFilter = {
			_id: ObjectId(dar.dlManagerId),
			userId: AuthenticationService.getUserId(req)
		};
		DatabaseService.list(DOWNLOAD_MANAGER_NAME, myQueryFilter, cbAfterListDM);
	}

	// 
	let jsonQueryForfilter = {
		_id: ObjectId(idToDelete)
	};
	// call list service
	DatabaseService.list(DATA_ACCESS_REQUEST_STATUS_NAME, jsonQueryForfilter, cbAfterListDAR);

});

module.exports = router;