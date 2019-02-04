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

var DEFAULT_CONFIG = {
    errorHandler: function errorHandler(a) {},
    loginPassValidator: function loginPassValidator(a, b) {
        return true;
    },
    isMarkupSocialsHandlersEnabled: false,
    apiUrl: '//login.xsolla.com/api/',
    maxXLClickDepth: 20,
    onlyWidgets: false,
    popUpBckgrColor: '#bbbbbb',
    theme: 'app.default.css',
    preloader: '<div></div>'
};

var INVALID_LOGIN_ERROR_CODE = 1;
var INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE = 2;

var XL = function () {
    function XL() {
        _classCallCheck(this, XL);

        this.socialUrls = {};
        this.eventTypes = {
            LOAD: 'load',
            CLOSE: 'close',
            HIDE_POPUP: 'hide popup'
        };

        this.ROUTES = {
            LOGIN: '',
            REGISTRATION: 'registration',
            RECOVER_PASSWORD: 'reset-password',
            ALL_SOCIALS: 'other'
        };

        this.dispatcher = document.createElement('div');
    }

    _createClass(XL, [{
        key: 'init',
        value: function init(options) {
            var _this = this;

            this.config = _extends({}, DEFAULT_CONFIG, options);
            this.config.popUpBckgrColor = DEFAULT_CONFIG.popUpBckgrColor;
            this.api = new _xlapi2.default(options.projectId, this.config.apiUrl);

            Object.keys(this.eventTypes).map(function (eventKey) {
                _this.on(_this.eventTypes[eventKey]);
            });

            if (options.popUpBckgrColor) {
                var isOk = /^#[0-9A-F]{6}$/i.test(options.popUpBckgrColor);
                if (isOk) this.config.popUpBckgrColor = options.popUpBckgrColor;
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
        key: 'getLoginUrl',
        value: function getLoginUrl() {
            return this.config.loginUrl;
        }
    }, {
        key: 'getCallbackUrl',
        value: function getCallbackUrl() {
            return this.config.callbackUrl;
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

                    var widgetBaseUrl = options.widgetBaseUrl || 'https://xl-widget.xsolla.com/';

                    var route = options.route || this.ROUTES.LOGIN;

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

                    var loginUrl = this.getLoginUrl();
                    var callbackUrl = this.getCallbackUrl();

                    if (loginUrl) {
                        src = src + '&login_url=' + encodeURIComponent(loginUrl);
                    } else {
                        if (callbackUrl) {
                            src = src + '&login_url=' + encodeURIComponent(callbackUrl);
                        }
                    }

                    var theme = this.getTheme();
                    if (theme) {
                        src = src + '&theme=' + encodeURIComponent(theme);
                    }

                    var widgetIframe = document.createElement('iframe');
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
                    widgetIframe.src = src;
                    widgetIframe.id = 'XsollaLoginWidgetIframe';

                    var eventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent';
                    var eventer = window[eventMethod];
                    var messageEvent = eventMethod == 'attachEvent' ? 'onmessage' : 'message';

                    // Listen to message from child window
                    eventer(messageEvent, function (e) {
                        var event = new CustomEvent(_this3.eventTypes[e.data]);
                        _this3.dispatcher.dispatchEvent(event);
                    }, false);

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
            var element = document.getElementById('XsollaLoginWidgetIframe');
            element.parentNode.removeChild(element);
        }
    }, {
        key: 'onHideEvent',
        value: function onHideEvent() {
            var widgetIframe = document.getElementById('XsollaLoginWidgetIframe');

            widgetIframe.style.position = '';
            widgetIframe.style.zIndex = '';
            widgetIframe.style.left = '';
            widgetIframe.style.top = '';
            widgetIframe.style.backgroundColor = '';
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
        key: 'show',


        /**
         * open fullsreen popup for widget
         */

        value: function show() {
            var widgetIframe = document.getElementById('XsollaLoginWidgetIframe');

            if (widgetIframe !== undefined) {
                widgetIframe.style.position = 'fixed';
                widgetIframe.style.zIndex = '1';
                widgetIframe.style.left = '0';
                widgetIframe.style.top = '0';
                widgetIframe.style.width = '100%';
                widgetIframe.style.height = '100%';
                widgetIframe.style.backgroundColor = this.config.popUpBckgrColor;
            }
        }
    }]);

    return XL;
}();

var result = new XL();

module.exports = result;

},{"./supports":1,"./xlapi":2}]},{},["main"])("main")
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc3VwcG9ydHMuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUE7OztBQUdBLElBQUksQ0FBQyxPQUFPLFNBQVAsQ0FBaUIsVUFBdEIsRUFBa0M7QUFDOUIsV0FBTyxTQUFQLENBQWlCLFVBQWpCLEdBQThCLFVBQVMsWUFBVCxFQUF1QixRQUF2QixFQUFpQztBQUMzRCxtQkFBVyxZQUFZLENBQXZCO0FBQ0EsZUFBTyxLQUFLLE9BQUwsQ0FBYSxZQUFiLEVBQTJCLFFBQTNCLE1BQXlDLFFBQWhEO0FBQ0gsS0FIRDtBQUlIOztBQUVELElBQUssT0FBTyxPQUFPLFdBQWQsS0FBOEIsVUFBbkMsRUFBZ0Q7QUFBQSxRQUNuQyxXQURtQyxHQUM1QyxTQUFTLFdBQVQsQ0FBcUIsS0FBckIsRUFBNEIsTUFBNUIsRUFBb0M7QUFDaEMsaUJBQVMsVUFBVSxFQUFDLFNBQVMsS0FBVixFQUFpQixZQUFZLEtBQTdCLEVBQW9DLFFBQVEsU0FBNUMsRUFBbkI7QUFDQSxZQUFJLE1BQU0sU0FBUyxXQUFULENBQXFCLGFBQXJCLENBQVY7QUFDQSxZQUFJLGVBQUosQ0FBb0IsS0FBcEIsRUFBMkIsT0FBTyxPQUFsQyxFQUEyQyxPQUFPLFVBQWxELEVBQThELE9BQU8sTUFBckU7QUFDQSxlQUFPLEdBQVA7QUFDSCxLQU4yQzs7QUFRNUMsZ0JBQVksU0FBWixHQUF3QixPQUFPLEtBQVAsQ0FBYSxTQUFyQzs7QUFFQSxXQUFPLFdBQVAsR0FBcUIsV0FBckI7QUFDSDs7Ozs7QUNyQkQ7OztBQUdBOzs7Ozs7O0FBT0EsSUFBSSxRQUFRLFNBQVIsS0FBUSxDQUFVLFNBQVYsRUFBcUIsT0FBckIsRUFBOEI7QUFDdEMsUUFBSSxPQUFPLElBQVg7QUFDQSxTQUFLLE9BQUwsR0FBZSxXQUFXLHlCQUExQjs7QUFFQSxTQUFLLFNBQUwsR0FBaUIs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LENBQW1CLEtBQW5CLEdBQTJCLE1BQTNCO0FBQ0EsNkJBQWEsS0FBYixDQUFtQixNQUFuQixHQUE0QixNQUE1QjtBQUNBLDZCQUFhLEtBQWIsQ0FBbUIsZUFBbkIsR0FBcUMsS0FBSyxNQUFMLENBQVksZUFBakQ7QUFDSDtBQUNKOzs7Ozs7QUFHTCxJQUFNLFNBQVMsSUFBSSxFQUFKLEVBQWY7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLE1BQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMDcuMTEuMTYuXG4gKi9cbmlmICghU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoKSB7XG4gICAgU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoID0gZnVuY3Rpb24oc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikge1xuICAgICAgICBwb3NpdGlvbiA9IHBvc2l0aW9uIHx8IDA7XG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4T2Yoc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikgPT09IHBvc2l0aW9uO1xuICAgIH07XG59XG5cbmlmICggdHlwZW9mIHdpbmRvdy5DdXN0b21FdmVudCAhPT0gXCJmdW5jdGlvblwiICkge1xuICAgIGZ1bmN0aW9uIEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMpIHtcbiAgICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHtidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogZmFsc2UsIGRldGFpbDogdW5kZWZpbmVkfTtcbiAgICAgICAgdmFyIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdDdXN0b21FdmVudCcpO1xuICAgICAgICBldnQuaW5pdEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMuYnViYmxlcywgcGFyYW1zLmNhbmNlbGFibGUsIHBhcmFtcy5kZXRhaWwpO1xuICAgICAgICByZXR1cm4gZXZ0O1xuICAgIH1cblxuICAgIEN1c3RvbUV2ZW50LnByb3RvdHlwZSA9IHdpbmRvdy5FdmVudC5wcm90b3R5cGU7XG5cbiAgICB3aW5kb3cuQ3VzdG9tRXZlbnQgPSBDdXN0b21FdmVudDtcbn0iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuLyoqXG4gKiBJbXBlbGVtZW50cyBYc29sbGEgTG9naW4gQXBpXG4gKiBAcGFyYW0gcHJvamVjdElkIC0gcHJvamVjdCdzIHVuaXF1ZSBpZGVudGlmaWVyXG4gKiBAcGFyYW0gYmFzZVVybCAtIGFwaSBlbmRwb2ludFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxudmFyIFhMQXBpID0gZnVuY3Rpb24gKHByb2plY3RJZCwgYmFzZVVybCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmJhc2VVcmwgPSBiYXNlVXJsIHx8ICcvL2xvZ2luLnhzb2xsYS5jb20vYXBpLyc7XG5cbiAgICB0aGlzLnByb2plY3RJZCA9IHByb2plY3RJZDtcblxuICAgIHRoaXMubWFrZUFwaUNhbGwgPSBmdW5jdGlvbiAocGFyYW1zLCBzdWNjZXNzLCBlcnJvcikge1xuICAgICAgICB2YXIgciA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG4gICAgICAgIHIub3BlbihwYXJhbXMubWV0aG9kLCBzZWxmLmJhc2VVcmwgKyBwYXJhbXMuZW5kcG9pbnQsIHRydWUpO1xuICAgICAgICByLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgICAgICAgIGlmIChyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyhKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcih7ZXJyb3I6IHttZXNzYWdlOiAnTmV0d29ya2luZyBlcnJvcicsIGNvZGU6IHIuc3RhdHVzfX0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBpZiAocGFyYW1zLm1ldGhvZCA9PSAnUE9TVCcpIHtcbiAgICAgICAgICAgIHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwiKTtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMucG9zdEJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy5tZXRob2QgPT0gJ0dFVCcpIHtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMuZ2V0QXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuLyoqXG4gKiBHZXQgYWxsIGF2aWFsYWJsZSBzb2NpYWwgbWV0aG9kcyBhdXRoIHVybFxuICogQHBhcmFtIHN1Y2Nlc3MgLSBzdWNjZXNzIGNhbGxiYWNrXG4gKiBAcGFyYW0gZXJyb3IgLSBlcnJvciBjYWxsYmFja1xuICogQHBhcmFtIGdldEFyZ3VtZW50cyAtIGFkZGl0aW9uYWwgcGFyYW1zIHRvIHNlbmQgd2l0aCByZXF1ZXN0XG4gKi9cblhMQXBpLnByb3RvdHlwZS5nZXRTb2NpYWxzVVJMcyA9IGZ1bmN0aW9uIChzdWNjZXNzLCBlcnJvciwgZ2V0QXJndW1lbnRzKSB7XG4gICAgdmFyIHN0ciA9IFwiXCI7XG4gICAgZm9yICh2YXIga2V5IGluIGdldEFyZ3VtZW50cykge1xuICAgICAgICBpZiAoc3RyICE9IFwiXCIpIHtcbiAgICAgICAgICAgIHN0ciArPSBcIiZcIjtcbiAgICAgICAgfVxuICAgICAgICBzdHIgKz0ga2V5ICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoZ2V0QXJndW1lbnRzW2tleV0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ3NvY2lhbC9sb2dpbl91cmxzPycgKyBzdHIsIGdldEFyZ3VtZW50czogbnVsbH0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cblhMQXBpLnByb3RvdHlwZS5sb2dpblBhc3NBdXRoID0gZnVuY3Rpb24gKGxvZ2luLCBwYXNzLCByZW1lbWJlck1lLCByZWRpcmVjdFVybCwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICB2YXIgYm9keSA9IHtcbiAgICAgICAgdXNlcm5hbWU6IGxvZ2luLFxuICAgICAgICBwYXNzd29yZDogcGFzcyxcbiAgICAgICAgcmVtZW1iZXJfbWU6IHJlbWVtYmVyTWVcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdQT1NUJywgZW5kcG9pbnQ6ICdwcm94eS9sb2dpbj9wcm9qZWN0SWQ9Jyt0aGlzLnByb2plY3RJZCArICcmcmVkaXJlY3RfdXJsPScgKyBlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmwpLCBwb3N0Qm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSl9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUuc21zQXV0aCA9IGZ1bmN0aW9uIChwaG9uZU51bWJlciwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzbXMnLCBnZXRBcmd1bWVudHM6ICdwaG9uZU51bWJlcj0nICsgcGhvbmVOdW1iZXJ9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhMQXBpO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbnJlcXVpcmUoJy4vc3VwcG9ydHMnKTtcblxuaW1wb3J0IFhMQXBpIGZyb20gJy4veGxhcGknO1xuLyoqXG4gKiBDcmVhdGUgYW4gYEF1dGgwYCBpbnN0YW5jZSB3aXRoIGBvcHRpb25zYFxuICpcbiAqIEBjbGFzcyBYTFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxuY29uc3QgREVGQVVMVF9DT05GSUcgPSB7XG4gICAgZXJyb3JIYW5kbGVyOiBmdW5jdGlvbiAoYSkge1xuICAgIH0sXG4gICAgbG9naW5QYXNzVmFsaWRhdG9yOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIGlzTWFya3VwU29jaWFsc0hhbmRsZXJzRW5hYmxlZDogZmFsc2UsXG4gICAgYXBpVXJsOiAnLy9sb2dpbi54c29sbGEuY29tL2FwaS8nLFxuICAgIG1heFhMQ2xpY2tEZXB0aDogMjAsXG4gICAgb25seVdpZGdldHM6IGZhbHNlLFxuICAgIHBvcFVwQmNrZ3JDb2xvcjogJyNiYmJiYmInLFxuICAgIHRoZW1lOiAnYXBwLmRlZmF1bHQuY3NzJyxcbiAgICBwcmVsb2FkZXI6ICc8ZGl2PjwvZGl2Pidcbn07XG5cbmNvbnN0IElOVkFMSURfTE9HSU5fRVJST1JfQ09ERSA9IDE7XG5jb25zdCBJTkNPUlJFQ1RfTE9HSU5fT1JfUEFTU1dPUkRfRVJST1JfQ09ERSA9IDI7XG5cbmNsYXNzIFhMIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5zb2NpYWxVcmxzID0ge307XG4gICAgICAgIHRoaXMuZXZlbnRUeXBlcyA9IHtcbiAgICAgICAgICAgIExPQUQ6ICdsb2FkJyxcbiAgICAgICAgICAgIENMT1NFOiAnY2xvc2UnLFxuICAgICAgICAgICAgSElERV9QT1BVUDogJ2hpZGUgcG9wdXAnXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5ST1VURVMgPSB7XG4gICAgICAgICAgICBMT0dJTjogJycsXG4gICAgICAgICAgICBSRUdJU1RSQVRJT046ICdyZWdpc3RyYXRpb24nLFxuICAgICAgICAgICAgUkVDT1ZFUl9QQVNTV09SRDogJ3Jlc2V0LXBhc3N3b3JkJyxcbiAgICAgICAgICAgIEFMTF9TT0NJQUxTOiAnb3RoZXInXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgfVxuXG4gICAgaW5pdChvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuY29uZmlnID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9DT05GSUcsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLmNvbmZpZy5wb3BVcEJja2dyQ29sb3IgPSBERUZBVUxUX0NPTkZJRy5wb3BVcEJja2dyQ29sb3I7XG4gICAgICAgIHRoaXMuYXBpID0gbmV3IFhMQXBpKG9wdGlvbnMucHJvamVjdElkLCB0aGlzLmNvbmZpZy5hcGlVcmwpO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuZXZlbnRUeXBlcykubWFwKChldmVudEtleSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vbih0aGlzLmV2ZW50VHlwZXNbZXZlbnRLZXldKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYob3B0aW9ucy5wb3BVcEJja2dyQ29sb3IpIHtcbiAgICAgICAgICAgIGxldCBpc09rICA9IC9eI1swLTlBLUZdezZ9JC9pLnRlc3Qob3B0aW9ucy5wb3BVcEJja2dyQ29sb3IpO1xuICAgICAgICAgICAgaWYgKGlzT2spIHRoaXMuY29uZmlnLnBvcFVwQmNrZ3JDb2xvciA9IG9wdGlvbnMucG9wVXBCY2tnckNvbG9yO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmFkZEV2ZW50TGlzdGVuZXIodGhpcy5ldmVudFR5cGVzLkhJREVfUE9QVVAsIHRoaXMub25IaWRlRXZlbnQpO1xuXG4gICAgICAgIGlmICghdGhpcy5jb25maWcub25seVdpZGdldHMpIHtcblxuICAgICAgICAgICAgbGV0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zLnByb2plY3RJZCA9IG9wdGlvbnMucHJvamVjdElkO1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnJlZGlyZWN0X3VybCA9IHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmxvZ2luVXJsKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmxvZ2luX3VybCA9IHRoaXMuY29uZmlnLmxvZ2luVXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmNhbGxiYWNrVXJsKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmxvZ2luX3VybCA9IHRoaXMuY29uZmlnLmNhbGxiYWNrVXJsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVTb2NpYWxMaW5rcyA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaS5nZXRTb2NpYWxzVVJMcygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zb2NpYWxVcmxzID0ge307XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNvY2lhbFVybHNbJ3NuLScgKyBrZXldID0gcmVzcG9uc2Vba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgfSwgcGFyYW1zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHVwZGF0ZVNvY2lhbExpbmtzKCk7XG4gICAgICAgICAgICBzZXRJbnRlcnZhbCh1cGRhdGVTb2NpYWxMaW5rcywgMTAwMCAqIDYwICogNTkpO1xuXG4gICAgICAgICAgICBjb25zdCBtYXhDbGlja0RlcHRoID0gdGhpcy5jb25maWcubWF4WExDbGlja0RlcHRoO1xuICAgICAgICAgICAgLy8gRmluZCBjbG9zZXN0IGFuY2VzdG9yIHdpdGggZGF0YS14bC1hdXRoIGF0dHJpYnV0ZVxuICAgICAgICAgICAgZnVuY3Rpb24gZmluZEFuY2VzdG9yKGVsKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVsLmF0dHJpYnV0ZXNbJ2RhdGEteGwtYXV0aCddKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgICAgICAgIHdoaWxlICgoZWwgPSBlbC5wYXJlbnRFbGVtZW50KSAmJiAhZWwuYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ10gJiYgKytpIDwgbWF4Q2xpY2tEZXB0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuaXNNYXJrdXBTb2NpYWxzSGFuZGxlcnNFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBmaW5kQW5jZXN0b3IoZS50YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICAvLyBEbyBub3RoaW5nIGlmIGNsaWNrIHdhcyBvdXRzaWRlIG9mIGVsZW1lbnRzIHdpdGggZGF0YS14bC1hdXRoXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeGxEYXRhID0gdGFyZ2V0LmF0dHJpYnV0ZXNbJ2RhdGEteGwtYXV0aCddO1xuICAgICAgICAgICAgICAgICAgICBpZiAoeGxEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbm9kZVZhbHVlID0geGxEYXRhLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZ2luKHthdXRoVHlwZTogbm9kZVZhbHVlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm1zIGxvZ2luXG4gICAgICogQHBhcmFtIHByb3BcbiAgICAgKiBAcGFyYW0gZXJyb3IgLSBjYWxsIGluIGNhc2UgZXJyb3JcbiAgICAgKiBAcGFyYW0gc3VjY2Vzc1xuICAgICAqL1xuICAgIGxvZ2luKHByb3AsIGVycm9yLCBzdWNjZXNzKSB7XG5cbiAgICAgICAgaWYgKCFwcm9wIHx8ICF0aGlzLnNvY2lhbFVybHMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBwcm9wc1xuICAgICAgICAgKiBhdXRoVHlwZTogc24tPHNvY2lhbCBuYW1lPiwgbG9naW4tcGFzcywgc21zXG4gICAgICAgICAqL1xuICAgICAgICBpZiAocHJvcC5hdXRoVHlwZSkge1xuICAgICAgICAgICAgaWYgKHByb3AuYXV0aFR5cGUuc3RhcnRzV2l0aCgnc24tJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzb2NpYWxVcmwgPSB0aGlzLnNvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICAgICAgaWYgKHNvY2lhbFVybCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB0aGlzLnNvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQXV0aCB0eXBlOiAnICsgcHJvcC5hdXRoVHlwZSArICcgZG9lc25cXCd0IGV4aXN0Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ2xvZ2luLXBhc3MnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGkubG9naW5QYXNzQXV0aChwcm9wLmxvZ2luLCBwcm9wLnBhc3MsIHByb3AucmVtZW1iZXJNZSwgdGhpcy5jb25maWcucmVkaXJlY3RVcmwsIChyZXMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcy5sb2dpbl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbmlzaEF1dGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXMubG9naW5fdXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzcyh7c3RhdHVzOiAnc3VjY2VzcycsIGZpbmlzaDogZmluaXNoQXV0aCwgcmVkaXJlY3RVcmw6IHJlcy5sb2dpbl91cmx9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluaXNoQXV0aCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IodGhpcy5jcmVhdGVFcnJvck9iamVjdCgnTG9naW4gb3IgcGFzcyBub3QgdmFsaWQnLCBJTkNPUlJFQ1RfTE9HSU5fT1JfUEFTU1dPUkRfRVJST1JfQ09ERSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wLmF1dGhUeXBlID09ICdzbXMnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNtc0F1dGhTdGVwID09ICdwaG9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcGkuc21zQXV0aChwcm9wLnBob25lTnVtYmVyLCBudWxsLCBudWxsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNtc0F1dGhTdGVwID09ICdjb2RlJykge1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmtub3duIGF1dGggdHlwZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY3JlYXRlRXJyb3JPYmplY3QobWVzc2FnZSwgY29kZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIGNvZGU6IGNvZGUgfHwgLTFcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgZ2V0UHJvamVjdElkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcucHJvamVjdElkO1xuICAgIH07XG5cbiAgICBnZXRSZWRpcmVjdFVSTCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsO1xuICAgIH07XG5cbiAgICBnZXRUaGVtZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLnRoZW1lO1xuICAgIH1cblxuICAgIGdldExvZ2luVXJsKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcubG9naW5Vcmw7XG4gICAgfTtcblxuICAgIGdldENhbGxiYWNrVXJsKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcuY2FsbGJhY2tVcmw7XG4gICAgfTtcblxuICAgIEF1dGhXaWRnZXQoZWxlbWVudElkLCBvcHRpb25zKSB7XG4gICAgICAgIGlmICh0aGlzLmFwaSkge1xuICAgICAgICAgICAgaWYgKCFlbGVtZW50SWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdObyBkaXYgbmFtZSEnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBgJHtvcHRpb25zLndpZHRoIHx8IDQwMH1weGA7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gYCR7b3B0aW9ucy5oZWlnaHQgfHwgNTUwfXB4YDtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHdpZGdldEJhc2VVcmwgPSBvcHRpb25zLndpZGdldEJhc2VVcmwgfHwgJ2h0dHBzOi8veGwtd2lkZ2V0Lnhzb2xsYS5jb20vJztcblxuICAgICAgICAgICAgICAgIGNvbnN0IHJvdXRlID0gb3B0aW9ucy5yb3V0ZSB8fCB0aGlzLlJPVVRFUy5MT0dJTjtcblxuICAgICAgICAgICAgICAgIGxldCBzcmMgPSB3aWRnZXRCYXNlVXJsICsgcm91dGUgKyAnP3Byb2plY3RJZD0nICsgdGhpcy5nZXRQcm9qZWN0SWQoKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5sb2NhbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgc3JjID0gc3JjICsgJyZsb2NhbGU9JyArIHRoaXMuY29uZmlnLmxvY2FsZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmZpZWxkcykge1xuICAgICAgICAgICAgICAgICAgICBzcmMgPSBzcmMgKyAnJmZpZWxkcz0nICsgdGhpcy5jb25maWcuZmllbGRzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCByZWRpcmVjdFVybCA9IHRoaXMuZ2V0UmVkaXJlY3RVUkwoKTtcbiAgICAgICAgICAgICAgICBpZiAocmVkaXJlY3RVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgc3JjID0gc3JjICsgJyZyZWRpcmVjdFVybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHJlZGlyZWN0VXJsKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBsb2dpblVybCA9IHRoaXMuZ2V0TG9naW5VcmwoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjYWxsYmFja1VybCA9IHRoaXMuZ2V0Q2FsbGJhY2tVcmwoKTtcblxuICAgICAgICAgICAgICAgIGlmIChsb2dpblVybCkge1xuICAgICAgICAgICAgICAgICAgICAgc3JjID0gc3JjICsgJyZsb2dpbl91cmw9JyArIGVuY29kZVVSSUNvbXBvbmVudChsb2dpblVybCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrVXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcmMgPSBzcmMgKyAnJmxvZ2luX3VybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGNhbGxiYWNrVXJsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IHRoZW1lID0gdGhpcy5nZXRUaGVtZSgpO1xuICAgICAgICAgICAgICAgIGlmICh0aGVtZSkge1xuICAgICAgICAgICAgICAgICAgICBzcmMgPSBzcmMgKyAnJnRoZW1lPScgKyBlbmNvZGVVUklDb21wb25lbnQodGhlbWUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IHdpZGdldElmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2hpbGQocHJlbG9hZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2xvYWQnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuZnJhbWVCb3JkZXIgPSAnMCc7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnNyYyA9IHNyYztcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuaWQgPSAnWHNvbGxhTG9naW5XaWRnZXRJZnJhbWUnO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRNZXRob2QgPSB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciA/ICdhZGRFdmVudExpc3RlbmVyJyA6ICdhdHRhY2hFdmVudCc7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRlciA9IHdpbmRvd1tldmVudE1ldGhvZF07XG4gICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZUV2ZW50ID0gZXZlbnRNZXRob2QgPT0gJ2F0dGFjaEV2ZW50JyA/ICdvbm1lc3NhZ2UnIDogJ21lc3NhZ2UnO1xuXG4gICAgICAgICAgICAgICAgLy8gTGlzdGVuIHRvIG1lc3NhZ2UgZnJvbSBjaGlsZCB3aW5kb3dcbiAgICAgICAgICAgICAgICBldmVudGVyKG1lc3NhZ2VFdmVudCwgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KHRoaXMuZXZlbnRUeXBlc1tlLmRhdGFdKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHByZWxvYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICAgICAgICAgICAgcHJlbG9hZGVyLmlubmVySFRNTCA9IHRoaXMuY29uZmlnLnByZWxvYWRlcjtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtZW50SWQpO1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zdHlsZS5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQocHJlbG9hZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZCh3aWRnZXRJZnJhbWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0VsZW1lbnQgXFxcIicgKyBlbGVtZW50SWQgKyAnXFxcIiBub3QgZm91bmQhJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdQbGVhc2UgcnVuIFhMLmluaXQoKSBmaXJzdCcpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG9uQ2xvc2VFdmVudCgpIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnWHNvbGxhTG9naW5XaWRnZXRJZnJhbWUnKTtcbiAgICAgICAgZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsZW1lbnQpO1xuICAgIH1cblxuICAgIG9uSGlkZUV2ZW50KCkge1xuICAgICAgICBjb25zdCAgd2lkZ2V0SWZyYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ1hzb2xsYUxvZ2luV2lkZ2V0SWZyYW1lJyk7XG5cbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnBvc2l0aW9uID0gJyc7XG4gICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS56SW5kZXggPSAnJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmxlZnQgPSAnJztcbiAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnRvcCA9ICcnO1xuICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogbGluayBldmVudCB3aXRoIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gZXZlbnRcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqL1xuXG4gICAgb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlciA9IGhhbmRsZXIgfHwgbnVsbDtcblxuICAgICAgICBpZiAoZXZlbnQgPT09IHRoaXMuZXZlbnRUeXBlcy5DTE9TRSkge1xuICAgICAgICAgICAgaWYgKCFoYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlciA9IHRoaXMub25DbG9zZUV2ZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIHRoaXMub25DbG9zZUV2ZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hlci5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogb3BlbiBmdWxsc3JlZW4gcG9wdXAgZm9yIHdpZGdldFxuICAgICAqL1xuXG4gICAgc2hvdygpIHtcbiAgICAgICAgY29uc3QgIHdpZGdldElmcmFtZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdYc29sbGFMb2dpbldpZGdldElmcmFtZScpO1xuXG4gICAgICAgIGlmICh3aWRnZXRJZnJhbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS56SW5kZXggPSAnMSc7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUubGVmdCA9ICcwJztcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS50b3AgPSAnMCc7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHRoaXMuY29uZmlnLnBvcFVwQmNrZ3JDb2xvcjtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmNvbnN0IHJlc3VsdCA9IG5ldyBYTCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlc3VsdDsiXX0=
