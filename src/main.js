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

    self._socialUrls = {};

    self._options = {};
    self._options.errorHandler = options.errorHandler || function (a) {
        };
    self._options.loginPassValidator = options.loginPassValidator || function (a, b) {
            return true;
        };
    self._options.isMarkupSocialsHandlersEnabled = options.isMarkupSocialsHandlersEnabled || false;
    self._options.redirectUrl = options.redirectUrl || undefined;
    self._options.apiUrl = options.apiUrl || '//login.xsolla.com/api/';
    self._options.maxXLClickDepth = options.maxXLClickDepth || 20;
    self._options.onlyWidgets = options.onlyWidgets || false;
    self._options.projectId = options.projectId;
    self._options.locale = options.locale || 'en';

    var params = {};
    params.projectId = options.projectId;

    if (self._options.redirectUrl) {
        params.redirect_url = self._options.redirectUrl;
    }

    self._api = new XLApi(options.projectId, self._options.apiUrl);

    if (!self._options.onlyWidgets) {

        var updateSocialLinks = function () {
            self._api.getSocialsURLs(function (response) {
                self._socialUrls = {};
                for (var key in response) {
                    if (response.hasOwnProperty(key)) {
                        self._socialUrls['sn-' + key] = response[key];
                    }
                }
            }, function (e) {
                console.error(e);
            }, params);
        };

        //Update auth links every hour
        updateSocialLinks();
        setInterval(updateSocialLinks, 1000 * 60 * 59);

        var elements = self.getAllElementsWithAttribute('data-xl-auth');
        var login = '';
        var pass = '';

        // Find closest ancestor with data-xl-auth attribute
        function findAncestor(el) {
            if (el.attributes['data-xl-auth']) {
                return el;
            }
            var i = 0;
            while ((el = el.parentElement) && !el.attributes['data-xl-auth'] && ++i < self._options.maxXLClickDepth);
            return el;
        }

        if (self._options.isMarkupSocialsHandlersEnabled) {
            document.addEventListener('click', function (e) {
                var target = findAncestor(e.target);
                // Do nothing if click was outside of elements with data-xl-auth
                if (!target) {
                    return;
                }
                var xlData = target.attributes['data-xl-auth'];
                if (xlData) {
                    var nodeValue = xlData.nodeValue;
                    if (nodeValue) {
                        self.login({authType: nodeValue});
                    }
                }
            });
        }
    }
}
/**
 * Performs login
 * @param prop
 * @param error - call in case error
 * @param success
 */
XL.prototype.login = function (prop, error, success) {
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
            self._api.loginPassAuth(prop.login, prop.pass, prop.rememberMe, self._options.redirectUrl, function (res) {
                if (res.login_url) {
                    var finishAuth = function () {
                        window.location.href = res.login_url;
                    };
                    if (success) {
                        success({status: 'success', finish: finishAuth, redirectUrl: res.login_url});
                    } else {
                        finishAuth();
                    }
                } else {
                    error(self.createErrorObject('Login or pass not valid', XL.INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE));
                }
            }, function (err) {
                error(err);
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

XL.prototype.sendSms = function (number, error, success) {

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

XL.getProjectId = function() {
    return window.__xl._options.projectId;
};

XL.getRedirectURL = function () {
    return window.__xl._options.redirectUrl;
};

XL.init = function (params) {
    if (!window.__xl) {
        var xl = new XL(params);
        window.__xl = xl;
    } else {
        console.error('XL already init!');
    }
};

XL.login = function (prop, error, success) {
    if (window.__xl) {
        window.__xl.login(prop, error, success);
    } else {
        console.error('Please run XL.init() first');
    }
};

XL.AuthWidget = function (elementId, options) {
    if (window.__xl) {
        if (!elementId) {
            console.error('No div name!');
        } else {
            if (options==undefined) {
                options = {};
            }
            var width = options.width || 200;
            var height = options.height || 400;

            // var styleString = 'boreder:none';
            var src = 'http://localhost:8080/home/?projectId=' + XL.getProjectId() + '&locale=' + window.__xl._options.locale;

            var redirectUrl = XL.getRedirectURL();
            if (redirectUrl) {
                src = src + '&redirectUrl='+encodeURIComponent(redirectUrl);
            }

            // var widgetHtml = '<iframe frameborder="0" width="'+width+'" height="'+height+'"  src="'+src+'">Not supported</iframe>';
            var widgetIframe = document.createElement('iframe');
            widgetIframe.onload = function () {
                element.removeChild(preloader);
                widgetIframe.style.width = width+'px';
                widgetIframe.style.height = height+'px';
            };
            widgetIframe.style.width = 0;
            widgetIframe.style.height = 0;
            widgetIframe.frameBorder = '0';
            widgetIframe.src = src;


            var preloader = document.createElement('div');
            preloader.innerHTML = 'Loading...';

            var element = document.getElementById(elementId);
            if (element) {
                element.appendChild(preloader);
                element.appendChild(widgetIframe);
            } else {
                console.error('Element \"' + elementId +'\" not found!');
            }

            // var socket = new easyXDM.Socket({
            //     remote: src, // the path to the provider,
            //     container: element,
            //     onMessage:function(message, origin) {
            //         //do something with message
            //     }
            // });
        }
    } else {
        console.error('Please run XL.init() first');
    }
};

XL.AuthButton = function (divName, options) {

};

XL.INVALID_LOGIN_ERROR_CODE = 1;
XL.INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE = 2;

module.exports = XL;