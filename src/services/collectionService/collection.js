let request = require("request");
let Xml2JsonParser = require("utils/xml2jsonParser");

/**
 * Collection class
 * Representing the collection of features
 */
class Collection {
	/**
	 * Collection constructor
	 * @param url
	 * 		The OpenSearch url of collection
	 * @param options
	 * 		Possible options later: id, title, summary, updated, dc:identifier, link
	 */
	constructor(url, name, options) {
		this.url = url;
		this.name = name;
		// Predict the id for now
		this.id = url.substr(url.lastIndexOf('/') + 1);

		// Make object extendable
		Object.assign(this, options);
	}
}

module.exports = Collection;