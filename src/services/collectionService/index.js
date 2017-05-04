let _ = require('lodash');
let request = require('request');
let Promise = require('promise');

let Configuration = require('config');

// UTILS
let Xml2JsonParser = require('utils/xml2jsonParser');
let Logger = require('utils/logger');
let Utils = require('utils/utils');
let BackEndConfigurationConverter = require('utils/backendConfigurationConverter');

// MODELS
let Collection = require('./collection');

// SERVICES
let CatalogService = require('../catalogService');
let BrowseService = require('../browseService');

/**
 * @function _addOriginDatasetId
 * @param {String} myCollectionId
 * @param {Object} myGeoJson
 * @return {Object}
 */
let _addOriginDatasetId = function(myCollectionId, myGeoJson) {
	_.map(myGeoJson.features, function(feat) {
		feat.properties.originDatasetId = myCollectionId;
	});
	return myGeoJson;
};

/**
 * sample of myUrl
 * http://fedeo.esa.int/opensearch/request?
 * httpAccept=application%2Fsru%2Bxml&amp;parentIdentifier=SMOS_Open
 * &amp;query={searchTerms?}&amp;maximumRecords={count?}&amp;startRecord={startIndex?}&amp;startPage={startPage?}
 * &amp;bbox={geo:box?}&amp;geometry={geo:geometry?}&amp;uid={geo:uid?}&amp;lat={geo:lat?}&amp;lon={geo:lon?}
 * &amp;radius={geo:radius?}&amp;name={geo:name?}&amp;startDate={time:start?}&amp;endDate={time:end?}
 * &amp;orbitNumber={eo:orbitNumber?}&amp;acquisitionStation={eo:acquisitionStation?}&amp;track={eo:track?}
 * &amp;frame={eo:frame?}&amp;cloudCover={eo:cloudCover?}&amp;illuminationAzimuthAngle={eo:illuminationAzimuthAngle?}
 * &amp;illuminationElevationAngle={eo:illuminationElevationAngle?}&amp;productType={eo:productType?}
 * &amp;instrument={eo:instrument?}&amp;sensorType={eo:sensorType?}&amp;productionStatus={eo:productionStatus?}
 * &amp;acquisitionType={eo:acquisitionType?}&amp;orbitDirection={eo:orbitDirection?}&amp;swathIdentifier={eo:swathIdentifier?}
 * &amp;processingCenter={eo:processingCenter?}&amp;sensorMode={eo:sensorMode?}&amp;acquisitionSubType={eo:acquisitionSubType?}
 * &amp;polarisationMode={eo:polarisationMode?}&amp;polarisationChannels={eo:polarisationChannels?}&amp;recordSchema={sru:recordSchema?}
 * 
 * find params in myUrl by param in each param={value?}
 * and replace the value
 * 
 * @function _buildSearchRequestWithParam
 * @param {string} myUrl 
 * @param {object} myParams
 * @returns {string}
 * @private
 */
let _buildSearchRequestWithParam = function (myUrl, myParams) {
	let result = '';
	let uri = myUrl.substring(0, myUrl.indexOf('?'));
	result += uri + '?';
	myUrl = myUrl.substring(myUrl.indexOf('?') + 1);
	let itemsOfUrl = myUrl.split('&');
	for (var i = 0; i < itemsOfUrl.length; i++) {
		if (itemsOfUrl[i].indexOf('=') === -1) {
			result += itemsOfUrl[i] + '&';
		} else {
			let itemsOfParam = itemsOfUrl[i].split('=');
			if (itemsOfParam[1].indexOf('{') === -1) {
				result += itemsOfUrl[i] + '&';
			} else {
				let param = itemsOfParam[0];
				if (myParams[param]) {
					result += itemsOfParam[0] + '=' + myParams[param] + '&';
				}
			}
		}
	}
	return result;
};

