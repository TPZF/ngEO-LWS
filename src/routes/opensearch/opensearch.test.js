// CORE
let request = require('supertest');
let should = require('should');

// APP
let app = require('../../app');

describe('Route opensearch', function () {

	it("Wait app is completly loading...", function (done) {
		let isLoading = true;
		this.timeout(10000);
		setTimeout(function () {
			isLoading = false;
			should(isLoading).be.false();
			done();
		}, 9000);
	});

	it('GET /ngeo/opensearch', function (done) {

		this.timeout(10000);
		
		request(app)
		.get('/ngeo/opensearch')
		.expect(200)
		.end(function (err, res) {
			should(res.text).be.a.String();
			done();
		});
	})

	it('GET /ngeo/opensearch/Landsat57Merged', function (done) {

		request(app)
		.get('/ngeo/opensearch/Landsat57Merged')
		.expect(200)
		.end(function (err, res) {
			should(res.text).be.a.String();
			done();
		});
	})

	it('GET /ngeo/opensearch/about', function (done) {

		this.timeout(10000);
		
		request(app)
		.get('/ngeo/opensearch/about')
		.expect(200)
		.end(function (err, res) {
			should(res.text).be.a.String();
			done();
		});
	})

});
