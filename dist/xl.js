(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XL = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports={
  "version": "2.1.0",
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaS5rdWthcmtpbi9QaHBzdG9ybVByb2plY3RzL3hzb2xsYS1sb2dpbi1qcy1zZGsvcGFja2FnZS5qc29uIiwic3JjL3N1cHBvcnRzLmpzIiwic3JjL3hsYXBpLmpzIiwic3JjL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSxNQUFNLENBQUMsT0FBTyxDQUFDO0VBQ2IseURBQThCO0VBQzlCLFNBQVMsRUFBRSxPQUFPO0VBQ2xCLDZDQUFrQjtFQUNsQixpREFBc0I7RUFDdEI7Ozs7TUFJRTtFQUNGLHdDQUFhO0VBQ2IsNENBQWlCO0VBQ2pCLDhDQUFtQjtFQUNuQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztNQTRCRTtFQUNGOztNQUVDO0NBQ0Y7Ozs7O0FDN0NEOzs7QUFHQSxJQUFJLENBQUMsT0FBTyxTQUFQLENBQWlCLFVBQXRCLEVBQWtDO0FBQzlCLFdBQU8sU0FBUCxDQUFpQixVQUFqQixHQUE4QixVQUFTLFlBQVQsRUFBdUIsUUFBdkIsRUFBaUM7QUFDM0QsbUJBQVcsWUFBWSxDQUF2QjtBQUNBLGVBQU8sS0FBSyxPQUFMLENBQWEsWUFBYixFQUEyQixRQUEzQixNQUF5QyxRQUFoRDtBQUNILEtBSEQ7QUFJSDs7QUFFRCxJQUFLLE9BQU8sT0FBTyxXQUFkLEtBQThCLFVBQW5DLEVBQWdEO0FBQUEsUUFDbkMsV0FEbUMsR0FDNUMsU0FBUyxXQUFULENBQXFCLEtBQXJCLEVBQTRCLE1BQTVCLEVBQW9DO0FBQ2hDLGlCQUFTLFVBQVUsRUFBQyxTQUFTLEtBQVYsRUFBaUIsWUFBWSxLQUE3QixFQUFvQyxRQUFRLFNBQTVDLEVBQW5CO0FBQ0EsWUFBSSxNQUFNLFNBQVMsV0FBVCxDQUFxQixhQUFyQixDQUFWO0FBQ0EsWUFBSSxlQUFKLENBQW9CLEtBQXBCLEVBQTJCLE9BQU8sT0FBbEMsRUFBMkMsT0FBTyxVQUFsRCxFQUE4RCxPQUFP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Q0o7Ozs7OztBQUdMLElBQU0sU0FBUyxJQUFJLEVBQUosRUFBZjs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsTUFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwibmFtZVwiOiBcInhzb2xsYS1sb2dpbi1qcy1zZGtcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMi4xLjBcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIlwiLFxuICBcIm1haW5cIjogXCJzcmMvbWFpbi5qc1wiLFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiYnVpbGRcIjogXCJndWxwIGJ1aWxkXCIsXG4gICAgXCJob3N0XCI6IFwic3RhdGljLXNlcnZlciAuIC1wIDgwODRcIixcbiAgICBcInRlc3RcIjogXCJqZXN0XCJcbiAgfSxcbiAgXCJhdXRob3JcIjogXCJcIixcbiAgXCJsaWNlbnNlXCI6IFwiTUlUXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHt9LFxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAYmFiZWwvY29yZVwiOiBcIl43LjQuNVwiLFxuICAgIFwiQGJhYmVsL3ByZXNldC1lbnZcIjogXCJeNy40LjVcIixcbiAgICBcImJhYmVsLWplc3RcIjogXCJeMjQuOC4wXCIsXG4gICAgXCJiYWJlbC1wbHVnaW4tdHJhbnNmb3JtLW9iamVjdC1hc3NpZ25cIjogXCJeNi4yMi4wXCIsXG4gICAgXCJiYWJlbC1wcmVzZXQtZXMyMDE1XCI6IFwiXjYuMTguMFwiLFxuICAgIFwiYmFiZWxpZnlcIjogXCJeNy4zLjBcIixcbiAgICBcImJvd2VyXCI6IFwiXjEuOC44XCIsXG4gICAgXCJicmZzXCI6IFwiXjIuMC4xXCIsXG4gICAgXCJicm93c2VyLXN5bmNcIjogXCJeMi4yNi43XCIsXG4gICAgXCJicm93c2VyaWZ5XCI6IFwiXjE2LjIuM1wiLFxuICAgIFwiYnJvd3NlcmlmeS1pc3RhbmJ1bFwiOiBcIl4yLjAuMFwiLFxuICAgIFwiYnJvd3NlcmlmeS1zaGltXCI6IFwiXjMuOC4xMlwiLFxuICAgIFwiY29tbW9uLXNoYWtlaWZ5XCI6IFwiXjAuNi4wXCIsXG4gICAgXCJndWxwXCI6IFwiXjQuMC4yXCIsXG4gICAgXCJndWxwLWlmXCI6IFwiXjIuMC4yXCIsXG4gICAgXCJndWxwLXJlbmFtZVwiOiBcIjEuMi4wXCIsXG4gICAgXCJndWxwLXNvdXJjZW1hcHNcIjogXCJeMi42LjVcIixcbiAgICBcImd1bHAtc3RyaXAtY29tbWVudHNcIjogXCJeMi41LjJcIixcbiAgICBcImd1bHAtdWdsaWZ5XCI6IFwiXjMuMC4xXCIsXG4gICAgXCJndWxwLXV0aWxcIjogXCIzLjAuNlwiLFxuICAgIFwiamFzbWluZVwiOiBcIl4yLjQuMVwiLFxuICAgIFwic3RhdGljLXNlcnZlclwiOiBcIjIuMi4xXCIsXG4gICAgXCJqZXN0XCI6IFwiXjI0LjguMFwiLFxuICAgIFwianNkb21cIjogXCJeMTUuMS4xXCIsXG4gICAgXCJ2aW55bC1idWZmZXJcIjogXCJeMS4wLjFcIixcbiAgICBcInZpbnlsLXNvdXJjZS1zdHJlYW1cIjogXCJeMi4wLjBcIixcbiAgICBcIndhdGNoaWZ5XCI6IFwiXjMuMTEuMVwiXG4gIH0sXG4gIFwiYnJvd3NlcmlmeS1zaGltXCI6IHtcbiAgICBcImV4dGVybmFsXCI6IFwiZ2xvYmFsOkV4dGVybmFsXCJcbiAgfVxufVxuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMDcuMTEuMTYuXG4gKi9cbmlmICghU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoKSB7XG4gICAgU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoID0gZnVuY3Rpb24oc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikge1xuICAgICAgICBwb3NpdGlvbiA9IHBvc2l0aW9uIHx8IDA7XG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4T2Yoc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikgPT09IHBvc2l0aW9uO1xuICAgIH07XG59XG5cbmlmICggdHlwZW9mIHdpbmRvdy5DdXN0b21FdmVudCAhPT0gXCJmdW5jdGlvblwiICkge1xuICAgIGZ1bmN0aW9uIEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMpIHtcbiAgICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHtidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogZmFsc2UsIGRldGFpbDogdW5kZWZpbmVkfTtcbiAgICAgICAgdmFyIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdDdXN0b21FdmVudCcpO1xuICAgICAgICBldnQuaW5pdEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMuYnViYmxlcywgcGFyYW1zLmNhbmNlbGFibGUsIHBhcmFtcy5kZXRhaWwpO1xuICAgICAgICByZXR1cm4gZXZ0O1xuICAgIH1cblxuICAgIEN1c3RvbUV2ZW50LnByb3RvdHlwZSA9IHdpbmRvdy5FdmVudC5wcm90b3R5cGU7XG5cbiAgICB3aW5kb3cuQ3VzdG9tRXZlbnQgPSBDdXN0b21FdmVudDtcbn0iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuLyoqXG4gKiBJbXBlbGVtZW50cyBYc29sbGEgTG9naW4gQXBpXG4gKiBAcGFyYW0gcHJvamVjdElkIC0gcHJvamVjdCdzIHVuaXF1ZSBpZGVudGlmaWVyXG4gKiBAcGFyYW0gYmFzZVVybCAtIGFwaSBlbmRwb2ludFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxudmFyIFhMQXBpID0gZnVuY3Rpb24gKHByb2plY3RJZCwgYmFzZVVybCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmJhc2VVcmwgPSBiYXNlVXJsIHx8ICcvL2xvZ2luLnhzb2xsYS5jb20vYXBpLyc7XG5cbiAgICB0aGlzLnByb2plY3RJZCA9IHByb2plY3RJZDtcblxuICAgIHRoaXMubWFrZUFwaUNhbGwgPSBmdW5jdGlvbiAocGFyYW1zLCBzdWNjZXNzLCBlcnJvcikge1xuICAgICAgICB2YXIgciA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG4gICAgICAgIHIub3BlbihwYXJhbXMubWV0aG9kLCBzZWxmLmJhc2VVcmwgKyBwYXJhbXMuZW5kcG9pbnQsIHRydWUpO1xuICAgICAgICByLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgICAgICAgIGlmIChyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyhKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcih7ZXJyb3I6IHttZXNzYWdlOiAnTmV0d29ya2luZyBlcnJvcicsIGNvZGU6IHIuc3RhdHVzfX0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBpZiAocGFyYW1zLm1ldGhvZCA9PSAnUE9TVCcpIHtcbiAgICAgICAgICAgIHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwiKTtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMucG9zdEJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy5tZXRob2QgPT0gJ0dFVCcpIHtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMuZ2V0QXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuLyoqXG4gKiBHZXQgYWxsIGF2aWFsYWJsZSBzb2NpYWwgbWV0aG9kcyBhdXRoIHVybFxuICogQHBhcmFtIHN1Y2Nlc3MgLSBzdWNjZXNzIGNhbGxiYWNrXG4gKiBAcGFyYW0gZXJyb3IgLSBlcnJvciBjYWxsYmFja1xuICogQHBhcmFtIGdldEFyZ3VtZW50cyAtIGFkZGl0aW9uYWwgcGFyYW1zIHRvIHNlbmQgd2l0aCByZXF1ZXN0XG4gKi9cblhMQXBpLnByb3RvdHlwZS5nZXRTb2NpYWxzVVJMcyA9IGZ1bmN0aW9uIChzdWNjZXNzLCBlcnJvciwgZ2V0QXJndW1lbnRzKSB7XG4gICAgdmFyIHN0ciA9IFwiXCI7XG4gICAgZm9yICh2YXIga2V5IGluIGdldEFyZ3VtZW50cykge1xuICAgICAgICBpZiAoc3RyICE9IFwiXCIpIHtcbiAgICAgICAgICAgIHN0ciArPSBcIiZcIjtcbiAgICAgICAgfVxuICAgICAgICBzdHIgKz0ga2V5ICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoZ2V0QXJndW1lbnRzW2tleV0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ3NvY2lhbC9sb2dpbl91cmxzPycgKyBzdHIsIGdldEFyZ3VtZW50czogbnVsbH0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cblhMQXBpLnByb3RvdHlwZS5sb2dpblBhc3NBdXRoID0gZnVuY3Rpb24gKGxvZ2luLCBwYXNzLCByZW1lbWJlck1lLCByZWRpcmVjdFVybCwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICB2YXIgYm9keSA9IHtcbiAgICAgICAgdXNlcm5hbWU6IGxvZ2luLFxuICAgICAgICBwYXNzd29yZDogcGFzcyxcbiAgICAgICAgcmVtZW1iZXJfbWU6IHJlbWVtYmVyTWVcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdQT1NUJywgZW5kcG9pbnQ6ICdwcm94eS9sb2dpbj9wcm9qZWN0SWQ9Jyt0aGlzLnByb2plY3RJZCArICcmcmVkaXJlY3RfdXJsPScgKyBlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmwpLCBwb3N0Qm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSl9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUuc21zQXV0aCA9IGZ1bmN0aW9uIChwaG9uZU51bWJlciwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzbXMnLCBnZXRBcmd1bWVudHM6ICdwaG9uZU51bWJlcj0nICsgcGhvbmVOdW1iZXJ9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhMQXBpO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbnJlcXVpcmUoJy4vc3VwcG9ydHMnKTtcbmNvbnN0IHZlcnNpb24gPSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKS52ZXJzaW9uO1xuXG5pbXBvcnQgWExBcGkgZnJvbSAnLi94bGFwaSc7XG4vKipcbiAqIENyZWF0ZSBhbiBgQXV0aDBgIGluc3RhbmNlIHdpdGggYG9wdGlvbnNgXG4gKlxuICogQGNsYXNzIFhMXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuXG5jb25zdCBST1VURVMgPSB7XG4gICAgTE9HSU46ICcnLFxuICAgIFJFR0lTVFJBVElPTjogJ3JlZ2lzdHJhdGlvbicsXG4gICAgUkVDT1ZFUl9QQVNTV09SRDogJ3Jlc2V0LXBhc3N3b3JkJyxcbiAgICBBTExfU09DSUFMUzogJ290aGVyJyxcbiAgICBTT0NJQUxTX0xPR0lOOiAnc29jaWFscycsXG4gICAgVVNFUk5BTUVfTE9HSU46ICd1c2VybmFtZS1sb2dpbicsXG59O1xuXG5jb25zdCBERUZBVUxUX0NPTkZJRyA9IHtcbiAgICBlcnJvckhhbmRsZXI6IGZ1bmN0aW9uIChhKSB7XG4gICAgfSxcbiAgICBsb2dpblBhc3NWYWxpZGF0b3I6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgaXNNYXJrdXBTb2NpYWxzSGFuZGxlcnNFbmFibGVkOiBmYWxzZSxcbiAgICBhcGlVcmw6ICdodHRwczovL2xvZ2luLnhzb2xsYS5jb20vYXBpLycsXG4gICAgbWF4WExDbGlja0RlcHRoOiAyMCxcbiAgICBvbmx5V2lkZ2V0czogZmFsc2UsXG4gICAgZGVmYXVsdExvZ2luVXJsOiAnaHR0cHM6Ly94bC13aWRnZXQueHNvbGxhLmNvbS9hdXRoLmh0bWwnLFxuICAgIHBvcHVwQmFja2dyb3VuZENvbG9yOiAncmdiKDE4NywgMTg3LCAxODcpJyxcbiAgICBpZnJhbWVaSW5kZXg6IDEwMDAwMDAsXG4gICAgdGhlbWU6ICdhcHAuZGVmYXVsdC5jc3MnLFxuICAgIHByZWxvYWRlcjogJzxkaXY+PC9kaXY+JyxcbiAgICB3aWRnZXRCYXNlVXJsOiAnaHR0cHM6Ly94bC13aWRnZXQueHNvbGxhLmNvbS8nLFxuICAgIHJvdXRlOiBST1VURVMuTE9HSU4sXG4gICAgY29tcGFjdDogZmFsc2UsXG4gICAgaW5GdWxsc2NyZWVuTW9kZTogZmFsc2Vcbn07XG5cbmNvbnN0IElOVkFMSURfTE9HSU5fRVJST1JfQ09ERSA9IDE7XG5jb25zdCBJTkNPUlJFQ1RfTE9HSU5fT1JfUEFTU1dPUkRfRVJST1JfQ09ERSA9IDI7XG5cbmNvbnN0IElGUkFNRV9JRCA9ICdYc29sbGFMb2dpbldpZGdldElmcmFtZSc7XG5jb25zdCB3aWRnZXRJZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcblxuY2xhc3MgWEwge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnNvY2lhbFVybHMgPSB7fTtcbiAgICAgICAgdGhpcy5ldmVudFR5cGVzID0ge1xuICAgICAgICAgICAgTE9BRDogJ2xvYWQnLFxuICAgICAgICAgICAgQ0xPU0U6ICdjbG9zZScsXG4gICAgICAgICAgICBISURFX1BPUFVQOiAnaGlkZSBwb3B1cCcsXG4gICAgICAgICAgICBSRUdJU1RSQVRJT05fUkVRVUVTVDogJ3JlZ2lzdHJhdGlvbiByZXF1ZXN0JyxcbiAgICAgICAgICAgIEFVVEhFTlRJQ0FURUQ6ICdhdXRoZW50aWNhdGVkJ1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIG5lZWQgZm9yIGV4cG9ydCBwdXJwb3Nlc1xuICAgICAgICB0aGlzLlJPVVRFUyA9IFJPVVRFUztcblxuICAgICAgICB0aGlzLmRpc3BhdGNoZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgdGhpcy5vbkhpZGVFdmVudCA9IHRoaXMub25IaWRlRXZlbnQuYmluZCh0aGlzKTtcbiAgICB9XG5cbiAgICBpbml0KG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5jb25maWcgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX0NPTkZJRywgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuY29uZmlnLnBvcHVwQmFja2dyb3VuZENvbG9yID0gREVGQVVMVF9DT05GSUcucG9wdXBCYWNrZ3JvdW5kQ29sb3I7XG4gICAgICAgIHRoaXMuYXBpID0gbmV3IFhMQXBpKG9wdGlvbnMucHJvamVjdElkLCB0aGlzLmNvbmZpZy5hcGlVcmwpO1xuXG4gICAgICAgIGNvbnN0IGV2ZW50TWV0aG9kID0gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgPyAnYWRkRXZlbnRMaXN0ZW5lcicgOiAnYXR0YWNoRXZlbnQnO1xuICAgICAgICBjb25zdCBldmVudGVyID0gd2luZG93W2V2ZW50TWV0aG9kXTtcbiAgICAgICAgY29uc3QgbWVzc2FnZUV2ZW50ID0gZXZlbnRNZXRob2QgPT09ICdhdHRhY2hFdmVudCcgPyAnb25tZXNzYWdlJyA6ICdtZXNzYWdlJztcblxuICAgICAgICAvLyBMaXN0ZW4gdG8gbWVzc2FnZSBmcm9tIGNoaWxkIHdpbmRvd1xuICAgICAgICBldmVudGVyKG1lc3NhZ2VFdmVudCwgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBldmVudDtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZS5kYXRhID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIC8vIE9sZCBmb3JtYXQgLSBzdHJpbmcgb25seVxuICAgICAgICAgICAgICAgIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KHRoaXMuZXZlbnRUeXBlc1tlLmRhdGFdKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTmV3IGZvcm1hdCAtIHt0eXBlOiAnZXZlbnQnLCAuLi59XG4gICAgICAgICAgICAgICAgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQodGhpcy5ldmVudFR5cGVzW2UuZGF0YS50eXBlXSwge2RldGFpbDogZS5kYXRhfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoZXIuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLmV2ZW50VHlwZXMpLm1hcCgoZXZlbnRLZXkpID0+IHtcbiAgICAgICAgICAgIHRoaXMub24odGhpcy5ldmVudFR5cGVzW2V2ZW50S2V5XSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmKG9wdGlvbnMucG9wdXBCYWNrZ3JvdW5kQ29sb3IpIHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLnBvcHVwQmFja2dyb3VuZENvbG9yID0gb3B0aW9ucy5wb3B1cEJhY2tncm91bmRDb2xvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hlci5hZGRFdmVudExpc3RlbmVyKHRoaXMuZXZlbnRUeXBlcy5ISURFX1BPUFVQLCB0aGlzLm9uSGlkZUV2ZW50KTtcblxuICAgICAgICBpZiAoIXRoaXMuY29uZmlnLm9ubHlXaWRnZXRzKSB7XG5cbiAgICAgICAgICAgIGxldCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHBhcmFtcy5wcm9qZWN0SWQgPSBvcHRpb25zLnByb2plY3RJZDtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5yZWRpcmVjdFVybCkge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5yZWRpcmVjdF91cmwgPSB0aGlzLmNvbmZpZy5yZWRpcmVjdFVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5sb2dpblVybCkge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5sb2dpbl91cmwgPSB0aGlzLmNvbmZpZy5sb2dpblVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5jYWxsYmFja1VybCkge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5sb2dpbl91cmwgPSB0aGlzLmNvbmZpZy5jYWxsYmFja1VybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm1zIGxvZ2luXG4gICAgICogQHBhcmFtIHByb3BcbiAgICAgKiBAcGFyYW0gZXJyb3IgLSBjYWxsIGluIGNhc2UgZXJyb3JcbiAgICAgKiBAcGFyYW0gc3VjY2Vzc1xuICAgICAqL1xuICAgIGxvZ2luKHByb3AsIGVycm9yLCBzdWNjZXNzKSB7XG5cbiAgICAgICAgaWYgKCFwcm9wIHx8ICF0aGlzLnNvY2lhbFVybHMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBwcm9wc1xuICAgICAgICAgKiBhdXRoVHlwZTogc24tPHNvY2lhbCBuYW1lPiwgbG9naW4tcGFzcywgc21zXG4gICAgICAgICAqL1xuICAgICAgICBpZiAocHJvcC5hdXRoVHlwZSkge1xuICAgICAgICAgICAgaWYgKHByb3AuYXV0aFR5cGUuc3RhcnRzV2l0aCgnc24tJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzb2NpYWxVcmwgPSB0aGlzLnNvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICAgICAgaWYgKHNvY2lhbFVybCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB0aGlzLnNvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQXV0aCB0eXBlOiAnICsgcHJvcC5hdXRoVHlwZSArICcgZG9lc25cXCd0IGV4aXN0Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ2xvZ2luLXBhc3MnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGkubG9naW5QYXNzQXV0aChwcm9wLmxvZ2luLCBwcm9wLnBhc3MsIHByb3AucmVtZW1iZXJNZSwgdGhpcy5jb25maWcucmVkaXJlY3RVcmwsIChyZXMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcy5sb2dpbl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbmlzaEF1dGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXMubG9naW5fdXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzcyh7c3RhdHVzOiAnc3VjY2VzcycsIGZpbmlzaDogZmluaXNoQXV0aCwgcmVkaXJlY3RVcmw6IHJlcy5sb2dpbl91cmx9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluaXNoQXV0aCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IodGhpcy5jcmVhdGVFcnJvck9iamVjdCgnTG9naW4gb3IgcGFzcyBub3QgdmFsaWQnLCBJTkNPUlJFQ1RfTE9HSU5fT1JfUEFTU1dPUkRfRVJST1JfQ09ERSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wLmF1dGhUeXBlID09ICdzbXMnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNtc0F1dGhTdGVwID09ICdwaG9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcGkuc21zQXV0aChwcm9wLnBob25lTnVtYmVyLCBudWxsLCBudWxsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNtc0F1dGhTdGVwID09ICdjb2RlJykge1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmtub3duIGF1dGggdHlwZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY3JlYXRlRXJyb3JPYmplY3QobWVzc2FnZSwgY29kZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIGNvZGU6IGNvZGUgfHwgLTFcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgZ2V0UHJvamVjdElkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcucHJvamVjdElkO1xuICAgIH07XG5cbiAgICBnZXRSZWRpcmVjdFVSTCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsO1xuICAgIH07XG5cbiAgICBnZXRUaGVtZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLnRoZW1lO1xuICAgIH1cblxuICAgIGdldENhbGxiYWNrVXJsKCkge1xuICAgICAgICBpZiAodGhpcy5jb25maWcuY2FsbGJhY2tVcmwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy5jYWxsYmFja1VybDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5sb2dpblVybCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLmxvZ2luVXJsO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLmV4dGVybmFsV2luZG93KSB7XG4gICAgICAgICAgICByZXR1cm4gREVGQVVMVF9DT05GSUcuZGVmYXVsdExvZ2luVXJsO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGdldElmcmFtZVNyYyhvcHRpb25zID0ge30pIHtcbiAgICAgICAgbGV0IHdpZGdldEJhc2VVcmwgPSBvcHRpb25zLndpZGdldEJhc2VVcmwgfHwgdGhpcy5jb25maWcud2lkZ2V0QmFzZVVybDtcblxuICAgICAgICBpZiAod2lkZ2V0QmFzZVVybC5zdWJzdHIoLTEpICE9PSAnLycpIHtcbiAgICAgICAgICAgIHdpZGdldEJhc2VVcmwgKz0gJy8nO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgcm91dGUgPSBvcHRpb25zLnJvdXRlIHx8IHRoaXMuY29uZmlnLnJvdXRlO1xuXG4gICAgICAgIGxldCBzcmMgPSB3aWRnZXRCYXNlVXJsICsgcm91dGUgKyAnP3dpZGdldF9zZGtfdmVyc2lvbj0nICsgdmVyc2lvbiArICcmcHJvamVjdElkPScgKyB0aGlzLmdldFByb2plY3RJZCgpO1xuXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5sb2NhbGUpIHtcbiAgICAgICAgICAgIHNyYyA9IHNyYyArICcmbG9jYWxlPScgKyB0aGlzLmNvbmZpZy5sb2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmZpZWxkcykge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZmaWVsZHM9JyArIHRoaXMuY29uZmlnLmZpZWxkcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZWRpcmVjdFVybCA9IHRoaXMuZ2V0UmVkaXJlY3RVUkwoKTtcbiAgICAgICAgaWYgKHJlZGlyZWN0VXJsKSB7XG4gICAgICAgICAgICBzcmMgPSBzcmMgKyAnJnJlZGlyZWN0VXJsPScgKyBlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmwpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2FsbGJhY2tVcmwgPSB0aGlzLmdldENhbGxiYWNrVXJsKCk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrVXJsKSB7XG4gICAgICAgICAgICBzcmMgPSBzcmMgKyAnJmxvZ2luX3VybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGNhbGxiYWNrVXJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRoZW1lID0gdGhpcy5nZXRUaGVtZSgpO1xuICAgICAgICBpZiAodGhlbWUpIHtcbiAgICAgICAgICAgIHNyYyA9IHNyYyArICcmdGhlbWU9JyArIGVuY29kZVVSSUNvbXBvbmVudCh0aGVtZSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7ZXh0ZXJuYWxXaW5kb3d9ID0gdGhpcy5jb25maWc7XG4gICAgICAgIGlmIChleHRlcm5hbFdpbmRvdykge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZleHRlcm5hbF93aW5kb3c9JyArIGVuY29kZVVSSUNvbXBvbmVudChleHRlcm5hbFdpbmRvdyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB3aWRnZXRWZXJzaW9uID0gdGhpcy5jb25maWcud2lkZ2V0VmVyc2lvbjtcbiAgICAgICAgaWYgKHdpZGdldFZlcnNpb24pIHtcbiAgICAgICAgICAgIHNyYyArPSAnJnZlcnNpb249JyArIGVuY29kZVVSSUNvbXBvbmVudCh3aWRnZXRWZXJzaW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbXBhY3QgPSB0aGlzLmNvbmZpZy5jb21wYWN0O1xuICAgICAgICBpZiAoY29tcGFjdCkge1xuICAgICAgICAgICAgc3JjICs9ICcmY29tcGFjdD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbXBhY3QpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNyYztcbiAgICB9XG5cbiAgICBBdXRoV2lkZ2V0KGVsZW1lbnRJZCwgb3B0aW9ucykge1xuICAgICAgICBpZiAodGhpcy5hcGkpIHtcbiAgICAgICAgICAgIGlmICghZWxlbWVudElkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignTm8gZGl2IG5hbWUhJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gYCR7b3B0aW9ucy53aWR0aCB8fCA0MDB9cHhgO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IGAke29wdGlvbnMuaGVpZ2h0IHx8IDU1MH1weGA7XG5cbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUNoaWxkKHByZWxvYWRlcik7XG4gICAgICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdsb2FkJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLmZyYW1lQm9yZGVyID0gJzAnO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zcmMgPSB0aGlzLmdldElmcmFtZVNyYyhvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuaWQgPSBJRlJBTUVfSUQ7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBwcmVsb2FkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgICAgICAgICAgICAgIHByZWxvYWRlci5pbm5lckhUTUwgPSB0aGlzLmNvbmZpZy5wcmVsb2FkZXI7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbWVudElkKTtcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnN0eWxlLndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZENoaWxkKHByZWxvYWRlcik7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQod2lkZ2V0SWZyYW1lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFbGVtZW50IFxcXCInICsgZWxlbWVudElkICsgJ1xcXCIgbm90IGZvdW5kIScpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignUGxlYXNlIHJ1biBYTC5pbml0KCkgZmlyc3QnKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBvbkNsb3NlRXZlbnQoKSB7XG4gICAgICAgIHdpZGdldElmcmFtZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHdpZGdldElmcmFtZSk7XG4gICAgfVxuXG4gICAgX2hpZGUoKSB7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5wb3NpdGlvbiA9ICcnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuekluZGV4ID0gJyc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5sZWZ0ID0gJyc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS50b3AgPSAnJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnJztcbiAgICB9XG5cbiAgICBvbkhpZGVFdmVudCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmluRnVsbHNjcmVlbk1vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuX2hpZGUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGxpbmsgZXZlbnQgd2l0aCBoYW5kbGVyXG4gICAgICogQHBhcmFtIGV2ZW50XG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKi9cblxuICAgIG9uKGV2ZW50LCBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyIHx8IGZ1bmN0aW9uKCkge307XG5cbiAgICAgICAgaWYgKGV2ZW50ID09PSB0aGlzLmV2ZW50VHlwZXMuQ0xPU0UpIHtcbiAgICAgICAgICAgIGlmICghaGFuZGxlcikge1xuICAgICAgICAgICAgICAgIGhhbmRsZXIgPSB0aGlzLm9uQ2xvc2VFdmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCB0aGlzLm9uQ2xvc2VFdmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmRpc3BhdGNoZXIuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgKGUpID0+IGhhbmRsZXIoZS5kZXRhaWwpKTtcbiAgICB9O1xuXG4gICAgX3Nob3coKSB7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS56SW5kZXggPSB0aGlzLmNvbmZpZy5pZnJhbWVaSW5kZXg7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5sZWZ0ID0gJzAnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUudG9wID0gJzAnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSB0aGlzLmNvbmZpZy5wb3B1cEJhY2tncm91bmRDb2xvcjtcbiAgICAgICAgdGhpcy5jb25maWcuaW5GdWxsc2NyZWVuTW9kZSA9IHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogb3BlbiBmdWxsc3JlZW4gcG9wdXAgZm9yIHdpZGdldFxuICAgICAqL1xuXG4gICAgc2hvdygpIHtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5nZXRFbGVtZW50QnlJZChJRlJBTUVfSUQpKSB7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3JjID0gdGhpcy5nZXRJZnJhbWVTcmMoKTtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5pZCA9IElGUkFNRV9JRDtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5mcmFtZUJvcmRlciA9ICcwJztcblxuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2xvYWQnKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpc3BhdGNoZXIuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5fc2hvdygpO1xuXG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHdpZGdldElmcmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zaG93KCk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5jb25zdCByZXN1bHQgPSBuZXcgWEwoKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXN1bHQ7Il19
