(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XL = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports={
  "version": "2.0.0",
}

},{}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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

var DEFAULT_CONFIG = {
    errorHandler: function errorHandler(a) {},
    loginPassValidator: function loginPassValidator(a, b) {
        return true;
    },
    isMarkupSocialsHandlersEnabled: false,
    apiUrl: 'https://login.xsolla.com/api/',
    maxXLClickDepth: 20,
    onlyWidgets: false,
    defaultLoginUrl: 'https://xl-widget.xsolla.com/auth.html',
    popupBackgroundColor: 'rgb(187, 187, 187)',
    iframeZIndex: 1000000,
    theme: 'app.default.css',
    preloader: '<div></div>',
    widgetBaseUrl: 'https://xl-widget.xsolla.com/',
    route: ROUTES.LOGIN,
    compact: false,
    inFullscreenMode: false
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
            var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            var widgetBaseUrl = options.widgetBaseUrl || this.config.widgetBaseUrl;

            if (widgetBaseUrl.substr(-1) !== '/') {
                widgetBaseUrl += '/';
            }

            var route = options.route || this.config.route;

            var src = widgetBaseUrl + route + '?widget_sdk_version=' + version + '&projectId=' + this.getProjectId();

            if (this.config.locale) {
                src = src + '&locale=' + this.config.locale;
            }
            if (this.config.fields) {
                src = src + '&fields=' + this.config.fields;
            }
            var redirectUrl = this.getRedirectURL();
            if (redirectUrl) {
                src = src + '&redirectUrl=' + encodeURIComponent(redirectUrl);
            }

            var callbackUrl = this.getCallbackUrl();

            if (callbackUrl) {
                src = src + '&login_url=' + encodeURIComponent(callbackUrl);
            }

            var theme = this.getTheme();
            if (theme) {
                src = src + '&theme=' + encodeURIComponent(theme);
            }

            var externalWindow = this.config.externalWindow;

            if (externalWindow) {
                src = src + '&external_window=' + encodeURIComponent(externalWindow);
            }

            var widgetVersion = this.config.widgetVersion;
            if (widgetVersion) {
                src += '&version=' + encodeURIComponent(widgetVersion);
            }

            var compact = this.config.compact;
            if (compact) {
                src += '&compact=' + encodeURIComponent(compact);
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

},{"../package.json":1,"./supports":2,"./xlapi":3}]},{},["main"])("main")
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYS5ib3J0bmlrb3YveHNvbGxhLWxvZ2luLWpzLXNkay9wYWNrYWdlLmpzb24iLCJzcmMvc3VwcG9ydHMuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLE1BQU0sQ0FBQyxPQUFPLENBQUM7RUFDYix5REFBOEI7RUFDOUIsU0FBUyxFQUFFLE9BQU87RUFDbEIsNkNBQWtCO0VBQ2xCLGlEQUFzQjtFQUN0Qjs7Ozs7TUFLRTtFQUNGLHdDQUFhO0VBQ2IsNENBQWlCO0VBQ2pCLDhDQUFtQjtFQUNuQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O01BMkJFO0VBQ0Y7O01BRUM7Q0FDRjs7Ozs7QUM3Q0Q7OztBQUdBLElBQUksQ0FBQyxPQUFPLFNBQVAsQ0FBaUIsVUFBdEIsRUFBa0M7QUFDOUIsV0FBTyxTQUFQLENBQWlCLFVBQWpCLEdBQThCLFVBQVMsWUFBVCxFQUF1QixRQUF2QixFQUFpQztBQUMzRCxtQkFBVyxZQUFZLENBQXZCO0FBQ0EsZUFBTyxLQUFLLE9BQUwsQ0FBYSxZQUFiLEVBQTJCLFFBQTNCLE1BQXlDLFFBQWhEO0FBQ0gsS0FIRDtBQUlIOztBQUVELElBQUssT0FBTyxPQUFPLFdBQWQsS0FBOEIsVUFBbkMsRUFBZ0Q7QUFBQSxRQUNuQyxXQURtQyxHQUM1QyxTQUFTLFdBQVQsQ0FBcUIsS0FBckIsRUFBNEIsTUFBNUIsRUFBb0M7QUFDaEMsaUJBQVMsVUFBVSxFQUFDLFNBQVMsS0FBVixFQUFpQixZQUFZLEtBQTdCLEVBQW9DLFFBQVEsU0FBNUMsRUFBbkI7QUFDQSxZQUFJLE1BQU0sU0FBUyxXQUFULENBQXFCLGFBQXJCLENBQVY7QUFDQSxZQUFJLGVBQUosQ0FBb0IsS0FBcEIsRUFBMkIsT0FBTyxPQUFsQyxFQUEyQyxPQUFPLFVBQWxELEVBQThELE9BQU8sTUFBckU7QUFDQSxlQUFPLEdBQVA7QUFDSCxLQU4yQzs7QUFRNUMsZ0JBQVksU0FBWixHQUF3QixPQUFPLEtBQVAsQ0FBYSxTQUFyQzs7QUFFQSxXQUFPLFdBQVAsR0FBcUIsV0FBckI7QUFDSDs7Ozs7QUNyQkQ7OztBQUdBOzs7Ozs7O0FBT0EsSUFBSSxRQUFRLFNBQVIsS0FBUSxDQUFVLFNBQVYsRUFBcUIsT0FBckIsRUFBOEI7QUFDdEMsUUFBSSxPQUFPLElBQVg7QUFDQSxTQUFLLE9BQUwsR0FBZSxXQUFXLHlCQUExQjs7QUFFQSxTQUFLLFNBQUwsR0FBaUIsU0FBakI7O0FBRUEsU0FBSyxXQUFMLEdBQW1CLFVBQVUsTUFBVixFQUFrQixPQUFsQixFQUEyQixLQUEzQixFQUFrQztBQUNqRCxZQUFJLElBQUksSUFBSSxjQUFKLEVBQVI7QUFDQSxVQUFFLGVBQUYsR0FBb0IsSUFBcEI7QUFDQSxVQUFFLElBQUYsQ0FBTyxPQUFPLE1BQWQsRUFBc0IsS0FBSyxPQUFMLEdBQWUsT0FBTyxRQUE1QyxFQUFzRCxJQUF0RDtBQUNBLFVBQUUsa0JBQUYsR0FBdUIsWUFBWTtBQUMvQixnQkFBSSxFQUFFLFVBQUYsSUFBZ0IsQ0FBcEIsRUFBdUI7QUFDbkIsb0JBQUksRUFBRSxNQUFGLElBQVksR0FBaEIsRUFBcUI7QUFDakIsNEJBQVEsS0FBSyxLQUFMLENBQVcsRUFBRSxZQUFiLENBQVI7QUFDSCxpQkFGRCxNQUVPO0FBQ0gsd0JBQUksRUFBRSxZQUFOLEVBQW9CO0FBQ2hCLDhCQUFNLEtBQUssS0FBTCxDQUFXLEVBQUUsWUFBYixDQUFOO0FBQ0gscUJBRkQsTUFFTztBQUNILDhCQUFNLEVBQUMsT0FBTyxFQUFDLFNBQVMsa0JBQVYsRUFBOEIsTUFBTSxFQUFFLE1BQXRDLEVBQVIsRUFBTjtBQUNIO0FBQ0o7QUFDSjtBQUNKLFNBWkQ7QUFhQSxZQUFJLE9BQU8sTUFBUCxJQUFpQixNQUFyQixFQUE2QjtBQUN6QixjQUFFLGdCQUFGLENBQW1CLGNBQW5CLEVBQW1DLGdDQUFuQztBQUNBLGNBQUUsSUFBRixDQUFPLE9BQU8sUUFBZDtBQUNILFNBSEQsTUFHTyxJQUFJLE9BQU8sTUFBUCxJQUFpQixLQUFyQixFQUE0QjtBQUMvQixjQUFFLElBQUYsQ0FBTyxPQUFPLFlBQWQ7QUFDSDtBQUNKLEtBdkJEO0FBd0JILENBOUJEO0FBK0JBOzs7Ozs7QUFNQSxNQUFNLFNBQU4sQ0FBZ0IsY0FBaEIsR0FBaUMsVUFBVSxPQUFWLEVBQW1CLEtBQW5CLEVBQTBCLFlBQTFCLEVBQXdDO0FBQ3JFLFFBQUksTUFBTSxFQUFWO0FBQ0EsU0FBSyxJQUFJLEdBQVQsSUFBZ0IsWUFBaEIsRUFBOEI7QUFDMUIsWUFBSSxPQUFPLEVBQVgsRUFBZTtBQUNYLG1CQUFPLEdBQVA7QUFDSDtBQUNELGVBQU8sTUFBTSxHQUFOLEdBQVksbUJBQW1CLGFBQWEsR0FBYixDQUFuQixDQUFuQjtBQUNIOztBQUVELFdBQU8sS0FBSyxXQUFMLENBQWlCLEVBQUMsUUFBUSxLQUFULEVBQWdCLFVBQVUsdUJBQXVCLEdBQWpELEVBQXNELGNBQWMsSUFBcEUsRUFBakIsRUFBNEYsT0FBNUYsRUFBcUcsS0FBckcsQ0FBUDtBQUNILENBVkQ7O0FBWUEsTUFBTSxTQUFOLENBQWdCLGFBQWhCLEdBQWdDLFVBQVUsS0FBVixFQUFpQixJQUFqQixFQUF1QixVQUF2QixFQUFtQyxXQUFuQyxFQUFnRCxPQUFoRCxFQUF5RCxLQUF6RCxFQUFnRTtBQUM1RixRQUFJLE9BQU87QUFDUCxrQkFBVSxLQURIO0FBRVAsa0JBQVUsSUFGSDtBQUdQLHFCQUFhO0FBSE4sS0FBWDtBQUtBLFdBQU8sS0FBSyxXQUFMLENBQWlCLEVBQUMsUUFBUSxNQUFULEVBQWlCLFVBQVUsMkJBQXlCLEtBQUssU0FBOUIsR0FBMEMsZ0JBQTFDLEdBQTZELG1CQUFtQixXQUFuQixDQUF4RixFQUF5SCxVQUFVLEtBQUssU0FBTCxDQUFlLElBQWYsQ0FBbkksRUFBakIsRUFBMkssT0FBM0ssRUFBb0wsS0FBcEwsQ0FBUDtBQUNILENBUEQ7O0FBU0EsTUFBTSxTQUFOLENBQWdCLE9BQWhCLEdBQTBCLFVBQVUsV0FBVixFQUF1QixPQUF2QixFQUFnQyxLQUFoQyxFQUF1QztBQUM3RCxXQUFPLEtBQUssV0FBTCxDQUFpQixFQUFDLFFBQVEsS0FBVCxFQUFnQixVQUFVLEtBQTFCLEVBQWlDLGNBQWMsaUJBQWlCLFdBQWhFLEVBQWpCLEVBQStGLE9BQS9GLEVBQXdHLEtBQXhHLENBQVA7QUFDSCxDQUZEOztBQUlBLE9BQU8sT0FBUCxHQUFpQixLQUFqQjs7Ozs7Ozs7O0FDbEVBOzs7Ozs7OztBQU5BOzs7QUFHQSxRQUFRLFlBQVI7QUFDQSxJQUFNLFVBQVUsUUFBUSxpQkFBUixFQUEyQixPQUEzQzs7QUFHQTs7Ozs7OztBQU9BLElBQU0sU0FBUztBQUNYLFdBQU8sRUFESTtBQUVYLGtCQUFjLGNBRkg7QUFHWCxzQkFBa0IsZ0JBSFA7QUFJWCxpQkFBYSxPQUpGO0FBS1gsbUJBQWUsU0FMSjtBQU1YLG9CQUFnQjtBQU5MLENBQWY7O0FBU0EsSUFBTSxpQkFBaUI7QUFDbkIsa0JBQWMsc0JBQVUsQ0FBVixFQUFhLENBQzFCLENBRmtCO0FBR25CLHdCQUFvQiw0QkFBVSxDQUFWLEVBQWEsQ0FBYixFQUFnQjtBQUNoQyxlQUFPLElBQVA7QUFDSCxLQUxrQjtBQU1uQixvQ0FBZ0MsS0FOYjtBQU9uQixZQUFRLCtCQVBXO0FBUW5CLHFCQUFpQixFQVJFO0FBU25CLGlCQUFhLEtBVE07QUFVbkIscUJBQWlCLHdDQVZFO0FBV25CLDBCQUFzQixvQkFYSDtBQVluQixrQkFBYyxPQVpLO0FBYW5CLFdBQU8saUJBYlk7QUFjbkIsZUFBVyxhQWRRO0FBZW5CLG1CQUFlLCtCQWZJO0FBZ0JuQixXQUFPLE9BQU8sS0FoQks7QUFpQm5CLGFBQVMsS0FqQlU7QUFrQm5CLHNCQUFrQjtBQWxCQyxDQUF2Qjs7QUFxQkEsSUFBTSwyQkFBMkIsQ0FBakM7QUFDQSxJQUFNLHlDQUF5QyxDQUEvQzs7QUFFQSxJQUFNLFlBQVkseUJBQWxCO0FBQ0EsSUFBTSxlQUFlLFNBQVMsYUFBVCxDQUF1QixRQUF2QixDQUFyQjs7SUFFTSxFO0FBQ0Ysa0JBQWM7QUFBQTs7QUFDVixhQUFLLFVBQUwsR0FBa0IsRUFBbEI7QUFDQSxhQUFLLFVBQUwsR0FBa0I7QUFDZCxrQkFBTSxNQURRO0FBRWQsbUJBQU8sT0FGTztBQUdkLHdCQUFZLFlBSEU7QUFJZCxrQ0FBc0Isc0JBSlI7QUFLZCwyQkFBZTtBQUxELFNBQWxCOztBQVFBO0FBQ0EsYUFBSyxNQUFMLEdBQWMsTUFBZDs7QUFFQSxhQUFLLFVBQUwsR0FBa0IsU0FBUyxhQUFULENBQXVCLEtBQXZCLENBQWxCO0FBQ0EsYUFBSyxXQUFMLEdBQW1CLEtBQUssV0FBTCxDQUFpQixJQUFqQixDQUFzQixJQUF0QixDQUFuQjtBQUNIOzs7OzZCQUVJLE8sRUFBUztBQUFBOztBQUNWLGlCQUFLLE1BQUwsR0FBYyxTQUFjLEVBQWQsRUFBa0IsY0FBbEIsRUFBa0MsT0FBbEMsQ0FBZDtBQUNBLGlCQUFLLE1BQUwsQ0FBWSxvQkFBWixHQUFtQyxlQUFlLG9CQUFsRDtBQUNBLGlCQUFLLEdBQUwsR0FBVyxJQUFJLGVBQUosQ0FBVSxRQUFRLFNBQWxCLEVBQTZCLEtBQUssTUFBTCxDQUFZLE1BQXpDLENBQVg7O0FBRUEsZ0JBQU0sY0FBYyxPQUFPLGdCQUFQLEdBQTBCLGtCQUExQixHQUErQyxhQUFuRTtBQUNBLGdCQUFNLFVBQVUsT0FBTyxXQUFQLENBQWhCO0FBQ0EsZ0JBQU0sZUFBZSxnQkFBZ0IsYUFBaEIsR0FBZ0MsV0FBaEMsR0FBOEMsU0FBbkU7O0FBRUE7QUFDQSxvQkFBUSxZQUFSLEVBQXNCLFVBQUMsQ0FBRCxFQUFPO0FBQ3pCLG9CQUFJLGNBQUo7QUFDQSxvQkFBSSxPQUFPLEVBQUUsSUFBVCxLQUFrQixRQUF0QixFQUFnQztBQUM1QjtBQUNBLDRCQUFRLElBQUksV0FBSixDQUFnQixNQUFLLFVBQUwsQ0FBZ0IsRUFBRSxJQUFsQixDQUFoQixDQUFSO0FBQ0gsaUJBSEQsTUFHTztBQUNIO0FBQ0EsNEJBQVEsSUFBSSxXQUFKLENBQWdCLE1BQUssVUFBTCxDQUFnQixFQUFFLElBQUYsQ0FBTyxJQUF2QixDQUFoQixFQUE4QyxFQUFDLFFBQVEsRUFBRSxJQUFYLEVBQTlDLENBQVI7QUFDSDtBQUNELHNCQUFLLFVBQUwsQ0FBZ0IsYUFBaEIsQ0FBOEIsS0FBOUI7QUFDSCxhQVZELEVBVUcsS0FWSDs7QUFZQSxtQkFBTyxJQUFQLENBQVksS0FBSyxVQUFqQixFQUE2QixHQUE3QixDQUFpQyxVQUFDLFFBQUQsRUFBYztBQUMzQyxzQkFBSyxFQUFMLENBQVEsTUFBSyxVQUFMLENBQWdCLFFBQWhCLENBQVI7QUFDSCxhQUZEOztBQUlBLGdCQUFHLFFBQVEsb0JBQVgsRUFBaUM7QUFDN0IscUJBQUssTUFBTCxDQUFZLG9CQUFaLEdBQW1DLFFBQVEsb0JBQTNDO0FBQ0g7O0FBRUQsaUJBQUssVUFBTCxDQUFnQixnQkFBaEIsQ0FBaUMsS0FBSyxVQUFMLENBQWdCLFVBQWpELEVBQTZELEtBQUssV0FBbEU7O0FBRUEsZ0JBQUksQ0FBQyxLQUFLLE1BQUwsQ0FBWSxXQUFqQixFQUE4Qjs7QUFFMUIsb0JBQUksU0FBUyxFQUFiO0FBQ0EsdUJBQU8sU0FBUCxHQUFtQixRQUFRLFNBQTNCO0FBQ0Esb0JBQUksS0FBSyxNQUFMLENBQVksV0FBaEIsRUFBNkI7QUFDekIsMkJBQU8sWUFBUCxHQUFzQixLQUFLLE1BQUwsQ0FBWSxXQUFsQztBQUNIO0FBQ0Qsb0JBQUksS0FBSyxNQUFMLENBQVksUUFBaEIsRUFBMEI7QUFDdEIsMkJBQU8sU0FBUCxHQUFtQixLQUFLLE1BQUwsQ0FBWSxRQUEvQjtBQUNIO0FBQ0Qsb0JBQUksS0FBSyxNQUFMLENBQVksV0FBaEIsRUFBNkI7QUFDekIsMkJBQU8sU0FBUCxHQUFtQixLQUFLLE1BQUwsQ0FBWSxXQUEvQjtBQUNIO0FBQ0o7QUFDSjs7QUFFRDs7Ozs7Ozs7OzhCQU1NLEksRUFBTSxLLEVBQU8sTyxFQUFTO0FBQUE7O0FBRXhCLGdCQUFJLENBQUMsSUFBRCxJQUFTLENBQUMsS0FBSyxVQUFuQixFQUErQjtBQUMzQjtBQUNIOztBQUVEOzs7O0FBSUEsZ0JBQUksS0FBSyxRQUFULEVBQW1CO0FBQ2Ysb0JBQUksS0FBSyxRQUFMLENBQWMsVUFBZCxDQUF5QixLQUF6QixDQUFKLEVBQXFDO0FBQ2pDLHdCQUFNLFlBQVksS0FBSyxVQUFMLENBQWdCLEtBQUssUUFBckIsQ0FBbEI7QUFDQSx3QkFBSSxhQUFhLFNBQWpCLEVBQTRCO0FBQ3hCLCtCQUFPLFFBQVAsQ0FBZ0IsSUFBaEIsR0FBdUIsS0FBSyxVQUFMLENBQWdCLEtBQUssUUFBckIsQ0FBdkI7QUFDSCxxQkFGRCxNQUVPO0FBQ0gsZ0NBQVEsS0FBUixDQUFjLGdCQUFnQixLQUFLLFFBQXJCLEdBQWdDLGlCQUE5QztBQUNIO0FBRUosaUJBUkQsTUFRTyxJQUFJLEtBQUssUUFBTCxJQUFpQixZQUFyQixFQUFtQztBQUN0Qyx5QkFBSyxHQUFMLENBQVMsYUFBVCxDQUF1QixLQUFLLEtBQTVCLEVBQW1DLEtBQUssSUFBeEMsRUFBOEMsS0FBSyxVQUFuRCxFQUErRCxLQUFLLE1BQUwsQ0FBWSxXQUEzRSxFQUF3RixVQUFDLEdBQUQsRUFBUztBQUM3Riw0QkFBSSxJQUFJLFNBQVIsRUFBbUI7QUFDZixnQ0FBTSxhQUFhLFNBQWIsVUFBYSxHQUFZO0FBQzNCLHVDQUFPLFFBQVAsQ0FBZ0IsSUFBaEIsR0FBdUIsSUFBSSxTQUEzQjtBQUNILDZCQUZEO0FBR0EsZ0NBQUksT0FBSixFQUFhO0FBQ1Qsd0NBQVEsRUFBQyxRQUFRLFNBQVQsRUFBb0IsUUFBUSxVQUE1QixFQUF3QyxhQUFhLElBQUksU0FBekQsRUFBUjtBQUNILDZCQUZELE1BRU87QUFDSDtBQUNIO0FBQ0oseUJBVEQsTUFTTztBQUNILGtDQUFNLE9BQUssaUJBQUwsQ0FBdUIseUJBQXZCLEVBQWtELHNDQUFsRCxDQUFOO0FBQ0g7QUFDSixxQkFiRCxFQWFHLFVBQVUsR0FBVixFQUFlO0FBQ2QsOEJBQU0sR0FBTjtBQUNILHFCQWZEO0FBZ0JILGlCQWpCTSxNQWlCQSxJQUFJLEtBQUssUUFBTCxJQUFpQixLQUFyQixFQUE0QjtBQUMvQix3QkFBSSxlQUFlLE9BQW5CLEVBQTRCO0FBQ3hCLDZCQUFLLEdBQUwsQ0FBUyxPQUFULENBQWlCLEtBQUssV0FBdEIsRUFBbUMsSUFBbkMsRUFBeUMsSUFBekM7QUFDSCxxQkFGRCxNQUVPLElBQUksZUFBZSxNQUFuQixFQUEyQixDQUVqQztBQUNKLGlCQU5NLE1BTUE7QUFDSCw0QkFBUSxLQUFSLENBQWMsbUJBQWQ7QUFDSDtBQUNKO0FBQ0o7OzswQ0FFaUIsTyxFQUFTLEksRUFBTTtBQUM3QixtQkFBTztBQUNILHVCQUFPO0FBQ0gsNkJBQVMsT0FETjtBQUVILDBCQUFNLFFBQVEsQ0FBQztBQUZaO0FBREosYUFBUDtBQU1IOzs7dUNBRWM7QUFDWCxtQkFBTyxLQUFLLE1BQUwsQ0FBWSxTQUFuQjtBQUNIOzs7eUNBRWdCO0FBQ2IsbUJBQU8sS0FBSyxNQUFMLENBQVksV0FBbkI7QUFDSDs7O21DQUVVO0FBQ1AsbUJBQU8sS0FBSyxNQUFMLENBQVksS0FBbkI7QUFDSDs7O3lDQUVnQjtBQUNiLGdCQUFJLEtBQUssTUFBTCxDQUFZLFdBQWhCLEVBQTZCO0FBQ3pCLHVCQUFPLEtBQUssTUFBTCxDQUFZLFdBQW5CO0FBQ0gsYUFGRCxNQUVPLElBQUksS0FBSyxNQUFMLENBQVksUUFBaEIsRUFBMEI7QUFDN0IsdUJBQU8sS0FBSyxNQUFMLENBQVksUUFBbkI7QUFDSCxhQUZNLE1BRUEsSUFBSSxLQUFLLE1BQUwsQ0FBWSxjQUFoQixFQUFnQztBQUNuQyx1QkFBTyxlQUFlLGVBQXRCO0FBQ0g7QUFDSjs7O3VDQUUwQjtBQUFBLGdCQUFkLE9BQWMsdUVBQUosRUFBSTs7QUFDdkIsZ0JBQUksZ0JBQWdCLFFBQVEsYUFBUixJQUF5QixLQUFLLE1BQUwsQ0FBWSxhQUF6RDs7QUFFQSxnQkFBSSxjQUFjLE1BQWQsQ0FBcUIsQ0FBQyxDQUF0QixNQUE2QixHQUFqQyxFQUFzQztBQUNsQyxpQ0FBaUIsR0FBakI7QUFDSDs7QUFFRCxnQkFBTSxRQUFRLFFBQVEsS0FBUixJQUFpQixLQUFLLE1BQUwsQ0FBWSxLQUEzQzs7QUFFQSxnQkFBSSxNQUFNLGdCQUFnQixLQUFoQixHQUF3QixzQkFBeEIsR0FBaUQsT0FBakQsR0FBMkQsYUFBM0QsR0FBMkUsS0FBSyxZQUFMLEVBQXJGOztBQUVBLGdCQUFJLEtBQUssTUFBTCxDQUFZLE1BQWhCLEVBQXdCO0FBQ3BCLHNCQUFNLE1BQU0sVUFBTixHQUFtQixLQUFLLE1BQUwsQ0FBWSxNQUFyQztBQUNIO0FBQ0QsZ0JBQUksS0FBSyxNQUFMLENBQVksTUFBaEIsRUFBd0I7QUFDcEIsc0JBQU0sTUFBTSxVQUFOLEdBQW1CLEtBQUssTUFBTCxDQUFZLE1BQXJDO0FBQ0g7QUFDRCxnQkFBTSxjQUFjLEtBQUssY0FBTCxFQUFwQjtBQUNBLGdCQUFJLFdBQUosRUFBaUI7QUFDYixzQkFBTSxNQUFNLGVBQU4sR0FBd0IsbUJBQW1CLFdBQW5CLENBQTlCO0FBQ0g7O0FBRUQsZ0JBQU0sY0FBYyxLQUFLLGNBQUwsRUFBcEI7O0FBRUEsZ0JBQUksV0FBSixFQUFpQjtBQUNiLHNCQUFNLE1BQU0sYUFBTixHQUFzQixtQkFBbUIsV0FBbkIsQ0FBNUI7QUFDSDs7QUFFRCxnQkFBTSxRQUFRLEtBQUssUUFBTCxFQUFkO0FBQ0EsZ0JBQUksS0FBSixFQUFXO0FBQ1Asc0JBQU0sTUFBTSxTQUFOLEdBQWtCLG1CQUFtQixLQUFuQixDQUF4QjtBQUNIOztBQS9Cc0IsZ0JBaUNoQixjQWpDZ0IsR0FpQ0UsS0FBSyxNQWpDUCxDQWlDaEIsY0FqQ2dCOztBQWtDdkIsZ0JBQUksY0FBSixFQUFvQjtBQUNoQixzQkFBTSxNQUFNLG1CQUFOLEdBQTRCLG1CQUFtQixjQUFuQixDQUFsQztBQUNIOztBQUVELGdCQUFNLGdCQUFnQixLQUFLLE1BQUwsQ0FBWSxhQUFsQztBQUNBLGdCQUFJLGFBQUosRUFBbUI7QUFDZix1QkFBTyxjQUFjLG1CQUFtQixhQUFuQixDQUFyQjtBQUNIOztBQUVELGdCQUFNLFVBQVUsS0FBSyxNQUFMLENBQVksT0FBNUI7QUFDQSxnQkFBSSxPQUFKLEVBQWE7QUFDVCx1QkFBTyxjQUFjLG1CQUFtQixPQUFuQixDQUFyQjtBQUNIOztBQUVELG1CQUFPLEdBQVA7QUFDSDs7O21DQUVVLFMsRUFBVyxPLEVBQVM7QUFBQTs7QUFDM0IsZ0JBQUksS0FBSyxHQUFULEVBQWM7QUFDVixvQkFBSSxDQUFDLFNBQUwsRUFBZ0I7QUFDWiw0QkFBUSxLQUFSLENBQWMsY0FBZDtBQUNILGlCQUZELE1BRU87QUFDSCx3QkFBSSxXQUFXLFNBQWYsRUFBMEI7QUFDdEIsa0NBQVUsRUFBVjtBQUNIO0FBQ0Qsd0JBQU0sU0FBVyxRQUFRLEtBQVIsSUFBaUIsR0FBNUIsUUFBTjtBQUNBLHdCQUFNLFVBQVksUUFBUSxNQUFSLElBQWtCLEdBQTlCLFFBQU47O0FBRUEsaUNBQWEsTUFBYixHQUFzQixZQUFNO0FBQ3hCLGlDQUFRLFdBQVIsQ0FBb0IsVUFBcEI7QUFDQSxxQ0FBYSxLQUFiLENBQW1CLEtBQW5CLEdBQTJCLE1BQTNCO0FBQ0EscUNBQWEsS0FBYixDQUFtQixNQUFuQixHQUE0QixNQUE1QjtBQUNBLDRCQUFJLFFBQVEsSUFBSSxXQUFKLENBQWdCLE1BQWhCLENBQVo7QUFDQSwrQkFBSyxVQUFMLENBQWdCLGFBQWhCLENBQThCLEtBQTlCO0FBQ0gscUJBTkQ7QUFPQSxpQ0FBYSxLQUFiLENBQW1CLEtBQW5CLEdBQTJCLENBQTNCO0FBQ0EsaUNBQWEsS0FBYixDQUFtQixNQUFuQixHQUE0QixDQUE1QjtBQUNBLGlDQUFhLFdBQWIsR0FBMkIsR0FBM0I7QUFDQSxpQ0FBYSxHQUFiLEdBQW1CLEtBQUssWUFBTCxDQUFrQixPQUFsQixDQUFuQjtBQUNBLGlDQUFhLEVBQWIsR0FBa0IsU0FBbEI7O0FBRUEsd0JBQU0sYUFBWSxTQUFTLGFBQVQsQ0FBdUIsS0FBdkIsQ0FBbEI7O0FBRUEsK0JBQVUsU0FBVixHQUFzQixLQUFLLE1BQUwsQ0FBWSxTQUFsQzs7QUFFQSx3QkFBTSxXQUFVLFNBQVMsY0FBVCxDQUF3QixTQUF4QixDQUFoQjtBQUNBLHdCQUFJLFFBQUosRUFBYTtBQUNULGlDQUFRLEtBQVIsQ0FBYyxLQUFkLEdBQXNCLEtBQXRCO0FBQ0EsaUNBQVEsS0FBUixDQUFjLE1BQWQsR0FBdUIsTUFBdkI7QUFDQSxpQ0FBUSxXQUFSLENBQW9CLFVBQXBCO0FBQ0EsaUNBQVEsV0FBUixDQUFvQixZQUFwQjtBQUNILHFCQUxELE1BS087QUFDSCxnQ0FBUSxLQUFSLENBQWMsZUFBZSxTQUFmLEdBQTJCLGVBQXpDO0FBQ0g7QUFFSjtBQUNKLGFBdENELE1Bc0NPO0FBQ0gsd0JBQVEsS0FBUixDQUFjLDRCQUFkO0FBQ0g7QUFDSjs7O3VDQUVjO0FBQ1gseUJBQWEsVUFBYixDQUF3QixXQUF4QixDQUFvQyxZQUFwQztBQUNIOzs7Z0NBRU87QUFDSix5QkFBYSxLQUFiLENBQW1CLFFBQW5CLEdBQThCLEVBQTlCO0FBQ0EseUJBQWEsS0FBYixDQUFtQixNQUFuQixHQUE0QixFQUE1QjtBQUNBLHlCQUFhLEtBQWIsQ0FBbUIsSUFBbkIsR0FBMEIsRUFBMUI7QUFDQSx5QkFBYSxLQUFiLENBQW1CLEdBQW5CLEdBQXlCLEVBQXpCO0FBQ0EseUJBQWEsS0FBYixDQUFtQixLQUFuQixHQUEyQixDQUEzQjtBQUNBLHlCQUFhLEtBQWIsQ0FBbUIsTUFBbkIsR0FBNEIsQ0FBNUI7QUFDQSx5QkFBYSxLQUFiLENBQW1CLGVBQW5CLEdBQXFDLEVBQXJDO0FBQ0g7OztzQ0FFYTtBQUNWLGdCQUFJLEtBQUssTUFBTCxDQUFZLGdCQUFoQixFQUFrQztBQUM5QixxQkFBSyxLQUFMO0FBQ0g7QUFDSjs7QUFFRDs7Ozs7Ozs7MkJBTUcsSyxFQUFPLE8sRUFBUztBQUNmLHNCQUFVLFdBQVcsWUFBVyxDQUFFLENBQWxDOztBQUVBLGdCQUFJLFVBQVUsS0FBSyxVQUFMLENBQWdCLEtBQTlCLEVBQXFDO0FBQ2pDLG9CQUFJLENBQUMsT0FBTCxFQUFjO0FBQ1YsOEJBQVUsS0FBSyxZQUFmO0FBQ0gsaUJBRkQsTUFHSztBQUNELHlCQUFLLFVBQUwsQ0FBZ0IsbUJBQWhCLENBQW9DLEtBQXBDLEVBQTJDLEtBQUssWUFBaEQ7QUFDSDtBQUNKOztBQUVELGlCQUFLLFVBQUwsQ0FBZ0IsZ0JBQWhCLENBQWlDLEtBQWpDLEVBQXdDLFVBQUMsQ0FBRDtBQUFBLHVCQUFPLFFBQVEsRUFBRSxNQUFWLENBQVA7QUFBQSxhQUF4QztBQUNIOzs7Z0NBRU87QUFDSix5QkFBYSxLQUFiLENBQW1CLFFBQW5CLEdBQThCLE9BQTlCO0FBQ0EseUJBQWEsS0FBYixDQUFtQixNQUFuQixHQUE0QixLQUFLLE1BQUwsQ0FBWSxZQUF4QztBQUNBLHlCQUFhLEtBQWIsQ0FBbUIsSUFBbkIsR0FBMEIsR0FBMUI7QUFDQSx5QkFBYSxLQUFiLENBQW1CLEdBQW5CLEdBQXlCLEdBQXpCO0FBQ0EseUJBQWEsS0FBYixDQUFtQixLQUFuQixHQUEyQixNQUEzQjtBQUNBLHlCQUFhLEtBQWIsQ0FBbUIsTUFBbkIsR0FBNEIsTUFBNUI7QUFDQSx5QkFBYSxLQUFiLENBQW1CLGVBQW5CLEdBQXFDLEtBQUssTUFBTCxDQUFZLG9CQUFqRDtBQUNBLGlCQUFLLE1BQUwsQ0FBWSxnQkFBWixHQUErQixJQUEvQjtBQUNIOztBQUVEOzs7Ozs7K0JBSU87QUFBQTs7QUFDSCxnQkFBSSxDQUFDLFNBQVMsY0FBVCxDQUF3QixTQUF4QixDQUFMLEVBQXlDO0FBQ3JDLDZCQUFhLEdBQWIsR0FBbUIsS0FBSyxZQUFMLEVBQW5CO0FBQ0EsNkJBQWEsRUFBYixHQUFrQixTQUFsQjtBQUNBLDZCQUFhLEtBQWIsQ0FBbUIsS0FBbkIsR0FBMkIsQ0FBM0I7QUFDQSw2QkFBYSxLQUFiLENBQW1CLE1BQW5CLEdBQTRCLENBQTVCO0FBQ0EsNkJBQWEsV0FBYixHQUEyQixHQUEzQjs7QUFFQSw2QkFBYSxNQUFiLEdBQXNCLFlBQU07QUFDeEIsd0JBQUksUUFBUSxJQUFJLFdBQUosQ0FBZ0IsTUFBaEIsQ0FBWjtBQUNBLDJCQUFLLFVBQUwsQ0FBZ0IsYUFBaEIsQ0FBOEIsS0FBOUI7QUFDSCxpQkFIRDtBQUlBLHFCQUFLLEtBQUw7O0FBRUEseUJBQVMsSUFBVCxDQUFjLFdBQWQsQ0FBMEIsWUFBMUI7QUFDSCxhQWRELE1BY087QUFDSCxxQkFBSyxLQUFMO0FBQ0g7QUFDSjs7Ozs7O0FBR0wsSUFBTSxTQUFTLElBQUksRUFBSixFQUFmOztBQUVBLE9BQU8sT0FBUCxHQUFpQixNQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJuYW1lXCI6IFwieHNvbGxhLWxvZ2luLWpzLXNka1wiLFxuICBcInZlcnNpb25cIjogXCIyLjAuMFwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiXCIsXG4gIFwibWFpblwiOiBcInNyYy9tYWluLmpzXCIsXG4gIFwic2NyaXB0c1wiOiB7XG4gICAgXCJidWlsZFwiOiBcImd1bHAgYnVpbGRcIixcbiAgICBcImhvc3RcIjogXCJzdGF0aWMtc2VydmVyIC4gLXAgODA4NFwiLFxuICAgIFwidGVzdFwiOiBcImthcm1hIHN0YXJ0XCIsXG4gICAgXCJ0ZXN0OndhdGNoXCI6IFwia2FybWEgc3RhcnQgLS1uby1zaW5nbGUtcnVuIC0tYXV0by13YXRjaFwiXG4gIH0sXG4gIFwiYXV0aG9yXCI6IFwiXCIsXG4gIFwibGljZW5zZVwiOiBcIk1JVFwiLFxuICBcImRlcGVuZGVuY2llc1wiOiB7fSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYmFiZWwtcGx1Z2luLXRyYW5zZm9ybS1vYmplY3QtYXNzaWduXCI6IFwiXjYuMjIuMFwiLFxuICAgIFwiYmFiZWwtcHJlc2V0LWVzMjAxNVwiOiBcIl42LjE4LjBcIixcbiAgICBcImJhYmVsaWZ5XCI6IFwiXjcuMy4wXCIsXG4gICAgXCJib3dlclwiOiBcIl4xLjguNFwiLFxuICAgIFwiYnJmc1wiOiBcIl4yLjAuMVwiLFxuICAgIFwiYnJvd3Nlci1zeW5jXCI6IFwiXjIuMjYuM1wiLFxuICAgIFwiYnJvd3NlcmlmeVwiOiBcIl4xNi4yLjNcIixcbiAgICBcImJyb3dzZXJpZnktaXN0YW5idWxcIjogXCJeMi4wLjBcIixcbiAgICBcImJyb3dzZXJpZnktc2hpbVwiOiBcIl4zLjguMTJcIixcbiAgICBcImNvbW1vbi1zaGFrZWlmeVwiOiBcIl4wLjYuMFwiLFxuICAgIFwiZ3VscFwiOiBcIl4zLjkuMVwiLFxuICAgIFwiZ3VscC1pZlwiOiBcIl4yLjAuMlwiLFxuICAgIFwiZ3VscC1yZW5hbWVcIjogXCIxLjIuMFwiLFxuICAgIFwiZ3VscC1zb3VyY2VtYXBzXCI6IFwiMS41LjJcIixcbiAgICBcImd1bHAtc3RyaXAtY29tbWVudHNcIjogXCJeMi41LjJcIixcbiAgICBcImd1bHAtdWdsaWZ5XCI6IFwiXjMuMC4xXCIsXG4gICAgXCJndWxwLXV0aWxcIjogXCIzLjAuNlwiLFxuICAgIFwiamFzbWluZVwiOiBcIl4yLjQuMVwiLFxuICAgIFwia2FybWFcIjogXCJeMy4wLjBcIixcbiAgICBcImthcm1hLWJyb3dzZXJpZnlcIjogXCJeNS4zLjBcIixcbiAgICBcImthcm1hLWNvdmVyYWdlXCI6IFwiXjEuMS4yXCIsXG4gICAgXCJrYXJtYS1qYXNtaW5lXCI6IFwiXjEuMC4yXCIsXG4gICAgXCJzdGF0aWMtc2VydmVyXCI6IFwiMi4yLjFcIixcbiAgICBcInZpbnlsLWJ1ZmZlclwiOiBcIjEuMC4wXCIsXG4gICAgXCJ2aW55bC1zb3VyY2Utc3RyZWFtXCI6IFwiMS4xLjBcIixcbiAgICBcIndhdGNoaWZ5XCI6IFwiXjMuMTEuMFwiXG4gIH0sXG4gIFwiYnJvd3NlcmlmeS1zaGltXCI6IHtcbiAgICBcImV4dGVybmFsXCI6IFwiZ2xvYmFsOkV4dGVybmFsXCJcbiAgfVxufVxuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMDcuMTEuMTYuXG4gKi9cbmlmICghU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoKSB7XG4gICAgU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoID0gZnVuY3Rpb24oc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikge1xuICAgICAgICBwb3NpdGlvbiA9IHBvc2l0aW9uIHx8IDA7XG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4T2Yoc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikgPT09IHBvc2l0aW9uO1xuICAgIH07XG59XG5cbmlmICggdHlwZW9mIHdpbmRvdy5DdXN0b21FdmVudCAhPT0gXCJmdW5jdGlvblwiICkge1xuICAgIGZ1bmN0aW9uIEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMpIHtcbiAgICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHtidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogZmFsc2UsIGRldGFpbDogdW5kZWZpbmVkfTtcbiAgICAgICAgdmFyIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdDdXN0b21FdmVudCcpO1xuICAgICAgICBldnQuaW5pdEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMuYnViYmxlcywgcGFyYW1zLmNhbmNlbGFibGUsIHBhcmFtcy5kZXRhaWwpO1xuICAgICAgICByZXR1cm4gZXZ0O1xuICAgIH1cblxuICAgIEN1c3RvbUV2ZW50LnByb3RvdHlwZSA9IHdpbmRvdy5FdmVudC5wcm90b3R5cGU7XG5cbiAgICB3aW5kb3cuQ3VzdG9tRXZlbnQgPSBDdXN0b21FdmVudDtcbn0iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuLyoqXG4gKiBJbXBlbGVtZW50cyBYc29sbGEgTG9naW4gQXBpXG4gKiBAcGFyYW0gcHJvamVjdElkIC0gcHJvamVjdCdzIHVuaXF1ZSBpZGVudGlmaWVyXG4gKiBAcGFyYW0gYmFzZVVybCAtIGFwaSBlbmRwb2ludFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxudmFyIFhMQXBpID0gZnVuY3Rpb24gKHByb2plY3RJZCwgYmFzZVVybCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmJhc2VVcmwgPSBiYXNlVXJsIHx8ICcvL2xvZ2luLnhzb2xsYS5jb20vYXBpLyc7XG5cbiAgICB0aGlzLnByb2plY3RJZCA9IHByb2plY3RJZDtcblxuICAgIHRoaXMubWFrZUFwaUNhbGwgPSBmdW5jdGlvbiAocGFyYW1zLCBzdWNjZXNzLCBlcnJvcikge1xuICAgICAgICB2YXIgciA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG4gICAgICAgIHIub3BlbihwYXJhbXMubWV0aG9kLCBzZWxmLmJhc2VVcmwgKyBwYXJhbXMuZW5kcG9pbnQsIHRydWUpO1xuICAgICAgICByLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgICAgICAgIGlmIChyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyhKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcih7ZXJyb3I6IHttZXNzYWdlOiAnTmV0d29ya2luZyBlcnJvcicsIGNvZGU6IHIuc3RhdHVzfX0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBpZiAocGFyYW1zLm1ldGhvZCA9PSAnUE9TVCcpIHtcbiAgICAgICAgICAgIHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwiKTtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMucG9zdEJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy5tZXRob2QgPT0gJ0dFVCcpIHtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMuZ2V0QXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuLyoqXG4gKiBHZXQgYWxsIGF2aWFsYWJsZSBzb2NpYWwgbWV0aG9kcyBhdXRoIHVybFxuICogQHBhcmFtIHN1Y2Nlc3MgLSBzdWNjZXNzIGNhbGxiYWNrXG4gKiBAcGFyYW0gZXJyb3IgLSBlcnJvciBjYWxsYmFja1xuICogQHBhcmFtIGdldEFyZ3VtZW50cyAtIGFkZGl0aW9uYWwgcGFyYW1zIHRvIHNlbmQgd2l0aCByZXF1ZXN0XG4gKi9cblhMQXBpLnByb3RvdHlwZS5nZXRTb2NpYWxzVVJMcyA9IGZ1bmN0aW9uIChzdWNjZXNzLCBlcnJvciwgZ2V0QXJndW1lbnRzKSB7XG4gICAgdmFyIHN0ciA9IFwiXCI7XG4gICAgZm9yICh2YXIga2V5IGluIGdldEFyZ3VtZW50cykge1xuICAgICAgICBpZiAoc3RyICE9IFwiXCIpIHtcbiAgICAgICAgICAgIHN0ciArPSBcIiZcIjtcbiAgICAgICAgfVxuICAgICAgICBzdHIgKz0ga2V5ICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoZ2V0QXJndW1lbnRzW2tleV0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ3NvY2lhbC9sb2dpbl91cmxzPycgKyBzdHIsIGdldEFyZ3VtZW50czogbnVsbH0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cblhMQXBpLnByb3RvdHlwZS5sb2dpblBhc3NBdXRoID0gZnVuY3Rpb24gKGxvZ2luLCBwYXNzLCByZW1lbWJlck1lLCByZWRpcmVjdFVybCwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICB2YXIgYm9keSA9IHtcbiAgICAgICAgdXNlcm5hbWU6IGxvZ2luLFxuICAgICAgICBwYXNzd29yZDogcGFzcyxcbiAgICAgICAgcmVtZW1iZXJfbWU6IHJlbWVtYmVyTWVcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdQT1NUJywgZW5kcG9pbnQ6ICdwcm94eS9sb2dpbj9wcm9qZWN0SWQ9Jyt0aGlzLnByb2plY3RJZCArICcmcmVkaXJlY3RfdXJsPScgKyBlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmwpLCBwb3N0Qm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSl9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUuc21zQXV0aCA9IGZ1bmN0aW9uIChwaG9uZU51bWJlciwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzbXMnLCBnZXRBcmd1bWVudHM6ICdwaG9uZU51bWJlcj0nICsgcGhvbmVOdW1iZXJ9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhMQXBpO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbnJlcXVpcmUoJy4vc3VwcG9ydHMnKTtcbmNvbnN0IHZlcnNpb24gPSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKS52ZXJzaW9uO1xuXG5pbXBvcnQgWExBcGkgZnJvbSAnLi94bGFwaSc7XG4vKipcbiAqIENyZWF0ZSBhbiBgQXV0aDBgIGluc3RhbmNlIHdpdGggYG9wdGlvbnNgXG4gKlxuICogQGNsYXNzIFhMXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuXG5jb25zdCBST1VURVMgPSB7XG4gICAgTE9HSU46ICcnLFxuICAgIFJFR0lTVFJBVElPTjogJ3JlZ2lzdHJhdGlvbicsXG4gICAgUkVDT1ZFUl9QQVNTV09SRDogJ3Jlc2V0LXBhc3N3b3JkJyxcbiAgICBBTExfU09DSUFMUzogJ290aGVyJyxcbiAgICBTT0NJQUxTX0xPR0lOOiAnc29jaWFscycsXG4gICAgVVNFUk5BTUVfTE9HSU46ICd1c2VybmFtZS1sb2dpbicsXG59O1xuXG5jb25zdCBERUZBVUxUX0NPTkZJRyA9IHtcbiAgICBlcnJvckhhbmRsZXI6IGZ1bmN0aW9uIChhKSB7XG4gICAgfSxcbiAgICBsb2dpblBhc3NWYWxpZGF0b3I6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgaXNNYXJrdXBTb2NpYWxzSGFuZGxlcnNFbmFibGVkOiBmYWxzZSxcbiAgICBhcGlVcmw6ICdodHRwczovL2xvZ2luLnhzb2xsYS5jb20vYXBpLycsXG4gICAgbWF4WExDbGlja0RlcHRoOiAyMCxcbiAgICBvbmx5V2lkZ2V0czogZmFsc2UsXG4gICAgZGVmYXVsdExvZ2luVXJsOiAnaHR0cHM6Ly94bC13aWRnZXQueHNvbGxhLmNvbS9hdXRoLmh0bWwnLFxuICAgIHBvcHVwQmFja2dyb3VuZENvbG9yOiAncmdiKDE4NywgMTg3LCAxODcpJyxcbiAgICBpZnJhbWVaSW5kZXg6IDEwMDAwMDAsXG4gICAgdGhlbWU6ICdhcHAuZGVmYXVsdC5jc3MnLFxuICAgIHByZWxvYWRlcjogJzxkaXY+PC9kaXY+JyxcbiAgICB3aWRnZXRCYXNlVXJsOiAnaHR0cHM6Ly94bC13aWRnZXQueHNvbGxhLmNvbS8nLFxuICAgIHJvdXRlOiBST1VURVMuTE9HSU4sXG4gICAgY29tcGFjdDogZmFsc2UsXG4gICAgaW5GdWxsc2NyZWVuTW9kZTogZmFsc2Vcbn07XG5cbmNvbnN0IElOVkFMSURfTE9HSU5fRVJST1JfQ09ERSA9IDE7XG5jb25zdCBJTkNPUlJFQ1RfTE9HSU5fT1JfUEFTU1dPUkRfRVJST1JfQ09ERSA9IDI7XG5cbmNvbnN0IElGUkFNRV9JRCA9ICdYc29sbGFMb2dpbldpZGdldElmcmFtZSc7XG5jb25zdCB3aWRnZXRJZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcblxuY2xhc3MgWEwge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnNvY2lhbFVybHMgPSB7fTtcbiAgICAgICAgdGhpcy5ldmVudFR5cGVzID0ge1xuICAgICAgICAgICAgTE9BRDogJ2xvYWQnLFxuICAgICAgICAgICAgQ0xPU0U6ICdjbG9zZScsXG4gICAgICAgICAgICBISURFX1BPUFVQOiAnaGlkZSBwb3B1cCcsXG4gICAgICAgICAgICBSRUdJU1RSQVRJT05fUkVRVUVTVDogJ3JlZ2lzdHJhdGlvbiByZXF1ZXN0JyxcbiAgICAgICAgICAgIEFVVEhFTlRJQ0FURUQ6ICdhdXRoZW50aWNhdGVkJ1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIG5lZWQgZm9yIGV4cG9ydCBwdXJwb3Nlc1xuICAgICAgICB0aGlzLlJPVVRFUyA9IFJPVVRFUztcblxuICAgICAgICB0aGlzLmRpc3BhdGNoZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgdGhpcy5vbkhpZGVFdmVudCA9IHRoaXMub25IaWRlRXZlbnQuYmluZCh0aGlzKTtcbiAgICB9XG5cbiAgICBpbml0KG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5jb25maWcgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX0NPTkZJRywgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuY29uZmlnLnBvcHVwQmFja2dyb3VuZENvbG9yID0gREVGQVVMVF9DT05GSUcucG9wdXBCYWNrZ3JvdW5kQ29sb3I7XG4gICAgICAgIHRoaXMuYXBpID0gbmV3IFhMQXBpKG9wdGlvbnMucHJvamVjdElkLCB0aGlzLmNvbmZpZy5hcGlVcmwpO1xuXG4gICAgICAgIGNvbnN0IGV2ZW50TWV0aG9kID0gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgPyAnYWRkRXZlbnRMaXN0ZW5lcicgOiAnYXR0YWNoRXZlbnQnO1xuICAgICAgICBjb25zdCBldmVudGVyID0gd2luZG93W2V2ZW50TWV0aG9kXTtcbiAgICAgICAgY29uc3QgbWVzc2FnZUV2ZW50ID0gZXZlbnRNZXRob2QgPT09ICdhdHRhY2hFdmVudCcgPyAnb25tZXNzYWdlJyA6ICdtZXNzYWdlJztcblxuICAgICAgICAvLyBMaXN0ZW4gdG8gbWVzc2FnZSBmcm9tIGNoaWxkIHdpbmRvd1xuICAgICAgICBldmVudGVyKG1lc3NhZ2VFdmVudCwgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBldmVudDtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZS5kYXRhID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIC8vIE9sZCBmb3JtYXQgLSBzdHJpbmcgb25seVxuICAgICAgICAgICAgICAgIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KHRoaXMuZXZlbnRUeXBlc1tlLmRhdGFdKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTmV3IGZvcm1hdCAtIHt0eXBlOiAnZXZlbnQnLCAuLi59XG4gICAgICAgICAgICAgICAgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQodGhpcy5ldmVudFR5cGVzW2UuZGF0YS50eXBlXSwge2RldGFpbDogZS5kYXRhfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoZXIuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLmV2ZW50VHlwZXMpLm1hcCgoZXZlbnRLZXkpID0+IHtcbiAgICAgICAgICAgIHRoaXMub24odGhpcy5ldmVudFR5cGVzW2V2ZW50S2V5XSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmKG9wdGlvbnMucG9wdXBCYWNrZ3JvdW5kQ29sb3IpIHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLnBvcHVwQmFja2dyb3VuZENvbG9yID0gb3B0aW9ucy5wb3B1cEJhY2tncm91bmRDb2xvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hlci5hZGRFdmVudExpc3RlbmVyKHRoaXMuZXZlbnRUeXBlcy5ISURFX1BPUFVQLCB0aGlzLm9uSGlkZUV2ZW50KTtcblxuICAgICAgICBpZiAoIXRoaXMuY29uZmlnLm9ubHlXaWRnZXRzKSB7XG5cbiAgICAgICAgICAgIGxldCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHBhcmFtcy5wcm9qZWN0SWQgPSBvcHRpb25zLnByb2plY3RJZDtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5yZWRpcmVjdFVybCkge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5yZWRpcmVjdF91cmwgPSB0aGlzLmNvbmZpZy5yZWRpcmVjdFVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5sb2dpblVybCkge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5sb2dpbl91cmwgPSB0aGlzLmNvbmZpZy5sb2dpblVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5jYWxsYmFja1VybCkge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5sb2dpbl91cmwgPSB0aGlzLmNvbmZpZy5jYWxsYmFja1VybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm1zIGxvZ2luXG4gICAgICogQHBhcmFtIHByb3BcbiAgICAgKiBAcGFyYW0gZXJyb3IgLSBjYWxsIGluIGNhc2UgZXJyb3JcbiAgICAgKiBAcGFyYW0gc3VjY2Vzc1xuICAgICAqL1xuICAgIGxvZ2luKHByb3AsIGVycm9yLCBzdWNjZXNzKSB7XG5cbiAgICAgICAgaWYgKCFwcm9wIHx8ICF0aGlzLnNvY2lhbFVybHMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBwcm9wc1xuICAgICAgICAgKiBhdXRoVHlwZTogc24tPHNvY2lhbCBuYW1lPiwgbG9naW4tcGFzcywgc21zXG4gICAgICAgICAqL1xuICAgICAgICBpZiAocHJvcC5hdXRoVHlwZSkge1xuICAgICAgICAgICAgaWYgKHByb3AuYXV0aFR5cGUuc3RhcnRzV2l0aCgnc24tJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzb2NpYWxVcmwgPSB0aGlzLnNvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICAgICAgaWYgKHNvY2lhbFVybCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB0aGlzLnNvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQXV0aCB0eXBlOiAnICsgcHJvcC5hdXRoVHlwZSArICcgZG9lc25cXCd0IGV4aXN0Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ2xvZ2luLXBhc3MnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGkubG9naW5QYXNzQXV0aChwcm9wLmxvZ2luLCBwcm9wLnBhc3MsIHByb3AucmVtZW1iZXJNZSwgdGhpcy5jb25maWcucmVkaXJlY3RVcmwsIChyZXMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcy5sb2dpbl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbmlzaEF1dGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXMubG9naW5fdXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzcyh7c3RhdHVzOiAnc3VjY2VzcycsIGZpbmlzaDogZmluaXNoQXV0aCwgcmVkaXJlY3RVcmw6IHJlcy5sb2dpbl91cmx9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluaXNoQXV0aCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IodGhpcy5jcmVhdGVFcnJvck9iamVjdCgnTG9naW4gb3IgcGFzcyBub3QgdmFsaWQnLCBJTkNPUlJFQ1RfTE9HSU5fT1JfUEFTU1dPUkRfRVJST1JfQ09ERSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wLmF1dGhUeXBlID09ICdzbXMnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNtc0F1dGhTdGVwID09ICdwaG9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcGkuc21zQXV0aChwcm9wLnBob25lTnVtYmVyLCBudWxsLCBudWxsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNtc0F1dGhTdGVwID09ICdjb2RlJykge1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmtub3duIGF1dGggdHlwZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY3JlYXRlRXJyb3JPYmplY3QobWVzc2FnZSwgY29kZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIGNvZGU6IGNvZGUgfHwgLTFcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgZ2V0UHJvamVjdElkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcucHJvamVjdElkO1xuICAgIH07XG5cbiAgICBnZXRSZWRpcmVjdFVSTCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsO1xuICAgIH07XG5cbiAgICBnZXRUaGVtZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLnRoZW1lO1xuICAgIH1cblxuICAgIGdldENhbGxiYWNrVXJsKCkge1xuICAgICAgICBpZiAodGhpcy5jb25maWcuY2FsbGJhY2tVcmwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy5jYWxsYmFja1VybDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5sb2dpblVybCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLmxvZ2luVXJsO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLmV4dGVybmFsV2luZG93KSB7XG4gICAgICAgICAgICByZXR1cm4gREVGQVVMVF9DT05GSUcuZGVmYXVsdExvZ2luVXJsO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGdldElmcmFtZVNyYyhvcHRpb25zID0ge30pIHtcbiAgICAgICAgbGV0IHdpZGdldEJhc2VVcmwgPSBvcHRpb25zLndpZGdldEJhc2VVcmwgfHwgdGhpcy5jb25maWcud2lkZ2V0QmFzZVVybDtcblxuICAgICAgICBpZiAod2lkZ2V0QmFzZVVybC5zdWJzdHIoLTEpICE9PSAnLycpIHtcbiAgICAgICAgICAgIHdpZGdldEJhc2VVcmwgKz0gJy8nO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgcm91dGUgPSBvcHRpb25zLnJvdXRlIHx8IHRoaXMuY29uZmlnLnJvdXRlO1xuXG4gICAgICAgIGxldCBzcmMgPSB3aWRnZXRCYXNlVXJsICsgcm91dGUgKyAnP3dpZGdldF9zZGtfdmVyc2lvbj0nICsgdmVyc2lvbiArICcmcHJvamVjdElkPScgKyB0aGlzLmdldFByb2plY3RJZCgpO1xuXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5sb2NhbGUpIHtcbiAgICAgICAgICAgIHNyYyA9IHNyYyArICcmbG9jYWxlPScgKyB0aGlzLmNvbmZpZy5sb2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmZpZWxkcykge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZmaWVsZHM9JyArIHRoaXMuY29uZmlnLmZpZWxkcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZWRpcmVjdFVybCA9IHRoaXMuZ2V0UmVkaXJlY3RVUkwoKTtcbiAgICAgICAgaWYgKHJlZGlyZWN0VXJsKSB7XG4gICAgICAgICAgICBzcmMgPSBzcmMgKyAnJnJlZGlyZWN0VXJsPScgKyBlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmwpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2FsbGJhY2tVcmwgPSB0aGlzLmdldENhbGxiYWNrVXJsKCk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrVXJsKSB7XG4gICAgICAgICAgICBzcmMgPSBzcmMgKyAnJmxvZ2luX3VybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGNhbGxiYWNrVXJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRoZW1lID0gdGhpcy5nZXRUaGVtZSgpO1xuICAgICAgICBpZiAodGhlbWUpIHtcbiAgICAgICAgICAgIHNyYyA9IHNyYyArICcmdGhlbWU9JyArIGVuY29kZVVSSUNvbXBvbmVudCh0aGVtZSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7ZXh0ZXJuYWxXaW5kb3d9ID0gdGhpcy5jb25maWc7XG4gICAgICAgIGlmIChleHRlcm5hbFdpbmRvdykge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZleHRlcm5hbF93aW5kb3c9JyArIGVuY29kZVVSSUNvbXBvbmVudChleHRlcm5hbFdpbmRvdyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB3aWRnZXRWZXJzaW9uID0gdGhpcy5jb25maWcud2lkZ2V0VmVyc2lvbjtcbiAgICAgICAgaWYgKHdpZGdldFZlcnNpb24pIHtcbiAgICAgICAgICAgIHNyYyArPSAnJnZlcnNpb249JyArIGVuY29kZVVSSUNvbXBvbmVudCh3aWRnZXRWZXJzaW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbXBhY3QgPSB0aGlzLmNvbmZpZy5jb21wYWN0O1xuICAgICAgICBpZiAoY29tcGFjdCkge1xuICAgICAgICAgICAgc3JjICs9ICcmY29tcGFjdD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbXBhY3QpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNyYztcbiAgICB9XG5cbiAgICBBdXRoV2lkZ2V0KGVsZW1lbnRJZCwgb3B0aW9ucykge1xuICAgICAgICBpZiAodGhpcy5hcGkpIHtcbiAgICAgICAgICAgIGlmICghZWxlbWVudElkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignTm8gZGl2IG5hbWUhJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gYCR7b3B0aW9ucy53aWR0aCB8fCA0MDB9cHhgO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IGAke29wdGlvbnMuaGVpZ2h0IHx8IDU1MH1weGA7XG5cbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUNoaWxkKHByZWxvYWRlcik7XG4gICAgICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdsb2FkJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLmZyYW1lQm9yZGVyID0gJzAnO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zcmMgPSB0aGlzLmdldElmcmFtZVNyYyhvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuaWQgPSBJRlJBTUVfSUQ7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBwcmVsb2FkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgICAgICAgICAgICAgIHByZWxvYWRlci5pbm5lckhUTUwgPSB0aGlzLmNvbmZpZy5wcmVsb2FkZXI7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbWVudElkKTtcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnN0eWxlLndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZENoaWxkKHByZWxvYWRlcik7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQod2lkZ2V0SWZyYW1lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFbGVtZW50IFxcXCInICsgZWxlbWVudElkICsgJ1xcXCIgbm90IGZvdW5kIScpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignUGxlYXNlIHJ1biBYTC5pbml0KCkgZmlyc3QnKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBvbkNsb3NlRXZlbnQoKSB7XG4gICAgICAgIHdpZGdldElmcmFtZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHdpZGdldElmcmFtZSk7XG4gICAgfVxuXG4gICAgX2hpZGUoKSB7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5wb3NpdGlvbiA9ICcnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuekluZGV4ID0gJyc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5sZWZ0ID0gJyc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS50b3AgPSAnJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnJztcbiAgICB9XG5cbiAgICBvbkhpZGVFdmVudCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmluRnVsbHNjcmVlbk1vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuX2hpZGUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGxpbmsgZXZlbnQgd2l0aCBoYW5kbGVyXG4gICAgICogQHBhcmFtIGV2ZW50XG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKi9cblxuICAgIG9uKGV2ZW50LCBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyIHx8IGZ1bmN0aW9uKCkge307XG5cbiAgICAgICAgaWYgKGV2ZW50ID09PSB0aGlzLmV2ZW50VHlwZXMuQ0xPU0UpIHtcbiAgICAgICAgICAgIGlmICghaGFuZGxlcikge1xuICAgICAgICAgICAgICAgIGhhbmRsZXIgPSB0aGlzLm9uQ2xvc2VFdmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCB0aGlzLm9uQ2xvc2VFdmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmRpc3BhdGNoZXIuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgKGUpID0+IGhhbmRsZXIoZS5kZXRhaWwpKTtcbiAgICB9O1xuXG4gICAgX3Nob3coKSB7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS56SW5kZXggPSB0aGlzLmNvbmZpZy5pZnJhbWVaSW5kZXg7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5sZWZ0ID0gJzAnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUudG9wID0gJzAnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSB0aGlzLmNvbmZpZy5wb3B1cEJhY2tncm91bmRDb2xvcjtcbiAgICAgICAgdGhpcy5jb25maWcuaW5GdWxsc2NyZWVuTW9kZSA9IHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogb3BlbiBmdWxsc3JlZW4gcG9wdXAgZm9yIHdpZGdldFxuICAgICAqL1xuXG4gICAgc2hvdygpIHtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5nZXRFbGVtZW50QnlJZChJRlJBTUVfSUQpKSB7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3JjID0gdGhpcy5nZXRJZnJhbWVTcmMoKTtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5pZCA9IElGUkFNRV9JRDtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5mcmFtZUJvcmRlciA9ICcwJztcblxuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2xvYWQnKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpc3BhdGNoZXIuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5fc2hvdygpO1xuXG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHdpZGdldElmcmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zaG93KCk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5jb25zdCByZXN1bHQgPSBuZXcgWEwoKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXN1bHQ7Il19
