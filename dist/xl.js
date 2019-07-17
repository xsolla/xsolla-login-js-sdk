(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XL = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){


module.exports = toNoCase


var hasSpace = /\s/
var hasSeparator = /(_|-|\.|:)/
var hasCamel = /([a-z][A-Z]|[A-Z][a-z])/


function toNoCase(string) {
  if (hasSpace.test(string)) return string.toLowerCase()
  if (hasSeparator.test(string)) return (unseparate(string) || string).toLowerCase()
  if (hasCamel.test(string)) return uncamelize(string).toLowerCase()
  return string.toLowerCase()
}


var separatorSplitter = /[\W_]+(.|$)/g


function unseparate(string) {
  return string.replace(separatorSplitter, function (m, next) {
    return next ? ' ' + next : ''
  })
}


var camelSplitter = /(.)([A-Z]+)/g


function uncamelize(string) {
  return string.replace(camelSplitter, function (m, previous, uppers) {
    return previous + ' ' + uppers.toLowerCase().split('').join(' ')
  })
}

},{}],2:[function(require,module,exports){

var toSpace = require('to-space-case')


module.exports = toSnakeCase


function toSnakeCase(string) {
  return toSpace(string).replace(/\s/g, '_')
}

},{"to-space-case":3}],3:[function(require,module,exports){

var clean = require('to-no-case')


module.exports = toSpaceCase


function toSpaceCase(string) {
  return clean(string).replace(/[\W_]+(.|$)/g, function (matches, match) {
    return match ? ' ' + match : ''
  }).trim()
}

},{"to-no-case":1}],4:[function(require,module,exports){
module.exports={
  "version": "2.1.2",
}

},{}],5:[function(require,module,exports){
"use strict";

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    };
}

