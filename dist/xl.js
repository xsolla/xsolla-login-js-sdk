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
    apiUrl: '//login.xsolla.com/api/',
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
            HIDE_POPUP: 'hide popup'
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
            var messageEvent = eventMethod == 'attachEvent' ? 'onmessage' : 'message';

            // Listen to message from child window
            eventer(messageEvent, function (e) {
                var event = new CustomEvent(_this.eventTypes[e.data]);
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
                // Find closest ancestor with data-xl-auth attribute
                var findAncestor = function findAncestor(el) {
                    if (el.attributes['data-xl-auth']) {
                        return el;
                    }
                    var i = 0;
                    while ((el = el.parentElement) && !el.attributes['data-xl-auth'] && ++i < maxClickDepth) {}
                    return el;
                };

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

                var updateSocialLinks = function updateSocialLinks() {
                    _this.api.getSocialsURLs(function (response) {
                        _this.socialUrls = {};
                        for (var key in response) {
                            if (response.hasOwnProperty(key)) {
                                _this.socialUrls['sn-' + key] = response[key];
                            }
                        }
                    }, function (e) {
                        console.error(e);
                    }, params);
                };

                updateSocialLinks();
                setInterval(updateSocialLinks, 1000 * 60 * 59);

                var maxClickDepth = this.config.maxXLClickDepth;

                if (this.config.isMarkupSocialsHandlersEnabled) {
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
                                _this.login({ authType: nodeValue });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc3VwcG9ydHMuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUE7OztBQUdBLElBQUksQ0FBQyxPQUFPLFNBQVAsQ0FBaUIsVUFBdEIsRUFBa0M7QUFDOUIsV0FBTyxTQUFQLENBQWlCLFVBQWpCLEdBQThCLFVBQVMsWUFBVCxFQUF1QixRQUF2QixFQUFpQztBQUMzRCxtQkFBVyxZQUFZLENBQXZCO0FBQ0EsZUFBTyxLQUFLLE9BQUwsQ0FBYSxZQUFiLEVBQTJCLFFBQTNCLE1BQXlDLFFBQWhEO0FBQ0gsS0FIRDtBQUlIOztBQUVELElBQUssT0FBTyxPQUFPLFdBQWQsS0FBOEIsVUFBbkMsRUFBZ0Q7QUFBQSxRQUNuQyxXQURtQyxHQUM1QyxTQUFTLFdBQVQsQ0FBcUIsS0FBckIsRUFBNEIsTUFBNUIsRUFBb0M7QUFDaEMsaUJBQVMsVUFBVSxFQUFDLFNBQVMsS0FBVixFQUFpQixZQUFZLEtBQTdCLEVBQW9DLFFBQVEsU0FBNUMsRUFBbkI7QUFDQSxZQUFJLE1BQU0sU0FBUyxXQUFULENBQXFCLGFBQXJCLENBQVY7QUFDQSxZQUFJLGVBQUosQ0FBb0IsS0FBcEIsRUFBMkIsT0FBTyxPQUFsQyxFQUEyQyxPQUFPLFVBQWxELEVBQThELE9BQU8sTUFBckU7QUFDQSxlQUFPLEdBQVA7QUFDSCxLQU4yQzs7QUFRNUMsZ0JBQVksU0FBWixHQUF3QixPQUFPLEtBQVAsQ0FBYSxTQUFyQzs7QUFFQSxXQUFPLFdBQVAsR0FBcUIsV0FBckI7QUFDSDs7Ozs7QUNyQkQ7OztBQUdBOzs7Ozs7O0FBT0EsSUFBSSxRQUFRLFNBQVIsS0FBUSxDQUFVLFNBQVYsRUFBcUIsT0FBckIsRUFBOEI7QUFDdEMsUUFBSSxPQUFPLElBQVg7QUFDQSxTQUFLLE9BQUwsR0FBZSxXQUFXLHlCQUExQjs7QUFFQSxTQUFLLFNBQUwsR0FBaUIs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QUssTUFBTCxDQUFZLFlBQXhDO0FBQ0EseUJBQWEsS0FBYixDQUFtQixJQUFuQixHQUEwQixHQUExQjtBQUNBLHlCQUFhLEtBQWIsQ0FBbUIsR0FBbkIsR0FBeUIsR0FBekI7QUFDQSx5QkFBYSxLQUFiLENBQW1CLEtBQW5CLEdBQTJCLE1BQTNCO0FBQ0EseUJBQWEsS0FBYixDQUFtQixNQUFuQixHQUE0QixNQUE1QjtBQUNBLHlCQUFhLEtBQWIsQ0FBbUIsZUFBbkIsR0FBcUMsS0FBSyxNQUFMLENBQVksb0JBQWpEO0FBQ0EsaUJBQUssTUFBTCxDQUFZLGdCQUFaLEdBQStCLElBQS9CO0FBQ0g7O0FBRUQ7Ozs7OzsrQkFJTztBQUFBOztBQUNILGdCQUFJLENBQUMsU0FBUyxjQUFULENBQXdCLFNBQXhCLENBQUwsRUFBeUM7QUFDckMsNkJBQWEsR0FBYixHQUFtQixLQUFLLFlBQUwsRUFBbkI7QUFDQSw2QkFBYSxFQUFiLEdBQWtCLFNBQWxCO0FBQ0EsNkJBQWEsS0FBYixDQUFtQixLQUFuQixHQUEyQixDQUEzQjtBQUNBLDZCQUFhLEtBQWIsQ0FBbUIsTUFBbkIsR0FBNEIsQ0FBNUI7QUFDQSw2QkFBYSxXQUFiLEdBQTJCLEdBQTNCOztBQUVBLDZCQUFhLE1BQWIsR0FBc0IsWUFBTTtBQUN4Qix3QkFBSSxRQUFRLElBQUksV0FBSixDQUFnQixNQUFoQixDQUFaO0FBQ0EsMkJBQUssVUFBTCxDQUFnQixhQUFoQixDQUE4QixLQUE5QjtBQUNILGlCQUhEO0FBSUEscUJBQUssS0FBTDs7QUFFQSx5QkFBUyxJQUFULENBQWMsV0FBZCxDQUEwQixZQUExQjtBQUNILGFBZEQsTUFjTztBQUNILHFCQUFLLEtBQUw7QUFDSDtBQUNKOzs7Ozs7QUFHTCxJQUFNLFNBQVMsSUFBSSxFQUFKLEVBQWY7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLE1BQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMDcuMTEuMTYuXG4gKi9cbmlmICghU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoKSB7XG4gICAgU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoID0gZnVuY3Rpb24oc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikge1xuICAgICAgICBwb3NpdGlvbiA9IHBvc2l0aW9uIHx8IDA7XG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4T2Yoc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikgPT09IHBvc2l0aW9uO1xuICAgIH07XG59XG5cbmlmICggdHlwZW9mIHdpbmRvdy5DdXN0b21FdmVudCAhPT0gXCJmdW5jdGlvblwiICkge1xuICAgIGZ1bmN0aW9uIEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMpIHtcbiAgICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHtidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogZmFsc2UsIGRldGFpbDogdW5kZWZpbmVkfTtcbiAgICAgICAgdmFyIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdDdXN0b21FdmVudCcpO1xuICAgICAgICBldnQuaW5pdEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMuYnViYmxlcywgcGFyYW1zLmNhbmNlbGFibGUsIHBhcmFtcy5kZXRhaWwpO1xuICAgICAgICByZXR1cm4gZXZ0O1xuICAgIH1cblxuICAgIEN1c3RvbUV2ZW50LnByb3RvdHlwZSA9IHdpbmRvdy5FdmVudC5wcm90b3R5cGU7XG5cbiAgICB3aW5kb3cuQ3VzdG9tRXZlbnQgPSBDdXN0b21FdmVudDtcbn0iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuLyoqXG4gKiBJbXBlbGVtZW50cyBYc29sbGEgTG9naW4gQXBpXG4gKiBAcGFyYW0gcHJvamVjdElkIC0gcHJvamVjdCdzIHVuaXF1ZSBpZGVudGlmaWVyXG4gKiBAcGFyYW0gYmFzZVVybCAtIGFwaSBlbmRwb2ludFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxudmFyIFhMQXBpID0gZnVuY3Rpb24gKHByb2plY3RJZCwgYmFzZVVybCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmJhc2VVcmwgPSBiYXNlVXJsIHx8ICcvL2xvZ2luLnhzb2xsYS5jb20vYXBpLyc7XG5cbiAgICB0aGlzLnByb2plY3RJZCA9IHByb2plY3RJZDtcblxuICAgIHRoaXMubWFrZUFwaUNhbGwgPSBmdW5jdGlvbiAocGFyYW1zLCBzdWNjZXNzLCBlcnJvcikge1xuICAgICAgICB2YXIgciA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG4gICAgICAgIHIub3BlbihwYXJhbXMubWV0aG9kLCBzZWxmLmJhc2VVcmwgKyBwYXJhbXMuZW5kcG9pbnQsIHRydWUpO1xuICAgICAgICByLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgICAgICAgIGlmIChyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyhKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcih7ZXJyb3I6IHttZXNzYWdlOiAnTmV0d29ya2luZyBlcnJvcicsIGNvZGU6IHIuc3RhdHVzfX0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBpZiAocGFyYW1zLm1ldGhvZCA9PSAnUE9TVCcpIHtcbiAgICAgICAgICAgIHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwiKTtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMucG9zdEJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy5tZXRob2QgPT0gJ0dFVCcpIHtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMuZ2V0QXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuLyoqXG4gKiBHZXQgYWxsIGF2aWFsYWJsZSBzb2NpYWwgbWV0aG9kcyBhdXRoIHVybFxuICogQHBhcmFtIHN1Y2Nlc3MgLSBzdWNjZXNzIGNhbGxiYWNrXG4gKiBAcGFyYW0gZXJyb3IgLSBlcnJvciBjYWxsYmFja1xuICogQHBhcmFtIGdldEFyZ3VtZW50cyAtIGFkZGl0aW9uYWwgcGFyYW1zIHRvIHNlbmQgd2l0aCByZXF1ZXN0XG4gKi9cblhMQXBpLnByb3RvdHlwZS5nZXRTb2NpYWxzVVJMcyA9IGZ1bmN0aW9uIChzdWNjZXNzLCBlcnJvciwgZ2V0QXJndW1lbnRzKSB7XG4gICAgdmFyIHN0ciA9IFwiXCI7XG4gICAgZm9yICh2YXIga2V5IGluIGdldEFyZ3VtZW50cykge1xuICAgICAgICBpZiAoc3RyICE9IFwiXCIpIHtcbiAgICAgICAgICAgIHN0ciArPSBcIiZcIjtcbiAgICAgICAgfVxuICAgICAgICBzdHIgKz0ga2V5ICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoZ2V0QXJndW1lbnRzW2tleV0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ3NvY2lhbC9sb2dpbl91cmxzPycgKyBzdHIsIGdldEFyZ3VtZW50czogbnVsbH0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cblhMQXBpLnByb3RvdHlwZS5sb2dpblBhc3NBdXRoID0gZnVuY3Rpb24gKGxvZ2luLCBwYXNzLCByZW1lbWJlck1lLCByZWRpcmVjdFVybCwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICB2YXIgYm9keSA9IHtcbiAgICAgICAgdXNlcm5hbWU6IGxvZ2luLFxuICAgICAgICBwYXNzd29yZDogcGFzcyxcbiAgICAgICAgcmVtZW1iZXJfbWU6IHJlbWVtYmVyTWVcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdQT1NUJywgZW5kcG9pbnQ6ICdwcm94eS9sb2dpbj9wcm9qZWN0SWQ9Jyt0aGlzLnByb2plY3RJZCArICcmcmVkaXJlY3RfdXJsPScgKyBlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmwpLCBwb3N0Qm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSl9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUuc21zQXV0aCA9IGZ1bmN0aW9uIChwaG9uZU51bWJlciwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzbXMnLCBnZXRBcmd1bWVudHM6ICdwaG9uZU51bWJlcj0nICsgcGhvbmVOdW1iZXJ9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhMQXBpO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbnJlcXVpcmUoJy4vc3VwcG9ydHMnKTtcblxuaW1wb3J0IFhMQXBpIGZyb20gJy4veGxhcGknO1xuLyoqXG4gKiBDcmVhdGUgYW4gYEF1dGgwYCBpbnN0YW5jZSB3aXRoIGBvcHRpb25zYFxuICpcbiAqIEBjbGFzcyBYTFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxuY29uc3QgUk9VVEVTID0ge1xuICAgIExPR0lOOiAnJyxcbiAgICBSRUdJU1RSQVRJT046ICdyZWdpc3RyYXRpb24nLFxuICAgIFJFQ09WRVJfUEFTU1dPUkQ6ICdyZXNldC1wYXNzd29yZCcsXG4gICAgQUxMX1NPQ0lBTFM6ICdvdGhlcidcbn07XG5cbmNvbnN0IERFRkFVTFRfQ09ORklHID0ge1xuICAgIGVycm9ySGFuZGxlcjogZnVuY3Rpb24gKGEpIHtcbiAgICB9LFxuICAgIGxvZ2luUGFzc1ZhbGlkYXRvcjogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICBpc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQ6IGZhbHNlLFxuICAgIGFwaVVybDogJy8vbG9naW4ueHNvbGxhLmNvbS9hcGkvJyxcbiAgICBtYXhYTENsaWNrRGVwdGg6IDIwLFxuICAgIG9ubHlXaWRnZXRzOiBmYWxzZSxcbiAgICBwb3B1cEJhY2tncm91bmRDb2xvcjogJ3JnYigxODcsIDE4NywgMTg3KScsXG4gICAgaWZyYW1lWkluZGV4OiAxMDAwMDAwLFxuICAgIHRoZW1lOiAnYXBwLmRlZmF1bHQuY3NzJyxcbiAgICBwcmVsb2FkZXI6ICc8ZGl2PjwvZGl2PicsXG4gICAgd2lkZ2V0QmFzZVVybDogJ2h0dHBzOi8veGwtd2lkZ2V0Lnhzb2xsYS5jb20vJyxcbiAgICByb3V0ZTogUk9VVEVTLkxPR0lOLFxuICAgIGluRnVsbHNjcmVlbk1vZGU6IGZhbHNlXG59O1xuXG5jb25zdCBJTlZBTElEX0xPR0lOX0VSUk9SX0NPREUgPSAxO1xuY29uc3QgSU5DT1JSRUNUX0xPR0lOX09SX1BBU1NXT1JEX0VSUk9SX0NPREUgPSAyO1xuXG5jb25zdCBJRlJBTUVfSUQgPSAnWHNvbGxhTG9naW5XaWRnZXRJZnJhbWUnO1xuY29uc3Qgd2lkZ2V0SWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG5cbmNsYXNzIFhMIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5zb2NpYWxVcmxzID0ge307XG4gICAgICAgIHRoaXMuZXZlbnRUeXBlcyA9IHtcbiAgICAgICAgICAgIExPQUQ6ICdsb2FkJyxcbiAgICAgICAgICAgIENMT1NFOiAnY2xvc2UnLFxuICAgICAgICAgICAgSElERV9QT1BVUDogJ2hpZGUgcG9wdXAnXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gbmVlZCBmb3IgZXhwb3J0IHB1cnBvc2VzXG4gICAgICAgIHRoaXMuUk9VVEVTID0gUk9VVEVTO1xuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0aGlzLm9uSGlkZUV2ZW50ID0gdGhpcy5vbkhpZGVFdmVudC5iaW5kKHRoaXMpO1xuICAgIH1cblxuICAgIGluaXQob3B0aW9ucykge1xuICAgICAgICB0aGlzLmNvbmZpZyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfQ09ORklHLCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5jb25maWcucG9wdXBCYWNrZ3JvdW5kQ29sb3IgPSBERUZBVUxUX0NPTkZJRy5wb3B1cEJhY2tncm91bmRDb2xvcjtcbiAgICAgICAgdGhpcy5hcGkgPSBuZXcgWExBcGkob3B0aW9ucy5wcm9qZWN0SWQsIHRoaXMuY29uZmlnLmFwaVVybCk7XG5cbiAgICAgICAgY29uc3QgZXZlbnRNZXRob2QgPSB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciA/ICdhZGRFdmVudExpc3RlbmVyJyA6ICdhdHRhY2hFdmVudCc7XG4gICAgICAgIGNvbnN0IGV2ZW50ZXIgPSB3aW5kb3dbZXZlbnRNZXRob2RdO1xuICAgICAgICBjb25zdCBtZXNzYWdlRXZlbnQgPSBldmVudE1ldGhvZCA9PSAnYXR0YWNoRXZlbnQnID8gJ29ubWVzc2FnZScgOiAnbWVzc2FnZSc7XG5cbiAgICAgICAgLy8gTGlzdGVuIHRvIG1lc3NhZ2UgZnJvbSBjaGlsZCB3aW5kb3dcbiAgICAgICAgZXZlbnRlcihtZXNzYWdlRXZlbnQsIChlKSA9PiB7XG4gICAgICAgICAgICBsZXQgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQodGhpcy5ldmVudFR5cGVzW2UuZGF0YV0pO1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICB9LCBmYWxzZSk7XG5cbiAgICAgICAgT2JqZWN0LmtleXModGhpcy5ldmVudFR5cGVzKS5tYXAoKGV2ZW50S2V5KSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uKHRoaXMuZXZlbnRUeXBlc1tldmVudEtleV0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZihvcHRpb25zLnBvcHVwQmFja2dyb3VuZENvbG9yKSB7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZy5wb3B1cEJhY2tncm91bmRDb2xvciA9IG9wdGlvbnMucG9wdXBCYWNrZ3JvdW5kQ29sb3I7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmRpc3BhdGNoZXIuYWRkRXZlbnRMaXN0ZW5lcih0aGlzLmV2ZW50VHlwZXMuSElERV9QT1BVUCwgdGhpcy5vbkhpZGVFdmVudCk7XG5cbiAgICAgICAgaWYgKCF0aGlzLmNvbmZpZy5vbmx5V2lkZ2V0cykge1xuXG4gICAgICAgICAgICBsZXQgcGFyYW1zID0ge307XG4gICAgICAgICAgICBwYXJhbXMucHJvamVjdElkID0gb3B0aW9ucy5wcm9qZWN0SWQ7XG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcucmVkaXJlY3RVcmwpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMucmVkaXJlY3RfdXJsID0gdGhpcy5jb25maWcucmVkaXJlY3RVcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcubG9naW5VcmwpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMubG9naW5fdXJsID0gdGhpcy5jb25maWcubG9naW5Vcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuY2FsbGJhY2tVcmwpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMubG9naW5fdXJsID0gdGhpcy5jb25maWcuY2FsbGJhY2tVcmw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZVNvY2lhbExpbmtzID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBpLmdldFNvY2lhbHNVUkxzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNvY2lhbFVybHMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc29jaWFsVXJsc1snc24tJyArIGtleV0gPSByZXNwb25zZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICB9LCBwYXJhbXMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdXBkYXRlU29jaWFsTGlua3MoKTtcbiAgICAgICAgICAgIHNldEludGVydmFsKHVwZGF0ZVNvY2lhbExpbmtzLCAxMDAwICogNjAgKiA1OSk7XG5cbiAgICAgICAgICAgIGNvbnN0IG1heENsaWNrRGVwdGggPSB0aGlzLmNvbmZpZy5tYXhYTENsaWNrRGVwdGg7XG4gICAgICAgICAgICAvLyBGaW5kIGNsb3Nlc3QgYW5jZXN0b3Igd2l0aCBkYXRhLXhsLWF1dGggYXR0cmlidXRlXG4gICAgICAgICAgICBmdW5jdGlvbiBmaW5kQW5jZXN0b3IoZWwpIHtcbiAgICAgICAgICAgICAgICBpZiAoZWwuYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ10pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgICAgICAgICAgd2hpbGUgKChlbCA9IGVsLnBhcmVudEVsZW1lbnQpICYmICFlbC5hdHRyaWJ1dGVzWydkYXRhLXhsLWF1dGgnXSAmJiArK2kgPCBtYXhDbGlja0RlcHRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5pc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGZpbmRBbmNlc3RvcihlLnRhcmdldCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIERvIG5vdGhpbmcgaWYgY2xpY2sgd2FzIG91dHNpZGUgb2YgZWxlbWVudHMgd2l0aCBkYXRhLXhsLWF1dGhcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB4bERhdGEgPSB0YXJnZXQuYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ107XG4gICAgICAgICAgICAgICAgICAgIGlmICh4bERhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBub2RlVmFsdWUgPSB4bERhdGEubm9kZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGVWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9naW4oe2F1dGhUeXBlOiBub2RlVmFsdWV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybXMgbG9naW5cbiAgICAgKiBAcGFyYW0gcHJvcFxuICAgICAqIEBwYXJhbSBlcnJvciAtIGNhbGwgaW4gY2FzZSBlcnJvclxuICAgICAqIEBwYXJhbSBzdWNjZXNzXG4gICAgICovXG4gICAgbG9naW4ocHJvcCwgZXJyb3IsIHN1Y2Nlc3MpIHtcblxuICAgICAgICBpZiAoIXByb3AgfHwgIXRoaXMuc29jaWFsVXJscykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHByb3BzXG4gICAgICAgICAqIGF1dGhUeXBlOiBzbi08c29jaWFsIG5hbWU+LCBsb2dpbi1wYXNzLCBzbXNcbiAgICAgICAgICovXG4gICAgICAgIGlmIChwcm9wLmF1dGhUeXBlKSB7XG4gICAgICAgICAgICBpZiAocHJvcC5hdXRoVHlwZS5zdGFydHNXaXRoKCdzbi0nKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNvY2lhbFVybCA9IHRoaXMuc29jaWFsVXJsc1twcm9wLmF1dGhUeXBlXTtcbiAgICAgICAgICAgICAgICBpZiAoc29jaWFsVXJsICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHRoaXMuc29jaWFsVXJsc1twcm9wLmF1dGhUeXBlXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBdXRoIHR5cGU6ICcgKyBwcm9wLmF1dGhUeXBlICsgJyBkb2VzblxcJ3QgZXhpc3QnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnbG9naW4tcGFzcycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaS5sb2dpblBhc3NBdXRoKHByb3AubG9naW4sIHByb3AucGFzcywgcHJvcC5yZW1lbWJlck1lLCB0aGlzLmNvbmZpZy5yZWRpcmVjdFVybCwgKHJlcykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzLmxvZ2luX3VybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluaXNoQXV0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlcy5sb2dpbl91cmw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzKHtzdGF0dXM6ICdzdWNjZXNzJywgZmluaXNoOiBmaW5pc2hBdXRoLCByZWRpcmVjdFVybDogcmVzLmxvZ2luX3VybH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5pc2hBdXRoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcih0aGlzLmNyZWF0ZUVycm9yT2JqZWN0KCdMb2dpbiBvciBwYXNzIG5vdCB2YWxpZCcsIElOQ09SUkVDVF9MT0dJTl9PUl9QQVNTV09SRF9FUlJPUl9DT0RFKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ3NtcycpIHtcbiAgICAgICAgICAgICAgICBpZiAoc21zQXV0aFN0ZXAgPT0gJ3Bob25lJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwaS5zbXNBdXRoKHByb3AucGhvbmVOdW1iZXIsIG51bGwsIG51bGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc21zQXV0aFN0ZXAgPT0gJ2NvZGUnKSB7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gYXV0aCB0eXBlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjcmVhdGVFcnJvck9iamVjdChtZXNzYWdlLCBjb2RlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgY29kZTogY29kZSB8fCAtMVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBnZXRQcm9qZWN0SWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy5wcm9qZWN0SWQ7XG4gICAgfTtcblxuICAgIGdldFJlZGlyZWN0VVJMKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcucmVkaXJlY3RVcmw7XG4gICAgfTtcblxuICAgIGdldFRoZW1lKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcudGhlbWU7XG4gICAgfVxuXG4gICAgZ2V0Q2FsbGJhY2tVcmwoKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5sb2dpblVybCkgcmV0dXJuIHRoaXMuY29uZmlnLmxvZ2luVXJsO1xuICAgICAgICBlbHNlIHJldHVybiB0aGlzLmNvbmZpZy5jYWxsYmFja1VybFxuICAgIH07XG5cbiAgICBnZXRJZnJhbWVTcmMob3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGNvbnN0IHdpZGdldEJhc2VVcmwgPSBvcHRpb25zLndpZGdldEJhc2VVcmwgfHwgdGhpcy5jb25maWcud2lkZ2V0QmFzZVVybDtcblxuICAgICAgICBjb25zdCByb3V0ZSA9IG9wdGlvbnMucm91dGUgfHwgdGhpcy5jb25maWcucm91dGU7XG5cbiAgICAgICAgbGV0IHNyYyA9IHdpZGdldEJhc2VVcmwgKyByb3V0ZSArICc/cHJvamVjdElkPScgKyB0aGlzLmdldFByb2plY3RJZCgpO1xuXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5sb2NhbGUpIHtcbiAgICAgICAgICAgIHNyYyA9IHNyYyArICcmbG9jYWxlPScgKyB0aGlzLmNvbmZpZy5sb2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmZpZWxkcykge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZmaWVsZHM9JyArIHRoaXMuY29uZmlnLmZpZWxkcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZWRpcmVjdFVybCA9IHRoaXMuZ2V0UmVkaXJlY3RVUkwoKTtcbiAgICAgICAgaWYgKHJlZGlyZWN0VXJsKSB7XG4gICAgICAgICAgICBzcmMgPSBzcmMgKyAnJnJlZGlyZWN0VXJsPScgKyBlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmwpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2FsbGJhY2tVcmwgPSB0aGlzLmdldENhbGxiYWNrVXJsKCk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrVXJsKSB7XG4gICAgICAgICAgICBzcmMgPSBzcmMgKyAnJmxvZ2luX3VybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGNhbGxiYWNrVXJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRoZW1lID0gdGhpcy5nZXRUaGVtZSgpO1xuICAgICAgICBpZiAodGhlbWUpIHtcbiAgICAgICAgICAgIHNyYyA9IHNyYyArICcmdGhlbWU9JyArIGVuY29kZVVSSUNvbXBvbmVudCh0aGVtZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3JjO1xuICAgIH1cblxuICAgIEF1dGhXaWRnZXQoZWxlbWVudElkLCBvcHRpb25zKSB7XG4gICAgICAgIGlmICh0aGlzLmFwaSkge1xuICAgICAgICAgICAgaWYgKCFlbGVtZW50SWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdObyBkaXYgbmFtZSEnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBgJHtvcHRpb25zLndpZHRoIHx8IDQwMH1weGA7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gYCR7b3B0aW9ucy5oZWlnaHQgfHwgNTUwfXB4YDtcblxuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2hpbGQocHJlbG9hZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2xvYWQnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuZnJhbWVCb3JkZXIgPSAnMCc7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnNyYyA9IHRoaXMuZ2V0SWZyYW1lU3JjKG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5pZCA9IElGUkFNRV9JRDtcblxuXG5cbiAgICAgICAgICAgICAgICBjb25zdCBwcmVsb2FkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgICAgICAgICAgICAgIHByZWxvYWRlci5pbm5lckhUTUwgPSB0aGlzLmNvbmZpZy5wcmVsb2FkZXI7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbWVudElkKTtcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnN0eWxlLndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZENoaWxkKHByZWxvYWRlcik7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQod2lkZ2V0SWZyYW1lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFbGVtZW50IFxcXCInICsgZWxlbWVudElkICsgJ1xcXCIgbm90IGZvdW5kIScpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignUGxlYXNlIHJ1biBYTC5pbml0KCkgZmlyc3QnKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBvbkNsb3NlRXZlbnQoKSB7XG4gICAgICAgIHdpZGdldElmcmFtZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHdpZGdldElmcmFtZSk7XG4gICAgfVxuXG4gICAgX2hpZGUoKSB7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5wb3NpdGlvbiA9ICcnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuekluZGV4ID0gJyc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5sZWZ0ID0gJyc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS50b3AgPSAnJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnJztcbiAgICB9XG5cbiAgICBvbkhpZGVFdmVudCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmluRnVsbHNjcmVlbk1vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuX2hpZGUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGxpbmsgZXZlbnQgd2l0aCBoYW5kbGVyXG4gICAgICogQHBhcmFtIGV2ZW50XG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKi9cblxuICAgIG9uKGV2ZW50LCBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyIHx8IG51bGw7XG5cbiAgICAgICAgaWYgKGV2ZW50ID09PSB0aGlzLmV2ZW50VHlwZXMuQ0xPU0UpIHtcbiAgICAgICAgICAgIGlmICghaGFuZGxlcikge1xuICAgICAgICAgICAgICAgIGhhbmRsZXIgPSB0aGlzLm9uQ2xvc2VFdmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCB0aGlzLm9uQ2xvc2VFdmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmRpc3BhdGNoZXIuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlcik7XG4gICAgfTtcblxuICAgIF9zaG93KCkge1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuekluZGV4ID0gdGhpcy5jb25maWcuaWZyYW1lWkluZGV4O1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUubGVmdCA9ICcwJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnRvcCA9ICcwJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gdGhpcy5jb25maWcucG9wdXBCYWNrZ3JvdW5kQ29sb3I7XG4gICAgICAgIHRoaXMuY29uZmlnLmluRnVsbHNjcmVlbk1vZGUgPSB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIG9wZW4gZnVsbHNyZWVuIHBvcHVwIGZvciB3aWRnZXRcbiAgICAgKi9cblxuICAgIHNob3coKSB7XG4gICAgICAgIGlmICghZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoSUZSQU1FX0lEKSkge1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnNyYyA9IHRoaXMuZ2V0SWZyYW1lU3JjKCk7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuaWQgPSBJRlJBTUVfSUQ7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUud2lkdGggPSAwO1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuZnJhbWVCb3JkZXIgPSAnMCc7XG5cbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdsb2FkJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuX3Nob3coKTtcblxuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh3aWRnZXRJZnJhbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc2hvdygpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuY29uc3QgcmVzdWx0ID0gbmV3IFhMKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVzdWx0OyJdfQ==
