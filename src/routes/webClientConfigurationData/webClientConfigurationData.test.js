// CORE
let should = require('should');
let request = require('supertest');

// APP
let app = require('../../app');

/**
 * Unit test file for service web client configuration Data
 * It allow to test the REST service and the data the configuration should contain
 */
describe('Route webClientConfigurationData', function () {

	const binaryParser = function (res, cb) {
		res.setEncoding('binary');
		res.data = '';
		res.on("data", function (chunk) {
			res.data += chunk;
		});
		res.on('end', function () {
			cb(null, new Buffer(res.data, 'binary'));
		});
	};

	it('GET /ngeo/webClientConfigurationData', function (done) {

		request(app)
		.get('/ngeo/webClientConfigurationData')
		.buffer()
		.parse(binaryParser)
		.end(function(err,res) {
			if (err) { done(err); }
			should(res.status).be.equal(200);
			/* FIXME ! there are somme comments in JSON file, so it's not possible to parse it !
			let respDatas = JSON.parse(res.res.data);
			should(respDatas).be.a.Object();
			should(respDatas).have.property('tableView');
			*/
			done();
		});

	});

	it('GET /ngeo/webClientConfigurationData/about', function (done) {
		request(app)
		.get('/ngeo/webClientConfigurationData/about')
		.expect(200)
		.end(function(err,res) {
			should(res.text).be.a.String();
			done();
		});
	});
});