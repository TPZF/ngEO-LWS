/**
 *  Logger instance based on winston
 */

let winston = require('winston');
let Configuration = require('config');
winston.emitErrs = true;

let logger = new winston.Logger({
	transports: [
		// // Uncomment if need to debug in file
		// new winston.transports.File({
		//	 level: 'info',
		//	 filename: './logs/all-logs.log',
		//	 handleExceptions: true,
		//	 json: true,
		//	 maxsize: 5242880, //5MB
		//	 maxFiles: 5,
		//	 colorize: false
		// }),
		new winston.transports.Console({
			level: Configuration.logger.level,
			handleExceptions: true,
			json: false,
			colorize: true
		})
	],
	exitOnError: false
});

module.exports = logger;

module.exports.stream = {
	write: function (message, encoding) {
		logger.info(message);
	}
};