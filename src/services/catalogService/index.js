let _ = require('lodash');
let request = require('request');
let Catalog = require('./catalog');
let Xml2JsonParser = require('utils/xml2jsonParser');
let Logger = require('utils/logger');
let Configuration = require('config');

/**
 * Catalog service designed to manage the available catalogs on different backends
 */
class CatalogService {

	/**
	 * 
	 */
	constructor() {
		this.catalogs = [];
		let catalogsConf = require(Configuration['catalogPath']);
		if (Array.isArray(catalogsConf)) {
			// Create catalog object from conf
			catalogsConf.forEach((catalogConf) => {
				let options = {
					active : true,
					avoidedAttributes: catalogConf.avoidedAttributes,
					mandatoryAttributes: catalogConf.mandatoryAttributes
				};
				let catalog = new Catalog(catalogConf.url, catalogConf.name, options);
				this.catalogs.push(catalog);
			});
		}
	}

	/**
	 * set active = true for all catalogs
	 * 
	 * @function reinitialize
	 */
	reinitialize() {
		if (this.catalogs.length > 0) {
			this.catalogs.forEach((item) => {
				item.active = true;
			});
		}
	}

	/**
	 * get catalogs array with or without filter on active attribute
	 * 
	 * @function getCatalogs
	 * @param {boolean} myActive 
	 * @returns {Array}
	 */
	getCatalogs(myActive) {
		if (typeof myActive === 'undefined') {
			return this.catalogs;
		} else {
			return _.filter(this.catalogs, (item) => {return item.active===myActive;})
		}
	}

	/**
	 * Get catalog with the given id
	 * 
	 * @function getCatalog
	 * @param {String} myId
	 */
	getCatalog(myId) {
		return _.find(this.catalogs, {id: myId});
	}

	/**
	 * Add totalResults attribute in myCatalog object
	 * totalResults = count of collections
	 * 
	 * @function setTotalResults
	 * @param {object} myCatalog 
	 * @returns {Promise}
	 */
	setTotalResults(myCatalog) {
		let that = this;
		return new Promise((resolve,reject) => {
			Logger.debug('catalogService.setTotalResults(' + myCatalog.name + ')');
			// 
			if (Configuration.request && Configuration.request.tlsRejectUnauthorized) {
				console.log('tls reject unauthorized is false !')
				//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
			}
			request(myCatalog.url, (error, response, body) => {
				Logger.debug('catalogService.setTotalResults - GET ' + myCatalog.url);
				if (error) {
					Logger.error('catalogService.setTotalResults - Unable to get totalResults for catalog ' + myCatalog.name);
					myCatalog.active = false;
				} else if (response.statusCode === 404) {
					Logger.error('catalogService.setTotalResults - Unreachable url ' + myCatalog.url);
					myCatalog.active = false;
				} else {
					Xml2JsonParser.parse(body, (result) => {
						myCatalog.totalResults = result['os:totalResults'];
						if (!myCatalog.totalResults || myCatalog.totalResults < 1) {
							Logger.error('catalogService.setTotalResults - No results for ' + myCatalog.url);
							myCatalog.active = false;
						}
						Logger.debug('catalogService.setTotalResults - Push totalResults ' + myCatalog.totalResults + ' in catalog ' + myCatalog.name)
					});
				}
				resolve();
			});
		});
	}

	/**
	 * Add collectionsSchema attribute in myCatalog object
	 * collectionsSchema is an array
	 * 
	 * @function setCollectionsSchema
	 * @param {object} myCatalog 
	 * @returns {Promise}
	 */
	setCollectionsSchema(myCatalog) {
		Logger.debug('catalogService.setCollectionsSchema(' + myCatalog.name + ')');
		let that = this;
		let aPromises = [];
		myCatalog.collectionsSchema = [];
		let iMax = parseInt(myCatalog.totalResults/50) + 1;
		for (let i=0; i<iMax; i++) {
			let p = that.setCollectionsSchemaFrom(myCatalog, 1 + i*50);
			aPromises.push(p);
		}
		Logger.debug('catalogService.setCollectionsSchema - ' + aPromises.length + ' requests to retrieve all collections for catalog ' + myCatalog.name);
		return Promise.all(aPromises);
	}

	/**
	 * Request catalog to retrieve collectionsSchema from start
	 * 
	 * @function setCollectionsSchemaFrom
	 * @param {object} myCatalog 
	 * @param {number} start
	 * @returns {Promise}
	 */
	setCollectionsSchemaFrom(myCatalog, start) {
		let that = this;
		return new Promise((resolve,reject) => {
			request(myCatalog.url + '&startRecord=' + start, (error, response, body) => {
				Logger.debug('catalogService.setCollectionsSchemaFrom(' + myCatalog.name + ',' + start +')');
				Logger.debug('catalogService.setCollectionsSchemaFrom - GET ' + myCatalog.url + '&startRecord='+start);
				if (error) {
					Logger.error('catalogService.setCollectionsSchemaFrom - Unable to get collections for catalog ' + myCatalog.name);
				} else if (!body) {
					Logger.error('catalogService.setCollectionsSchemaFrom - Unable to get body response for catalog ' + myCatalog.name);
				} else {
					Logger.debug('catalogService.setCollectionsSchemaFrom - Push result in collectionsSchema for catalog ' + myCatalog.name);
					Xml2JsonParser.parse(body, (result) => {
						myCatalog.collectionsSchema.push(result);
					});
				}
				resolve();
			});			
		});
	}

