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
            REGISTRATION_REQUEST: 'registration request'
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
                var event = new CustomEvent(_this.eventTypes[e.data.type]);
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
            if (this.config.loginUrl) return this.config.loginUrl;else return this.config.callbackUrl;
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
            handler = handler || null;

            if (event === this.eventTypes.CLOSE) {
                if (!handler) {
                    handler = this.onCloseEvent;
                } else {
                    this.dispatcher.removeEventListener(event, this.onCloseEvent);
                }
            }

            this.dispatcher.addEventListener(event, handler);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc3VwcG9ydHMuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUE7OztBQUdBLElBQUksQ0FBQyxPQUFPLFNBQVAsQ0FBaUIsVUFBdEIsRUFBa0M7QUFDOUIsV0FBTyxTQUFQLENBQWlCLFVBQWpCLEdBQThCLFVBQVMsWUFBVCxFQUF1QixRQUF2QixFQUFpQztBQUMzRCxtQkFBVyxZQUFZLENBQXZCO0FBQ0EsZUFBTyxLQUFLLE9BQUwsQ0FBYSxZQUFiLEVBQTJCLFFBQTNCLE1BQXlDLFFBQWhEO0FBQ0gsS0FIRDtBQUlIOztBQUVELElBQUssT0FBTyxPQUFPLFdBQWQsS0FBOEIsVUFBbkMsRUFBZ0Q7QUFBQSxRQUNuQyxXQURtQyxHQUM1QyxTQUFTLFdBQVQsQ0FBcUIsS0FBckIsRUFBNEIsTUFBNUIsRUFBb0M7QUFDaEMsaUJBQVMsVUFBVSxFQUFDLFNBQVMsS0FBVixFQUFpQixZQUFZLEtBQTdCLEVBQW9DLFFBQVEsU0FBNUMsRUFBbkI7QUFDQSxZQUFJLE1BQU0sU0FBUyxXQUFULENBQXFCLGFBQXJCLENBQVY7QUFDQSxZQUFJLGVBQUosQ0FBb0IsS0FBcEIsRUFBMkIsT0FBTyxPQUFsQyxFQUEyQyxPQUFPLFVBQWxELEVBQThELE9BQU8sTUFBckU7QUFDQSxlQUFPLEdBQVA7QUFDSCxLQU4yQzs7QUFRNUMsZ0JBQVksU0FBWixHQUF3QixPQUFPLEtBQVAsQ0FBYSxTQUFyQzs7QUFFQSxXQUFPLFdBQVAsR0FBcUIsV0FBckI7QUFDSDs7Ozs7QUNyQkQ7OztBQUdBOzs7Ozs7O0FBT0EsSUFBSSxRQUFRLFNBQVIsS0FBUSxDQUFVLFNBQVYsRUFBcUIsT0FBckIsRUFBOEI7QUFDdEMsUUFBSSxPQUFPLElBQVg7QUFDQSxTQUFLLE9BQUwsR0FBZSxXQUFXLHlCQUExQjs7QUFFQSxTQUFLLFNBQUwsR0FBaUIs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QTNCO0FBQ0EseUJBQWEsS0FBYixDQUFtQixNQUFuQixHQUE0QixNQUE1QjtBQUNBLHlCQUFhLEtBQWIsQ0FBbUIsZUFBbkIsR0FBcUMsS0FBSyxNQUFMLENBQVksb0JBQWpEO0FBQ0EsaUJBQUssTUFBTCxDQUFZLGdCQUFaLEdBQStCLElBQS9CO0FBQ0g7O0FBRUQ7Ozs7OzsrQkFJTztBQUFBOztBQUNILGdCQUFJLENBQUMsU0FBUyxjQUFULENBQXdCLFNBQXhCLENBQUwsRUFBeUM7QUFDckMsNkJBQWEsR0FBYixHQUFtQixLQUFLLFlBQUwsRUFBbkI7QUFDQSw2QkFBYSxFQUFiLEdBQWtCLFNBQWxCO0FBQ0EsNkJBQWEsS0FBYixDQUFtQixLQUFuQixHQUEyQixDQUEzQjtBQUNBLDZCQUFhLEtBQWIsQ0FBbUIsTUFBbkIsR0FBNEIsQ0FBNUI7QUFDQSw2QkFBYSxXQUFiLEdBQTJCLEdBQTNCOztBQUVBLDZCQUFhLE1BQWIsR0FBc0IsWUFBTTtBQUN4Qix3QkFBSSxRQUFRLElBQUksV0FBSixDQUFnQixNQUFoQixDQUFaO0FBQ0EsMkJBQUssVUFBTCxDQUFnQixhQUFoQixDQUE4QixLQUE5QjtBQUNILGlCQUhEO0FBSUEscUJBQUssS0FBTDs7QUFFQSx5QkFBUyxJQUFULENBQWMsV0FBZCxDQUEwQixZQUExQjtBQUNILGFBZEQsTUFjTztBQUNILHFCQUFLLEtBQUw7QUFDSDtBQUNKOzs7Ozs7QUFHTCxJQUFNLFNBQVMsSUFBSSxFQUFKLEVBQWY7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLE1BQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMDcuMTEuMTYuXG4gKi9cbmlmICghU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoKSB7XG4gICAgU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoID0gZnVuY3Rpb24oc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikge1xuICAgICAgICBwb3NpdGlvbiA9IHBvc2l0aW9uIHx8IDA7XG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4T2Yoc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikgPT09IHBvc2l0aW9uO1xuICAgIH07XG59XG5cbmlmICggdHlwZW9mIHdpbmRvdy5DdXN0b21FdmVudCAhPT0gXCJmdW5jdGlvblwiICkge1xuICAgIGZ1bmN0aW9uIEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMpIHtcbiAgICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHtidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogZmFsc2UsIGRldGFpbDogdW5kZWZpbmVkfTtcbiAgICAgICAgdmFyIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdDdXN0b21FdmVudCcpO1xuICAgICAgICBldnQuaW5pdEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMuYnViYmxlcywgcGFyYW1zLmNhbmNlbGFibGUsIHBhcmFtcy5kZXRhaWwpO1xuICAgICAgICByZXR1cm4gZXZ0O1xuICAgIH1cblxuICAgIEN1c3RvbUV2ZW50LnByb3RvdHlwZSA9IHdpbmRvdy5FdmVudC5wcm90b3R5cGU7XG5cbiAgICB3aW5kb3cuQ3VzdG9tRXZlbnQgPSBDdXN0b21FdmVudDtcbn0iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuLyoqXG4gKiBJbXBlbGVtZW50cyBYc29sbGEgTG9naW4gQXBpXG4gKiBAcGFyYW0gcHJvamVjdElkIC0gcHJvamVjdCdzIHVuaXF1ZSBpZGVudGlmaWVyXG4gKiBAcGFyYW0gYmFzZVVybCAtIGFwaSBlbmRwb2ludFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxudmFyIFhMQXBpID0gZnVuY3Rpb24gKHByb2plY3RJZCwgYmFzZVVybCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmJhc2VVcmwgPSBiYXNlVXJsIHx8ICcvL2xvZ2luLnhzb2xsYS5jb20vYXBpLyc7XG5cbiAgICB0aGlzLnByb2plY3RJZCA9IHByb2plY3RJZDtcblxuICAgIHRoaXMubWFrZUFwaUNhbGwgPSBmdW5jdGlvbiAocGFyYW1zLCBzdWNjZXNzLCBlcnJvcikge1xuICAgICAgICB2YXIgciA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG4gICAgICAgIHIub3BlbihwYXJhbXMubWV0aG9kLCBzZWxmLmJhc2VVcmwgKyBwYXJhbXMuZW5kcG9pbnQsIHRydWUpO1xuICAgICAgICByLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgICAgICAgIGlmIChyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyhKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcih7ZXJyb3I6IHttZXNzYWdlOiAnTmV0d29ya2luZyBlcnJvcicsIGNvZGU6IHIuc3RhdHVzfX0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBpZiAocGFyYW1zLm1ldGhvZCA9PSAnUE9TVCcpIHtcbiAgICAgICAgICAgIHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwiKTtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMucG9zdEJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy5tZXRob2QgPT0gJ0dFVCcpIHtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMuZ2V0QXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuLyoqXG4gKiBHZXQgYWxsIGF2aWFsYWJsZSBzb2NpYWwgbWV0aG9kcyBhdXRoIHVybFxuICogQHBhcmFtIHN1Y2Nlc3MgLSBzdWNjZXNzIGNhbGxiYWNrXG4gKiBAcGFyYW0gZXJyb3IgLSBlcnJvciBjYWxsYmFja1xuICogQHBhcmFtIGdldEFyZ3VtZW50cyAtIGFkZGl0aW9uYWwgcGFyYW1zIHRvIHNlbmQgd2l0aCByZXF1ZXN0XG4gKi9cblhMQXBpLnByb3RvdHlwZS5nZXRTb2NpYWxzVVJMcyA9IGZ1bmN0aW9uIChzdWNjZXNzLCBlcnJvciwgZ2V0QXJndW1lbnRzKSB7XG4gICAgdmFyIHN0ciA9IFwiXCI7XG4gICAgZm9yICh2YXIga2V5IGluIGdldEFyZ3VtZW50cykge1xuICAgICAgICBpZiAoc3RyICE9IFwiXCIpIHtcbiAgICAgICAgICAgIHN0ciArPSBcIiZcIjtcbiAgICAgICAgfVxuICAgICAgICBzdHIgKz0ga2V5ICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoZ2V0QXJndW1lbnRzW2tleV0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ3NvY2lhbC9sb2dpbl91cmxzPycgKyBzdHIsIGdldEFyZ3VtZW50czogbnVsbH0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cblhMQXBpLnByb3RvdHlwZS5sb2dpblBhc3NBdXRoID0gZnVuY3Rpb24gKGxvZ2luLCBwYXNzLCByZW1lbWJlck1lLCByZWRpcmVjdFVybCwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICB2YXIgYm9keSA9IHtcbiAgICAgICAgdXNlcm5hbWU6IGxvZ2luLFxuICAgICAgICBwYXNzd29yZDogcGFzcyxcbiAgICAgICAgcmVtZW1iZXJfbWU6IHJlbWVtYmVyTWVcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdQT1NUJywgZW5kcG9pbnQ6ICdwcm94eS9sb2dpbj9wcm9qZWN0SWQ9Jyt0aGlzLnByb2plY3RJZCArICcmcmVkaXJlY3RfdXJsPScgKyBlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmwpLCBwb3N0Qm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSl9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUuc21zQXV0aCA9IGZ1bmN0aW9uIChwaG9uZU51bWJlciwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzbXMnLCBnZXRBcmd1bWVudHM6ICdwaG9uZU51bWJlcj0nICsgcGhvbmVOdW1iZXJ9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhMQXBpO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbnJlcXVpcmUoJy4vc3VwcG9ydHMnKTtcblxuaW1wb3J0IFhMQXBpIGZyb20gJy4veGxhcGknO1xuLyoqXG4gKiBDcmVhdGUgYW4gYEF1dGgwYCBpbnN0YW5jZSB3aXRoIGBvcHRpb25zYFxuICpcbiAqIEBjbGFzcyBYTFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxuY29uc3QgUk9VVEVTID0ge1xuICAgIExPR0lOOiAnJyxcbiAgICBSRUdJU1RSQVRJT046ICdyZWdpc3RyYXRpb24nLFxuICAgIFJFQ09WRVJfUEFTU1dPUkQ6ICdyZXNldC1wYXNzd29yZCcsXG4gICAgQUxMX1NPQ0lBTFM6ICdvdGhlcidcbn07XG5cbmNvbnN0IERFRkFVTFRfQ09ORklHID0ge1xuICAgIGVycm9ySGFuZGxlcjogZnVuY3Rpb24gKGEpIHtcbiAgICB9LFxuICAgIGxvZ2luUGFzc1ZhbGlkYXRvcjogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICBpc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQ6IGZhbHNlLFxuICAgIGFwaVVybDogJ2h0dHBzOi8vbG9naW4ueHNvbGxhLmNvbS9hcGkvJyxcbiAgICBtYXhYTENsaWNrRGVwdGg6IDIwLFxuICAgIG9ubHlXaWRnZXRzOiBmYWxzZSxcbiAgICBwb3B1cEJhY2tncm91bmRDb2xvcjogJ3JnYigxODcsIDE4NywgMTg3KScsXG4gICAgaWZyYW1lWkluZGV4OiAxMDAwMDAwLFxuICAgIHRoZW1lOiAnYXBwLmRlZmF1bHQuY3NzJyxcbiAgICBwcmVsb2FkZXI6ICc8ZGl2PjwvZGl2PicsXG4gICAgd2lkZ2V0QmFzZVVybDogJ2h0dHBzOi8veGwtd2lkZ2V0Lnhzb2xsYS5jb20vJyxcbiAgICByb3V0ZTogUk9VVEVTLkxPR0lOLFxuICAgIGluRnVsbHNjcmVlbk1vZGU6IGZhbHNlXG59O1xuXG5jb25zdCBJTlZBTElEX0xPR0lOX0VSUk9SX0NPREUgPSAxO1xuY29uc3QgSU5DT1JSRUNUX0xPR0lOX09SX1BBU1NXT1JEX0VSUk9SX0NPREUgPSAyO1xuXG5jb25zdCBJRlJBTUVfSUQgPSAnWHNvbGxhTG9naW5XaWRnZXRJZnJhbWUnO1xuY29uc3Qgd2lkZ2V0SWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG5cbmNsYXNzIFhMIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5zb2NpYWxVcmxzID0ge307XG4gICAgICAgIHRoaXMuZXZlbnRUeXBlcyA9IHtcbiAgICAgICAgICAgIExPQUQ6ICdsb2FkJyxcbiAgICAgICAgICAgIENMT1NFOiAnY2xvc2UnLFxuICAgICAgICAgICAgSElERV9QT1BVUDogJ2hpZGUgcG9wdXAnLFxuICAgICAgICAgICAgUkVHSVNUUkFUSU9OX1JFUVVFU1Q6ICdyZWdpc3RyYXRpb24gcmVxdWVzdCdcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBuZWVkIGZvciBleHBvcnQgcHVycG9zZXNcbiAgICAgICAgdGhpcy5ST1VURVMgPSBST1VURVM7XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHRoaXMub25IaWRlRXZlbnQgPSB0aGlzLm9uSGlkZUV2ZW50LmJpbmQodGhpcyk7XG4gICAgfVxuXG4gICAgaW5pdChvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuY29uZmlnID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9DT05GSUcsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLmNvbmZpZy5wb3B1cEJhY2tncm91bmRDb2xvciA9IERFRkFVTFRfQ09ORklHLnBvcHVwQmFja2dyb3VuZENvbG9yO1xuICAgICAgICB0aGlzLmFwaSA9IG5ldyBYTEFwaShvcHRpb25zLnByb2plY3RJZCwgdGhpcy5jb25maWcuYXBpVXJsKTtcblxuICAgICAgICBjb25zdCBldmVudE1ldGhvZCA9IHdpbmRvdy5hZGRFdmVudExpc3RlbmVyID8gJ2FkZEV2ZW50TGlzdGVuZXInIDogJ2F0dGFjaEV2ZW50JztcbiAgICAgICAgY29uc3QgZXZlbnRlciA9IHdpbmRvd1tldmVudE1ldGhvZF07XG4gICAgICAgIGNvbnN0IG1lc3NhZ2VFdmVudCA9IGV2ZW50TWV0aG9kID09PSAnYXR0YWNoRXZlbnQnID8gJ29ubWVzc2FnZScgOiAnbWVzc2FnZSc7XG5cbiAgICAgICAgLy8gTGlzdGVuIHRvIG1lc3NhZ2UgZnJvbSBjaGlsZCB3aW5kb3dcbiAgICAgICAgZXZlbnRlcihtZXNzYWdlRXZlbnQsIChlKSA9PiB7XG4gICAgICAgICAgICBsZXQgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQodGhpcy5ldmVudFR5cGVzW2UuZGF0YS50eXBlXSk7XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoZXIuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLmV2ZW50VHlwZXMpLm1hcCgoZXZlbnRLZXkpID0+IHtcbiAgICAgICAgICAgIHRoaXMub24odGhpcy5ldmVudFR5cGVzW2V2ZW50S2V5XSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmKG9wdGlvbnMucG9wdXBCYWNrZ3JvdW5kQ29sb3IpIHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLnBvcHVwQmFja2dyb3VuZENvbG9yID0gb3B0aW9ucy5wb3B1cEJhY2tncm91bmRDb2xvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hlci5hZGRFdmVudExpc3RlbmVyKHRoaXMuZXZlbnRUeXBlcy5ISURFX1BPUFVQLCB0aGlzLm9uSGlkZUV2ZW50KTtcblxuICAgICAgICBpZiAoIXRoaXMuY29uZmlnLm9ubHlXaWRnZXRzKSB7XG5cbiAgICAgICAgICAgIGxldCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHBhcmFtcy5wcm9qZWN0SWQgPSBvcHRpb25zLnByb2plY3RJZDtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5yZWRpcmVjdFVybCkge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5yZWRpcmVjdF91cmwgPSB0aGlzLmNvbmZpZy5yZWRpcmVjdFVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5sb2dpblVybCkge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5sb2dpbl91cmwgPSB0aGlzLmNvbmZpZy5sb2dpblVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5jYWxsYmFja1VybCkge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5sb2dpbl91cmwgPSB0aGlzLmNvbmZpZy5jYWxsYmFja1VybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm1zIGxvZ2luXG4gICAgICogQHBhcmFtIHByb3BcbiAgICAgKiBAcGFyYW0gZXJyb3IgLSBjYWxsIGluIGNhc2UgZXJyb3JcbiAgICAgKiBAcGFyYW0gc3VjY2Vzc1xuICAgICAqL1xuICAgIGxvZ2luKHByb3AsIGVycm9yLCBzdWNjZXNzKSB7XG5cbiAgICAgICAgaWYgKCFwcm9wIHx8ICF0aGlzLnNvY2lhbFVybHMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBwcm9wc1xuICAgICAgICAgKiBhdXRoVHlwZTogc24tPHNvY2lhbCBuYW1lPiwgbG9naW4tcGFzcywgc21zXG4gICAgICAgICAqL1xuICAgICAgICBpZiAocHJvcC5hdXRoVHlwZSkge1xuICAgICAgICAgICAgaWYgKHByb3AuYXV0aFR5cGUuc3RhcnRzV2l0aCgnc24tJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzb2NpYWxVcmwgPSB0aGlzLnNvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICAgICAgaWYgKHNvY2lhbFVybCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB0aGlzLnNvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQXV0aCB0eXBlOiAnICsgcHJvcC5hdXRoVHlwZSArICcgZG9lc25cXCd0IGV4aXN0Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ2xvZ2luLXBhc3MnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGkubG9naW5QYXNzQXV0aChwcm9wLmxvZ2luLCBwcm9wLnBhc3MsIHByb3AucmVtZW1iZXJNZSwgdGhpcy5jb25maWcucmVkaXJlY3RVcmwsIChyZXMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcy5sb2dpbl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbmlzaEF1dGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXMubG9naW5fdXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzcyh7c3RhdHVzOiAnc3VjY2VzcycsIGZpbmlzaDogZmluaXNoQXV0aCwgcmVkaXJlY3RVcmw6IHJlcy5sb2dpbl91cmx9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluaXNoQXV0aCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IodGhpcy5jcmVhdGVFcnJvck9iamVjdCgnTG9naW4gb3IgcGFzcyBub3QgdmFsaWQnLCBJTkNPUlJFQ1RfTE9HSU5fT1JfUEFTU1dPUkRfRVJST1JfQ09ERSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wLmF1dGhUeXBlID09ICdzbXMnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNtc0F1dGhTdGVwID09ICdwaG9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcGkuc21zQXV0aChwcm9wLnBob25lTnVtYmVyLCBudWxsLCBudWxsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNtc0F1dGhTdGVwID09ICdjb2RlJykge1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmtub3duIGF1dGggdHlwZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY3JlYXRlRXJyb3JPYmplY3QobWVzc2FnZSwgY29kZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIGNvZGU6IGNvZGUgfHwgLTFcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgZ2V0UHJvamVjdElkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcucHJvamVjdElkO1xuICAgIH07XG5cbiAgICBnZXRSZWRpcmVjdFVSTCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsO1xuICAgIH07XG5cbiAgICBnZXRUaGVtZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLnRoZW1lO1xuICAgIH1cblxuICAgIGdldENhbGxiYWNrVXJsKCkge1xuICAgICAgICBpZiAodGhpcy5jb25maWcubG9naW5VcmwpIHJldHVybiB0aGlzLmNvbmZpZy5sb2dpblVybDtcbiAgICAgICAgZWxzZSByZXR1cm4gdGhpcy5jb25maWcuY2FsbGJhY2tVcmxcbiAgICB9O1xuXG4gICAgZ2V0SWZyYW1lU3JjKG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBjb25zdCB3aWRnZXRCYXNlVXJsID0gb3B0aW9ucy53aWRnZXRCYXNlVXJsIHx8IHRoaXMuY29uZmlnLndpZGdldEJhc2VVcmw7XG5cbiAgICAgICAgY29uc3Qgcm91dGUgPSBvcHRpb25zLnJvdXRlIHx8IHRoaXMuY29uZmlnLnJvdXRlO1xuXG4gICAgICAgIGxldCBzcmMgPSB3aWRnZXRCYXNlVXJsICsgcm91dGUgKyAnP3Byb2plY3RJZD0nICsgdGhpcy5nZXRQcm9qZWN0SWQoKTtcblxuICAgICAgICBpZiAodGhpcy5jb25maWcubG9jYWxlKSB7XG4gICAgICAgICAgICBzcmMgPSBzcmMgKyAnJmxvY2FsZT0nICsgdGhpcy5jb25maWcubG9jYWxlO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5maWVsZHMpIHtcbiAgICAgICAgICAgIHNyYyA9IHNyYyArICcmZmllbGRzPScgKyB0aGlzLmNvbmZpZy5maWVsZHM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVkaXJlY3RVcmwgPSB0aGlzLmdldFJlZGlyZWN0VVJMKCk7XG4gICAgICAgIGlmIChyZWRpcmVjdFVybCkge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZyZWRpcmVjdFVybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHJlZGlyZWN0VXJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNhbGxiYWNrVXJsID0gdGhpcy5nZXRDYWxsYmFja1VybCgpO1xuXG4gICAgICAgIGlmIChjYWxsYmFja1VybCkge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZsb2dpbl91cmw9JyArIGVuY29kZVVSSUNvbXBvbmVudChjYWxsYmFja1VybCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0aGVtZSA9IHRoaXMuZ2V0VGhlbWUoKTtcbiAgICAgICAgaWYgKHRoZW1lKSB7XG4gICAgICAgICAgICBzcmMgPSBzcmMgKyAnJnRoZW1lPScgKyBlbmNvZGVVUklDb21wb25lbnQodGhlbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNyYztcbiAgICB9XG5cbiAgICBBdXRoV2lkZ2V0KGVsZW1lbnRJZCwgb3B0aW9ucykge1xuICAgICAgICBpZiAodGhpcy5hcGkpIHtcbiAgICAgICAgICAgIGlmICghZWxlbWVudElkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignTm8gZGl2IG5hbWUhJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gYCR7b3B0aW9ucy53aWR0aCB8fCA0MDB9cHhgO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IGAke29wdGlvbnMuaGVpZ2h0IHx8IDU1MH1weGA7XG5cbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUNoaWxkKHByZWxvYWRlcik7XG4gICAgICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdsb2FkJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLmZyYW1lQm9yZGVyID0gJzAnO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zcmMgPSB0aGlzLmdldElmcmFtZVNyYyhvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuaWQgPSBJRlJBTUVfSUQ7XG5cblxuXG4gICAgICAgICAgICAgICAgY29uc3QgcHJlbG9hZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICAgICAgICAgICAgICBwcmVsb2FkZXIuaW5uZXJIVE1MID0gdGhpcy5jb25maWcucHJlbG9hZGVyO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW1lbnRJZCk7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zdHlsZS53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnN0eWxlLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZChwcmVsb2FkZXIpO1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZENoaWxkKHdpZGdldElmcmFtZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRWxlbWVudCBcXFwiJyArIGVsZW1lbnRJZCArICdcXFwiIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1BsZWFzZSBydW4gWEwuaW5pdCgpIGZpcnN0Jyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgb25DbG9zZUV2ZW50KCkge1xuICAgICAgICB3aWRnZXRJZnJhbWUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh3aWRnZXRJZnJhbWUpO1xuICAgIH1cblxuICAgIF9oaWRlKCkge1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUucG9zaXRpb24gPSAnJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnpJbmRleCA9ICcnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUubGVmdCA9ICcnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUudG9wID0gJyc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5oZWlnaHQgPSAwO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyc7XG4gICAgfVxuXG4gICAgb25IaWRlRXZlbnQoKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5pbkZ1bGxzY3JlZW5Nb2RlKSB7XG4gICAgICAgICAgICB0aGlzLl9oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBsaW5rIGV2ZW50IHdpdGggaGFuZGxlclxuICAgICAqIEBwYXJhbSBldmVudFxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICovXG5cbiAgICBvbihldmVudCwgaGFuZGxlcikge1xuICAgICAgICBoYW5kbGVyID0gaGFuZGxlciB8fCBudWxsO1xuXG4gICAgICAgIGlmIChldmVudCA9PT0gdGhpcy5ldmVudFR5cGVzLkNMT1NFKSB7XG4gICAgICAgICAgICBpZiAoIWhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBoYW5kbGVyID0gdGhpcy5vbkNsb3NlRXZlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRpc3BhdGNoZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgdGhpcy5vbkNsb3NlRXZlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGhhbmRsZXIpO1xuICAgIH07XG5cbiAgICBfc2hvdygpIHtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnpJbmRleCA9IHRoaXMuY29uZmlnLmlmcmFtZVpJbmRleDtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmxlZnQgPSAnMCc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS50b3AgPSAnMCc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHRoaXMuY29uZmlnLnBvcHVwQmFja2dyb3VuZENvbG9yO1xuICAgICAgICB0aGlzLmNvbmZpZy5pbkZ1bGxzY3JlZW5Nb2RlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBvcGVuIGZ1bGxzcmVlbiBwb3B1cCBmb3Igd2lkZ2V0XG4gICAgICovXG5cbiAgICBzaG93KCkge1xuICAgICAgICBpZiAoIWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKElGUkFNRV9JRCkpIHtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zcmMgPSB0aGlzLmdldElmcmFtZVNyYygpO1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLmlkID0gSUZSQU1FX0lEO1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5oZWlnaHQgPSAwO1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLmZyYW1lQm9yZGVyID0gJzAnO1xuXG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBldmVudCA9IG5ldyBDdXN0b21FdmVudCgnbG9hZCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLl9zaG93KCk7XG5cbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQod2lkZ2V0SWZyYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3Nob3coKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmNvbnN0IHJlc3VsdCA9IG5ldyBYTCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlc3VsdDsiXX0=
