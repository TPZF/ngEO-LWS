/**
 *  Logger instance based on winston
 */

let winston = require('winston');
let Configuration = require('config');
winston.emitErrs = true;

let logger = new winston.Logger({
	exitOnError: false
});


if (Configuration.logger.outputPath) {
	logger.configure({
		transports: [new winston.transports.File({
			level: Configuration.logger.level,
			filename: Configuration.logger.outputPath,
			handleExceptions: true,
			json: false,
			maxsize: 5242880, //5MB
			maxFiles: 5,
			colorize: false
		})]
	});
} else {
	logger.configure({
		transports: [new winston.transports.Console({
			level: Configuration.logger.level,
			handleExceptions: true,
			json: false,
			colorize: true,
			log: function () {

			}
		})]
	});
}

module.exports = logger;