	/**
	 * @function getXMLFeed
	 * @param {string} myReferrer 
	 * @returns {string}
	 */
	getXMLFeed(myReferrer) {
		Logger.debug('catalogService.getDescription()');
		let nbResults = 0;
		let xmlEntries = '';
		this.catalogs.forEach((catalog) => {
			nbResults += parseInt(catalog.totalResults);
			xmlEntries += this.setFeedEntries(myReferrer, catalog);
		});
		let xmlDescription = '';
		xmlDescription += this.setFeedHeader(myReferrer, nbResults);
		xmlDescription += xmlEntries;
		xmlDescription += this.setFeedFooter();
		return xmlDescription;
	}

	/**
	 * @function setFeedHeader
	 * @param {string} myReferrer 
	 * @param {number} myNbResults 
	 * @returns {string}
	 */
	setFeedHeader(myReferrer, myNbResults) {
		let xmlResult = '<?xml version="1.0" encoding="UTF-8"?>';
		xmlResult += '<feed xmlns="http://www.w3.org/2005/Atom" xmlns:os="http://a9.com/-/spec/opensearch/1.1/" xmlns:dc="http://purl.org/dc/elements/1.1/">';
		xmlResult += '<id>' + myReferrer + '/ngeo/opensearch</id>';
		xmlResult += '<title type="text">ngEO collections</title>';
		xmlResult += '<subtitle type="text">Available collections in ngEO</subtitle>';
		xmlResult += '<updated>' + new Date().toUTCString() + '</updated>';
		xmlResult += '<author><name>ngEO Super Catalog</name></author>';
		xmlResult += '<generator version="2.40">ngEO Super catalog</generator>';
		xmlResult += '<os:totalResults>' + myNbResults + '</os:totalResults>';
		xmlResult += '<os:startIndex>0</os:startIndex>';
		xmlResult += '<os:itemsPerPage>100</os:itemsPerPage>';
		xmlResult += '<os:Query role="request"/>';
		xmlResult += '<link rel="search" type="application/opensearchdescription+xml" href="' + myReferrer + '/ngeo/opensearch"/>';
		return xmlResult;
	}

	/**
	 * @function setFeedFooter
	 * @returns {string}
	 */
	setFeedFooter() {
		let xmlResult = '</feed>';
		return xmlResult;
	}

	/**
	 * @function setFeedEntries
	 * @param {string} myReferrer 
	 * @param {object} myNbCatalog
	 * @returns {string}
	 */
	setFeedEntries(myReferrer, myCatalog) {
		let xmlResult = '';
		if (myCatalog.collectionsSchema) {
			myCatalog.collectionsSchema.forEach((collectionSchema) => {
				if (collectionSchema.entry && Array.isArray(collectionSchema.entry)) {
					collectionSchema.entry.forEach((entry) => {
						xmlResult += '<entry>';
						xmlResult += '<id>' + myReferrer + '/ngeo/' + entry['dc:identifier'] + '</id>';
						xmlResult += '<title>' + entry.title + '</title>';
						xmlResult += '<summary type="html"><![CDATA[';
						xmlResult += 'Collection ' + entry.title + '<p>';
						xmlResult += '<a href="' + myReferrer + '/ngeo/opensearch/' + entry['dc:identifier'] + '" target="_blank">OpenSearch description</a><br>';
						xmlResult += '<a href="' + myReferrer + '/ngeo/catalogue/' + entry['dc:identifier'] + '/search" target="_blank">OpenSearch GeoJson</a>';
						xmlResult += '</p>';
						xmlResult += ']]></summary>';
						xmlResult += '<updated>' + entry.updated + '</updated>';
						xmlResult += '<dc:identifier>' + entry['dc:identifier'] + '</dc:identifier>';
						xmlResult += '<link rel="alternate" type="application/vnd.geo+json" title="Product search" href="' + myReferrer + '/ngeo/catalogue/' + entry['dc:identifier'] + '/search' + '"/>';
						xmlResult += '<link rel="search" type="application/opensearchdescription+xml" title="OpenSearch description" href="' + myReferrer + '/ngeo/opensearch/' + entry['dc:identifier'] + '"/>';
						xmlResult += '</entry>';
					})
				}
			});
		}
		return xmlResult;
	}
}

module.exports = new CatalogService();