if (typeof window.CustomEvent !== "function") {
    var CustomEvent = function CustomEvent(event, params) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
    };

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;
}

},{}],6:[function(require,module,exports){
'use strict';


var XLApi = function XLApi(projectId, baseUrl) {
    var self = this;
    this.baseUrl = baseUrl || '//login.xsolla.com/api/';

    this.projectId = projectId;

    this.makeApiCall = function (params, success, error) {
        var r = new XMLHttpRequest();
        r.withCredentials = true;
        r.open(params.method, self.baseUrl + params.endpoint, true);
        r.onreadystatechange = function () {
            if (r.readyState == 4) {
                if (r.status == 200) {
                    success(JSON.parse(r.responseText));
                } else {
                    if (r.responseText) {
                        error(JSON.parse(r.responseText));
                    } else {
                        error({ error: { message: 'Networking error', code: r.status } });
                    }
                }
            }
        };
        if (params.method == 'POST') {
            r.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            r.send(params.postBody);
        } else if (params.method == 'GET') {
            r.send(params.getArguments);
        }
    };
};
XLApi.prototype.getSocialsURLs = function (success, error, getArguments) {
    var str = "";
    for (var key in getArguments) {
        if (str != "") {
            str += "&";
        }
        str += key + "=" + encodeURIComponent(getArguments[key]);
    }

    return this.makeApiCall({ method: 'GET', endpoint: 'social/login_urls?' + str, getArguments: null }, success, error);
};

XLApi.prototype.loginPassAuth = function (login, pass, rememberMe, redirectUrl, success, error) {
    var body = {
        username: login,
        password: pass,
        remember_me: rememberMe
    };
    return this.makeApiCall({ method: 'POST', endpoint: 'proxy/login?projectId=' + this.projectId + '&redirect_url=' + encodeURIComponent(redirectUrl), postBody: JSON.stringify(body) }, success, error);
};

XLApi.prototype.smsAuth = function (phoneNumber, success, error) {
    return this.makeApiCall({ method: 'GET', endpoint: 'sms', getArguments: 'phoneNumber=' + phoneNumber }, success, error);
};

module.exports = XLApi;

},{}],"main":[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _xlapi = require('./xlapi');

var _xlapi2 = _interopRequireDefault(_xlapi);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var toSnakeCase = require('to-snake-case');

require('./supports');
var version = require('../package.json').version;


var ROUTES = {
    LOGIN: '',
    REGISTRATION: 'registration',
    RECOVER_PASSWORD: 'reset-password',
    ALL_SOCIALS: 'other',
    SOCIALS_LOGIN: 'socials',
    USERNAME_LOGIN: 'username-login'
};

var IGNORELIST = ['onlyWidgets', 'apiUrl', 'defaultLoginUrl', 'popupBackgroundColor', 'iframeZIndex', 'preloader', 'widgetBaseUrl', 'route', 'inFullscreenMode', 'redirectUrl', 'widgetVersion', 'callbackUrl', 'loginUrl', 'state'];

var DEFAULT_CONFIG = {
    apiUrl: 'https://login.xsolla.com/api/',
    onlyWidgets: false,
    defaultLoginUrl: 'https://xl-widget.xsolla.com/auth.html',
    popupBackgroundColor: 'rgb(187, 187, 187)',
    iframeZIndex: 1000000,
    preloader: '<div></div>',
    widgetBaseUrl: 'https://xl-widget.xsolla.com/',
    route: ROUTES.LOGIN,
    compact: false,
    inFullscreenMode: false,
    response_type: 'code'
};

var INVALID_LOGIN_ERROR_CODE = 1;
var INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE = 2;

var IFRAME_ID = 'XsollaLoginWidgetIframe';
var widgetIframe = document.createElement('iframe');

var XL = function () {
    function XL() {
        _classCallCheck(this, XL);

        this.socialUrls = {};
        this.eventTypes = {
            LOAD: 'load',
            CLOSE: 'close',
            HIDE_POPUP: 'hide popup',
            REGISTRATION_REQUEST: 'registration request',
            AUTHENTICATED: 'authenticated'
        };

        this.ROUTES = ROUTES;

        this.dispatcher = document.createElement('div');
        this.onHideEvent = this.onHideEvent.bind(this);
    }

    _createClass(XL, [{
        key: 'init',
        value: function init(options) {
            var _this = this;

            this.config = _extends({}, DEFAULT_CONFIG, options);
            this.config.popupBackgroundColor = DEFAULT_CONFIG.popupBackgroundColor;
            this.api = new _xlapi2.default(options.projectId, this.config.apiUrl);

            var eventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent';
            var eventer = window[eventMethod];
            var messageEvent = eventMethod === 'attachEvent' ? 'onmessage' : 'message';

            eventer(messageEvent, function (e) {
                var event = void 0;
                if (typeof e.data === 'string') {
                    event = new CustomEvent(_this.eventTypes[e.data]);
                } else {
                    event = new CustomEvent(_this.eventTypes[e.data.type], { detail: e.data });
                }
                _this.dispatcher.dispatchEvent(event);
            }, false);

            Object.keys(this.eventTypes).map(function (eventKey) {
                _this.on(_this.eventTypes[eventKey]);
            });

            if (options.popupBackgroundColor) {
                this.config.popupBackgroundColor = options.popupBackgroundColor;
            }

            this.dispatcher.addEventListener(this.eventTypes.HIDE_POPUP, this.onHideEvent);

            if (!this.config.onlyWidgets) {

                var params = {};
                params.projectId = options.projectId;
                if (this.config.redirectUrl) {
                    params.redirect_url = this.config.redirectUrl;
                }
                if (this.config.loginUrl) {
                    params.login_url = this.config.loginUrl;
                }
                if (this.config.callbackUrl) {
                    params.login_url = this.config.callbackUrl;
                }
            }
        }


    }, {
        key: 'login',
        value: function login(prop, error, success) {
            var _this2 = this;

            if (!prop || !this.socialUrls) {
                return;
            }

            if (prop.authType) {
                if (prop.authType.startsWith('sn-')) {
                    var socialUrl = this.socialUrls[prop.authType];
                    if (socialUrl != undefined) {
                        window.location.href = this.socialUrls[prop.authType];
                    } else {
                        console.error('Auth type: ' + prop.authType + ' doesn\'t exist');
                    }
                } else if (prop.authType == 'login-pass') {
                    this.api.loginPassAuth(prop.login, prop.pass, prop.rememberMe, this.config.redirectUrl, function (res) {
                        if (res.login_url) {
                            var finishAuth = function finishAuth() {
                                window.location.href = res.login_url;
                            };
                            if (success) {
                                success({ status: 'success', finish: finishAuth, redirectUrl: res.login_url });
                            } else {
                                finishAuth();
                            }
                        } else {
                            error(_this2.createErrorObject('Login or pass not valid', INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE));
                        }
                    }, function (err) {
                        error(err);
                    });
                } else if (prop.authType == 'sms') {
                    if (smsAuthStep == 'phone') {
                        this.api.smsAuth(prop.phoneNumber, null, null);
                    } else if (smsAuthStep == 'code') {}
                } else {
                    console.error('Unknown auth type');
                }
            }
        }
    }, {
        key: 'createErrorObject',
        value: function createErrorObject(message, code) {
            return {
                error: {
                    message: message,
                    code: code || -1
                }
            };
        }
    }, {
        key: 'getProjectId',
        value: function getProjectId() {
            return this.config.projectId;
        }
    }, {
        key: 'getRedirectURL',
        value: function getRedirectURL() {
            return this.config.redirectUrl;
        }
    }, {
        key: 'getTheme',
        value: function getTheme() {
            return this.config.theme;
        }
    }, {
        key: 'getCallbackUrl',
        value: function getCallbackUrl() {
            if (this.config.callbackUrl) {
                return this.config.callbackUrl;
            } else if (this.config.loginUrl) {
                return this.config.loginUrl;
            } else if (this.config.externalWindow) {
                return DEFAULT_CONFIG.defaultLoginUrl;
            }
        }
    }, {
        key: 'getIframeSrc',


        value: function getIframeSrc() {
            return this.getLink.apply(this, arguments);
        }
    }, {
        key: 'getLink',
        value: function getLink() {
            var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            var widgetBaseUrl = options.widgetBaseUrl || this.config.widgetBaseUrl;

            if (widgetBaseUrl.substr(-1) !== '/') {
                widgetBaseUrl += '/';
            }

            var route = options.route || this.config.route;

            var src = widgetBaseUrl + route + '?widget_sdk_version=' + version + '&projectId=' + this.getProjectId();

            var useOAuth2 = false;

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = Object.keys(this.config)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var option = _step.value;

                    if (!IGNORELIST.includes(option)) {
                        var snakeOption = toSnakeCase(option);
                        if (!useOAuth2 && snakeOption === 'client_id') {
                            useOAuth2 = true;
                        }
                        src += '&' + snakeOption + '=' + encodeURIComponent(this.config[option]);
                    }
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            var redirectUrl = this.getRedirectURL();
            if (redirectUrl) {
                src = src + '&redirectUrl=' + encodeURIComponent(redirectUrl);
            }

            var callbackUrl = this.getCallbackUrl();

            if (callbackUrl) {
                src = src + '&login_url=' + encodeURIComponent(callbackUrl);
            }

            var _config = this.config,
                externalWindow = _config.externalWindow,
                state = _config.state;

            if (externalWindow) {
                src = src + '&external_window=' + encodeURIComponent(externalWindow);
            }

            if (useOAuth2) {
                src += '&state=' + (state || Math.random().toString(36).substring(2));
            }

            var widgetVersion = this.config.widgetVersion;
            if (widgetVersion) {
                src += '&version=' + encodeURIComponent(widgetVersion);
            }

            return src;
        }
    }, {
        key: 'AuthWidget',
        value: function AuthWidget(elementId, options) {
            var _this3 = this;

            if (this.api) {
                if (!elementId) {
                    console.error('No div name!');
                } else {
                    if (options == undefined) {
                        options = {};
                    }
                    var width = (options.width || 400) + 'px';
                    var height = (options.height || 550) + 'px';

                    widgetIframe.onload = function () {
                        _element.removeChild(_preloader);
                        widgetIframe.style.width = '100%';
                        widgetIframe.style.height = '100%';
                        var event = new CustomEvent('load');
                        _this3.dispatcher.dispatchEvent(event);
                    };
                    widgetIframe.style.width = 0;
                    widgetIframe.style.height = 0;
                    widgetIframe.frameBorder = '0';
                    widgetIframe.src = this.getIframeSrc(options);
                    widgetIframe.id = IFRAME_ID;

                    var _preloader = document.createElement('div');

                    _preloader.innerHTML = this.config.preloader;

                    var _element = document.getElementById(elementId);
                    if (_element) {
                        _element.style.width = width;
                        _element.style.height = height;
                        _element.appendChild(_preloader);
                        _element.appendChild(widgetIframe);
                    } else {
                        console.error('Element \"' + elementId + '\" not found!');
                    }
                }
            } else {
                console.error('Please run XL.init() first');
            }
        }
    }, {
        key: 'onCloseEvent',
        value: function onCloseEvent() {
            widgetIframe.parentNode.removeChild(widgetIframe);
        }
    }, {
        key: '_hide',
        value: function _hide() {
            widgetIframe.style.position = '';
            widgetIframe.style.zIndex = '';
            widgetIframe.style.left = '';
            widgetIframe.style.top = '';
            widgetIframe.style.width = 0;
            widgetIframe.style.height = 0;
            widgetIframe.style.backgroundColor = '';
        }
    }, {
        key: 'onHideEvent',
        value: function onHideEvent() {
            if (this.config.inFullscreenMode) {
                this._hide();
            }
        }


    }, {
        key: 'on',
        value: function on(event, handler) {
            handler = handler || function () {};

            if (event === this.eventTypes.CLOSE) {
                if (!handler) {
                    handler = this.onCloseEvent;
                } else {
                    this.dispatcher.removeEventListener(event, this.onCloseEvent);
                }
            }

            this.dispatcher.addEventListener(event, function (e) {
                return handler(e.detail);
            });
        }
    }, {
        key: '_show',
        value: function _show() {
            widgetIframe.style.position = 'fixed';
            widgetIframe.style.zIndex = this.config.iframeZIndex;
            widgetIframe.style.left = '0';
            widgetIframe.style.top = '0';
            widgetIframe.style.width = '100%';
            widgetIframe.style.height = '100%';
            widgetIframe.style.backgroundColor = this.config.popupBackgroundColor;
            this.config.inFullscreenMode = true;
        }


    }, {
        key: 'show',
        value: function show() {
            var _this4 = this;

            if (!document.getElementById(IFRAME_ID)) {
                widgetIframe.src = this.getIframeSrc();
                widgetIframe.id = IFRAME_ID;
                widgetIframe.style.width = 0;
                widgetIframe.style.height = 0;
                widgetIframe.frameBorder = '0';

                widgetIframe.onload = function () {
                    var event = new CustomEvent('load');
                    _this4.dispatcher.dispatchEvent(event);
                };
                this._show();

                document.body.appendChild(widgetIframe);
            } else {
                this._show();
            }
        }
    }]);

    return XL;
}();

var result = new XL();

module.exports = result;

},{"../package.json":4,"./supports":5,"./xlapi":6,"to-snake-case":2}]},{},["main"])("main")
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvdG8tbm8tY2FzZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy90by1zbmFrZS1jYXNlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3RvLXNwYWNlLWNhc2UvaW5kZXguanMiLCIvVXNlcnMvYS5ib3J0bmlrb3YveHNvbGxhLWxvZ2luLWpzLXNkay9wYWNrYWdlLmpzb24iLCJzcmMvc3VwcG9ydHMuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQSxNQUFNLENBQUMsT0FBTyxDQUFDO0VBQ2IseURBQThCO0VB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LFdBQWQsQ0FBMEIsWUFBMUI7QUFDSCxhQWRELE1BY087QUFDSCxxQkFBSyxLQUFMO0FBQ0g7QUFDSjs7Ozs7O0FBR0wsSUFBTSxTQUFTLElBQUksRUFBSixFQUFmOztBQUVBLE9BQU8sT0FBUCxHQUFpQixNQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlxuLyoqXG4gKiBFeHBvcnQuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB0b05vQ2FzZVxuXG4vKipcbiAqIFRlc3Qgd2hldGhlciBhIHN0cmluZyBpcyBjYW1lbC1jYXNlLlxuICovXG5cbnZhciBoYXNTcGFjZSA9IC9cXHMvXG52YXIgaGFzU2VwYXJhdG9yID0gLyhffC18XFwufDopL1xudmFyIGhhc0NhbWVsID0gLyhbYS16XVtBLVpdfFtBLVpdW2Etel0pL1xuXG4vKipcbiAqIFJlbW92ZSBhbnkgc3RhcnRpbmcgY2FzZSBmcm9tIGEgYHN0cmluZ2AsIGxpa2UgY2FtZWwgb3Igc25ha2UsIGJ1dCBrZWVwXG4gKiBzcGFjZXMgYW5kIHB1bmN0dWF0aW9uIHRoYXQgbWF5IGJlIGltcG9ydGFudCBvdGhlcndpc2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZ1xuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5cbmZ1bmN0aW9uIHRvTm9DYXNlKHN0cmluZykge1xuICBpZiAoaGFzU3BhY2UudGVzdChzdHJpbmcpKSByZXR1cm4gc3RyaW5nLnRvTG93ZXJDYXNlKClcbiAgaWYgKGhhc1NlcGFyYXRvci50ZXN0KHN0cmluZykpIHJldHVybiAodW5zZXBhcmF0ZShzdHJpbmcpIHx8IHN0cmluZykudG9Mb3dlckNhc2UoKVxuICBpZiAoaGFzQ2FtZWwudGVzdChzdHJpbmcpKSByZXR1cm4gdW5jYW1lbGl6ZShzdHJpbmcpLnRvTG93ZXJDYXNlKClcbiAgcmV0dXJuIHN0cmluZy50b0xvd2VyQ2FzZSgpXG59XG5cbi8qKlxuICogU2VwYXJhdG9yIHNwbGl0dGVyLlxuICovXG5cbnZhciBzZXBhcmF0b3JTcGxpdHRlciA9IC9bXFxXX10rKC58JCkvZ1xuXG4vKipcbiAqIFVuLXNlcGFyYXRlIGEgYHN0cmluZ2AuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZ1xuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5cbmZ1bmN0aW9uIHVuc2VwYXJhdGUoc3RyaW5nKSB7XG4gIHJldHVybiBzdHJpbmcucmVwbGFjZShzZXBhcmF0b3JTcGxpdHRlciwgZnVuY3Rpb24gKG0sIG5leHQpIHtcbiAgICByZXR1cm4gbmV4dCA/ICcgJyArIG5leHQgOiAnJ1xuICB9KVxufVxuXG4vKipcbiAqIENhbWVsY2FzZSBzcGxpdHRlci5cbiAqL1xuXG52YXIgY2FtZWxTcGxpdHRlciA9IC8oLikoW0EtWl0rKS9nXG5cbi8qKlxuICogVW4tY2FtZWxjYXNlIGEgYHN0cmluZ2AuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZ1xuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5cbmZ1bmN0aW9uIHVuY2FtZWxpemUoc3RyaW5nKSB7XG4gIHJldHVybiBzdHJpbmcucmVwbGFjZShjYW1lbFNwbGl0dGVyLCBmdW5jdGlvbiAobSwgcHJldmlvdXMsIHVwcGVycykge1xuICAgIHJldHVybiBwcmV2aW91cyArICcgJyArIHVwcGVycy50b0xvd2VyQ2FzZSgpLnNwbGl0KCcnKS5qb2luKCcgJylcbiAgfSlcbn1cbiIsIlxudmFyIHRvU3BhY2UgPSByZXF1aXJlKCd0by1zcGFjZS1jYXNlJylcblxuLyoqXG4gKiBFeHBvcnQuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB0b1NuYWtlQ2FzZVxuXG4vKipcbiAqIENvbnZlcnQgYSBgc3RyaW5nYCB0byBzbmFrZSBjYXNlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmdcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuXG5mdW5jdGlvbiB0b1NuYWtlQ2FzZShzdHJpbmcpIHtcbiAgcmV0dXJuIHRvU3BhY2Uoc3RyaW5nKS5yZXBsYWNlKC9cXHMvZywgJ18nKVxufVxuIiwiXG52YXIgY2xlYW4gPSByZXF1aXJlKCd0by1uby1jYXNlJylcblxuLyoqXG4gKiBFeHBvcnQuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB0b1NwYWNlQ2FzZVxuXG4vKipcbiAqIENvbnZlcnQgYSBgc3RyaW5nYCB0byBzcGFjZSBjYXNlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmdcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuXG5mdW5jdGlvbiB0b1NwYWNlQ2FzZShzdHJpbmcpIHtcbiAgcmV0dXJuIGNsZWFuKHN0cmluZykucmVwbGFjZSgvW1xcV19dKygufCQpL2csIGZ1bmN0aW9uIChtYXRjaGVzLCBtYXRjaCkge1xuICAgIHJldHVybiBtYXRjaCA/ICcgJyArIG1hdGNoIDogJydcbiAgfSkudHJpbSgpXG59XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwibmFtZVwiOiBcInhzb2xsYS1sb2dpbi1qcy1zZGtcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMi4xLjJcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIlwiLFxuICBcIm1haW5cIjogXCJzcmMvbWFpbi5qc1wiLFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiYnVpbGRcIjogXCJndWxwIGJ1aWxkXCIsXG4gICAgXCJob3N0XCI6IFwic3RhdGljLXNlcnZlciAuIC1wIDgwODRcIixcbiAgICBcInRlc3RcIjogXCJqZXN0XCJcbiAgfSxcbiAgXCJhdXRob3JcIjogXCJcIixcbiAgXCJsaWNlbnNlXCI6IFwiTUlUXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcInRvLXNuYWtlLWNhc2VcIjogXCJeMS4wLjBcIlxuICB9LFxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAYmFiZWwvY29yZVwiOiBcIl43LjQuNVwiLFxuICAgIFwiQGJhYmVsL3ByZXNldC1lbnZcIjogXCJeNy40LjVcIixcbiAgICBcImJhYmVsLWplc3RcIjogXCJeMjQuOC4wXCIsXG4gICAgXCJiYWJlbC1wbHVnaW4tdHJhbnNmb3JtLW9iamVjdC1hc3NpZ25cIjogXCJeNi4yMi4wXCIsXG4gICAgXCJiYWJlbC1wcmVzZXQtZXMyMDE1XCI6IFwiXjYuMTguMFwiLFxuICAgIFwiYmFiZWxpZnlcIjogXCJeNy4zLjBcIixcbiAgICBcImJvd2VyXCI6IFwiXjEuOC44XCIsXG4gICAgXCJicmZzXCI6IFwiXjIuMC4xXCIsXG4gICAgXCJicm93c2VyLXN5bmNcIjogXCJeMi4yNi43XCIsXG4gICAgXCJicm93c2VyaWZ5XCI6IFwiXjE2LjIuM1wiLFxuICAgIFwiYnJvd3NlcmlmeS1pc3RhbmJ1bFwiOiBcIl4yLjAuMFwiLFxuICAgIFwiYnJvd3NlcmlmeS1zaGltXCI6IFwiXjMuOC4xMlwiLFxuICAgIFwiY29tbW9uLXNoYWtlaWZ5XCI6IFwiXjAuNi4wXCIsXG4gICAgXCJndWxwXCI6IFwiXjQuMC4yXCIsXG4gICAgXCJndWxwLWlmXCI6IFwiXjIuMC4yXCIsXG4gICAgXCJndWxwLXJlbmFtZVwiOiBcIjEuMi4wXCIsXG4gICAgXCJndWxwLXNvdXJjZW1hcHNcIjogXCJeMi42LjVcIixcbiAgICBcImd1bHAtc3RyaXAtY29tbWVudHNcIjogXCJeMi41LjJcIixcbiAgICBcImd1bHAtdWdsaWZ5XCI6IFwiXjMuMC4xXCIsXG4gICAgXCJndWxwLXV0aWxcIjogXCIzLjAuNlwiLFxuICAgIFwiamFzbWluZVwiOiBcIl4yLjQuMVwiLFxuICAgIFwiamVzdFwiOiBcIl4yNC44LjBcIixcbiAgICBcImpzZG9tXCI6IFwiXjE1LjEuMVwiLFxuICAgIFwic3RhdGljLXNlcnZlclwiOiBcIjIuMi4xXCIsXG4gICAgXCJ1cmwtcGFyc2VcIjogXCJeMS40LjdcIixcbiAgICBcInZpbnlsLWJ1ZmZlclwiOiBcIl4xLjAuMVwiLFxuICAgIFwidmlueWwtc291cmNlLXN0cmVhbVwiOiBcIl4yLjAuMFwiLFxuICAgIFwid2F0Y2hpZnlcIjogXCJeMy4xMS4xXCJcbiAgfSxcbiAgXCJicm93c2VyaWZ5LXNoaW1cIjoge1xuICAgIFwiZXh0ZXJuYWxcIjogXCJnbG9iYWw6RXh0ZXJuYWxcIlxuICB9XG59XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAwNy4xMS4xNi5cbiAqL1xuaWYgKCFTdHJpbmcucHJvdG90eXBlLnN0YXJ0c1dpdGgpIHtcbiAgICBTdHJpbmcucHJvdG90eXBlLnN0YXJ0c1dpdGggPSBmdW5jdGlvbihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSB7XG4gICAgICAgIHBvc2l0aW9uID0gcG9zaXRpb24gfHwgMDtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXhPZihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSA9PT0gcG9zaXRpb247XG4gICAgfTtcbn1cblxuaWYgKCB0eXBlb2Ygd2luZG93LkN1c3RvbUV2ZW50ICE9PSBcImZ1bmN0aW9uXCIgKSB7XG4gICAgZnVuY3Rpb24gQ3VzdG9tRXZlbnQoZXZlbnQsIHBhcmFtcykge1xuICAgICAgICBwYXJhbXMgPSBwYXJhbXMgfHwge2J1YmJsZXM6IGZhbHNlLCBjYW5jZWxhYmxlOiBmYWxzZSwgZGV0YWlsOiB1bmRlZmluZWR9O1xuICAgICAgICB2YXIgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0N1c3RvbUV2ZW50Jyk7XG4gICAgICAgIGV2dC5pbml0Q3VzdG9tRXZlbnQoZXZlbnQsIHBhcmFtcy5idWJibGVzLCBwYXJhbXMuY2FuY2VsYWJsZSwgcGFyYW1zLmRldGFpbCk7XG4gICAgICAgIHJldHVybiBldnQ7XG4gICAgfVxuXG4gICAgQ3VzdG9tRXZlbnQucHJvdG90eXBlID0gd2luZG93LkV2ZW50LnByb3RvdHlwZTtcblxuICAgIHdpbmRvdy5DdXN0b21FdmVudCA9IEN1c3RvbUV2ZW50O1xufSIsIi8qKlxuICogQ3JlYXRlZCBieSBhLmtvcm90YWV2IG9uIDI0LjA2LjE2LlxuICovXG4vKipcbiAqIEltcGVsZW1lbnRzIFhzb2xsYSBMb2dpbiBBcGlcbiAqIEBwYXJhbSBwcm9qZWN0SWQgLSBwcm9qZWN0J3MgdW5pcXVlIGlkZW50aWZpZXJcbiAqIEBwYXJhbSBiYXNlVXJsIC0gYXBpIGVuZHBvaW50XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuXG52YXIgWExBcGkgPSBmdW5jdGlvbiAocHJvamVjdElkLCBiYXNlVXJsKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuYmFzZVVybCA9IGJhc2VVcmwgfHwgJy8vbG9naW4ueHNvbGxhLmNvbS9hcGkvJztcblxuICAgIHRoaXMucHJvamVjdElkID0gcHJvamVjdElkO1xuXG4gICAgdGhpcy5tYWtlQXBpQ2FsbCA9IGZ1bmN0aW9uIChwYXJhbXMsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgICAgIHZhciByID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICAgICAgci5vcGVuKHBhcmFtcy5tZXRob2QsIHNlbGYuYmFzZVVybCArIHBhcmFtcy5lbmRwb2ludCwgdHJ1ZSk7XG4gICAgICAgIHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHIucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzKEpTT04ucGFyc2Uoci5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoci5yZXNwb25zZVRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKEpTT04ucGFyc2Uoci5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKHtlcnJvcjoge21lc3NhZ2U6ICdOZXR3b3JraW5nIGVycm9yJywgY29kZTogci5zdGF0dXN9fSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGlmIChwYXJhbXMubWV0aG9kID09ICdQT1NUJykge1xuICAgICAgICAgICAgci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04XCIpO1xuICAgICAgICAgICAgci5zZW5kKHBhcmFtcy5wb3N0Qm9keSk7XG4gICAgICAgIH0gZWxzZSBpZiAocGFyYW1zLm1ldGhvZCA9PSAnR0VUJykge1xuICAgICAgICAgICAgci5zZW5kKHBhcmFtcy5nZXRBcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgfTtcbn07XG4vKipcbiAqIEdldCBhbGwgYXZpYWxhYmxlIHNvY2lhbCBtZXRob2RzIGF1dGggdXJsXG4gKiBAcGFyYW0gc3VjY2VzcyAtIHN1Y2Nlc3MgY2FsbGJhY2tcbiAqIEBwYXJhbSBlcnJvciAtIGVycm9yIGNhbGxiYWNrXG4gKiBAcGFyYW0gZ2V0QXJndW1lbnRzIC0gYWRkaXRpb25hbCBwYXJhbXMgdG8gc2VuZCB3aXRoIHJlcXVlc3RcbiAqL1xuWExBcGkucHJvdG90eXBlLmdldFNvY2lhbHNVUkxzID0gZnVuY3Rpb24gKHN1Y2Nlc3MsIGVycm9yLCBnZXRBcmd1bWVudHMpIHtcbiAgICB2YXIgc3RyID0gXCJcIjtcbiAgICBmb3IgKHZhciBrZXkgaW4gZ2V0QXJndW1lbnRzKSB7XG4gICAgICAgIGlmIChzdHIgIT0gXCJcIikge1xuICAgICAgICAgICAgc3RyICs9IFwiJlwiO1xuICAgICAgICB9XG4gICAgICAgIHN0ciArPSBrZXkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChnZXRBcmd1bWVudHNba2V5XSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ0dFVCcsIGVuZHBvaW50OiAnc29jaWFsL2xvZ2luX3VybHM/JyArIHN0ciwgZ2V0QXJndW1lbnRzOiBudWxsfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxuWExBcGkucHJvdG90eXBlLmxvZ2luUGFzc0F1dGggPSBmdW5jdGlvbiAobG9naW4sIHBhc3MsIHJlbWVtYmVyTWUsIHJlZGlyZWN0VXJsLCBzdWNjZXNzLCBlcnJvcikge1xuICAgIHZhciBib2R5ID0ge1xuICAgICAgICB1c2VybmFtZTogbG9naW4sXG4gICAgICAgIHBhc3N3b3JkOiBwYXNzLFxuICAgICAgICByZW1lbWJlcl9tZTogcmVtZW1iZXJNZVxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ1BPU1QnLCBlbmRwb2ludDogJ3Byb3h5L2xvZ2luP3Byb2plY3RJZD0nK3RoaXMucHJvamVjdElkICsgJyZyZWRpcmVjdF91cmw9JyArIGVuY29kZVVSSUNvbXBvbmVudChyZWRpcmVjdFVybCksIHBvc3RCb2R5OiBKU09OLnN0cmluZ2lmeShib2R5KX0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cblhMQXBpLnByb3RvdHlwZS5zbXNBdXRoID0gZnVuY3Rpb24gKHBob25lTnVtYmVyLCBzdWNjZXNzLCBlcnJvcikge1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ3NtcycsIGdldEFyZ3VtZW50czogJ3Bob25lTnVtYmVyPScgKyBwaG9uZU51bWJlcn0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gWExBcGk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuY29uc3QgdG9TbmFrZUNhc2UgPSByZXF1aXJlKCd0by1zbmFrZS1jYXNlJyk7XG5cbnJlcXVpcmUoJy4vc3VwcG9ydHMnKTtcbmNvbnN0IHZlcnNpb24gPSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKS52ZXJzaW9uO1xuXG5pbXBvcnQgWExBcGkgZnJvbSAnLi94bGFwaSc7XG4vKipcbiAqIENyZWF0ZSBhbiBgQXV0aDBgIGluc3RhbmNlIHdpdGggYG9wdGlvbnNgXG4gKlxuICogQGNsYXNzIFhMXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuXG5jb25zdCBST1VURVMgPSB7XG4gICAgTE9HSU46ICcnLFxuICAgIFJFR0lTVFJBVElPTjogJ3JlZ2lzdHJhdGlvbicsXG4gICAgUkVDT1ZFUl9QQVNTV09SRDogJ3Jlc2V0LXBhc3N3b3JkJyxcbiAgICBBTExfU09DSUFMUzogJ290aGVyJyxcbiAgICBTT0NJQUxTX0xPR0lOOiAnc29jaWFscycsXG4gICAgVVNFUk5BTUVfTE9HSU46ICd1c2VybmFtZS1sb2dpbicsXG59O1xuXG5jb25zdCBJR05PUkVMSVNUID0gW1xuICAgICdvbmx5V2lkZ2V0cycsXG4gICAgJ2FwaVVybCcsXG4gICAgJ2RlZmF1bHRMb2dpblVybCcsXG4gICAgJ3BvcHVwQmFja2dyb3VuZENvbG9yJyxcbiAgICAnaWZyYW1lWkluZGV4JyxcbiAgICAncHJlbG9hZGVyJyxcbiAgICAnd2lkZ2V0QmFzZVVybCcsXG4gICAgJ3JvdXRlJyxcbiAgICAnaW5GdWxsc2NyZWVuTW9kZScsXG5cbiAgICAncmVkaXJlY3RVcmwnLFxuICAgICd3aWRnZXRWZXJzaW9uJyxcblxuICAgICdjYWxsYmFja1VybCcsXG4gICAgJ2xvZ2luVXJsJyxcbiAgICAnc3RhdGUnXG5dO1xuXG5jb25zdCBERUZBVUxUX0NPTkZJRyA9IHtcbiAgICBhcGlVcmw6ICdodHRwczovL2xvZ2luLnhzb2xsYS5jb20vYXBpLycsXG4gICAgb25seVdpZGdldHM6IGZhbHNlLFxuICAgIGRlZmF1bHRMb2dpblVybDogJ2h0dHBzOi8veGwtd2lkZ2V0Lnhzb2xsYS5jb20vYXV0aC5odG1sJyxcbiAgICBwb3B1cEJhY2tncm91bmRDb2xvcjogJ3JnYigxODcsIDE4NywgMTg3KScsXG4gICAgaWZyYW1lWkluZGV4OiAxMDAwMDAwLFxuICAgIHByZWxvYWRlcjogJzxkaXY+PC9kaXY+JyxcbiAgICB3aWRnZXRCYXNlVXJsOiAnaHR0cHM6Ly94bC13aWRnZXQueHNvbGxhLmNvbS8nLFxuICAgIHJvdXRlOiBST1VURVMuTE9HSU4sXG4gICAgY29tcGFjdDogZmFsc2UsXG4gICAgaW5GdWxsc2NyZWVuTW9kZTogZmFsc2UsXG4gICAgcmVzcG9uc2VfdHlwZTogJ2NvZGUnXG59O1xuXG5jb25zdCBJTlZBTElEX0xPR0lOX0VSUk9SX0NPREUgPSAxO1xuY29uc3QgSU5DT1JSRUNUX0xPR0lOX09SX1BBU1NXT1JEX0VSUk9SX0NPREUgPSAyO1xuXG5jb25zdCBJRlJBTUVfSUQgPSAnWHNvbGxhTG9naW5XaWRnZXRJZnJhbWUnO1xuY29uc3Qgd2lkZ2V0SWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG5cbmNsYXNzIFhMIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5zb2NpYWxVcmxzID0ge307XG4gICAgICAgIHRoaXMuZXZlbnRUeXBlcyA9IHtcbiAgICAgICAgICAgIExPQUQ6ICdsb2FkJyxcbiAgICAgICAgICAgIENMT1NFOiAnY2xvc2UnLFxuICAgICAgICAgICAgSElERV9QT1BVUDogJ2hpZGUgcG9wdXAnLFxuICAgICAgICAgICAgUkVHSVNUUkFUSU9OX1JFUVVFU1Q6ICdyZWdpc3RyYXRpb24gcmVxdWVzdCcsXG4gICAgICAgICAgICBBVVRIRU5USUNBVEVEOiAnYXV0aGVudGljYXRlZCdcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBuZWVkIGZvciBleHBvcnQgcHVycG9zZXNcbiAgICAgICAgdGhpcy5ST1VURVMgPSBST1VURVM7XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHRoaXMub25IaWRlRXZlbnQgPSB0aGlzLm9uSGlkZUV2ZW50LmJpbmQodGhpcyk7XG4gICAgfVxuXG4gICAgaW5pdChvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuY29uZmlnID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9DT05GSUcsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLmNvbmZpZy5wb3B1cEJhY2tncm91bmRDb2xvciA9IERFRkFVTFRfQ09ORklHLnBvcHVwQmFja2dyb3VuZENvbG9yO1xuICAgICAgICB0aGlzLmFwaSA9IG5ldyBYTEFwaShvcHRpb25zLnByb2plY3RJZCwgdGhpcy5jb25maWcuYXBpVXJsKTtcblxuICAgICAgICBjb25zdCBldmVudE1ldGhvZCA9IHdpbmRvdy5hZGRFdmVudExpc3RlbmVyID8gJ2FkZEV2ZW50TGlzdGVuZXInIDogJ2F0dGFjaEV2ZW50JztcbiAgICAgICAgY29uc3QgZXZlbnRlciA9IHdpbmRvd1tldmVudE1ldGhvZF07XG4gICAgICAgIGNvbnN0IG1lc3NhZ2VFdmVudCA9IGV2ZW50TWV0aG9kID09PSAnYXR0YWNoRXZlbnQnID8gJ29ubWVzc2FnZScgOiAnbWVzc2FnZSc7XG5cbiAgICAgICAgLy8gTGlzdGVuIHRvIG1lc3NhZ2UgZnJvbSBjaGlsZCB3aW5kb3dcbiAgICAgICAgZXZlbnRlcihtZXNzYWdlRXZlbnQsIChlKSA9PiB7XG4gICAgICAgICAgICBsZXQgZXZlbnQ7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGUuZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAvLyBPbGQgZm9ybWF0IC0gc3RyaW5nIG9ubHlcbiAgICAgICAgICAgICAgICBldmVudCA9IG5ldyBDdXN0b21FdmVudCh0aGlzLmV2ZW50VHlwZXNbZS5kYXRhXSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5ldyBmb3JtYXQgLSB7dHlwZTogJ2V2ZW50JywgLi4ufVxuICAgICAgICAgICAgICAgIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KHRoaXMuZXZlbnRUeXBlc1tlLmRhdGEudHlwZV0sIHtkZXRhaWw6IGUuZGF0YX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICB9LCBmYWxzZSk7XG5cbiAgICAgICAgT2JqZWN0LmtleXModGhpcy5ldmVudFR5cGVzKS5tYXAoKGV2ZW50S2V5KSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uKHRoaXMuZXZlbnRUeXBlc1tldmVudEtleV0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZihvcHRpb25zLnBvcHVwQmFja2dyb3VuZENvbG9yKSB7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZy5wb3B1cEJhY2tncm91bmRDb2xvciA9IG9wdGlvbnMucG9wdXBCYWNrZ3JvdW5kQ29sb3I7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmRpc3BhdGNoZXIuYWRkRXZlbnRMaXN0ZW5lcih0aGlzLmV2ZW50VHlwZXMuSElERV9QT1BVUCwgdGhpcy5vbkhpZGVFdmVudCk7XG5cbiAgICAgICAgaWYgKCF0aGlzLmNvbmZpZy5vbmx5V2lkZ2V0cykge1xuXG4gICAgICAgICAgICBsZXQgcGFyYW1zID0ge307XG4gICAgICAgICAgICBwYXJhbXMucHJvamVjdElkID0gb3B0aW9ucy5wcm9qZWN0SWQ7XG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcucmVkaXJlY3RVcmwpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMucmVkaXJlY3RfdXJsID0gdGhpcy5jb25maWcucmVkaXJlY3RVcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcubG9naW5VcmwpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMubG9naW5fdXJsID0gdGhpcy5jb25maWcubG9naW5Vcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuY2FsbGJhY2tVcmwpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMubG9naW5fdXJsID0gdGhpcy5jb25maWcuY2FsbGJhY2tVcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBsb2dpblxuICAgICAqIEBwYXJhbSBwcm9wXG4gICAgICogQHBhcmFtIGVycm9yIC0gY2FsbCBpbiBjYXNlIGVycm9yXG4gICAgICogQHBhcmFtIHN1Y2Nlc3NcbiAgICAgKi9cbiAgICBsb2dpbihwcm9wLCBlcnJvciwgc3VjY2Vzcykge1xuXG4gICAgICAgIGlmICghcHJvcCB8fCAhdGhpcy5zb2NpYWxVcmxzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogcHJvcHNcbiAgICAgICAgICogYXV0aFR5cGU6IHNuLTxzb2NpYWwgbmFtZT4sIGxvZ2luLXBhc3MsIHNtc1xuICAgICAgICAgKi9cbiAgICAgICAgaWYgKHByb3AuYXV0aFR5cGUpIHtcbiAgICAgICAgICAgIGlmIChwcm9wLmF1dGhUeXBlLnN0YXJ0c1dpdGgoJ3NuLScpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc29jaWFsVXJsID0gdGhpcy5zb2NpYWxVcmxzW3Byb3AuYXV0aFR5cGVdO1xuICAgICAgICAgICAgICAgIGlmIChzb2NpYWxVcmwgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gdGhpcy5zb2NpYWxVcmxzW3Byb3AuYXV0aFR5cGVdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F1dGggdHlwZTogJyArIHByb3AuYXV0aFR5cGUgKyAnIGRvZXNuXFwndCBleGlzdCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wLmF1dGhUeXBlID09ICdsb2dpbi1wYXNzJykge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBpLmxvZ2luUGFzc0F1dGgocHJvcC5sb2dpbiwgcHJvcC5wYXNzLCBwcm9wLnJlbWVtYmVyTWUsIHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsLCAocmVzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXMubG9naW5fdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaW5pc2hBdXRoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVzLmxvZ2luX3VybDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3Moe3N0YXR1czogJ3N1Y2Nlc3MnLCBmaW5pc2g6IGZpbmlzaEF1dGgsIHJlZGlyZWN0VXJsOiByZXMubG9naW5fdXJsfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmlzaEF1dGgoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKHRoaXMuY3JlYXRlRXJyb3JPYmplY3QoJ0xvZ2luIG9yIHBhc3Mgbm90IHZhbGlkJywgSU5DT1JSRUNUX0xPR0lOX09SX1BBU1NXT1JEX0VSUk9SX0NPREUpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnc21zJykge1xuICAgICAgICAgICAgICAgIGlmIChzbXNBdXRoU3RlcCA9PSAncGhvbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBpLnNtc0F1dGgocHJvcC5waG9uZU51bWJlciwgbnVsbCwgbnVsbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzbXNBdXRoU3RlcCA9PSAnY29kZScpIHtcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5rbm93biBhdXRoIHR5cGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNyZWF0ZUVycm9yT2JqZWN0KG1lc3NhZ2UsIGNvZGUpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICBjb2RlOiBjb2RlIHx8IC0xXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIGdldFByb2plY3RJZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLnByb2plY3RJZDtcbiAgICB9O1xuXG4gICAgZ2V0UmVkaXJlY3RVUkwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy5yZWRpcmVjdFVybDtcbiAgICB9O1xuXG4gICAgZ2V0VGhlbWUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy50aGVtZTtcbiAgICB9XG5cbiAgICBnZXRDYWxsYmFja1VybCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmNhbGxiYWNrVXJsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWcuY2FsbGJhY2tVcmw7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcubG9naW5VcmwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy5sb2dpblVybDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5leHRlcm5hbFdpbmRvdykge1xuICAgICAgICAgICAgcmV0dXJuIERFRkFVTFRfQ09ORklHLmRlZmF1bHRMb2dpblVybDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAZGVwcmVjYXRlZCB1c2UgZ2V0TGluayBpbnN0ZWFkXG4gICAgICovXG4gICAgZ2V0SWZyYW1lU3JjKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRMaW5rLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgZ2V0TGluayhvcHRpb25zID0ge30pIHtcbiAgICAgICAgbGV0IHdpZGdldEJhc2VVcmwgPSBvcHRpb25zLndpZGdldEJhc2VVcmwgfHwgdGhpcy5jb25maWcud2lkZ2V0QmFzZVVybDtcblxuICAgICAgICBpZiAod2lkZ2V0QmFzZVVybC5zdWJzdHIoLTEpICE9PSAnLycpIHtcbiAgICAgICAgICAgIHdpZGdldEJhc2VVcmwgKz0gJy8nO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgcm91dGUgPSBvcHRpb25zLnJvdXRlIHx8IHRoaXMuY29uZmlnLnJvdXRlO1xuXG4gICAgICAgIGxldCBzcmMgPSB3aWRnZXRCYXNlVXJsICsgcm91dGUgKyAnP3dpZGdldF9zZGtfdmVyc2lvbj0nICsgdmVyc2lvbiArICcmcHJvamVjdElkPScgKyB0aGlzLmdldFByb2plY3RJZCgpO1xuXG4gICAgICAgIGxldCB1c2VPQXV0aDIgPSBmYWxzZTtcblxuICAgICAgICAvLyBGaWVsZHMgYXBwZW5kZWQgYnkgbG9vcFxuICAgICAgICAvLyBsb2NhbGUsIGZpZWxkcywgdGhlbWUsIGNvbXBhY3QsIGNsaWVudF9pZCwgcmVkaXJlY3RfdXJpLCByZXNwb25zZV90eXBlLCBzdGF0ZSwgZXh0ZXJuYWxXaW5kb3dcbiAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2YgT2JqZWN0LmtleXModGhpcy5jb25maWcpKSB7XG4gICAgICAgICAgICBpZiAoIUlHTk9SRUxJU1QuaW5jbHVkZXMob3B0aW9uKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNuYWtlT3B0aW9uID0gdG9TbmFrZUNhc2Uob3B0aW9uKTtcbiAgICAgICAgICAgICAgICBpZiAoIXVzZU9BdXRoMiAmJiBzbmFrZU9wdGlvbiA9PT0gJ2NsaWVudF9pZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdXNlT0F1dGgyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3JjICs9IGAmJHtzbmFrZU9wdGlvbn09JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWdbb3B0aW9uXSl9YFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVkaXJlY3RVcmwgPSB0aGlzLmdldFJlZGlyZWN0VVJMKCk7XG4gICAgICAgIGlmIChyZWRpcmVjdFVybCkge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZyZWRpcmVjdFVybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHJlZGlyZWN0VXJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNhbGxiYWNrVXJsID0gdGhpcy5nZXRDYWxsYmFja1VybCgpO1xuXG4gICAgICAgIGlmIChjYWxsYmFja1VybCkge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZsb2dpbl91cmw9JyArIGVuY29kZVVSSUNvbXBvbmVudChjYWxsYmFja1VybCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7ZXh0ZXJuYWxXaW5kb3csIHN0YXRlfSA9IHRoaXMuY29uZmlnO1xuICAgICAgICBpZiAoZXh0ZXJuYWxXaW5kb3cpIHtcbiAgICAgICAgICAgIHNyYyA9IHNyYyArICcmZXh0ZXJuYWxfd2luZG93PScgKyBlbmNvZGVVUklDb21wb25lbnQoZXh0ZXJuYWxXaW5kb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHVzZU9BdXRoMikge1xuICAgICAgICAgICAgc3JjICs9IGAmc3RhdGU9JHtzdGF0ZSB8fCBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoMil9YFxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgd2lkZ2V0VmVyc2lvbiA9IHRoaXMuY29uZmlnLndpZGdldFZlcnNpb247XG4gICAgICAgIGlmICh3aWRnZXRWZXJzaW9uKSB7XG4gICAgICAgICAgICBzcmMgKz0gJyZ2ZXJzaW9uPScgKyBlbmNvZGVVUklDb21wb25lbnQod2lkZ2V0VmVyc2lvbik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3JjO1xuICAgIH1cblxuICAgIEF1dGhXaWRnZXQoZWxlbWVudElkLCBvcHRpb25zKSB7XG4gICAgICAgIGlmICh0aGlzLmFwaSkge1xuICAgICAgICAgICAgaWYgKCFlbGVtZW50SWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdObyBkaXYgbmFtZSEnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBgJHtvcHRpb25zLndpZHRoIHx8IDQwMH1weGA7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gYCR7b3B0aW9ucy5oZWlnaHQgfHwgNTUwfXB4YDtcblxuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2hpbGQocHJlbG9hZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2xvYWQnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuZnJhbWVCb3JkZXIgPSAnMCc7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnNyYyA9IHRoaXMuZ2V0SWZyYW1lU3JjKG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5pZCA9IElGUkFNRV9JRDtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHByZWxvYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICAgICAgICAgICAgcHJlbG9hZGVyLmlubmVySFRNTCA9IHRoaXMuY29uZmlnLnByZWxvYWRlcjtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtZW50SWQpO1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zdHlsZS5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQocHJlbG9hZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZCh3aWRnZXRJZnJhbWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0VsZW1lbnQgXFxcIicgKyBlbGVtZW50SWQgKyAnXFxcIiBub3QgZm91bmQhJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdQbGVhc2UgcnVuIFhMLmluaXQoKSBmaXJzdCcpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG9uQ2xvc2VFdmVudCgpIHtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQod2lkZ2V0SWZyYW1lKTtcbiAgICB9XG5cbiAgICBfaGlkZSgpIHtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnBvc2l0aW9uID0gJyc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS56SW5kZXggPSAnJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmxlZnQgPSAnJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnRvcCA9ICcnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUud2lkdGggPSAwO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcnO1xuICAgIH1cblxuICAgIG9uSGlkZUV2ZW50KCkge1xuICAgICAgICBpZiAodGhpcy5jb25maWcuaW5GdWxsc2NyZWVuTW9kZSkge1xuICAgICAgICAgICAgdGhpcy5faGlkZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogbGluayBldmVudCB3aXRoIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gZXZlbnRcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqL1xuXG4gICAgb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlciA9IGhhbmRsZXIgfHwgZnVuY3Rpb24oKSB7fTtcblxuICAgICAgICBpZiAoZXZlbnQgPT09IHRoaXMuZXZlbnRUeXBlcy5DTE9TRSkge1xuICAgICAgICAgICAgaWYgKCFoYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlciA9IHRoaXMub25DbG9zZUV2ZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIHRoaXMub25DbG9zZUV2ZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hlci5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCAoZSkgPT4gaGFuZGxlcihlLmRldGFpbCkpO1xuICAgIH07XG5cbiAgICBfc2hvdygpIHtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnpJbmRleCA9IHRoaXMuY29uZmlnLmlmcmFtZVpJbmRleDtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmxlZnQgPSAnMCc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS50b3AgPSAnMCc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHRoaXMuY29uZmlnLnBvcHVwQmFja2dyb3VuZENvbG9yO1xuICAgICAgICB0aGlzLmNvbmZpZy5pbkZ1bGxzY3JlZW5Nb2RlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBvcGVuIGZ1bGxzcmVlbiBwb3B1cCBmb3Igd2lkZ2V0XG4gICAgICovXG5cbiAgICBzaG93KCkge1xuICAgICAgICBpZiAoIWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKElGUkFNRV9JRCkpIHtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zcmMgPSB0aGlzLmdldElmcmFtZVNyYygpO1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLmlkID0gSUZSQU1FX0lEO1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5oZWlnaHQgPSAwO1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLmZyYW1lQm9yZGVyID0gJzAnO1xuXG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBldmVudCA9IG5ldyBDdXN0b21FdmVudCgnbG9hZCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLl9zaG93KCk7XG5cbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQod2lkZ2V0SWZyYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3Nob3coKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmNvbnN0IHJlc3VsdCA9IG5ldyBYTCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlc3VsdDsiXX0=
