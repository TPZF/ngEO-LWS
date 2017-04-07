// CORE
let express = require('express');
let _ = require('lodash');

// UTILS
let Logger = require('utils/logger');
let Configuration = require('config');
let collectionService = require('services/collectionService');

// ROUTER
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
 */
let buildParameter = function(parameter, paramTag) {
	let res;
	if (parameter[paramTag + 'Option']) {
		// Will be rendered as checkboxes in case when maxOccurs > 1, selectbox otherwise
		// TODO: minOccurs isn't taken into account currently
		let minOccurs = 0;
		if (parseInt(parameter['@'].minimum)) {
			minOccurs = parseInt(parameter['@'].minimum);
		}
		let maxOccurs = 1;
		if (parseInt(parameter['@'].maximum)) {
			maxOccurs = parseInt(parameter['@'].maximum);
		}
		res = {
			"id": parameter['@'].name,
			"type": "List",
			"possibleValues": [],
			"minOccurs": minOccurs,
			"maxOccurs": maxOccurs
		};
		if (Array.isArray(parameter[paramTag + 'Option'])) {
			parameter[paramTag + 'Option'].forEach( (option) => {
				res.possibleValues.push(option['@'].value);
			} );
		} else {
			res.possibleValues.push(parameter[paramTag + 'Option']['@'].value);
		}
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
// from FEDEO
omittedParameters.push("maximumRecords");
omittedParameters.push("startPage");
omittedParameters.push("startRecord");
omittedParameters.push("startDate");
omittedParameters.push("endDate");

/**
 * Build advanced attributes in ngEO WEBC format
 */
let buildAttributes = function(myCollection, searchRequestDescription, paramTag) {
	let result = [];
	searchRequestDescription[paramTag+'Parameter'].forEach( (parameter) => {
		if (omittedParameters.indexOf(parameter['@'].name) == -1) {
			if (!myCollection.parameters[parameter['@'].name]) {
				myCollection.parameters[parameter['@'].name] = parameter['@'].name;
			}
			let myParameter = buildParameter(parameter, paramTag);
			if (myParameter) {
				result.push(myParameter);
			}
		}
	} );
	return result;
}

/**
 * Build datasetInfo response respecting protocol used by current version of WEBC
 */
let buildResponse = function (datasetId) {

	let myCollection = collectionService.getCollection(datasetId);
	if (!myCollection) {
		Logger.error(`Unable to find collection ${datasetId}`);
		return null;
	}
	let paramTag = collectionService.findTagByXmlns(myCollection.osdd, Configuration.opensearch.xmlnsParameter);
	let timeTag = collectionService.findTagByXmlns(myCollection.osdd, Configuration.opensearch.xmlnsTime);

	// find parameters in node Url with type="application/atom+xml"
	let searchRequestDescription = collectionService.findSearchRequestDescription(datasetId);

	if (!searchRequestDescription) {
		Logger.error(`Unable to find searchRequestDescription for collection ${datasetId}`);
		return null;
	}

	// start date
	let startDateConf = _.find(searchRequestDescription[paramTag+'Parameter'], function (item) {
		return item['@'].value === '{' + timeTag + 'start}';
	});
	let startDate = null;
	if (startDateConf) {
		myCollection.parameters.start = startDateConf['@'].name;
		if (startDateConf['@'] && startDateConf['@'].minInclusive) {
			startDate = startDateConf['@'].minInclusive;
		}
	}

	// end date
	let stopDateConf = _.find(searchRequestDescription[paramTag+'Parameter'], function (item) {
		return item['@'].value === '{' + timeTag + 'end}';
	});
	let endDate = null;
	if (stopDateConf) {
		myCollection.parameters.stop = stopDateConf['@'].name;
		if (stopDateConf['@'] && stopDateConf['@'].maxInclusive) {
			endDate = stopDateConf['@'].maxInclusive;
		}
	}

	// startIndex
	let startIndexConf = _.find(searchRequestDescription[paramTag+'Parameter'], function (item) {
		return item['@'].value === '{startIndex}';
	});
	if (startIndexConf) {
		myCollection.parameters.startIndex = startIndexConf['@'].name;
	}

	// count
	let countConf = _.find(searchRequestDescription[paramTag+'Parameter'], function (item) {
		return item['@'].value === '{count}';
	});
	if (countConf) {
		myCollection.parameters.count = countConf['@'].name;
	}
	
	let outputJson = {
		datasetSearchInfo: {
			datasetId: datasetId,
			description: myCollection.Description,
			keywords: [], // TODO
			downloadOptions: [], // TODO
			attributes: buildAttributes(myCollection, searchRequestDescription, paramTag),
			startDate: startDate,
			endDate: endDate,
			startIndex: parseInt(searchRequestDescription['@'].indexOffset)
		}
	};
	return outputJson;
}

/**
 * Get datasetInfo request
 */
router.get('/:datasetId', function (req, res) {
	// retrieve datasetId from request
	let datasetId = req.params['datasetId'];
	if (req.query.sxcat) {
		res.send(collection.osdd);
	} else {
		res.send(buildResponse(datasetId));
	}

	/*collectionService.info(datasetId, {
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
	});*/
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
});

// Just for test, maybe description should be extracted using this link..
router.get('/about', function (req, res) {
	Logger.debug('About datasetSearchInfo requests is calling');
	res.status(200).json("Description of datasetSearchInfo requests");
});

module.exports = router;