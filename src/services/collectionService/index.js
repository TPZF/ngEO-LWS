let _ = require('lodash');
let request = require('request');
let Promise = require('promise');

let Collection = require('./collection');
let Xml2JsonParser = require('utils/xml2jsonParser');
let Logger = require('utils/logger');
let Configuration = require('config');
let CatalogService = require('../catalogService');

let fakeCollectionName = 'SENTINEL-1 Products';
let fakeCollectionId = 'SENTINEL-1-PRODUCTS';
let fakeCollectionUrlOsdd = 'http://fedeo.esa.int/opensearch/description.xml?parentIdentifier=EOP:ESA:SCIHUB&amp;platform=SENTINEL-1&amp;sensorType=RADAR&amp;startDate=2014-04-03T00:00:00Z&amp;endDate=';
let fakeCollectionUrlSearch = 'https://fedeo.esa.int/opensearch/request?httpAccept=application%2Fatom%2Bxml&parentIdentifier=EOP:ESA:SCIHUB&startPage={startPage?}&startRecord={startIndex?}&maximumRecords={count?}&uid={geo:uid?}&startDate={time:start?}&endDate={time:end?}&bbox={geo:box?}&geometry={geo:geometry?}&creationDate={eo:creationDate?}&platform=SENTINEL-1&polarisationChannels={eo:polarisationChannels?}&orbitDirection={eo:orbitDirection?}&orbitNumber={eo:orbitNumber?}&productType={eo:productType?}&sensorMode={eo:sensorMode?}&processingLevel={eo:processingLevel?}&swathIdentifier={eo:swathIdentifier?}&username=' + Configuration.fedeo.username + '&password=' + Configuration.fedeo.password + '&recordSchema={sru:recordSchema?}&name={geo:name?}&lat={geo:lat?}&lon={geo:lon?}&radius={geo:radius?}';

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
 * @param {object} params
 * @private
 */
