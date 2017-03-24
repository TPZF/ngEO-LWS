/**
 * Unit test file for service web SimpleDataAccessRequests
 * It allow to test the REST service and the mongodb database
 */
let should = require('should');
let assert = require('assert');
let request = require("supertest");

let app = require('../../app');

describe('SimpleDataAccessRequests', function() {

	before(function(done) {
		// if you want to pass parameters before testing
		done();
	});

	/*
	 * Steps on this test
	 * 1 - PUT /ngeo/simpleDataAccessRequests with validation
	 * 2 - PUT /ngeo/simpleDataAccessRequests with confirmation
	 */
	describe('PUT /ngeo/simpleDataAccessRequests', function () {

		var idCreated = 0;

		it('Step with validation requestStage', function(done) {

			var datas = {
				simpledataaccessrequest: {
					"requestStage": "validation",
					"downloadLocation": {
						"DownloadManagerId": "MY_DM_001",
						"DownloadDirectory": "/home/test/tmp/"
					},
					"productURLs": [
						{"productURL": "http://urlproduit1"},
						{"productURL": "http://urlproduit2"}
					],
					"name": "SDAR_001"
				}
			};

			request(app)
			.put('/ngeo/simpleDataAccessRequests')
			.send(datas)
			.expect(200)
			.expect('Content-Type', /json/)
			.end(function(err,res) {
				should(res.body).be.a.Object();
				should(res.body).have.property('dataAccessRequestStatus');
				should(res.body.dataAccessRequestStatus).have.property('ID');
				should(res.body.dataAccessRequestStatus).have.property('status');
				should(res.body.dataAccessRequestStatus.status).be.equal(4);
				done();
			});

		});

		it('Step with confirmation requestStage', function(done) {

			var datas = {
				simpledataaccessrequest: {
					"requestStage": "confirmation",
					"downloadLocation": {
						"DownloadManagerId": "MY_DM_001",
						"DownloadDirectory": "/home/test/tmp/"
					},
					"productURLs": [
						{"productURL": "http://urlproduit1"},
						{"productURL": "http://urlproduit2"}
					],
					"name": "SDAR_001"
				}
			};

			request(app)
			.put('/ngeo/simpleDataAccessRequests')
			.send(datas)
			.expect(201)
			.expect('Content-Type', /json/)
			.end(function(err,res) {
				should(res.body).be.a.Object();
				should(res.body).have.property('dataAccessRequestStatus');
				should(res.body.dataAccessRequestStatus).have.property('ID');
				should(res.body.dataAccessRequestStatus).have.property('status');
				should(res.body.dataAccessRequestStatus.status).be.equal(0);
				done();
			});

		});

	});

});