/**
 * sample of myUrl
 * http://fedeo.esa.int/opensearch/request?
 * httpAccept=application%2Fsru%2Bxml&amp;parentIdentifier=SMOS_Open
 * &amp;query={searchTerms?}&amp;maximumRecords={count?}&amp;startRecord={startIndex?}&amp;startPage={startPage?}
 * &amp;bbox={geo:box?}&amp;geometry={geo:geometry?}&amp;uid={geo:uid?}&amp;lat={geo:lat?}&amp;lon={geo:lon?}
 * &amp;radius={geo:radius?}&amp;name={geo:name?}&amp;startDate={time:start?}&amp;endDate={time:end?}
 * &amp;orbitNumber={eo:orbitNumber?}&amp;acquisitionStation={eo:acquisitionStation?}&amp;track={eo:track?}
 * &amp;frame={eo:frame?}&amp;cloudCover={eo:cloudCover?}&amp;illuminationAzimuthAngle={eo:illuminationAzimuthAngle?}
 * &amp;illuminationElevationAngle={eo:illuminationElevationAngle?}&amp;productType={eo:productType?}
 * &amp;instrument={eo:instrument?}&amp;sensorType={eo:sensorType?}&amp;productionStatus={eo:productionStatus?}
 * &amp;acquisitionType={eo:acquisitionType?}&amp;orbitDirection={eo:orbitDirection?}&amp;swathIdentifier={eo:swathIdentifier?}
 * &amp;processingCenter={eo:processingCenter?}&amp;sensorMode={eo:sensorMode?}&amp;acquisitionSubType={eo:acquisitionSubType?}
 * &amp;polarisationMode={eo:polarisationMode?}&amp;polarisationChannels={eo:polarisationChannels?}&amp;recordSchema={sru:recordSchema?}
 * 
 * find params in myUrl by {value?}
 * and replace the value
 * 
 * @function _buildSearchRequestWithValue
 * @param {string} myUrl 
 * @param {object} myParams
 * @returns {string} 
 * @private
 */
let _buildSearchRequestWithValue = function (myUrl, myParams) {
	let result = '';
	let uri = myUrl.substring(0, myUrl.indexOf('?'));
	result += uri + '?';
	myUrl = myUrl.substring(myUrl.indexOf('?') + 1);
	let itemsOfUrl = myUrl.split('&');
	for (var i = 0; i < itemsOfUrl.length; i++) {
		if (itemsOfUrl[i].indexOf('=') === -1) {
			result += itemsOfUrl[i] + '&';
		} else {
			let itemsOfParam = itemsOfUrl[i].split('=');
			if (itemsOfParam[1].indexOf('{') === -1) {
				result += itemsOfUrl[i] + '&';
			} else {
				let param = itemsOfParam[1].substring(1, itemsOfParam[1].length - 1);
				if (param.indexOf('?')) {
					param = param.substr(0, param.length - 1);
				}
				if (myParams[param]) {
					result += itemsOfParam[0] + '=' + myParams[param] + '&';
				}
			}
		}
	}
	return result;
};

/**
 * With myUrl like http://host/query?key1=val1&key2={val2?}&...
 * and myParam like val2
 * find key = key2
 * 
 * @function _findKeyInSearchRequestWithValue
 * @param {*} myUrl 
 * @param {*} myParam 
 */
let _findKeyInSearchRequestWithValue = function (myUrl, myParam) {
	let _result = '';
	// remove the begin until first '?'
	let _query = myUrl.substring(myUrl.indexOf('?') + 1);
	let _itemsOfQuery = _query.split('&');
	for (var _i = 0; _i < _itemsOfQuery.length; _i++) {
		let _itemOfQuery = _itemsOfQuery[_i];
		// if no equal operator => continue
		if (_itemOfQuery.indexOf('=') === -1) {
			continue;
		}
		let _itemsOfParam = _itemOfQuery.split('=');
		let _testParam = '';
		if (_itemsOfParam[1].indexOf('?') === -1) {
			_testParam = '{' + myParam + '}';
		} else {
			_testParam = '{' + myParam + '?}';
		}
		if (_itemsOfParam[1] === _testParam) {
			_result = _itemsOfParam[0];
			break;
		}
	}
	return _result;
};


/**
 * Collection service designed to manage the available collections on different backends
 */
class CollectionService {

	/**
	 * 
	 */
	constructor() {
		// all collections
		this.collections = [];
		let _startTime = Date.now();
		// last build of this service -> used to refresh collections every refreshDelay (see refresh())
		this.lastBuild = _startTime;
		// initialize service
		this.initialize().then(() => {
			Logger.info('collectionService.initialize() complete in ' + (Date.now() - _startTime) + ' ms');
		});
	}

