/**
 * Created by a.korotaev on 24.06.16.
 */

var XLApi = require('./xlapi');
/**
 * Create an `Auth0` instance with `options`
 *
 * @class XL
 * @constructor
 */
function XL (options) {
    var self = this;

    self._socialUrls = undefined;

    self._options = {};
    self._options.errorHandler = options.errorHandler || function(a) {};
    self._options.loginPassValidator = options.loginPassValidator || function (a,b) { return true; };

    self._api = new XLApi(options.projectId);
    self._api.getSocialsURLs(function (response) {
        self._socialUrls = {};
        for (var key in response) {
            if (response.hasOwnProperty(key)) {
                self._socialUrls['sn-' + key] = response[key];
            }
        }
    }, function (e) {
        console.error(e);
    });

    var elements = self.getAllElementsWithAttribute('data-xl-auth');
    var login = '';
    var pass = '';

    for (var i = 0; i < elements.length; i++) {
        var nodeValue = elements[i].attributes['data-xl-auth'].nodeValue;
        if (nodeValue.startsWith('sn')) {
            elements[i].onclick = function (nodeValue) {
                return function () {
                    self.login({authType: nodeValue})
                };
            }(nodeValue);
        } else if (nodeValue == 'form-sms') {
            // elements[i].onsubmit = config.eventHandlers.sms;
        } else if (nodeValue == 'form-login_pass') {
            // elements[i].onsubmit = config.eventHandlers.loginPass;
            elements[i].onsubmit = function (login, pass) {
                return function (e) {
                    e.preventDefault();
                    if (self._options.loginPassValidator(login, pass)) {
                        self.login({
                            authType: 'login-pass',
                            login: login,
                            pass: pass
                        }, function (res) {
                            if (res.error) {
                                self._options.errorHandler(res);
                            }
                        });
                    } else {
                        self._options.errorHandler(self.createErrorObject('Login or pass not valid', XL.INVALID_LOGIN_ERROR_CODE));
                    }
                }
            }(login, pass);
        } else if (nodeValue.startsWith('input-')) {
            if (nodeValue == 'input-login') {
                login = '';
            } else if (nodeValue == 'input-pass') {
                pass = '';
            }
        }
    }
}

XL.prototype.login = function (prop, callback) {
    var self = this;

    if (!prop || !self._socialUrls) {
        return;
    }

    /**
     * props
     * authType: sn-<social name>, login-pass, sms
     */
    if (prop.authType) {
        if (prop.authType.startsWith('sn-')) {
            var socialUrl = self._socialUrls[prop.authType];
            if (socialUrl != undefined) {
                window.location.href = self._socialUrls[prop.authType];
            } else {
                console.error('Auth type: ' + prop.authType + ' doesn\'t exist');
            }

        } else if (prop.authType == 'login-pass') {
            self._api.loginPassAuth(prop.login, prop.pass, prop.rememberMe, function (a) {
                if (res.login_url) {
                    window.location.href = res.login_url;
                } else {
                    callback(self.createErrorObject('Login or pass not valid', XL.INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE));
                }
            }, function (err) {
                callback(err);
            });
        } else if (prop.authType == 'sms') {
            if (smsAuthStep == 'phone') {
                self._api.smsAuth(prop.phoneNumber, null, null);
            } else if (smsAuthStep == 'code') {

            }

        } else {
            console.error('Unknown auth type');
        }
    }
};


XL.prototype.getAllElementsWithAttribute = function (attribute) {
    var matchingElements = [];
    var allElements = document.getElementsByTagName('*');
    for (var i = 0, n = allElements.length; i < n; i++)
    {
        if (allElements[i].getAttribute(attribute) !== null)
        {
            matchingElements.push(allElements[i]);
        }
    }
    return matchingElements;
};

XL.prototype.createErrorObject = function(message, code) {
    return {
        error: {
            message: message,
            code: code || -1
        }
    };
};

XL.INVALID_LOGIN_ERROR_CODE = 1;
XL.INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE = 2;

module.exports = XL;