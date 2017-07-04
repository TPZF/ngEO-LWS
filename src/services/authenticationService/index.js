let Logger = require('utils/logger'),
	Configuration = require('config');

/**
 * Database service
 * Interface with mongodb service
 */
class AuthenticationService {

	constructor() {
	}

	/**
	 * Check if user is authenticated with SSO
	 * @method isAuthenticated
	 * @param {*} myRequest 
	 * @param {*} myResponse 
	 * @param {*} myCallbackFunction 
	 */
	isAuthenticated(myRequest, myResponse, myCallbackFunction) {
		Logger.debug('AuthenticationService.isAuthenticated');
		let flag = false;
		if (typeof this.getUserId(myRequest) !== 'undefined') {
			flag = true;
		}
		if (!flag) {
			myResponse.status(401).send('Unauthorized !');
		} else {
			myCallbackFunction();
		}
	}

    /**
     * get userId from myRequest
     * @method getUserId
     * @param {*} myRequest 
	 * @returns {string | undefined}
     */
	getUserId(myRequest) {
		let userId;
		if (Configuration.hasOwnProperty('ssoUserId')) {
			Logger.debug(`Will retrieve sso user id from header mapped to ${Configuration['ssoUserId']}`);
			let ssoHeaderId = Configuration['ssoUserId'];
			userId = typeof ssoHeaderId === 'undefined' ? undefined : myRequest.headers[ssoHeaderId];
			Logger.debug(`The user id from sso is ${userId}`);
		} else {
			Logger.warn("ssoUserId tag not found in the configuration so server not protected behind and all user mapped with anonymous user");
			//myRequest.headers[Configuration['ssoUserId']] = 'anonymous';
			userId = 'anonymous';
		}
		return userId;
	}

}

module.exports = new AuthenticationService();