	/**
	 * @function initialize
	 * @returns {Promise}
	 */
	initialize() {
		Logger.debug('collectionService.initialize()');
		let _startTime = Date.now();
		let _this = this;
		// reinitialize catalogs with active attribute to true...
		CatalogService.reinitialize();
		// for each catalog -> set Total results = count of collections
		let _aPromisesSetTotalResults = [];
		CatalogService.getCatalogs(true).forEach((_catalog) => {
			let _p = CatalogService.setTotalResults(_catalog);
			_aPromisesSetTotalResults.push(_p);
		});
		return Promise.all(_aPromisesSetTotalResults).then(() => {
			Logger.debug('collectionService.initialize - set total results takes ' + (Date.now() - _startTime) + ' ms');
			_startTime = Date.now();
			// for each catalog -> set collections schema
			let _aPromisesSetCollectionsSchema = [];
			CatalogService.getCatalogs(true).forEach((_catalog) => {
				let _p = CatalogService.setCollectionsSchema(_catalog);
				_aPromisesSetCollectionsSchema.push(_p);
			});
			return Promise.all(_aPromisesSetCollectionsSchema);
		}).then(() => {
			Logger.debug('collectionService.initialize - set collectionsSchemas takes ' + (Date.now() - _startTime) + ' ms');
			_startTime = Date.now();
			// for each catalog -> add collections
			let _aPromisesAddCollectionsFromCatalog = [];
			CatalogService.getCatalogs(true).forEach((_catalog) => {
				let _p = _this.addCollectionsFromCatalog(_catalog);
				_aPromisesAddCollectionsFromCatalog.push(_p);
			});
			return Promise.all(_aPromisesAddCollectionsFromCatalog);
		});
	}

	/**
	 * Add collections from myCatalog object
	 * 
	 * @function addCollectionsFromCatalog
	 * @param {object} myCatalog 
	 * @returns {Promise}
	 */
	addCollectionsFromCatalog(myCatalog) {
		Logger.debug('collectionService.addCollectionsFromCatalog(' + myCatalog.name + ')');
		let _this = this;
		if (!myCatalog.collectionsSchema) {
			myCatalog.active = false;
			return Promise.resolve();
		} else {
			let _aPromisesCollectionSchema = [];
			myCatalog.collectionsSchema.forEach((_collectionSchema) => {
				let _p = _this.populateFromCollectionSchema(_collectionSchema, myCatalog);
				_aPromisesCollectionSchema.push(_p);
			});
			return Promise.all(_aPromisesCollectionSchema);
		}
	}

	/**
	 * From each entry in myCollectionSchema
	 * 	Get OSDD for collection
	 * 
	 * @function populateFromCollectionSchema
	 * @param {object} myCollectionSchema
	 * @param {object} myCatalog
	 * @returns {Promise}
	 */
	populateFromCollectionSchema(myCollectionSchema, myCatalog) {
		let _this = this;
		if (myCollectionSchema.entry) {
			if (!Array.isArray(myCollectionSchema.entry)) {
				myCollectionSchema.entry = [myCollectionSchema.entry];
			}
			let _aPromisesGetOsddCollection = [];
			myCollectionSchema.entry.forEach((_oneEntry) => {
				// find url for getting opensearch description
				let _urlOSDD = _.find(_oneEntry.link, function (_lien) {
					return (_lien['@'].rel === 'search' && _lien['@'].type === 'application/opensearchdescription+xml');
				});
				let _url = _urlOSDD ? _urlOSDD['@'].href : _oneEntry.id;
				// find id
				let _idCollection = _oneEntry[Configuration.opensearch.identifier];
				if (!_.find(_this.collections, function (_item) { return _item.id === _idCollection })) {
					// set collection object
					let _collection = new Collection(_idCollection, _url, _oneEntry.title, myCatalog.id);
					_collection.responseFormatOnSearch = myCatalog.responseFormatOnSearch;
					// add other datas
					_aPromisesGetOsddCollection.push(_this.getOsddCollection(_collection));
				}
			});
			return Promise.all(_aPromisesGetOsddCollection).then((_values) => {
				Logger.debug('collectionService.populateFromCollectionSchema(' + myCollectionSchema.id + ')');
				if (_values && Array.isArray(_values)) {
					_values.forEach((_val) => {
						if (!_val.flag) {
							Logger.warn(`collectionService.populateFromCollectionSchema - Remove myCollection ${_val.id} because no results`);
							_.remove(_this.collections, function (_item) {
								return _item.id === _val.id;
							});
						}
					});
				}
			});
		} else {
			Logger.error(`collectionService.populateFromCollectionSchema - Unable to find collectionsSchema for catalog ${myCatalogId}`);
			return Promise.resolve();
		}
	}

