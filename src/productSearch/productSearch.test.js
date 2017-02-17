var supertest = require("supertest");
var should = require("should");
var logger = require('../utils/logger');
var assert = require('assert');
var utils = require('../utils/utils');
var nock = require('nock');
// This agent refers to PORT where program is runninng.
var server = supertest("http://localhost:3000");

var configurationConverter = require('../utils/backendConfigurationConverter');
var fs = require("fs");

// UNIT test begin

describe("IF-ngEO-productSearch --> Unit test", function () {

  it("should return a search file in atom opensearch xml response, convert it into geojson webc compliant format and ensure that the number of product found in the stub xml file which are 10 are well processed as 10 geojson features", function (done) {
    //stun the response by sending our test configuration file
    var contents = fs.readFileSync('./test_data/backend-rep-Landsat57Merged-all-test-file.xml');
    //parse it
    //var jsonContent = JSON.parse(contents);

    //specify the url to be intercepted
    nock("http://localhost:3000")
      //define the method to be intercepted
      .get('/ngeo/catalogue/myTestFeatureCollectionId/search')
      //respond with a OK and the specified JSON response
      .reply(200, contents);
    
    //perform the request to the api which will now be intercepted by nock
    server
      .get('/ngeo/catalogue/myTestFeatureCollectionId/search')
      .expect(200)
      .end(function (err, res) {
         var jsonProcessed = configurationConverter.convertToNgeoWebCFormat(res.text)
         assert.equal(jsonProcessed.features.length,10);
         done();
      });
  })
});