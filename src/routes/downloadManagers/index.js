// CORE
let express = require('express');
let fs = require('fs');
let path = require('path');
let ObjectId = require('mongodb').ObjectID;
let _ = require('lodash');

let Configuration = require('config');

// UTILS
let Logger = require('utils/logger');

// SERVICES
let AuthenticationService = require('services/authenticationService');
let AuthorizationService = require('services/authorizationService');
let DatabaseService = require('services/databaseService');

// CONST
let DOWNLOADMANAGERNAME = 'DownloadManager';

/**
 * check request inputs (method, params, values, ...)
 * @function _checkRequest
 * @param request
 * @return boolean
 * @private
 */
let _checkRequest = function (request) {
	if (request.method === 'POST') {
		if (!request.body.downloadmanager) {
			Logger.debug('no downloadmanager item');
			return false;
		}
		if (!request.body.downloadmanager.downloadManagerFriendlyName) {
			Logger.debug('no name for downloadmanager');
			return false;
		}
		if (request.body.downloadmanager.downloadManagerFriendlyName.trim() === '') {
			Logger.debug('name for downloadmanager is empty');
			return false;
		}
		if (!request.body.downloadmanager.userId) {
			Logger.debug('no userId for downloadmanager');
			return false;
		}
	}
	if (request.method === 'DELETE') {
		if (!DatabaseService.checkParamId(request.params.downloadmanager_id)) {
			Logger.debug(request.params.downloadmanager_id);
			Logger.debug('no valid downloadmanager_id');
			return false;
		}
	}
	return true;
}

/**
 * Get latest version of download manager for each os
 * 
 * @function _getAllLatestRelease
 * @returns {Object}
 * @private
 */
let _getAllLatestRelease = function () {

	const _json = {};

	const dir = `${__dirname}/releases/download/`;

	if (!fs.existsSync(dir)) {
		return _json;
	}

	fs.readdirSync(dir).forEach((os) => {
		if (fs.statSync(dir + '/' + os).isDirectory()) {
			const versionDesc = fs.readdirSync(dir + '/' + os).filter((file) => {
				const filePath = path.join(dir + '/' + os, file);
				return fs.statSync(filePath).isDirectory();
			}).reverse();
			if (versionDesc[0]) {
				if (os.indexOf('linux') === 0) {
					_json[os] = {
						readme: 'Latest release : ' + versionDesc[0],
						update: Configuration.host + '/ngeo/downloadManagers/releases/download/' + os + '/' + versionDesc[0] + '/ngeo-downloadmanager.AppImage',
						install: Configuration.host + '/ngeo/downloadManagers/releases/download/' + os + '/' + versionDesc[0] + '/ngeo-downloadmanager.AppImage',
						version: versionDesc[0]
					};
				}
				if (os.indexOf('win') === 0) {
					_json[os] = {
						readme: `Latest release : ${versionDesc[0]}`,
						update: `${Configuration.host}/ngeo/downloadManagers/releases/download/${os}/${versionDesc[0]}`,
						install: `${Configuration.host}/ngeo/downloadManagers/releases/download/${os}/${versionDesc[0]}/ngeo-downloadmanager-${versionDesc[0]}.exe`,
						version: versionDesc[0],
						fullName: `ngeo-downloadmanager-${versionDesc[0]}.exe`,
						latestYml: `./releases/download/${os}/${versionDesc[0]}/latest.yml`,
						latestApplicationPath: `./releases/download/${os}/${versionDesc[0]}/ngeo-downloadmanager-${versionDesc[0]}.exe`
					};
				}
				if (os.indexOf('mac') === 0) {
					_json[os] = {
						readme: `Latest release : ${versionDesc[0]}`,
						update: `${Configuration.host}/ngeo/downloadManagers/releases/download/${os}/${versionDesc[0]}/release.json`,
						install: `${Configuration.host}/ngeo/downloadManagers/releases/download/${os}/${versionDesc[0]}/ngeo-downloadmanager-${versionDesc[0]}.zip`,
						version: versionDesc[0],
						fullName: `ngeo-downloadmanager-${versionDesc[0]}.zip`,
						latestYml: `./releases/download/${os}/${versionDesc[0]}/latest-mac.yml`,
						latestApplicationPath: `./releases/download/${os}/${versionDesc[0]}/ngeo-downloadmanager-${versionDesc[0]}.zip`
					};
				}
			}
		}
	});
	//Logger.debug(_json);
	return _json;
};

/**
 * According to the electron-updater module used for the application download manager,
 * it request a service REST with this format
 * "http://<host>/ngeo/downloadManagers/releases/<os>/latest/<file>"
 * <ul>
 * file can be
 * <li>latest.yml for the update descriptor for windows</li>
 * <li>latest-mac.yml for the update descriptor for mac</li>
 * <li>TODO latest.yml for the update descriptor for linux</li>
 * </ul>
 *  
 * @function findFileForAutoUpdate
 * @param os (could be win, mac or linux)
 * @param fileTofind could be latest.yml, latest-mac.yml or application file (exmaple ngeo-downloadmanager-0.x.x.exe)
 * @param request
 * @returns {file path} if found, otherwise 'undefined'
 * @private
 * 
 */
