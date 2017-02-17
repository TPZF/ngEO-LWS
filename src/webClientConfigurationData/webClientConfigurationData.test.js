/**
 * Unit test file for service web client configuration Data
 * It allow to test the REST service and the data the configuration should contain
 */
let nock = require('nock');
let expect = require('chai').expect;
//used to read the JSON file
let fs = require("fs");
let supertest = require("supertest");
// This agent refers to PORT where program is runninng.
let server = supertest("http://localhost:3000");

let logger = require('../utils/logger');
let assert = require('assert');
let utils = require('../utils/utils');


// UNIT test begin
describe("IF-ngEO-WebClientConfigurationData --> Unit test", function () {

	it("should return the configuration json file for the WEBC and verify some parameter in the json file", function (done) {
		//stun the response by sending our test configuration file
		let contents = fs.readFileSync('./test_data/configuration-test-file.json');
		//parse it
		let jsonContent = JSON.parse(contents);

		//stub the response in order to send our test file
		nock("http://localhost:3000")
			.get('/ngeo/webClientConfigurationData')
			.reply(200, jsonContent);

		server
			.get('/ngeo/webClientConfigurationData')
			.expect(200)
			.end(function (err, res) {
				let confData = JSON.parse(res.text);
				//to be modified whenever we have another test file
				assert.equal(confData.tableView.directDownloadColumn, 7);
				assert.equal(confData.tableView.columnsDef.length, 15);
				done();
			});
	})
});