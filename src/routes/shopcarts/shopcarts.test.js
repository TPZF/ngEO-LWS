// CORE
let should = require('should');
let request = require('supertest');

// APP
let app = require('../../app');

// Configuration
let Configuration = require('config');
let ssoVar = Configuration.ssoUserId;

/**
 * Unit test file for service web Shopcarts
 * It allow to test the REST service and the mongodb database
 */
describe('Route ShopCarts', function () {

	before(function (done) {
		// if you want to pass parameters before testing
		done();
	});

	/*
	 * Steps on this test
	 * 1 - Create a shopcart /POST
	 * 2 - List shopcarts /GET
	 * 3 - Update a shopcart /PUT
	 * 4 - Delete a shopcart /DELETE
	 * 5 - List (empty)
	 */
	describe('Full story (Create, List, Update, Delete)', function () {

		var idShopCart = 0;

		// create a shopcart
		it('POST /ngeo/shopcarts - Create a shopcart', function (done) {

			var datas = {
				shopcart: {
					name: 'test 001',
					isDefault: false,
					userId: 'anonymous'
				}
			};

			request(app)
				.post('/ngeo/shopcarts')
				.set(ssoVar, 'anonymous')
				.send(datas)
				.expect(201)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.Object();
					should(res.body).have.property('shopcart');
					should(res.body.shopcart).have.property('id');
					idShopCart = res.body.shopcart.id;
					should(res.body.shopcart).have.property('name');
					done();
				});

		});

		// list shopcart
		it('GET /ngeo/shopcarts - list shopcarts (1 item)', function (done) {

			request(app)
				.get('/ngeo/shopcarts')
				.set(ssoVar, 'anonymous')
				.send()
				.expect(200)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.Object();
					should(res.body).have.property('shopcarts');
					should(res.body.shopcarts).be.a.Array();
					res.body.shopcarts.should.have.length(1);
					res.body.shopcarts[0].id.should.be.equal(idShopCart);
					done();
				});

		});

		// update a shopcart
		it('PUT /ngeo/shopcarts/:id - update shopcart', function (done) {

			var datas = {
				shopcart: {
					id: idShopCart,
					name: 'test 002',
					isDefault: false,
					userId: 'anonymous'
				}
			};

			request(app)
				.put('/ngeo/shopcarts/' + idShopCart)
				.set(ssoVar, 'anonymous')
				.send(datas)
				.expect(200)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.Object();
					should(res.body).have.property('shopcart');
					should(res.body.shopcart).have.property('id');
					should(res.body.shopcart).have.property('name');
					res.body.shopcart.name.should.be.equal('test 002');
					done();
				});

		});

		// delete a shopcart
		it('DELETE /ngeo/shopcarts/:id - delete shopcart', function (done) {

			request(app)
				.delete('/ngeo/shopcarts/' + idShopCart)
				.set(ssoVar, 'anonymous')
				.send()
				.expect(204, done);

		});

		// list shopcart
		it('GET /ngeo/shopcarts - list shopcarts (no item)', function (done) {

			request(app)
				.get('/ngeo/shopcarts')
				.set(ssoVar, 'anonymous')
				.send()
				.expect(200)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.Object();
					should(res.body).have.property('shopcarts');
					should(res.body.shopcarts).be.a.Array();
					res.body.shopcarts.should.have.length(0);
					done();
				});

		});

	});

	describe('Errors for POST /ngeo/shopcarts - create a shopcart', function () {

		it('No shopcart item', function (done) {

			var datas = {
				bidule: {
					name: 'test 001',
					isDefault: false,
					userId: 'anonymous'
				}
			};

			request(app)
				.post('/ngeo/shopcarts')
				.set(ssoVar, 'anonymous')
				.send(datas)
				.expect(400)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.String();
					should(res.body).be.equal('Request is not valid');
					done();
				});

		});

		it('No name for shopcart', function (done) {

			var datas = {
				shopcart: {
					nom: 'test 001',
					isDefault: false,
					userId: 'anonymous'
				}
			};

			request(app)
				.post('/ngeo/shopcarts')
				.set(ssoVar, 'anonymous')
				.send(datas)
				.expect(400)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.String();
					should(res.body).be.equal('Request is not valid');
					done();
				});

		});

		it('Name for shopcart is empty', function (done) {

			var datas = {
				shopcart: {
					name: ' ',
					isDefault: false,
					userId: 'anonymous'
				}
			};

			request(app)
				.post('/ngeo/shopcarts')
				.set(ssoVar, 'anonymous')
				.send(datas)
				.expect(400)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.String();
					should(res.body).be.equal('Request is not valid');
					done();
				});

		});

	});

	describe('Errors for PUT /ngeo/shopcarts/:id - update a shopcart', function () {

		it('No shopcart id in URL', function (done) {

			var datas = {
				shopcart: {
					id: '58c26cd2907fc63264933802',
					name: 'test 002',
					isDefault: false,
					userId: 'anonymous'
				}
			};

			request(app)
				.put('/ngeo/shopcarts/')
				.set(ssoVar, 'anonymous')
				.send(datas)
				.expect(404, done);

		});

		it('No valid shopcart id', function (done) {

			var datas = {
				shopcart: {
					id: '58c26cd2907fc63264933802',
					name: 'test 002',
					isDefault: false,
					userId: 'anonymous'
				}
			};

			request(app)
				.put('/ngeo/shopcarts/45f45r78')
				.set(ssoVar, 'anonymous')
				.send(datas)
				.expect(400)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.String();
					should(res.body).be.equal('Request is not valid');
					done();
				});

		});

		it('No matching shopcart ids', function (done) {

			var datas = {
				shopcart: {
					id: '58c26cd2907fc63264933802',
					name: 'test 002',
					isDefault: false,
					userId: 'anonymous'
				}
			};

			request(app)
				.put('/ngeo/shopcarts/58c26cd2907fc63264933800')
				.set(ssoVar, 'anonymous')
				.send(datas)
				.expect(400)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.String();
					should(res.body).be.equal('Request is not valid');
					done();
				});

		});

	});

});

