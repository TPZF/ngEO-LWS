/**
 * Module dependencies.
 */

// Change the working directory
process.chdir(__dirname);

// Add current directory path to avoid '../../../module' problem
// @see https://gist.github.com/branneman/8048520
require('app-module-path').addPath(__dirname);

let express = require('express'),
	configuration = require('./config'),
	http = require('http'),
	https = require('https'),
	fs = require('fs'),
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
let shopcarts = require('./routes/shopcarts');
let downloadManagers = require('./routes/downloadManagers');
let simpleDataAccessRequests = require('./routes/simpleDataAccessRequests');
let dataAccessRequestStatuses = require('./routes/dataAccessRequestStatuses');
let opensearch = require('./routes/opensearch');

let app = express();

//all environment
app.use(methodOverride());
app.use(errorHandler());
// set limit for json input to 50mb
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/ngeo/webClientConfigurationData', webClientConfigurationData);
app.use('/ngeo/datasetPopulationMatrix', datasetPopulationMatrix);
//search product here by taking in account the dataset we want to search on the backend
app.use('/ngeo/catalogue/:fCollectionId/search/', productSearch);
app.use('/ngeo/datasetSearchInfo', datasetSearchInfo);
app.use('/ngeo/datasetAuthorization', datasetAuthorization);
app.use('/ngeo/shopcarts', shopcarts);
app.use('/ngeo/downloadManagers', downloadManagers);
app.use('/ngeo/simpleDataAccessRequests', simpleDataAccessRequests);
app.use('/ngeo/dataAccessRequestStatuses', dataAccessRequestStatuses);
app.use('/ngeo/opensearch', opensearch);

//let wms2eosProxy = httpProxy.createServer(80, 'wms2eos.eo.esa.int');

//host for both http and https
let host = process.env.HOST || 'localhost';
//http port from env otherwise 3000 if not found (the 8080 is more often in use that is why such a port)
let httpPort = process.env.HTTP_PORT || 3000;

//https port from conf if found otherwise 3001 by default (the 443 is more often in use that is why such a port)
let httpsPort = process.env.HTTPS_PORT || 3001;
//all stuff needed for the https protocol
let privateKey = fs.readFileSync('./certdata/ngeo.key', 'utf8');
let certificate = fs.readFileSync('./certdata/ngeo.cert', 'utf8');
let credentials = { key: privateKey, cert: certificate };

//create a http server listening on port httpPort
http.createServer(app).listen(httpPort, host, function () {
	logger.info("Express server listening @ http://%s:%s", host, httpPort);
});

//create a https server with the https port and other stuff needed
https.createServer(credentials, app).listen(httpsPort, host, function () {
	logger.info("Express server listening @ https://%s:%s", host, httpsPort);
});
module.exports = app;