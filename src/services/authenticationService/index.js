let Logger = require('utils/logger'),
	Configuration = require('config');

/**
 * Database service
 * Interface with mongodb service
 */
class AuthenticationService {

	constructor() {
	}

    isAuthenticated(myRequest, myResponse) {
        // TODO : from myRequest object, check if user is authenticated or not
       let flag = true;
       if (!flag) {
           myResponse.status(401).send('Unauthorized !');
       }
    }

    /**
     * get userId from myRequest
     * @method getUserId
     * @param {*} myRequest 
     * @param {*} myResponse 
     */
    getUserId(myRequest) {
        // TODO : from myRequest object, extract userId
        return 'anonymous';
    }

}

module.exports = new AuthenticationService();