/**
 * Created by a.korotaev on 24.06.16.
 */
/**
 * Impelements Xsolla Login Api
 * @param projectId - project's unique identifier
 * @constructor
 */
var request = require('superagent');

var XLApi = function (projectId) {
    var self = this;
    // this.baseUrl = 'http://login.xsolla.com/api/';
    // this.baseUrl = 'http://xsolla-login-api.herokuapp.com/api/';
    this.baseUrl = 'http://test-login.xsolla.com/api/';
    this.projectId = projectId;

    this.makeApiCall = function (params, success, error) {
        // var r = new XMLHttpRequest();
        // r.open(params.method, self.baseUrl + params.endpoint, true);
        // // r.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        // r.onreadystatechange = function () {
        //     if (r.readyState == 4) {
        //         if (r.status == 200) {
        //             success(JSON.parse(r.responseText));
        //         } else {
        //             if (r.responseText) {
        //                 error(JSON.parse(r.responseText));
        //             } else {
        //                 error({error: {message: 'Networking error', code: r.status}});
        //             }
        //         }
        //     }
        // };
        // if (params.method == 'POST') {
        //     r.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        //     r.send(params.postBody);
        // } else if (params.method == 'GET') {
        //     r.send(params.getArguments);
        // }

        var responseHandler = function (err, res) {
            if (!err) {
                success(JSON.parse(res.text));
            } else {
                debugger;
                error({error: {message: err.message, code: 10}});
            }
        };

        var method = params.method || 'GET';
        var requestUrl = self.baseUrl + params.endpoint;
        if (method == 'GET') {
            request.get(requestUrl, responseHandler);
        } else if (method == 'POST') {
            debugger;
            request
                .post(requestUrl)
                .send(params.postBody)
                .end(responseHandler);
        }

    };
};
/**
 * Get all avialable social methods auth url
 * @param success - success callback
 * @param error - error callback
 */
XLApi.prototype.getSocialsURLs = function (success, error) {
    return this.makeApiCall({method: 'GET', endpoint: 'social/login_urls?projectId='+this.projectId, getArguments: null}, success, error);
};

XLApi.prototype.loginPassAuth = function (login, pass, rememberMe, success, error) {
    var body = {
        username: login,
        password: pass,
        remember_me: rememberMe
    };
    return this.makeApiCall({method: 'POST', endpoint: 'proxy/login?projectId='+this.projectId, postBody: JSON.stringify(body)}, success, error);
};

XLApi.prototype.smsAuth = function (phoneNumber, success, error) {
    return this.makeApiCall({method: 'GET', endpoint: 'sms', getArguments: 'phoneNumber=' + phoneNumber}, success, error);
};

module.exports = XLApi;
