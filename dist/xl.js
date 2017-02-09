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
    }

    _createClass(XL, [{
        key: 'init',
        value: function init(options) {
            var _this = this;

            this.config = Object.assign({}, DEFAULT_CONFIG, options);
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
                        var width = options.width || 400 + 'px';
                        var height = options.height || 550 + 'px';

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
                            document.dispatchEvent(event);
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
                            document.dispatchEvent(event);
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
                    document.removeEventListener(event, this.onCloseEvent);
                }
            }

            document.addEventListener(event, handler);
        }
    }]);

    return XL;
}();

var result = new XL();

module.exports = result;

},{"./supports":1,"./xlapi":2}]},{},["main"])("main")
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc3VwcG9ydHMuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUE7OztBQUdBLElBQUksQ0FBQyxPQUFPLFNBQVAsQ0FBaUIsVUFBdEIsRUFBa0M7QUFDOUIsV0FBTyxTQUFQLENBQWlCLFVBQWpCLEdBQThCLFVBQVMsWUFBVCxFQUF1QixRQUF2QixFQUFpQztBQUMzRCxtQkFBVyxZQUFZLENBQXZCO0FBQ0EsZUFBTyxLQUFLLE9BQUwsQ0FBYSxZQUFiLEVBQTJCLFFBQTNCLE1BQXlDLFFBQWhEO0FBQ0gsS0FIRDtBQUlIOzs7OztBQ1JEOzs7QUFHQTs7Ozs7OztBQU9BLElBQUksUUFBUSxTQUFSLEtBQVEsQ0FBVSxTQUFWLEVBQXFCLE9BQXJCLEVBQThCO0FBQ3RDLFFBQUksT0FBTyxJQUFYO0FBQ0EsU0FBSyxPQUFMLEdBQWUsV0FBVyx5QkFBMUI7O0FBRUEsU0FBSyxTQUFMLEdBQWlCLFNBQWpCOztBQUVBLFNBQUssV0FBTCxHQUFtQixVQUFVLE1BQVYsRUFBa0IsT0FBbEIsRUFBMkIsS0FBM0IsRUFBa0M7QUFDakQsWUFBSSxJQUFJLElBQUksY0FBSixFQUFSO0FBQ0EsVUFBRSxlQUFGLEdBQW9CLElBQXBCO0FBQ0EsVUFBRSxJQUFGLENBQU8sT0FBTyxNQUFkLEVBQXNCLEtBQUssT0FBTCxHQUFlLE9BQU8sUUFBNUMsRUFBc0QsSUFBdEQ7QUFDQSxVQUFFLGtCQUFGLEdBQXVCLFlBQVk7QUFDL0IsZ0JBQUksRUFBRSxVQUFGLElBQWdCLENBQXBCLEVBQXVCO0FBQ25CLG9CQUFJLEVBQUUsTUFBRixJQUFZLEdBQWhCLEVBQXFCO0FBQ2pCLDRCQUFRLEtBQUssS0FBTCxDQUFXLEVBQUUsWUFBYixDQUFSO0FBQ0gsaUJBRkQsTUFFTztBQUNILHdCQUFJLEVBQUUs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USxLQUFSLENBQWMsS0FBZCxHQUFzQixLQUF0QjtBQUNBLG9DQUFRLEtBQVIsQ0FBYyxNQUFkLEdBQXVCLE1BQXZCO0FBQ0Esb0NBQVEsV0FBUixDQUFvQixTQUFwQjtBQUNBLG9DQUFRLFdBQVIsQ0FBb0IsWUFBcEI7QUFDSCx5QkFMRCxNQUtPO0FBQ0gsb0NBQVEsS0FBUixDQUFjLGVBQWUsU0FBZixHQUEyQixlQUF6QztBQUNIO0FBNURFO0FBOEROO0FBQ0osYUFsRUQsTUFrRU87QUFDSCx3QkFBUSxLQUFSLENBQWMsNEJBQWQ7QUFDSDtBQUNKOzs7dUNBRWM7QUFDWCxnQkFBSSxVQUFVLFNBQVMsY0FBVCxDQUF3Qix5QkFBeEIsQ0FBZDtBQUNBLG9CQUFRLFVBQVIsQ0FBbUIsV0FBbkIsQ0FBK0IsT0FBL0I7QUFDSDs7QUFFRDs7Ozs7Ozs7MkJBTUcsSyxFQUFPLE8sRUFBUztBQUNmLHNCQUFVLFdBQVcsSUFBckI7O0FBRUEsZ0JBQUksVUFBVSxLQUFLLFVBQUwsQ0FBZ0IsS0FBOUIsRUFBcUM7QUFDakMsb0JBQUksQ0FBQyxPQUFMLEVBQWM7QUFDViw4QkFBVSxLQUFLLFlBQWY7QUFDSCxpQkFGRCxNQUdLO0FBQ0QsNkJBQVMsbUJBQVQsQ0FBNkIsS0FBN0IsRUFBb0MsS0FBSyxZQUF6QztBQUNIO0FBQ0o7O0FBRUQscUJBQVMsZ0JBQVQsQ0FBMEIsS0FBMUIsRUFBaUMsT0FBakM7QUFDSDs7Ozs7O0FBR0wsSUFBTSxTQUFTLElBQUksRUFBSixFQUFmOztBQUVBLE9BQU8sT0FBUCxHQUFpQixNQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAwNy4xMS4xNi5cbiAqL1xuaWYgKCFTdHJpbmcucHJvdG90eXBlLnN0YXJ0c1dpdGgpIHtcbiAgICBTdHJpbmcucHJvdG90eXBlLnN0YXJ0c1dpdGggPSBmdW5jdGlvbihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSB7XG4gICAgICAgIHBvc2l0aW9uID0gcG9zaXRpb24gfHwgMDtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXhPZihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSA9PT0gcG9zaXRpb247XG4gICAgfTtcbn0iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuLyoqXG4gKiBJbXBlbGVtZW50cyBYc29sbGEgTG9naW4gQXBpXG4gKiBAcGFyYW0gcHJvamVjdElkIC0gcHJvamVjdCdzIHVuaXF1ZSBpZGVudGlmaWVyXG4gKiBAcGFyYW0gYmFzZVVybCAtIGFwaSBlbmRwb2ludFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxudmFyIFhMQXBpID0gZnVuY3Rpb24gKHByb2plY3RJZCwgYmFzZVVybCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmJhc2VVcmwgPSBiYXNlVXJsIHx8ICcvL2xvZ2luLnhzb2xsYS5jb20vYXBpLyc7XG5cbiAgICB0aGlzLnByb2plY3RJZCA9IHByb2plY3RJZDtcblxuICAgIHRoaXMubWFrZUFwaUNhbGwgPSBmdW5jdGlvbiAocGFyYW1zLCBzdWNjZXNzLCBlcnJvcikge1xuICAgICAgICB2YXIgciA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG4gICAgICAgIHIub3BlbihwYXJhbXMubWV0aG9kLCBzZWxmLmJhc2VVcmwgKyBwYXJhbXMuZW5kcG9pbnQsIHRydWUpO1xuICAgICAgICByLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgICAgICAgIGlmIChyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyhKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcih7ZXJyb3I6IHttZXNzYWdlOiAnTmV0d29ya2luZyBlcnJvcicsIGNvZGU6IHIuc3RhdHVzfX0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBpZiAocGFyYW1zLm1ldGhvZCA9PSAnUE9TVCcpIHtcbiAgICAgICAgICAgIHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwiKTtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMucG9zdEJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy5tZXRob2QgPT0gJ0dFVCcpIHtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMuZ2V0QXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuLyoqXG4gKiBHZXQgYWxsIGF2aWFsYWJsZSBzb2NpYWwgbWV0aG9kcyBhdXRoIHVybFxuICogQHBhcmFtIHN1Y2Nlc3MgLSBzdWNjZXNzIGNhbGxiYWNrXG4gKiBAcGFyYW0gZXJyb3IgLSBlcnJvciBjYWxsYmFja1xuICogQHBhcmFtIGdldEFyZ3VtZW50cyAtIGFkZGl0aW9uYWwgcGFyYW1zIHRvIHNlbmQgd2l0aCByZXF1ZXN0XG4gKi9cblhMQXBpLnByb3RvdHlwZS5nZXRTb2NpYWxzVVJMcyA9IGZ1bmN0aW9uIChzdWNjZXNzLCBlcnJvciwgZ2V0QXJndW1lbnRzKSB7XG4gICAgdmFyIHN0ciA9IFwiXCI7XG4gICAgZm9yICh2YXIga2V5IGluIGdldEFyZ3VtZW50cykge1xuICAgICAgICBpZiAoc3RyICE9IFwiXCIpIHtcbiAgICAgICAgICAgIHN0ciArPSBcIiZcIjtcbiAgICAgICAgfVxuICAgICAgICBzdHIgKz0ga2V5ICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoZ2V0QXJndW1lbnRzW2tleV0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ3NvY2lhbC9sb2dpbl91cmxzPycgKyBzdHIsIGdldEFyZ3VtZW50czogbnVsbH0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cblhMQXBpLnByb3RvdHlwZS5sb2dpblBhc3NBdXRoID0gZnVuY3Rpb24gKGxvZ2luLCBwYXNzLCByZW1lbWJlck1lLCByZWRpcmVjdFVybCwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICB2YXIgYm9keSA9IHtcbiAgICAgICAgdXNlcm5hbWU6IGxvZ2luLFxuICAgICAgICBwYXNzd29yZDogcGFzcyxcbiAgICAgICAgcmVtZW1iZXJfbWU6IHJlbWVtYmVyTWVcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdQT1NUJywgZW5kcG9pbnQ6ICdwcm94eS9sb2dpbj9wcm9qZWN0SWQ9Jyt0aGlzLnByb2plY3RJZCArICcmcmVkaXJlY3RfdXJsPScgKyBlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmwpLCBwb3N0Qm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSl9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUuc21zQXV0aCA9IGZ1bmN0aW9uIChwaG9uZU51bWJlciwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzbXMnLCBnZXRBcmd1bWVudHM6ICdwaG9uZU51bWJlcj0nICsgcGhvbmVOdW1iZXJ9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhMQXBpO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbnJlcXVpcmUoJy4vc3VwcG9ydHMnKTtcblxuaW1wb3J0IFhMQXBpIGZyb20gJy4veGxhcGknO1xuLyoqXG4gKiBDcmVhdGUgYW4gYEF1dGgwYCBpbnN0YW5jZSB3aXRoIGBvcHRpb25zYFxuICpcbiAqIEBjbGFzcyBYTFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxuY29uc3QgREVGQVVMVF9DT05GSUcgPSB7XG4gICAgZXJyb3JIYW5kbGVyOiBmdW5jdGlvbiAoYSkge1xuICAgIH0sXG4gICAgbG9naW5QYXNzVmFsaWRhdG9yOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIGlzTWFya3VwU29jaWFsc0hhbmRsZXJzRW5hYmxlZDogZmFsc2UsXG4gICAgYXBpVXJsOiAnLy9sb2dpbi54c29sbGEuY29tL2FwaS8nLFxuICAgIG1heFhMQ2xpY2tEZXB0aDogMjAsXG4gICAgb25seVdpZGdldHM6IGZhbHNlLFxuICAgIHByZWxvYWRlcjogJzxkaXY+PC9kaXY+J1xufTtcblxuY29uc3QgSU5WQUxJRF9MT0dJTl9FUlJPUl9DT0RFID0gMTtcbmNvbnN0IElOQ09SUkVDVF9MT0dJTl9PUl9QQVNTV09SRF9FUlJPUl9DT0RFID0gMjtcblxuY2xhc3MgWEwge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnNvY2lhbFVybHMgPSB7fTtcbiAgICAgICAgdGhpcy5ldmVudFR5cGVzID0ge1xuICAgICAgICAgICAgTE9BRDogJ2xvYWQnLFxuICAgICAgICAgICAgQ0xPU0U6ICdjbG9zZSdcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBpbml0KG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5jb25maWcgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX0NPTkZJRywgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuYXBpID0gbmV3IFhMQXBpKG9wdGlvbnMucHJvamVjdElkLCB0aGlzLmNvbmZpZy5hcGlVcmwpO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuZXZlbnRUeXBlcykubWFwKChldmVudEtleSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vbih0aGlzLmV2ZW50VHlwZXNbZXZlbnRLZXldKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCF0aGlzLmNvbmZpZy5vbmx5V2lkZ2V0cykge1xuXG4gICAgICAgICAgICBsZXQgcGFyYW1zID0ge307XG4gICAgICAgICAgICBwYXJhbXMucHJvamVjdElkID0gb3B0aW9ucy5wcm9qZWN0SWQ7XG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcucmVkaXJlY3RVcmwpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMucmVkaXJlY3RfdXJsID0gdGhpcy5jb25maWcucmVkaXJlY3RVcmw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZVNvY2lhbExpbmtzID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBpLmdldFNvY2lhbHNVUkxzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNvY2lhbFVybHMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc29jaWFsVXJsc1snc24tJyArIGtleV0gPSByZXNwb25zZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICB9LCBwYXJhbXMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdXBkYXRlU29jaWFsTGlua3MoKTtcbiAgICAgICAgICAgIHNldEludGVydmFsKHVwZGF0ZVNvY2lhbExpbmtzLCAxMDAwICogNjAgKiA1OSk7XG5cbiAgICAgICAgICAgIGNvbnN0IG1heENsaWNrRGVwdGggPSB0aGlzLmNvbmZpZy5tYXhYTENsaWNrRGVwdGg7XG4gICAgICAgICAgICAvLyBGaW5kIGNsb3Nlc3QgYW5jZXN0b3Igd2l0aCBkYXRhLXhsLWF1dGggYXR0cmlidXRlXG4gICAgICAgICAgICBmdW5jdGlvbiBmaW5kQW5jZXN0b3IoZWwpIHtcbiAgICAgICAgICAgICAgICBpZiAoZWwuYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ10pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgICAgICAgICAgd2hpbGUgKChlbCA9IGVsLnBhcmVudEVsZW1lbnQpICYmICFlbC5hdHRyaWJ1dGVzWydkYXRhLXhsLWF1dGgnXSAmJiArK2kgPCBtYXhDbGlja0RlcHRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5pc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGZpbmRBbmNlc3RvcihlLnRhcmdldCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIERvIG5vdGhpbmcgaWYgY2xpY2sgd2FzIG91dHNpZGUgb2YgZWxlbWVudHMgd2l0aCBkYXRhLXhsLWF1dGhcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB4bERhdGEgPSB0YXJnZXQuYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ107XG4gICAgICAgICAgICAgICAgICAgIGlmICh4bERhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBub2RlVmFsdWUgPSB4bERhdGEubm9kZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGVWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9naW4oe2F1dGhUeXBlOiBub2RlVmFsdWV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybXMgbG9naW5cbiAgICAgKiBAcGFyYW0gcHJvcFxuICAgICAqIEBwYXJhbSBlcnJvciAtIGNhbGwgaW4gY2FzZSBlcnJvclxuICAgICAqIEBwYXJhbSBzdWNjZXNzXG4gICAgICovXG4gICAgbG9naW4ocHJvcCwgZXJyb3IsIHN1Y2Nlc3MpIHtcblxuICAgICAgICBpZiAoIXByb3AgfHwgIXRoaXMuc29jaWFsVXJscykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHByb3BzXG4gICAgICAgICAqIGF1dGhUeXBlOiBzbi08c29jaWFsIG5hbWU+LCBsb2dpbi1wYXNzLCBzbXNcbiAgICAgICAgICovXG4gICAgICAgIGlmIChwcm9wLmF1dGhUeXBlKSB7XG4gICAgICAgICAgICBpZiAocHJvcC5hdXRoVHlwZS5zdGFydHNXaXRoKCdzbi0nKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNvY2lhbFVybCA9IHRoaXMuc29jaWFsVXJsc1twcm9wLmF1dGhUeXBlXTtcbiAgICAgICAgICAgICAgICBpZiAoc29jaWFsVXJsICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHRoaXMuc29jaWFsVXJsc1twcm9wLmF1dGhUeXBlXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBdXRoIHR5cGU6ICcgKyBwcm9wLmF1dGhUeXBlICsgJyBkb2VzblxcJ3QgZXhpc3QnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnbG9naW4tcGFzcycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaS5sb2dpblBhc3NBdXRoKHByb3AubG9naW4sIHByb3AucGFzcywgcHJvcC5yZW1lbWJlck1lLCB0aGlzLmNvbmZpZy5yZWRpcmVjdFVybCwgKHJlcykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzLmxvZ2luX3VybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluaXNoQXV0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlcy5sb2dpbl91cmw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzKHtzdGF0dXM6ICdzdWNjZXNzJywgZmluaXNoOiBmaW5pc2hBdXRoLCByZWRpcmVjdFVybDogcmVzLmxvZ2luX3VybH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5pc2hBdXRoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcih0aGlzLmNyZWF0ZUVycm9yT2JqZWN0KCdMb2dpbiBvciBwYXNzIG5vdCB2YWxpZCcsIElOQ09SUkVDVF9MT0dJTl9PUl9QQVNTV09SRF9FUlJPUl9DT0RFKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ3NtcycpIHtcbiAgICAgICAgICAgICAgICBpZiAoc21zQXV0aFN0ZXAgPT0gJ3Bob25lJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwaS5zbXNBdXRoKHByb3AucGhvbmVOdW1iZXIsIG51bGwsIG51bGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc21zQXV0aFN0ZXAgPT0gJ2NvZGUnKSB7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gYXV0aCB0eXBlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjcmVhdGVFcnJvck9iamVjdChtZXNzYWdlLCBjb2RlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgY29kZTogY29kZSB8fCAtMVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBnZXRQcm9qZWN0SWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy5wcm9qZWN0SWQ7XG4gICAgfTtcblxuICAgIGdldFJlZGlyZWN0VVJMKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcucmVkaXJlY3RVcmw7XG4gICAgfTtcblxuICAgIEF1dGhXaWRnZXQoZWxlbWVudElkLCBvcHRpb25zKSB7XG4gICAgICAgIGlmICh0aGlzLmFwaSkge1xuICAgICAgICAgICAgaWYgKCFlbGVtZW50SWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdObyBkaXYgbmFtZSEnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBvcHRpb25zLndpZHRoIHx8IDQwMCArICdweCc7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgNTUwICsgJ3B4JztcblxuICAgICAgICAgICAgICAgIGNvbnN0IHdpZGdldEJhc2VVcmwgPSBvcHRpb25zLndpZGdldEJhc2VVcmwgfHwgJ2h0dHBzOi8veGwtd2lkZ2V0Lnhzb2xsYS5jb20vJztcblxuICAgICAgICAgICAgICAgIC8vIHZhciBzdHlsZVN0cmluZyA9ICdib3JlZGVyOm5vbmUnO1xuICAgICAgICAgICAgICAgIGxldCBzcmMgPSB3aWRnZXRCYXNlVXJsICsgJz9wcm9qZWN0SWQ9JyArIHRoaXMuZ2V0UHJvamVjdElkKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWcubG9jYWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNyYyA9IHNyYyArICcmbG9jYWxlPScgKyB0aGlzLmNvbmZpZy5sb2NhbGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5maWVsZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgc3JjID0gc3JjICsgJyZmaWVsZHM9JyArIHRoaXMuY29uZmlnLmZpZWxkcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgcmVkaXJlY3RVcmwgPSB0aGlzLmdldFJlZGlyZWN0VVJMKCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlZGlyZWN0VXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIHNyYyA9IHNyYyArICcmcmVkaXJlY3RVcmw9JyArIGVuY29kZVVSSUNvbXBvbmVudChyZWRpcmVjdFVybCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gdmFyIHdpZGdldEh0bWwgPSAnPGlmcmFtZSBmcmFtZWJvcmRlcj1cIjBcIiB3aWR0aD1cIicrd2lkdGgrJ1wiIGhlaWdodD1cIicraGVpZ2h0KydcIiAgc3JjPVwiJytzcmMrJ1wiPk5vdCBzdXBwb3J0ZWQ8L2lmcmFtZT4nO1xuICAgICAgICAgICAgICAgIGNvbnN0IHdpZGdldElmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2hpbGQocHJlbG9hZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2xvYWQnKTtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUud2lkdGggPSAwO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS5oZWlnaHQgPSAwO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5mcmFtZUJvcmRlciA9ICcwJztcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3JjID0gc3JjO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5pZCA9ICdYc29sbGFMb2dpbldpZGdldElmcmFtZSdcblxuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50TWV0aG9kID0gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgPyAnYWRkRXZlbnRMaXN0ZW5lcicgOiAnYXR0YWNoRXZlbnQnO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50ZXIgPSB3aW5kb3dbZXZlbnRNZXRob2RdO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VFdmVudCA9IGV2ZW50TWV0aG9kID09ICdhdHRhY2hFdmVudCcgPyAnb25tZXNzYWdlJyA6ICdtZXNzYWdlJztcblxuICAgICAgICAgICAgICAgIC8vIExpc3RlbiB0byBtZXNzYWdlIGZyb20gY2hpbGQgd2luZG93XG4gICAgICAgICAgICAgICAgZXZlbnRlcihtZXNzYWdlRXZlbnQsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBldmVudCA9IG5ldyBDdXN0b21FdmVudCh0aGlzLmV2ZW50VHlwZXNbZS5kYXRhXSk7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHByZWxvYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICAgICAgICAgICAgcHJlbG9hZGVyLmlubmVySFRNTCA9IHRoaXMuY29uZmlnLnByZWxvYWRlcjtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtZW50SWQpO1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zdHlsZS5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQocHJlbG9hZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZCh3aWRnZXRJZnJhbWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0VsZW1lbnQgXFxcIicgKyBlbGVtZW50SWQgKyAnXFxcIiBub3QgZm91bmQhJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdQbGVhc2UgcnVuIFhMLmluaXQoKSBmaXJzdCcpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG9uQ2xvc2VFdmVudCgpIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnWHNvbGxhTG9naW5XaWRnZXRJZnJhbWUnKTtcbiAgICAgICAgZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsZW1lbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGxpbmsgZXZlbnQgd2l0aCBoYW5kbGVyXG4gICAgICogQHBhcmFtIGV2ZW50XG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKi9cblxuICAgIG9uKGV2ZW50LCBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyIHx8IG51bGw7XG5cbiAgICAgICAgaWYgKGV2ZW50ID09PSB0aGlzLmV2ZW50VHlwZXMuQ0xPU0UpIHtcbiAgICAgICAgICAgIGlmICghaGFuZGxlcikge1xuICAgICAgICAgICAgICAgIGhhbmRsZXIgPSB0aGlzLm9uQ2xvc2VFdmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIHRoaXMub25DbG9zZUV2ZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGhhbmRsZXIpO1xuICAgIH07XG59XG5cbmNvbnN0IHJlc3VsdCA9IG5ldyBYTCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlc3VsdDsiXX0=
