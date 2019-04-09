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
    route: ROUTES.LOGIN
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
            this._hide();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc3VwcG9ydHMuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUE7OztBQUdBLElBQUksQ0FBQyxPQUFPLFNBQVAsQ0FBaUIsVUFBdEIsRUFBa0M7QUFDOUIsV0FBTyxTQUFQLENBQWlCLFVBQWpCLEdBQThCLFVBQVMsWUFBVCxFQUF1QixRQUF2QixFQUFpQztBQUMzRCxtQkFBVyxZQUFZLENBQXZCO0FBQ0EsZUFBTyxLQUFLLE9BQUwsQ0FBYSxZQUFiLEVBQTJCLFFBQTNCLE1BQXlDLFFBQWhEO0FBQ0gsS0FIRDtBQUlIOztBQUVELElBQUssT0FBTyxPQUFPLFdBQWQsS0FBOEIsVUFBbkMsRUFBZ0Q7QUFBQSxRQUNuQyxXQURtQyxHQUM1QyxTQUFTLFdBQVQsQ0FBcUIsS0FBckIsRUFBNEIsTUFBNUIsRUFBb0M7QUFDaEMsaUJBQVMsVUFBVSxFQUFDLFNBQVMsS0FBVixFQUFpQixZQUFZLEtBQTdCLEVBQW9DLFFBQVEsU0FBNUMsRUFBbkI7QUFDQSxZQUFJLE1BQU0sU0FBUyxXQUFULENBQXFCLGFBQXJCLENBQVY7QUFDQSxZQUFJLGVBQUosQ0FBb0IsS0FBcEIsRUFBMkIsT0FBTyxPQUFsQyxFQUEyQyxPQUFPLFVBQWxELEVBQThELE9BQU8sTUFBckU7QUFDQSxlQUFPLEdBQVA7QUFDSCxLQU4yQzs7QUFRNUMsZ0JBQVksU0FBWixHQUF3QixPQUFPLEtBQVAsQ0FBYSxTQUFyQzs7QUFFQSxXQUFPLFdBQVAsR0FBcUIsV0FBckI7QUFDSDs7Ozs7QUNyQkQ7OztBQUdBOzs7Ozs7O0FBT0EsSUFBSSxRQUFRLFNBQVIsS0FBUSxDQUFVLFNBQVYsRUFBcUIsT0FBckIsRUFBOEI7QUFDdEMsUUFBSSxPQUFPLElBQVg7QUFDQSxTQUFLLE9BQUwsR0FBZSxXQUFXLHlCQUExQjs7QUFFQSxTQUFLLFNBQUwsR0FBaUIs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QkFBYSxLQUFiLENBQW1CLEdBQW5CLEdBQXlCLEdBQXpCO0FBQ0EseUJBQWEsS0FBYixDQUFtQixLQUFuQixHQUEyQixNQUEzQjtBQUNBLHlCQUFhLEtBQWIsQ0FBbUIsTUFBbkIsR0FBNEIsTUFBNUI7QUFDQSx5QkFBYSxLQUFiLENBQW1CLGVBQW5CLEdBQXFDLEtBQUssTUFBTCxDQUFZLG9CQUFqRDtBQUNIOztBQUVEOzs7Ozs7K0JBSU87QUFBQTs7QUFDSCxnQkFBSSxDQUFDLFNBQVMsY0FBVCxDQUF3QixTQUF4QixDQUFMLEVBQXlDO0FBQ3JDLDZCQUFhLEdBQWIsR0FBbUIsS0FBSyxZQUFMLEVBQW5CO0FBQ0EsNkJBQWEsRUFBYixHQUFrQixTQUFsQjtBQUNBLDZCQUFhLEtBQWIsQ0FBbUIsS0FBbkIsR0FBMkIsQ0FBM0I7QUFDQSw2QkFBYSxLQUFiLENBQW1CLE1BQW5CLEdBQTRCLENBQTVCO0FBQ0EsNkJBQWEsV0FBYixHQUEyQixHQUEzQjs7QUFFQSw2QkFBYSxNQUFiLEdBQXNCLFlBQU07QUFDeEIsd0JBQUksUUFBUSxJQUFJLFdBQUosQ0FBZ0IsTUFBaEIsQ0FBWjtBQUNBLDJCQUFLLFVBQUwsQ0FBZ0IsYUFBaEIsQ0FBOEIsS0FBOUI7QUFDSCxpQkFIRDtBQUlBLHFCQUFLLEtBQUw7O0FBRUEseUJBQVMsSUFBVCxDQUFjLFdBQWQsQ0FBMEIsWUFBMUI7QUFDSCxhQWRELE1BY087QUFDSCxxQkFBSyxLQUFMO0FBQ0g7QUFDSjs7Ozs7O0FBR0wsSUFBTSxTQUFTLElBQUksRUFBSixFQUFmOztBQUVBLE9BQU8sT0FBUCxHQUFpQixNQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qKlxuICogQ3JlYXRlZCBieSBhLmtvcm90YWV2IG9uIDA3LjExLjE2LlxuICovXG5pZiAoIVN0cmluZy5wcm90b3R5cGUuc3RhcnRzV2l0aCkge1xuICAgIFN0cmluZy5wcm90b3R5cGUuc3RhcnRzV2l0aCA9IGZ1bmN0aW9uKHNlYXJjaFN0cmluZywgcG9zaXRpb24pIHtcbiAgICAgICAgcG9zaXRpb24gPSBwb3NpdGlvbiB8fCAwO1xuICAgICAgICByZXR1cm4gdGhpcy5pbmRleE9mKHNlYXJjaFN0cmluZywgcG9zaXRpb24pID09PSBwb3NpdGlvbjtcbiAgICB9O1xufVxuXG5pZiAoIHR5cGVvZiB3aW5kb3cuQ3VzdG9tRXZlbnQgIT09IFwiZnVuY3Rpb25cIiApIHtcbiAgICBmdW5jdGlvbiBDdXN0b21FdmVudChldmVudCwgcGFyYW1zKSB7XG4gICAgICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7YnViYmxlczogZmFsc2UsIGNhbmNlbGFibGU6IGZhbHNlLCBkZXRhaWw6IHVuZGVmaW5lZH07XG4gICAgICAgIHZhciBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnQ3VzdG9tRXZlbnQnKTtcbiAgICAgICAgZXZ0LmluaXRDdXN0b21FdmVudChldmVudCwgcGFyYW1zLmJ1YmJsZXMsIHBhcmFtcy5jYW5jZWxhYmxlLCBwYXJhbXMuZGV0YWlsKTtcbiAgICAgICAgcmV0dXJuIGV2dDtcbiAgICB9XG5cbiAgICBDdXN0b21FdmVudC5wcm90b3R5cGUgPSB3aW5kb3cuRXZlbnQucHJvdG90eXBlO1xuXG4gICAgd2luZG93LkN1c3RvbUV2ZW50ID0gQ3VzdG9tRXZlbnQ7XG59IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbi8qKlxuICogSW1wZWxlbWVudHMgWHNvbGxhIExvZ2luIEFwaVxuICogQHBhcmFtIHByb2plY3RJZCAtIHByb2plY3QncyB1bmlxdWUgaWRlbnRpZmllclxuICogQHBhcmFtIGJhc2VVcmwgLSBhcGkgZW5kcG9pbnRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5cbnZhciBYTEFwaSA9IGZ1bmN0aW9uIChwcm9qZWN0SWQsIGJhc2VVcmwpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5iYXNlVXJsID0gYmFzZVVybCB8fCAnLy9sb2dpbi54c29sbGEuY29tL2FwaS8nO1xuXG4gICAgdGhpcy5wcm9qZWN0SWQgPSBwcm9qZWN0SWQ7XG5cbiAgICB0aGlzLm1ha2VBcGlDYWxsID0gZnVuY3Rpb24gKHBhcmFtcywgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgdmFyIHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuICAgICAgICByLm9wZW4ocGFyYW1zLm1ldGhvZCwgc2VsZi5iYXNlVXJsICsgcGFyYW1zLmVuZHBvaW50LCB0cnVlKTtcbiAgICAgICAgci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoci5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgICAgICAgICBpZiAoci5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3MoSlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyLnJlc3BvbnNlVGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IoSlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3Ioe2Vycm9yOiB7bWVzc2FnZTogJ05ldHdvcmtpbmcgZXJyb3InLCBjb2RlOiByLnN0YXR1c319KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHBhcmFtcy5tZXRob2QgPT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICByLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLThcIik7XG4gICAgICAgICAgICByLnNlbmQocGFyYW1zLnBvc3RCb2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMubWV0aG9kID09ICdHRVQnKSB7XG4gICAgICAgICAgICByLnNlbmQocGFyYW1zLmdldEFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcbi8qKlxuICogR2V0IGFsbCBhdmlhbGFibGUgc29jaWFsIG1ldGhvZHMgYXV0aCB1cmxcbiAqIEBwYXJhbSBzdWNjZXNzIC0gc3VjY2VzcyBjYWxsYmFja1xuICogQHBhcmFtIGVycm9yIC0gZXJyb3IgY2FsbGJhY2tcbiAqIEBwYXJhbSBnZXRBcmd1bWVudHMgLSBhZGRpdGlvbmFsIHBhcmFtcyB0byBzZW5kIHdpdGggcmVxdWVzdFxuICovXG5YTEFwaS5wcm90b3R5cGUuZ2V0U29jaWFsc1VSTHMgPSBmdW5jdGlvbiAoc3VjY2VzcywgZXJyb3IsIGdldEFyZ3VtZW50cykge1xuICAgIHZhciBzdHIgPSBcIlwiO1xuICAgIGZvciAodmFyIGtleSBpbiBnZXRBcmd1bWVudHMpIHtcbiAgICAgICAgaWYgKHN0ciAhPSBcIlwiKSB7XG4gICAgICAgICAgICBzdHIgKz0gXCImXCI7XG4gICAgICAgIH1cbiAgICAgICAgc3RyICs9IGtleSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGdldEFyZ3VtZW50c1trZXldKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzb2NpYWwvbG9naW5fdXJscz8nICsgc3RyLCBnZXRBcmd1bWVudHM6IG51bGx9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUubG9naW5QYXNzQXV0aCA9IGZ1bmN0aW9uIChsb2dpbiwgcGFzcywgcmVtZW1iZXJNZSwgcmVkaXJlY3RVcmwsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgdmFyIGJvZHkgPSB7XG4gICAgICAgIHVzZXJuYW1lOiBsb2dpbixcbiAgICAgICAgcGFzc3dvcmQ6IHBhc3MsXG4gICAgICAgIHJlbWVtYmVyX21lOiByZW1lbWJlck1lXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnUE9TVCcsIGVuZHBvaW50OiAncHJveHkvbG9naW4/cHJvamVjdElkPScrdGhpcy5wcm9qZWN0SWQgKyAnJnJlZGlyZWN0X3VybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHJlZGlyZWN0VXJsKSwgcG9zdEJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHkpfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxuWExBcGkucHJvdG90eXBlLnNtc0F1dGggPSBmdW5jdGlvbiAocGhvbmVOdW1iZXIsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ0dFVCcsIGVuZHBvaW50OiAnc21zJywgZ2V0QXJndW1lbnRzOiAncGhvbmVOdW1iZXI9JyArIHBob25lTnVtYmVyfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBYTEFwaTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBhLmtvcm90YWV2IG9uIDI0LjA2LjE2LlxuICovXG5yZXF1aXJlKCcuL3N1cHBvcnRzJyk7XG5cbmltcG9ydCBYTEFwaSBmcm9tICcuL3hsYXBpJztcbi8qKlxuICogQ3JlYXRlIGFuIGBBdXRoMGAgaW5zdGFuY2Ugd2l0aCBgb3B0aW9uc2BcbiAqXG4gKiBAY2xhc3MgWExcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5cbmNvbnN0IFJPVVRFUyA9IHtcbiAgICBMT0dJTjogJycsXG4gICAgUkVHSVNUUkFUSU9OOiAncmVnaXN0cmF0aW9uJyxcbiAgICBSRUNPVkVSX1BBU1NXT1JEOiAncmVzZXQtcGFzc3dvcmQnLFxuICAgIEFMTF9TT0NJQUxTOiAnb3RoZXInXG59O1xuXG5jb25zdCBERUZBVUxUX0NPTkZJRyA9IHtcbiAgICBlcnJvckhhbmRsZXI6IGZ1bmN0aW9uIChhKSB7XG4gICAgfSxcbiAgICBsb2dpblBhc3NWYWxpZGF0b3I6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgaXNNYXJrdXBTb2NpYWxzSGFuZGxlcnNFbmFibGVkOiBmYWxzZSxcbiAgICBhcGlVcmw6ICcvL2xvZ2luLnhzb2xsYS5jb20vYXBpLycsXG4gICAgbWF4WExDbGlja0RlcHRoOiAyMCxcbiAgICBvbmx5V2lkZ2V0czogZmFsc2UsXG4gICAgcG9wdXBCYWNrZ3JvdW5kQ29sb3I6ICdyZ2IoMTg3LCAxODcsIDE4NyknLFxuICAgIGlmcmFtZVpJbmRleDogMTAwMDAwMCxcbiAgICB0aGVtZTogJ2FwcC5kZWZhdWx0LmNzcycsXG4gICAgcHJlbG9hZGVyOiAnPGRpdj48L2Rpdj4nLFxuICAgIHdpZGdldEJhc2VVcmw6ICdodHRwczovL3hsLXdpZGdldC54c29sbGEuY29tLycsXG4gICAgcm91dGU6IFJPVVRFUy5MT0dJTlxufTtcblxuY29uc3QgSU5WQUxJRF9MT0dJTl9FUlJPUl9DT0RFID0gMTtcbmNvbnN0IElOQ09SUkVDVF9MT0dJTl9PUl9QQVNTV09SRF9FUlJPUl9DT0RFID0gMjtcblxuY29uc3QgSUZSQU1FX0lEID0gJ1hzb2xsYUxvZ2luV2lkZ2V0SWZyYW1lJztcbmNvbnN0IHdpZGdldElmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuXG5jbGFzcyBYTCB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuc29jaWFsVXJscyA9IHt9O1xuICAgICAgICB0aGlzLmV2ZW50VHlwZXMgPSB7XG4gICAgICAgICAgICBMT0FEOiAnbG9hZCcsXG4gICAgICAgICAgICBDTE9TRTogJ2Nsb3NlJyxcbiAgICAgICAgICAgIEhJREVfUE9QVVA6ICdoaWRlIHBvcHVwJ1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIG5lZWQgZm9yIGV4cG9ydCBwdXJwb3Nlc1xuICAgICAgICB0aGlzLlJPVVRFUyA9IFJPVVRFUztcblxuICAgICAgICB0aGlzLmRpc3BhdGNoZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgdGhpcy5vbkhpZGVFdmVudCA9IHRoaXMub25IaWRlRXZlbnQuYmluZCh0aGlzKTtcbiAgICB9XG5cbiAgICBpbml0KG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5jb25maWcgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX0NPTkZJRywgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuY29uZmlnLnBvcHVwQmFja2dyb3VuZENvbG9yID0gREVGQVVMVF9DT05GSUcucG9wdXBCYWNrZ3JvdW5kQ29sb3I7XG4gICAgICAgIHRoaXMuYXBpID0gbmV3IFhMQXBpKG9wdGlvbnMucHJvamVjdElkLCB0aGlzLmNvbmZpZy5hcGlVcmwpO1xuXG4gICAgICAgIGNvbnN0IGV2ZW50TWV0aG9kID0gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgPyAnYWRkRXZlbnRMaXN0ZW5lcicgOiAnYXR0YWNoRXZlbnQnO1xuICAgICAgICBjb25zdCBldmVudGVyID0gd2luZG93W2V2ZW50TWV0aG9kXTtcbiAgICAgICAgY29uc3QgbWVzc2FnZUV2ZW50ID0gZXZlbnRNZXRob2QgPT0gJ2F0dGFjaEV2ZW50JyA/ICdvbm1lc3NhZ2UnIDogJ21lc3NhZ2UnO1xuXG4gICAgICAgIC8vIExpc3RlbiB0byBtZXNzYWdlIGZyb20gY2hpbGQgd2luZG93XG4gICAgICAgIGV2ZW50ZXIobWVzc2FnZUV2ZW50LCAoZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KHRoaXMuZXZlbnRUeXBlc1tlLmRhdGFdKTtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfSwgZmFsc2UpO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuZXZlbnRUeXBlcykubWFwKChldmVudEtleSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vbih0aGlzLmV2ZW50VHlwZXNbZXZlbnRLZXldKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYob3B0aW9ucy5wb3B1cEJhY2tncm91bmRDb2xvcikge1xuICAgICAgICAgICAgdGhpcy5jb25maWcucG9wdXBCYWNrZ3JvdW5kQ29sb3IgPSBvcHRpb25zLnBvcHVwQmFja2dyb3VuZENvbG9yO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmFkZEV2ZW50TGlzdGVuZXIodGhpcy5ldmVudFR5cGVzLkhJREVfUE9QVVAsIHRoaXMub25IaWRlRXZlbnQpO1xuXG4gICAgICAgIGlmICghdGhpcy5jb25maWcub25seVdpZGdldHMpIHtcblxuICAgICAgICAgICAgbGV0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zLnByb2plY3RJZCA9IG9wdGlvbnMucHJvamVjdElkO1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnJlZGlyZWN0X3VybCA9IHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmxvZ2luVXJsKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmxvZ2luX3VybCA9IHRoaXMuY29uZmlnLmxvZ2luVXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmNhbGxiYWNrVXJsKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmxvZ2luX3VybCA9IHRoaXMuY29uZmlnLmNhbGxiYWNrVXJsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVTb2NpYWxMaW5rcyA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaS5nZXRTb2NpYWxzVVJMcygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zb2NpYWxVcmxzID0ge307XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNvY2lhbFVybHNbJ3NuLScgKyBrZXldID0gcmVzcG9uc2Vba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgfSwgcGFyYW1zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHVwZGF0ZVNvY2lhbExpbmtzKCk7XG4gICAgICAgICAgICBzZXRJbnRlcnZhbCh1cGRhdGVTb2NpYWxMaW5rcywgMTAwMCAqIDYwICogNTkpO1xuXG4gICAgICAgICAgICBjb25zdCBtYXhDbGlja0RlcHRoID0gdGhpcy5jb25maWcubWF4WExDbGlja0RlcHRoO1xuICAgICAgICAgICAgLy8gRmluZCBjbG9zZXN0IGFuY2VzdG9yIHdpdGggZGF0YS14bC1hdXRoIGF0dHJpYnV0ZVxuICAgICAgICAgICAgZnVuY3Rpb24gZmluZEFuY2VzdG9yKGVsKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVsLmF0dHJpYnV0ZXNbJ2RhdGEteGwtYXV0aCddKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgICAgICAgIHdoaWxlICgoZWwgPSBlbC5wYXJlbnRFbGVtZW50KSAmJiAhZWwuYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ10gJiYgKytpIDwgbWF4Q2xpY2tEZXB0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuaXNNYXJrdXBTb2NpYWxzSGFuZGxlcnNFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBmaW5kQW5jZXN0b3IoZS50YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICAvLyBEbyBub3RoaW5nIGlmIGNsaWNrIHdhcyBvdXRzaWRlIG9mIGVsZW1lbnRzIHdpdGggZGF0YS14bC1hdXRoXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeGxEYXRhID0gdGFyZ2V0LmF0dHJpYnV0ZXNbJ2RhdGEteGwtYXV0aCddO1xuICAgICAgICAgICAgICAgICAgICBpZiAoeGxEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbm9kZVZhbHVlID0geGxEYXRhLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZ2luKHthdXRoVHlwZTogbm9kZVZhbHVlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm1zIGxvZ2luXG4gICAgICogQHBhcmFtIHByb3BcbiAgICAgKiBAcGFyYW0gZXJyb3IgLSBjYWxsIGluIGNhc2UgZXJyb3JcbiAgICAgKiBAcGFyYW0gc3VjY2Vzc1xuICAgICAqL1xuICAgIGxvZ2luKHByb3AsIGVycm9yLCBzdWNjZXNzKSB7XG5cbiAgICAgICAgaWYgKCFwcm9wIHx8ICF0aGlzLnNvY2lhbFVybHMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBwcm9wc1xuICAgICAgICAgKiBhdXRoVHlwZTogc24tPHNvY2lhbCBuYW1lPiwgbG9naW4tcGFzcywgc21zXG4gICAgICAgICAqL1xuICAgICAgICBpZiAocHJvcC5hdXRoVHlwZSkge1xuICAgICAgICAgICAgaWYgKHByb3AuYXV0aFR5cGUuc3RhcnRzV2l0aCgnc24tJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzb2NpYWxVcmwgPSB0aGlzLnNvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICAgICAgaWYgKHNvY2lhbFVybCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB0aGlzLnNvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQXV0aCB0eXBlOiAnICsgcHJvcC5hdXRoVHlwZSArICcgZG9lc25cXCd0IGV4aXN0Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ2xvZ2luLXBhc3MnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGkubG9naW5QYXNzQXV0aChwcm9wLmxvZ2luLCBwcm9wLnBhc3MsIHByb3AucmVtZW1iZXJNZSwgdGhpcy5jb25maWcucmVkaXJlY3RVcmwsIChyZXMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcy5sb2dpbl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbmlzaEF1dGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXMubG9naW5fdXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzcyh7c3RhdHVzOiAnc3VjY2VzcycsIGZpbmlzaDogZmluaXNoQXV0aCwgcmVkaXJlY3RVcmw6IHJlcy5sb2dpbl91cmx9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluaXNoQXV0aCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IodGhpcy5jcmVhdGVFcnJvck9iamVjdCgnTG9naW4gb3IgcGFzcyBub3QgdmFsaWQnLCBJTkNPUlJFQ1RfTE9HSU5fT1JfUEFTU1dPUkRfRVJST1JfQ09ERSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wLmF1dGhUeXBlID09ICdzbXMnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNtc0F1dGhTdGVwID09ICdwaG9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcGkuc21zQXV0aChwcm9wLnBob25lTnVtYmVyLCBudWxsLCBudWxsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNtc0F1dGhTdGVwID09ICdjb2RlJykge1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmtub3duIGF1dGggdHlwZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY3JlYXRlRXJyb3JPYmplY3QobWVzc2FnZSwgY29kZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIGNvZGU6IGNvZGUgfHwgLTFcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgZ2V0UHJvamVjdElkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcucHJvamVjdElkO1xuICAgIH07XG5cbiAgICBnZXRSZWRpcmVjdFVSTCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsO1xuICAgIH07XG5cbiAgICBnZXRUaGVtZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLnRoZW1lO1xuICAgIH1cblxuICAgIGdldENhbGxiYWNrVXJsKCkge1xuICAgICAgICBpZiAodGhpcy5jb25maWcubG9naW5VcmwpIHJldHVybiB0aGlzLmNvbmZpZy5sb2dpblVybDtcbiAgICAgICAgZWxzZSByZXR1cm4gdGhpcy5jb25maWcuY2FsbGJhY2tVcmxcbiAgICB9O1xuXG4gICAgZ2V0SWZyYW1lU3JjKG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBjb25zdCB3aWRnZXRCYXNlVXJsID0gb3B0aW9ucy53aWRnZXRCYXNlVXJsIHx8IHRoaXMuY29uZmlnLndpZGdldEJhc2VVcmw7XG5cbiAgICAgICAgY29uc3Qgcm91dGUgPSBvcHRpb25zLnJvdXRlIHx8IHRoaXMuY29uZmlnLnJvdXRlO1xuXG4gICAgICAgIGxldCBzcmMgPSB3aWRnZXRCYXNlVXJsICsgcm91dGUgKyAnP3Byb2plY3RJZD0nICsgdGhpcy5nZXRQcm9qZWN0SWQoKTtcblxuICAgICAgICBpZiAodGhpcy5jb25maWcubG9jYWxlKSB7XG4gICAgICAgICAgICBzcmMgPSBzcmMgKyAnJmxvY2FsZT0nICsgdGhpcy5jb25maWcubG9jYWxlO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5maWVsZHMpIHtcbiAgICAgICAgICAgIHNyYyA9IHNyYyArICcmZmllbGRzPScgKyB0aGlzLmNvbmZpZy5maWVsZHM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVkaXJlY3RVcmwgPSB0aGlzLmdldFJlZGlyZWN0VVJMKCk7XG4gICAgICAgIGlmIChyZWRpcmVjdFVybCkge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZyZWRpcmVjdFVybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHJlZGlyZWN0VXJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNhbGxiYWNrVXJsID0gdGhpcy5nZXRDYWxsYmFja1VybCgpO1xuXG4gICAgICAgIGlmIChjYWxsYmFja1VybCkge1xuICAgICAgICAgICAgc3JjID0gc3JjICsgJyZsb2dpbl91cmw9JyArIGVuY29kZVVSSUNvbXBvbmVudChjYWxsYmFja1VybCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0aGVtZSA9IHRoaXMuZ2V0VGhlbWUoKTtcbiAgICAgICAgaWYgKHRoZW1lKSB7XG4gICAgICAgICAgICBzcmMgPSBzcmMgKyAnJnRoZW1lPScgKyBlbmNvZGVVUklDb21wb25lbnQodGhlbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNyYztcbiAgICB9XG5cbiAgICBBdXRoV2lkZ2V0KGVsZW1lbnRJZCwgb3B0aW9ucykge1xuICAgICAgICBpZiAodGhpcy5hcGkpIHtcbiAgICAgICAgICAgIGlmICghZWxlbWVudElkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignTm8gZGl2IG5hbWUhJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gYCR7b3B0aW9ucy53aWR0aCB8fCA0MDB9cHhgO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IGAke29wdGlvbnMuaGVpZ2h0IHx8IDU1MH1weGA7XG5cbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUNoaWxkKHByZWxvYWRlcik7XG4gICAgICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdsb2FkJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLmZyYW1lQm9yZGVyID0gJzAnO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zcmMgPSB0aGlzLmdldElmcmFtZVNyYyhvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuaWQgPSBJRlJBTUVfSUQ7XG5cblxuXG4gICAgICAgICAgICAgICAgY29uc3QgcHJlbG9hZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICAgICAgICAgICAgICBwcmVsb2FkZXIuaW5uZXJIVE1MID0gdGhpcy5jb25maWcucHJlbG9hZGVyO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW1lbnRJZCk7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zdHlsZS53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnN0eWxlLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZChwcmVsb2FkZXIpO1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZENoaWxkKHdpZGdldElmcmFtZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRWxlbWVudCBcXFwiJyArIGVsZW1lbnRJZCArICdcXFwiIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1BsZWFzZSBydW4gWEwuaW5pdCgpIGZpcnN0Jyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgb25DbG9zZUV2ZW50KCkge1xuICAgICAgICB3aWRnZXRJZnJhbWUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh3aWRnZXRJZnJhbWUpO1xuICAgIH1cblxuICAgIF9oaWRlKCkge1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUucG9zaXRpb24gPSAnJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnpJbmRleCA9ICcnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUubGVmdCA9ICcnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUudG9wID0gJyc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5oZWlnaHQgPSAwO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyc7XG4gICAgfVxuXG4gICAgb25IaWRlRXZlbnQoKSB7XG4gICAgICAgdGhpcy5faGlkZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGxpbmsgZXZlbnQgd2l0aCBoYW5kbGVyXG4gICAgICogQHBhcmFtIGV2ZW50XG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKi9cblxuICAgIG9uKGV2ZW50LCBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyIHx8IG51bGw7XG5cbiAgICAgICAgaWYgKGV2ZW50ID09PSB0aGlzLmV2ZW50VHlwZXMuQ0xPU0UpIHtcbiAgICAgICAgICAgIGlmICghaGFuZGxlcikge1xuICAgICAgICAgICAgICAgIGhhbmRsZXIgPSB0aGlzLm9uQ2xvc2VFdmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCB0aGlzLm9uQ2xvc2VFdmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmRpc3BhdGNoZXIuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlcik7XG4gICAgfTtcblxuICAgIF9zaG93KCkge1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuekluZGV4ID0gdGhpcy5jb25maWcuaWZyYW1lWkluZGV4O1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUubGVmdCA9ICcwJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnRvcCA9ICcwJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gdGhpcy5jb25maWcucG9wdXBCYWNrZ3JvdW5kQ29sb3I7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogb3BlbiBmdWxsc3JlZW4gcG9wdXAgZm9yIHdpZGdldFxuICAgICAqL1xuXG4gICAgc2hvdygpIHtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5nZXRFbGVtZW50QnlJZChJRlJBTUVfSUQpKSB7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3JjID0gdGhpcy5nZXRJZnJhbWVTcmMoKTtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5pZCA9IElGUkFNRV9JRDtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5mcmFtZUJvcmRlciA9ICcwJztcblxuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2xvYWQnKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpc3BhdGNoZXIuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5fc2hvdygpO1xuXG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHdpZGdldElmcmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zaG93KCk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5jb25zdCByZXN1bHQgPSBuZXcgWEwoKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXN1bHQ7Il19
