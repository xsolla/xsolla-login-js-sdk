'use strict';
var XLApi = require('../src/xlapi.js');


describe("Xsolla Login API", function() {
    var xlApi = new XLApi(123);

    it("says hello", function(done) {
        xlApi.getSocialsURLs(function (e) {

        }, function (e) {
            expect(e).toBe('Network error');
            done();
        });
    });
});
