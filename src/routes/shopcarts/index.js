// CORE
let express = require('express');
let _ = require('lodash');
let ObjectId = require('mongodb').ObjectID;

// UTILS
let Logger = require('utils/logger');

// SERVICES
let AuthenticationService = require('services/authenticationService');
let AuthorizationService = require('services/authorizationService');
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

router.use(function authenticate(req, res, next) {
	// for all shopcarts request, authentication is required
	AuthenticationService.isAuthenticated(req, res);
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
 */
router.get('/', (req, res) => {

	Logger.debug('GET /ngeo/shopcarts');

	// define call back function after listing shopcarts
	// send response
	let cbAfterSearch = function(response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			_.map(response.datas, function(item) {
				delete item._id;
			});
			res.json({"shopcarts" : response.datas});
		}
	}

	// 
	let jsonQueryForfilterOnUserId = {
		userId: AuthenticationService.getUserId(req)
	};

	// call list service
	DatabaseService.list(SHOPCARTNAME, jsonQueryForfilterOnUserId, cbAfterSearch);

});

/**
 * Create a shopcart
 *
 * @function router.post
 * @param url - /ngeo/shopcarts/
 */
router.post('/', (req,res) => {

	Logger.debug('POST /ngeo/shopcarts');

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
	if (!myInsertItem.userId) {
		myInsertItem.userId = AuthenticationService.getUserId(req);
	}
	if (myInsertItem.userId !== AuthenticationService.getUserId(req)) {
		res.status(401).json('Unauthorized');
		return;
	}

	// define query to find if item is already in database
	let myQueryItemAlreadyExists = {
		name: myInsertItem.name,
		userId: AuthenticationService.getUserId(req)
	};

	// call create service for database
	DatabaseService.create(SHOPCARTNAME, myInsertItem, myQueryItemAlreadyExists, cbCreateShopCart);
	
});

/**
 * Update a shopcart
 *
 * @function router.put
 * @param url - /ngeo/shopcarts/id
 */
router.put('/:shopcart_id', (req,res) => {

	Logger.debug('PUT /ngeo/shopcarts/:shopcartId');

	// check if request is valid
	if (!_checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	// updating item
	let myUpdateItem = req.body.shopcart;
	myUpdateItem._id = myUpdateItem.id;

	// check authorization
	if (myUpdateItem.userId !== AuthenticationService.getUserId(req)) {
		res.status(401).json('Unauthorized');
		return;
	}

	// define query if item already exists
	let myQueryItemAlreadyExists = {
		_id: {
			$ne: ObjectId(myUpdateItem._id)
		},
		name: myUpdateItem.name,
		userId: myUpdateItem.userId
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

	Logger.debug('DELETE /ngeo/shopcarts/:shopcartId');

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


	let cbAfterCheckAuthorization = function() {
		DatabaseService.delete(SHOPCARTNAME, idToDelete, cbDeleteShopCart);
	}

	AuthorizationService.isAuthorized(
		res, 
		DatabaseService, 
		SHOPCARTNAME, 
		ObjectId(idToDelete), 
		AuthenticationService.getUserId(req), 
		cbAfterCheckAuthorization
	);

});

// ======================================================================
//		SHOP CART FEATURES
// ======================================================================
/**
 * Get features for a shopcart
 */
router.get('/:shopcart_id/items', (req,res) => {

	Logger.debug('GET /ngeo/shopcarts/:shopcartId/items');

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
				item.properties.shopcartItemId = item._id;
				item.id = item._id;
				delete item._id;
			});
			res.json({
				"type": "FeatureCollection",
				"features" : response.datas
			});
		}
	};
	

	let cbAfterCheckAuthorization = function() {
		// call search service
		DatabaseService.search(SHOPCARTFEATURENAME, myQueryCriteria, start, count, cbSearchFeaturesInShopCart);
	}

	AuthorizationService.isAuthorized(
		res, 
		DatabaseService,
		SHOPCARTNAME,
		ObjectId(idShopCart),
		AuthenticationService.getUserId(req),
		cbAfterCheckAuthorization
	);

});

/**
 * Create features on a shopcart
 */
router.post('/:shopcart_id/items', (req,res) => {

	Logger.debug('POST /ngeo/shopcarts/:shopcartId/items');

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

	let cbAfterCheckAuthorization = function() {
		myInsertFeatures.forEach((item, index) => {
			item.properties.shopcart_id = idShopCart;
			// define query to find if item is already in database
			let myQueryItemAlreadyExists = {
				"properties.productUrl": item.properties.productUrl,
				"properties.shopcart_id": item.properties.shopcart_id
			};

			DatabaseService.create(SHOPCARTFEATURENAME, item, myQueryItemAlreadyExists, cbCreateFeatureInShopCart);
		});
	}

	AuthorizationService.isAuthorized(
		res, 
		DatabaseService,
		SHOPCARTNAME,
		ObjectId(idShopCart),
		AuthenticationService.getUserId(req),
		cbAfterCheckAuthorization
	);

});

/**
 * Delete features for a shopcart
 */
router.post('/:shopcart_id/items/delete', (req,res) => {

	Logger.debug('POST /ngeo/shopcarts/:shopcartId/items/delete');

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

	let cbAfterCheckAuthorization = function() {
		myDeletedFeatures.forEach((item, index) => {
			DatabaseService.delete(SHOPCARTFEATURENAME, item.id, cbDeleteFeatureInShopCart);
		});
	};

	AuthorizationService.isAuthorized(
		res, 
		DatabaseService,
		SHOPCARTNAME,
		ObjectId(idShopCart),
		AuthenticationService.getUserId(req),
		cbAfterCheckAuthorization
	);

});

/**
 * About : description of this API
 *
 * @function router.get
 * @param url - /ngeo/shopcarts/about
 */
router.get('/about', (req, res) => {
	Logger.debug('GET /ngeo/shopcarts/about');
	res.status(200).send('Description of shopcarts requests');
});

module.exports = router;