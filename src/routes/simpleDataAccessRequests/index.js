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
let DATA_ACCESS_REQUEST_STATUS_NAME = 'DataAccessRequestStatus';

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
		if (request.body.simpledataaccessrequest.name.trim()==='') {
			Logger.debug('name for simpledataaccessrequest is empty');
			return false;
		}
		if (!request.body.simpledataaccessrequest.requestStage) {
			Logger.debug('no requestStage for simpledataaccessrequest');
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
 * Create a simpleDataAccessRequest
 *
 * @function router.post
 * @param url - /ngeo/simpleDataAccessRequests/
 * @param req - request {simpledataaccessrequest:{requestStage,downlaodLocation,productURLs,name}}
 * @param res - response
 */
router.put('/', (req,res) => {

	Logger.debug('simpleDataAccessRequests create is calling');

	// check if request is valid
	if (!_checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	let response = {
		dataAccessRequestStatus: {
	        "ID": "NO_ID-validation_stage",
	        "type": "Simple Data Access Request",
	        "status": 4,
	        "message": "Data Access Request validated",
	        "dlManagerId": req.body.simpledataaccessrequest.downloadLocation.DownloadManagerId,
	        "productStatuses": []
	    }
	};

	_.each(req.body.simpledataaccessrequest.productURLs, function(product) {
		product.productStatus = 'NOT_STARTED';
		product.percentageCompleted = '0';
		product.expectedSize = '5000';
		response.dataAccessRequestStatus.productStatuses.push(product);
	});

	// validation
	if (req.body.simpledataaccessrequest.requestStage === 'validation') {
		response.dataAccessRequestStatus.status=4;
		res.status(200).json(response);
		return;
	}

	// confirmation
	if (req.body.simpledataaccessrequest.requestStage === 'confirmation') {
		response.dataAccessRequestStatus.status=0;
		// define call back function after creating
		// send response
		let cbAfterCreate = function(response) {
			if (response.code !== 0) {
				res.status(response.code).json(response.datas);
			} else {
				response.datas.ID = response.datas.id;
				delete response.datas._id;
				delete response.datas.id;
				res.setHeader('Location', '/ngeo/dataAccessRequestStatuses/' + response.datas.ID)
				res.status(201).json({"dataAccessRequestStatus": response.datas });
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

	
});

/**
 * About : description of requests for simpleDataAccessRequests
 * @function router.get
 * @param {String} url - /ngeo/simpletDataAccessRequests/about
 * @param {object} req - empty
 * @param {object} res - response
 */
router.get('/about', (req, res) => {

	Logger.debug('About simpleDataAccessRequests requests is calling');

	res.status(200).send("Description of simpleDataAccessRequests requests");
});

module.exports = router;