// CORE
let should = require('should');
let request = require('supertest');

// APP
let app = require('../../app');
let Utils = require('../../utils/utils');

/**
 * Unit test file for service web client configuration Data
 * It allow to test the REST service and the data the configuration should contain
 */
describe('Route webClientConfigurationData', function () {

	it('GET /ngeo/webClientConfigurationData', function (done) {

		request(app)
			.get('/ngeo/webClientConfigurationData')
			//.buffer()
			//.parse(binaryParser)
			.expect(200)
			.end(function (err, res) {
				should(res.body).be.a.Object();
				should(res.body).have.property('tableView');
				done();
			});

	});

	it('GET /ngeo/webClientConfigurationData/about', function (done) {
		request(app)
			.get('/ngeo/webClientConfigurationData/about')
			.expect(200)
			.end(function (err, res) {
				should(res.text).be.a.String();
				done();
			});
	});
});