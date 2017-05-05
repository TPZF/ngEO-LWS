// CORE
let request = require('supertest');
let should = require('should');

// APP
let app = require('../../app');

/**
 * Unit test file for service web DownloadManagers
 * It allow to test the REST service and the mongodb database
 */
describe('Route downloadManagers', function () {

	/*
	 * Steps on this test
	 * 1 - Create a downloadManager /POST
	 * 2 - List downloadManagers /GET
	 * 3 - Delete a downloadManager /DELETE
	 * 4 - List (empty)
	 */
	describe('Full story (Create, List, Delete)', function () {

		var idDownloadManager = 0;

		// create a shopcart
		it('POST /ngeo/downloadManagers - Create a downloadManager', function (done) {

			var datas = {
				downloadmanager: {
					downloadManagerFriendlyName: "DM0001",
					userId: "anonymous",
					status: "ACTIVE",
					ipAddress: "localhost",
					lastAccessDate: "2012-11-22T09:30:47-05:00"
				}
			};

			request(app)
				.post('/ngeo/downloadManagers')
				.send(datas)
				.expect(201)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.Object();
					should(res.body).have.property('downloadmanager');
					should(res.body.downloadmanager).have.property('downloadManagerId');
					idDownloadManager = res.body.downloadmanager.downloadManagerId;
					should(res.body.downloadmanager).have.property('downloadManagerFriendlyName');
					done();
				});

		});

		// list shopcart
		it('GET /ngeo/downloadManagers - list downloadManagers (1 item)', function (done) {

			request(app)
				.get('/ngeo/downloadManagers')
				.send()
				.expect(200)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.Object();
					should(res.body).have.property('downloadmanagers');
					should(res.body.downloadmanagers).be.a.Array();
					res.body.downloadmanagers.should.have.length(1);
					res.body.downloadmanagers[0].downloadManagerId.should.be.equal(idDownloadManager);
					done();
				});

		});

		// delete a downloadManager
		it('DELETE /ngeo/downloadManagers/:id - delete downloadManager', function (done) {

			request(app)
				.delete('/ngeo/downloadManagers/' + idDownloadManager)
				.send()
				.expect(204, done);

		});

		// list downloadManagers
		it('GET /ngeo/downloadManagers - list downloadManagers (no item)', function (done) {

			request(app)
				.get('/ngeo/downloadManagers')
				.send()
				.expect(200)
				.expect('Content-Type', /json/)
				.end(function (err, res) {
					should(res.body).be.a.Object();
					should(res.body).have.property('downloadmanagers');
					should(res.body.downloadmanagers).be.a.Array();
					res.body.downloadmanagers.should.have.length(0);
					done();
				});

		});

	});

});