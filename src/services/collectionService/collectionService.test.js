let should = require('should');
let collectionService = require('./collectionService');
let sxCat = require('../../mockBackend/sxCat');

describe("Collection service methods", function () {

	beforeEach(function() {
		sxCat.mockEverything();
	});

	it("should return the information about the given dataset/collection in parsed json format", function (done) {
		let testCollectionId = 'Landsat57Merged';
		collectionService.info(testCollectionId, {
			onSuccess: (result) => {
				result.should.have.property('@');
				result.should.have.property('Url').with.lengthOf(4);
				result.Url[0].should.have.property('prm:Parameter').with.lengthOf(12);
				done();
			}
		});
	});

	it("should return the search response on the given collection in parsed json format", function(){
		// TODO
	});
});