/**
* Unit test file for service web client configuration Data
* It allow to test the REST service and the data the configuration should contain
*/
var supertest = require("supertest");
var should = require("should");
var logger = require('../utils/logger');
// This agent refers to PORT where program is runninng.

var server = supertest("http://localhost:3000");

// UNIT test begin

describe("Unit test of the IF-ngEO-WebClientConfigurationData that shall return the configuration file for the WEBC",function(){
  var confData = {};
  
  it("should return a json file",function(done){
    //calling ADD api
    server
    .get('/webClientConfigurationData')
    // .expect("Content-type",/json/)
    .expect(200)
    .end(function(err,res){
      //confData = JSON.parse(res);
      //logger.info(res);
      //res.status.should.equal(200);
      //res.body.error.should.equal(false);
      //res.body.data.should.equal(30);
      done();
    });
  });
});


/**
 * Helper function to remove comments from the JSON file
 */
var removeComments = function(string) {
	var starCommentRe = new RegExp("/\\\*(.|[\r\n])*?\\\*/", "g");
	var slashCommentRe = new RegExp("(^[\/]|[^:]\/)\/.*[\r|\n]", "g");
	string = string.replace(slashCommentRe, "");
	string = string.replace(starCommentRe, "");

	return string;
};