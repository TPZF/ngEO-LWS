let collectionsConf = require("./collections.json");
let Collection = require('./collection');

/**
 * Collection service designed to manager the top view of all existing collections
 * Currently initialized with configuration file, but in future will probable be absorbed by Catalog object
 */
class CollectionService {
	constructor() {
		this.collections = [];
		// Create collection object from conf
		collectionsConf.forEach((collection) => {
			this.collections.push(new Collection(collection.url, collection.name));
		});
	}
}

module.exports = new CollectionService();