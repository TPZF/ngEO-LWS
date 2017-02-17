/**
 * Unit test file for service web dataset poupulation matrix to populate available dataset
 * It allow to test the REST service and the dataset poupulation matrix to populate available dataset
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
describe("IF-ngEO-datasetPopulationMatrix --> Unit test", function () {

	it("should return the dataset population json file for the WEBC and verify some parameter in the json file", function (done) {
		//stun the response by sending our test configuration file
		let contents = fs.readFileSync('./test_data/datasets-test-file.json');
		//parse it
		let jsonContent = JSON.parse(contents);

		//stub the response in order to send our test file
		nock("http://localhost:3000")
			.get('/ngeo/datasetPopulationMatrix')
			.reply(200, jsonContent);

		server
			.get('/ngeo/datasetPopulationMatrix')
			.expect(200)
			.end(function (err, res) {
				let confData = JSON.parse(res.text);
				//to be modified whenever we have another test file
				assert.equal(confData.datasetpopulationmatrix.criteriaTitles.length, 6);
				done();
			});
	})
});