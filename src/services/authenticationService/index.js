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
		// TODO remove it when SSO is activated
		myRequest.headers[Configuration['ssoUserId']] = 'anonymous';
		//Logger.debug('AuthenticationService.getUserId = ' + myRequest.headers[Configuration['ssoUserId']]);
		//let ssoHeaderId = Configuration['ssoUserId'];
		//return typeof ssoHeaderId === 'undefined' ? undefined : myRequest.headers[ssoHeaderId];
		return myRequest.headers[Configuration['ssoUserId']];
	}

}

module.exports = new AuthenticationService();