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

let assert = require('assert');

// UNIT test begin
describe("IF-ngEO-shopcarts --> Unit test", function () {

	it("should return shopcarts list", function (done) {
		//stun the response by sending our test configuration file
		let contents = fs.readFileSync('../test_data/shopcarts-test-file.json');
		//parse it
		let jsonContent = JSON.parse(contents);

		//stub the response in order to send our test file
		nock("http://localhost:3000")
			.get('/ngeo/shopcarts')
			.reply(200, jsonContent);

		server
			.get('/ngeo/shopcarts')
			.expect(200)
			.end(function (err, res) {
				let resData = JSON.parse(res.text);
				//assert.equal(resData.shopCartList, true);
				expect(resData).to.have.property('shopCartList');
				expect(resData.shopCartList).to.have.length(2);
				done();
			});
	});

	it("should return items in a shopcart", function (done) {
		//stun the response by sending our test configuration file
		let contents = fs.readFileSync('../test_data/shopcart-58bee5f4ff0431114c5e1e40-test-file.json');
		//parse it
		let jsonContent = JSON.parse(contents);

		//stub the response in order to send our test file
		nock("http://localhost:3000")
			.get('/ngeo/shopcarts/58bee5f4ff0431114c5e1e40/items/?format=json&count=50&startIndex=1')
			.reply(200, jsonContent);

		server
			.get('/ngeo/shopcarts/58bee5f4ff0431114c5e1e40/items/?format=json&count=50&startIndex=1')
			.expect(200)
			.end(function (err, res) {
				let resData = JSON.parse(res.text);
				//assert.equal(resData.shopCartList, true);
				expect(resData).to.have.property('type');
				expect(resData).to.have.property('features');
				expect(resData.features).to.have.length(4);
				done();
			});
	})
});