let _buildSearchRequestWithParam = function(myUrl, params) {
	let result = '';
	let uri = myUrl.substring(0, myUrl.indexOf('?'));
	result += uri + '?';
	myUrl = myUrl.substring(myUrl.indexOf('?')+1);
	let itemsOfUrl = myUrl.split('&');
	for (var i=0; i< itemsOfUrl.length; i++) {
		if (itemsOfUrl[i].indexOf('=') === -1) {
			result += itemsOfUrl[i] + '&';
		} else {
			let itemsOfParam = itemsOfUrl[i].split('=');
			if (itemsOfParam[1].indexOf('{') === -1) {
				result += itemsOfUrl[i] + '&';
			} else {
				let param = itemsOfParam[0];
				if (params[param]) {
					result += itemsOfParam[0] + '=' + params[param] + '&';
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
 * @param {object} params 
 * @private
 */
let _buildSearchRequestWithValue = function(myUrl, params) {
	let result = '';
	let uri = myUrl.substring(0, myUrl.indexOf('?'));
	result += uri + '?';
	myUrl = myUrl.substring(myUrl.indexOf('?')+1);
	let itemsOfUrl = myUrl.split('&');
	for (var i=0; i< itemsOfUrl.length; i++) {
		if (itemsOfUrl[i].indexOf('=') === -1) {
			result += itemsOfUrl[i] + '&';
		} else {
			let itemsOfParam = itemsOfUrl[i].split('=');
			if (itemsOfParam[1].indexOf('{') === -1) {
				result += itemsOfUrl[i] + '&';
			} else {
				let param = itemsOfParam[1].substring(1,itemsOfParam[1].length - 1);
				if (param.indexOf('?')) {
					param = param.substr(0, param.length - 1);
				}
				if (params[param]) {
					result += itemsOfParam[0] + '=' + params[param] + '&';
				}
			}
		}
	}
	return result;
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
		let startTime = Date.now();
		// last build of this service -> used to refresh collections every refreshDelay (see refresh())
		this.lastBuild = startTime;
		// initialize service
		this.initialize().then(() => {
			Logger.info('collectionService.initialize() complete in ' + (Date.now() - startTime) + ' ms');
		});
	}

	/**
	 * @function initialize
	 * @returns {Promise}
	 */
	initialize() {
		Logger.debug('collectionService.initialize()');
		let startTime = Date.now();
		let _this = this;
		// reinitialize catalogs with active attribute to true...
		CatalogService.reinitialize();
		// for each catalog -> set Total results = count of collections
		let aPromisesSetTotalResults = [];
		CatalogService.getCatalogs(true).forEach((catalog) => {
			let p = CatalogService.setTotalResults(catalog);
			aPromisesSetTotalResults.push(p);
		});
		return Promise.all(aPromisesSetTotalResults).then(() => {
			Logger.debug('collectionService.initialize - set total results takes ' + (Date.now() - startTime) + ' ms');
			startTime = Date.now();
			// for each catalog -> set collections schema
			let aPromisesSetCollectionsSchema = [];
			CatalogService.getCatalogs(true).forEach((catalog) => {
				if (!catalog.fake) {
					let p = CatalogService.setCollectionsSchema(catalog);
					aPromisesSetCollectionsSchema.push(p);
				}
			});
			return Promise.all(aPromisesSetCollectionsSchema);
		}).then(() => {
			Logger.debug('collectionService.initialize - set collectionsSchemas takes ' + (Date.now() - startTime) + ' ms');
			startTime = Date.now();
			// for each catalog -> add collections
			let aPromisesAddCollectionsFromCatalog = [];
			CatalogService.getCatalogs(true).forEach((catalog) => {
				let p = _this.addCollectionsFromCatalog(catalog);
				aPromisesAddCollectionsFromCatalog.push(p);
			});
			return Promise.all(aPromisesAddCollectionsFromCatalog);
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
		Logger.debug('collectionService.addCollectionsFromCatalog(' + myCatalog.name + ') *****');
		let _this = this;
		/***********************/
		if (myCatalog.fake) {
			let maFakeCollection = new Collection(fakeCollectionId, fakeCollectionUrlOsdd, fakeCollectionName);
			// add other datas
			return Promise.resolve(_this.getOsddCollection(maFakeCollection));
		}
		/***********************/
		if (!myCatalog.collectionsSchema) {
			myCatalog.active = false;
			return Promise.resolve();
		} else {
			let aPromisesCollectionSchema = [];
			myCatalog.collectionsSchema.forEach((collectionSchema) => {
				let p = _this.populateFromCollectionSchema(collectionSchema);
				aPromisesCollectionSchema.push(p);
			});
			return Promise.all(aPromisesCollectionSchema);
		}
	}

	/**
	 * From each entry in myCollectionSchema
	 * 	Get OSDD for collection
	 * 
	 * @function populateFromCollectionSchema
	 * @param {object} myCollectionSchema
	 * @returns {Promise}
	 */
	populateFromCollectionSchema(myCollectionSchema) {
		let _this = this;
		if (myCollectionSchema.entry) {
			if (!Array.isArray(myCollectionSchema.entry)) {
				myCollectionSchema.entry = [myCollectionSchema.entry];
			}
			let aPromisesGetOsddCollection = [];
			myCollectionSchema.entry.forEach((oneEntry) => {
				// find url for getting opensearch description
				let urlOSDD = _.find(oneEntry.link, function(lien) {
					return (lien['@'].rel === 'search' && lien['@'].type === 'application/opensearchdescription+xml');
				});
				let url = urlOSDD ? urlOSDD['@'].href : oneEntry.id;
				// find id
				let idCollection = oneEntry[Configuration.opensearch.identifier];
				if (!_.find(_this.collections, function(item) {return item.id === idCollection})) {
					// set collection object
					let maCollection = new Collection(idCollection, url, oneEntry.title);
					// add other datas
					aPromisesGetOsddCollection.push(_this.getOsddCollection(maCollection));
				}
			});
			return Promise.all(aPromisesGetOsddCollection).then((values) => {
				Logger.debug('collectionService.populateFromCollectionSchema(' + myCollectionSchema.id + ')');
				if (values && Array.isArray(values)) {
					values.forEach((val) => {
						if (!val.flag) {
							Logger.warn(`collectionService.populateFromCollectionSchema - Remove myCollection ${val.id} because no results`);
							_.remove(_this.collections, function(item) {
								return item.id === val.id;
							});
						}
					});
				}
			});
		} else {
			Logger.error(`collectionService.populateFromCollectionSchema - Unable to find collectionsSchema for catalog ${catalog.name}`);
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
		return new Promise((resolve,reject) => {
			let startTime = Date.now();
			request(myCollection.url, (error, response, body) => {
				Logger.debug('collectionService.getOsddCollection(' + myCollection.id + ')');
				Logger.debug('collectionService.getOsddCollection - GET ' + myCollection.url);
				if (error) {
					Logger.error('collectionService.getOsddCollection - Unable to get osdd for collection ' + myCollection.id);
					resolve({flag: false, id: myCollection.id});
				} else if (!body) {
					Logger.error('collectionService.getOsddCollection - Unable to get body for collection ' + myCollection.id);
					resolve({flag: false, id: myCollection.id});
				} else {
					Xml2JsonParser.parse(body, (result) => {
						Logger.debug('collectionService.getOsddCollection - osdd retrieve for collection ' + myCollection.id);
						// put result in osdd attribute
						myCollection.osdd = result;
					});
					_this.collections.push(myCollection);
					return _this.setTotalResults(myCollection).then((flag)=> {
						resolve({flag: flag, id: myCollection.id});
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
		let searchRequestDescription = {};
		/**********************/
		if (myCollection.id.indexOf(fakeCollectionId) === 0) {
			searchRequestDescription = {'@' : { template : fakeCollectionUrlSearch }};
		} else {
		/**********************/
			searchRequestDescription = _this.findSearchRequestDescription(myCollection.id);
		/**********************/
		}
		/**********************/
		if (!searchRequestDescription) {
			_.remove(_this.collections, function(item) {
				return item.id === myCollection.id;
			});
			Logger.error(`collectionService.setTotalResults - Unable to find searchRequestDescription for collection ${myCollection.id}`);
			return Promise.resolve(false);
		} else {
			// put url in url_search attribute
			myCollection.url_search = searchRequestDescription['@'].template;
			// create request to retrieve the number of available products
				let urlCount = _buildSearchRequestWithValue(myCollection.url_search, {count: 1});
			// and make first search
			return new Promise((resolve,reject) => {
				request(urlCount, (error, response, body) => {
					Logger.debug('collectionService.setTotalResults(' + myCollection.id + ')');
					Logger.debug('collectionService.setTotalResults - GET urlCount ' + urlCount);
					if (error) {
						Logger.error('collectionService.setTotalResults - Error on ' + urlCount + ' : ' + error);
						resolve(false);
					} else if (!body) {
						Logger.warn('collectionService.setTotalResults - No body response for ' + urlCount);
						myCollection.totalResults = '???';
						resolve(false);
					} else {
						Xml2JsonParser.parse(body, (result) => {
							let endTime = Date.now();
							Logger.debug(`collectionService.setTotalResults - Total results for ${myCollection.id} = ${result['os:totalResults']}`);
							myCollection.totalResults = result['os:totalResults'];
							if (!myCollection.totalResults || myCollection.totalResults < 1) {
								myCollection.totalResults = '?';
								resolve(false);
							} else {
								resolve(true);
							}
						});
					}
				});
			});
		}
	}

	/**
	 * Get collection with the given id
	 */
	getCollection(id) {
		return _.find(this.collections, {id: id});
	}

	/**
	 * refresh collections
	 * 
	 * @function refresh
	 * @returns {Promise}
	 */
	refresh() {
		let _this = this;
		let startTime = Date.now();
		Logger.debug('collectionService.refresh()');
		if ((startTime - this.lastBuild) > Configuration.collectionService.refreshDelay) { // refresh every refreshDelay ms
			Logger.debug('collectionService.refresh : outdated... refresh it !');
			return this.initialize().then(() => {
				// update attribute last build...
				_this.lastBuild = Date.now();
				Logger.debug('collectionService.refresh took ' + (_this.lastBuild - startTime) + ' ms');
			});
		} else {
			// do nothing
			return Promise.resolve();
		}
	}

	/**
	 * Make search on the given collection
	 */
	search(collectionId, options = { params: "" }){

		let collection = this.getCollection(collectionId);

		// map params with those of collection
		let searchParams = {};
		for (var param in options.params) {
			if (collection.parameters[param]) {
				searchParams[collection.parameters[param]] = options.params[param];
			}
		}

		let searchUrlRequest = _buildSearchRequestWithParam(collection.url_search, searchParams);
		if (collection.id === fakeCollectionId) {
			searchUrlRequest += 'recordSchema=om';
		}
		let startTime = Date.now();
		Logger.info(`Searching for backend with ${searchUrlRequest}`);
		request(searchUrlRequest, function (error, response, body) {
			Logger.info(`Time elapsed searching on backend with ${searchUrlRequest} took ${Date.now() - startTime} ms`);
			if (!error && response.statusCode == 200) {
				Xml2JsonParser.parse(body, options.onSuccess, options.onError);
			} else {
				options.onError('Error while searching on ' + searchUrlRequest);
			}
		});
	}

	/**
	 * find description of search request in osdd with criterias as :
	 * 		type='application/atom+xml'
	 * 		and get method if exists
	 * @function findSearchRequestDescription
	 * @param {*} collectionId 
	 */
	findSearchRequestDescription(collectionId) {
		let jsonOSDD = this.getCollection(collectionId).osdd;
		let paramTag = this.findTagByXmlns(jsonOSDD, Configuration.opensearch.xmlnsParameter);
		let nodeFind = _.find(jsonOSDD.Url, function(item) {
			if (item['@'].type === 'application/atom+xml') {
				if (item['@'][paramTag+':method']) {
					if (item['@'][paramTag+'method'].toLowerCase() === 'get') {
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
		return nodeFind;
	}

	/**
	 * @function findTagByXmlns
	 * @param {string} jsonOSDD 
	 * @param {string} pathXmlns
	 */
	findTagByXmlns(jsonOSDD, pathXmlns) {
		let result = '';
		for (var node in jsonOSDD['@']) {
			if (jsonOSDD['@'][node].indexOf(pathXmlns) >= 0) {
				result = node.split(':')[1] + ':';
				break;
			}
		}
		return result;
	}


	/**
	 * Convert backend XML format to ngEO WEBC format
	 * 
	 * NB: Only range & list types are handled currently
	 */
	buildParameter(parameter, paramTag) {
		let res;
		if (parameter[paramTag + 'Option']) {
			// Will be rendered as checkboxes in case when maxOccurs > 1, selectbox otherwise
			// TODO: minOccurs isn't taken into account currently
			let minOccurs = 0;
			if (parseInt(parameter['@'].minimum)) {
				minOccurs = parseInt(parameter['@'].minimum);
			}
			let maxOccurs = 1;
			if (parseInt(parameter['@'].maximum)) {
				maxOccurs = parseInt(parameter['@'].maximum);
			}
			res = {
				"id": parameter['@'].name,
				"type": "List",
				"possibleValues": [],
				"minOccurs": minOccurs,
				"maxOccurs": maxOccurs
			};
			if (Array.isArray(parameter[paramTag + 'Option'])) {
				parameter[paramTag + 'Option'].forEach( (option) => {
					res.possibleValues.push(option['@'].value);
				} );
			} else {
				res.possibleValues.push(parameter[paramTag + 'Option']['@'].value);
			}
		} else if ( parameter['@'].minInclusive && parameter['@'].maxInclusive ) {
			res = {
				"id": parameter['@'].name,
				"type": parameter['@'].maximum == 1 ? "Integer" : "Range",
				"rangeMinValue": parameter['@'].minInclusive,
				"rangeMaxValue": parameter['@'].maxInclusive
			};
		}
		return res;
	}

	/**
	 * Build advanced attributes in ngEO WEBC format
	 */
	buildAttributes(myCollection, searchRequestDescription, paramTag, omittedParameters) {
		let result = [];
		searchRequestDescription[paramTag+'Parameter'].forEach( (parameter) => {
			if (omittedParameters.indexOf(parameter['@'].name) == -1) {
				if (!myCollection.parameters[parameter['@'].name]) {
					myCollection.parameters[parameter['@'].name] = parameter['@'].name;
				}
				let myParameter = this.buildParameter(parameter, paramTag);
				if (myParameter) {
					result.push(myParameter);
				}
			}
		} );
		return result;
	}

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
	 * Build datasetInfo response respecting protocol used by current version of WEBC
	 */
	buildResponse(datasetId) {

		// Avoid geo-spatial & catalog parameters since these are not takin part in advanced attributes
		let omittedParameters = ["count", "offset", "bbox", "grel", "start", "end", "trel", "availabilityTime"];
		// from FEDEO
		omittedParameters.push("maximumRecords");
		omittedParameters.push("startPage");
		omittedParameters.push("startRecord");
		omittedParameters.push("startDate");
		omittedParameters.push("endDate");


		let myCollection = this.getCollection(datasetId);
		if (!myCollection) {
			Logger.error(`Unable to find collection ${datasetId}`);
			return null;
		}
		let paramTag = this.findTagByXmlns(myCollection.osdd, Configuration.opensearch.xmlnsParameter);
		let timeTag = this.findTagByXmlns(myCollection.osdd, Configuration.opensearch.xmlnsTime);

		// find parameters in node Url with type="application/atom+xml"
		let searchRequestDescription = this.findSearchRequestDescription(datasetId);

		if (!searchRequestDescription) {
			Logger.error(`Unable to find searchRequestDescription for collection ${datasetId}`);
			return null;
		}

		// start date
		let startDateConf = _.find(searchRequestDescription[paramTag+'Parameter'], function (item) {
			return item['@'].value === '{' + timeTag + 'start}';
		});
		let startDate = null;
		if (startDateConf) {
			myCollection.parameters.start = startDateConf['@'].name;
			if (startDateConf['@'] && startDateConf['@'].minInclusive) {
				startDate = startDateConf['@'].minInclusive;
			}
		}

		// end date
		let stopDateConf = _.find(searchRequestDescription[paramTag+'Parameter'], function (item) {
			return item['@'].value === '{' + timeTag + 'end}';
		});
		let endDate = null;
		if (stopDateConf) {
			myCollection.parameters.stop = stopDateConf['@'].name;
			if (stopDateConf['@'] && stopDateConf['@'].maxInclusive) {
				endDate = stopDateConf['@'].maxInclusive;
			}
		}

		// startIndex
		let startIndexConf = _.find(searchRequestDescription[paramTag+'Parameter'], function (item) {
			return item['@'].value === '{startIndex}';
		});
		if (startIndexConf) {
			myCollection.parameters.startIndex = startIndexConf['@'].name;
		}

		// count
		let countConf = _.find(searchRequestDescription[paramTag+'Parameter'], function (item) {
			return item['@'].value === '{count}';
		});
		if (countConf) {
			myCollection.parameters.count = countConf['@'].name;
		}
		
		// geom
		let geomConf = _.find(searchRequestDescription[paramTag+'Parameter'], function (item) {
			return item['@'].value === '{geo:geometry}';
		});
		if (geomConf) {
			myCollection.parameters.geom = geomConf['@'].name;
		}

		let outputJson = {
			datasetSearchInfo: {
				datasetId: datasetId,
				description: myCollection.Description,
				keywords: this.buildKeywords(myCollection),
				downloadOptions: [], // TODO
				attributes: this.buildAttributes(myCollection, searchRequestDescription, paramTag, omittedParameters),
				startDate: startDate,
				endDate: endDate,
				startIndex: parseInt(searchRequestDescription['@'].indexOffset)
			}
		};
		return outputJson;
	}

	buildDataSetPopulationMatrix() {
		let response = {
			"datasetpopulationmatrix": {
				"criteriaTitles": ["keyword", "mission", "name", "sensor", "productType", "sensorMode"],
				"datasetPopulationValues": []
			}
		};

		let collectionsOptionsConf = require(Configuration['collectionsOptionsPath']);

		this.collections.forEach((collection) => {
			let myCollectionOptionsConf = _.find(collectionsOptionsConf, (collectionOptionsConf) => {
				return (collection.name === collectionOptionsConf.name)
			});
			if (myCollectionOptionsConf) {
				let keywords = myCollectionOptionsConf.keywords || [];
				if (keywords.length > 0) {
					keywords.forEach((key) => {
						// Add some hardcoded values for now just to make things work..
						response.datasetpopulationmatrix.datasetPopulationValues.push([
							key,
							"REMOTE",
							collection.name,
							"REMOTE",
							"REMOTE",
							"REMOTE",
							collection.id,
							collection.totalResults
						]);
					});
				} else {
					response.datasetpopulationmatrix.datasetPopulationValues.push([
						"",
						"REMOTE",
						collection.name,
						"REMOTE",
						"REMOTE",
						"REMOTE",
						collection.id,
						collection.totalResults
					]);
				}
			} else {
				response.datasetpopulationmatrix.datasetPopulationValues.push([
					"",
					"REMOTE",
					collection.name,
					"REMOTE",
					"REMOTE",
					"REMOTE",
					collection.id,
					collection.totalResults
				]);
			}
		});
		return response;		
	}
	
}

module.exports = new CollectionService();