(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XL = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports={
  "version": "2.1.1",
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYS5ib3J0bmlrb3YveHNvbGxhLWxvZ2luLWpzLXNkay9wYWNrYWdlLmpzb24iLCJzcmMvc3VwcG9ydHMuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLE1BQU0sQ0FBQyxPQUFPLENBQUM7RUFDYix5REFBOEI7RUFDOUIsU0FBUyxFQUFFLE9BQU87RUFDbEIsNkNBQWtCO0VBQ2xCLGlEQUFzQjtFQUN0Qjs7OztNQUlFO0VBQ0Ysd0NBQWE7RUFDYiw0Q0FBaUI7RUFDakIsOENBQW1CO0VBQ25COzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztNQTZCRTtFQUNGOztNQUVDO0NBQ0Y7Ozs7O0FDOUNEOzs7QUFHQSxJQUFJLENBQUMsT0FBTyxTQUFQLENBQWlCLFVBQXRCLEVBQWtDO0FBQzlCLFdBQU8sU0FBUCxDQUFpQixVQUFqQixHQUE4QixVQUFTLFlBQVQsRUFBdUIsUUFBdkIsRUFBaUM7QUFDM0QsbUJBQVcsWUFBWSxDQUF2QjtBQUNBLGVBQU8sS0FBSyxPQUFMLENBQWEsWUFBYixFQUEyQixRQUEzQixNQUF5QyxRQUFoRDtBQUNILEtBSEQ7QUFJSDs7QUFFRCxJQUFLLE9BQU8sT0FBTyxXQUFkLEtBQThCLFVBQW5DLEVBQWdEO0FBQUEsUUFDbkMsV0FEbUMsR0FDNUMsU0FBUyxXQUFULENBQXFCLEtBQXJCLEVBQTRCLE1BQTVCLEVBQW9DO0FBQ2hDLGlCQUFTLFVBQVUsRUFBQyxTQUFTLEtBQVYsRUFBaUIsWUFBWSxLQUE3QixFQUFvQyxRQUFRLFNBQTVDLEVBQW5CO0FBQ0EsWUFBSSxNQUFNLFNBQVMsV0FBVCxDQUFxQixhQUFyQixDQUFWO0FBQ0EsWUFBSSxlQUFKLENBQW9CLEtBQXBCLEVBQTJCLE9BQU8sT0FBbEMsRUFBMkMsT0FBTyxVQUFsRCxFQUE4RCxPQUFPLE1BQXJFO0FBQ0EsZUFB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QU0sU0FBUyxJQUFJLEVBQUosRUFBZjs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsTUFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwibmFtZVwiOiBcInhzb2xsYS1sb2dpbi1qcy1zZGtcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMi4xLjFcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIlwiLFxuICBcIm1haW5cIjogXCJzcmMvbWFpbi5qc1wiLFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiYnVpbGRcIjogXCJndWxwIGJ1aWxkXCIsXG4gICAgXCJob3N0XCI6IFwic3RhdGljLXNlcnZlciAuIC1wIDgwODRcIixcbiAgICBcInRlc3RcIjogXCJqZXN0XCJcbiAgfSxcbiAgXCJhdXRob3JcIjogXCJcIixcbiAgXCJsaWNlbnNlXCI6IFwiTUlUXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHt9LFxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAYmFiZWwvY29yZVwiOiBcIl43LjQuNVwiLFxuICAgIFwiQGJhYmVsL3ByZXNldC1lbnZcIjogXCJeNy40LjVcIixcbiAgICBcImJhYmVsLWplc3RcIjogXCJeMjQuOC4wXCIsXG4gICAgXCJiYWJlbC1wbHVnaW4tdHJhbnNmb3JtLW9iamVjdC1hc3NpZ25cIjogXCJeNi4yMi4wXCIsXG4gICAgXCJiYWJlbC1wcmVzZXQtZXMyMDE1XCI6IFwiXjYuMTguMFwiLFxuICAgIFwiYmFiZWxpZnlcIjogXCJeNy4zLjBcIixcbiAgICBcImJvd2VyXCI6IFwiXjEuOC44XCIsXG4gICAgXCJicmZzXCI6IFwiXjIuMC4xXCIsXG4gICAgXCJicm93c2VyLXN5bmNcIjogXCJeMi4yNi43XCIsXG4gICAgXCJicm93c2VyaWZ5XCI6IFwiXjE2LjIuM1wiLFxuICAgIFwiYnJvd3NlcmlmeS1pc3RhbmJ1bFwiOiBcIl4yLjAuMFwiLFxuICAgIFwiYnJvd3NlcmlmeS1zaGltXCI6IFwiXjMuOC4xMlwiLFxuICAgIFwiY29tbW9uLXNoYWtlaWZ5XCI6IFwiXjAuNi4wXCIsXG4gICAgXCJndWxwXCI6IFwiXjQuMC4yXCIsXG4gICAgXCJndWxwLWlmXCI6IFwiXjIuMC4yXCIsXG4gICAgXCJndWxwLXJlbmFtZVwiOiBcIjEuMi4wXCIsXG4gICAgXCJndWxwLXNvdXJjZW1hcHNcIjogXCJeMi42LjVcIixcbiAgICBcImd1bHAtc3RyaXAtY29tbWVudHNcIjogXCJeMi41LjJcIixcbiAgICBcImd1bHAtdWdsaWZ5XCI6IFwiXjMuMC4xXCIsXG4gICAgXCJndWxwLXV0aWxcIjogXCIzLjAuNlwiLFxuICAgIFwiamFzbWluZVwiOiBcIl4yLjQuMVwiLFxuICAgIFwiamVzdFwiOiBcIl4yNC44LjBcIixcbiAgICBcImpzZG9tXCI6IFwiXjE1LjEuMVwiLFxuICAgIFwic3RhdGljLXNlcnZlclwiOiBcIjIuMi4xXCIsXG4gICAgXCJ1cmwtcGFyc2VcIjogXCJeMS40LjdcIixcbiAgICBcInZpbnlsLWJ1ZmZlclwiOiBcIl4xLjAuMVwiLFxuICAgIFwidmlueWwtc291cmNlLXN0cmVhbVwiOiBcIl4yLjAuMFwiLFxuICAgIFwid2F0Y2hpZnlcIjogXCJeMy4xMS4xXCJcbiAgfSxcbiAgXCJicm93c2VyaWZ5LXNoaW1cIjoge1xuICAgIFwiZXh0ZXJuYWxcIjogXCJnbG9iYWw6RXh0ZXJuYWxcIlxuICB9XG59XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAwNy4xMS4xNi5cbiAqL1xuaWYgKCFTdHJpbmcucHJvdG90eXBlLnN0YXJ0c1dpdGgpIHtcbiAgICBTdHJpbmcucHJvdG90eXBlLnN0YXJ0c1dpdGggPSBmdW5jdGlvbihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSB7XG4gICAgICAgIHBvc2l0aW9uID0gcG9zaXRpb24gfHwgMDtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXhPZihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSA9PT0gcG9zaXRpb247XG4gICAgfTtcbn1cblxuaWYgKCB0eXBlb2Ygd2luZG93LkN1c3RvbUV2ZW50ICE9PSBcImZ1bmN0aW9uXCIgKSB7XG4gICAgZnVuY3Rpb24gQ3VzdG9tRXZlbnQoZXZlbnQsIHBhcmFtcykge1xuICAgICAgICBwYXJhbXMgPSBwYXJhbXMgfHwge2J1YmJsZXM6IGZhbHNlLCBjYW5jZWxhYmxlOiBmYWxzZSwgZGV0YWlsOiB1bmRlZmluZWR9O1xuICAgICAgICB2YXIgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0N1c3RvbUV2ZW50Jyk7XG4gICAgICAgIGV2dC5pbml0Q3VzdG9tRXZlbnQoZXZlbnQsIHBhcmFtcy5idWJibGVzLCBwYXJhbXMuY2FuY2VsYWJsZSwgcGFyYW1zLmRldGFpbCk7XG4gICAgICAgIHJldHVybiBldnQ7XG4gICAgfVxuXG4gICAgQ3VzdG9tRXZlbnQucHJvdG90eXBlID0gd2luZG93LkV2ZW50LnByb3RvdHlwZTtcblxuICAgIHdpbmRvdy5DdXN0b21FdmVudCA9IEN1c3RvbUV2ZW50O1xufSIsIi8qKlxuICogQ3JlYXRlZCBieSBhLmtvcm90YWV2IG9uIDI0LjA2LjE2LlxuICovXG4vKipcbiAqIEltcGVsZW1lbnRzIFhzb2xsYSBMb2dpbiBBcGlcbiAqIEBwYXJhbSBwcm9qZWN0SWQgLSBwcm9qZWN0J3MgdW5pcXVlIGlkZW50aWZpZXJcbiAqIEBwYXJhbSBiYXNlVXJsIC0gYXBpIGVuZHBvaW50XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuXG52YXIgWExBcGkgPSBmdW5jdGlvbiAocHJvamVjdElkLCBiYXNlVXJsKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuYmFzZVVybCA9IGJhc2VVcmwgfHwgJy8vbG9naW4ueHNvbGxhLmNvbS9hcGkvJztcblxuICAgIHRoaXMucHJvamVjdElkID0gcHJvamVjdElkO1xuXG4gICAgdGhpcy5tYWtlQXBpQ2FsbCA9IGZ1bmN0aW9uIChwYXJhbXMsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgICAgIHZhciByID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICAgICAgci5vcGVuKHBhcmFtcy5tZXRob2QsIHNlbGYuYmFzZVVybCArIHBhcmFtcy5lbmRwb2ludCwgdHJ1ZSk7XG4gICAgICAgIHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHIucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzKEpTT04ucGFyc2Uoci5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoci5yZXNwb25zZVRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKEpTT04ucGFyc2Uoci5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKHtlcnJvcjoge21lc3NhZ2U6ICdOZXR3b3JraW5nIGVycm9yJywgY29kZTogci5zdGF0dXN9fSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGlmIChwYXJhbXMubWV0aG9kID09ICdQT1NUJykge1xuICAgICAgICAgICAgci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04XCIpO1xuICAgICAgICAgICAgci5zZW5kKHBhcmFtcy5wb3N0Qm9keSk7XG4gICAgICAgIH0gZWxzZSBpZiAocGFyYW1zLm1ldGhvZCA9PSAnR0VUJykge1xuICAgICAgICAgICAgci5zZW5kKHBhcmFtcy5nZXRBcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgfTtcbn07XG4vKipcbiAqIEdldCBhbGwgYXZpYWxhYmxlIHNvY2lhbCBtZXRob2RzIGF1dGggdXJsXG4gKiBAcGFyYW0gc3VjY2VzcyAtIHN1Y2Nlc3MgY2FsbGJhY2tcbiAqIEBwYXJhbSBlcnJvciAtIGVycm9yIGNhbGxiYWNrXG4gKiBAcGFyYW0gZ2V0QXJndW1lbnRzIC0gYWRkaXRpb25hbCBwYXJhbXMgdG8gc2VuZCB3aXRoIHJlcXVlc3RcbiAqL1xuWExBcGkucHJvdG90eXBlLmdldFNvY2lhbHNVUkxzID0gZnVuY3Rpb24gKHN1Y2Nlc3MsIGVycm9yLCBnZXRBcmd1bWVudHMpIHtcbiAgICB2YXIgc3RyID0gXCJcIjtcbiAgICBmb3IgKHZhciBrZXkgaW4gZ2V0QXJndW1lbnRzKSB7XG4gICAgICAgIGlmIChzdHIgIT0gXCJcIikge1xuICAgICAgICAgICAgc3RyICs9IFwiJlwiO1xuICAgICAgICB9XG4gICAgICAgIHN0ciArPSBrZXkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChnZXRBcmd1bWVudHNba2V5XSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ0dFVCcsIGVuZHBvaW50OiAnc29jaWFsL2xvZ2luX3VybHM/JyArIHN0ciwgZ2V0QXJndW1lbnRzOiBudWxsfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxuWExBcGkucHJvdG90eXBlLmxvZ2luUGFzc0F1dGggPSBmdW5jdGlvbiAobG9naW4sIHBhc3MsIHJlbWVtYmVyTWUsIHJlZGlyZWN0VXJsLCBzdWNjZXNzLCBlcnJvcikge1xuICAgIHZhciBib2R5ID0ge1xuICAgICAgICB1c2VybmFtZTogbG9naW4sXG4gICAgICAgIHBhc3N3b3JkOiBwYXNzLFxuICAgICAgICByZW1lbWJlcl9tZTogcmVtZW1iZXJNZVxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ1BPU1QnLCBlbmRwb2ludDogJ3Byb3h5L2xvZ2luP3Byb2plY3RJZD0nK3RoaXMucHJvamVjdElkICsgJyZyZWRpcmVjdF91cmw9JyArIGVuY29kZVVSSUNvbXBvbmVudChyZWRpcmVjdFVybCksIHBvc3RCb2R5OiBKU09OLnN0cmluZ2lmeShib2R5KX0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cblhMQXBpLnByb3RvdHlwZS5zbXNBdXRoID0gZnVuY3Rpb24gKHBob25lTnVtYmVyLCBzdWNjZXNzLCBlcnJvcikge1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ3NtcycsIGdldEFyZ3VtZW50czogJ3Bob25lTnVtYmVyPScgKyBwaG9uZU51bWJlcn0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gWExBcGk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xucmVxdWlyZSgnLi9zdXBwb3J0cycpO1xuY29uc3QgdmVyc2lvbiA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpLnZlcnNpb247XG5cbmltcG9ydCBYTEFwaSBmcm9tICcuL3hsYXBpJztcbi8qKlxuICogQ3JlYXRlIGFuIGBBdXRoMGAgaW5zdGFuY2Ugd2l0aCBgb3B0aW9uc2BcbiAqXG4gKiBAY2xhc3MgWExcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5cbmNvbnN0IFJPVVRFUyA9IHtcbiAgICBMT0dJTjogJycsXG4gICAgUkVHSVNUUkFUSU9OOiAncmVnaXN0cmF0aW9uJyxcbiAgICBSRUNPVkVSX1BBU1NXT1JEOiAncmVzZXQtcGFzc3dvcmQnLFxuICAgIEFMTF9TT0NJQUxTOiAnb3RoZXInLFxuICAgIFNPQ0lBTFNfTE9HSU46ICdzb2NpYWxzJyxcbiAgICBVU0VSTkFNRV9MT0dJTjogJ3VzZXJuYW1lLWxvZ2luJyxcbn07XG5cbmNvbnN0IERFRkFVTFRfQ09ORklHID0ge1xuICAgIGVycm9ySGFuZGxlcjogZnVuY3Rpb24gKGEpIHtcbiAgICB9LFxuICAgIGxvZ2luUGFzc1ZhbGlkYXRvcjogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICBpc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQ6IGZhbHNlLFxuICAgIGFwaVVybDogJ2h0dHBzOi8vbG9naW4ueHNvbGxhLmNvbS9hcGkvJyxcbiAgICBtYXhYTENsaWNrRGVwdGg6IDIwLFxuICAgIG9ubHlXaWRnZXRzOiBmYWxzZSxcbiAgICBkZWZhdWx0TG9naW5Vcmw6ICdodHRwczovL3hsLXdpZGdldC54c29sbGEuY29tL2F1dGguaHRtbCcsXG4gICAgcG9wdXBCYWNrZ3JvdW5kQ29sb3I6ICdyZ2IoMTg3LCAxODcsIDE4NyknLFxuICAgIGlmcmFtZVpJbmRleDogMTAwMDAwMCxcbiAgICB0aGVtZTogJ2FwcC5kZWZhdWx0LmNzcycsXG4gICAgcHJlbG9hZGVyOiAnPGRpdj48L2Rpdj4nLFxuICAgIHdpZGdldEJhc2VVcmw6ICdodHRwczovL3hsLXdpZGdldC54c29sbGEuY29tLycsXG4gICAgcm91dGU6IFJPVVRFUy5MT0dJTixcbiAgICBjb21wYWN0OiBmYWxzZSxcbiAgICBpbkZ1bGxzY3JlZW5Nb2RlOiBmYWxzZVxufTtcblxuY29uc3QgSU5WQUxJRF9MT0dJTl9FUlJPUl9DT0RFID0gMTtcbmNvbnN0IElOQ09SUkVDVF9MT0dJTl9PUl9QQVNTV09SRF9FUlJPUl9DT0RFID0gMjtcblxuY29uc3QgSUZSQU1FX0lEID0gJ1hzb2xsYUxvZ2luV2lkZ2V0SWZyYW1lJztcbmNvbnN0IHdpZGdldElmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuXG5jbGFzcyBYTCB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuc29jaWFsVXJscyA9IHt9O1xuICAgICAgICB0aGlzLmV2ZW50VHlwZXMgPSB7XG4gICAgICAgICAgICBMT0FEOiAnbG9hZCcsXG4gICAgICAgICAgICBDTE9TRTogJ2Nsb3NlJyxcbiAgICAgICAgICAgIEhJREVfUE9QVVA6ICdoaWRlIHBvcHVwJyxcbiAgICAgICAgICAgIFJFR0lTVFJBVElPTl9SRVFVRVNUOiAncmVnaXN0cmF0aW9uIHJlcXVlc3QnLFxuICAgICAgICAgICAgQVVUSEVOVElDQVRFRDogJ2F1dGhlbnRpY2F0ZWQnXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gbmVlZCBmb3IgZXhwb3J0IHB1cnBvc2VzXG4gICAgICAgIHRoaXMuUk9VVEVTID0gUk9VVEVTO1xuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0aGlzLm9uSGlkZUV2ZW50ID0gdGhpcy5vbkhpZGVFdmVudC5iaW5kKHRoaXMpO1xuICAgIH1cblxuICAgIGluaXQob3B0aW9ucykge1xuICAgICAgICB0aGlzLmNvbmZpZyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfQ09ORklHLCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5jb25maWcucG9wdXBCYWNrZ3JvdW5kQ29sb3IgPSBERUZBVUxUX0NPTkZJRy5wb3B1cEJhY2tncm91bmRDb2xvcjtcbiAgICAgICAgdGhpcy5hcGkgPSBuZXcgWExBcGkob3B0aW9ucy5wcm9qZWN0SWQsIHRoaXMuY29uZmlnLmFwaVVybCk7XG5cbiAgICAgICAgY29uc3QgZXZlbnRNZXRob2QgPSB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciA/ICdhZGRFdmVudExpc3RlbmVyJyA6ICdhdHRhY2hFdmVudCc7XG4gICAgICAgIGNvbnN0IGV2ZW50ZXIgPSB3aW5kb3dbZXZlbnRNZXRob2RdO1xuICAgICAgICBjb25zdCBtZXNzYWdlRXZlbnQgPSBldmVudE1ldGhvZCA9PT0gJ2F0dGFjaEV2ZW50JyA/ICdvbm1lc3NhZ2UnIDogJ21lc3NhZ2UnO1xuXG4gICAgICAgIC8vIExpc3RlbiB0byBtZXNzYWdlIGZyb20gY2hpbGQgd2luZG93XG4gICAgICAgIGV2ZW50ZXIobWVzc2FnZUV2ZW50LCAoZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGV2ZW50O1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBlLmRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgLy8gT2xkIGZvcm1hdCAtIHN0cmluZyBvbmx5XG4gICAgICAgICAgICAgICAgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQodGhpcy5ldmVudFR5cGVzW2UuZGF0YV0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBOZXcgZm9ybWF0IC0ge3R5cGU6ICdldmVudCcsIC4uLn1cbiAgICAgICAgICAgICAgICBldmVudCA9IG5ldyBDdXN0b21FdmVudCh0aGlzLmV2ZW50VHlwZXNbZS5kYXRhLnR5cGVdLCB7ZGV0YWlsOiBlLmRhdGF9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfSwgZmFsc2UpO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuZXZlbnRUeXBlcykubWFwKChldmVudEtleSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vbih0aGlzLmV2ZW50VHlwZXNbZXZlbnRLZXldKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYob3B0aW9ucy5wb3B1cEJhY2tncm91bmRDb2xvcikge1xuICAgICAgICAgICAgdGhpcy5jb25maWcucG9wdXBCYWNrZ3JvdW5kQ29sb3IgPSBvcHRpb25zLnBvcHVwQmFja2dyb3VuZENvbG9yO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmFkZEV2ZW50TGlzdGVuZXIodGhpcy5ldmVudFR5cGVzLkhJREVfUE9QVVAsIHRoaXMub25IaWRlRXZlbnQpO1xuXG4gICAgICAgIGlmICghdGhpcy5jb25maWcub25seVdpZGdldHMpIHtcblxuICAgICAgICAgICAgbGV0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zLnByb2plY3RJZCA9IG9wdGlvbnMucHJvamVjdElkO1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnJlZGlyZWN0X3VybCA9IHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmxvZ2luVXJsKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmxvZ2luX3VybCA9IHRoaXMuY29uZmlnLmxvZ2luVXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmNhbGxiYWNrVXJsKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmxvZ2luX3VybCA9IHRoaXMuY29uZmlnLmNhbGxiYWNrVXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybXMgbG9naW5cbiAgICAgKiBAcGFyYW0gcHJvcFxuICAgICAqIEBwYXJhbSBlcnJvciAtIGNhbGwgaW4gY2FzZSBlcnJvclxuICAgICAqIEBwYXJhbSBzdWNjZXNzXG4gICAgICovXG4gICAgbG9naW4ocHJvcCwgZXJyb3IsIHN1Y2Nlc3MpIHtcblxuICAgICAgICBpZiAoIXByb3AgfHwgIXRoaXMuc29jaWFsVXJscykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHByb3BzXG4gICAgICAgICAqIGF1dGhUeXBlOiBzbi08c29jaWFsIG5hbWU+LCBsb2dpbi1wYXNzLCBzbXNcbiAgICAgICAgICovXG4gICAgICAgIGlmIChwcm9wLmF1dGhUeXBlKSB7XG4gICAgICAgICAgICBpZiAocHJvcC5hdXRoVHlwZS5zdGFydHNXaXRoKCdzbi0nKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNvY2lhbFVybCA9IHRoaXMuc29jaWFsVXJsc1twcm9wLmF1dGhUeXBlXTtcbiAgICAgICAgICAgICAgICBpZiAoc29jaWFsVXJsICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHRoaXMuc29jaWFsVXJsc1twcm9wLmF1dGhUeXBlXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBdXRoIHR5cGU6ICcgKyBwcm9wLmF1dGhUeXBlICsgJyBkb2VzblxcJ3QgZXhpc3QnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnbG9naW4tcGFzcycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaS5sb2dpblBhc3NBdXRoKHByb3AubG9naW4sIHByb3AucGFzcywgcHJvcC5yZW1lbWJlck1lLCB0aGlzLmNvbmZpZy5yZWRpcmVjdFVybCwgKHJlcykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzLmxvZ2luX3VybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluaXNoQXV0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlcy5sb2dpbl91cmw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzKHtzdGF0dXM6ICdzdWNjZXNzJywgZmluaXNoOiBmaW5pc2hBdXRoLCByZWRpcmVjdFVybDogcmVzLmxvZ2luX3VybH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5pc2hBdXRoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcih0aGlzLmNyZWF0ZUVycm9yT2JqZWN0KCdMb2dpbiBvciBwYXNzIG5vdCB2YWxpZCcsIElOQ09SUkVDVF9MT0dJTl9PUl9QQVNTV09SRF9FUlJPUl9DT0RFKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ3NtcycpIHtcbiAgICAgICAgICAgICAgICBpZiAoc21zQXV0aFN0ZXAgPT0gJ3Bob25lJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwaS5zbXNBdXRoKHByb3AucGhvbmVOdW1iZXIsIG51bGwsIG51bGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc21zQXV0aFN0ZXAgPT0gJ2NvZGUnKSB7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gYXV0aCB0eXBlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjcmVhdGVFcnJvck9iamVjdChtZXNzYWdlLCBjb2RlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgY29kZTogY29kZSB8fCAtMVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBnZXRQcm9qZWN0SWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy5wcm9qZWN0SWQ7XG4gICAgfTtcblxuICAgIGdldFJlZGlyZWN0VVJMKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcucmVkaXJlY3RVcmw7XG4gICAgfTtcblxuICAgIGdldFRoZW1lKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcudGhlbWU7XG4gICAgfVxuXG4gICAgZ2V0Q2FsbGJhY2tVcmwoKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5jYWxsYmFja1VybCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLmNhbGxiYWNrVXJsO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLmxvZ2luVXJsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWcubG9naW5Vcmw7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcuZXh0ZXJuYWxXaW5kb3cpIHtcbiAgICAgICAgICAgIHJldHVybiBERUZBVUxUX0NPTkZJRy5kZWZhdWx0TG9naW5Vcmw7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZ2V0SWZyYW1lU3JjKG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBsZXQgd2lkZ2V0QmFzZVVybCA9IG9wdGlvbnMud2lkZ2V0QmFzZVVybCB8fCB0aGlzLmNvbmZpZy53aWRnZXRCYXNlVXJsO1xuXG4gICAgICAgIGlmICh3aWRnZXRCYXNlVXJsLnN1YnN0cigtMSkgIT09ICcvJykge1xuICAgICAgICAgICAgd2lkZ2V0QmFzZVVybCArPSAnLyc7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByb3V0ZSA9IG9wdGlvbnMucm91dGUgfHwgdGhpcy5jb25maWcucm91dGU7XG5cbiAgICAgICAgbGV0IHNyYyA9IHdpZGdldEJhc2VVcmwgKyByb3V0ZSArICc/d2lkZ2V0X3Nka192ZXJzaW9uPScgKyB2ZXJzaW9uICsgJyZwcm9qZWN0SWQ9JyArIHRoaXMuZ2V0UHJvamVjdElkKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmxvY2FsZSkge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZsb2NhbGU9JyArIHRoaXMuY29uZmlnLmxvY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5jb25maWcuZmllbGRzKSB7XG4gICAgICAgICAgICBzcmMgPSBzcmMgKyAnJmZpZWxkcz0nICsgdGhpcy5jb25maWcuZmllbGRzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlZGlyZWN0VXJsID0gdGhpcy5nZXRSZWRpcmVjdFVSTCgpO1xuICAgICAgICBpZiAocmVkaXJlY3RVcmwpIHtcbiAgICAgICAgICAgIHNyYyA9IHNyYyArICcmcmVkaXJlY3RVcmw9JyArIGVuY29kZVVSSUNvbXBvbmVudChyZWRpcmVjdFVybCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjYWxsYmFja1VybCA9IHRoaXMuZ2V0Q2FsbGJhY2tVcmwoKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2tVcmwpIHtcbiAgICAgICAgICAgIHNyYyA9IHNyYyArICcmbG9naW5fdXJsPScgKyBlbmNvZGVVUklDb21wb25lbnQoY2FsbGJhY2tVcmwpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdGhlbWUgPSB0aGlzLmdldFRoZW1lKCk7XG4gICAgICAgIGlmICh0aGVtZSkge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZ0aGVtZT0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHRoZW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHtleHRlcm5hbFdpbmRvd30gPSB0aGlzLmNvbmZpZztcbiAgICAgICAgaWYgKGV4dGVybmFsV2luZG93KSB7XG4gICAgICAgICAgICBzcmMgPSBzcmMgKyAnJmV4dGVybmFsX3dpbmRvdz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGV4dGVybmFsV2luZG93KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHdpZGdldFZlcnNpb24gPSB0aGlzLmNvbmZpZy53aWRnZXRWZXJzaW9uO1xuICAgICAgICBpZiAod2lkZ2V0VmVyc2lvbikge1xuICAgICAgICAgICAgc3JjICs9ICcmdmVyc2lvbj0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHdpZGdldFZlcnNpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29tcGFjdCA9IHRoaXMuY29uZmlnLmNvbXBhY3Q7XG4gICAgICAgIGlmIChjb21wYWN0KSB7XG4gICAgICAgICAgICBzcmMgKz0gJyZjb21wYWN0PScgKyBlbmNvZGVVUklDb21wb25lbnQoY29tcGFjdCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3JjO1xuICAgIH1cblxuICAgIEF1dGhXaWRnZXQoZWxlbWVudElkLCBvcHRpb25zKSB7XG4gICAgICAgIGlmICh0aGlzLmFwaSkge1xuICAgICAgICAgICAgaWYgKCFlbGVtZW50SWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdObyBkaXYgbmFtZSEnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBgJHtvcHRpb25zLndpZHRoIHx8IDQwMH1weGA7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gYCR7b3B0aW9ucy5oZWlnaHQgfHwgNTUwfXB4YDtcblxuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2hpbGQocHJlbG9hZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2xvYWQnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuZnJhbWVCb3JkZXIgPSAnMCc7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnNyYyA9IHRoaXMuZ2V0SWZyYW1lU3JjKG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5pZCA9IElGUkFNRV9JRDtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHByZWxvYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICAgICAgICAgICAgcHJlbG9hZGVyLmlubmVySFRNTCA9IHRoaXMuY29uZmlnLnByZWxvYWRlcjtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtZW50SWQpO1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zdHlsZS5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQocHJlbG9hZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZCh3aWRnZXRJZnJhbWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0VsZW1lbnQgXFxcIicgKyBlbGVtZW50SWQgKyAnXFxcIiBub3QgZm91bmQhJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdQbGVhc2UgcnVuIFhMLmluaXQoKSBmaXJzdCcpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG9uQ2xvc2VFdmVudCgpIHtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQod2lkZ2V0SWZyYW1lKTtcbiAgICB9XG5cbiAgICBfaGlkZSgpIHtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnBvc2l0aW9uID0gJyc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS56SW5kZXggPSAnJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmxlZnQgPSAnJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnRvcCA9ICcnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUud2lkdGggPSAwO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcnO1xuICAgIH1cblxuICAgIG9uSGlkZUV2ZW50KCkge1xuICAgICAgICBpZiAodGhpcy5jb25maWcuaW5GdWxsc2NyZWVuTW9kZSkge1xuICAgICAgICAgICAgdGhpcy5faGlkZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogbGluayBldmVudCB3aXRoIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gZXZlbnRcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqL1xuXG4gICAgb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlciA9IGhhbmRsZXIgfHwgZnVuY3Rpb24oKSB7fTtcblxuICAgICAgICBpZiAoZXZlbnQgPT09IHRoaXMuZXZlbnRUeXBlcy5DTE9TRSkge1xuICAgICAgICAgICAgaWYgKCFoYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlciA9IHRoaXMub25DbG9zZUV2ZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIHRoaXMub25DbG9zZUV2ZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hlci5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCAoZSkgPT4gaGFuZGxlcihlLmRldGFpbCkpO1xuICAgIH07XG5cbiAgICBfc2hvdygpIHtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnpJbmRleCA9IHRoaXMuY29uZmlnLmlmcmFtZVpJbmRleDtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmxlZnQgPSAnMCc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS50b3AgPSAnMCc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHRoaXMuY29uZmlnLnBvcHVwQmFja2dyb3VuZENvbG9yO1xuICAgICAgICB0aGlzLmNvbmZpZy5pbkZ1bGxzY3JlZW5Nb2RlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBvcGVuIGZ1bGxzcmVlbiBwb3B1cCBmb3Igd2lkZ2V0XG4gICAgICovXG5cbiAgICBzaG93KCkge1xuICAgICAgICBpZiAoIWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKElGUkFNRV9JRCkpIHtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zcmMgPSB0aGlzLmdldElmcmFtZVNyYygpO1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLmlkID0gSUZSQU1FX0lEO1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5oZWlnaHQgPSAwO1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLmZyYW1lQm9yZGVyID0gJzAnO1xuXG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBldmVudCA9IG5ldyBDdXN0b21FdmVudCgnbG9hZCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLl9zaG93KCk7XG5cbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQod2lkZ2V0SWZyYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3Nob3coKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmNvbnN0IHJlc3VsdCA9IG5ldyBYTCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlc3VsdDsiXX0=
