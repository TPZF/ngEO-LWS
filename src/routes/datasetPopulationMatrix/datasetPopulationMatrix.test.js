// CORE
let should = require('should');
let request = require('supertest');
let fs = require("fs");

let app = require('../../app');

describe('Route datasetPopulationMatrix', function () {

	it('GET /ngeo/datasetPopulationMatrix', function (done) {

		request(app)
			.get('/ngeo/datasetPopulationMatrix')
			.send()
			.expect(200)
			.end(function (err, res) {
				should(res.body).have.property('datasetpopulationmatrix');
				should(res.body.datasetpopulationmatrix).have.property('criteriaTitles');
				should(res.body.datasetpopulationmatrix.criteriaTitles).be.a.Array();
				should(res.body.datasetpopulationmatrix.criteriaTitles).have.length(6);
				should(res.body.datasetpopulationmatrix).have.property('datasetPopulationValues');
				should(res.body.datasetpopulationmatrix.datasetPopulationValues).be.a.Array();
				should(res.body.datasetpopulationmatrix.datasetPopulationValues).have.length(24);
				done();
			});

	});

	it('GET /ngeo/datasetPopulationMatrix/about', function (done) {

		request(app)
			.get('/ngeo/datasetPopulationMatrix/about')
			.expect(200)
			.end(function (err, res) {
				should(res.text).be.a.String();
				done();
			});
	});

});