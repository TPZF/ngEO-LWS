// CORE
let request = require('supertest');
let should = require('should');

// APP
let app = require('../../app');

/**
 * Unit test file for service web DataAccessRequestStatuses
 * It allow to test the REST service and the mongodb database
 */
describe('Route dataAccessRequestStatuses', function() {

	it("Wait app is completly loading...", function (done) {
		let isLoading = true;
		this.timeout(4000);
		setTimeout(function () {
			isLoading = false;
			should(isLoading).be.false();
			done();
		}, 3000);
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