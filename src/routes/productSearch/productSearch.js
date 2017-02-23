let logger = require('../../utils/logger');
let express = require('express');
let collectionService = require('../../services/collectionService/collectionService');
let browseService = require('../../services/browseService/browseService');
let url = require('url');
let _ = require('lodash');

let configurationConverter = require('../../utils/backendConfigurationConverter');

//the options here is to preserve  when express routes the url to preserver paramters
let router = express.Router({
	mergeParams: true
});

//let queryPathUrl = "/atom?count=50&offset=900&bbox=&grel=&start=1990-01-01T00:00:00.000Z&end=2003-12-31T23:59:59.000Z&trel=&platformSerialIdentifier=&instrumentShortName=&wrsLongitudeGrid=&wrsLatitudeGrid=&availabilityTime=";

// 'https://sxcat.eox.at/opensearch/collections/Landsat57Merged/atom?count=50&offset=900&bbox=&grel=&start=1990-01-01T00:00:00.000Z&end=2003-12-31T23:59:59.000Z&trel=&platformSerialIdentifier=&instrumentShortName=&wrsLongitudeGrid=&wrsLatitudeGrid=&availabilityTime=',

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
	logger.info('Time: ', Date.now());
	next();
});

// define the home page route
router.get('/', function (req, res) {
	let parsedUrl = url.parse(req.url);

	// Retrieve collection url from collection service
	let collectionId = req.params['fCollectionId'];

	// Search the available products on backend
	collectionService.search(collectionId, {
		params: url.parse(req.url).search,
		onSuccess: (result) => {
			let geoJsonWebcData = configurationConverter.convertToNgeoWebCFormat(result);
			if (geoJsonWebcData) {
				// Add browse information for converted collection
				browseService.addBrowseInfo(collectionId, geoJsonWebcData);
				res.send(geoJsonWebcData);
			} else {
				res.status(500).send("Some inconsistency with response received from the backend");
			}
		},
		onError: (errorMessage) => {
			res.status(500).send(errorMessage);
		}
	});
});

// define the about route
router.get('/about', function (req, res) {
	res.send('retrieve the search');
});

module.exports = router