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
		// Create catalog object from conf
		catalogsConf.forEach((catalogConf) => {
			let catalog = new Catalog(catalogConf.url, catalogConf.name);
			catalog.fake = catalogConf.fake;
			this.catalogs.push(catalog);
		});
	}

	/**
	 * Get catalog with the given id
	 * @function getCatalog
	 * @param {String} id
	 */
	getCatalog(id) {
		return _.find(this.catalogs, {id: id});
	}

	/**
	 * Get catalog totalResults = number of collections
	 * @function getTotal
	 * @param {function} cbAfterFunction
	 */
	getTotal(cbAfterFunction) {
		let nbMaxCatalog = this.catalogs.length;
		let nbCatalog = 0;
		this.catalogs.forEach((catalog) => {
			// TODO Remove it after demo
			if (catalog.fake) {
				catalog.totalResults = 1;
				nbCatalog++;
			} else {
				// 
				request(catalog.url, (error, response, body) => {
					Xml2JsonParser.parse(body, (result) => {
						catalog.totalResults = result['os:totalResults'];
						nbCatalog++;
						if (nbCatalog == nbMaxCatalog) {
							cbAfterFunction();
						}
					});
				});
			}
		})
	}

	/**
	 * populate catalog with collections
	 * @function populate
	 * @param {function} cbAfterfunction 
	 */
	populate(cbAfterfunction) {
		let nbCatalogsComplete = 0;
		let that = this;

		let cbCatalogComplete = function() {
			nbCatalogsComplete++;
			if (nbCatalogsComplete == that.catalogs.length) {
				cbAfterfunction();
			}
		}
		this.catalogs.forEach((catalog) => {
			if (!catalog.fake) {
				catalog.collectionsSchema = [];
				that.getByLoopCollectionsForCatalog(catalog, 1, cbCatalogComplete);
			} else {
				cbCatalogComplete();
			}
		});
	}

	/**
	 * Loop for getting collections for one catalog
	 * step = 50
	 * @function getByLoopCollectionsForCatalog
	 * @param {object} catalog 
	 * @param {number} begin 
	 * @param {function} callback 
	 */
	getByLoopCollectionsForCatalog(catalog, begin, callback) {
		let that = this;
		request(catalog.url + '&startRecord=' + begin, (error, response, body) => {
			Logger.debug('>> request on ' + catalog.url + '&startRecord='+begin);
			if (!body) {
				return;
			}
			Xml2JsonParser.parse(body, (result) => {
				catalog.collectionsSchema.push(result);
				let max = (catalog.totalResults < 200) ? catalog.totalResults : 200;
				//let max = catalog.totalResults;
				if (begin+50 < max) {
					that.getByLoopCollectionsForCatalog(catalog, begin+50, callback);
				} else {
					callback();
				}
			});
		});
	}

}

module.exports = new CatalogService();