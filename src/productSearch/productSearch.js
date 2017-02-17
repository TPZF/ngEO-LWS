var logger = require('../utils/logger');
var request = require('request');
var express = require('express');

var util = require('util');
var configurationConverter = require('../utils/backendConfigurationConverter');

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
    //TODO in the future the base backend url shall be dynamically taken from the osdx document (maybe shall be saved in a conf file, to be ckecked in the furure the best way to do that)
    var theSearchUrl = backendUrl + req.params['fCollectionId'] + "/atom" + _getQueryPath(req);
    //logger.info("The url to target on backend is: " + theSearchUrl);
    let startTime = Date.now();
    request( theSearchUrl, function (error, response, body) {
        logger.info("Time elapsed requesting backend \"" + theSearchUrl +  "\" is : ", Date.now() - startTime);
        if (!error && response.statusCode == 200) {
            var geoJsonWebcData =  configurationConverter.convertToNgeoWebCFormat(body);
            if(geoJsonWebcData){
                res.send(geoJsonWebcData);
            }else{
                res.status(404).send("Some inconsistency with response received from the backend");
            }
        } else {
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