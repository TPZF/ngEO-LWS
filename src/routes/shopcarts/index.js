// CORE
let express = require('express');
let _ = require('lodash');
let MongoClient = require('mongodb').MongoClient;
let ObjectId = require('mongodb').ObjectID;

// UTILS
let Logger = require('utils/logger');

// SERVICES
let DatabaseService = require('services/databaseService');

// CONST
let SHOPCARTNAME = 'ShopCart';
let SHOPCARTFEATURENAME = 'ShopCartFeature';

/**
 * check request inputs (method, params, values, ...)
 * @function _checkRequest
 * @param request
 * @return boolean
 * @private
 */
function _checkRequest(request) {
	// only for put and post methods
	if ((request.method === 'POST') || (request.method==='PUT')) {
		if (!request.body.shopcart) {
			Logger.debug('no shopcart item');
			return false;
		}
		if (!request.body.shopcart.name) {
			Logger.debug('no name for shopcart');
			return false;
		}
		if (request.body.shopcart.name.trim()==='') {
			Logger.debug('name for shopcart is empty');
			return false;
		}
	}
	// only for put and delete methods, check param id if 12 bytes
	if (((request.method === 'PUT') || (request.method === 'DELETE')) && (!DatabaseService.checkParamId(request.params.shopcart_id))) {
		Logger.debug('no valid shopcart id');
		return false;
	}
	// only for put method, check param id in uri and in datas
	if ((request.method === 'PUT') && (request.body.shopcart.id != request.params.shopcart_id)) {
		Logger.debug('no matching shopcart ids');
		return false;
	}

	return true;
}

/**
 * check request inputs (method, params, values, ...) for features on shopcart
 * @function _checkRequestFeatures
 * @param request
 * @return boolean
 * @private
 */
function _checkRequestFeatures(request) {
	if (request.method==='POST') {
		if (!request.params.shopcart_id) {
			Logger.debug('no shopcart id');
			return false;
		}
		if (!DatabaseService.checkParamId(request.params.shopcart_id)) {
			Logger.debug('no valid shopcart id');
			return false;
		}
		if (request.originalUrl.lastIndexOf('/delete') < 0 && !request.body.shopcartfeatures) {
			Logger.debug('no shopcartfeatures action');
			return false;
		}
		if (request.originalUrl.lastIndexOf('/delete') < 0 && request.body.shopcartfeatures.constructor !== Array) {
			Logger.debug('no array in shopcartfeatures');
			return false;
		}
		if (request.originalUrl.lastIndexOf('/delete') >= 0 && !request.body.shopcartfeatures) {
			Logger.debug('no shopcartfeatures action');
			return false;
		}
		if (request.originalUrl.lastIndexOf('/delete') >= 0 && request.body.shopcartfeatures.constructor !== Array) {
			Logger.debug('no array in shopcartfeatures');
			return false;
		}
	}
	return true;
}

/**
 * Define router
 */
let router = express.Router({
	mergeParams: true
});

router.use(function timeLog(req, res, next) {
	next(); // make sure we go to the next routes and don't stop here
});

// ======================================================================
//		SHOP CART
// ======================================================================
/**
 * List shopcarts
 *
 * @function router.get
 * @param url - /ngeo/shopcarts/
 * @param req - empty
 * @param res - response
 */
router.get('/', (req, res) => {

	Logger.debug('ShopCart list is calling');

	// define call back function after lsiting shopcarts
	// send response
	let cbGetList = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			_.map(response.datas, function(item) {
				delete item._id;
			});
			res.json({"shopcarts" : response.datas});
		}
	}

	// call list service
	DatabaseService.list(SHOPCARTNAME, cbGetList);

});

/**
 * Create a shopcart
 *
 * @function router.post
 * @param url - /ngeo/shopcarts/
 * @param req - request {shocpart:{name,userId,isDefault}}
 * @param res - response
 */
router.post('/', (req,res) => {

	Logger.debug('ShopCart create is calling');

	// check if request is valid
	if (!_checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	// define call back function after creating shop cart
	// send response
	let cbCreateShopCart = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			delete response.datas._id;
			res.setHeader('Location', '/ngeo/shopcarts/' + response.datas.id)
			res.status(201).json({"shopcart": response.datas });
		}
	};

	// define insertedItem
	let myInsertItem = req.body.shopcart;

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
	DatabaseService.create(SHOPCARTNAME, myInsertItem, myQueryItemAlreadyExists, cbCreateShopCart);
	
});

/**
 * Update a shopcart
 *
 * @function router.put
 * @param url - /ngeo/shopcarts/id
 * @param req - request {shopcart:{_id,id,name,userId,isDefault}}
 * @param res - response
 */
