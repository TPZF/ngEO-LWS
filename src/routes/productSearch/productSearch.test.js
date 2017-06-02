// CORE
let request = require('supertest');
let should = require('should');

// APP
let app = require('../../app');

// LIBS
let fs = require('fs');
let Xml2JsonParser = require('utils/xml2jsonParser');
let collectionService = require('services/collectionService');

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

	it('Check all geometries for georss tag', function () {
		fs.readFile(__dirname + '/georss.xml', function (err, data) {
			if (err) {
				throw "Unable to read file";
			}
			Xml2JsonParser.parse(data, (_result) => {
				// use collection SXCAT-Landsat57Merged to convert response
				let result = collectionService.convertResponse('SXCAT-Landsat57Merged', _result);

				should(result).have.property('type');
				should(result.type).be.equal('FeatureCollection');
				should(result).have.property('features');
				should(result.features).be.a.Array();
				
				let i = 0;

				// first feature : Polygon
				should(result.features[i]).have.property('geometry');
				should(result.features[i].geometry).have.property('type');
				should(result.features[i].geometry.type).be.equal('Polygon');
				should(result.features[i]).have.property('geometry');
				should(result.features[i].geometry).have.property('coordinates');
				should(result.features[i].geometry.coordinates).be.a.Array();
				should(result.features[i].geometry.coordinates[0]).be.a.Array();
				should(result.features[i].geometry.coordinates[0].length).be.equal(6);

				// second feature : Line
				i++;
				should(result.features[i]).have.property('geometry');
				should(result.features[i].geometry).have.property('type');
				should(result.features[i].geometry.type).be.equal('MultiLineString');
				should(result.features[i]).have.property('geometry');
				should(result.features[i].geometry).have.property('coordinates');
				should(result.features[i].geometry.coordinates).be.a.Array();
				should(result.features[i].geometry.coordinates[0]).be.a.Array();
				should(result.features[i].geometry.coordinates[0].length).be.equal(2);

				// third feature : MultiLine
				i++;
				should(result.features[i]).have.property('geometry');
				should(result.features[i].geometry).have.property('type');
				should(result.features[i].geometry.type).be.equal('MultiLineString');
				should(result.features[i]).have.property('geometry');
				should(result.features[i].geometry).have.property('coordinates');
				should(result.features[i].geometry.coordinates).be.a.Array();
				should(result.features[i].geometry.coordinates[0]).be.a.Array();
				should(result.features[i].geometry.coordinates[0].length).be.equal(3);

				// fourth feature : Point
				i++;
				should(result.features[i]).have.property('geometry');
				should(result.features[i].geometry).have.property('type');
				should(result.features[i].geometry.type).be.equal('Point');
				should(result.features[i]).have.property('geometry');
				should(result.features[i].geometry).have.property('coordinates');
				should(result.features[i].geometry.coordinates).be.a.Array();
				should(result.features[i].geometry.coordinates.length).be.equal(2);

				// fifth feature : Box
				i++;
				should(result.features[i]).have.property('geometry');
				should(result.features[i].geometry).have.property('type');
				should(result.features[i].geometry.type).be.equal('Polygon');
				should(result.features[i]).have.property('geometry');
				should(result.features[i].geometry).have.property('coordinates');
				should(result.features[i].geometry.coordinates).be.a.Array();
				should(result.features[i].geometry.coordinates[0]).be.a.Array();
				should(result.features[i].geometry.coordinates[0].length).be.equal(5);

			});
		})

	});

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
