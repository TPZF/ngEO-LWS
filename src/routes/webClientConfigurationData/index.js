// CORE
let express = require('express');
let fs = require('fs');

// UTILS
let Logger = require('utils/logger');
let Utils = require('utils/utils');

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
	let filePath = __dirname + '/configuration.json';
	var file = fs.readFile(filePath, 'utf-8', function (err, data) {
		if (err) {
			res.status(500).send('Unexpected error');
			return;
		}
		res.status(200).json(JSON.parse(Utils.removeComments(data)));
	});
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