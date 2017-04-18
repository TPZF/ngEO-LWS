// CORE
let express = require('express');

// UTILS
let Logger = require('utils/logger');

// SERVICE
let collectionService = require('services/collectionService');

// ROUTER
let router = express.Router();
router.use(function timeLog(req, res, next) {
	Logger.info('Time: ', Date.now());
	next();
});

/**
 * define the get route
 * 
 * @function router.get
 * @param {string} url - /ngeo/datasetPopulationMatrix
 */
router.get('/', function (req, res) {

	Logger.debug('GET /ngeo/datasetPopulationMatrix');

	let response = {
		"datasetpopulationmatrix": {
			"criteriaTitles": ["keyword", "mission", "name", "sensor", "productType", "sensorMode"],
			"datasetPopulationValues": []
		}
	}

	collectionService.refresh().then(() => {
		collectionService.collections.forEach((collection) => {
			
			// Add some hardcoded values for now just to make things work..
			response.datasetpopulationmatrix.datasetPopulationValues.push([
				"",
				"REMOTE",
				collection.name,
				"REMOTE",
				"REMOTE",
				"REMOTE",
				collection.id,
				collection.totalResults
			]);
		});

		res.json(response);
	});

});

/**
 * define the about route
 *  
 * @function router.get
 * @param {string} url - /ngeo/datasetPopulationMatrix/about
 */
router.get('/about', function (req, res) {
	Logger.debug('GET /ngeo/datasetPopulationMatrix/about');
	let options = {
		root: __dirname
	};
	res.status(200).sendFile('./description.html', options);
});

module.exports = router