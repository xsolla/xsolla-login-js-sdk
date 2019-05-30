(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XL = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

/**
 * Created by a.korotaev on 07.11.16.
 */
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

},{}],2:[function(require,module,exports){
'use strict';

/**
 * Created by a.korotaev on 24.06.16.
 */
/**
 * Impelements Xsolla Login Api
 * @param projectId - project's unique identifier
 * @param baseUrl - api endpoint
 * @constructor
 */

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
/**
 * Get all avialable social methods auth url
 * @param success - success callback
 * @param error - error callback
 * @param getArguments - additional params to send with request
 */
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

/**
 * Created by a.korotaev on 24.06.16.
 */
require('./supports');

/**
 * Create an `Auth0` instance with `options`
 *
 * @class XL
 * @constructor
 */

var ROUTES = {
    LOGIN: '',
    REGISTRATION: 'registration',
    RECOVER_PASSWORD: 'reset-password',
    ALL_SOCIALS: 'other'
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
    loginUrl: 'https://xl-widget.xsolla.com/auth.html',
    popupBackgroundColor: 'rgb(187, 187, 187)',
    iframeZIndex: 1000000,
    theme: 'app.default.css',
    preloader: '<div></div>',
    widgetBaseUrl: 'https://xl-widget.xsolla.com/',
    route: ROUTES.LOGIN,
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

        // need for export purposes
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

            // Listen to message from child window
            eventer(messageEvent, function (e) {
                var event = new CustomEvent(_this.eventTypes[e.data.type], { detail: e.data });
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

        /**
         * Performs login
         * @param prop
         * @param error - call in case error
         * @param success
         */

    }, {
        key: 'login',
        value: function login(prop, error, success) {
            var _this2 = this;

            if (!prop || !this.socialUrls) {
                return;
            }

            /**
             * props
             * authType: sn-<social name>, login-pass, sms
             */
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
            } else if (this.config.externalWindow) {
                return DEFAULT_CONFIG.loginUrl;
            } else {
                return this.config.loginUrl;
            }
        }
    }, {
        key: 'getIframeSrc',
        value: function getIframeSrc() {
            var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            var widgetBaseUrl = options.widgetBaseUrl || this.config.widgetBaseUrl;

            var route = options.route || this.config.route;

            var src = widgetBaseUrl + route + '?projectId=' + this.getProjectId();

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

        /**
         * link event with handler
         * @param event
         * @param handler
         */

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

        /**
         * open fullsreen popup for widget
         */

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

},{"./supports":1,"./xlapi":2}]},{},["main"])("main")
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc3VwcG9ydHMuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUE7OztBQUdBLElBQUksQ0FBQyxPQUFPLFNBQVAsQ0FBaUIsVUFBdEIsRUFBa0M7QUFDOUIsV0FBTyxTQUFQLENBQWlCLFVBQWpCLEdBQThCLFVBQVMsWUFBVCxFQUF1QixRQUF2QixFQUFpQztBQUMzRCxtQkFBVyxZQUFZLENBQXZCO0FBQ0EsZUFBTyxLQUFLLE9BQUwsQ0FBYSxZQUFiLEVBQTJCLFFBQTNCLE1BQXlDLFFBQWhEO0FBQ0gsS0FIRDtBQUlIOztBQUVELElBQUssT0FBTyxPQUFPLFdBQWQsS0FBOEIsVUFBbkMsRUFBZ0Q7QUFBQSxRQUNuQyxXQURtQyxHQUM1QyxTQUFTLFdBQVQsQ0FBcUIsS0FBckIsRUFBNEIsTUFBNUIsRUFBb0M7QUFDaEMsaUJBQVMsVUFBVSxFQUFDLFNBQVMsS0FBVixFQUFpQixZQUFZLEtBQTdCLEVBQW9DLFFBQVEsU0FBNUMsRUFBbkI7QUFDQSxZQUFJLE1BQU0sU0FBUyxXQUFULENBQXFCLGFBQXJCLENBQVY7QUFDQSxZQUFJLGVBQUosQ0FBb0IsS0FBcEIsRUFBMkIsT0FBTyxPQUFsQyxFQUEyQyxPQUFPLFVBQWxELEVBQThELE9BQU8sTUFBckU7QUFDQSxlQUFPLEdBQVA7QUFDSCxLQU4yQzs7QUFRNUMsZ0JBQVksU0FBWixHQUF3QixPQUFPLEtBQVAsQ0FBYSxTQUFyQzs7QUFFQSxXQUFPLFdBQVAsR0FBcUIsV0FBckI7QUFDSDs7Ozs7QUNyQkQ7OztBQUdBOzs7Ozs7O0FBT0EsSUFBSSxRQUFRLFNBQVIsS0FBUSxDQUFVLFNBQVYsRUFBcUIsT0FBckIsRUFBOEI7QUFDdEMsUUFBSSxPQUFPLElBQVg7QUFDQSxTQUFLLE9BQUwsR0FBZSxXQUFXLHlCQUExQjs7QUFFQSxTQUFLLFNBQUwsR0FBaUIs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V0FBZCxDQUEwQixZQUExQjtBQUNILGFBZEQsTUFjTztBQUNILHFCQUFLLEtBQUw7QUFDSDtBQUNKOzs7Ozs7QUFHTCxJQUFNLFNBQVMsSUFBSSxFQUFKLEVBQWY7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLE1BQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMDcuMTEuMTYuXG4gKi9cbmlmICghU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoKSB7XG4gICAgU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoID0gZnVuY3Rpb24oc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikge1xuICAgICAgICBwb3NpdGlvbiA9IHBvc2l0aW9uIHx8IDA7XG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4T2Yoc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikgPT09IHBvc2l0aW9uO1xuICAgIH07XG59XG5cbmlmICggdHlwZW9mIHdpbmRvdy5DdXN0b21FdmVudCAhPT0gXCJmdW5jdGlvblwiICkge1xuICAgIGZ1bmN0aW9uIEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMpIHtcbiAgICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHtidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogZmFsc2UsIGRldGFpbDogdW5kZWZpbmVkfTtcbiAgICAgICAgdmFyIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdDdXN0b21FdmVudCcpO1xuICAgICAgICBldnQuaW5pdEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMuYnViYmxlcywgcGFyYW1zLmNhbmNlbGFibGUsIHBhcmFtcy5kZXRhaWwpO1xuICAgICAgICByZXR1cm4gZXZ0O1xuICAgIH1cblxuICAgIEN1c3RvbUV2ZW50LnByb3RvdHlwZSA9IHdpbmRvdy5FdmVudC5wcm90b3R5cGU7XG5cbiAgICB3aW5kb3cuQ3VzdG9tRXZlbnQgPSBDdXN0b21FdmVudDtcbn0iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuLyoqXG4gKiBJbXBlbGVtZW50cyBYc29sbGEgTG9naW4gQXBpXG4gKiBAcGFyYW0gcHJvamVjdElkIC0gcHJvamVjdCdzIHVuaXF1ZSBpZGVudGlmaWVyXG4gKiBAcGFyYW0gYmFzZVVybCAtIGFwaSBlbmRwb2ludFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxudmFyIFhMQXBpID0gZnVuY3Rpb24gKHByb2plY3RJZCwgYmFzZVVybCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmJhc2VVcmwgPSBiYXNlVXJsIHx8ICcvL2xvZ2luLnhzb2xsYS5jb20vYXBpLyc7XG5cbiAgICB0aGlzLnByb2plY3RJZCA9IHByb2plY3RJZDtcblxuICAgIHRoaXMubWFrZUFwaUNhbGwgPSBmdW5jdGlvbiAocGFyYW1zLCBzdWNjZXNzLCBlcnJvcikge1xuICAgICAgICB2YXIgciA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG4gICAgICAgIHIub3BlbihwYXJhbXMubWV0aG9kLCBzZWxmLmJhc2VVcmwgKyBwYXJhbXMuZW5kcG9pbnQsIHRydWUpO1xuICAgICAgICByLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgICAgICAgIGlmIChyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyhKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcih7ZXJyb3I6IHttZXNzYWdlOiAnTmV0d29ya2luZyBlcnJvcicsIGNvZGU6IHIuc3RhdHVzfX0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBpZiAocGFyYW1zLm1ldGhvZCA9PSAnUE9TVCcpIHtcbiAgICAgICAgICAgIHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwiKTtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMucG9zdEJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy5tZXRob2QgPT0gJ0dFVCcpIHtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMuZ2V0QXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuLyoqXG4gKiBHZXQgYWxsIGF2aWFsYWJsZSBzb2NpYWwgbWV0aG9kcyBhdXRoIHVybFxuICogQHBhcmFtIHN1Y2Nlc3MgLSBzdWNjZXNzIGNhbGxiYWNrXG4gKiBAcGFyYW0gZXJyb3IgLSBlcnJvciBjYWxsYmFja1xuICogQHBhcmFtIGdldEFyZ3VtZW50cyAtIGFkZGl0aW9uYWwgcGFyYW1zIHRvIHNlbmQgd2l0aCByZXF1ZXN0XG4gKi9cblhMQXBpLnByb3RvdHlwZS5nZXRTb2NpYWxzVVJMcyA9IGZ1bmN0aW9uIChzdWNjZXNzLCBlcnJvciwgZ2V0QXJndW1lbnRzKSB7XG4gICAgdmFyIHN0ciA9IFwiXCI7XG4gICAgZm9yICh2YXIga2V5IGluIGdldEFyZ3VtZW50cykge1xuICAgICAgICBpZiAoc3RyICE9IFwiXCIpIHtcbiAgICAgICAgICAgIHN0ciArPSBcIiZcIjtcbiAgICAgICAgfVxuICAgICAgICBzdHIgKz0ga2V5ICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoZ2V0QXJndW1lbnRzW2tleV0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ3NvY2lhbC9sb2dpbl91cmxzPycgKyBzdHIsIGdldEFyZ3VtZW50czogbnVsbH0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cblhMQXBpLnByb3RvdHlwZS5sb2dpblBhc3NBdXRoID0gZnVuY3Rpb24gKGxvZ2luLCBwYXNzLCByZW1lbWJlck1lLCByZWRpcmVjdFVybCwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICB2YXIgYm9keSA9IHtcbiAgICAgICAgdXNlcm5hbWU6IGxvZ2luLFxuICAgICAgICBwYXNzd29yZDogcGFzcyxcbiAgICAgICAgcmVtZW1iZXJfbWU6IHJlbWVtYmVyTWVcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdQT1NUJywgZW5kcG9pbnQ6ICdwcm94eS9sb2dpbj9wcm9qZWN0SWQ9Jyt0aGlzLnByb2plY3RJZCArICcmcmVkaXJlY3RfdXJsPScgKyBlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmwpLCBwb3N0Qm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSl9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUuc21zQXV0aCA9IGZ1bmN0aW9uIChwaG9uZU51bWJlciwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzbXMnLCBnZXRBcmd1bWVudHM6ICdwaG9uZU51bWJlcj0nICsgcGhvbmVOdW1iZXJ9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhMQXBpO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbnJlcXVpcmUoJy4vc3VwcG9ydHMnKTtcblxuaW1wb3J0IFhMQXBpIGZyb20gJy4veGxhcGknO1xuLyoqXG4gKiBDcmVhdGUgYW4gYEF1dGgwYCBpbnN0YW5jZSB3aXRoIGBvcHRpb25zYFxuICpcbiAqIEBjbGFzcyBYTFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxuY29uc3QgUk9VVEVTID0ge1xuICAgIExPR0lOOiAnJyxcbiAgICBSRUdJU1RSQVRJT046ICdyZWdpc3RyYXRpb24nLFxuICAgIFJFQ09WRVJfUEFTU1dPUkQ6ICdyZXNldC1wYXNzd29yZCcsXG4gICAgQUxMX1NPQ0lBTFM6ICdvdGhlcidcbn07XG5cbmNvbnN0IERFRkFVTFRfQ09ORklHID0ge1xuICAgIGVycm9ySGFuZGxlcjogZnVuY3Rpb24gKGEpIHtcbiAgICB9LFxuICAgIGxvZ2luUGFzc1ZhbGlkYXRvcjogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICBpc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQ6IGZhbHNlLFxuICAgIGFwaVVybDogJ2h0dHBzOi8vbG9naW4ueHNvbGxhLmNvbS9hcGkvJyxcbiAgICBtYXhYTENsaWNrRGVwdGg6IDIwLFxuICAgIG9ubHlXaWRnZXRzOiBmYWxzZSxcbiAgICBsb2dpblVybDogJ2h0dHBzOi8veGwtd2lkZ2V0Lnhzb2xsYS5jb20vYXV0aC5odG1sJyxcbiAgICBwb3B1cEJhY2tncm91bmRDb2xvcjogJ3JnYigxODcsIDE4NywgMTg3KScsXG4gICAgaWZyYW1lWkluZGV4OiAxMDAwMDAwLFxuICAgIHRoZW1lOiAnYXBwLmRlZmF1bHQuY3NzJyxcbiAgICBwcmVsb2FkZXI6ICc8ZGl2PjwvZGl2PicsXG4gICAgd2lkZ2V0QmFzZVVybDogJ2h0dHBzOi8veGwtd2lkZ2V0Lnhzb2xsYS5jb20vJyxcbiAgICByb3V0ZTogUk9VVEVTLkxPR0lOLFxuICAgIGluRnVsbHNjcmVlbk1vZGU6IGZhbHNlXG59O1xuXG5jb25zdCBJTlZBTElEX0xPR0lOX0VSUk9SX0NPREUgPSAxO1xuY29uc3QgSU5DT1JSRUNUX0xPR0lOX09SX1BBU1NXT1JEX0VSUk9SX0NPREUgPSAyO1xuXG5jb25zdCBJRlJBTUVfSUQgPSAnWHNvbGxhTG9naW5XaWRnZXRJZnJhbWUnO1xuY29uc3Qgd2lkZ2V0SWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG5cbmNsYXNzIFhMIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5zb2NpYWxVcmxzID0ge307XG4gICAgICAgIHRoaXMuZXZlbnRUeXBlcyA9IHtcbiAgICAgICAgICAgIExPQUQ6ICdsb2FkJyxcbiAgICAgICAgICAgIENMT1NFOiAnY2xvc2UnLFxuICAgICAgICAgICAgSElERV9QT1BVUDogJ2hpZGUgcG9wdXAnLFxuICAgICAgICAgICAgUkVHSVNUUkFUSU9OX1JFUVVFU1Q6ICdyZWdpc3RyYXRpb24gcmVxdWVzdCcsXG4gICAgICAgICAgICBBVVRIRU5USUNBVEVEOiAnYXV0aGVudGljYXRlZCdcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBuZWVkIGZvciBleHBvcnQgcHVycG9zZXNcbiAgICAgICAgdGhpcy5ST1VURVMgPSBST1VURVM7XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHRoaXMub25IaWRlRXZlbnQgPSB0aGlzLm9uSGlkZUV2ZW50LmJpbmQodGhpcyk7XG4gICAgfVxuXG4gICAgaW5pdChvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuY29uZmlnID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9DT05GSUcsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLmNvbmZpZy5wb3B1cEJhY2tncm91bmRDb2xvciA9IERFRkFVTFRfQ09ORklHLnBvcHVwQmFja2dyb3VuZENvbG9yO1xuICAgICAgICB0aGlzLmFwaSA9IG5ldyBYTEFwaShvcHRpb25zLnByb2plY3RJZCwgdGhpcy5jb25maWcuYXBpVXJsKTtcblxuICAgICAgICBjb25zdCBldmVudE1ldGhvZCA9IHdpbmRvdy5hZGRFdmVudExpc3RlbmVyID8gJ2FkZEV2ZW50TGlzdGVuZXInIDogJ2F0dGFjaEV2ZW50JztcbiAgICAgICAgY29uc3QgZXZlbnRlciA9IHdpbmRvd1tldmVudE1ldGhvZF07XG4gICAgICAgIGNvbnN0IG1lc3NhZ2VFdmVudCA9IGV2ZW50TWV0aG9kID09PSAnYXR0YWNoRXZlbnQnID8gJ29ubWVzc2FnZScgOiAnbWVzc2FnZSc7XG5cbiAgICAgICAgLy8gTGlzdGVuIHRvIG1lc3NhZ2UgZnJvbSBjaGlsZCB3aW5kb3dcbiAgICAgICAgZXZlbnRlcihtZXNzYWdlRXZlbnQsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBldmVudCA9IG5ldyBDdXN0b21FdmVudCh0aGlzLmV2ZW50VHlwZXNbZS5kYXRhLnR5cGVdLCB7ZGV0YWlsOiBlLmRhdGF9KTtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfSwgZmFsc2UpO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuZXZlbnRUeXBlcykubWFwKChldmVudEtleSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vbih0aGlzLmV2ZW50VHlwZXNbZXZlbnRLZXldKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYob3B0aW9ucy5wb3B1cEJhY2tncm91bmRDb2xvcikge1xuICAgICAgICAgICAgdGhpcy5jb25maWcucG9wdXBCYWNrZ3JvdW5kQ29sb3IgPSBvcHRpb25zLnBvcHVwQmFja2dyb3VuZENvbG9yO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmFkZEV2ZW50TGlzdGVuZXIodGhpcy5ldmVudFR5cGVzLkhJREVfUE9QVVAsIHRoaXMub25IaWRlRXZlbnQpO1xuXG4gICAgICAgIGlmICghdGhpcy5jb25maWcub25seVdpZGdldHMpIHtcblxuICAgICAgICAgICAgbGV0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zLnByb2plY3RJZCA9IG9wdGlvbnMucHJvamVjdElkO1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnJlZGlyZWN0X3VybCA9IHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmxvZ2luVXJsKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmxvZ2luX3VybCA9IHRoaXMuY29uZmlnLmxvZ2luVXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmNhbGxiYWNrVXJsKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmxvZ2luX3VybCA9IHRoaXMuY29uZmlnLmNhbGxiYWNrVXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybXMgbG9naW5cbiAgICAgKiBAcGFyYW0gcHJvcFxuICAgICAqIEBwYXJhbSBlcnJvciAtIGNhbGwgaW4gY2FzZSBlcnJvclxuICAgICAqIEBwYXJhbSBzdWNjZXNzXG4gICAgICovXG4gICAgbG9naW4ocHJvcCwgZXJyb3IsIHN1Y2Nlc3MpIHtcblxuICAgICAgICBpZiAoIXByb3AgfHwgIXRoaXMuc29jaWFsVXJscykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHByb3BzXG4gICAgICAgICAqIGF1dGhUeXBlOiBzbi08c29jaWFsIG5hbWU+LCBsb2dpbi1wYXNzLCBzbXNcbiAgICAgICAgICovXG4gICAgICAgIGlmIChwcm9wLmF1dGhUeXBlKSB7XG4gICAgICAgICAgICBpZiAocHJvcC5hdXRoVHlwZS5zdGFydHNXaXRoKCdzbi0nKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNvY2lhbFVybCA9IHRoaXMuc29jaWFsVXJsc1twcm9wLmF1dGhUeXBlXTtcbiAgICAgICAgICAgICAgICBpZiAoc29jaWFsVXJsICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHRoaXMuc29jaWFsVXJsc1twcm9wLmF1dGhUeXBlXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBdXRoIHR5cGU6ICcgKyBwcm9wLmF1dGhUeXBlICsgJyBkb2VzblxcJ3QgZXhpc3QnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnbG9naW4tcGFzcycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaS5sb2dpblBhc3NBdXRoKHByb3AubG9naW4sIHByb3AucGFzcywgcHJvcC5yZW1lbWJlck1lLCB0aGlzLmNvbmZpZy5yZWRpcmVjdFVybCwgKHJlcykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzLmxvZ2luX3VybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluaXNoQXV0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlcy5sb2dpbl91cmw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzKHtzdGF0dXM6ICdzdWNjZXNzJywgZmluaXNoOiBmaW5pc2hBdXRoLCByZWRpcmVjdFVybDogcmVzLmxvZ2luX3VybH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5pc2hBdXRoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcih0aGlzLmNyZWF0ZUVycm9yT2JqZWN0KCdMb2dpbiBvciBwYXNzIG5vdCB2YWxpZCcsIElOQ09SUkVDVF9MT0dJTl9PUl9QQVNTV09SRF9FUlJPUl9DT0RFKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ3NtcycpIHtcbiAgICAgICAgICAgICAgICBpZiAoc21zQXV0aFN0ZXAgPT0gJ3Bob25lJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwaS5zbXNBdXRoKHByb3AucGhvbmVOdW1iZXIsIG51bGwsIG51bGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc21zQXV0aFN0ZXAgPT0gJ2NvZGUnKSB7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gYXV0aCB0eXBlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjcmVhdGVFcnJvck9iamVjdChtZXNzYWdlLCBjb2RlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgY29kZTogY29kZSB8fCAtMVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBnZXRQcm9qZWN0SWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy5wcm9qZWN0SWQ7XG4gICAgfTtcblxuICAgIGdldFJlZGlyZWN0VVJMKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcucmVkaXJlY3RVcmw7XG4gICAgfTtcblxuICAgIGdldFRoZW1lKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcudGhlbWU7XG4gICAgfVxuXG4gICAgZ2V0Q2FsbGJhY2tVcmwoKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5jYWxsYmFja1VybCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLmNhbGxiYWNrVXJsO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLmV4dGVybmFsV2luZG93KSB7XG4gICAgICAgICAgICByZXR1cm4gREVGQVVMVF9DT05GSUcubG9naW5Vcmw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWcubG9naW5Vcmw7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZ2V0SWZyYW1lU3JjKG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBjb25zdCB3aWRnZXRCYXNlVXJsID0gb3B0aW9ucy53aWRnZXRCYXNlVXJsIHx8IHRoaXMuY29uZmlnLndpZGdldEJhc2VVcmw7XG5cbiAgICAgICAgY29uc3Qgcm91dGUgPSBvcHRpb25zLnJvdXRlIHx8IHRoaXMuY29uZmlnLnJvdXRlO1xuXG4gICAgICAgIGxldCBzcmMgPSB3aWRnZXRCYXNlVXJsICsgcm91dGUgKyAnP3Byb2plY3RJZD0nICsgdGhpcy5nZXRQcm9qZWN0SWQoKTtcblxuICAgICAgICBpZiAodGhpcy5jb25maWcubG9jYWxlKSB7XG4gICAgICAgICAgICBzcmMgPSBzcmMgKyAnJmxvY2FsZT0nICsgdGhpcy5jb25maWcubG9jYWxlO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5maWVsZHMpIHtcbiAgICAgICAgICAgIHNyYyA9IHNyYyArICcmZmllbGRzPScgKyB0aGlzLmNvbmZpZy5maWVsZHM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVkaXJlY3RVcmwgPSB0aGlzLmdldFJlZGlyZWN0VVJMKCk7XG4gICAgICAgIGlmIChyZWRpcmVjdFVybCkge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZyZWRpcmVjdFVybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHJlZGlyZWN0VXJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNhbGxiYWNrVXJsID0gdGhpcy5nZXRDYWxsYmFja1VybCgpO1xuXG4gICAgICAgIGlmIChjYWxsYmFja1VybCkge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZsb2dpbl91cmw9JyArIGVuY29kZVVSSUNvbXBvbmVudChjYWxsYmFja1VybCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0aGVtZSA9IHRoaXMuZ2V0VGhlbWUoKTtcbiAgICAgICAgaWYgKHRoZW1lKSB7XG4gICAgICAgICAgICBzcmMgPSBzcmMgKyAnJnRoZW1lPScgKyBlbmNvZGVVUklDb21wb25lbnQodGhlbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qge2V4dGVybmFsV2luZG93fSA9IHRoaXMuY29uZmlnO1xuICAgICAgICBpZiAoZXh0ZXJuYWxXaW5kb3cpIHtcbiAgICAgICAgICAgIHNyYyA9IHNyYyArICcmZXh0ZXJuYWxfd2luZG93PScgKyBlbmNvZGVVUklDb21wb25lbnQoZXh0ZXJuYWxXaW5kb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNyYztcbiAgICB9XG5cbiAgICBBdXRoV2lkZ2V0KGVsZW1lbnRJZCwgb3B0aW9ucykge1xuICAgICAgICBpZiAodGhpcy5hcGkpIHtcbiAgICAgICAgICAgIGlmICghZWxlbWVudElkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignTm8gZGl2IG5hbWUhJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gYCR7b3B0aW9ucy53aWR0aCB8fCA0MDB9cHhgO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IGAke29wdGlvbnMuaGVpZ2h0IHx8IDU1MH1weGA7XG5cbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUNoaWxkKHByZWxvYWRlcik7XG4gICAgICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdsb2FkJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLmZyYW1lQm9yZGVyID0gJzAnO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zcmMgPSB0aGlzLmdldElmcmFtZVNyYyhvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuaWQgPSBJRlJBTUVfSUQ7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBwcmVsb2FkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgICAgICAgICAgICAgIHByZWxvYWRlci5pbm5lckhUTUwgPSB0aGlzLmNvbmZpZy5wcmVsb2FkZXI7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbWVudElkKTtcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnN0eWxlLndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZENoaWxkKHByZWxvYWRlcik7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQod2lkZ2V0SWZyYW1lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFbGVtZW50IFxcXCInICsgZWxlbWVudElkICsgJ1xcXCIgbm90IGZvdW5kIScpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignUGxlYXNlIHJ1biBYTC5pbml0KCkgZmlyc3QnKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBvbkNsb3NlRXZlbnQoKSB7XG4gICAgICAgIHdpZGdldElmcmFtZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHdpZGdldElmcmFtZSk7XG4gICAgfVxuXG4gICAgX2hpZGUoKSB7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5wb3NpdGlvbiA9ICcnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuekluZGV4ID0gJyc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5sZWZ0ID0gJyc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS50b3AgPSAnJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnJztcbiAgICB9XG5cbiAgICBvbkhpZGVFdmVudCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmluRnVsbHNjcmVlbk1vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuX2hpZGUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGxpbmsgZXZlbnQgd2l0aCBoYW5kbGVyXG4gICAgICogQHBhcmFtIGV2ZW50XG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKi9cblxuICAgIG9uKGV2ZW50LCBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyIHx8IGZ1bmN0aW9uKCkge307XG5cbiAgICAgICAgaWYgKGV2ZW50ID09PSB0aGlzLmV2ZW50VHlwZXMuQ0xPU0UpIHtcbiAgICAgICAgICAgIGlmICghaGFuZGxlcikge1xuICAgICAgICAgICAgICAgIGhhbmRsZXIgPSB0aGlzLm9uQ2xvc2VFdmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCB0aGlzLm9uQ2xvc2VFdmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmRpc3BhdGNoZXIuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgKGUpID0+IGhhbmRsZXIoZS5kZXRhaWwpKTtcbiAgICB9O1xuXG4gICAgX3Nob3coKSB7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS56SW5kZXggPSB0aGlzLmNvbmZpZy5pZnJhbWVaSW5kZXg7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5sZWZ0ID0gJzAnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUudG9wID0gJzAnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSB0aGlzLmNvbmZpZy5wb3B1cEJhY2tncm91bmRDb2xvcjtcbiAgICAgICAgdGhpcy5jb25maWcuaW5GdWxsc2NyZWVuTW9kZSA9IHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogb3BlbiBmdWxsc3JlZW4gcG9wdXAgZm9yIHdpZGdldFxuICAgICAqL1xuXG4gICAgc2hvdygpIHtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5nZXRFbGVtZW50QnlJZChJRlJBTUVfSUQpKSB7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3JjID0gdGhpcy5nZXRJZnJhbWVTcmMoKTtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5pZCA9IElGUkFNRV9JRDtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5mcmFtZUJvcmRlciA9ICcwJztcblxuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2xvYWQnKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpc3BhdGNoZXIuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5fc2hvdygpO1xuXG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHdpZGdldElmcmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zaG93KCk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5jb25zdCByZXN1bHQgPSBuZXcgWEwoKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXN1bHQ7Il19