	/**
	 * Request OSDD url and put response in osdd attribute of myCollection object
	 * 
	 * @function getOsddCollection
	 * @param {object} myCollection 
	 * @returns {Promise}
	 */
	getOsddCollection(myCollection) {
		let _this = this;
		// Get osdd
		return new Promise((resolve, reject) => {
			request(myCollection.url, (error, response, body) => {
				Logger.debug('collectionService.getOsddCollection(' + myCollection.id + ')');
				Logger.debug('collectionService.getOsddCollection - GET ' + myCollection.url);
				if (error) {
					Logger.error('collectionService.getOsddCollection - Unable to get osdd for collection ' + myCollection.id);
					resolve({ flag: false, id: myCollection.id });
				} else if (!body) {
					Logger.error('collectionService.getOsddCollection - Unable to get body for collection ' + myCollection.id);
					resolve({ flag: false, id: myCollection.id });
				} else {
					Xml2JsonParser.parse(body, (_result) => {
						Logger.debug('collectionService.getOsddCollection - osdd retrieve for collection ' + myCollection.id);
						// put result in osdd attribute
						myCollection.osdd = _result;
					});
					_this.collections.push(myCollection);
					return _this.setTotalResults(myCollection).then((_flag) => {
						resolve({ flag: _flag, id: myCollection.id });
					});
				}
			});

		});

	}

	/**
	 * Request search request with count=1
	 * Retrieve totalResults response and
	 * Add it on myCollection object
	 * 
	 * @function setTotalResults
	 * @param {object} myCollection 
	 * @returns {Promise}
	 */
	setTotalResults(myCollection) {
		let _this = this;
		// find node search request description
		let _searchRequestDescription = {};
		_searchRequestDescription = _this.findSearchRequestDescription(myCollection);
		if (_searchRequestDescription.length === 0) {
			_.remove(_this.collections, function (_item) {
				return _item.id === myCollection.id;
			});
			Logger.error(`collectionService.setTotalResults - Unable to find searchRequestDescription for collection ${myCollection.id}`);
			return Promise.resolve(false);
		} else {
			// put url in url_search attribute
			myCollection.url_search = this.buildUrlSearch(_searchRequestDescription);

			// create request to retrieve the number of available products
			let _urlCount = _buildSearchRequestWithValue(myCollection.url_search, { count: 1 });
			// and make first search
			return new Promise((resolve, reject) => {
				request(_urlCount, (error, response, body) => {
					Logger.debug('collectionService.setTotalResults(' + myCollection.id + ')');
					Logger.debug('collectionService.setTotalResults - GET urlCount ' + _urlCount);
					if (error) {
						Logger.error('collectionService.setTotalResults - Error on ' + _urlCount + ' : ' + error);
						resolve(false);
					} else if (!body) {
						Logger.warn('collectionService.setTotalResults - No body response for ' + _urlCount);
						myCollection.totalResults = '???';
						resolve(false);
					} else {
						if (myCollection.responseFormatOnSearch.indexOf('atom+xml') > -1) {
							Xml2JsonParser.parse(body, (_result) => {
								let _opensearchTag = Utils.findTagByXmlns(_result, Configuration.opensearch.xmlnsOpensearch);
								Logger.debug(`collectionService.setTotalResults - Total results for ${myCollection.id} = ${_result[_opensearchTag + 'totalResults']}`);
								myCollection.totalResults = _result[_opensearchTag + 'totalResults'];
								if (!myCollection.totalResults || myCollection.totalResults < 1) {
									myCollection.totalResults = '?';
									resolve(false);
								} else {
									resolve(true);
								}
							});
						} else if (myCollection.responseFormatOnSearch.indexOf('geo+json') > -1) {
							let jsonBody = JSON.parse(body);
							if (jsonBody.properties && jsonBody.properties.totalResults) {
								myCollection.totalResults = '' + jsonBody.properties.totalResults;
								resolve(true);
							} else {
								myCollection.totalResults = '?';
								resolve(false);
							}
						}
					}
				});
			});
		}
	}

