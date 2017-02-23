let process = require('process');

class Configuration {
	constructor() {
		console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
		switch (process.env.NODE_ENV) {
			case 'development':
				Object.assign(this, require('./development'));
				break;
			case 'production':
				Object.assign(this, require('./production'));
				console.log(this);
				break;
			default:
				console.error(`Unrecognized NODE_ENV: ${process.env.NODE_ENV} using development configuration by default`);
				Object.assign(this, require('./development.json'));
		}
	}
}

module.exports = new Configuration();