/*
 * GET datasetPopulationMatrix
 * IF-ngEO-datasetPopulationMatrix
 */

let express = require('express');
let router = express.Router();
let logger = require('utils/logger');
let collectionService = require('services/collectionService/collectionService');

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
	logger.info('Time: ', Date.now());
	next();
});
// define the home page route
router.get('/', function (req, res) {
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
// define the about route
router.get('/about', function (req, res) {
	res.send('retrieve the dataset population matrix containing dataset list and their id for the web client');
});

module.exports = router