	/**
	 * Get collection with the given id
	 * 
	 * @function getCollection
	 * @param {string} myId
	 * @returns {object}
	 */
	getCollection(myId) {
		return _.find(this.collections, { id: myId });
	}

	/**
	 * refresh collections
	 * 
	 * @function refresh
	 * @returns {Promise}
	 */
	refresh() {
		let _this = this;
		let _startTime = Date.now();
		Logger.debug('collectionService.refresh()');
		if ((_startTime - this.lastBuild) > Configuration.collectionService.refreshDelay) { // refresh every refreshDelay ms
			Logger.debug('collectionService.refresh : outdated... refresh it !');
			return this.initialize().then(() => {
				// update attribute last build...
				_this.lastBuild = Date.now();
				Logger.debug('collectionService.refresh took ' + (_this.lastBuild - _startTime) + ' ms');
			});
		} else {
			// do nothing
			return Promise.resolve();
		}
	}

	/**
	 * Make search on the given collection
	 * 
	 * @function search
	 * @param {string} myCollectionId
	 * @param {object} myOptions
	 * @returns {object}
	 */
	search(myCollectionId, myOptions = { params: "" }) {

		// get collection from id
		let _collection = this.getCollection(myCollectionId);
		if (typeof _collection === 'undefined') {
			Logger.error('collectionService.search - collection ' + myCollectionId + ' not found !');
			return myOptions.onError('404');
		}
		// map params with those of collection
		let _searchParams = {};
		for (var _param in myOptions.params) {
			if (_collection.parameters[_param]) {
				_searchParams[_collection.parameters[_param]] = myOptions.params[_param];
			}
		}

		let _searchUrlRequest = _buildSearchRequestWithParam(_collection.url_search, _searchParams);
		_searchUrlRequest += this.addMandatoryAttributes(_collection);

		let _startTime = Date.now();
		Logger.info(`Searching for backend with ${_searchUrlRequest}`);
		request(_searchUrlRequest, function (error, response, body) {
			Logger.info(`Time elapsed searching on backend with ${_searchUrlRequest} took ${Date.now() - _startTime} ms`);
			if (!error && response.statusCode == 200) {
				if (_collection.responseFormatOnSearch.indexOf('atom+xml') > -1) {
					Xml2JsonParser.parse(body, myOptions.onSuccess, myOptions.onError);
				} else if (_collection.responseFormatOnSearch.indexOf('geo+json') > -1) {
					myOptions.onSuccess(body);
				}
			} else {
				myOptions.onError('500');
			}
		});
	}

	/**
	 * Add mandatory attributes - for example FEDEO must have recordSchema=om to retrieve EO datas
	 * @see collectionService#search()
	 * 
	 * @function addMandatoryAttributes
	 * @param {object} myCollection 
	 * @returns {string}
	 */
	addMandatoryAttributes(myCollection) {
		let _result = '';
		let _catalog = CatalogService.getCatalog(myCollection.catalogId);
		if (typeof _catalog === 'undefined') {
			Logger.error('collectionService.addMandatoryAttributes - collection ' + myCollectionId + ' not found !');
			return _result;
		}
		if (_catalog.mandatoryAttributes) {
			Object.getOwnPropertyNames(_catalog.mandatoryAttributes).forEach((_key) => {
				_result += '&' + _key + '=' + _catalog.mandatoryAttributes[_key];
			});
		}
		return _result;
	}

