// CORE
let express = require('express');
let _ = require('lodash');

// UTILS
let Logger = require('utils/logger');
let configurationConverter = require('utils/backendConfigurationConverter');

// SERVICES
let collectionService = require('services/collectionService');
let browseService = require('services/browseService');

/**
 * @function _addOriginDatasetId
 * @param {String} myCollectionId
 * @param {Object} myGeoJson
 * @return {Object}
 */
function _addOriginDatasetId(myCollectionId, myGeoJson) {
	_.map(myGeoJson.features, function(feat) {
		feat.properties.originDatasetId = myCollectionId;
	});
	return myGeoJson;
}

// ROUTER
let router = express.Router({
	mergeParams: true
});
router.use(function timeLog(req, res, next) {
	Logger.info('Time: ', Date.now());
	next();
});

/**
 * define the home page route
 * 
 * @function router.get
 * @param {string} url - /
 */
router.get('/', function (req, res) {
	
	// Retrieve collection url from collection service
	let collectionId = req.params['fCollectionId'];
	Logger.debug('GET /ngeo/catalogue/' + collectionId + '/search');

	collectionService.refresh().then(() => {
		// Search the available products on backend
		collectionService.search(collectionId, {
			params: req.query,
			onSuccess: (result) => {
				let geoJsonWebcData = configurationConverter.convertSearchResponse(result, collectionId);
				if (geoJsonWebcData) {
					// Add browse information for converted collection
					browseService.addBrowseInfo(collectionId, geoJsonWebcData);
					// Add originDatasetId for each features (used to retrieve a product from catalog or shopcart)
					geoJsonWebcData = _addOriginDatasetId(collectionId, geoJsonWebcData);
					geoJsonWebcData.type = 'FeatureCollection';
					// send to response
					// FIXME - test fails if content-type is defined
					//res.type('Content-Type', 'application/vnd.geo+json').send(geoJsonWebcData);
					res.send(geoJsonWebcData);
				} else {
					res.status(500).send("Some inconsistency with response received from the backend");
				}
			},
			onError: (errorMessage) => {
				res.status(500).send("Error while searching on " + collectionId);
			}
		});
	});

});

/**
 * define the about route
 * 
 * @function router.get
 * @param {string} url - /about
 */
router.get('/about', function (req, res) {
	Logger.debug('GET /ngeo/catalogue/:idCollection/search/about');
	res.status(200).send('<h1>Route for productSearch</h1><h2>GET /ngeo/catalogue/:collectionId/search</h2><h2><h2>GET /ngeo/catalogue/about</h2>');
});

module.exports = router