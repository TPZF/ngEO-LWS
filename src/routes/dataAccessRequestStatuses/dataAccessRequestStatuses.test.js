/**
 * Unit test file for service web DataAccessRequestStatuses
 * It allow to test the REST service and the mongodb database
 */
let should = require('should');
let assert = require('assert');
let request = require("supertest");

let app = require('../../app');

describe('DataAccessRequestStatuses', function() {

	before(function(done) {
		// if you want to pass parameters before testing
		done();
	});

	/*
	 * Steps on this test
	 * 1 - GET /ngeo/dataAccessRequestStatuses
	 */
	describe('GET /ngeo/dataAccessRequestStatuses', function () {

		it('List all dataAccessRequestStatuses', function(done) {

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

	});

	/*
	 * Steps on this test
	 * 1 - GET /ngeo/dataAccessRequestStatuses/about
	 */
	describe('GET /ngeo/dataAccessRequestStatuses/about', function () {

		it('Get info about dataAccessRequestStatuses', function(done) {

			request(app)
			.get('/ngeo/dataAccessRequestStatuses/about')
			.send()
			.expect(200)
			.expect('Content-Type', /json/)
			.end(function(err,res) {
				should(res.body).be.a.String();
				done();
			});

		});

	});

});