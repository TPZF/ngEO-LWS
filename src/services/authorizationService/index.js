let Logger = require('utils/logger'),
	Configuration = require('config');

/**
 * Authorization service
 */
class AuthorizationService {

	constructor() { }

    /**
     * Check if the user has right on an object based on myCollection, myDocumentId and myUserId
     * 
     * @function isAuthorized
     * @param {object} myResponse 
     * @param {object} myDataBaseService 
     * @param {string} myCollection 
     * @param {string} myDocumentId 
     * @param {string} myUserId 
     * @param {function} myCallBackFn 
     */
	isAuthorized(myResponse, myDataBaseService, myCollection, myDocumentId, myUserId, myCallBackFn) {

		// callback function after search
		let cbAfterSearch = function (response) {
			// bad response
			if (response.code !== 0) {
				myResponse.status(response.code).json(response.datas);
				return;
			}
			// length of datas !== 1 --> error : too many or not enough
			if (response.datas.length !== 1) {
				myResponse.status(404).json('Not found');
				return;
			}
			// if userId of object is different --> unauthorized
			if (response.datas[0].userId !== myUserId) {
				myResponse.status(401).json('Unauthorized');
				return;
			}
			myCallBackFn();
		}

		// json query filter based on _id
		let jsonQueryForfilter = {
			_id: myDocumentId
		};

		// search and callback
		myDataBaseService.search(myCollection, jsonQueryForfilter, 0, 1, cbAfterSearch);

	}

}

module.exports = new AuthorizationService();