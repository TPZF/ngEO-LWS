let _ = require('lodash');
let request = require('request');
let collectionsConf = require("./collections.json");
let Collection = require('./collection');
let Xml2JsonParser = require('../../utils/xml2jsonParser');
let logger = require('../../utils/logger');

/**
 * Collection service designed to manage the available collections on different backends
 * Currently initialized with configuration file, but in future will be probably absorbed by Catalog object
 */
class CollectionService {
	constructor() {
		this.collections = [];
		// Create collection object from conf
		collectionsConf.forEach((collection) => {
			this.collections.push(new Collection(collection.url, collection.name));
		});
	}

	/**
	 * Get collection with the given id
	 */
	getCollection(id) {
		return _.find(this.collections, {id: id});
	}

	/**
	 * Make search on the given collection
	 */
	search(collectionId, options) {
		let collection = this.getCollection(collectionId);
		let searchUrl = options.params ? collection.url + '/atom' + options.params : collection.url + '/atom';
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