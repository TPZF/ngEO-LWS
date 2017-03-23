let Logger = require('utils/logger'),
	MongoClient = require('mongodb').MongoClient,
	ObjectId = require('mongodb').ObjectID;

/**
 * Browse service adding the wms/wmts information to products
 */
class MongoDBService {

	constructor(connection) {
		this.databaseConnnection = connection;
		this.dataBase = null;
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
		
		let dataBase = null;

		try {
			// connect to mongodb
			MongoClient.connect(this.databaseConnnection.url, (errConnect, db) => {
				if (errConnect) throw errConnect;
				Logger.debug('db connection ok');
				dataBase = db;
				// findOne document with that name for this user
				dataBase.collection(myCollection).findOne(myQueryItemAlreadyExists, (errFind, resultFind) => {
					if (errFind) throw errFind;
					Logger.debug('findOne is done.');
					if (resultFind) {
						dataBase.close();
						return myCallbackFn({"code": 400, "datas": 'This document already exists in collection ' + myCollection + '.'});
					} else {
						// insert document
						dataBase.collection(myCollection).insertOne(myDocument, (errInsert, resultInsert) => {
							if (errInsert) throw errInsert;
							Logger.debug('insertOne is done.');
							dataBase.close();
							let idCreated = resultInsert.insertedId;
							myDocument.id = idCreated;
							return myCallbackFn({"code": 0, "datas": myDocument});
						})
					}
				});
			});
		}
		catch(exc) {
			if (dataBase!==null) dataBase.close();
			return myCallbackFn({"code": 400, "datas": exc});
		}

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

		let dataBase = null;
		
		try {
			// connect to mongodb
			MongoClient.connect(this.databaseConnnection.url, (errConnect, db) => {
				if (errConnect) throw errConnect;
				Logger.debug('db connection ok');
				dataBase = db;
				let queryFindById = {
					"_id": ObjectId(myDocumentId)
				};
				// deleteOne document with that id
				dataBase.collection(myCollection).deleteOne(queryFindById, (errDelete, resultDelete) => {
					if (errDelete) throw errDelete;
					Logger.debug('deleteOne is done');
					dataBase.close();
					if (resultDelete.deletedCount === 0) {
						return myCallbackFn({"code": 404, "datas": 'Unable to find this document in collection ' + myCollection});
					} else if (resultDelete.deletedCount === 1) {
						return myCallbackFn({"code": 0, "datas": myDocumentId});
					} else {
						throw '_id for this document is not unique ! (' + myDocumentId + ')';
					}
				});
				
			})
		}
		catch (exc) {
			if (dataBase!==null) dataBase.close();
			return myCallbackFn({"code": 400, "datas": exc});
		}

	}

