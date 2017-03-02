let _ = require('lodash');
let logger = require('utils/logger');
let Configuration = require('config');

/**
 * Browse service adding the wms/wmts information to products
 */
class BrowseService {

	constructor() {
		this.browseConfiguration = require(Configuration['browseConfigurationPath']);
	}
	/**
	 * Add browse information for each feature related to the given collection identifier
	 */
	addBrowseInfo(collectionId, fc) {
		let collectionBrowseConf = _.find(this.browseConfiguration, {id: collectionId});
		if ( collectionBrowseConf ) {
			fc.features.forEach((feature) => {
				// Add a single browse for now
				let browseInfo = [{
					BrowseInformation: {
						fileName: {
							ServiceReference: {
								'@href': collectionBrowseConf.url,
								'@title': collectionId
							}
						},
						// Not used in WEBC anyway, tbr
						// 'referenceSystemIdentifier': {
						// 	'#text': 'EPSG:4326',
						// 	'@codeSpace': 'EPSG'
						// },
						'type': 'QUICKLOOK'
					}
				}];
				feature.properties.EarthObservation.result.EarthObservationResult.browse = browseInfo;
			});
		} else {
			logger.warn(`No browse configuration for ${collectionId}`);
		}
	}
}

module.exports = new BrowseService();