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
	url = require('url'),
	logger = require('./utils/logger'),
	methodOverride = require('method-override'),
	errorHandler = require('errorhandler'),
	bodyParser = require('body-parser'),
	routes = require('routes'),
	globalTunnel = require('global-tunnel');

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


//host for both http and https
let host = process.env.HOST || 'localhost';

/**
 * Create a http server wich will take port from process environment if set otherwise 3000 by default 
 */
let createHttpServer = function () {
	//http port from env otherwise 3000 if not found (the 8080 is more often in use that is why such a port)
	let httpPort = process.env.HTTP_PORT || 3000;
	//create a http server listening on port httpPort
	http.createServer(app).listen(httpPort, host, function () {
		logger.info("Express server listening @ http://%s:%s", host, httpPort);
	});
};

/**
 * Create a https server which will take port from process environment otherwise 3001 by default
 */
let createHttpsServer = function () {
	//https port from conf if found otherwise 3001 by default (the 443 is more often in use that is why such a port)
	let httpsPort = process.env.HTTPS_PORT || 3001;
	//all stuff needed for the https protocol
	let privateKey = fs.readFileSync('./ssl/ngeo.key', 'utf8');
	let certificate = fs.readFileSync('./ssl/ngeo.cert', 'utf8');
	let credentials = { key: privateKey, cert: certificate };
	//create a https server with the https port and other stuff needed
	https.createServer(credentials, app).listen(httpsPort, host, function () {
		logger.info("Express server listening @ https://%s:%s", host, httpsPort);
	});
};

//Check if we have proxy configured 
//means that your network is behind a proxy server
//@see https://www.npmjs.com/package/global-tunnel
if (configuration.hasOwnProperty('proxySettings')) {
	if (configuration.proxySettings.useProxy) {
		globalTunnel.initialize({
			tunnel: 'neither',
			protocol: configuration.proxySettings.protocol,
			host: configuration.proxySettings.host,
			port: configuration.proxySettings.port
		});
	}
}

//here we check if there is a protocol where to run the server
//It could be HTTPS, HTTP or BOTH, if none is specified then will be both
let protocol = process.env.PROTOCOL || 'BOTH';
switch (protocol) {
	case 'BOTH':
		createHttpServer();
		createHttpsServer();
		break;
	case 'HTTPS':
		createHttpsServer();
		break;
	case 'HTTP':
		createHttpServer();
		break;
	default:
		console.error(`Unrecognized process.env.PROTOCOL: ${protocol} using both http and https by default`);
		createHttpServer();
		createHttpsServer();
}

module.exports = app;