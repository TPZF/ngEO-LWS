let _ = require('lodash');
let request = require('request');
let Collection = require('./collection');
let Xml2JsonParser = require('utils/xml2jsonParser');
let logger = require('utils/logger');
let Configuration = require('config');

/**
 * Collection service designed to manage the available collections on different backends
 * Currently initialized with configuration file, but in future will be probably absorbed by Catalog object
 */
class CollectionService {
	constructor() {
		this.collections = [];
		let collectionsConf = require(Configuration['collectionPath']);
		// Create collection object from conf
		collectionsConf.forEach((collectionConf) => {
			let collection = new Collection(collectionConf.url, collectionConf.name);
			this.collections.push(collection);
			this.populateCollection(collection);
		});
	}

	/**
	 * Get collection with the given id
	 */
	getCollection(id) {
		return _.find(this.collections, {id: id});
	}

	/**
	 * Populate collection with osdd & totalResults
	 */
	populateCollection(collection) {
		// Get osdd
		request(collection.url, (error, response, body) => {
			Xml2JsonParser.parse(body, (result) => {
				collection.osdd = result;
			});
		});

		// Make first search request just to retrieve the number of available products
		request(collection.url + '/atom?count=1', (error, response, body) => {
			Xml2JsonParser.parse(body, (result) => {
				collection.totalResults = result['os:totalResults'];
			});
		});
	}

	/**
	 * Make search on the given collection
	 */
	search(collectionId, options = { params: "" }){
		let collection = this.getCollection(collectionId);

		// Replace "startIndex" param by "offset" due to osdd of SX-CAT
		// TODO: use collection special method later to extract the name in more generic way
		options.params = options.params.replace('startIndex', 'offset');
		
		let searchUrl = collection.url + '/atom' + options.params;
		let startTime = Date.now();
		logger.info(`Searching for backend with ${searchUrl}`);
		request(searchUrl, function (error, response, body) {
			logger.info(`Time elapsed searching on backend with ${searchUrl} took ${Date.now() - startTime} ms`);
			if (!error && response.statusCode == 200) {
				Xml2JsonParser.parse(body, options.onSuccess, options.onError);
			} else {
				options.onError('Error while searching on ' + searchUrl);
			}
		});
	}

	/**
	 * Make an osdd request on the given collection
	 */
	info(collectionId, options) {
		let collectionUrl = this.getCollection(collectionId).url;
		request(collectionUrl, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				Xml2JsonParser.parse(body, options.onSuccess, options.onError);
			} else {
				options.onError('Error while making request ' + collectionUrl);
			}
		});
	}
}

module.exports = new CollectionService();