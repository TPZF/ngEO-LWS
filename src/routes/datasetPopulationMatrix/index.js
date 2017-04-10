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
	// let options = {
	// 	root: __dirname
	// };

	let response = {
		"datasetpopulationmatrix": {
			"criteriaTitles": ["keyword", "mission", "name", "sensor", "productType", "sensorMode"],
			"datasetPopulationValues": []
		}
	}

	//console.log(collectionService.collections);
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

	// Dynamic result
	res.json(response);



	// Mocked result
	// res.sendFile('./datasets.json', options);
});

/**
 * define the about route
 *  
 * @function router.get
 * @param {string} url - /ngeo/datasetPopulationMatrix/about
 */
router.get('/about', function (req, res) {
	Logger.debug('GET /ngeo/datasetPopulationMatrix/about');
	res.status(200).send('<h1>Route datasetPopulationMatrix</h1><h2>GET /ngeo/datasetPopulationMatrix</h2>');
});

module.exports = router