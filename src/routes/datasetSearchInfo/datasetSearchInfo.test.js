// CORE
let request = require('supertest');
let should = require('should');

// APP
let app = require('../../app');

/**
 * Integration test using the real implementation of CollectionService
 */
describe('Route datasetSearchInfo', function () {

	let testCollectionId = 'Landsat57Merged';

	it('GET /ngeo/datasetSearchInfo/:collectionId', function (done) {
		
		request(app)
		.get(`/ngeo/datasetSearchInfo/${testCollectionId}`)
		.expect(200)
		.end(function (err, res) {
			should(res.body).have.property('datasetSearchInfo');
			should(res.body.datasetSearchInfo).have.property('datasetId');
			should(res.body.datasetSearchInfo.datasetId).exactly(testCollectionId);
			should(res.body.datasetSearchInfo).have.property('attributes');
			should(res.body.datasetSearchInfo.attributes).be.a.Array();
			should(res.body.datasetSearchInfo.attributes[0]).have.property('id').exactly('platformSerialIdentifier');
			should(res.body.datasetSearchInfo.attributes[0]).have.property('type').exactly('List');
			done();
		});

	});

	// it('GET /ngeo/datasetSearchInfo/:collectionId?sxcat=true', function(done) {

	// 	request(app)
	// 	.get(`/ngeo/datasetSearchInfo/${testCollectionId}?sxcat=true`)
	// 	.expect(200)
	// 	.end(function (err, res) {
	// 		//console.log(res.body);
	// 		//res.body.should.have.property('@');
	// 		done();
	// 	});

	// });

});