	/**
	 * find nodes in osdd with description of search request with these criterias :
	 * 		type=responseFormatOnSearch
	 * 		and get method if exists
	 * @function findSearchRequestDescription
	 * @param {object} myCollection
	 * @returns {array}
	 */
	findSearchRequestDescription(myCollection) {
		let _jsonOSDD = myCollection.osdd;
		let _paramTag = Utils.findTagByXmlns(_jsonOSDD, Configuration.opensearch.xmlnsParameter);
		let _nodesFind = _.filter(_jsonOSDD.Url, function (_item) {
			if (_item['@'].type === myCollection.responseFormatOnSearch) {
				if (_item['@'][_paramTag + ':method']) {
					if (_item['@'][_paramTag + 'method'].toLowerCase() === 'get') {
						return true;
					} else {
						return false
					}
				} else {
					return true;
				}
			} else {
				return false;
			}
		});
		return _nodesFind;
	}

	/**
	 * 
	 * @function buildAdvancedCriteria
	 * @param {object} myParameter
	 * @param {string} myParamTag
	 * @returns {object}
	 */
	buildAdvancedCriteria(myParameter, myParamTag) {
		let _res;
		if (myParameter[myParamTag + 'Option']) {
			// Will be rendered as checkboxes in case when maxOccurs > 1, selectbox otherwise
			// TODO: minOccurs isn't taken into account currently
			let _minOccurs = 0;
			if (parseInt(myParameter['@'].minimum)) {
				_minOccurs = parseInt(myParameter['@'].minimum);
			}
			let _maxOccurs = 1;
			if (parseInt(myParameter['@'].maximum)) {
				_maxOccurs = parseInt(myParameter['@'].maximum);
			}
			_res = {
				"id": myParameter['@'].name,
				"type": "List",
				"possibleValues": [],
				"minOccurs": _minOccurs,
				"maxOccurs": _maxOccurs
			};
			if (Array.isArray(myParameter[myParamTag + 'Option'])) {
				myParameter[myParamTag + 'Option'].forEach((_option) => {
					_res.possibleValues.push(_option['@'].value);
				});
			} else {
				_res.possibleValues.push(myParameter[myParamTag + 'Option']['@'].value);
			}
		} else if (myParameter['@'].minInclusive && myParameter['@'].maxInclusive) {
			_res = {
				"id": myParameter['@'].name,
				"type": myParameter['@'].maximum == 1 ? "Integer" : "Range",
				"rangeMinValue": myParameter['@'].minInclusive,
				"rangeMaxValue": myParameter['@'].maxInclusive
			};
		}
		return _res;
	}

	/**
	 * Build advanced attributes in ngEO WEBC format
	 * 
	 * @function buildAttributes
	 * @param {object} myCollection
	 * @param {array} mySearchRequestDescription
	 * @param {string} myParamTag
	 * @param {array} myAvoidedAttributes
	 * @returns {array}
	 */
	buildAttributes(myCollection, mySearchRequestDescription, myParamTag, myAvoidedAttributes) {
		let _result = [];
		mySearchRequestDescription.forEach((_item) => {
			_item[myParamTag + 'Parameter'].forEach((_parameter) => {
				// if param is not in avoidedAttributes, build it !
				if (myAvoidedAttributes.indexOf(_parameter['@'].name) == -1) {
					if (!myCollection.parameters[_parameter['@'].name]) {
						myCollection.parameters[_parameter['@'].name] = _parameter['@'].name;
					}
					let _newAdvancedCriteria = this.buildAdvancedCriteria(_parameter, myParamTag);
					if (_newAdvancedCriteria) {
						if (!_.find(_result, (_r) => {
							return _r.id === _newAdvancedCriteria.id;
						})) {
							_result.push(_newAdvancedCriteria);
						}
					}
				}
			});
		});
		return _result;
	}

	/**
	 * @function buildKeywords
	 * @param {object} myCollection 
	 * @returns {array}
	 */
	buildKeywords(myCollection) {
		let result = [];
		// TODO : check usage of these keywords
		/*let collectionConf = require(Configuration['collectionPath']);
		collectionConf.forEach((collection) => {
			if (collection.name === myCollection.name) {
				result = collection.keywords || [];
			}
		})*/
		return result;
	}

