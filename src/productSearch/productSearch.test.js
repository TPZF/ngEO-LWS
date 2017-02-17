let supertest = require("supertest");
let should = require("should");
let logger = require('../utils/logger');
let assert = require('assert');
let utils = require('../utils/utils');
let nock = require('nock');
// This agent refers to PORT where program is runninng.
let server = supertest("http://localhost:3000");

let configurationConverter = require('../utils/backendConfigurationConverter');
let fs = require("fs");

// UNIT test begin

describe("IF-ngEO-productSearch --> Unit test", function () {

  it("should return a search file in atom opensearch xml response, convert it into geojson webc compliant format and ensure that the number of product found in the stub xml file which are 10 are well processed as 10 geojson features, test also some mandatory parameters that a feature shall have", function (done) {
    //stun the response by sending our test configuration file
    let contents = fs.readFileSync('./test_data/backend-rep-Landsat57Merged-all-test-file.xml');
    //parse it
    //let jsonContent = JSON.parse(contents);

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
        let jsonProcessed = configurationConverter.convertToNgeoWebCFormat(res.text);
        jsonProcessed.should.have.property('features').with.lengthOf(10);
        for(var i=0;i<jsonProcessed.features.length;i++){
          var aFeature = jsonProcessed.features[i];
          aFeature.should.have.property('type').exactly('Feature');
          aFeature.should.have.keys('id','type','properties','geometry');
          aFeature.properties.should.have;

          var earthObsProp = aFeature.properties.EarthObservation;
          earthObsProp.should.have.keys('phenomenonTime','procedure');
        }
        done();
      });
  })
});