let Logger = require('utils/logger'),
	Configuration = require('../../config');

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
			let ssoHeaderId = Configuration['ssoUserId'];
			Logger.debug(`The request headers contains \n${JSON.stringify(myRequest.headers)}`);
			Logger.debug(`Will retrieve sso user id from header mapped to ${ssoHeaderId}`);
			userId = myRequest.headers[ssoHeaderId];
			Logger.debug(`The user id from sso is ${userId}`);
			if (typeof userId === 'undefined' || !userId.trim()) {
				userId = undefined;
				Logger.debug(`The user id from sso was undefined or empty so qs will map it to ${userId}`);
			}
		} else {
			Logger.warn("ssoUserId tag not found in the configuration so server no access to protected services");
			userId = undefined;
		}
		return userId;
	}

}

module.exports = new AuthenticationService();