let findFileForAutoUpdate = function (os, fileToFind) {
	const jsonLatest = _getAllLatestRelease();
	let fileToSend;
	let jsonConf;
	for (let osName in jsonLatest) {
		if (osName.indexOf(os) === 0) {
			jsonConf = jsonLatest[osName];
			break;
		}
	}
	if (typeof jsonConf === 'undefined') {
		return undefined;
	}
	//if the requested was latest.yml and os windows then send the yml for windows
	//same for mac expect the electron auto-update request latst-mac.yml on mac
	//TODO for linux
	if (fileToFind.endsWith('.yml')) {
		return jsonConf.latestYml;
	}
	//here we enter the request of the software itself as it uses the same REST service buut the attribute is not the same
	//for exmaple for .yml, it is latest.yml ro latest-mac.yml depending on the os from where the electron auto-updater is launched
	if (fileToFind == jsonConf.fullName) {
		fileToSend = jsonConf.latestApplicationPath;
		return fileToSend;
	}

	return undefined;
	/*if (typeof fileToSend === 'undefined') {
		res.status(400).json("Could not find the updator file attributes");
	}*/
};

// ROUTER
let router = express.Router({
	mergeParams: true
});
router.use(function timeLog(req, res, next) {
	// for all downloadmanagers request, authentication is required
	Logger.debug(req.originalUrl);
	AuthenticationService.isAuthenticated(req, res, next);
});

/**
 * List downloadManagers
 *
 * @function router.get
 * @param url - /ngeo/downloadManagers/
 * @param req - empty
 * @param res - response
 */
router.get('/', (req, res) => {

	Logger.debug('GET /ngeo/downloadManagers');

	// define call back function after listing downloadmanagers
	// send response
	let cbAfterSearch = function (response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			_.map(response.datas, function (item) {
				item.downloadManagerId = item.id;
				delete item._id;
				delete item.id;
			})
			res.json({ "downloadmanagers": response.datas });
		}
	}

	// 
	let jsonQueryForfilterOnUserId = {
		userId: AuthenticationService.getUserId(req)
	};

	// call list service
	DatabaseService.list(DOWNLOADMANAGERNAME, jsonQueryForfilterOnUserId, cbAfterSearch);

});

/**
 * About : description of requests for downloadManagers
 * 
 * @function router.get
 * @param {String} url - /ngeo/downloadManagers/about
 * @param {object} req - empty
 * @param {object} res - response
 */
router.get('/about', (req, res) => {
	Logger.debug('GET /ngeo/downloadManagers/about');
	res.status(200).send("Description of downloadManagers requests");
});

/**
 * Get latest versions of download manager installer
 * 
 * @function router.get
 * @param {String} url - /ngeo/downloadManagers/releases/latest
 * @param {object} req - empty
 * @param {object} res - response
 */
router.get('/releases/latest', (req, res) => {
	Logger.debug('GET /ngeo/downloadManagers/releases/latest');
	const jsonLatest = _getAllLatestRelease();
	if (jsonLatest !== {}) {
		res.json(jsonLatest);
	} else {
		res.sendStatus(404);
	}
});

/**
 * Get latest versions of download manager installer
 * 
 * @function router.get
 * @param {String} url - /ngeo/downloadManagers/releases/:os/latest/fileName
 * @param {object} req - empty having property os for the os (win, mac or linux)
 * @param {object} res - response
 */
router.get('/releases/:os/latest/:fileName', (req, res) => {
	let os = req.params.os;
	let fileName = req.params.fileName;
	Logger.debug(`GET /ngeo/downloadManagers/releases/${os}/latest/${fileName}`);
	if (!os || !fileName) {
		res.status(404).json("Request is not valid. Needs os and filename");
		return;
	}

	let fileToSend = findFileForAutoUpdate(os, fileName);
	if (typeof fileToSend === 'undefined') {
		res.status(400).json(`Could not find the file ${fileName} for os ${os} you requested`);
	}

	Logger.debug(`Sending ${fileName}`);
	let options = {
		root: __dirname
	};
	res.status(200).sendFile(fileToSend, options);
});

/**
 * Get a specific version of download manager installer
 * 
 * @function router.get
 * @param {String} url - /ngeo/downloadManagers/releases/download/:os/:version/:file
 * @param {object} req - empty
 * @param {object} res - response
 */
router.get('/releases/download/:os/:version/:file', (req, res) => {
	Logger.debug('GET /ngeo/downloadManagers/releases/download/:os/:version/:file');
	if (!req.params.os || !req.params.version || !req.params.file) {
		res.status(400).json("Request is not valid");
		return;
	}
	const os = req.params.os;
	const version = req.params.version;
	const file = req.params.file;
	const dir = `${__dirname} /releases/download / ${os} /${version}/${file} `;
	if (!fs.existsSync(dir)) {
		res.sendStatus(404);
		return;
	}
	let options = {
		root: __dirname
	};
	res.status(200).sendFile('./releases/download/' + os + '/' + version + '/' + file, options);
});

