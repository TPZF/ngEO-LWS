let Logger = require('utils/logger'),
	Configuration = require('config');

/**
 * Database service
 * Interface with mongodb service
 */
class AuthorizationService {

	constructor() {
	}

    isAuthorized(myResponse, myDataBaseService, myCollection, myDocumentId, myUserId, myCallBackFn) {

        let cbAfterSearch = function(response) {
            if (response.code !== 0) {
                myResponse.status(response.code).json(response.datas);
                return;
            }
            if (response.datas.length !== 1) {
                myResponse.status(404).json('Not found');
                return;
            }
            if (response.datas[0].userId !== myUserId) {
                myResponse.status(401).json('Unauthorized');
                return;
            }
            myCallBackFn();
        }

        let jsonQueryForfilter = {
            _id: myDocumentId
        };

        myDataBaseService.search(myCollection, jsonQueryForfilter, 0, 1, cbAfterSearch);

    }

}

module.exports = new AuthorizationService();