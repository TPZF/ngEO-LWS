/**
 * Module dependencies.
 */

// Change the working directory
process.chdir(__dirname);

// Add current directory path to avoid '../../../module' problem
// @see https://gist.github.com/branneman/8048520
require('app-module-path').addPath(__dirname);

let express = require('express'),
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

let webClientConfigurationData = require('./routes/webClientConfigurationData');
let datasetPopulationMatrix = require('./routes/datasetPopulationMatrix');
let productSearch = require('./routes/productSearch');
let datasetSearchInfo = require('./routes/datasetSearchInfo');
let datasetAuthorization = require('./routes/datasetAuthorization');

let app = express();

//all environment
app.set('port', process.env.PORT || 3000);
app.use(methodOverride());
app.use(errorHandler());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/ngeo/webClientConfigurationData', webClientConfigurationData);
app.use('/ngeo/datasetPopulationMatrix', datasetPopulationMatrix);
//search product here by taking in account the dataset we want to search on the backend
app.use('/ngeo/catalogue/:fCollectionId/search/', productSearch);
app.use('/ngeo/datasetSearchInfo/:datasetId', datasetSearchInfo);
app.use('/ngeo/datasetAuthorization', datasetAuthorization);


//let wms2eosProxy = httpProxy.createServer(80, 'wms2eos.eo.esa.int');
let host = 'localhost';
http.createServer(app).listen(app.get('port'), host, function () {
	let port = app.get('port');
	logger.info("Express server listening @ http://%s:%s", host, port);

});

module.exports = app;