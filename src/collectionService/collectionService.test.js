let logger = require('../utils/logger');
let nock = require('nock');
let fs = require("fs");

let collectionService = require('./collectionService');

describe("Collection service methods", function () {

	let testCollectionId = 'Landsat57Merged';
	it("should return the information about the given dataset/collection in parsed json format", function () {
		// OpenSearch description document mock for Landsat57Merged (actually coming from SX-CAT)
		let mockOsdd = fs.readFileSync(`../test_data/${testCollectionId}-osdd.xml`);
		nock('https://sxcat.eox.at')
			.get(`/opensearch/collections/${testCollectionId}`)
			.reply(200, mockOsdd);

		collectionService.info(testCollectionId, {
			onSuccess: (result) => {
				result.should.have.property('@');
				result.should.have.property('Url').with.lengthOf(4);
				result.Url[0].should.have.property('prm:Parameter').with.lengthOf(12);
			}
		});
	});

	it("should return the search response on the given collection in parsed json format", function(){
		// TODO
	});
});