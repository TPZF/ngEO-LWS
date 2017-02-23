let supertest = require("supertest");
let logger = require('../../utils/logger');
var should = require('should');
let sxCat = require('../../mockBackend/sxCat');

// Get & run server
let app = require('../../app');
let server = supertest(app);

/**
 * Integration test using the real implementation of CollectionService
 */
describe("GET /datasetSearchInfo", function () {

	let testCollectionId = 'Landsat57Merged';
	beforeEach(function() {
		sxCat.mockEverything();
	});

	it("should return the information about the given dataset/collection", function (done) {
		
		server
			.get(`/ngeo/datasetSearchInfo/${testCollectionId}`)
			.expect(200)
			.end(function (err, res) {
				should.exist(res.body.datasetSearchInfo);
				// Check globally datasetSearchInfo object
				let datasetSearchInfo = res.body.datasetSearchInfo;
				datasetSearchInfo.should.have.property('datasetId').exactly(testCollectionId);
				datasetSearchInfo.should.have.property('attributes').with.lengthOf(4);

				// Check advanced attributes: type & id
				let attributes = datasetSearchInfo.attributes;
				attributes[0].should.have.property('id').exactly('platformSerialIdentifier');
				attributes[0].should.have.property('type').exactly('List');
				done();
			});
	});

	it("should return the original xml coming from backend", function() {
		server
			.get(`/ngeo/datasetSearchInfo/${testCollectionId}?sxcat=true`)
			.expect(200)
			.end(function (err, res) {
				// Check that no transformation has been applied
				res.body.should.have.property('@'); // at least @ should be present using current xml parser
			});
	})
});