describe('Route shopCart features', function () {

	var idShopCart = 0;
	var idFeatures = [];

	before(function (done) {
		// if you want to pass parameters before testing
		// create a shopcart
		var datas = {
			shopcart: {
				name: 'test 001',
				isDefault: false,
				userId: 'anonymous'
			}
		};

		request(app)
			.post('/ngeo/shopcarts')
			.set(ssoVar, 'anonymous')
			.send(datas)
			.expect(201)
			.expect('Content-Type', /json/)
			.end(function (err, res) {
				idShopCart = res.body.shopcart.id;
				done();
			});

	});

	/*
	 * Steps on this test
	 * 1 - Create a chopcart
	 * 2 - List shopcart features (empty)
	 * 3 - Add 3 features in a shopcart
	 * 4 - Delete 2 features in a shopcart
	 * 5 - Delete shopcartList
	 * 6 - List shopcarts (empty)
	 * 7 - List shopcart features (empty)
	 */
	describe('Full story (List, Add and Delete)', function () {


		// list shopcart features (empty)
		it('GET /ngeo/shopcarts/:id/items - list features in a shopcart', function (done) {

			request(app)
				.get('/ngeo/shopcarts/' + idShopCart + '/items')
				.set(ssoVar, 'anonymous')
				.send()
				.expect(200)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.Object();
					should(res.body).have.property('type');
					should(res.body.type).be.equal('FeatureCollection');
					should(res.body).have.property('features');
					should(res.body.features).be.a.Array();
					res.body.features.should.have.length(0);
					done();
				});

		});

		// add 3 features in a shopcart
		it('POST /ngeo/shopcarts/:id/items - add features in a shopcart', function (done) {

			var datas = {
				shopcartfeatures: [
					{
						"id": "https://sxcat.eox.at/opensearch/collections/Landsat57Merged/LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C776",
						"type": "Feature",
						"geometry": {
							"type": "Polygon",
							"coordinates": [
								[
									[
										12.4529437154696,
										56.9334436519258
									]
								]
							]
						},
						"properties": {
							"id": "https://sxcat.eox.at/opensearch/collections/Landsat57Merged/LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C776",
							"title": "LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C776",
							"published": "2003-04-24T09:56:54Z",
							"updated": "2015-06-22T13:49:04Z",
							"identifier": "LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C776",
							"date": "2003-04-24T09:56:26Z/2003-04-24T09:56:54Z",
							"shopcart_id": "58bee5f4ff0431114c5e1e40",
							"productUrl": "http://landsat-ds.eo.esa.int/products/LandsatETMCloudFreeCoverage/2003/04/24/LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C776.ZIP"
						}
					},
					{
						"id": "https://sxcat.eox.at/opensearch/collections/Landsat57Merged/LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C778",
						"type": "Feature",
						"geometry": {
							"type": "Polygon",
							"coordinates": [
								[
									[
										12.4529437154696,
										56.9334436519258
									]
								]
							]
						},
						"properties": {
							"id": "https://sxcat.eox.at/opensearch/collections/Landsat57Merged/LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C778",
							"title": "LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C778",
							"published": "2003-04-24T09:56:54Z",
							"updated": "2015-06-22T13:49:04Z",
							"identifier": "LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C778",
							"date": "2003-04-24T09:56:26Z/2003-04-24T09:56:54Z",
							"shopcart_id": "58bee5f4ff0431114c5e1e40",
							"productUrl": "http://landsat-ds.eo.esa.int/products/LandsatETMCloudFreeCoverage/2003/04/24/LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C778.ZIP"
						}
					},
					{
						"id": "https://sxcat.eox.at/opensearch/collections/Landsat57Merged/LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C770",
						"type": "Feature",
						"geometry": {
							"type": "Polygon",
							"coordinates": [
								[
									[
										12.4529437154696,
										56.9334436519258
									]
								]
							]
						},
						"properties": {
							"id": "https://sxcat.eox.at/opensearch/collections/Landsat57Merged/LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C770",
							"title": "LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C770",
							"published": "2003-04-24T09:56:54Z",
							"updated": "2015-06-22T13:49:04Z",
							"identifier": "LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C770",
							"date": "2003-04-24T09:56:26Z/2003-04-24T09:56:54Z",
							"shopcart_id": "58bee5f4ff0431114c5e1e40",
							"productUrl": "http://landsat-ds.eo.esa.int/products/LandsatETMCloudFreeCoverage/2003/04/24/LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C770.ZIP"
						}
					}
				]
			};

			request(app)
				.post('/ngeo/shopcarts/' + idShopCart + '/items')
				.set(ssoVar, 'anonymous')
				.send(datas)
				.expect(201)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.Object();
					should(res.body).have.property('shopcartfeatures');
					should(res.body.shopcartfeatures).be.a.Array();
					for (var n = 0; n < res.body.shopcartfeatures.length; n++) {
						idFeatures.push(res.body.shopcartfeatures[n].id);
					}
					done();
				});

		});

		// delete 2 features in a shopcart
		it('POST /ngeo/shopcarts/:id/items/delete - delete 2 features', function (done) {

			var datas = {
				shopcartfeatures: [
					{
						"id": idFeatures[0],
						"type": "Feature",
						"geometry": {
							"type": "Polygon",
							"coordinates": [
								[
									[
										12.4529437154696,
										56.9334436519258
									]
								]
							]
						},
						"properties": {
							"id": "https://sxcat.eox.at/opensearch/collections/Landsat57Merged/LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C776",
							"title": "LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C776",
							"published": "2003-04-24T09:56:54Z",
							"updated": "2015-06-22T13:49:04Z",
							"identifier": "LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C776",
							"date": "2003-04-24T09:56:26Z/2003-04-24T09:56:54Z",
							"shopcart_id": "58bee5f4ff0431114c5e1e40",
							"productUrl": "http://landsat-ds.eo.esa.int/products/LandsatETMCloudFreeCoverage/2003/04/24/LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C776.ZIP"
						}
					},
					{
						"id": idFeatures[1],
						"type": "Feature",
						"geometry": {
							"type": "Polygon",
							"coordinates": [
								[
									[
										12.4529437154696,
										56.9334436519258
									]
								]
							]
						},
						"properties": {
							"id": "https://sxcat.eox.at/opensearch/collections/Landsat57Merged/LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C778",
							"title": "LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C778",
							"published": "2003-04-24T09:56:54Z",
							"updated": "2015-06-22T13:49:04Z",
							"identifier": "LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C778",
							"date": "2003-04-24T09:56:26Z/2003-04-24T09:56:54Z",
							"shopcart_id": "58bee5f4ff0431114c5e1e40",
							"productUrl": "http://landsat-ds.eo.esa.int/products/LandsatETMCloudFreeCoverage/2003/04/24/LS07_RKSE_ETM_GTC_1P_20030424T095626_20030424T095654_021404_0194_0021_C778.ZIP"
						}
					}
				]
			};

			request(app)
				.post('/ngeo/shopcarts/' + idShopCart + '/items/delete')
				.set(ssoVar, 'anonymous')
				.send(datas)
				.expect(200)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.Object();
					should(res.body).have.property('shopcartfeatures');
					should(res.body.shopcartfeatures).be.a.Array();
					done();
				});

		});
	});

	describe('Delete shopcart... what about features ?', function () {

		// delete a shopcart
		it('DELETE /ngeo/shopcarts/:id - delete shopcart', function (done) {

			request(app)
				.delete('/ngeo/shopcarts/' + idShopCart)
				.set(ssoVar, 'anonymous')
				.send()
				.expect(204, done);

		});

		// list shopcart features (not found)
		it('GET /ngeo/shopcarts/:id/items - list features in a shopcart: not found', function (done) {

			request(app)
				.get('/ngeo/shopcarts/' + idShopCart + '/items')
				.set(ssoVar, 'anonymous')
				.send()
				.expect(404)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.String();
					should(res.body).be.equal('Not found');
					done();
				});

		});
	});

});