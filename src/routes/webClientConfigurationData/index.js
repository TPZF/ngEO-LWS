// CORE
let express = require('express');

// UTILS
let Logger = require('utils/logger');

// ROUTER
let router = express.Router();
router.use(function timeLog(req, res, next) {
	Logger.info('Time: ', Date.now());
	next();
});

/**
 * GET /ngeo/webClientConfigurationData
 */
router.get('/', function (req, res) {
	Logger.debug('GET /ngeo/webClientConfigurationData');
	let options = {
		root: __dirname
	};
	res.sendFile('./configuration.json', options);
});

/**
 * define the about route
 * GET /ngeo/webClientConfigurationData/about
 * 
 */
router.get('/about', function (req, res) {
	Logger.debug('GET /ngeo/webClientConfigurationData/about');
	res.status(200).send('<h1>Description of webClientConfigurationData requests</h1><p>retrieve the base configuration for the web client</p>');
});

module.exports = router