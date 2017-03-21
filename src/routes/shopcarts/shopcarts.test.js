/**
 * Unit test file for service web Shopcarts
 * It allow to test the REST service and the mongodb database
 * 1 - Create
 * 2 - List
 * 3 - Update
 * 4 - Delete
 * 5 - List (empty)
 */
let should = require('should');
let assert = require('assert');
let request = require("supertest");

let app = require('../../app');

describe('Web services', function() {

	before(function(done) {
		// if you want to pass parameters before testing
		done();
	});

	describe('ShopCarts', function () {

		var idShopCart = 0;

		// create a shopcart
		it('/POST shopcarts', function(done) {

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
				if (err) throw err;
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
		it('/GET shopcarts (1 item)', function(done) {

			request(app)
			.get('/ngeo/shopcarts')
			.send()
			.expect(200)
			.expect('Content-Type', /json/)
			.end(function(err,res) {
				if (err) throw err;
				should(res.body).be.a.Object();
				should(res.body).have.property('shopCartList');
				should(res.body.shopCartList).be.a.Array();
				res.body.shopCartList.should.have.length(1);
				res.body.shopCartList[0]._id.should.be.equal(idShopCart);
				done();
			});

		});

		// update a shopcart
		it('/PUT shopcarts', function(done) {

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
				if (err) throw err;
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
		it('/DELETE shopcarts', function(done) {

			request(app)
			.delete('/ngeo/shopcarts/' + idShopCart)
			.send()
			.expect(204)
			.end(function(err,res) {
				if (err) throw err;
				done();
			});

		});

		// list shopcart
		it('/GET shopcarts (no item)', function(done) {

			request(app)
			.get('/ngeo/shopcarts')
			.send()
			.expect(200)
			.expect('Content-Type', /json/)
			.end(function(err,res) {
				if (err) throw err;
				should(res.body).be.a.Object();
				should(res.body).have.property('shopCartList');
				should(res.body.shopCartList).be.a.Array();
				res.body.shopCartList.should.have.length(0);
				done();
			});

		});

	});

});