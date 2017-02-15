/**
* Unit test file for service web client configuration Data
* It allow to test the REST service and the data the configuration should contain
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

describe("IF-ngEO-WebClientConfigurationData --> Unit test",function(){
  var confData = {};
  
  it("should return the configuration json file for the WEBC and verify some parameter in the json file",function(done){
    //calling ADD api
    server
    .get('/ngeo/webClientConfigurationData')
    .expect("Content-type",/json/)
    .expect(200)
    .end(function(err,res){
      var confData = JSON.parse(utils.removeComments(res.text));
      //to be modified whenever we have another test file
      assert.equal(confData.tableView.directDownloadColumn,7);
      assert.equal(confData.tableView.columnsDef.length,15);
      done();
    });
  });
});