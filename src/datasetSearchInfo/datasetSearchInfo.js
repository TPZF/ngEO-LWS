let express = require('express');
let _ = require('lodash');
let collectionService = require('../collectionService/collectionService');

let router = express.Router({
	mergeParams: true
});
router.use(function timeLog(req, res, next) {
	next();
});

/**
 * Convert backend XML format to ngEO WEBC format
 * 
 * NB: Only range & list types are handled currently
 * TODO: Make distinction between checkbox & select box
 */
let buildParameter = function(parameter) {
	let res;
	if (parameter['prm:Option']) {
		// Selectbox
		res = {
			"id": parameter['@'].name,
			"type": "List",
			"possibleValues": []
		}
		parameter['prm:Option'].forEach( (option) => {
			res.possibleValues.push(option['@'].value);
		} );
	} else if ( parameter['@'].minInclusive && parameter['@'].maxInclusive ) {
		res = {
			"id": parameter['@'].name,
			"type": parameter['@'].maximum == 1 ? "Integer" : "Range",
			"rangeMinValue": parameter['@'].minInclusive,
			"rangeMaxValue": parameter['@'].maxInclusive
		};
	}
	return res;
}

// Avoid geo-spatial & catalog parameters since these are not takin part in advanced attributes
let omittedParameters = ["count", "offset", "bbox", "grel", "start", "end", "trel", "availabilityTime"];

/**
 * Build advanced attributes in ngEO WEBC format
 */
let buildAttributes = function(parameters) {
	let result = [];
	parameters.forEach( (parameter) => {
		if (omittedParameters.indexOf(parameter['@'].name) == -1) {
			result.push(buildParameter(parameter));
		}
	} );
	return result;
}

/**
 * Build datasetInfo response respecting protocol used by current version of WEBC
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
			"attributes": buildAttributes(url['prm:Parameter']),
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