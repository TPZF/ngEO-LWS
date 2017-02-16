let request = require('request');
let express = require('express');
let xml2JSON = require('xml2json');

let backendUrl = 'https://sxcat.eox.at/opensearch/collections/';

let router = express.Router({mergeParams: true});
// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  next();
});


/**
 * Build response respecting protocol used by current version of WEBC
 */
let buildResponse = function(datasetId, xml) {
    let inputJson = JSON.parse(xml);
    let url = inputJson.OpenSearchDescription.Url[0]; // Take the first one by default(GET/bbox)
    let outputJson = {
        "datasetSearchInfo": {
            "datasetId": datasetId,
            "description": inputJson.OpenSearchDescription.Description,
            "keywords": [], // TODO
            "downloadOptions": [], // TODO
            "attributes": [], // TODO
            "startDate": url['prm:Parameter'][4].minInclusive,
            "endDate": url['prm:Parameter'][4].maxInclusive
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
    request( datasetOsddUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.send(buildResponse(datasetId, xml2JSON.toJson(body)));
        } else {
            res.send('error');
        }
    })    
});

// Just for test, maybe description should be extracted using this link..
router.get('/atom', function(req, res) {
    let datasetId = req.params['datasetId'];
    let datasetOsddUrl = backendUrl + datasetId + '/atom';
    request( datasetOsddUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.send(JSON.parse(xml2JSON.toJson(body)));
        } else {
            res.send('error');
        }
    });
})

module.exports = router;