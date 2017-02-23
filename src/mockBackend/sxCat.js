let nock = require('nock');
let fs = require("fs");

/**
 * Mock every request to OpenSearch backend
 * Split in multiple functions later
 */
let mockEverything = function() {
	let testCollectionId = 'Landsat57Merged';
	let mockOsdd = fs.readFileSync(`../test_data/${testCollectionId}-osdd.xml`);
		nock('https://sxcat.eox.at')
			.get(`/opensearch/collections/${testCollectionId}`)
			.reply(200, mockOsdd);
}

module.exports = {
	mockEverything: mockEverything
};