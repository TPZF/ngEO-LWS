// CORE
let request = require('supertest');
let should = require('should');

// APP
let app = require('../../app');

describe('Route productSearch', function () {

	it("Wait app is completly loading...", function (done) {
		let isLoading = true;
		this.timeout(10000);
		setTimeout(function () {
			isLoading = false;
			should(isLoading).be.false();
			done();
		}, 9000);
	});

	it('GET /ngeo/catalogue/SXCAT-Landsat57Merged/search', function (done) {

		this.timeout(10000);

		request(app)
			.get('/ngeo/catalogue/SXCAT-Landsat57Merged/search')
			.expect(200)
			.end(function (err, res) {
				should(res.body).have.property('type');
				should(res.body.type).be.equal('FeatureCollection');
				should(res.body).have.property('features');
				should(res.body.features).be.a.Array();
				should(res.body.features[0]).have.property('id');
				should(res.body.features[0]).have.property('type');
				should(res.body.features[0]).have.property('properties');
				should(res.body.features[0]).have.property('geometry');
				done();
			});
	})

	it('GET /ngeo/catalogue/toto/search - Not found', function (done) {

		request(app)
			.get('/ngeo/catalogue/toto/search')
			.expect(404)
			.end(function (err, res) {
				should(res.text).be.a.String();
				should(res.text).be.equal('Not found');
				done();
			});
	})

	it('GET /ngeo/catalogue/SXCAT-Landsat57Merged/search/about', function (done) {

		request(app)
			.get('/ngeo/catalogue/SXCAT-Landsat57Merged/search/about')
			.expect(200)
			.end(function (err, res) {
				should(res.text).be.a.String();
				done();
			});
	})

});
