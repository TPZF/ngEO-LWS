var logger = require('../utils/logger');
var request = require('request');
var express = require('express');
var xml2JSON = require('xml2json');

var router = express.Router();

var configurationConverter = require('../utils/backendConfigurationConverter');


// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  logger.info('Time: ', Date.now());
  next();
});

// define the home page route
router.get('/', function(req, res) {
    request(
    'https://sxcat.eox.at/opensearch/collections/Landsat57Merged/atom?count=50&offset=900&bbox=&grel=&start=1990-01-01T00:00:00.000Z&end=2003-12-31T23:59:59.000Z&trel=&platformSerialIdentifier=&instrumentShortName=&wrsLongitudeGrid=&wrsLatitudeGrid=&availabilityTime=',
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
            //test.replace(/dog|fish/g, '');
            //for the moment replace all the wm=mlnx in hard coded manner so we have a json file compatoble direct with webc response by just doing some
            //replacement at some place
            var repJson = xml2JSON.toJson(body).replace(/os\:|dc\:|georss\:|media\:|eop\:|ows\:|om\:|gml\:|xsi:\:|xlink\:|eo\:|geo\:|time\:|opt\:/g,'');
            //json object
            var ojson = JSON.parse(repJson);
            //convert the json into response compatible with webc format
            var feature = configurationConverter.convertBackendEntryIntoFeature(ojson.feed['entry']);
            res.send(feature);
            }
        }
       /* else{
            logger.info("There was an error retriving data from backend " + error);
            res.send("There was an error retriving data from backend");
        }*/

    );
});
// define the about route
router.get('/about', function(req, res) {
  res.send('retrieve the search');
});

module.exports = router


/*module.exports = function(req, res){
  
  request(
    'https://sxcat.eox.at/opensearch/collections/Landsat57Merged/atom?count=50&offset=900&bbox=&grel=&start=1990-01-01T00:00:00.000Z&end=2003-12-31T23:59:59.000Z&trel=&platformSerialIdentifier=&instrumentShortName=&wrsLongitudeGrid=&wrsLatitudeGrid=&availabilityTime=',
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
            //test.replace(/dog|fish/g, '');
            //for the moment replace all the wm=mlnx in hard coded manner so we have a json file compatoble direct with webc response by just doing some
            //replacement at some place
            var repJson = xml2JSON.toJson(body).replace(/os\:|dc\:|georss\:|media\:|eop\:|ows\:|om\:|gml\:|xsi:\:|xlink\:|eo\:|geo\:|time\:|opt\:/g,'');
            //json object
            var ojson = JSON.parse(repJson);
            //convert the json into response compatible with webc format
            var feature = configurationConverter.convertBackendEntryIntoFeature(ojson.feed['entry']);
            res.send(feature);
        	}
    	}else{
            logger.info("There was an error retriving data from backend " + error);
            res.send("There was an error retriving data from backend");
        }

	);

};*/