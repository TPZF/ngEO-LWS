// CORE
let should = require('should');
let request = require('supertest');

// APP
let app = require('../../app');

// Configuration
let Configuration = require('config');
let ssoVar = Configuration.ssoUserId;

/**
 * Integration test using the real implementation of athentication service sso or not
 */
describe('Route user information', function () {

	it('GET /ngeo/userId without user be authenticated (no sso from configuration)', function (done) {
		request(app).get(`/ngeo/userId`)
			.expect(401)
			.end(function (err, res) {
				done();
			});

	});

	it('GET /ngeo/userId without user that is empty from sso (sso from configuration but responce empty from idp)', function (done) {
		request(app).get(`/ngeo/userId`)
			.set(ssoVar, '')
			.expect(401)
			.end(function (err, res) {
				done();
			});

	});

	it('GET /ngeo/userId without user that is empty (oly space) from sso (sso from configuration but responce empty from idp)', function (done) {
		request(app).get(`/ngeo/userId`)
			.set(ssoVar, '     ')
			.expect(401)
			.end(function (err, res) {
				done();
			});

	});

	it('GET /ngeo/userId with sso from header configuration', function (done) {
		request(app).get('/ngeo/userId')
			.set(ssoVar, 'anIdTest')
			.expect(200)
			.end(function (err, res) {
				should(res.body).be.a.Object();
				should(res.body).have.property('userInformation');
				should(res.body.userInformation).have.property('userId');
				should(res.body.userInformation.userId).be.equal('anIdTest');
				done();
			});
	});
});