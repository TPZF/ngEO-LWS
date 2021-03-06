// CORE
let express = require('express');
let _ = require('lodash');

// UTILS
let Logger = require('utils/logger');

// SERVICES
let collectionService = require('services/collectionService');

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
 * @param {string} url - /ngeo/catalogue/:collectionId/search
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
				let finalResult = collectionService.convertResponse(collectionId, result);
				if (finalResult === null) {
					res.status(500).send("Some inconsistency with response received from the backend");
				} else {
					res.status(200).send(finalResult);
				}
			},
			onError: (errorCode) => {
				if (errorCode === '404') {
					res.status(404).send('Not found');
				} else {
					res.status(500).send('Error while searching on collection ' + collectionId);
				}
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