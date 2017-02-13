(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XL = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
            CLOSE: 'close'
        };
        this.dispatcher = document.createElement('div');
    }

    _createClass(XL, [{
        key: 'init',
        value: function init(options) {
            var _this = this;

            this.config = _extends({}, DEFAULT_CONFIG, options);
            this.api = new _xlapi2.default(options.projectId, this.config.apiUrl);

            Object.keys(this.eventTypes).map(function (eventKey) {
                _this.on(_this.eventTypes[eventKey]);
            });

            if (!this.config.onlyWidgets) {
                (function () {
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
                    if (_this.config.redirectUrl) {
                        params.redirect_url = _this.config.redirectUrl;
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

                    var maxClickDepth = _this.config.maxXLClickDepth;

                    if (_this.config.isMarkupSocialsHandlersEnabled) {
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
                })();
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
        key: 'AuthWidget',
        value: function AuthWidget(elementId, options) {
            var _this3 = this;

            if (this.api) {
                if (!elementId) {
                    console.error('No div name!');
                } else {
                    (function () {
                        if (options == undefined) {
                            options = {};
                        }
                        var width = (options.width || 400) + 'px';
                        var height = (options.height || 550) + 'px';

                        var widgetBaseUrl = options.widgetBaseUrl || 'https://xl-widget.xsolla.com/';

                        // var styleString = 'boreder:none';
                        var src = widgetBaseUrl + '?projectId=' + _this3.getProjectId();

                        if (_this3.config.locale) {
                            src = src + '&locale=' + _this3.config.locale;
                        }
                        if (_this3.config.fields) {
                            src = src + '&fields=' + _this3.config.fields;
                        }
                        var redirectUrl = _this3.getRedirectURL();
                        if (redirectUrl) {
                            src = src + '&redirectUrl=' + encodeURIComponent(redirectUrl);
                        }

                        // var widgetHtml = '<iframe frameborder="0" width="'+width+'" height="'+height+'"  src="'+src+'">Not supported</iframe>';
                        var widgetIframe = document.createElement('iframe');
                        widgetIframe.onload = function () {
                            element.removeChild(preloader);
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

                        var preloader = document.createElement('div');

                        preloader.innerHTML = _this3.config.preloader;

                        var element = document.getElementById(elementId);
                        if (element) {
                            element.style.width = width;
                            element.style.height = height;
                            element.appendChild(preloader);
                            element.appendChild(widgetIframe);
                        } else {
                            console.error('Element \"' + elementId + '\" not found!');
                        }
                    })();
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
    }]);

    return XL;
}();

var result = new XL();

module.exports = result;

},{"./supports":1,"./xlapi":2}]},{},["main"])("main")
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc3VwcG9ydHMuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUE7OztBQUdBLElBQUksQ0FBQyxPQUFPLFNBQVAsQ0FBaUIsVUFBdEIsRUFBa0M7QUFDOUIsV0FBTyxTQUFQLENBQWlCLFVBQWpCLEdBQThCLFVBQVMsWUFBVCxFQUF1QixRQUF2QixFQUFpQztBQUMzRCxtQkFBVyxZQUFZLENBQXZCO0FBQ0EsZUFBTyxLQUFLLE9BQUwsQ0FBYSxZQUFiLEVBQTJCLFFBQTNCLE1BQXlDLFFBQWhEO0FBQ0gsS0FIRDtBQUlIOztBQUVELElBQUssT0FBTyxPQUFPLFdBQWQsS0FBOEIsVUFBbkMsRUFBZ0Q7QUFBQSxRQUNuQyxXQURtQyxHQUM1QyxTQUFTLFdBQVQsQ0FBcUIsS0FBckIsRUFBNEIsTUFBNUIsRUFBb0M7QUFDaEMsaUJBQVMsVUFBVSxFQUFDLFNBQVMsS0FBVixFQUFpQixZQUFZLEtBQTdCLEVBQW9DLFFBQVEsU0FBNUMsRUFBbkI7QUFDQSxZQUFJLE1BQU0sU0FBUyxXQUFULENBQXFCLGFBQXJCLENBQVY7QUFDQSxZQUFJLGVBQUosQ0FBb0IsS0FBcEIsRUFBMkIsT0FBTyxPQUFsQyxFQUEyQyxPQUFPLFVBQWxELEVBQThELE9BQU8sTUFBckU7QUFDQSxlQUFPLEdBQVA7QUFDSCxLQU4yQzs7QUFRNUMsZ0JBQVksU0FBWixHQUF3QixPQUFPLEtBQVAsQ0FBYSxTQUFyQzs7QUFFQSxXQUFPLFdBQVAsR0FBcUIsV0FBckI7QUFDSDs7Ozs7QUNyQkQ7OztBQUdBOzs7Ozs7O0FBT0EsSUFBSSxRQUFRLFNBQVIsS0FBUSxDQUFVLFNBQVYsRUFBcUIsT0FBckIsRUFBOEI7QUFDdEMsUUFBSSxPQUFPLElBQVg7QUFDQSxTQUFLLE9BQUwsR0FBZSxXQUFXLHlCQUEx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LENBQWdCLEtBQTlCLEVBQXFDO0FBQ2pDLG9CQUFJLENBQUMsT0FBTCxFQUFjO0FBQ1YsOEJBQVUsS0FBSyxZQUFmO0FBQ0gsaUJBRkQsTUFHSztBQUNELHlCQUFLLFVBQUwsQ0FBZ0IsbUJBQWhCLENBQW9DLEtBQXBDLEVBQTJDLEtBQUssWUFBaEQ7QUFDSDtBQUNKOztBQUVELGlCQUFLLFVBQUwsQ0FBZ0IsZ0JBQWhCLENBQWlDLEtBQWpDLEVBQXdDLE9BQXhDO0FBQ0g7Ozs7OztBQUdMLElBQU0sU0FBUyxJQUFJLEVBQUosRUFBZjs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsTUFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMDcuMTEuMTYuXG4gKi9cbmlmICghU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoKSB7XG4gICAgU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoID0gZnVuY3Rpb24oc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikge1xuICAgICAgICBwb3NpdGlvbiA9IHBvc2l0aW9uIHx8IDA7XG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4T2Yoc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikgPT09IHBvc2l0aW9uO1xuICAgIH07XG59XG5cbmlmICggdHlwZW9mIHdpbmRvdy5DdXN0b21FdmVudCAhPT0gXCJmdW5jdGlvblwiICkge1xuICAgIGZ1bmN0aW9uIEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMpIHtcbiAgICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHtidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogZmFsc2UsIGRldGFpbDogdW5kZWZpbmVkfTtcbiAgICAgICAgdmFyIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdDdXN0b21FdmVudCcpO1xuICAgICAgICBldnQuaW5pdEN1c3RvbUV2ZW50KGV2ZW50LCBwYXJhbXMuYnViYmxlcywgcGFyYW1zLmNhbmNlbGFibGUsIHBhcmFtcy5kZXRhaWwpO1xuICAgICAgICByZXR1cm4gZXZ0O1xuICAgIH1cblxuICAgIEN1c3RvbUV2ZW50LnByb3RvdHlwZSA9IHdpbmRvdy5FdmVudC5wcm90b3R5cGU7XG5cbiAgICB3aW5kb3cuQ3VzdG9tRXZlbnQgPSBDdXN0b21FdmVudDtcbn0iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuLyoqXG4gKiBJbXBlbGVtZW50cyBYc29sbGEgTG9naW4gQXBpXG4gKiBAcGFyYW0gcHJvamVjdElkIC0gcHJvamVjdCdzIHVuaXF1ZSBpZGVudGlmaWVyXG4gKiBAcGFyYW0gYmFzZVVybCAtIGFwaSBlbmRwb2ludFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxudmFyIFhMQXBpID0gZnVuY3Rpb24gKHByb2plY3RJZCwgYmFzZVVybCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmJhc2VVcmwgPSBiYXNlVXJsIHx8ICcvL2xvZ2luLnhzb2xsYS5jb20vYXBpLyc7XG5cbiAgICB0aGlzLnByb2plY3RJZCA9IHByb2plY3RJZDtcblxuICAgIHRoaXMubWFrZUFwaUNhbGwgPSBmdW5jdGlvbiAocGFyYW1zLCBzdWNjZXNzLCBlcnJvcikge1xuICAgICAgICB2YXIgciA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG4gICAgICAgIHIub3BlbihwYXJhbXMubWV0aG9kLCBzZWxmLmJhc2VVcmwgKyBwYXJhbXMuZW5kcG9pbnQsIHRydWUpO1xuICAgICAgICByLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgICAgICAgIGlmIChyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyhKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcih7ZXJyb3I6IHttZXNzYWdlOiAnTmV0d29ya2luZyBlcnJvcicsIGNvZGU6IHIuc3RhdHVzfX0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBpZiAocGFyYW1zLm1ldGhvZCA9PSAnUE9TVCcpIHtcbiAgICAgICAgICAgIHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwiKTtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMucG9zdEJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy5tZXRob2QgPT0gJ0dFVCcpIHtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMuZ2V0QXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuLyoqXG4gKiBHZXQgYWxsIGF2aWFsYWJsZSBzb2NpYWwgbWV0aG9kcyBhdXRoIHVybFxuICogQHBhcmFtIHN1Y2Nlc3MgLSBzdWNjZXNzIGNhbGxiYWNrXG4gKiBAcGFyYW0gZXJyb3IgLSBlcnJvciBjYWxsYmFja1xuICogQHBhcmFtIGdldEFyZ3VtZW50cyAtIGFkZGl0aW9uYWwgcGFyYW1zIHRvIHNlbmQgd2l0aCByZXF1ZXN0XG4gKi9cblhMQXBpLnByb3RvdHlwZS5nZXRTb2NpYWxzVVJMcyA9IGZ1bmN0aW9uIChzdWNjZXNzLCBlcnJvciwgZ2V0QXJndW1lbnRzKSB7XG4gICAgdmFyIHN0ciA9IFwiXCI7XG4gICAgZm9yICh2YXIga2V5IGluIGdldEFyZ3VtZW50cykge1xuICAgICAgICBpZiAoc3RyICE9IFwiXCIpIHtcbiAgICAgICAgICAgIHN0ciArPSBcIiZcIjtcbiAgICAgICAgfVxuICAgICAgICBzdHIgKz0ga2V5ICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoZ2V0QXJndW1lbnRzW2tleV0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ3NvY2lhbC9sb2dpbl91cmxzPycgKyBzdHIsIGdldEFyZ3VtZW50czogbnVsbH0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cblhMQXBpLnByb3RvdHlwZS5sb2dpblBhc3NBdXRoID0gZnVuY3Rpb24gKGxvZ2luLCBwYXNzLCByZW1lbWJlck1lLCByZWRpcmVjdFVybCwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICB2YXIgYm9keSA9IHtcbiAgICAgICAgdXNlcm5hbWU6IGxvZ2luLFxuICAgICAgICBwYXNzd29yZDogcGFzcyxcbiAgICAgICAgcmVtZW1iZXJfbWU6IHJlbWVtYmVyTWVcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdQT1NUJywgZW5kcG9pbnQ6ICdwcm94eS9sb2dpbj9wcm9qZWN0SWQ9Jyt0aGlzLnByb2plY3RJZCArICcmcmVkaXJlY3RfdXJsPScgKyBlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmwpLCBwb3N0Qm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSl9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUuc21zQXV0aCA9IGZ1bmN0aW9uIChwaG9uZU51bWJlciwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzbXMnLCBnZXRBcmd1bWVudHM6ICdwaG9uZU51bWJlcj0nICsgcGhvbmVOdW1iZXJ9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhMQXBpO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbnJlcXVpcmUoJy4vc3VwcG9ydHMnKTtcblxuaW1wb3J0IFhMQXBpIGZyb20gJy4veGxhcGknO1xuLyoqXG4gKiBDcmVhdGUgYW4gYEF1dGgwYCBpbnN0YW5jZSB3aXRoIGBvcHRpb25zYFxuICpcbiAqIEBjbGFzcyBYTFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxuY29uc3QgREVGQVVMVF9DT05GSUcgPSB7XG4gICAgZXJyb3JIYW5kbGVyOiBmdW5jdGlvbiAoYSkge1xuICAgIH0sXG4gICAgbG9naW5QYXNzVmFsaWRhdG9yOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIGlzTWFya3VwU29jaWFsc0hhbmRsZXJzRW5hYmxlZDogZmFsc2UsXG4gICAgYXBpVXJsOiAnLy9sb2dpbi54c29sbGEuY29tL2FwaS8nLFxuICAgIG1heFhMQ2xpY2tEZXB0aDogMjAsXG4gICAgb25seVdpZGdldHM6IGZhbHNlLFxuICAgIHByZWxvYWRlcjogJzxkaXY+PC9kaXY+J1xufTtcblxuY29uc3QgSU5WQUxJRF9MT0dJTl9FUlJPUl9DT0RFID0gMTtcbmNvbnN0IElOQ09SUkVDVF9MT0dJTl9PUl9QQVNTV09SRF9FUlJPUl9DT0RFID0gMjtcblxuY2xhc3MgWEwge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnNvY2lhbFVybHMgPSB7fTtcbiAgICAgICAgdGhpcy5ldmVudFR5cGVzID0ge1xuICAgICAgICAgICAgTE9BRDogJ2xvYWQnLFxuICAgICAgICAgICAgQ0xPU0U6ICdjbG9zZSdcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgfVxuXG4gICAgaW5pdChvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuY29uZmlnID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9DT05GSUcsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLmFwaSA9IG5ldyBYTEFwaShvcHRpb25zLnByb2plY3RJZCwgdGhpcy5jb25maWcuYXBpVXJsKTtcblxuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLmV2ZW50VHlwZXMpLm1hcCgoZXZlbnRLZXkpID0+IHtcbiAgICAgICAgICAgIHRoaXMub24odGhpcy5ldmVudFR5cGVzW2V2ZW50S2V5XSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghdGhpcy5jb25maWcub25seVdpZGdldHMpIHtcblxuICAgICAgICAgICAgbGV0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zLnByb2plY3RJZCA9IG9wdGlvbnMucHJvamVjdElkO1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnJlZGlyZWN0X3VybCA9IHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVTb2NpYWxMaW5rcyA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaS5nZXRTb2NpYWxzVVJMcygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zb2NpYWxVcmxzID0ge307XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNvY2lhbFVybHNbJ3NuLScgKyBrZXldID0gcmVzcG9uc2Vba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgfSwgcGFyYW1zKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHVwZGF0ZVNvY2lhbExpbmtzKCk7XG4gICAgICAgICAgICBzZXRJbnRlcnZhbCh1cGRhdGVTb2NpYWxMaW5rcywgMTAwMCAqIDYwICogNTkpO1xuXG4gICAgICAgICAgICBjb25zdCBtYXhDbGlja0RlcHRoID0gdGhpcy5jb25maWcubWF4WExDbGlja0RlcHRoO1xuICAgICAgICAgICAgLy8gRmluZCBjbG9zZXN0IGFuY2VzdG9yIHdpdGggZGF0YS14bC1hdXRoIGF0dHJpYnV0ZVxuICAgICAgICAgICAgZnVuY3Rpb24gZmluZEFuY2VzdG9yKGVsKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVsLmF0dHJpYnV0ZXNbJ2RhdGEteGwtYXV0aCddKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgICAgICAgIHdoaWxlICgoZWwgPSBlbC5wYXJlbnRFbGVtZW50KSAmJiAhZWwuYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ10gJiYgKytpIDwgbWF4Q2xpY2tEZXB0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuaXNNYXJrdXBTb2NpYWxzSGFuZGxlcnNFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBmaW5kQW5jZXN0b3IoZS50YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICAvLyBEbyBub3RoaW5nIGlmIGNsaWNrIHdhcyBvdXRzaWRlIG9mIGVsZW1lbnRzIHdpdGggZGF0YS14bC1hdXRoXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeGxEYXRhID0gdGFyZ2V0LmF0dHJpYnV0ZXNbJ2RhdGEteGwtYXV0aCddO1xuICAgICAgICAgICAgICAgICAgICBpZiAoeGxEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbm9kZVZhbHVlID0geGxEYXRhLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZ2luKHthdXRoVHlwZTogbm9kZVZhbHVlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm1zIGxvZ2luXG4gICAgICogQHBhcmFtIHByb3BcbiAgICAgKiBAcGFyYW0gZXJyb3IgLSBjYWxsIGluIGNhc2UgZXJyb3JcbiAgICAgKiBAcGFyYW0gc3VjY2Vzc1xuICAgICAqL1xuICAgIGxvZ2luKHByb3AsIGVycm9yLCBzdWNjZXNzKSB7XG5cbiAgICAgICAgaWYgKCFwcm9wIHx8ICF0aGlzLnNvY2lhbFVybHMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBwcm9wc1xuICAgICAgICAgKiBhdXRoVHlwZTogc24tPHNvY2lhbCBuYW1lPiwgbG9naW4tcGFzcywgc21zXG4gICAgICAgICAqL1xuICAgICAgICBpZiAocHJvcC5hdXRoVHlwZSkge1xuICAgICAgICAgICAgaWYgKHByb3AuYXV0aFR5cGUuc3RhcnRzV2l0aCgnc24tJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzb2NpYWxVcmwgPSB0aGlzLnNvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICAgICAgaWYgKHNvY2lhbFVybCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB0aGlzLnNvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQXV0aCB0eXBlOiAnICsgcHJvcC5hdXRoVHlwZSArICcgZG9lc25cXCd0IGV4aXN0Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ2xvZ2luLXBhc3MnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGkubG9naW5QYXNzQXV0aChwcm9wLmxvZ2luLCBwcm9wLnBhc3MsIHByb3AucmVtZW1iZXJNZSwgdGhpcy5jb25maWcucmVkaXJlY3RVcmwsIChyZXMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcy5sb2dpbl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbmlzaEF1dGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXMubG9naW5fdXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzcyh7c3RhdHVzOiAnc3VjY2VzcycsIGZpbmlzaDogZmluaXNoQXV0aCwgcmVkaXJlY3RVcmw6IHJlcy5sb2dpbl91cmx9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluaXNoQXV0aCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IodGhpcy5jcmVhdGVFcnJvck9iamVjdCgnTG9naW4gb3IgcGFzcyBub3QgdmFsaWQnLCBJTkNPUlJFQ1RfTE9HSU5fT1JfUEFTU1dPUkRfRVJST1JfQ09ERSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wLmF1dGhUeXBlID09ICdzbXMnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNtc0F1dGhTdGVwID09ICdwaG9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcGkuc21zQXV0aChwcm9wLnBob25lTnVtYmVyLCBudWxsLCBudWxsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNtc0F1dGhTdGVwID09ICdjb2RlJykge1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmtub3duIGF1dGggdHlwZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY3JlYXRlRXJyb3JPYmplY3QobWVzc2FnZSwgY29kZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIGNvZGU6IGNvZGUgfHwgLTFcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgZ2V0UHJvamVjdElkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcucHJvamVjdElkO1xuICAgIH07XG5cbiAgICBnZXRSZWRpcmVjdFVSTCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLnJlZGlyZWN0VXJsO1xuICAgIH07XG5cbiAgICBBdXRoV2lkZ2V0KGVsZW1lbnRJZCwgb3B0aW9ucykge1xuICAgICAgICBpZiAodGhpcy5hcGkpIHtcbiAgICAgICAgICAgIGlmICghZWxlbWVudElkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignTm8gZGl2IG5hbWUhJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gYCR7b3B0aW9ucy53aWR0aCB8fCA0MDB9cHhgO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IGAke29wdGlvbnMuaGVpZ2h0IHx8IDU1MH1weGA7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB3aWRnZXRCYXNlVXJsID0gb3B0aW9ucy53aWRnZXRCYXNlVXJsIHx8ICdodHRwczovL3hsLXdpZGdldC54c29sbGEuY29tLyc7XG5cbiAgICAgICAgICAgICAgICAvLyB2YXIgc3R5bGVTdHJpbmcgPSAnYm9yZWRlcjpub25lJztcbiAgICAgICAgICAgICAgICBsZXQgc3JjID0gd2lkZ2V0QmFzZVVybCArICc/cHJvamVjdElkPScgKyB0aGlzLmdldFByb2plY3RJZCgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmxvY2FsZSkge1xuICAgICAgICAgICAgICAgICAgICBzcmMgPSBzcmMgKyAnJmxvY2FsZT0nICsgdGhpcy5jb25maWcubG9jYWxlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWcuZmllbGRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHNyYyA9IHNyYyArICcmZmllbGRzPScgKyB0aGlzLmNvbmZpZy5maWVsZHM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHJlZGlyZWN0VXJsID0gdGhpcy5nZXRSZWRpcmVjdFVSTCgpO1xuICAgICAgICAgICAgICAgIGlmIChyZWRpcmVjdFVybCkge1xuICAgICAgICAgICAgICAgICAgICBzcmMgPSBzcmMgKyAnJnJlZGlyZWN0VXJsPScgKyBlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmwpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIHZhciB3aWRnZXRIdG1sID0gJzxpZnJhbWUgZnJhbWVib3JkZXI9XCIwXCIgd2lkdGg9XCInK3dpZHRoKydcIiBoZWlnaHQ9XCInK2hlaWdodCsnXCIgIHNyYz1cIicrc3JjKydcIj5Ob3Qgc3VwcG9ydGVkPC9pZnJhbWU+JztcbiAgICAgICAgICAgICAgICBjb25zdCB3aWRnZXRJZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUNoaWxkKHByZWxvYWRlcik7XG4gICAgICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdsb2FkJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLmZyYW1lQm9yZGVyID0gJzAnO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zcmMgPSBzcmM7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLmlkID0gJ1hzb2xsYUxvZ2luV2lkZ2V0SWZyYW1lJ1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRNZXRob2QgPSB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciA/ICdhZGRFdmVudExpc3RlbmVyJyA6ICdhdHRhY2hFdmVudCc7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRlciA9IHdpbmRvd1tldmVudE1ldGhvZF07XG4gICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZUV2ZW50ID0gZXZlbnRNZXRob2QgPT0gJ2F0dGFjaEV2ZW50JyA/ICdvbm1lc3NhZ2UnIDogJ21lc3NhZ2UnO1xuXG4gICAgICAgICAgICAgICAgLy8gTGlzdGVuIHRvIG1lc3NhZ2UgZnJvbSBjaGlsZCB3aW5kb3dcbiAgICAgICAgICAgICAgICBldmVudGVyKG1lc3NhZ2VFdmVudCwgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KHRoaXMuZXZlbnRUeXBlc1tlLmRhdGFdKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaGVyLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHByZWxvYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICAgICAgICAgICAgcHJlbG9hZGVyLmlubmVySFRNTCA9IHRoaXMuY29uZmlnLnByZWxvYWRlcjtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtZW50SWQpO1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zdHlsZS5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQocHJlbG9hZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZCh3aWRnZXRJZnJhbWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0VsZW1lbnQgXFxcIicgKyBlbGVtZW50SWQgKyAnXFxcIiBub3QgZm91bmQhJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdQbGVhc2UgcnVuIFhMLmluaXQoKSBmaXJzdCcpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG9uQ2xvc2VFdmVudCgpIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnWHNvbGxhTG9naW5XaWRnZXRJZnJhbWUnKTtcbiAgICAgICAgZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsZW1lbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGxpbmsgZXZlbnQgd2l0aCBoYW5kbGVyXG4gICAgICogQHBhcmFtIGV2ZW50XG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKi9cblxuICAgIG9uKGV2ZW50LCBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyIHx8IG51bGw7XG5cbiAgICAgICAgaWYgKGV2ZW50ID09PSB0aGlzLmV2ZW50VHlwZXMuQ0xPU0UpIHtcbiAgICAgICAgICAgIGlmICghaGFuZGxlcikge1xuICAgICAgICAgICAgICAgIGhhbmRsZXIgPSB0aGlzLm9uQ2xvc2VFdmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hlci5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCB0aGlzLm9uQ2xvc2VFdmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmRpc3BhdGNoZXIuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlcik7XG4gICAgfTtcbn1cblxuY29uc3QgcmVzdWx0ID0gbmV3IFhMKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVzdWx0OyJdfQ==
