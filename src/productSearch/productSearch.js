var logger = require('../utils/logger');
var request = require('request');
var express = require('express');
var xml2JSON = require('xml2json');

//the options here is to preserve  when express routes the url to preserver paramters
var router = express.Router({mergeParams: true});

var configurationConverter = require('../utils/backendConfigurationConverter');

var backendUrl = "https://sxcat.eox.at/opensearch/collections/";
//var queryPathUrl = "/atom?count=50&offset=900&bbox=&grel=&start=1990-01-01T00:00:00.000Z&end=2003-12-31T23:59:59.000Z&trel=&platformSerialIdentifier=&instrumentShortName=&wrsLongitudeGrid=&wrsLatitudeGrid=&availabilityTime=";


/**
* Given a request, trasnform its query string to query string to send to the backend
* @return
*      the query string that we have to send to the backend
*/
var _getQueryPath = function(req){
    var queryPath;
    if(req && req.query){
        queryPath = "?"
        var qArray = req.query;
        for(key in qArray){
            queryPath = queryPath + key + "="+qArray[key]+"&";
        }
        //supress the last & character we have added
        queryPath = queryPath.substring(0,queryPath.length-1);
    }
    return queryPath;
}

// 'https://sxcat.eox.at/opensearch/collections/Landsat57Merged/atom?count=50&offset=900&bbox=&grel=&start=1990-01-01T00:00:00.000Z&end=2003-12-31T23:59:59.000Z&trel=&platformSerialIdentifier=&instrumentShortName=&wrsLongitudeGrid=&wrsLatitudeGrid=&availabilityTime=',

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  logger.info('Time: ', Date.now());
  next();
});

// define the home page route
router.get('/', function(req, res) {
    //TODO in the future the base backend url shall be dynamicly taken from the osdx document (maybe shall be saved in a conf file, to be ckecked in the furure the best way to do that)
    var theSearchUrl = backendUrl + req.params['fCollectionId'] + "/atom" + _getQueryPath(req);
    logger.info(theSearchUrl);
    let startTime = Date.now();
    request( theSearchUrl, function (error, response, body) {
        logger.info('Time elapsed for request to SX-CAT : ', Date.now() - startTime);
        startDate = Date.now();
        if (!error && response.statusCode == 200) {
            //test.replace(/dog|fish/g, '');
            //for the moment replace all the xmlns in hard coded manner so we have a json file compatoble direct with webc response by just doing some
            //replacement at some place
            var repJson = xml2JSON.toJson(body).replace(/os\:|dc\:|georss\:|media\:|eop\:|ows\:|om\:|gml\:|xsi:\:|xlink\:|eo\:|geo\:|time\:|opt\:|sar\:/g,'');
            //json object
            var ojson = JSON.parse(repJson);
            //convert the json into response compatible with webc format
            var entries = ojson.feed['entry'];
            logger.info('Time elapsed for conversion : ', Date.now() - startTime);
            startTime = Date.now();
            if(entries){
                res.send(configurationConverter.convertBackendEntryIntoFeatureCollection(entries));
                logger.info('Send time : ', Date.now() - startTime);
            }else{
                res.status(404).send("Some inconsistency with response received from the backend \n" + xml2JSON.toJson(body));
            }
        }
        else{
            logger.info("There was an error retrieving data from backend " + error);
            res.status(response.statusCode).send("There was an error retriving data from backend");
          }
    });
});
// define the about route
router.get('/about', function(req, res) {
  res.send('retrieve the search');
});

module.exports = router