	/**
	 * Build DatasetSearchInfo response respecting protocol used by current version of WEBC
	 * @function buildDatasetSearchInfo
	 * @param {string} myCollectionId
	 * @returns {object}
	 */
	buildDatasetSearchInfo(myCollectionId) {

		let _collection = this.getCollection(myCollectionId);
		if (!_collection) {
			Logger.error(`Unable to find collection ${myCollectionId}`);
			return null;
		}

		// get catalog
		let _catalog = CatalogService.getCatalog(_collection.catalogId);
		// Avoid geo-spatial & catalog parameters since these are not takin part in advanced attributes
		let _avoidedAttributes = _catalog.avoidedAttributes;

		let _paramTag = Utils.findTagByXmlns(_collection.osdd, Configuration.opensearch.xmlnsParameter);
		let _timeTag = Utils.findTagByXmlns(_collection.osdd, Configuration.opensearch.xmlnsTime);
		let _geoTag = Utils.findTagByXmlns(_collection.osdd, Configuration.opensearch.xmlnsGeo);

		// find parameters in node Url with type="application/atom+xml"
		let _searchRequestDescription = this.findSearchRequestDescription(_collection);

		if (_searchRequestDescription.length === 0) {
			Logger.error(`Unable to find searchRequestDescription for collection ${myCollectionId}`);
			return null;
		}

		// for startDate, endDate, startIndex, count, geom, offset
		// use first request description find in osdd
		let _searchRequestDescriptionFirst = _searchRequestDescription[0];

		let _newParamValues = this.buildParameters(_collection, _searchRequestDescriptionFirst, _paramTag, _timeTag, _geoTag);

		let _outputJson = {
			datasetSearchInfo: {
				datasetId: myCollectionId,
				description: _collection.Description,
				keywords: this.buildKeywords(_collection),
				downloadOptions: [], // TODO
				attributes: this.buildAttributes(_collection, _searchRequestDescription, _paramTag, _avoidedAttributes),
				startDate: _newParamValues.start,
				endDate: _newParamValues.stop,
				startIndex: parseInt(_searchRequestDescriptionFirst['@'].indexOffset),
				countPerPage: _newParamValues.count
			}
		};
		return _outputJson;
	}

	/**
	 * Build parameters, in order to match params from webc to collection search url template
	 * Search in request description, and if not found search on template url request
	 * 
	 * @function buildParameters
	 * @param {object} myCollection 
	 * @param {object} mySearchRequestDescriptionFirst 
	 * @param {string} myParamTag 
	 * @param {string} myTimeTag 
	 * @param {string} myGeoTag 
	 */
	buildParameters(myCollection, mySearchRequestDescriptionFirst, myParamTag, myTimeTag, myGeoTag) {

		let _result = {
			start: null,
			stop: null,
			startIndex: 0,
			count: Configuration.searchResults.defaultCountPerPage,
			bbox: null,
			geom: null
		};

		let _aParameters = [
			{key: 'start', tag: myTimeTag+'start', value: 'minInclusive'},
			{key: 'stop', tag: myTimeTag+'end', value: 'maxInclusive'},
			{key: 'startIndex', tag: 'startIndex'},
			{key: 'count', tag: 'count', value: 'maxInclusive'},
			{key: 'bbox', tag: myGeoTag+'box'},
			{key: 'geom', tag: myGeoTag+'geometry'}
		];

		_aParameters.forEach( (_param) => {
			let _key = _param.key;
			let _tag = _param.tag;
			// find in request description parameters
			let _findInRequestDescription = _.find(mySearchRequestDescriptionFirst[myParamTag + 'Parameter'], (_item) => {
				return _item['@'].value === '{' + _tag + '}';
			});
			if (typeof _findInRequestDescription !== 'undefined') {
				if (_findInRequestDescription['@']) {
					myCollection.parameters[_key] = _findInRequestDescription['@'].name;
					if (_param.value) {
						if (_findInRequestDescription['@'][_param.value]) {
							_result[_key] = _findInRequestDescription['@'][_param.value];
						}
					}
				}
			} else {
				let _keyQuery = _findKeyInSearchRequestWithValue(myCollection.url_search, _tag);
				if (_keyQuery !== '') {
					myCollection.parameters[_key] = _keyQuery;
				}
			}
		});
		return _result;
	}

