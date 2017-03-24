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

let router = express.Router({
	mergeParams: true
});

// make sure we go to the next routes and don't stop here
router.use(function timeLog(req, res, next) {
	next();
});

/**
 * List DataAccessRequestStatus
 *
 * @function router.get
 * @param url - /ngeo/dataAccessRequestStatuses/
 * @param req - empty
 * @param res - response
 */
router.get('/', (req, res) => {

	Logger.debug('DataAccessRequestStatuses list is calling');

	// define call back function after listing items
	// send response
	let cbAfterList = function(response) {
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
	}

	// call list service
	DatabaseService.list(DATA_ACCESS_REQUEST_STATUS_NAME, cbAfterList);

});


/**
 * About : description of requests for dataAccessRequestStatuses
 * @function router.get
 * @param {String} url - /ngeo/dataAccessRequestStatuses/about
 * @param {object} req - empty
 * @param {object} res - response
 */
router.get('/about', (req, res) => {

	Logger.debug('About dataAccessRequestStatuses requests is calling');

	res.status(200).send("Description of dataAccessRequestStatuses requests");
});

module.exports = router;