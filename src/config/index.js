let process = require('process');

class Configuration {
	constructor() {
		console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
		switch (process.env.NODE_ENV) {
			case 'development':
				Object.assign(this, require('./development'), require('./account'));
				break;
			case 'test':
				Object.assign(this, require('./test'), require('./account'));
				break;
			case 'production':
				Object.assign(this, require('./production'), require('./account'));
				console.log(this);
				break;
			default:
				console.error(`Unrecognized NODE_ENV: ${process.env.NODE_ENV} using development configuration by default`);
				Object.assign(this, require('./development.json'), require('./account'));
		}
	}
}

module.exports = new Configuration();