/**
 * Get one downloadManager
 *
 * @function router.get
 * @param url - /ngeo/downloadManagers/:downloadManagerid
 * @param req - request
 * @param res - response
 */
router.get('/:downloadManagerid', (req, res) => {

	Logger.debug('GET /ngeo/downloadManagers/:downloadManagerid');

	if (!req.params['downloadManagerid']) {
		res.status(400).json("Request is not valid");
		return;
	}
	if (!DatabaseService.checkParamId(req.params.downloadManagerid)) {
		res.status(400).json("Request is not valid");
		return;
	}
	let idToGet = req.params['downloadManagerid'];

	// define callback function after updating
	let cbAfterUpdate = function (response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			response.datas.downloadManagerId = response.datas.id;
			delete response.datas._id;
			delete response.datas.id;
			res.status(200).json({ "downloadmanager": response.datas });
		}
	};

	// define call back function after get downloadmanager
	// send response
	let cbAfterList = function (response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
			return;
		}
		if (response.datas.length !== 1) {
			res.status(400).json('Bad request !');
			return;
		}
		let downloadManager = response.datas[0];

		// define query if item already exists
		let myQueryItemAlreadyExists = {
			_id: {
				$ne: ObjectId(downloadManager._id)
			},
			downloadManagerFriendlyName: downloadManager.downloadManagerFriendlyName,
			userId: downloadManager.userId
		};

		let myQueryUpdate = {
			$set: {
				"lastAccessDate": new Date().toISOString()
			}
		};
		DatabaseService.update(DOWNLOADMANAGERNAME, downloadManager, myQueryItemAlreadyExists, myQueryUpdate, cbAfterUpdate);
	}

	// 
	let jsonQueryForfilter = {
		_id: ObjectId(idToGet),
		userId: AuthenticationService.getUserId(req)
	};

	// call list service
	DatabaseService.list(DOWNLOADMANAGERNAME, jsonQueryForfilter, cbAfterList);

});
/**
 * Create a DownloadManager
 *
 * @function router.post
 * @param url - /ngeo/downloadManagers/
 * @param req - request {downloadmanager:{name,userId}}
 * @param res - response
 */
router.post('/', (req, res) => {

	Logger.debug('POST /ngeo/downloadManagers');

	// check if request is valid
	if (!_checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	// define call back function after adding DownloadManager
	// send response
	let cbAddDownloadManager = function (response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			response.datas.downloadManagerId = response.datas.id;
			delete response.datas.id;
			delete response.datas._id;
			res.setHeader('Location', '/ngeo/downloadManagers/' + response.datas.downloadManagerId)
			res.status(201).json({ "downloadmanager": response.datas });
		}
	};

	// define insertedItem
	let myInsertItem = req.body.downloadmanager;

	if (!myInsertItem.userId) {
		myInsertItem.userId = AuthenticationService.getUserId(req);
	}
	if (myInsertItem.userId !== AuthenticationService.getUserId(req)) {
		res.status(401).json('Unauthorized');
		return;
	}

	// define query to find if item is already in database
	let myQueryItemAlreadyExists = {
		downloadManagerFriendlyName: myInsertItem.downloadManagerFriendlyName,
		userId: myInsertItem.userId
	};

	// call create service for database
	DatabaseService.create(DOWNLOADMANAGERNAME, myInsertItem, myQueryItemAlreadyExists, cbAddDownloadManager);

});

/**
 * Delete a downloadmanager
 */
router.delete('/:downloadmanager_id', (req, res) => {

	Logger.debug('DELETE /ngeo/downloadManagers/:id');

	// check if request is valid
	if (!_checkRequest(req)) {
		res.status(400).json("Request is not valid");
		return;
	}

	let idToDelete = req.params.downloadmanager_id;

	// define callback function after deleting all DARs for a downloadmanager
	let cbDeleteAllDARsInShopCart = function (response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			res.status(204).send();
		}
	};

	// define callback function after deleting DownloadManager
	let cbDeleteDownloadManager = function (response) {
		if (response.code !== 0) {
			res.status(response.code).json(response.datas);
		} else {
			// delete cascade DARs link to this DownloadManager
			let myQueryDelete = {
				"dlManagerId": idToDelete
			};
			DatabaseService.deleteCascade('DataAccessRequest', myQueryDelete, cbDeleteAllDARsInShopCart);
		}
	};

	let cbAfterCheckAuthorization = function () {
		DatabaseService.delete(DOWNLOADMANAGERNAME, idToDelete, cbDeleteDownloadManager);
	}

	AuthorizationService.isAuthorized(
		res,
		DatabaseService,
		DOWNLOADMANAGERNAME,
		ObjectId(idToDelete),
		AuthenticationService.getUserId(req),
		cbAfterCheckAuthorization
	);


});

module.exports = router;