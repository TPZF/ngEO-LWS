let _ = require('lodash');
let request = require('request');

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
 * Collection service designed to manage the available collections on different backends
 * Currently initialized with configuration file, but in future will be probably absorbed by Catalog object
 */
class CollectionService {

	/**
	 * 
	 */
	constructor() {
		
		let thisService = this;
		this.collections = [];
		let startTime = Date.now();

		let cbAfterCatalogsPopulate = function() {

			let endTime = Date.now();
			Logger.info('Time to get populate for all catalogs : ' + (endTime - startTime) + ' ms');
			startTime = endTime;

			CatalogService.catalogs.forEach((catalog) => {
				if (catalog.fake) {
					let maFakeCollection = new Collection(fakeCollectionId, fakeCollectionUrlOsdd, fakeCollectionName);
					thisService.collections.push(maFakeCollection);
					// add other datas
					thisService.populateCollection(maFakeCollection);
				}
				if (!catalog.collectionsSchema) { return;}
				catalog.collectionsSchema.forEach((collectionSchema) => {
					if (collectionSchema && collectionSchema.entry) {
						if (!Array.isArray(collectionSchema.entry)) {
							collectionSchema.entry = [collectionSchema.entry];
						}
						collectionSchema.entry.forEach((oneEntry) => {
							// find url for getting opensearch description
							let urlOSDD = _.find(oneEntry.link, function(lien) {
								return (lien['@'].rel === 'search' && lien['@'].type === 'application/opensearchdescription+xml');
							});
							let url = urlOSDD ? urlOSDD['@'].href : oneEntry.id;
							// find id
							let idCollection = oneEntry[Configuration.opensearch.identifier];
							if (!_.find(thisService.collections, function(item) {return item.id === idCollection})) {
								// set collection object
								let maCollection = new Collection(idCollection, url, oneEntry.title);
								thisService.collections.push(maCollection);
								// add other datas
								thisService.populateCollection(maCollection);
							}
						});
					} else {
						Logger.error(`Unable to find collectionsSchema for catalog ${catalog.name}`);
					}
				});
			});
		}

		let cbAfterCatalogsGetTotal = function(catalogs) {
			let endTime = new Date().getTime();
			Logger.info('Time to get total results for all catalogs : ' + (endTime - startTime) + ' ms');
			startTime = endTime;
			CatalogService.populate(cbAfterCatalogsPopulate);

		};
		CatalogService.getTotal(cbAfterCatalogsGetTotal);
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
		let service = this;
		let startTime = Date.now();
		Logger.debug('>> populateCollection(' + collection.id + ')');
		// Get osdd
		request(collection.url, (error, response, body) => {
			Logger.debug('>> request on ' + collection.url);
			Xml2JsonParser.parse(body, (result) => {
				let endTime = Date.now();
				Logger.info('Time to request and parse collection : ' + (endTime - startTime) + ' ms');
				// put result in osdd attribute
				collection.osdd = result;
				let searchRequestDescription = {};

				if (collection.id.indexOf(fakeCollectionId) === 0) {
					searchRequestDescription = {'@' : { template : fakeCollectionUrlSearch }};
				} else {
					searchRequestDescription = service.findSearchRequestDescription(collection.id);
				}
				// find node search request
				if (searchRequestDescription) {
					// put url in url_search attribute
					collection.url_search = searchRequestDescription['@'].template;
					// create request to retrieve the number of available products
					let urlCount = service.buildSearchRequestWithValue(collection.url_search, {count: 1});
					// disable unauthorized tls
					process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
					// and make first search
					request(urlCount, (error, response, body) => {
						Logger.debug('>> request on ' + urlCount);
						if (!body) {
							Logger.warn(`Remove collection ${collection.id} because no body response for totalResults`);
							/*_.remove(service.collections, function(item) {
								return item.id === collection.id;
							});*/
							collection.totalResults = '???';
							return;
						}
						Xml2JsonParser.parse(body, (result) => {
							Logger.debug(`Total results for ${collection.id} = ${result['os:totalResults']}`);
							collection.totalResults = result['os:totalResults'];
							// remove this collection from array if no results
							if (!collection.totalResults || collection.totalResults < 1) {
								collection.totalResults = '?';
								/*
								Logger.info(`Remove collection ${collection.id} because no results`);
								_.remove(service.collections, function(item) {
									return item.id === collection.id;
								});
								*/
							}
						});
					});
				} else {
					// remove this collection from array if no searchRequestDescription
					_.remove(service.collections, function(item) {
						return item.id === collection.id;
					});
					Logger.error(`Unable to find searchRequestDescription for collection ${collection.id}`);
				}
			});
		});
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

		let searchUrlRequest = this.buildSearchRequestWithParam(collection.url_search, searchParams);
		// TODO remove it as soon as possible and find an other way
		if (collection.id.indexOf(fakeCollectionId) !== -1) {
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
	 * Make an osdd request on the given collection
	 */
	info(collectionId, options) {
		let collectionUrl = this.getCollection(collectionId).url_osdd ? this.getCollection(collectionId).url_osdd : this.getCollection(collectionId).url;
		request(collectionUrl, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				Xml2JsonParser.parse(body, options.onSuccess, options.onError);
			} else {
				options.onError('Error while making request ' + collectionUrl);
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
	 * findTagByXmlns
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
	 * sample of myUrl
	 * http://fedeo.esa.int/opensearch/request?httpAccept=application%2Fsru%2Bxml&amp;parentIdentifier=SMOS_Open&amp;query={searchTerms?}&amp;maximumRecords={count?}&amp;startRecord={startIndex?}&amp;startPage={startPage?}&amp;bbox={geo:box?}&amp;geometry={geo:geometry?}&amp;uid={geo:uid?}&amp;lat={geo:lat?}&amp;lon={geo:lon?}&amp;radius={geo:radius?}&amp;name={geo:name?}&amp;startDate={time:start?}&amp;endDate={time:end?}&amp;orbitNumber={eo:orbitNumber?}&amp;acquisitionStation={eo:acquisitionStation?}&amp;track={eo:track?}&amp;frame={eo:frame?}&amp;cloudCover={eo:cloudCover?}&amp;illuminationAzimuthAngle={eo:illuminationAzimuthAngle?}&amp;illuminationElevationAngle={eo:illuminationElevationAngle?}&amp;productType={eo:productType?}&amp;instrument={eo:instrument?}&amp;sensorType={eo:sensorType?}&amp;productionStatus={eo:productionStatus?}&amp;acquisitionType={eo:acquisitionType?}&amp;orbitDirection={eo:orbitDirection?}&amp;swathIdentifier={eo:swathIdentifier?}&amp;processingCenter={eo:processingCenter?}&amp;sensorMode={eo:sensorMode?}&amp;acquisitionSubType={eo:acquisitionSubType?}&amp;polarisationMode={eo:polarisationMode?}&amp;polarisationChannels={eo:polarisationChannels?}&amp;recordSchema={sru:recordSchema?}
	 * find params in myUrl by {value?}
	 * and replace the value
	 * @function buildSearchRequestWithValue
	 * @param {string} myUrl 
	 * @param {object} params 
	 */
	buildSearchRequestWithValue(myUrl, params) {
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
	}

	/**
	 * sample of myUrl
	 * http://fedeo.esa.int/opensearch/request?httpAccept=application%2Fsru%2Bxml&amp;parentIdentifier=SMOS_Open&amp;query={searchTerms?}&amp;maximumRecords={count?}&amp;startRecord={startIndex?}&amp;startPage={startPage?}&amp;bbox={geo:box?}&amp;geometry={geo:geometry?}&amp;uid={geo:uid?}&amp;lat={geo:lat?}&amp;lon={geo:lon?}&amp;radius={geo:radius?}&amp;name={geo:name?}&amp;startDate={time:start?}&amp;endDate={time:end?}&amp;orbitNumber={eo:orbitNumber?}&amp;acquisitionStation={eo:acquisitionStation?}&amp;track={eo:track?}&amp;frame={eo:frame?}&amp;cloudCover={eo:cloudCover?}&amp;illuminationAzimuthAngle={eo:illuminationAzimuthAngle?}&amp;illuminationElevationAngle={eo:illuminationElevationAngle?}&amp;productType={eo:productType?}&amp;instrument={eo:instrument?}&amp;sensorType={eo:sensorType?}&amp;productionStatus={eo:productionStatus?}&amp;acquisitionType={eo:acquisitionType?}&amp;orbitDirection={eo:orbitDirection?}&amp;swathIdentifier={eo:swathIdentifier?}&amp;processingCenter={eo:processingCenter?}&amp;sensorMode={eo:sensorMode?}&amp;acquisitionSubType={eo:acquisitionSubType?}&amp;polarisationMode={eo:polarisationMode?}&amp;polarisationChannels={eo:polarisationChannels?}&amp;recordSchema={sru:recordSchema?}
	 * find params in myUrl by param in each param={value?}
	 * and replace the value
	 * @function buildSearchRequestWithParam
	 * @param {string} myUrl 
	 * @param {object} params 
	 */
	buildSearchRequestWithParam(myUrl, params) {
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
	}
}

module.exports = new CollectionService();