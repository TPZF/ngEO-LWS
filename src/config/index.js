let process = require('process');
let logger = require('utils/logger');

class Configuration {
	constructor() {
		logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
		switch (process.env.NODE_ENV) {
			case 'development':
				Object.assign(this, require('./development'));
				break;
			case 'production':
				Object.assign(this, require('./production'));
				break;
			default:
				console.error(`Unrecognized NODE_ENV: ${process.env.NODE_ENV} using development configuration by default`);
				Object.assign(this, require('./development.json'));
		}
	}
}

module.exports = new Configuration();