/**
 * Created by a.korotaev on 24.06.16.
 */

var XLApi = require('xlapi.js');
/**
 * Create an `Auth0` instance with `options`
 *
 * @class XL
 * @constructor
 */
function XL (options) {
    var self = this;
    // XXX Deprecated: We prefer new Auth0(...)
    if (!(this instanceof XL)) {
        return new XL(options);
    }

    self._api = new XLApi(options.projectId);
    self._api.getSocialsURLs(function (e) {
        self._socialUrls = value;
    }, function (e) {
        console.log(e);
    });

    self._socialUrls = {'sn-facebook': 'https://facebook.com'};

    if (options.addHandlers == true) {
        var elements = self.getAllElementsWithAttribute('data-xl-auth');
        var login = '';
        var pass = '';

        for (var i = 0; i < elements.length; i++) {
            var nodeValue = elements[i].attributes['data-xl-auth'].nodeValue.toString();
            if (nodeValue.startsWith('sn')) {
                elements[i].onclick = function (e) {
                    self.login({authType: nodeValue});
                }
            } else if (nodeValue == 'form-sms') {
                // elements[i].onsubmit = config.eventHandlers.sms;
            } else if (nodeValue == 'form-login_pass') {
                // elements[i].onsubmit = config.eventHandlers.loginPass;
                elements[i].onsubmit = function (e) {
                    e.preventDefault();
                    self.login({
                        authType: 'login-pass',
                        login: login,
                        pass: pass
                    });
                }
            } else if (nodeValue.startsWith('input-')) {
                if (nodeValue == 'input-login') {
                    login = '';
                } else if (nodeValue == 'input-pass') {
                    pass = '';
                }
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
            window.open(self._socialUrls[prop.authType]);
        } else if (prop.authType == 'login-pass') {
            self._api.loginPassAuth(prop.login, prop.pass, null, null);
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

module.exports = XL;