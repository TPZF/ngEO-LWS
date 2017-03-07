let express = require('express');
let logger = require('utils/logger');
//let _ = require('lodash');

let Configuration = require('../../config');

let MongoClient = require('mongodb').MongoClient;
let ObjectId = require('mongodb').ObjectID;

let url = Configuration.urlDataBase;

let router = express.Router({
	mergeParams: true
});

router.use(function timeLog(req, res, next) {
	next(); // make sure we go to the next routes and don't stop here
});

/**
 * List
 */
router.get('/', (req, res) => {

	logger.debug('ShopCart list is calling');

	MongoClient.connect(url, (err,db) => {
		if (err) {
			res.send(err);
		}
		let myCursor = db.collection('ShopCart').find().toArray((errDB, items) => {
			if (errDB) {
				res.send(errDB);
			}
			res.json({"shopCartList" : items});
			db.close();
		});

	});

});

/**
 * Create a shopcart
 */
router.post('/', (req,res) => {

	logger.debug('ShopCart create is calling');

	let myDB = null;

	if (!req.params.id && !req.body.id && req.body.createShopcart && req.body.createShopcart.shopcart && req.body.createShopcart.shopcart.name != "") {

		MongoClient
		.connect(url)
		.then((db) => {
			logger.debug('db connection ok');
			myDB = db;
			let myQuery = {
				name: {
					$eq: req.body.createShopcart.shopcart.name
				},
				userId: {
					$eq : req.body.createShopcart.shopcart.userId
				}
			};
			return myDB.collection('ShopCart').findOne(myQuery);
		}).then((respFindOne) => {
			logger.debug('find ok');
			if (respFindOne) {
				return Promise.reject({status: 100, data: null, message: 'This shopcart already exists...'});
			}
			return myDB.collection('ShopCart').insertOne(req.body.createShopcart.shopcart);
		})
		.then((resp) => {
			if (myDB) {
				myDB.close();
			}
			let idCreated = resp.insertedId;
			res.setHeader('Location', '/ngeo/shopcarts/' + idCreated)
			res.status(201).json(idCreated);
		})
		.catch((err) => {
			logger.debug('Oups! error !');
			logger.debug(err);
			if (myDB) {
				myDB.close();
			}
			if (err.status) {
				res.status(400).json(err.message);
			} else {
				res.send(400).json(
					{
						"status": 400,
						"data": null,
						"message": "Request is not valid"
					}
				);
			}
		});

	} else {
		res.status(400).json(
			{
				"status": 400,
				"data": null,
				"message": "Request is not valid"
			}
		);
	}
	
});

/**
 * Update a shopcart
 */
router.put('/:shopcart_id', (req,res) => {

	logger.debug('ShopCart update is calling');

	let myDB = null;

	if (req.params.shopcart_id && !req.body.id && req.body.createShopcart && req.body.createShopcart.shopcart && req.body.createShopcart.shopcart.name != "") {

		MongoClient
		// connection
		.connect(url)
		// find a shopcart with this name on another shopcart
		.then((db) => {
			logger.debug('db connection ok');
			myDB = db;
			let myQuery = {
				"_id": {
					$ne: ObjectId(req.params.shopcart_id)
				},
				"name": {
					$eq: req.body.createShopcart.shopcart.name
				},
				"userId": {
					$eq : req.body.createShopcart.shopcart.userId
				}
			};
			return myDB.collection('ShopCart').findOne(myQuery);
		})
		// update if not found
		.then((respFindOne) => {
			if (respFindOne) {
				return Promise.reject('ShopCart with this name already exists for another shopcart !');
			}
			let myFilter = {
				"_id": ObjectId(req.params.shopcart_id)
			};
			let myUpdate = {
				$set: {
					"name": req.body.createShopcart.shopcart.name,
					"isDefault": req.body.createShopcart.shopcart.isDefault
				}
			};
			return myDB.collection('ShopCart').updateOne(myFilter, myUpdate);
		})
		// send response
		.then((resp) => {
			logger.debug('update ok');
			if (myDB) {
				myDB.close();
			}
			res.send({message: 'ShopCart updated !'});
		})
		// send error
		.catch((err) => {
			logger.debug('Oups! error !');
			if (myDB) {
				myDB.close();
			}
			res.send(err);
		});

	} else {
		res.send({"message": "Datas not expected..."});
	}
	
});

/**
 * Delete a shopcart
 */
router.delete('/:shopcart_id', (req,res) => {

	logger.debug('ShopCart delete is calling');

	let myDB = null;
	let idToDelete = req.params.shopcart_id;

	if (idToDelete) {

		logger.debug('id = ' + idToDelete);

		MongoClient
		// connection
		.connect(url)
		// find a shopcart with this name on another shopcart
		.then((db) => {
			logger.debug('db connection ok');
			myDB = db;
			let myFilter = {
				"_id": ObjectId(idToDelete)
			};
			return myDB.collection('ShopCart').deleteOne(myFilter);
		})
		// send response
		.then((resp) => {
			if (myDB) {
				myDB.close();
			}
			if (resp.deletedCount === 0) {
				res.status(404).json('Not found !');
			} else if (resp.deletedCount === 1) {
				logger.debug('204 - delete ok for ' + idToDelete);
				res.status(204);
			}
		})
		// send error
		.catch((err) => {
			logger.debug('Oups! error !');
			if (myDB) {
				myDB.close();
			}
			res.status(400).json({"message": err});
		});

	} else {
		res.send({"message": "Datas not expected..."});
	}
	
});


module.exports = router;