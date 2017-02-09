/**
* Unit test file for service web dataset poupulation matrix to populate available dataset
* It allow to test the REST service and the dataset poupulation matrix to populate available dataset
*/
var supertest = require("supertest");
var should = require("should");
var logger = require('../utils/logger');
var app = require('../app');
var assert = require('assert');
var utils = require('../utils/utils');
// This agent refers to PORT where program is runninng.
var server = supertest("http://localhost:3000");


// UNIT test begin

describe("IF-ngEO-datasetPopulationMatrix --> Unit test",function(){
  var confData = {};
  
  it("should return the dataset population json file for the WEBC and verify some parameter in the json file",function(done){
    //calling ADD api
    server
    .get('/datasetPopulationMatrix')
    .expect("Content-type",/json/)
    .expect(200)
    .end(function(err,res){
      var confData = JSON.parse(utils.removeComments(res.text));
      //var confData = JSON.parse(res.text);
      //to be modified whenever we have another test file
      assert.equal(confData.datasetpopulationmatrix.criteriaTitles.length,6);
      done();
    });
  });
});