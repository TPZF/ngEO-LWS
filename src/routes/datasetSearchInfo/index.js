// CORE
let express = require('express');
let _ = require('lodash');

// UTILS
let Logger = require('utils/logger');
let Configuration = require('config');
let CollectionService = require('services/collectionService');

// ROUTER
let router = express.Router({
	mergeParams: true
});
router.use(function timeLog(req, res, next) {
	next();
});

/**
 * Get datasetInfo request
 */
router.get('/:datasetId', function (req, res) {
	// retrieve datasetId from request
	let datasetId = req.params['datasetId'];
	if (req.query.sxcat) {
		res.send(collection.osdd);
	} else {
		res.send(CollectionService.buildResponse(datasetId));
	}
});

// Just for test, maybe description should be extracted using this link..
router.get('/atom', function (req, res) {
	let datasetId = req.params['datasetId'];
	CollectionService.search(datasetId, {
		onSuccess: (result) => {
			res.send(JSON.parse(result));
		},
		onError: (errorMessage) => {
			res.send(errorMessage);
		}
	});
});

module.exports = router;