let logger = require('../utils/logger');
let request = require('request');
let express = require('express');
let collectionService = require('../collectionService/collectionService');
let url = require('url');
let _ = require('lodash');

let util = require('util');
let configurationConverter = require('../utils/backendConfigurationConverter');

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
	let collectionSearchUrl = _.find(collectionService.collections, {id: req.params['fCollectionId']}).url + '/atom';
	// Append search parameters coming from WEBC
	let searchUrl = collectionSearchUrl + url.parse(req.url).search;

	// Make request (maybe move it to collection service later)
	let startTime = Date.now();
	request(searchUrl, function (error, response, body) {
		logger.info("Time elapsed requesting backend \"" + searchUrl + "\" is : ", Date.now() - startTime);
		if (!error && response.statusCode == 200) {
			let geoJsonWebcData = configurationConverter.convertToNgeoWebCFormat(body);
			if (geoJsonWebcData) {
				res.send(geoJsonWebcData);
			} else {
				res.status(404).send("Some inconsistency with response received from the backend");
			}
		} else {
			logger.info("There was an error retrieving data from backend " + error);
			res.status(response.statusCode).send("There was an error retriving data from backend");
		}
	});
});

// define the about route
router.get('/about', function (req, res) {
	res.send('retrieve the search');
});

module.exports = router