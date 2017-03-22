/**
 * Unit test file for service web Shopcarts
 * It allow to test the REST service and the mongodb database
 */
let should = require('should');
let assert = require('assert');
let request = require("supertest");

let app = require('../../app');

describe('REST ShopCarts', function() {

	before(function(done) {
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
	describe('ShopCarts', function () {

		var idShopCart = 0;

		// create a shopcart
		it('POST /ngeo/shopcarts - Create a shopcart', function(done) {

			var datas = {
				createShopcart: {
					shopcart: {
						name: 'test 001',
						isDefault: false,
						userId: 'anonymous'
					}
				}
			}

			request(app)
			.post('/ngeo/shopcarts')
			.send(datas)
			.expect(201)
			.expect('Content-Type', /json/)
			.end(function(err,res) {
				should(res.body).be.a.Object();
				should(res.body).have.property('createShopcart');
				should(res.body.createShopcart).have.property('shopcart');
				should(res.body.createShopcart.shopcart).have.property('_id');
				idShopCart = res.body.createShopcart.shopcart._id;
				should(res.body.createShopcart.shopcart).have.property('name');
				done();
			});

		});

		// list shopcart
		it('GET /ngeo/shopcarts - list shopcarts (1 item)', function(done) {

			request(app)
			.get('/ngeo/shopcarts')
			.send()
			.expect(200)
			.expect('Content-Type', /json/)
			.end(function(err,res) {
				should(res.body).be.a.Object();
				should(res.body).have.property('shopCartList');
				should(res.body.shopCartList).be.a.Array();
				res.body.shopCartList.should.have.length(1);
				res.body.shopCartList[0]._id.should.be.equal(idShopCart);
				done();
			});

		});

		// update a shopcart
		it('PUT /ngeo/shopcarts/:id - update shopcart', function(done) {

			var datas = {
				createShopcart: {
					shopcart: {
						_id: idShopCart,
						id: idShopCart,
						name: 'test 002',
						isDefault: false,
						userId: 'anonymous'
					}
				}
			}
			
			request(app)
			.put('/ngeo/shopcarts/' + idShopCart)
			.send(datas)
			.expect(200)
			.expect('Content-Type', /json/)
			.end(function(err,res) {
				should(res.body).be.a.Object();
				should(res.body).have.property('createShopcart');
				should(res.body.createShopcart).have.property('shopcart');
				should(res.body.createShopcart.shopcart).have.property('_id');
				should(res.body.createShopcart.shopcart).have.property('name');
				res.body.createShopcart.shopcart.name.should.be.equal('test 002');
				done();
			});

		});

		// delete a shopcart
		it('DELETE /ngeo/shopcarts/:id - delete shopcart', function(done) {

			request(app)
			.delete('/ngeo/shopcarts/' + idShopCart)
			.send()
			.expect(204, done);

		});

		// list shopcart
		it('GET /ngeo/shopcarts - list shopcarts (no item)', function(done) {

			request(app)
			.get('/ngeo/shopcarts')
			.send()
			.expect(200)
			.expect('Content-Type', /json/)
			.end(function(err,res) {
				should(res.body).be.a.Object();
				should(res.body).have.property('shopCartList');
				should(res.body.shopCartList).be.a.Array();
				res.body.shopCartList.should.have.length(0);
				done();
			});

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
	describe('Features in ShopCart', function () {

		var idShopCart = 0;
		var idFeatures = [];

		// create a shopcart
		it('POST /ngeo/shopcarts - create a shopcart', function(done) {

			var datas = {
				createShopcart: {
					shopcart: {
						name: 'test 001',
						isDefault: false,
						userId: 'anonymous'
					}
				}
			}

			request(app)
			.post('/ngeo/shopcarts')
			.send(datas)
			.expect(201)
			.expect('Content-Type', /json/)
			.end(function(err,res) {
				should(res.body).be.a.Object();
				should(res.body).have.property('createShopcart');
				should(res.body.createShopcart).have.property('shopcart');
				should(res.body.createShopcart.shopcart).have.property('_id');
				idShopCart = res.body.createShopcart.shopcart._id;
				should(res.body.createShopcart.shopcart).have.property('name');
				done();
			});

		});

		// list shopcart features (empty)
		it('GET /ngeo/shopcarts/:id/items - list features in a shopcart', function(done) {

			request(app)
			.get('/ngeo/shopcarts/' + idShopCart + '/items')
			.send()
			.expect(200)
			.expect('Content-Type', /json/)
			.end(function(err,res) {
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
		it('POST /ngeo/shopcarts/:id/items - add features in a shopcart', function(done) {

			var datas = {
				shopCartItemAdding: [
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
			.send(datas)
			.expect(201)
			.expect('Content-Type', /json/)
			.end(function(err,res) {
				should(res.body).be.a.Object();
				should(res.body).have.property('shopCartItemAdding');
				should(res.body.shopCartItemAdding).be.a.Array();
				for (var n=0; n<res.body.shopCartItemAdding.length; n++) {
					idFeatures.push(res.body.shopCartItemAdding[n].id);
				}
				done();
			});

		});

		// delete 2 features in a shopcart
		it('POST /ngeo/shopcarts/:id/items/delete - delete 2 features', function(done) {

			var datas = {
				shopCartItemRemoving: [
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
			.send(datas)
			.expect(200)
			.expect('Content-Type', /json/)
			.end(function(err,res) {
				should(res.body).be.a.Object();
				should(res.body).have.property('shopCartItemRemoving');
				should(res.body.shopCartItemRemoving).be.a.Array();
				done();
			});

		});

		// delete a shopcart
		it('DELETE /ngeo/shopcarts/:id - delete shopcart', function(done) {

			request(app)
			.delete('/ngeo/shopcarts/' + idShopCart)
			.send()
			.expect(204, done);

		});

		// list shopcart
		it('GET /ngeo/shopcarts - list shopcarts (no item)', function(done) {

			request(app)
			.get('/ngeo/shopcarts')
			.send()
			.expect(200)
			.expect('Content-Type', /json/)
			.end(function(err,res) {
				should(res.body).be.a.Object();
				should(res.body).have.property('shopCartList');
				should(res.body.shopCartList).be.a.Array();
				res.body.shopCartList.should.have.length(0);
				done();
			});

		});

		// list shopcart features (empty)
		it('GET /ngeo/shopcarts/:id/items - list features in a shopcart', function(done) {

			request(app)
			.get('/ngeo/shopcarts/' + idShopCart + '/items')
			.send()
			.expect(200)
			.expect('Content-Type', /json/)
			.end(function(err,res) {
				should(res.body).be.a.Object();
				should(res.body).have.property('type');
				should(res.body.type).be.equal('FeatureCollection');
				should(res.body).have.property('features');
				should(res.body.features).be.a.Array();
				res.body.features.should.have.length(0);
				done();
			});

		});
	});

	describe('ShopCarts - Catch errors', function() {

		describe('POST /ngeo/shopcarts - create a shopcart', function() {

			it('No create shopcart action', function(done) {

				var datas = {
					creatShopcart: {
						shopcart: {
							name: 'test 001',
							isDefault: false,
							userId: 'anonymous'
						}
					}
				}

				request(app)
				.post('/ngeo/shopcarts')
				.send(datas)
				.expect(400)
				.expect('Content-Type', /json/)
				.end(function(err,res) {
					should(res.body).be.a.String();
					should(res.body).be.equal('Request is not valid');
					done();
				});

			});

			it('No shopcart item', function(done) {

				var datas = {
					createShopcart: {
						bidule: {
							name: 'test 001',
							isDefault: false,
							userId: 'anonymous'
						}
					}
				}

				request(app)
				.post('/ngeo/shopcarts')
				.send(datas)
				.expect(400)
				.expect('Content-Type', /json/)
				.end(function(err,res) {
					should(res.body).be.a.String();
					should(res.body).be.equal('Request is not valid');
					done();
				});

			});

			it('No name for shopcart', function(done) {

				var datas = {
					createShopcart: {
						shopcart: {
							nom: 'test 001',
							isDefault: false,
							userId: 'anonymous'
						}
					}
				}

				request(app)
				.post('/ngeo/shopcarts')
				.send(datas)
				.expect(400)
				.expect('Content-Type', /json/)
				.end(function(err,res) {
					should(res.body).be.a.String();
					should(res.body).be.equal('Request is not valid');
					done();
				});

			});

			it('Name for shopcart is empty', function(done) {

				var datas = {
					createShopcart: {
						shopcart: {
							name: ' ',
							isDefault: false,
							userId: 'anonymous'
						}
					}
				}

				request(app)
				.post('/ngeo/shopcarts')
				.send(datas)
				.expect(400)
				.expect('Content-Type', /json/)
				.end(function(err,res) {
					should(res.body).be.a.String();
					should(res.body).be.equal('Request is not valid');
					done();
				});

			});

		});

		describe('PUT /ngeo/shopcarts/:id - update a shopcart', function() {

			it('No shopcart id', function(done) {

				var datas = {
					createShopcart: {
						shopcart: {
							_id: '58c26cd2907fc63264933802',
							id: '58c26cd2907fc63264933802',
							name: 'test 002',
							isDefault: false,
							userId: 'anonymous'
						}
					}
				}
				
				request(app)
				.put('/ngeo/shopcarts/')
				.send(datas)
				.expect(404, done);

			});

			it('No valid shopcart id', function(done) {

				var datas = {
					createShopcart: {
						shopcart: {
							_id: '58c26cd2907fc63264933802',
							id: '58c26cd2907fc63264933802',
							name: 'test 002',
							isDefault: false,
							userId: 'anonymous'
						}
					}
				}
				
				request(app)
				.put('/ngeo/shopcarts/45f45r78')
				.send(datas)
				.expect(400)
				.expect('Content-Type', /json/)
				.end(function(err,res) {
					should(res.body).be.a.String();
					should(res.body).be.equal('Request is not valid');
					done();
				});

			});

			it('No matching shopcart ids', function(done) {

				var datas = {
					createShopcart: {
						shopcart: {
							_id: '58c26cd2907fc63264933802',
							id: '58c26cd2907fc63264933802',
							name: 'test 002',
							isDefault: false,
							userId: 'anonymous'
						}
					}
				}

				request(app)
				.put('/ngeo/shopcarts/58c26cd2907fc63264933800')
				.send(datas)
				.expect(400)
				.expect('Content-Type', /json/)
				.end(function(err,res) {
					should(res.body).be.a.String();
					should(res.body).be.equal('Request is not valid');
					done();
				});

			});

		});
	});

});