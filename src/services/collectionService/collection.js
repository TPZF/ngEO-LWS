let request = require("request");
let Xml2JsonParser = require("utils/xml2jsonParser");

/**
 * Collection class
 * Representing the collection of features
 */
class Collection {
	/**
	 * Collection constructor
	 * @param id
	 * @param url - The OpenSearch url of collection
	 * @param name
	 * @param catalogId
	 * @param options - Possible options later: id, title, summary, updated, dc:identifier, link
	 */
	constructor(id, url, name, catalogId, options) {
		// concatenation of catalogId and collectionId because collectionId not always unique
		this.id = catalogId + '-' + id;
		this.url = url;
		this.name = name;
		this.catalogId = catalogId;

		// default parameters, provided by webc
		this.parameters = {
			start: 'start', 
			stop: 'end', 
			startIndex: 'startIndex',
			count: 'count',
			bbox: 'bbox',
			geom: 'geom'
		};

		// Make object extendable
		Object.assign(this, options);
	}
}

module.exports = Collection;