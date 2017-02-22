let supertest = require("supertest");
let logger = require('../utils/logger');
let nock = require('nock');
let fs = require("fs");

// Get & run server
let app = require('../app');
let server = supertest(app);

/**
 * Integration test using the real implementation of CollectionService
 */
describe("GET /datasetSearchInfo", function () {

	let testCollectionId = 'Landsat57Merged';
	beforeEach(function() {
		// OpenSearch description document mock for Landsat57Merged (actually coming from SX-CAT)
		// Mock it since it needed by collectionService
		let mockOsdd = fs.readFileSync(`../test_data/${testCollectionId}-osdd.xml`);
		nock('https://sxcat.eox.at')
			.get(`/opensearch/collections/${testCollectionId}`)
			.reply(200, mockOsdd);
	});

	it("should return the information about the given dataset/collection", function () {
		
		server
			.get(`/ngeo/datasetSearchInfo/${testCollectionId}`)
			.expect(200)
			.end(function (err, res) {
				// Check globally datasetSearchInfo object
				let datasetSearchInfo = res.body.datasetSearchInfo;
				datasetSearchInfo.should.have.property('datasetId').exactly(testCollectionId);
				datasetSearchInfo.should.have.property('attributes').with.lengthOf(4);

				// Check advanced attributes: type & id
				let attributes = datasetSearchInfo.attributes;
				attributes[0].should.have.property('id').exactly('platformSerialIdentifier');
				attributes[0].should.have.property('type').exactly('List');
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