router.put('/:shopcart_id', (req,res) => {

	Logger.debug('ShopCart update is calling');

	// check if request is valid
	if (!_checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	// updating item
	let myUpdateItem = req.body.shopcart;
	myUpdateItem._id = myUpdateItem.id;

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
			delete response.datas._id;
			res.status(200).json({"shopcart": response.datas });
		}
	};
					
	// call update service
	DatabaseService.update(SHOPCARTNAME, myUpdateItem, myQueryItemAlreadyExists, myQueryUpdate, cbUpdateShopCart);
	
});

/**
 * Delete a shopcart
 */
router.delete('/:shopcart_id', (req,res) => {

	Logger.debug('ShopCart delete is calling');

	// check if request is valid
	if (!_checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	let idToDelete = req.params.shopcart_id;

	// define callback function after deleting all features in shopcart
	let cbDeleteAllFeaturesInShopCart = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			res.status(204).send();
		}
	};

	// define callback function after deleting shopcart
	let cbDeleteShopCart = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			// delete cascade features link to this shopcart
			let myQueryDelete = {
				"properties.shopcart_id": idToDelete
			};
			DatabaseService.deleteCascade(SHOPCARTFEATURENAME, myQueryDelete, cbDeleteAllFeaturesInShopCart);
		}
	};
					
	// call delete service
	DatabaseService.delete(SHOPCARTNAME, idToDelete, cbDeleteShopCart);

});

// ======================================================================
//		SHOP CART FEATURES
// ======================================================================
/**
 * Get features for a shopcart
 */
router.get('/:shopcart_id/items', (req,res) => {

	Logger.debug('ShopCart search features is calling');

	if (!_checkRequestFeatures(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	let idShopCart = req.params.shopcart_id;
	let start = +req.params.startIndex - 1;
	let count = +req.params.count;

	let myQueryCriteria = {
		"properties.shopcart_id": idShopCart
	};

	let cbSearchFeaturesInShopCart = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			_.map(response.datas, function(item) {
				delete item._id;
			});
			res.json({
				"type": "FeatureCollection",
				"features" : response.datas
			});
		}
	};

	// call search service
	DatabaseService.search(SHOPCARTFEATURENAME, myQueryCriteria, start, count, cbSearchFeaturesInShopCart);

});

/**
 * Create features on a shopcart
 */
router.post('/:shopcart_id/items', (req,res) => {

	Logger.debug('ShopCart add feature is calling');

	if (!_checkRequestFeatures(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	let idShopCart = req.params.shopcart_id;

	let myInsertFeatures = req.body.shopcartfeatures;
	let maxItems = 0;
	let myNewInsertFeatures = [];

	let cbCreateFeatureInShopCart = function(response) {
		if (response.code === 0) {
			delete response.datas._id;
			myNewInsertFeatures.push(response.datas);
		}
		maxItems++;
		if (myInsertFeatures.length === maxItems) {
			Logger.debug('All is done !');
			res.status(201).json({"shopcartfeatures": myNewInsertFeatures});
		}
	};

	if (myInsertFeatures.length == 0) {
		res.status(200).json({"shopcartfeatures": []});
		return;
	}

	myInsertFeatures.forEach((item, index) => {
		item.properties.shopcart_id = idShopCart;

		// define query to find if item is already in database
		let myQueryItemAlreadyExists = {
			"properties.productUrl": item.properties.productUrl,
			"properties.shopcart_id": item.properties.shopcart_id
		};

		DatabaseService.create(SHOPCARTFEATURENAME, item, myQueryItemAlreadyExists, cbCreateFeatureInShopCart);
	});

});

/**
 * Delete features for a shopcart
 */
router.post('/:shopcart_id/items/delete', (req,res) => {

	Logger.debug('ShopCart delete features is calling');

	if (!_checkRequestFeatures(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	let idShopCart = req.params.shopcart_id;
	let myNewDeletedFeatures = [];
	let myDeletedFeatures = req.body.shopcartfeatures;
	let maxItems = 0;

	let cbDeleteFeatureInShopCart = function(response) {
		if (response.code === 0) {
			myNewDeletedFeatures.push(_.find(myDeletedFeatures, function(elem) {
				return elem.id==response.datas;
			}));
		}
		maxItems++;
		if (myDeletedFeatures.length === maxItems) {
			Logger.info('All is done !');
			res.status(200).json({"shopcartfeatures": myNewDeletedFeatures});
		}
	};

	if (myDeletedFeatures.length == 0) {
		res.status(200).json({"shopcartfeatures":[]});
		return;
	}

	myDeletedFeatures.forEach((item, index) => {
		DatabaseService.delete(SHOPCARTFEATURENAME, item.id, cbDeleteFeatureInShopCart);
	});

});

/**
 * About : description of this API
 *
 * @function router.get
 * @param url - /ngeo/shopcarts/about
 * @param req - empty
 * @param res - response
 */
router.get('/about', (req, res) => {

	Logger.debug('About ShopCart is calling');

	res.status(200).send("Description of shopcarts requests");
});

module.exports = router;