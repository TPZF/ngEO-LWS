// CORE
let should = require('should');
let request = require('supertest');

// APP
let app = require('../../app');

// Configuration
let Configuration = require('config');
let ssoVar = Configuration.ssoUserId;

/**
 * Unit test file for service web SimpleDataAccessRequests
 * It allow to test the REST service and the mongodb database
 */
describe('Route simpleDataAccessRequests', function () {

	before(function (done) {
		// if you want to pass parameters before testing
		done();
	});

	it('PUT /ngeo/simpleDataAccessRequests with validation requestStage', function (done) {

		var idCreated = 0;

		var datas = {
			simpledataaccessrequest: {
				"requestStage": "validation",
				"downloadLocation": {
					"DownloadManagerId": "MY_DM_001",
					"DownloadDirectory": "/home/test/tmp/"
				},
				"productURLs": [
					{ "productURL": "http://urlproduit1" },
					{ "productURL": "http://urlproduit2" }
				],
				"name": "SDAR_001"
			}
		};

		request(app)
			.put('/ngeo/simpleDataAccessRequests')
			.set(ssoVar, 'anonymous')
			.send(datas)
			.expect(200)
			.expect('Content-Type', /json/)
			.end(function (err, res) {
				/*should(res.body).be.a.Object();
				should(res.body).have.property('dataAccessRequestStatus');
				should(res.body.dataAccessRequestStatus).have.property('ID');
				should(res.body.dataAccessRequestStatus).have.property('status');
				should(res.body.dataAccessRequestStatus.status).be.equal(4);*/
				done();
			});

	});

	it('PUT /ngeo/simpleDataAccessRequests with confirmation requestStage', function (done) {

		var datas = {
			simpledataaccessrequest: {
				"requestStage": "confirmation",
				"downloadLocation": {
					"DownloadManagerId": "MY_DM_001",
					"DownloadDirectory": "/home/test/tmp/"
				},
				"productURLs": [
					{ "productURL": "http://urlproduit1" },
					{ "productURL": "http://urlproduit2" }
				],
				"name": "SDAR_001"
			}
		};

		request(app)
			.put('/ngeo/simpleDataAccessRequests')
			.set(ssoVar, 'anonymous')
			.send(datas)
			.expect(201)
			.expect('Content-Type', /json/)
			.end(function (err, res) {
				/*should(res.body).be.a.Object();
				should(res.body).have.property('dataAccessRequestStatus');
				should(res.body.dataAccessRequestStatus).have.property('ID');
				should(res.body.dataAccessRequestStatus).have.property('status');
				should(res.body.dataAccessRequestStatus.status).be.equal(0);*/
				done();
			});

	});

	it('GET /ngeo/simpleDataAccessRequests/about', function (done) {

		request(app)
			.get('/ngeo/simpleDataAccessRequests/about')
			.set(ssoVar, 'anonymous')
			.send()
			.expect(200)
			.end(function (err, res) {
				should(res.text).be.a.String();
				done();
			});

	});

});