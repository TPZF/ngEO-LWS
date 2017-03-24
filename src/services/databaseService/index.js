let Logger = require('utils/logger'),
	Configuration = require('config'),
	MongoDBService = require('./mongodb');

/**
 * Database service
 * Interface with mongodb service
 */
class DataBaseService {

	constructor() {
		let databaseConnnection = Configuration.database.connection;
		this.service = null
		if (databaseConnnection.url.indexOf('mongodb://') >= 0) {
			Logger.info('MongoDB is used !');
			this.service = new MongoDBService(databaseConnnection);
		}
	}

	/**
	 * Create a document
	 * 
	 * @function create
	 * @param myCollection - collection in mongodb
	 * @param myDocument - document
	 * @param myQueryItemAlreadyExists - json query for find if an item with the same attributes already exists
	 * @param myCallbackFn - callback function 
	 */
	create(myCollection, myDocument, myQueryItemAlreadyExists, myCallbackFn) {
		this.service.create(myCollection, myDocument, myQueryItemAlreadyExists, myCallbackFn);
	}

	/**
	 * Delete a document
	 * 
	 * @function delete
	 * @param myCollection - collection in mongodb
	 * @param myDocumentId - id of document to delete
	 * @param myCallbackFn - callback function 
	 */
	delete(myCollection, myDocumentId, myCallbackFn) {
		this.service.delete(myCollection, myDocumentId, myCallbackFn);
	}

	/**
	 * Delete documents
	 * 
	 * @function deleteCascade
	 * @param myCollection - collection in mongodb
	 * @param myQueryCriterias - json query for find documents to delete
	 * @param myCallbackFn - callback function 
	 */
	deleteCascade(myCollection, myQueryCriterias, myCallbackFn) {
		this.service.deleteCascade(myCollection, myQueryCriterias, myCallbackFn);
	}
	/**
	 * Update a document
	 * 
	 * @function update
	 * @param myCollection - collection in mongodb
	 * @param myDocument - document
	 * @param myQueryItemAlreadyExists - json query for find if a document with the same attributes already exists
	 * @param myQueryUpdate - jqon query to update document
	 * @param myCallbackFn - callback function 
	 */
	update(myCollection, myDocument, myQueryItemAlreadyExists, myUpdates, myCallbackFn) {
		this.service.update(myCollection, myDocument, myQueryItemAlreadyExists, myUpdates, myCallbackFn);
	}

	/**
	 * Search documents
	 * 
	 * @function search
	 * @param myCollection - collection in mongodb
	 * @param myQueryCriterias - json query for find documents
	 * @param mySkip - begin after skip documents
	 * @param myLimit - limit number of documents
	 * @param myCallbackFn - callback function 
	 */
	search(myCollection, myQueryCriterias, mySkip, myLimit, myCallbackFn) {
		this.service.search(myCollection, myQueryCriterias, mySkip, myLimit, myCallbackFn);
	}

	/**
	 * Count documents that match criterias
	 * 
	 * @function count
	 * @param myCollection - collection in mongodb
	 * @param myQueryCriterias - json query for find documents
	 * @param myCallbackFn - callback function 
	 */
	count(myCollection, myQueryCriterias, myCallbackFn) {
		this.service.count(myCollection, myQueryCriterias, myCallbackFn);
	}

	/**
	 * List documents
	 * 
	 * @function list
	 * @param myCollection - collection in mongodb
	 * @param myCallbackFn - callback function 
	 */
	list(myCollection, myCallbackFn) {
		this.service.list(myCollection, myCallbackFn);
	}

	/**
	 * @function checkParamId
	 * @param {String} myStringId
	 * @returns {boolean}
	 */
	checkParamId(myStringId) {
		return this.service.checkParamId(myStringId);
	}

}

module.exports = new DataBaseService();