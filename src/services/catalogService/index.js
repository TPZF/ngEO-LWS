let _ = require('lodash');
let request = require('request');
let Catalog = require('./catalog');
let Xml2JsonParser = require('utils/xml2jsonParser');
let Logger = require('utils/logger');
let Configuration = require('config');
let Utils = require('utils/utils');

/**
 * Catalog service designed to manage the available catalogs on different backends
 */
class CatalogService {

	/**
	 * constructor
	 */
	constructor() {
		this.catalogs = [];
		let _catalogsConf = require(Configuration['catalogPath']);
		if (Array.isArray(_catalogsConf)) {
			// Create catalog object from conf
			_catalogsConf.forEach((_item) => {
				let _options = {
					active: true,
					avoidedAttributes: _item.avoidedAttributes,
					mandatoryAttributes: _item.mandatoryAttributes,
					responseFormatOnSearch: _item.responseFormatOnSearch,
					credentials: _item.credentials
				};
				let _catalog = new Catalog(_item.url, _item.name, _options);
				this.catalogs.push(_catalog);
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
			this.catalogs.forEach((_item) => {
				_item.active = true;
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
			return _.filter(this.catalogs, (_item) => { return _item.active === myActive; })
		}
	}

	/**
	 * Get catalog with the given id
	 * 
	 * @function getCatalog
	 * @param {String} myId
	 */
	getCatalog(myId) {
		return _.find(this.catalogs, { id: myId });
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
		return new Promise((resolve, reject) => {
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
					Xml2JsonParser.parse(body, (_result) => {
						if (typeof _result === 'undefined') {
							Logger.error('catalogService.setTotalResults - undefined result for catalog ' + myCatalog.name);
							return;
						}
						let _opensearchTag = Utils.findTagByXmlns(_result, Configuration.opensearch.xmlnsOpensearch);
						myCatalog.totalResults = _result[_opensearchTag + 'totalResults'];
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
		let _this = this;
		let _aPromises = [];
		myCatalog.collectionsSchema = [];
		let _iMax = parseInt(myCatalog.totalResults / 50) + 1;
		for (let _i = 0; _i < _iMax; _i++) {
			let _p = _this.setCollectionsSchemaFrom(myCatalog, 1 + _i * 50);
			_aPromises.push(_p);
		}
		Logger.debug('catalogService.setCollectionsSchema - ' + _aPromises.length + ' requests to retrieve all collections for catalog ' + myCatalog.name);
		return Promise.all(_aPromises);
	}

	/**
	 * Request catalog to retrieve collectionsSchema from start
	 * 
	 * @function setCollectionsSchemaFrom
	 * @param {object} myCatalog 
	 * @param {number} myStart
	 * @returns {Promise}
	 */
	setCollectionsSchemaFrom(myCatalog, myStart) {
		return new Promise((resolve, reject) => {
			request(myCatalog.url + '&startRecord=' + myStart, (error, response, body) => {
				Logger.debug('catalogService.setCollectionsSchemaFrom(' + myCatalog.name + ',' + myStart + ')');
				Logger.debug('catalogService.setCollectionsSchemaFrom - GET ' + myCatalog.url + '&startRecord=' + myStart);
				if (error) {
					Logger.error('catalogService.setCollectionsSchemaFrom - Unable to get collections for catalog ' + myCatalog.name);
					resolve();
				} else if (!body) {
					Logger.error('catalogService.setCollectionsSchemaFrom - Unable to get body response for catalog ' + myCatalog.name);
					resolve();
				} else {
					Logger.debug('catalogService.setCollectionsSchemaFrom - Push result in collectionsSchema for catalog ' + myCatalog.name);
					Xml2JsonParser.parse(body, (_result) => {
						myCatalog.collectionsSchema.push(_result);
						resolve();
					});
				}
			});
		});
	}

	/**
	 * @function getXMLFeed
	 * @param {string} myReferrer 
	 * @returns {string}
	 */
	getXMLFeed(myReferrer) {
		Logger.debug('catalogService.getXMLFeed');
		let _nbResults = 0;
		let _xmlEntries = '';
		this.catalogs.forEach((_catalog) => {
			_nbResults += parseInt(_catalog.totalResults);
			_xmlEntries += this.setFeedEntries(myReferrer, _catalog);
		});
		let _xmlDescription = '';
		_xmlDescription += this.setFeedHeader(myReferrer, _nbResults);
		_xmlDescription += _xmlEntries;
		_xmlDescription += this.setFeedFooter();
		return _xmlDescription;
	}

	/**
	 * @function setFeedHeader
	 * @param {string} myReferrer 
	 * @param {number} myNbResults 
	 * @returns {string}
	 */
	setFeedHeader(myReferrer, myNbResults) {
		Logger.debug('catalogService.setFeedHeader');
		let _xmlResult = '<?xml version="1.0" encoding="UTF-8"?>';
		_xmlResult += '<feed xmlns="http://www.w3.org/2005/Atom" xmlns:os="http://a9.com/-/spec/opensearch/1.1/" xmlns:dc="http://purl.org/dc/elements/1.1/">';
		_xmlResult += '<id>' + myReferrer + '/ngeo/opensearch</id>';
		_xmlResult += '<title type="text">ngEO collections</title>';
		_xmlResult += '<subtitle type="text">Available collections in ngEO</subtitle>';
		_xmlResult += '<updated>' + new Date().toUTCString() + '</updated>';
		_xmlResult += '<author><name>ngEO Super Catalog</name></author>';
		_xmlResult += '<generator version="2.40">ngEO Super catalog</generator>';
		_xmlResult += '<os:totalResults>' + myNbResults + '</os:totalResults>';
		_xmlResult += '<os:startIndex>0</os:startIndex>';
		_xmlResult += '<os:itemsPerPage>100</os:itemsPerPage>';
		_xmlResult += '<os:Query role="request"/>';
		_xmlResult += '<link rel="search" type="application/opensearchdescription+xml" href="' + myReferrer + '/ngeo/opensearch"/>';
		return _xmlResult;
	}

	/**
	 * @function setFeedFooter
	 * @returns {string}
	 */
	setFeedFooter() {
		let _xmlResult = '</feed>';
		return _xmlResult;
	}

	/**
	 * @function setFeedEntries
	 * @param {string} myReferrer 
	 * @param {object} myNbCatalog
	 * @returns {string}
	 */
	setFeedEntries(myReferrer, myCatalog) {
		let _xmlResult = '';
		if (myCatalog.collectionsSchema) {
			myCatalog.collectionsSchema.forEach((_collectionSchema) => {
				if (_collectionSchema.entry && Array.isArray(_collectionSchema.entry)) {
					_collectionSchema.entry.forEach((_entry) => {
						let _collectionId = myCatalog.id + '-' + _entry['dc:identifier'];
						_xmlResult += '<entry>';
						_xmlResult += '<id>' + myReferrer + '/ngeo/' + _collectionId + '</id>';
						_xmlResult += '<title>' + _entry.title + '</title>';
						_xmlResult += '<summary type="html"><![CDATA[';
						_xmlResult += 'Collection ' + _entry.title + '<p>';
						_xmlResult += '<a href="' + myReferrer + '/ngeo/opensearch/' + _collectionId + '" target="_blank">OpenSearch description</a><br>';
						_xmlResult += '<a href="' + myReferrer + '/ngeo/catalogue/' + _collectionId + '/search" target="_blank">Search request</a>';
						_xmlResult += '</p>';
						_xmlResult += ']]></summary>';
						_xmlResult += '<updated>' + _entry.updated + '</updated>';
						_xmlResult += '<dc:identifier>' + _collectionId + '</dc:identifier>';
						_xmlResult += '<link rel="alternate" type="' + myCatalog.responseFormatOnSearch + '" title="Product search" href="' + myReferrer + '/ngeo/catalogue/' + _collectionId + '/search' + '"/>';
						_xmlResult += '<link rel="search" type="application/opensearchdescription+xml" title="OpenSearch description" href="' + myReferrer + '/ngeo/opensearch/' + _collectionId + '"/>';
						_xmlResult += '</entry>';
					})
				}
			});
		}
		return _xmlResult;
	}
}

module.exports = new CatalogService();