	/**
	 * Build datasetPouplationMatrix
	 * 
	 * @function buildDataSetPopulationMatrix
	 * @returns {object}
	 */
	buildDataSetPopulationMatrix() {
		let _response = {
			"datasetpopulationmatrix": {
				"criteriaTitles": ["keyword", "mission", "name", "sensor", "productType", "sensorMode"],
				"datasetPopulationValues": []
			}
		};

		let _collectionsOptionsConf = require(Configuration['collectionsOptionsPath']);

		this.collections.forEach((_collection) => {
			let _collectionOptionsConf = _.find(_collectionsOptionsConf, (_item) => {
				return (_collection.id === _item.id)
			});
			if (_collectionOptionsConf) {
				let _keywords = _collectionOptionsConf.keywords || [];
				if (_keywords.length > 0) {
					_keywords.forEach((_key) => {
						// Add some hardcoded values for now just to make things work..
						_response.datasetpopulationmatrix.datasetPopulationValues.push([
							_key,
							"REMOTE",
							_collection.name,
							"REMOTE",
							"REMOTE",
							"REMOTE",
							_collection.id,
							_collection.totalResults
						]);
					});
				} else {
					_response.datasetpopulationmatrix.datasetPopulationValues.push([
						"",
						"REMOTE",
						_collection.name,
						"REMOTE",
						"REMOTE",
						"REMOTE",
						_collection.id,
						_collection.totalResults
					]);
				}
			} else {
				_response.datasetpopulationmatrix.datasetPopulationValues.push([
					"",
					"REMOTE",
					_collection.name,
					"REMOTE",
					"REMOTE",
					"REMOTE",
					_collection.id,
					_collection.totalResults
				]);
			}
		});
		return _response;
	}

	/**
	 * from an array of request description, build url search with concatenation of parameters
	 * 
	 * @function buildUrlSearch
	 * @param {array} mySearchRequestDescription 
	 * @returns {string}
	 */
	buildUrlSearch(mySearchRequestDescription) {
		// no item => empty
		if (mySearchRequestDescription.length === 0) {
			return '';
		}
		// one item > it's easy !
		if (mySearchRequestDescription.length === 1) {
			return mySearchRequestDescription[0]['@'].template;
		}

		// more than 1
		let _result = mySearchRequestDescription[0]['@'].template;

		for (var _i = 1; _i < mySearchRequestDescription.length; _i++) {
			let _template = mySearchRequestDescription[_i]['@'].template;
			let _uri = _template.substring(0, _template.indexOf('?'));
			if (_result.indexOf(_uri) === -1) {
				// not the same uri !!!!
				Logger.error("Not the same URI in request search description");
				Logger.error("URI 1 : " + _result.substring(0, _result.indexOf('?')));
				Logger.error("URI 2 : " + _uri);
				break;
			}
			let _query = _template.substring(_template.indexOf('?') + 1);
			let _itemsOfQuery = _query.split('&');
			for (var _j = 0; _j < _itemsOfQuery.length; _j++) {
				let _itemOfQuery = _itemsOfQuery[_j];
				if (_result.indexOf(_itemOfQuery) === -1) {
					_result += '&' + _itemOfQuery;
				}
			}
		}
		return _result;
	}

	/**
	 * @function convertResponse
	 * @param {string} myCollectionId 
	 * @param {object} myResult
	 * @returns {object}
	 */
	convertResponse(myCollectionId, myResult) {
		let _result = null;
		let _collection = this.getCollection(myCollectionId);
		
		if (_collection.responseFormatOnSearch.indexOf('atom+xml') > -1) {
			_result = BackEndConfigurationConverter.convertSearchResponse(myResult, myCollectionId);
			// Add browse information for converted collection
			BrowseService.addBrowseInfo(myCollectionId, _result);
			// Add originDatasetId for each features (used to retrieve a product from catalog or shopcart)
			_result = _addOriginDatasetId(myCollectionId, _result);
			_result.type = 'FeatureCollection';
		} else if (_collection.responseFormatOnSearch.indexOf('geo+json') > -1) {
			_result = this.convertSearchResponseFromGeoJson(myResult, _collection);
		}
		if (!_result) {
			return null;
		}
		return _result;
	}

	/**
	 * @function convertSearchResponseFromGeoJson
	 * @param {object} myResult 
	 * @param {object} myCollection 
	 * @returns {object}
	 */
	convertSearchResponseFromGeoJson(myResult, myCollection) {
		return myResult;
	}

}

module.exports = new CollectionService();