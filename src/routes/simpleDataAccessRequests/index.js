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
const DATA_ACCESS_REQUEST_STATUS_NAME = 'DataAccessRequestStatus';
const DOWNLOAD_MANAGER_NAME = 'DownloadManager';

/**
 * check request inputs (method, params, values, ...)
 * @function _checkRequest
 * @param request
 * @return boolean
 * @private
 */
function _checkRequest(request) {
	if (request.method === 'PUT') {
		if (!request.body.simpledataaccessrequest) {
			Logger.debug('no simpledataaccessrequest item');
			return false;
		}
		if (!request.body.simpledataaccessrequest.name) {
			Logger.debug('no name for simpledataaccessrequest');
			return false;
		}
		if (request.body.simpledataaccessrequest.name.trim() === '') {
			Logger.debug('name for simpledataaccessrequest is empty');
			return false;
		}
		if (!request.body.simpledataaccessrequest.requestStage) {
			Logger.debug('no requestStage for simpledataaccessrequest');
			return false;
		}
		if (!request.body.simpledataaccessrequest.downloadLocation) {
			Logger.debug('no downloadLocation for simpledataaccessrequest');
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
	// for all simple data access request, authentication is required
	AuthenticationService.isAuthenticated(req, res, next);
});

/**
 * Create a simpleDataAccessRequest
 *
 * @function router.post
 * @param url - /ngeo/simpleDataAccessRequests/
 */
router.put('/', (req, res) => {

	Logger.debug('simpleDataAccessRequests create is calling');

	// check if request is valid
	if (!_checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	// check if download manager id exists
	let downloadManagerId = req.body.simpledataaccessrequest.downloadLocation.DownloadManagerId;
	if (typeof downloadManagerId === 'undefined') {
		Logger.debug('no DownloadManagerId in downloadLocation attribute for this simple DAR');
		res.status(400).json("Request is not valid");
		return;
	}

	let cbAfterCheckAuthorization = function () {
		let response = {
			dataAccessRequestStatus: {
				ID: "NO_ID-validation_stage",
				type: "Simple Data Access Request",
				status: 4,
				message: "Data Access Request validated",
				dlManagerId: downloadManagerId,
				downloadDirectory: req.body.simpledataaccessrequest.downloadLocation.DownloadDirectory,
				productStatuses: []
			}
		};
		_.each(req.body.simpledataaccessrequest.productURLs, function (product) {
			product.productStatus = 'NOT_STARTED';
			product.percentageCompleted = '0';
			response.dataAccessRequestStatus.productStatuses.push(product);
		});

		// validation
		if (req.body.simpledataaccessrequest.requestStage === 'validation') {
			response.dataAccessRequestStatus.status = 4;
			res.status(200).json(response);
			return;
		}

		// confirmation
		if (req.body.simpledataaccessrequest.requestStage === 'confirmation') {
			response.dataAccessRequestStatus.name = req.body.simpledataaccessrequest.name;
			response.dataAccessRequestStatus.status = 0;
			// define call back function after creating
			// send response
			let cbAfterCreate = function (response) {
				if (response.code !== 0) {
					res.status(response.code).json(response.datas);
				} else {
					response.datas.ID = response.datas.id;
					delete response.datas._id;
					delete response.datas.id;
					res.setHeader('Location', '/ngeo/dataAccessRequestStatuses/' + response.datas.ID)
					res.status(201).json({ "dataAccessRequestStatus": response.datas });
				}
			};

			// define insertedItem
			let myInsertItem = response.dataAccessRequestStatus;

			// define query to find if item is already in database
			let myQueryItemAlreadyExists = {
				exist: false // Not already exists in all cases
			};

			// call create service for database
			DatabaseService.create(DATA_ACCESS_REQUEST_STATUS_NAME, myInsertItem, myQueryItemAlreadyExists, cbAfterCreate);
		}
	}

	// check authorization with user id
	AuthorizationService.isAuthorized(
		res,
		DatabaseService,
		DOWNLOAD_MANAGER_NAME,
		ObjectId(downloadManagerId),
		AuthenticationService.getUserId(req),
		cbAfterCheckAuthorization
	);

});

/**
 * About : description of requests for simpleDataAccessRequests
 * @function router.get
 * @param {String} url - /ngeo/simpletDataAccessRequests/about
 */
router.get('/about', (req, res) => {
	Logger.debug('GET /ngeo/simpletDataAccessRequests/about');
	res.status(200).send('<h1>Description of simpleDataAccessRequests requests</h1>');
});

module.exports = router;