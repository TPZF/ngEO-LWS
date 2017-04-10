/**
 * Unit test file for service web DataAccessRequestStatuses
 * It allow to test the REST service and the mongodb database
 */
let should = require('should');
let assert = require('assert');
let request = require("supertest");

let app = require('../../app');

describe('Route dataAccessRequestStatuses', function() {

	before(function(done) {
		// if you want to pass parameters before testing
		done();
	});

	it('GET /ngeo/dataAccessRequestStatuses', function (done) {

		request(app)
		.get('/ngeo/dataAccessRequestStatuses')
		.send()
		.expect(200)
		.expect('Content-Type', /json/)
		.end(function(err,res) {
			should(res.body).be.a.Object();
			should(res.body).have.property('dataAccessRequestStatuses');
			should(res.body.dataAccessRequestStatuses).be.a.Array();
			done();
		});

	});

	it('GET /ngeo/dataAccessRequestStatuses/about', function (done) {

		request(app)
		.get('/ngeo/dataAccessRequestStatuses/about')
		.send()
		.expect(200)
		.end(function(err,res) {
			should(res.text).be.a.String();
			done();
		});

	});

});