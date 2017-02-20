let express = require('express');
let router = express.Router();

router.get('/', function (req, res) {
	// Every dataset is public for now
	let response = {
		"datasetAuthorisationInfo": []
	};
	res.json(response);
});

module.exports = router;