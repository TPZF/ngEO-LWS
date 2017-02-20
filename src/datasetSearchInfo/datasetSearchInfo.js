let request = require('request');
let express = require('express');
let _ = require('lodash');
let Xml2JsonParser = require('../utils/xml2jsonParser');
let collectionService = require('../collectionService/collectionService');

let router = express.Router({
	mergeParams: true
});
// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
	next();
});


/**
 * Build response respecting protocol used by current version of WEBC
 */
let buildResponse = function (datasetId, inputJson) {
	let url = inputJson.Url[0]; // Take the first one by default(GET/bbox)
	let startDateConf = _.find(url['prm:Parameter'], function (item) {
		return item['@'].name == "start"
	});
	let stopDateConf = _.find(url['prm:Parameter'], function (item) {
		return item['@'].name == "end"
	});
	let outputJson = {
		"datasetSearchInfo": {
			"datasetId": datasetId,
			"description": inputJson.Description,
			"keywords": [], // TODO
			"downloadOptions": [], // TODO
			"attributes": [], // TODO
			"startDate": startDateConf['@'].minInclusive,
			"endDate": stopDateConf['@'].maxInclusive
		}
	};
	return outputJson;
}


/**
 * Get datasetInfo request
 */
router.get('/', function (req, res) {
	let datasetId = req.params['datasetId'];
	collectionService.info(datasetId, {
		onSuccess: (result) => {
			// Used for debug
			if (req.query.sxcat) {
				res.send(result);
			} else {
				res.send(buildResponse(datasetId, result))
			}
		},
		onError: (errorMessage) => {
			res.send(errorMessage);
		}
	});
});

// Just for test, maybe description should be extracted using this link..
router.get('/atom', function (req, res) {
	let datasetId = req.params['datasetId'];
	collectionService.search(datasetId, {
		onSuccess: (result) => {
			res.send(JSON.parse(result));
		},
		onError: (errorMessage) => {
			res.send(errorMessage);
		}
	});
})

module.exports = router;