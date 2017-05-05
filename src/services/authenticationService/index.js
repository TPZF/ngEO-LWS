let Logger = require('utils/logger'),
	Configuration = require('config');

/**
 * Database service
 * Interface with mongodb service
 */
class AuthenticationService {

	constructor() {
	}

	isAuthenticated(myRequest, myResponse, myCallbackFunction) {
		Logger.debug('AuthenticationService.isAuthenticated');
		// TODO remove it when SSO is activated
		myRequest.headers[Configuration['ssoUserId']] = 'anonymous';
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
     * @param {*} myResponse 
     */
	getUserId(myRequest) {
		Logger.debug('AuthenticationService.getUserId = ' + myRequest.headers[Configuration['ssoUserId']]);
		return myRequest.headers[Configuration['ssoUserId']];
	}

}

module.exports = new AuthenticationService();