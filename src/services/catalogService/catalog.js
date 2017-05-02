/**
 * Catalog class
 * Representing the catalogs
 */
class Catalog {
	/**
	 * Catalog constructor
	 * 
	 * @param url - The OpenSearch url of catalog
	 * @param name - The OpenSearch name of catalog
	 * @param options - Possible options later: id, title, summary, updated, dc:identifier, link
	 */
	constructor(url, name, options) {
		this.url = url;
		this.name = name;
		// Predict the id for now
		//this.id = url.substr(url.lastIndexOf('/') + 1);
		this.id = name;

		// Make object extendable
		Object.assign(this, options);
	}
}

module.exports = Catalog;