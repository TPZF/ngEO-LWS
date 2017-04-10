// CORE
let request = require('supertest');
let should = require('should');

// APP
let app = require('../../app');

describe('Route productSearch', function () {

	beforeEach(function(done) {
		done();
	});

	it('GET /ngeo/catalogue/Landsat57Merged/search', function (done) {

		request(app)
		.get('/ngeo/catalogue/Landsat57Merged/search')
		.expect(200)
		.end(function (err, res) {
			should(res.body).have.property('features');
			should(res.body.features).be.a.Array();
			should(res.body.features[0]).have.property('id');
			should(res.body.features[0]).have.property('type');
			should(res.body.features[0]).have.property('properties');
			should(res.body.features[0]).have.property('geometry');
			done();
		});
	})

	it('GET /ngeo/catalogue/Landsat57Merged/search/about', function (done) {

		request(app)
		.get('/ngeo/catalogue/Landsat57Merged/search/about')
		.expect(200)
		.end(function (err, res) {
			should(res.text).be.a.String();
			done();
		});
	})

});
