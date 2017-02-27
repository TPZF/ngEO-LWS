let supertest = require("supertest");
let should = require("should");
let assert = require('assert');

let Xml2JsonParser = require('./xml2jsonParser');
let configurationConverter = require('./backendConfigurationConverter');
let fs = require("fs");

//stun the response by sending our test configuration file
let contents = fs.readFileSync('../test_data/backend-rep-Landsat57Merged-all-test-file.xml');

let onSuccess = function (result)  {
	let jsonProcessed = configurationConverter.convertSearchResponse(result);
	jsonProcessed.should.have.property('features').with.lengthOf(10);
	jsonProcessed.properties.should.have.property('totalResults');
	for (var i = 0; i < jsonProcessed.features.length; i++) {
		var aFeature = jsonProcessed.features[i];
		aFeature.should.have.property('type').exactly('Feature');
		aFeature.should.have.keys('id', 'type', 'properties', 'geometry');
		var earthObsProp = aFeature.properties.EarthObservation;
		earthObsProp.should.have.keys('phenomenonTime', 'procedure');
	}
};

let onError = function (errorMessage) {
	//res.status(500).send(errorMessage);
};

// UNIT test begin

describe("convertSearchResponse function test --> Unit test", function () {

	it("should convert a xml file into compliant webc format and ensure that the number of product found in the stub xml file which are 10 are well processed as 10 geojson features, test also some mandatory parameters that a feature shall have", function (done) {
		Xml2JsonParser.parse(contents,onSuccess,onError);
		done();
	})
});