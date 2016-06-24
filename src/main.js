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

    self._api = new XLApi(123);
    self._api.getSocialsURLs(function (e) {
        self._socialUrls = value;
    }, function (e) {
        console.log(e);
    });

    self._socialUrls = {'sn-facebook': 'https://facebook.com'};
}

XL.prototype.login = function (prop, callback) {
    var self = this;

    if (!prop) {
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
            
        } else {
            console.error('Unknown auth type');
        }
    }
};




module.exports = XL;