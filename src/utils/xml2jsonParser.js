let xml2js = require('xml2js-expat');
let logger = require('./logger');

/**
 * Xml parser class designed to create the abstraction between the 3rd party lib
 * and the rest of application
 * Allows us to change quickly the implementation of xml2json parser
 */
class Xml2JsonParser {
	constructor() { }

	/**
	 * Parse the given xml
	 * @param {string} xml
	 *      Xml to parse
	 * @param {function} onSuccess
	 *      Success callback
	 * @param {function} onError
	 *      Error callback
	 */
	parse(xml, onSuccess, onError) {
		let startTime = Date.now();
		let parser = new xml2js.Parser(function (result, error) {
			let endTime = Date.now();
			if ((endTime - startTime) < 100) {
				logger.debug('Time elapsed by expat lib (ms) : ', Date.now() - startTime);
			} else if ((endTime - startTime) < 500) {
				logger.warn('Time elapsed by expat lib (ms) : ', Date.now() - startTime);
			} else {
				logger.error('Time elapsed by expat lib (ms) : ', Date.now() - startTime);
			}
			if (!error) {
				onSuccess(result);
			} else {
				onError('Error while parsing the xml', xml)
			}
		});
		parser.parseString(xml);
	}
}

module.exports = new Xml2JsonParser();