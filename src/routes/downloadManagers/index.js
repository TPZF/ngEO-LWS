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
let DOWNLOADMANAGERNAME = 'DownloadManager';

/**
 * check request inputs (method, params, values, ...)
 * @function _checkRequest
 * @param request
 * @return boolean
 * @private
 */
function _checkRequest(request) {
	if (request.method === 'POST') {
		if (!request.body.downloadmanager) {
			Logger.debug('no downloadmanager item');
			return false;
		}
		if (!request.body.downloadmanager.downloadManagerFriendlyName) {
			Logger.debug('no name for downloadmanager');
			return false;
		}
		if (request.body.downloadmanager.downloadManagerFriendlyName.trim()==='') {
			Logger.debug('name for downloadmanager is empty');
			return false;
		}
		if (!request.body.downloadmanager.userId) {
			Logger.debug('no userId for downloadmanager');
			return false;
		}
	}
	if (request.method === 'DELETE') {
		if (!DatabaseService.checkParamId(request.params.downloadmanager_id)) {
			Logger.debug(request.params.downloadmanager_id);
			Logger.debug('no valid downloadmanager_id');
			return false;
		}
	}
	return true;
}

// ROUTER
let router = express.Router({
	mergeParams: true
});
router.use(function timeLog(req, res, next) {
	AuthenticationService.isAuthenticated(req, res);
	next();
});

/**
 * List downloadManagers
 *
 * @function router.get
 * @param url - /ngeo/downloadManagers/
 * @param req - empty
 * @param res - response
 */
router.get('/', (req, res) => {

	Logger.debug('GET /ngeo/downloadManagers');

	// define call back function after listing downloadmanagers
	// send response
	let cbAfterSearch = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			_.map(response.datas, function(item) {
				item.downloadManagerId = item.id;
				delete item._id;
				delete item.id;
			})
			res.json({"downloadmanagers" : response.datas});
		}
	}

	// 
	let jsonQueryForfilterOnUserId = {
		userId: AuthenticationService.getUserId(req)
	};

	// call list service
	DatabaseService.list(DOWNLOADMANAGERNAME, jsonQueryForfilterOnUserId, cbAfterSearch);

});

/**
 * About : description of requests for downloadManagers
 * 
 * @function router.get
 * @param {String} url - /ngeo/downloadManagers/about
 * @param {object} req - empty
 * @param {object} res - response
 */
router.get('/about', (req, res) => {
	Logger.debug('GET /ngeo/downloadManagers/about');
	res.status(200).send("Description of downloadManagers requests");
});

/**
 * Get one downloadManager
 *
 * @function router.get
 * @param url - /ngeo/downloadManagers/:downloadManagerid
 * @param req - request
 * @param res - response
 */
router.get('/:downloadManagerid', (req, res) => {

	Logger.debug('GET /ngeo/downloadManagers/:downloadManagerid');

	if (!req.params['downloadManagerid']) {
		res.status(400).json("Request is not valid");
		return;
	}
	if (!DatabaseService.checkParamId(req.params.downloadManagerid)) {
		res.status(400).json("Request is not valid");
		return;
	}
	let idToGet = req.params['downloadManagerid'];

	// define callback function after updating
	let cbAfterUpdate = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			response.datas.downloadManagerId = response.datas.id;
			delete response.datas._id;
			delete response.datas.id;
			res.status(200).json({"downloadmanager": response.datas });
		}
	};

	// define call back function after get downloadmanager
	// send response
	let cbAfterList = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
			return;
		}
		if (response.datas.length !== 1) {
			res.status(400).json('Bad request !');
			return;
		}
		let downloadManager = response.datas[0];

		// define query if item already exists
		let myQueryItemAlreadyExists = {
			_id: {
				$ne: ObjectId(downloadManager._id)
			},
			downloadManagerFriendlyName: downloadManager.downloadManagerFriendlyName,
			userId: downloadManager.userId
		};

		let myQueryUpdate = {
			$set: {
				"lastAccessDate": new Date().toISOString()
			}
		};
		DatabaseService.update(DOWNLOADMANAGERNAME, downloadManager, myQueryItemAlreadyExists, myQueryUpdate, cbAfterUpdate);
	}

	// 
	let jsonQueryForfilter = {
		_id: ObjectId(idToGet),
		userId: AuthenticationService.getUserId(req)
	};

	// call list service
	DatabaseService.list(DOWNLOADMANAGERNAME, jsonQueryForfilter, cbAfterList);

});
/**
 * Create a DownloadManager
 *
 * @function router.post
 * @param url - /ngeo/downloadManagers/
 * @param req - request {downloadmanager:{name,userId}}
 * @param res - response
 */
router.post('/', (req,res) => {

	Logger.debug('POST /ngeo/downloadManagers');

	// check if request is valid
	if (!_checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	// define call back function after adding DownloadManager
	// send response
	let cbAddDownloadManager = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			response.datas.downloadManagerId = response.datas.id;
			delete response.datas.id;
			delete response.datas._id;
			res.setHeader('Location', '/ngeo/downloadManagers/' + response.datas.downloadManagerId)
			res.status(201).json({"downloadmanager": response.datas });
		}
	};

	// define insertedItem
	let myInsertItem = req.body.downloadmanager;

	if (!myInsertItem.userId) {
		myInsertItem.userId = AuthenticationService.getUserId(req);
	}
	if (myInsertItem.userId !== AuthenticationService.getUserId(req)) {
		res.status(401).json('Unauthorized');
		return;
	}

	// define query to find if item is already in database
	let myQueryItemAlreadyExists = {
		downloadManagerFriendlyName: myInsertItem.downloadManagerFriendlyName,
		userId: myInsertItem.userId
	};

	// call create service for database
	DatabaseService.create(DOWNLOADMANAGERNAME, myInsertItem, myQueryItemAlreadyExists, cbAddDownloadManager);
	
});

/**
 * Delete a downloadmanager
 */
router.delete('/:downloadmanager_id', (req,res) => {

	Logger.debug('DELETE /ngeo/downloadManagers/:id');

	// check if request is valid
	if (!_checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	let idToDelete = req.params.downloadmanager_id;

	// define callback function after deleting all DARs for a downloadmanager
	let cbDeleteAllDARsInShopCart = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			res.status(204).send();
		}
	};

	// define callback function after deleting DownloadManager
	let cbDeleteDownloadManager = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			// delete cascade DARs link to this DownloadManager
			let myQueryDelete = {
				"dlManagerId": idToDelete
			};
			DatabaseService.deleteCascade('DataAccessRequest', myQueryDelete, cbDeleteAllDARsInShopCart);
		}
	};
					
	let cbAfterCheckAuthorization = function() {
		DatabaseService.delete(DOWNLOADMANAGERNAME, idToDelete, cbDeleteDownloadManager);
	}

	AuthorizationService.isAuthorized(
		res, 
		DatabaseService, 
		DOWNLOADMANAGERNAME, 
		ObjectId(idToDelete), 
		AuthenticationService.getUserId(req), 
		cbAfterCheckAuthorization
	);


});

module.exports = router;