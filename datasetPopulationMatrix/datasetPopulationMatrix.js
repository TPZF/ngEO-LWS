/*
 * GET datasetPopulationMatrix
 * IF-ngEO-datasetPopulationMatrix
 */

var express = require('express');
var router = express.Router();
var logger = require('../utils/logger');

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  logger.info('Time: ', Date.now());
  next();
});
// define the home page route
router.get('/', function(req, res) {
   var options = { root: __dirname };
   res.sendFile('./datasets.json',options);
});
// define the about route
router.get('/about', function(req, res) {
  res.send('retrieve the dataset population matrix containing dataset list and their id for the web client');
});

module.exports = router