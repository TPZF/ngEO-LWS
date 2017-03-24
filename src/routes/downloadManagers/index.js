// CORE
let express = require('express');
let MongoClient = require('mongodb').MongoClient;
let ObjectId = require('mongodb').ObjectID;
let _ = require('lodash');

// UTILS
let Logger = require('utils/logger');

// SERVICES
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

let router = express.Router({
	mergeParams: true
});

// make sure we go to the next routes and don't stop here
router.use(function timeLog(req, res, next) {
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

	Logger.debug('DownloadManagers list is calling');

	// define call back function after listing downloadmanagers
	// send response
	let cbGetList = function(response) {
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

	// call list service
	DatabaseService.list(DOWNLOADMANAGERNAME, cbGetList);

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

	Logger.debug('DownloadManager add is calling');

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

	// define query to find if item is already in database
	let myQueryItemAlreadyExists = {
		downloadManagerFriendlyName: {
			$eq: myInsertItem.downloadManagerFriendlyName
		},
		userId: {
			$eq : myInsertItem.userId
		}
	};

	// call create service for database
	DatabaseService.create(DOWNLOADMANAGERNAME, myInsertItem, myQueryItemAlreadyExists, cbAddDownloadManager);
	
});

/**
 * Delete a downloadmanager
 */
router.delete('/:downloadmanager_id', (req,res) => {

	Logger.debug('downloadmanager delete is calling');

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
					
	// call delete service
	DatabaseService.delete(DOWNLOADMANAGERNAME, idToDelete, cbDeleteDownloadManager);

});

/**
 * About : description of requests for downloadManagers
 * @function router.get
 * @param {String} url - /ngeo/downloadManagers/about
 * @param {object} req - empty
 * @param {object} res - response
 */
router.get('/about', (req, res) => {

	Logger.debug('About downloadManagers requests is calling');

	res.status(200).send("Description of downloadManagers requests");
});

module.exports = router;