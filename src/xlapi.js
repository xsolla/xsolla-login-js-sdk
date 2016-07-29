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
    this.baseUrl = 'http://xsolla-login-api.herokuapp.com/api/social/';
    this.projectId = projectId;

    this.makeApiCall = function (params, success, error) {
        var r = new XMLHttpRequest();
        r.open(params.method, self.baseUrl + params.endpoint, true);
        r.onreadystatechange = function () {
            if (r.readyState != 4 || r.status != 200)
            {
                // console.error('Network error');
                error('Network error');
                return;
            }
            success(r.responseText);
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
    return this.makeApiCall({method: 'GET', endpoint: 'login_urls', getArguments: 'projectId='+this.projectId}, success, error);
};

XLApi.prototype.loginPassAuth = function (login, pass, success, error) {
    return this.makeApiCall({method: 'GET', endpoint: 'loginpass', getArguments: 'login=' + login + '&pass=' + pass}, success, error);
};

XLApi.prototype.smsAuth = function (phoneNumber, success, error) {
    return this.makeApiCall({method: 'GET', endpoint: 'sms', getArguments: 'phoneNumber=' + phoneNumber}, success, error);
};

module.exports = XLApi;
