// CORE
let express = require('express');

// UTILS
let Logger = require('utils/logger');

// SERVICES
let AuthenticationService = require('services/authenticationService');

/**
 * Define router
 */
let router = express.Router({
	mergeParams: true
});

router.use(function timeLog(req, res, next) {
	Logger.info('Time: ', Date.now());
	// for all user information request, authentication is required
	AuthenticationService.isAuthenticated(req, res, next);
});

/**
 * List shopcarts
 *
 * @function router.get
 * @param url - /ngeo/userId/
 */
router.get('/', (req, res) => {
	let theId = AuthenticationService.getUserId(req);
	Logger.debug('GET /ngeo/userId');
	let userInformationJson = {
		"userInformation": {
			"userId": theId
		}
	};

	res.send(userInformationJson);
});

module.exports = router;