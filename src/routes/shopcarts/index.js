let express = require('express');
let logger = require('utils/logger');
let Configuration = require('../../config');
let DatabaseService = require('services/databaseService');
let MongoClient = require('mongodb').MongoClient;
let ObjectId = require('mongodb').ObjectID;

let url = Configuration.database.connection.url;

let router = express.Router({
	mergeParams: true
});

router.use(function timeLog(req, res, next) {
	next(); // make sure we go to the next routes and don't stop here
});

/**
 * List shopcarts
 *
 * @function router.get
 * @param url - /ngeo/shopcarts/
 * @param req - empty
 * @param res - response
 */
router.get('/', (req, res) => {

	logger.debug('ShopCart list is calling');

	// define call back function after lsiting shopcarts
	// send response
	let cbGetList = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			res.json({"shopCartList" : response.datas});
		}
	}

	// call list service
	DatabaseService.list('ShopCart', cbGetList);

});

/**
 * Create a shopcart
 *
 * @function router.post
 * @param url - /ngeo/shopcarts/
 * @param req - request {createShopcart:{shocpart:{name,userId,isDefault}}}
 * @param res - response
 */
router.post('/', (req,res) => {

	logger.debug('ShopCart create is calling');

	// check if request is valid
	if (!checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	// define call back function after creating shop cart
	// send response
	let cbCreateShopCart = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			res.setHeader('Location', '/ngeo/shopcarts/' + response.datas.id)
			res.status(201).json({"createShopcart" : {"shopcart": response.datas } });
		}
	};

	// define insertedItem
	let myInsertItem = req.body.createShopcart.shopcart;

	// define query to find if item is already in database
	let myQueryItemAlreadyExists = {
		name: {
			$eq: myInsertItem.name
		},
		userId: {
			$eq : myInsertItem.userId
		}
	};

	// call create service for database
	DatabaseService.create('ShopCart', myInsertItem, myQueryItemAlreadyExists, cbCreateShopCart);
	
});

/**
 * Update a shopcart
 *
 * @function router.put
 * @param url - /ngeo/shopcarts/id
 * @param req - request {createShopcart:{shocpart:{_id,id,name,userId,isDefault}}}
 * @param res - response
 */
router.put('/:shopcart_id', (req,res) => {

	logger.debug('ShopCart update is calling');

	// check if request is valid
	if (!checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	// updating item
	let myUpdateItem = req.body.createShopcart.shopcart;

	// define query if item already exists
	let myQueryItemAlreadyExists = {
		"_id": {
			$ne: ObjectId(myUpdateItem._id)
		},
		"name": {
			$eq: myUpdateItem.name
		},
		"userId": {
			$eq : myUpdateItem.userId
		}
	};

	// define update query
	let myQueryUpdate = {
		$set: {
			"name": myUpdateItem.name,
			"isDefault": myUpdateItem.isDefault
		}
	};

	// define callback function after updating shopcart
	let cbUpdateShopCart = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			res.json({"createShopcart" : {"shopcart": response.datas } });
		}
	};
					
	// call update service
	DatabaseService.update('ShopCart', myUpdateItem, myQueryItemAlreadyExists, myQueryUpdate, cbUpdateShopCart);
	
});

/**
 * Delete a shopcart
 */
router.delete('/:shopcart_id', (req,res) => {

	logger.debug('ShopCart delete is calling');

	// check if request is valid
	if (!checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	let idToDelete = req.params.shopcart_id;

	// define callback function after deleting shopcart
	let cbDeleteShopCart = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			res.status(204).send();
		}
	};
					
	// call delete service
	DatabaseService.delete('ShopCart', idToDelete, cbDeleteShopCart);

});

/**
 * Get features for a shopcart
 */
router.get('/:shopcart_id/search', (req,res) => {

	logger.debug('ShopCart search features is calling');

	if (!checkRequestFeatures(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	let idShopCart = req.params.shopcart_id;
	let start = +req.params.startIndex - 1;
	let count = +req.params.count;

	let allFeatures = [];

	let myQueryCriteria = {
		"shopcart_id": {
			$eq: idShopCart
		}
	};

	let cbCountFeaturesInShopCart = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			res.json({
				"features" : allFeatures,
				"properties": {
					"id": 'http://',
					"totalResults": response.datas,
					"startIndex": (start+1),
					"itemsPerPage": count,
					"updated": new Date().toISOString()
				}
			});
		}
	};

	let cbSearchFeaturesInShopCart = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			allFeatures = response.datas;
			DatabaseService.count('Feature', myQueryCriteria, cbCountFeaturesInShopCart)
		}
	};

	// call search service
	DatabaseService.search('Feature', myQueryCriteria, start, count, cbSearchFeaturesInShopCart);

});


/**
 * Post features on a shopcart
 */
router.post('/:shopcart_id/items', (req,res) => {

	logger.debug('ShopCart add feature is calling');

	if (!checkRequestFeatures(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	let idShopCart = req.params.shopcart_id;

	let myInsertFeatures = req.body.body.shopCartItemAdding;
	let maxItems = 0;

	let cbCreateFeatureInShopCart = function(response) {
		if (response.code !== 0) {

		} else {
			maxItems++;
			if (myInsertFeatures.length === maxItems) {
				logger.info('All is done !');
				res.status(201).json('');
			}
		}
	};

	myInsertFeatures.forEach((item, index) => {
		item.shopcart_id = idShopCart;
		DatabaseService.create('Feature', item, myQueryItemAlreadyExists, cbCreateFeatureInShopCart);
	});

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
	if ((request.method === 'PUT') && (req.body.createShopcart.shopcart.id != req.params.id)) {
		return false;
	}

	return true;
}

// check request for features on shopcart
function checkRequestFeatures(request) {
	if (request.method==='POST') {
		if (!request.params.shopcart_id) {
			return false;
		}
		if (!checkParamId(request.params.shopcart_id)) {
			return false;
		}
		if (!request.body.shopCartItemAdding) {
			return false;
		}
		if (request.body.shopCartItemAdding.constructor !== Array) {
			return false;
		}
	}
	return true;
}

// check if param id is a string with 12 bytes
// @return true or false
function checkParamId(sId) {
	let patt = new RegExp(/^[a-fA-F0-9]{24}$/);
	return patt.test(sId);
}


module.exports = router;