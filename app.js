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

var app = express();

//all environment
app.set('port', process.env.PORT || 3000);
app.use(methodOverride());
app.use(errorHandler());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/webClientConfigurationData',webClientConfigurationData);
app.use('/datasetPopulationMatrix',datasetPopulationMatrix);

//var wms2eosProxy = httpProxy.createServer(80, 'wms2eos.eo.esa.int');

http.createServer(app).listen(app.get('port'), function(){
  var host = app.get('host');
  var port = app.get('port');
  
  //logger.info("Express server listening on port " + app.get('port'));
  logger.info("Express server listening @ http://%s:%s", host,port);
  
});



/*app.route('/book')
  .get(function(req, res) {
    res.send('Get a random book');
	logger.info("seinding the reposne  as Get git a random book");
  })
  .post(function(req, res) {
    res.send('Add a book');
	logger.info("adding Add on post  a random book");
  })
  .put(function(req, res) {
    res.send('Update the book');
	logger.info("update on put Update the book");
  });
*/

module.exports = app;