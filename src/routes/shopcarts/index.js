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

	let myDB = null;

	try {
		// connect to mongodb
		MongoClient.connect(url, (err,db) => {
			if (err) throw err;
			logger.debug('db connection ok');
			myDB = db;
			// find and return an array
			let myCursor = myDB.collection('ShopCart').find().toArray((errDB, items) => {
				if (errDB) throw errDB;
				logger.debug('find all is done');
				items.forEach((myItem, myIndex) => {
					myItem.id = myItem._id;
				});
				res.json({"shopCartList" : items});
				myDB.close();
			});
		});
	}
	catch(exc) {
		if (myDB!==null) myDB.close();
		res.status(400).send(exc);
	}

});

/**
 * Create a shopcart
 */
router.post('/', (req,res) => {

	logger.debug('ShopCart create is calling');

	if (!checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	let myDB = null;

	try {
		// connect to mongodb
		MongoClient.connect(url, (errConnect, db) => {
			if (errConnect) throw errConnect;
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
			// findOne shopcart with that name for this user
			myDB.collection('ShopCart').findOne(myQuery, (errFind, resultFind) => {
				if (errFind) throw errFind;
				logger.debug('findOne is done.');
				if (resultFind) {
					res.status(400).json('This shopcart already exists.');
				} else {
					// insert shopcart
					myDB.collection('ShopCart').insertOne(req.body.createShopcart.shopcart, (errInsert, resultInsert) => {
						if (errInsert) throw errInsert;
						logger.debug('insertOne is done.');
						myDB.close();
						let idCreated = resultInsert.insertedId;
						res.setHeader('Location', '/ngeo/shopcarts/' + idCreated)
						res.status(201).json(idCreated);
					})
				}
			});
		});
	}
	catch(exc) {
		if (myDB!==null) myDB.close();
		res.status(400).send(exc);
	}
	
});

/**
 * Update a shopcart
 */
router.put('/:shopcart_id', (req,res) => {

	logger.debug('ShopCart update is calling');

	if (!checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	let myDB = null;
	let idToUpdate = req.params.shopcart_id;

	try {
		// connect to mongodb
		MongoClient.connect(url, (errConnect, db) => {
			if (errConnect) throw errConnect;
			logger.debug('db connection ok');
			myDB = db;
			let myQuery = {
				"_id": {
					$ne: ObjectId(idToUpdate)
				},
				"name": {
					$eq: req.body.createShopcart.shopcart.name
				},
				"userId": {
					$eq : req.body.createShopcart.shopcart.userId
				}
			};
			// findOne shopcart with this name and userId but another id !
			myDB.collection('ShopCart').findOne(myQuery, (errFind, resultFind) => {
				if (errFind) throw errFind;
				if (resultFind) {
					res.status(400).json('ShopCart with this name already exists for another shopcart !');
				} else {
					// update if not found
					let myFilter = {
						"_id": ObjectId(idToUpdate)
					};
					let myUpdate = {
						$set: {
							"name": req.body.createShopcart.shopcart.name,
							"isDefault": req.body.createShopcart.shopcart.isDefault
						}
					};
					myDB.collection('ShopCart').updateOne(myFilter, myUpdate, (errUpdate, resultUpdate) => {
						if (errUpdate) throw errUpdate;
						myDB.close();
						if (resultUpdate.modifiedCount === 0) {
							res.status(404).json('Not found !');
						} else if (resultUpdate.modifiedCount === 1) {
							res.json('updated');
						} else {
							throw 'ShopCart id is not unique !';
						}
					});
				}
			});
		})
	}
	catch(exc) {
		if (myDB!==null) myDB.close();
		res.status(400).send(exc);
	}
	
});

/**
 * Delete a shopcart
 */
router.delete('/:shopcart_id', (req,res) => {

	logger.debug('ShopCart delete is calling');

	if (!checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	let myDB = null;
	let idToDelete = req.params.shopcart_id;

	logger.debug('id = ' + idToDelete);

	try {
		// connect to mongodb
		MongoClient.connect(url, (errConnect, db) => {
			if (errConnect) throw errConnect;
			logger.debug('db connection ok');
			myDB = db;
			let myFilter = {
				"_id": ObjectId(idToDelete)
			};
			// deleteOne shopcart with that id
			myDB.collection('ShopCart').deleteOne(myFilter, (errDelete, resultDelete) => {
				if (errDelete) throw errDelete;
				myDB.close();
				if (resultDelete.deletedCount === 0) {
					res.status(404).json('Not found !');
				} else if (resultDelete.deletedCount === 1) {
					logger.debug('204 - delete ok for ' + idToDelete);
					res.status(204).send();
				} else {
					throw 'ShopCart id is not unique !';
				}
			});
			
		})
	}
	catch (exc) {
		if (myDB!==null) myDB.close();
		res.status(400).send(exc);
	}

});

function checkRequest(request) {
	// only for put and post methods
	if ((request.method === 'POST') || (request.method==='PUT')) {
		if (!request.body.createShopcart) {
			return false;
		}
		if (!request.body.createShopcart.shopcart) {
			return false;
		}
		if (!request.body.createShopcart.shopcart.name) {
			return false;
		}
		if (request.body.createShopcart.shopcart.name==='') {
			return false;
		}
	}
	// only for put and delete methods, check param id
	if (((request.method === 'PUT') || (request.method === 'DELETE')) && !(request.params.shopcart_id)) {
		return false;
	}
	// only for put and delete methods, check param id if 12 bytes
	let patt = new RegExp(/^[a-fA-F0-9]{24}$/);
	if (((request.method === 'PUT') || (request.method === 'DELETE')) && (!patt.test(request.params.shopcart_id))) {
		return false;
	}

	return true;
}


module.exports = router;