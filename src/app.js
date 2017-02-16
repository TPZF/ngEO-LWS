/**
 * Module dependencies.
 */

// Change the working directory
process.chdir(__dirname);

var express = require('express'),
    http = require('http'),
    path = require('path'),
    httpProxy = require('http-proxy'),
    proxy = require('./proxy'),
    expressProxy = require('express-http-proxy'),
    url = require('url'),
    logger = require('./utils/logger'),
	  methodOverride = require('method-override'),
	  errorHandler = require('errorhandler'),
	  bodyParser = require('body-parser'),
	  routes = require('routes');

var webClientConfigurationData = require('./webClientConfigurationData/webClientConfigurationData');
var datasetPopulationMatrix = require('./datasetPopulationMatrix/datasetPopulationMatrix');
var productSearch = require('./productSearch/productSearch');
var datasetSearchInfo = require('./datasetSearchInfo/datasetSearchInfo');

var app = express();

//all environment
app.set('port', process.env.PORT || 3000);
app.use(methodOverride());
app.use(errorHandler());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/ngeo/webClientConfigurationData',webClientConfigurationData);
app.use('/ngeo/datasetPopulationMatrix',datasetPopulationMatrix);
//search product here by taking in account the dataset we want to search on the backend
app.use('/ngeo/catalogue/:fCollectionId/search/',productSearch);
app.use('/ngeo/datasetSearchInfo/:datasetId', datasetSearchInfo);


//var wms2eosProxy = httpProxy.createServer(80, 'wms2eos.eo.esa.int');
var host = 'localhost';
http.createServer(app).listen(app.get('port'), host, function(){
  var port = app.get('port');
  logger.info("Express server listening @ http://%s:%s", host, port);
  
});

module.exports = app;