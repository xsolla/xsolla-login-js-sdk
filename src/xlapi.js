/**
 * Created by a.korotaev on 24.06.16.
 */
/**
 * Impelements Xsolla Login Api
 * @param projectId - project's unique identifier
 * @constructor
 */
var XLApi = function (projectId) {
    var self = this;
    // this.baseUrl = 'http://xsolla-login-api.herokuapp.com/api/'; //http://test-login.xsolla.com/api/
    this.baseUrl = 'http://test-login.xsolla.com/api/';
    this.projectId = projectId;

    this.makeApiCall = function (params, success, error) {

        console.log('asdasd');

        var r = new XMLHttpRequest();
        r.open(params.method, self.baseUrl + params.endpoint, true);
        r.onreadystatechange = function () {
            if (r.readyState == 4) {
                if (r.status == 200) {
                    success(JSON.parse(r.responseText));
                } else {
                    if (r.responseText) {
                        error(JSON.parse(r.responseText));
                    } else {
                        error({error: {message: 'Networking error'}});
                    }
                }
            }
        };
        r.send(params.getArguments);
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

XLApi.prototype.loginPassAuth = function (login, pass, success, error) {
    var body = {
        username: login,
        password: pass
    };
    return this.makeApiCall({method: 'POST', endpoint: 'proxy/login?projectId='+this.projectId, getArguments: JSON.stringify(body)}, success, error);
};

XLApi.prototype.smsAuth = function (phoneNumber, success, error) {
    return this.makeApiCall({method: 'GET', endpoint: 'sms', getArguments: 'phoneNumber=' + phoneNumber}, success, error);
};

module.exports = XLApi;
