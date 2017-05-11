// CORE
let express = require('express');
let _ = require('lodash');

// UTILS
let Logger = require('utils/logger');
let Configuration = require('config');
let CatalogService = require('services/catalogService');
let CollectionService = require('services/collectionService');

// ROUTER
let router = express.Router({
	mergeParams: true
});
router.use(function timeLog(req, res, next) {
	next();
});

/**
 * Get feed description for all collections
 * 
 * @function router.get
 * @param url - /ngeo/opensearch
 * @param req - request
 * @param res - response
 */
router.get('/', function (req, res) {
	Logger.debug('GET /ngeo/opensearch');
	let referrer = Configuration['host'];
	res.set('Content-Type', 'application/atom+xml').send(CatalogService.getXMLFeed(referrer));
});

/**
 * About : description of requests for opensearch
 * Placed before other get route to get priority
 *  
 * @function router.get
 * @param {String} url - /ngeo/openseach/about
 * @param {object} req - request
 * @param {object} res - response
 */
router.get('/about', (req, res) => {
	Logger.debug('GET /ngeo/opensearch/about');
	res.status(200).send("Description of opensearch requests");
});

/**
 * Get opensearch description for a catalog
 *
 * @function router.get
 * @param url - /ngeo/opensearch/request
 * @param req - request
 * @param res - response
 */
router.get('/request', function (req, res) {
	Logger.debug('GET /ngeo/opensearch/request');
	let options = {
		root: __dirname
	};
	if (req.query.query) {
		if (req.query.query.indexOf('EOP:ESA:SENTINEL') !== -1) {
			res.status(200).sendFile('./sentinel.xml', options);
			return;
		}
	}
	res.status(404).send('Not found');
});

/**
 * Get opensearch description for a collection
 *
 * @function router.get
 * @param url - /ngeo/opensearch/:collection_id
 * @param req - request
 * @param res - response
 */
router.get('/:collection_id', function (req, res) {
	Logger.debug('GET /ngeo/opensearch/:collection_id');
	let idToGet = req.params['collection_id'];
	let collection = CollectionService.getCollection(idToGet);
	if (!collection) {
		res.status(404).send('Not found');
	}
	// TODO : retrieve opensearch request template and rewrite it for QS
	// redirect
	res.redirect(collection.url);
});

module.exports = router;