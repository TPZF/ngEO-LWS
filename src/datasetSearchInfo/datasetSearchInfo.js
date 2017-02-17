let request = require('request');
let express = require('express');
let _ = require('lodash');
let Xml2JsonParser = require('../utils/xml2jsonParser');

let backendUrl = 'https://sxcat.eox.at/opensearch/collections/';

let router = express.Router({
    mergeParams: true
});
// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
    next();
});


/**
 * Build response respecting protocol used by current version of WEBC
 */
let buildResponse = function (datasetId, inputJson) {
    let url = inputJson.Url[0]; // Take the first one by default(GET/bbox)
    let startParam = _.find(url['prm:Parameter'], function (item) {
        return item['@'].name == "start"
    });
    let endParam = _.find(url['prm:Parameter'], function (item) {
        return item['@'].name == "end"
    });
    let outputJson = {
        "datasetSearchInfo": {
            "datasetId": datasetId,
            "description": inputJson.Description,
            "keywords": [], // TODO
            "downloadOptions": [], // TODO
            "attributes": [], // TODO
            "startDate": startParam['@'].minInclusive,
            "endDate": endParam['@'].maxInclusive
        }
    };
    return outputJson;
}


/**
 * Get datasetInfo request
 */
router.get('/', function (req, res) {
    let datasetId = req.params['datasetId'];
    let datasetOsddUrl = backendUrl + datasetId;
    request(datasetOsddUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            Xml2JsonParser.parse(body, function (result) {
                // Used for debug
                if (req.query.sxcat) {
                    res.send(result);
                } else {
                    res.send(buildResponse(datasetId, result))
                }
            }, function (errorMessage) {
                res.send(errorMessage);
            });
        } else {
            res.send('Error on SX-CAT catalog');
        }
    })
});

// Just for test, maybe description should be extracted using this link..
router.get('/atom', function (req, res) {
    let datasetId = req.params['datasetId'];
    let datasetOsddUrl = backendUrl + datasetId + '/atom';
    request(datasetOsddUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            Xml2JsonParser.parse(body, function (result) {
                res.send(JSON.parse(result));
            }, function (errorMessage) {
                res.send(errorMessage);
            });
        } else {
            res.send('Error on SX-CAT catalog');
        }
    });
})

module.exports = router;