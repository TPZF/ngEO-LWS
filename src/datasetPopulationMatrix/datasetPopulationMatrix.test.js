/**
* Unit test file for service web dataset poupulation matrix to populate available dataset
* It allow to test the REST service and the dataset poupulation matrix to populate available dataset
*/
var nock = require('nock');
var expect = require('chai').expect;
//used to read the JSON file
var fs = require("fs");
var supertest = require("supertest");
// This agent refers to PORT where program is runninng.
var server = supertest("http://localhost:3000");

var logger = require('../utils/logger');
var assert = require('assert');
var utils = require('../utils/utils');

// UNIT test begin
describe("IF-ngEO-datasetPopulationMatrix --> Unit test",function(){
  
  it("should return the dataset population json file for the WEBC and verify some parameter in the json file",function(done){
    //stun the response by sending our test configuration file
    var contents = fs.readFileSync('./test_data/datasets-test-file.json');
    //parse it
    var jsonContent = JSON.parse(contents);

    //stub the response in order to send our test file
    nock("http://localhost:3000")
      .get('/ngeo/datasetPopulationMatrix')
      .reply(200, jsonContent);

    server
      .get('/ngeo/datasetPopulationMatrix')
      .expect(200)
      .end(function (err, res) {
        var confData = JSON.parse(res.text);
        //to be modified whenever we have another test file
        assert.equal(confData.datasetpopulationmatrix.criteriaTitles.length,6);
        done();
      });
  })
});