let _ = require('lodash');
let logger = require('utils/logger');
let Configuration = require('config');
let Utils = require('utils/utils');

/**
 * Browse service adding the wms/wmts information to products
 */
class BrowseService {

	constructor() {
		this.browseConfiguration = require(Configuration['browseConfigurationPath']);
	}

	/**
	 * Test if the extracted from feature property can be applicable to configuration one
	 * NB: '*' and 'no property' at all would mean that any value is accepted
	 * 
	 * @param confPattern 
	 * 		Single pattern coming from browseConfiguration.json
	 * @param featureProps 
	 * 		Pattern extracted from feature
	 * @param prop
	 * 		Existing property: "plateformId", "serialId", "shortName", "operationalMode", "productType"
	 * @returns true/false
	 * 		If the featureProps applies to the given confPattern
	 */
	isApplied(confPattern, featureProps, prop) {
		return !confPattern[prop] || confPattern[prop] == "*" || confPattern[prop] == featureProps[prop];
	}

	/**
	 * Extract properties used as a pattern to determine the browse url
	 * 
	 * @param feature 
	 */
	extractFeatureProps(feature) {
		let properties = null;
		if (feature.properties.EarthObservation) {
			properties = {
				"plateformId": Utils.getFromPath(feature, 'properties.EarthObservation.procedure.EarthObservationEquipment.platform.Platform.shortName', '*'),//"Landsat",
				"serialId": Utils.getFromPath(feature, 'properties.EarthObservation.procedure.EarthObservationEquipment.platform.Platform.serialIdentifier', '*'),//"5",
				"shortName": Utils.getFromPath(feature, 'properties.EarthObservation.procedure.EarthObservationEquipment.instrument.Instrument.shortName', '*'),//"TM",
				"operationalMode": Utils.getFromPath(feature, 'properties.EarthObservation.procedure.EarthObservationEquipment.sensor.Sensor.operationalMode', '*'),//"IM",
				"productType": Utils.getFromPath(feature, 'properties.EarthObservation.metaDataProperty.EarthObservationMetaData.productType', '*')//"TM__GTC_1P"
			}
		}
		return properties;
	}

	/**
	 * Get browse url for the given feature respecting the patterns defined in browse configuration
	 * 
	 * @param feature 
	 */
	getBrowseUrl(feature) {
		let browseConf = null;
		let featureProps = this.extractFeatureProps(feature);
		if (featureProps) {
			browseConf = _.find(this.browseConfiguration, (confItem) => {
				let pattern = confItem.pattern;
				let applies = true;
				_.map(Object.keys(featureProps), (prop) => {
					applies &= this.isApplied(pattern, featureProps, prop);
				})
				return applies;
			});
		}
		return browseConf;
	}

	/**
	 * Add browse information for each feature related to the given collection identifier
	 */
	addBrowseInfo(collectionId, fc) {
		let startTime = Date.now();
		fc.features.forEach((feature) => {
			let browseConf = this.getBrowseUrl(feature);
			if (browseConf) {
				// Add a single browse for now
				let browseInfo = [{
					BrowseInformation: {
						fileName: {
							ServiceReference: {
								'@': {
									'href': browseConf.url,
									'title': collectionId
								}
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
			} else {
				logger.warn(`Cannot find the browse configuration for feature collection ${collectionId} with pattern `, this.extractFeatureProps(feature));
			}
		});
		logger.info(`Time elapsed to add browse information on every feature took ${Date.now() - startTime} ms`);
	}
}

module.exports = new BrowseService();