	/**
	 * Delete documents on cascade
	 * 
	 * @function deleteCascade
	 * @param myCollection - collection in mongodb
	 * @param myQueryCriterias - json query to fon documents to delete
	 * @param myCallbackFn - callback function 
	 */
	deleteCascade(myCollection, myQueryCriterias, myCallbackFn) {

		let dataBase = null;
		
		try {
			// connect to mongodb
			MongoClient.connect(this.databaseConnnection.url, (errConnect, db) => {
				if (errConnect) throw errConnect;
				Logger.debug('db connection ok');
				dataBase = db;
				// deleteMany documents with this criteria
				dataBase.collection(myCollection).deleteMany(myQueryCriterias, (errDelete, resultDelete) => {
					if (errDelete) throw errDelete;
					Logger.debug('deleteMany is done');
					dataBase.close();
					return myCallbackFn({"code": 0, "datas": null});
				});				
			})
		}
		catch (exc) {
			if (dataBase!==null) dataBase.close();
			return myCallbackFn({"code": 400, "datas": exc});
		}

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
	update(myCollection, myDocument, myQueryItemAlreadyExists, myQueryUpdate, myCallbackFn) {
		
		let dataBase = null;
		
		try {
			// connect to mongodb
			MongoClient.connect(this.databaseConnnection.url, (errConnect, db) => {
				if (errConnect) throw errConnect;
				Logger.debug('db connection ok');
				dataBase = db;
				// findOne document with same unique attributes
				dataBase.collection(myCollection).findOne(myQueryItemAlreadyExists, (errFind, resultFind) => {
					if (errFind) throw errFind;
					Logger.debug('findOne is done');
					if (resultFind) {
						dataBase.close();
						return myCallbackFn({"code": 400, "datas": 'A document with the same attributes already exists in collection ' + myCollection});
					} else {
						// update if not found
						let queryFindById = {
							"_id": ObjectId(myDocument.id)
						};
						dataBase.collection(myCollection).updateOne(queryFindById, myQueryUpdate, (errUpdate, resultUpdate) => {
							if (errUpdate) throw errUpdate;
							Logger.debug('updateOne is done');
							dataBase.close();
							if (resultUpdate.modifiedCount === 0) {
								Logger.debug('no modification');
								return myCallbackFn({"code": 404, "datas": 'Unable to find this document in collection ' + myCollection});
							} else if (resultUpdate.modifiedCount === 1) {
								return myCallbackFn({"code": 0, "datas": myDocument});
							} else {
								Logger.error('id not unique (' + myCollection + ',' + myDocument.id + ')');
								throw '_id for this document is not unique ! (' + myDocument.id + ')';
							}
						});
					}
				});
			})
		}
		catch(exc) {
			if (dataBase!==null) dataBase.close();
			return myCallbackFn({"code": 400, "datas": exc});
		}
	}

	/**
	 * List documents
	 * 
	 * @function list
	 * @param myCollection - collection in mongodb
	 * @param myCallbackFn - callback function 
	 */
	list(myCollection, myCallbackFn) {

		let dataBase = null;

		try {
			// connect to mongodb
			MongoClient.connect(this.databaseConnnection.url, (errConnect,db) => {
				if (errConnect) throw errConnect;
				Logger.debug('db connection ok');
				dataBase = db;
				// find and return an array
				let myCursor = dataBase.collection(myCollection).find().toArray((errFindAll, resultFindAll) => {
					if (errFindAll) throw errFindAll;
					Logger.debug('find all is done');
					dataBase.close();
					resultFindAll.forEach((_document, _index) => {
						_document.id = _document._id;
					});
					return myCallbackFn({"code": 0, "datas": resultFindAll});
				});
			});
		}
		catch(exc) {
			if (dataBase!==null) dataBase.close();
			return myCallbackFn({"code": 400, "datas": exc});
		}

	}

	/**
	 * Search documents
	 * 
	 * @function search
	 * @param myCollection - collection in mongodb
	 * @param myQueryCriterias - json query with criterias search
	 * @param mySkip - skip documents
	 * @param myLimit - limit number of documents
	 * @param myCallbackFn - callback function 
	 */
	search(myCollection, myQueryCriterias, mySkip, myLimit, myCallbackFn) {

		let dataBase = null;

		myQueryCriterias = myQueryCriterias || {};
		mySkip = mySkip || 0;
		myLimit = myLimit || 50;

		try {
			// connect to mongodb
			MongoClient.connect(this.databaseConnnection.url, (errConnect,db) => {
				if (errConnect) throw errConnect;
				Logger.debug('db connection ok');
				dataBase = db;
				// find and return an array
				let myCursor = dataBase
				.collection(myCollection)
				.find(myQueryCriterias)
				.skip(mySkip)
				.limit(myLimit)
				.toArray((errFindAll, resultFindAll) => {
					if (errFindAll) throw errFindAll;
					Logger.debug('find all is done');
					dataBase.close();
					resultFindAll.forEach((_document, _index) => {
						_document.id = _document._id;
					});
					return myCallbackFn({"code": 0, "datas": resultFindAll});
				});
			});
		}
		catch(exc) {
			if (dataBase!==null) dataBase.close();
			return myCallbackFn({"code": 400, "datas": exc});
		}

	}

	/**
	 * Count documents
	 * 
	 * @function count
	 * @param myCollection - collection in mongodb
	 * @param myQueryCriterias - json query with criterias search
	 * @param myCallbackFn - callback function 
	 */
	count(myCollection, myQueryCriterias, myCallbackFn) {

		let dataBase = null;

		myQueryCriterias = myQueryCriterias || {};

		try {
			// connect to mongodb
			MongoClient.connect(this.databaseConnnection.url, (errConnect,db) => {
				if (errConnect) throw errConnect;
				Logger.debug('db connection ok');
				dataBase = db;
				// find and return count documents
				let count = 0;
				dataBase
				.collection(myCollection)
				.find(myQueryCriterias)
				.count((errCount, value) => {
					if (errCount) throw errCount;
					Logger.debug('count is done');
					dataBase.close();
					return myCallbackFn({"code": 0, "datas": value});
				});
			});
		}
		catch(exc) {
			if (dataBase!==null) dataBase.close();
			return myCallbackFn({"code": 400, "datas": exc});
		}

	}

}

module.exports = MongoDBService;