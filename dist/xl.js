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

var IGNORELIST = ['onlyWidgets', 'apiUrl', 'defaultLoginUrl', 'popupBackgroundColor', 'iframeZIndex', 'preloader', 'widgetBaseUrl', 'route', 'inFullscreenMode', 'redirectUrl', 'widgetVersion', 'projectId', 'callbackUrl', 'loginUrl', 'state'];

var DEFAULT_CONFIG = {
    apiUrl: 'https://login.xsolla.com/api/',
    onlyWidgets: false,
    defaultLoginUrl: 'https://xl-widget.xsolla.com/auth.html',
    popupBackgroundColor: 'rgb(187, 187, 187)',
    iframeZIndex: 1000000,
    preloader: '<div></div>',
    widgetBaseUrl: 'https://xl-widget.xsolla.com/',
    route: ROUTES.LOGIN,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvdG8tbm8tY2FzZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy90by1zbmFrZS1jYXNlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3RvLXNwYWNlLWNhc2UvaW5kZXguanMiLCIvVXNlcnMvYS5ib3J0bmlrb3YveHNvbGxhLWxvZ2luLWpzLXNkay9wYWNrYWdlLmpzb24iLCJzcmMvc3VwcG9ydHMuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQSxNQUFNLENBQUMsT0FBTyxDQUFDO0VBQ2IseURBQThCO0VB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ZCxDQUEwQixZQUExQjtBQUNILGFBZEQsTUFjTztBQUNILHFCQUFLLEtBQUw7QUFDSDtBQUNKOzs7Ozs7QUFHTCxJQUFNLFNBQVMsSUFBSSxFQUFKLEVBQWY7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLE1BQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXG4vKipcbiAqIEV4cG9ydC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHRvTm9DYXNlXG5cbi8qKlxuICogVGVzdCB3aGV0aGVyIGEgc3RyaW5nIGlzIGNhbWVsLWNhc2UuXG4gKi9cblxudmFyIGhhc1NwYWNlID0gL1xccy9cbnZhciBoYXNTZXBhcmF0b3IgPSAvKF98LXxcXC58OikvXG52YXIgaGFzQ2FtZWwgPSAvKFthLXpdW0EtWl18W0EtWl1bYS16XSkvXG5cbi8qKlxuICogUmVtb3ZlIGFueSBzdGFydGluZyBjYXNlIGZyb20gYSBgc3RyaW5nYCwgbGlrZSBjYW1lbCBvciBzbmFrZSwgYnV0IGtlZXBcbiAqIHNwYWNlcyBhbmQgcHVuY3R1YXRpb24gdGhhdCBtYXkgYmUgaW1wb3J0YW50IG90aGVyd2lzZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cblxuZnVuY3Rpb24gdG9Ob0Nhc2Uoc3RyaW5nKSB7XG4gIGlmIChoYXNTcGFjZS50ZXN0KHN0cmluZykpIHJldHVybiBzdHJpbmcudG9Mb3dlckNhc2UoKVxuICBpZiAoaGFzU2VwYXJhdG9yLnRlc3Qoc3RyaW5nKSkgcmV0dXJuICh1bnNlcGFyYXRlKHN0cmluZykgfHwgc3RyaW5nKS50b0xvd2VyQ2FzZSgpXG4gIGlmIChoYXNDYW1lbC50ZXN0KHN0cmluZykpIHJldHVybiB1bmNhbWVsaXplKHN0cmluZykudG9Mb3dlckNhc2UoKVxuICByZXR1cm4gc3RyaW5nLnRvTG93ZXJDYXNlKClcbn1cblxuLyoqXG4gKiBTZXBhcmF0b3Igc3BsaXR0ZXIuXG4gKi9cblxudmFyIHNlcGFyYXRvclNwbGl0dGVyID0gL1tcXFdfXSsoLnwkKS9nXG5cbi8qKlxuICogVW4tc2VwYXJhdGUgYSBgc3RyaW5nYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cblxuZnVuY3Rpb24gdW5zZXBhcmF0ZShzdHJpbmcpIHtcbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKHNlcGFyYXRvclNwbGl0dGVyLCBmdW5jdGlvbiAobSwgbmV4dCkge1xuICAgIHJldHVybiBuZXh0ID8gJyAnICsgbmV4dCA6ICcnXG4gIH0pXG59XG5cbi8qKlxuICogQ2FtZWxjYXNlIHNwbGl0dGVyLlxuICovXG5cbnZhciBjYW1lbFNwbGl0dGVyID0gLyguKShbQS1aXSspL2dcblxuLyoqXG4gKiBVbi1jYW1lbGNhc2UgYSBgc3RyaW5nYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cblxuZnVuY3Rpb24gdW5jYW1lbGl6ZShzdHJpbmcpIHtcbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGNhbWVsU3BsaXR0ZXIsIGZ1bmN0aW9uIChtLCBwcmV2aW91cywgdXBwZXJzKSB7XG4gICAgcmV0dXJuIHByZXZpb3VzICsgJyAnICsgdXBwZXJzLnRvTG93ZXJDYXNlKCkuc3BsaXQoJycpLmpvaW4oJyAnKVxuICB9KVxufVxuIiwiXG52YXIgdG9TcGFjZSA9IHJlcXVpcmUoJ3RvLXNwYWNlLWNhc2UnKVxuXG4vKipcbiAqIEV4cG9ydC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHRvU25ha2VDYXNlXG5cbi8qKlxuICogQ29udmVydCBhIGBzdHJpbmdgIHRvIHNuYWtlIGNhc2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZ1xuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5cbmZ1bmN0aW9uIHRvU25ha2VDYXNlKHN0cmluZykge1xuICByZXR1cm4gdG9TcGFjZShzdHJpbmcpLnJlcGxhY2UoL1xccy9nLCAnXycpXG59XG4iLCJcbnZhciBjbGVhbiA9IHJlcXVpcmUoJ3RvLW5vLWNhc2UnKVxuXG4vKipcbiAqIEV4cG9ydC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHRvU3BhY2VDYXNlXG5cbi8qKlxuICogQ29udmVydCBhIGBzdHJpbmdgIHRvIHNwYWNlIGNhc2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZ1xuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5cbmZ1bmN0aW9uIHRvU3BhY2VDYXNlKHN0cmluZykge1xuICByZXR1cm4gY2xlYW4oc3RyaW5nKS5yZXBsYWNlKC9bXFxXX10rKC58JCkvZywgZnVuY3Rpb24gKG1hdGNoZXMsIG1hdGNoKSB7XG4gICAgcmV0dXJuIG1hdGNoID8gJyAnICsgbWF0Y2ggOiAnJ1xuICB9KS50cmltKClcbn1cbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJuYW1lXCI6IFwieHNvbGxhLWxvZ2luLWpzLXNka1wiLFxuICBcInZlcnNpb25cIjogXCIyLjEuMlwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiXCIsXG4gIFwibWFpblwiOiBcInNyYy9tYWluLmpzXCIsXG4gIFwic2NyaXB0c1wiOiB7XG4gICAgXCJidWlsZFwiOiBcImd1bHAgYnVpbGRcIixcbiAgICBcImhvc3RcIjogXCJzdGF0aWMtc2VydmVyIC4gLXAgODA4NFwiLFxuICAgIFwidGVzdFwiOiBcImplc3RcIlxuICB9LFxuICBcImF1dGhvclwiOiBcIlwiLFxuICBcImxpY2Vuc2VcIjogXCJNSVRcIixcbiAgXCJkZXBlbmRlbmNpZXNcIjoge1xuICAgIFwidG8tc25ha2UtY2FzZVwiOiBcIl4xLjAuMFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkBiYWJlbC9jb3JlXCI6IFwiXjcuNC41XCIsXG4gICAgXCJAYmFiZWwvcHJlc2V0LWVudlwiOiBcIl43LjQuNVwiLFxuICAgIFwiYmFiZWwtamVzdFwiOiBcIl4yNC44LjBcIixcbiAgICBcImJhYmVsLXBsdWdpbi10cmFuc2Zvcm0tb2JqZWN0LWFzc2lnblwiOiBcIl42LjIyLjBcIixcbiAgICBcImJhYmVsLXByZXNldC1lczIwMTVcIjogXCJeNi4xOC4wXCIsXG4gICAgXCJiYWJlbGlmeVwiOiBcIl43LjMuMFwiLFxuICAgIFwiYm93ZXJcIjogXCJeMS44LjhcIixcbiAgICBcImJyZnNcIjogXCJeMi4wLjFcIixcbiAgICBcImJyb3dzZXItc3luY1wiOiBcIl4yLjI2LjdcIixcbiAgICBcImJyb3dzZXJpZnlcIjogXCJeMTYuMi4zXCIsXG4gICAgXCJicm93c2VyaWZ5LWlzdGFuYnVsXCI6IFwiXjIuMC4wXCIsXG4gICAgXCJicm93c2VyaWZ5LXNoaW1cIjogXCJeMy44LjEyXCIsXG4gICAgXCJjb21tb24tc2hha2VpZnlcIjogXCJeMC42LjBcIixcbiAgICBcImd1bHBcIjogXCJeNC4wLjJcIixcbiAgICBcImd1bHAtaWZcIjogXCJeMi4wLjJcIixcbiAgICBcImd1bHAtcmVuYW1lXCI6IFwiMS4yLjBcIixcbiAgICBcImd1bHAtc291cmNlbWFwc1wiOiBcIl4yLjYuNVwiLFxuICAgIFwiZ3VscC1zdHJpcC1jb21tZW50c1wiOiBcIl4yLjUuMlwiLFxuICAgIFwiZ3VscC11Z2xpZnlcIjogXCJeMy4wLjFcIixcbiAgICBcImd1bHAtdXRpbFwiOiBcIjMuMC42XCIsXG4gICAgXCJqYXNtaW5lXCI6IFwiXjIuNC4xXCIsXG4gICAgXCJqZXN0XCI6IFwiXjI0LjguMFwiLFxuICAgIFwianNkb21cIjogXCJeMTUuMS4xXCIsXG4gICAgXCJzdGF0aWMtc2VydmVyXCI6IFwiMi4yLjFcIixcbiAgICBcInVybC1wYXJzZVwiOiBcIl4xLjQuN1wiLFxuICAgIFwidmlueWwtYnVmZmVyXCI6IFwiXjEuMC4xXCIsXG4gICAgXCJ2aW55bC1zb3VyY2Utc3RyZWFtXCI6IFwiXjIuMC4wXCIsXG4gICAgXCJ3YXRjaGlmeVwiOiBcIl4zLjExLjFcIlxuICB9LFxuICBcImJyb3dzZXJpZnktc2hpbVwiOiB7XG4gICAgXCJleHRlcm5hbFwiOiBcImdsb2JhbDpFeHRlcm5hbFwiXG4gIH1cbn1cbiIsIi8qKlxuICogQ3JlYXRlZCBieSBhLmtvcm90YWV2IG9uIDA3LjExLjE2LlxuICovXG5pZiAoIVN0cmluZy5wcm90b3R5cGUuc3RhcnRzV2l0aCkge1xuICAgIFN0cmluZy5wcm90b3R5cGUuc3RhcnRzV2l0aCA9IGZ1bmN0aW9uKHNlYXJjaFN0cmluZywgcG9zaXRpb24pIHtcbiAgICAgICAgcG9zaXRpb24gPSBwb3NpdGlvbiB8fCAwO1xuICAgICAgICByZXR1cm4gdGhpcy5pbmRleE9mKHNlYXJjaFN0cmluZywgcG9zaXRpb24pID09PSBwb3NpdGlvbjtcbiAgICB9O1xufVxuXG5pZiAoIHR5cGVvZiB3aW5kb3cuQ3VzdG9tRXZlbnQgIT09IFwiZnVuY3Rpb25cIiApIHtcbiAgICBmdW5jdGlvbiBDdXN0b21FdmVudChldmVudCwgcGFyYW1zKSB7XG4gICAgICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7YnViYmxlczogZmFsc2UsIGNhbmNlbGFibGU6IGZhbHNlLCBkZXRhaWw6IHVuZGVmaW5lZH07XG4gICAgICAgIHZhciBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnQ3VzdG9tRXZlbnQnKTtcbiAgICAgICAgZXZ0LmluaXRDdXN0b21FdmVudChldmVudCwgcGFyYW1zLmJ1YmJsZXMsIHBhcmFtcy5jYW5jZWxhYmxlLCBwYXJhbXMuZGV0YWlsKTtcbiAgICAgICAgcmV0dXJuIGV2dDtcbiAgICB9XG5cbiAgICBDdXN0b21FdmVudC5wcm90b3R5cGUgPSB3aW5kb3cuRXZlbnQucHJvdG90eXBlO1xuXG4gICAgd2luZG93LkN1c3RvbUV2ZW50ID0gQ3VzdG9tRXZlbnQ7XG59IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbi8qKlxuICogSW1wZWxlbWVudHMgWHNvbGxhIExvZ2luIEFwaVxuICogQHBhcmFtIHByb2plY3RJZCAtIHByb2plY3QncyB1bmlxdWUgaWRlbnRpZmllclxuICogQHBhcmFtIGJhc2VVcmwgLSBhcGkgZW5kcG9pbnRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5cbnZhciBYTEFwaSA9IGZ1bmN0aW9uIChwcm9qZWN0SWQsIGJhc2VVcmwpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5iYXNlVXJsID0gYmFzZVVybCB8fCAnLy9sb2dpbi54c29sbGEuY29tL2FwaS8nO1xuXG4gICAgdGhpcy5wcm9qZWN0SWQgPSBwcm9qZWN0SWQ7XG5cbiAgICB0aGlzLm1ha2VBcGlDYWxsID0gZnVuY3Rpb24gKHBhcmFtcywgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgdmFyIHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuICAgICAgICByLm9wZW4ocGFyYW1zLm1ldGhvZCwgc2VsZi5iYXNlVXJsICsgcGFyYW1zLmVuZHBvaW50LCB0cnVlKTtcbiAgICAgICAgci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoci5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgICAgICAgICBpZiAoci5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3MoSlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyLnJlc3BvbnNlVGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IoSlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3Ioe2Vycm9yOiB7bWVzc2FnZTogJ05ldHdvcmtpbmcgZXJyb3InLCBjb2RlOiByLnN0YXR1c319KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHBhcmFtcy5tZXRob2QgPT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICByLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLThcIik7XG4gICAgICAgICAgICByLnNlbmQocGFyYW1zLnBvc3RCb2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMubWV0aG9kID09ICdHRVQnKSB7XG4gICAgICAgICAgICByLnNlbmQocGFyYW1zLmdldEFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcbi8qKlxuICogR2V0IGFsbCBhdmlhbGFibGUgc29jaWFsIG1ldGhvZHMgYXV0aCB1cmxcbiAqIEBwYXJhbSBzdWNjZXNzIC0gc3VjY2VzcyBjYWxsYmFja1xuICogQHBhcmFtIGVycm9yIC0gZXJyb3IgY2FsbGJhY2tcbiAqIEBwYXJhbSBnZXRBcmd1bWVudHMgLSBhZGRpdGlvbmFsIHBhcmFtcyB0byBzZW5kIHdpdGggcmVxdWVzdFxuICovXG5YTEFwaS5wcm90b3R5cGUuZ2V0U29jaWFsc1VSTHMgPSBmdW5jdGlvbiAoc3VjY2VzcywgZXJyb3IsIGdldEFyZ3VtZW50cykge1xuICAgIHZhciBzdHIgPSBcIlwiO1xuICAgIGZvciAodmFyIGtleSBpbiBnZXRBcmd1bWVudHMpIHtcbiAgICAgICAgaWYgKHN0ciAhPSBcIlwiKSB7XG4gICAgICAgICAgICBzdHIgKz0gXCImXCI7XG4gICAgICAgIH1cbiAgICAgICAgc3RyICs9IGtleSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGdldEFyZ3VtZW50c1trZXldKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzb2NpYWwvbG9naW5fdXJscz8nICsgc3RyLCBnZXRBcmd1bWVudHM6IG51bGx9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUubG9naW5QYXNzQXV0aCA9IGZ1bmN0aW9uIChsb2dpbiwgcGFzcywgcmVtZW1iZXJNZSwgcmVkaXJlY3RVcmwsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgdmFyIGJvZHkgPSB7XG4gICAgICAgIHVzZXJuYW1lOiBsb2dpbixcbiAgICAgICAgcGFzc3dvcmQ6IHBhc3MsXG4gICAgICAgIHJlbWVtYmVyX21lOiByZW1lbWJlck1lXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnUE9TVCcsIGVuZHBvaW50OiAncHJveHkvbG9naW4/cHJvamVjdElkPScrdGhpcy5wcm9qZWN0SWQgKyAnJnJlZGlyZWN0X3VybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHJlZGlyZWN0VXJsKSwgcG9zdEJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHkpfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxuWExBcGkucHJvdG90eXBlLnNtc0F1dGggPSBmdW5jdGlvbiAocGhvbmVOdW1iZXIsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ0dFVCcsIGVuZHBvaW50OiAnc21zJywgZ2V0QXJndW1lbnRzOiAncGhvbmVOdW1iZXI9JyArIHBob25lTnVtYmVyfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBYTEFwaTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBhLmtvcm90YWV2IG9uIDI0LjA2LjE2LlxuICovXG5jb25zdCB0b1NuYWtlQ2FzZSA9IHJlcXVpcmUoJ3RvLXNuYWtlLWNhc2UnKTtcblxucmVxdWlyZSgnLi9zdXBwb3J0cycpO1xuY29uc3QgdmVyc2lvbiA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpLnZlcnNpb247XG5cbmltcG9ydCBYTEFwaSBmcm9tICcuL3hsYXBpJztcbi8qKlxuICogQ3JlYXRlIGFuIGBBdXRoMGAgaW5zdGFuY2Ugd2l0aCBgb3B0aW9uc2BcbiAqXG4gKiBAY2xhc3MgWExcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5cbmNvbnN0IFJPVVRFUyA9IHtcbiAgICBMT0dJTjogJycsXG4gICAgUkVHSVNUUkFUSU9OOiAncmVnaXN0cmF0aW9uJyxcbiAgICBSRUNPVkVSX1BBU1NXT1JEOiAncmVzZXQtcGFzc3dvcmQnLFxuICAgIEFMTF9TT0NJQUxTOiAnb3RoZXInLFxuICAgIFNPQ0lBTFNfTE9HSU46ICdzb2NpYWxzJyxcbiAgICBVU0VSTkFNRV9MT0dJTjogJ3VzZXJuYW1lLWxvZ2luJyxcbn07XG5cbmNvbnN0IElHTk9SRUxJU1QgPSBbXG4gICAgJ29ubHlXaWRnZXRzJyxcbiAgICAnYXBpVXJsJyxcbiAgICAnZGVmYXVsdExvZ2luVXJsJyxcbiAgICAncG9wdXBCYWNrZ3JvdW5kQ29sb3InLFxuICAgICdpZnJhbWVaSW5kZXgnLFxuICAgICdwcmVsb2FkZXInLFxuICAgICd3aWRnZXRCYXNlVXJsJyxcbiAgICAncm91dGUnLFxuICAgICdpbkZ1bGxzY3JlZW5Nb2RlJyxcblxuICAgICdyZWRpcmVjdFVybCcsXG4gICAgJ3dpZGdldFZlcnNpb24nLFxuICAgICdwcm9qZWN0SWQnLFxuXG4gICAgJ2NhbGxiYWNrVXJsJyxcbiAgICAnbG9naW5VcmwnLFxuICAgICdzdGF0ZScsXG5dO1xuXG5jb25zdCBERUZBVUxUX0NPTkZJRyA9IHtcbiAgICBhcGlVcmw6ICdodHRwczovL2xvZ2luLnhzb2xsYS5jb20vYXBpLycsXG4gICAgb25seVdpZGdldHM6IGZhbHNlLFxuICAgIGRlZmF1bHRMb2dpblVybDogJ2h0dHBzOi8veGwtd2lkZ2V0Lnhzb2xsYS5jb20vYXV0aC5odG1sJyxcbiAgICBwb3B1cEJhY2tncm91bmRDb2xvcjogJ3JnYigxODcsIDE4NywgMTg3KScsXG4gICAgaWZyYW1lWkluZGV4OiAxMDAwMDAwLFxuICAgIHByZWxvYWRlcjogJzxkaXY+PC9kaXY+JyxcbiAgICB3aWRnZXRCYXNlVXJsOiAnaHR0cHM6Ly94bC13aWRnZXQueHNvbGxhLmNvbS8nLFxuICAgIHJvdXRlOiBST1VURVMuTE9HSU4sXG4gICAgaW5GdWxsc2NyZWVuTW9kZTogZmFsc2UsXG4gICAgcmVzcG9uc2VfdHlwZTogJ2NvZGUnXG59O1xuXG5jb25zdCBJTlZBTElEX0xPR0lOX0VSUk9SX0NPREUgPSAxO1xuY29uc3QgSU5DT1JSRUNUX0xPR0lOX09SX1BBU1NXT1JEX0VSUk9SX0NPREUgPSAyO1xuXG5jb25zdCBJRlJBTUVfSUQgPSAnWHNvbGxhTG9naW5XaWRnZXRJZnJhbWUnO1xuY29uc3Qgd2lkZ2V0SWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG5cbmNsYXNzIFhMIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5zb2NpYWxVcmxzID0ge307XG4gICAgICAgIHRoaXMuZXZlbnRUeXBlcyA9IHtcbiAgICAgICAgICAgIExPQUQ6ICdsb2FkJyxcbiAgICAgICAgICAgIENMT1NFOiAnY2xvc2UnLFxuICAgICAgICAgICAgSElERV9QT1BVUDogJ2hpZGUgcG9wdXAnLFxuICAgICAgICAgICAgUkVHSVNUUkFUSU9OX1JFUVVFU1Q6ICdyZWdpc3RyYXRpb24gcmVxdWVzdCcsXG4gICAgICAgICAgICBBVVRIRU5USUNBVEVEOiAnYXV0aGVudGljYXRlZCdcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBuZWVkIGZvciBleHBvcnQgcHVycG9zZXNcbiAgICAgICAgdGhpcy5ST1VURVMgPSBST1VURVM7XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHRoaXMub25IaWRlRXZlbnQgPSB0aGlzLm9uSGlkZUV2ZW50LmJpbmQodGhpcyk7XG4gICAgfVxuXG4gICAgaW5pdChvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuY29uZmlnID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9DT05GSUcsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLmNvbmZpZy5wb3B1cEJhY2tncm91bmRDb2xvciA9IERFRkFVTFRfQ09ORklHLnBvcHVwQmFja2dyb3VuZENvbG9yO1xuICAgICAgICB0aGlzLmFwaSA9IG5ldyBYTEFwaShvcHRpb25zLnByb2plY3RJZCwgdGhpcy5jb25maWcuYXBpVXJsKTtcblxuICAgICAgICBjb25zdCBldmVudE1ldGhvZCA9IHdpbmRvdy5hZGRFdmVudExpc3RlbmVyID8gJ2FkZEV2ZW50TGlzdGVuZXInIDogJ2F0dGFjaEV2ZW50JztcbiAgICAgICAgY29uc3QgZXZlbnRlciA9IHdpbmRvd1tldmVudE1ldGhvZF07XG4gICAgICAgIGNvbnN0IG1lc3NhZ2VFdmVudCA9IGV2ZW50TWV0aG9kID09PSAnYXR0YWNoRXZlbnQnID8gJ29ubWVzc2FnZScgOiAnbWVzc2FnZSc7XG5cbiAgICAgICAgLy8gTGlzdGVuIHRvIG1lc3NhZ2UgZnJvbSBjaGlsZCB3aW5kb3dcbiAgICAgICAgZXZlbnRlcihtZXNzYWdlRXZlbnQsIChlKSA9PiB7XG4gICAgICAgICAgICBsZXQgZXZlbnQ7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGUuZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAvLyBPbGQgZm9ybWF0IC0gc3RyaW5nIG9ubHlcbiAgICAgICAgICAgICAgICBldmVudCA9IG5ldyBDdXN0b21FdmVudCh0aGlzLmV2ZW50VHlwZXNbZS5kYXRhXSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5ldyBmb3JtYXQgLSB7dHlwZTogJ2V2ZW50JywgLi4ufVxuICAgICAgICAgICAgICAgIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KHRoaXMuZXZlbnRUeXBlc1tlLmRhdGEudHlwZV0sIHtkZXRhaWw6IGUuZGF0YX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICB9LCBmYWxzZSk7XG5cbiAgICAgICAgT2JqZWN0LmtleXModGhpcy5ldmVudFR5cGVzKS5tYXAoKGV2ZW50S2V5KSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uKHRoaXMuZXZlbnRUeXBlc1tldmVudEtleV0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZihvcHRpb25zLnBvcHVwQmFja2dyb3VuZENvbG9yKSB7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZy5wb3B1cEJhY2tncm91bmRDb2xvciA9IG9wdGlvbnMucG9wdXBCYWNrZ3JvdW5kQ29sb3I7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmRpc3BhdGNoZXIuYWRkRXZlbnRMaXN0ZW5lcih0aGlzLmV2ZW50VHlwZXMuSElERV9QT1BVUCwgdGhpcy5vbkhpZGVFdmVudCk7XG5cbiAgICAgICAgaWYgKCF0aGlzLmNvbmZpZy5vbmx5V2lkZ2V0cykge1xuXG4gICAgICAgICAgICBsZXQgcGFyYW1zID0ge307XG4gICAgICAgICAgICBwYXJhbXMucHJvamVjdElkID0gb3B0aW9ucy5wcm9qZWN0SWQ7XG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcucmVkaXJlY3RVcmwpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMucmVkaXJlY3RfdXJsID0gdGhpcy5jb25maWcucmVkaXJlY3RVcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcubG9naW5VcmwpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMubG9naW5fdXJsID0gdGhpcy5jb25maWcubG9naW5Vcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuY2FsbGJhY2tVcmwpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMubG9naW5fdXJsID0gdGhpcy5jb25maWcuY2FsbGJhY2tVcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBsb2dpblxuICAgICAqIEBwYXJhbSBwcm9wXG4gICAgICogQHBhcmFtIGVycm9yIC0gY2FsbCBpbiBjYXNlIGVycm9yXG4gICAgICogQHBhcmFtIHN1Y2Nlc3NcbiAgICAgKi9cbiAgICBsb2dpbihwcm9wLCBlcnJvciwgc3VjY2Vzcykge1xuXG4gICAgICAgIGlmICghcHJvcCB8fCAhdGhpcy5zb2NpYWxVcmxzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogcHJvcHNcbiAgICAgICAgICogYXV0aFR5cGU6IHNuLTxzb2NpYWwgbmFtZT4sIGxvZ2luLXBhc3MsIHNtc1xuICAgICAgICAgKi9cbiAgICAgICAgaWYgKHByb3AuYXV0aFR5cGUpIHtcbiAgICAgICAgICAgIGlmIChwcm9wLmF1dGhUeXBlLnN0YXJ0c1dpdGgoJ3NuLScpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc29jaWFsVXJsID0gdGhpcy5zb2NpYWxVcmxzW3Byb3AuYXV0aFR5cGVdO1xuICAgICAgICAgICAgICAgIGlmIChzb2NpYWxVcmwgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gdGhpcy5zb2NpYWxVcmxzW3Byb3AuYXV0aFR5cGVdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F1dGggdHlwZTogJyArIHByb3AuYXV0aFR5cGUgKyAnIGRvZXNuXFwndCBleGlzdCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wLmF1dGhUeXBlID09ICdsb2dpbi1wYXNzJykge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBpLmxvZ2luUGFzc0F1dGgocHJvcC5sb2dpbiwgcHJvcC5wYXNzLCBwcm9wLnJlbWVtYmVyTWUsIHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsLCAocmVzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXMubG9naW5fdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaW5pc2hBdXRoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVzLmxvZ2luX3VybDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3Moe3N0YXR1czogJ3N1Y2Nlc3MnLCBmaW5pc2g6IGZpbmlzaEF1dGgsIHJlZGlyZWN0VXJsOiByZXMubG9naW5fdXJsfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmlzaEF1dGgoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKHRoaXMuY3JlYXRlRXJyb3JPYmplY3QoJ0xvZ2luIG9yIHBhc3Mgbm90IHZhbGlkJywgSU5DT1JSRUNUX0xPR0lOX09SX1BBU1NXT1JEX0VSUk9SX0NPREUpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnc21zJykge1xuICAgICAgICAgICAgICAgIGlmIChzbXNBdXRoU3RlcCA9PSAncGhvbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBpLnNtc0F1dGgocHJvcC5waG9uZU51bWJlciwgbnVsbCwgbnVsbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzbXNBdXRoU3RlcCA9PSAnY29kZScpIHtcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5rbm93biBhdXRoIHR5cGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNyZWF0ZUVycm9yT2JqZWN0KG1lc3NhZ2UsIGNvZGUpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICBjb2RlOiBjb2RlIHx8IC0xXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIGdldFByb2plY3RJZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLnByb2plY3RJZDtcbiAgICB9O1xuXG4gICAgZ2V0UmVkaXJlY3RVUkwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy5yZWRpcmVjdFVybDtcbiAgICB9O1xuXG4gICAgZ2V0VGhlbWUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy50aGVtZTtcbiAgICB9XG5cbiAgICBnZXRDYWxsYmFja1VybCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmNhbGxiYWNrVXJsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWcuY2FsbGJhY2tVcmw7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcubG9naW5VcmwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy5sb2dpblVybDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5leHRlcm5hbFdpbmRvdykge1xuICAgICAgICAgICAgcmV0dXJuIERFRkFVTFRfQ09ORklHLmRlZmF1bHRMb2dpblVybDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAZGVwcmVjYXRlZCB1c2UgZ2V0TGluayBpbnN0ZWFkXG4gICAgICovXG4gICAgZ2V0SWZyYW1lU3JjKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRMaW5rLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgZ2V0TGluayhvcHRpb25zID0ge30pIHtcbiAgICAgICAgbGV0IHdpZGdldEJhc2VVcmwgPSBvcHRpb25zLndpZGdldEJhc2VVcmwgfHwgdGhpcy5jb25maWcud2lkZ2V0QmFzZVVybDtcblxuICAgICAgICBpZiAod2lkZ2V0QmFzZVVybC5zdWJzdHIoLTEpICE9PSAnLycpIHtcbiAgICAgICAgICAgIHdpZGdldEJhc2VVcmwgKz0gJy8nO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgcm91dGUgPSBvcHRpb25zLnJvdXRlIHx8IHRoaXMuY29uZmlnLnJvdXRlO1xuXG4gICAgICAgIGxldCBzcmMgPSB3aWRnZXRCYXNlVXJsICsgcm91dGUgKyAnP3dpZGdldF9zZGtfdmVyc2lvbj0nICsgdmVyc2lvbiArICcmcHJvamVjdElkPScgKyB0aGlzLmdldFByb2plY3RJZCgpO1xuXG4gICAgICAgIGxldCB1c2VPQXV0aDIgPSBmYWxzZTtcblxuICAgICAgICAvLyBGaWVsZHMgYXBwZW5kZWQgYnkgbG9vcFxuICAgICAgICAvLyBsb2NhbGUsIGZpZWxkcywgdGhlbWUsIGNvbXBhY3QsIGNsaWVudF9pZCwgcmVkaXJlY3RfdXJpLCByZXNwb25zZV90eXBlLCBzdGF0ZSwgZXh0ZXJuYWxXaW5kb3dcbiAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2YgT2JqZWN0LmtleXModGhpcy5jb25maWcpKSB7XG4gICAgICAgICAgICBpZiAoIUlHTk9SRUxJU1QuaW5jbHVkZXMob3B0aW9uKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNuYWtlT3B0aW9uID0gdG9TbmFrZUNhc2Uob3B0aW9uKTtcbiAgICAgICAgICAgICAgICBpZiAoIXVzZU9BdXRoMiAmJiBzbmFrZU9wdGlvbiA9PT0gJ2NsaWVudF9pZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdXNlT0F1dGgyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3JjICs9IGAmJHtzbmFrZU9wdGlvbn09JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWdbb3B0aW9uXSl9YFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVkaXJlY3RVcmwgPSB0aGlzLmdldFJlZGlyZWN0VVJMKCk7XG4gICAgICAgIGlmIChyZWRpcmVjdFVybCkge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZyZWRpcmVjdFVybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHJlZGlyZWN0VXJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNhbGxiYWNrVXJsID0gdGhpcy5nZXRDYWxsYmFja1VybCgpO1xuXG4gICAgICAgIGlmIChjYWxsYmFja1VybCkge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZsb2dpbl91cmw9JyArIGVuY29kZVVSSUNvbXBvbmVudChjYWxsYmFja1VybCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7ZXh0ZXJuYWxXaW5kb3csIHN0YXRlfSA9IHRoaXMuY29uZmlnO1xuICAgICAgICBpZiAoZXh0ZXJuYWxXaW5kb3cpIHtcbiAgICAgICAgICAgIHNyYyA9IHNyYyArICcmZXh0ZXJuYWxfd2luZG93PScgKyBlbmNvZGVVUklDb21wb25lbnQoZXh0ZXJuYWxXaW5kb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHVzZU9BdXRoMikge1xuICAgICAgICAgICAgc3JjICs9IGAmc3RhdGU9JHtzdGF0ZSB8fCBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoMil9YFxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgd2lkZ2V0VmVyc2lvbiA9IHRoaXMuY29uZmlnLndpZGdldFZlcnNpb247XG4gICAgICAgIGlmICh3aWRnZXRWZXJzaW9uKSB7XG4gICAgICAgICAgICBzcmMgKz0gJyZ2ZXJzaW9uPScgKyBlbmNvZGVVUklDb21wb25lbnQod2lkZ2V0VmVyc2lvbik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3JjO1xuICAgIH1cblxuICAgIEF1dGhXaWRnZXQoZWxlbWVudElkLCBvcHRpb25zKSB7XG4gICAgICAgIGlmICh0aGlzLmFwaSkge1xuICAgICAgICAgICAgaWYgKCFlbGVtZW50SWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdObyBkaXYgbmFtZSEnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBgJHtvcHRpb25zLndpZHRoIHx8IDQwMH1weGA7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gYCR7b3B0aW9ucy5oZWlnaHQgfHwgNTUwfXB4YDtcblxuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2hpbGQocHJlbG9hZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2xvYWQnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuZnJhbWVCb3JkZXIgPSAnMCc7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnNyYyA9IHRoaXMuZ2V0SWZyYW1lU3JjKG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5pZCA9IElGUkFNRV9JRDtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHByZWxvYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICAgICAgICAgICAgcHJlbG9hZGVyLmlubmVySFRNTCA9IHRoaXMuY29uZmlnLnByZWxvYWRlcjtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtZW50SWQpO1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zdHlsZS5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQocHJlbG9hZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZCh3aWRnZXRJZnJhbWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0VsZW1lbnQgXFxcIicgKyBlbGVtZW50SWQgKyAnXFxcIiBub3QgZm91bmQhJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdQbGVhc2UgcnVuIFhMLmluaXQoKSBmaXJzdCcpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG9uQ2xvc2VFdmVudCgpIHtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQod2lkZ2V0SWZyYW1lKTtcbiAgICB9XG5cbiAgICBfaGlkZSgpIHtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnBvc2l0aW9uID0gJyc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS56SW5kZXggPSAnJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmxlZnQgPSAnJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnRvcCA9ICcnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUud2lkdGggPSAwO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcnO1xuICAgIH1cblxuICAgIG9uSGlkZUV2ZW50KCkge1xuICAgICAgICBpZiAodGhpcy5jb25maWcuaW5GdWxsc2NyZWVuTW9kZSkge1xuICAgICAgICAgICAgdGhpcy5faGlkZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogbGluayBldmVudCB3aXRoIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gZXZlbnRcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqL1xuXG4gICAgb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlciA9IGhhbmRsZXIgfHwgZnVuY3Rpb24oKSB7fTtcblxuICAgICAgICBpZiAoZXZlbnQgPT09IHRoaXMuZXZlbnRUeXBlcy5DTE9TRSkge1xuICAgICAgICAgICAgaWYgKCFoYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlciA9IHRoaXMub25DbG9zZUV2ZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIHRoaXMub25DbG9zZUV2ZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hlci5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCAoZSkgPT4gaGFuZGxlcihlLmRldGFpbCkpO1xuICAgIH07XG5cbiAgICBfc2hvdygpIHtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnpJbmRleCA9IHRoaXMuY29uZmlnLmlmcmFtZVpJbmRleDtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmxlZnQgPSAnMCc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS50b3AgPSAnMCc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHRoaXMuY29uZmlnLnBvcHVwQmFja2dyb3VuZENvbG9yO1xuICAgICAgICB0aGlzLmNvbmZpZy5pbkZ1bGxzY3JlZW5Nb2RlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBvcGVuIGZ1bGxzcmVlbiBwb3B1cCBmb3Igd2lkZ2V0XG4gICAgICovXG5cbiAgICBzaG93KCkge1xuICAgICAgICBpZiAoIWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKElGUkFNRV9JRCkpIHtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zcmMgPSB0aGlzLmdldElmcmFtZVNyYygpO1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLmlkID0gSUZSQU1FX0lEO1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5oZWlnaHQgPSAwO1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLmZyYW1lQm9yZGVyID0gJzAnO1xuXG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBldmVudCA9IG5ldyBDdXN0b21FdmVudCgnbG9hZCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLl9zaG93KCk7XG5cbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQod2lkZ2V0SWZyYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3Nob3coKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmNvbnN0IHJlc3VsdCA9IG5ldyBYTCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlc3VsdDsiXX0=
