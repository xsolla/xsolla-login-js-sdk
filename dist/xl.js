(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XL = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Created by a.korotaev on 24.06.16.
 */
/**
 * Impelements Xsolla Login Api
 * @param projectId - project's unique identifier
 * @constructor
 */
var XLApi = function (projectId) {
    var self = this;
    this.baseUrl = 'http://login.xsolla.com/api/';
    // this.baseUrl = 'http://xsolla-login-api.herokuapp.com/api/';
    // this.baseUrl = 'http://test-login.xsolla.com/api/';
    this.projectId = projectId;

    this.makeApiCall = function (params, success, error) {
        var r = new XMLHttpRequest();
        r.open(params.method, self.baseUrl + params.endpoint, true);
        r.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        r.onreadystatechange = function () {
            if (r.readyState == 4) {
                if (r.status == 200) {
                    success(JSON.parse(r.responseText));
                } else {
                    if (r.responseText) {
                        error(JSON.parse(r.responseText));
                    } else {
                        error({error: {message: 'Networking error', code: r.status}});
                    }
                }
            }
        };
        r.send(params.getArguments);
    };
};
/**
 * Get all avialable social methods auth url
 * @param success - success callback
 * @param error - error callback
 */
XLApi.prototype.getSocialsURLs = function (success, error) {
    return this.makeApiCall({method: 'GET', endpoint: 'social/login_urls?projectId='+this.projectId, getArguments: null}, success, error);
};

XLApi.prototype.loginPassAuth = function (login, pass, rememberMe, success, error) {
    var body = {
        username: login,
        password: pass,
        remember_me: rememberMe
    };
    return this.makeApiCall({method: 'POST', endpoint: 'proxy/login?projectId='+this.projectId, getArguments: JSON.stringify(body)}, success, error);
};

XLApi.prototype.smsAuth = function (phoneNumber, success, error) {
    return this.makeApiCall({method: 'GET', endpoint: 'sms', getArguments: 'phoneNumber=' + phoneNumber}, success, error);
};

module.exports = XLApi;

},{}],"main":[function(require,module,exports){
/**
 * Created by a.korotaev on 24.06.16.
 */

var XLApi = require('./xlapi');
/**
 * Create an `Auth0` instance with `options`
 *
 * @class XL
 * @constructor
 */
function XL (options) {
    var self = this;

    self._socialUrls = undefined;

    self._options = {};
    self._options.errorHandler = options.errorHandler || function(a) {};
    self._options.loginPassValidator = options.loginPassValidator || function (a,b) { return true; };
    self._options.isMarkupSocialsHandlersEnabled = options.isMarkupSocialsHandlersEnabled || false;

    self._api = new XLApi(options.projectId);
    self._api.getSocialsURLs(function (response) {
        self._socialUrls = {};
        for (var key in response) {
            if (response.hasOwnProperty(key)) {
                self._socialUrls['sn-' + key] = response[key];
            }
        }
    }, function (e) {
        console.error(e);
    });

    var elements = self.getAllElementsWithAttribute('data-xl-auth');
    var login = '';
    var pass = '';

    // for (var i = 0; i < elements.length; i++) {
    //     var nodeValue = elements[i].attributes['data-xl-auth'].nodeValue;
    //     if (nodeValue.startsWith('sn')) {
    //         elements[i].onclick = function (nodeValue) {
    //             return function () {
    //                 self.login({authType: nodeValue})
    //             };
    //         }(nodeValue);
    //     } else if (nodeValue == 'form-sms') {
    //         // elements[i].onsubmit = config.eventHandlers.sms;
    //     } else if (nodeValue == 'form-login_pass') {
    //         // elements[i].onsubmit = config.eventHandlers.loginPass;
    //         elements[i].onsubmit = function (login, pass) {
    //             return function (e) {
    //                 e.preventDefault();
    //                 if (self._options.loginPassValidator(login, pass)) {
    //                     self.login({
    //                         authType: 'login-pass',
    //                         login: login,
    //                         pass: pass
    //                     }, function (res) {
    //                         if (res.error) {
    //                             self._options.errorHandler(res);
    //                         }
    //                     });
    //                 } else {
    //                     self._options.errorHandler(self.createErrorObject('Login or pass not valid', XL.INVALID_LOGIN_ERROR_CODE));
    //                 }
    //             }
    //         }(login, pass);
    //     } else if (nodeValue.startsWith('input-')) {
    //         if (nodeValue == 'input-login') {
    //             login = '';
    //         } else if (nodeValue == 'input-pass') {
    //             pass = '';
    //         }
    //     }
    // }

    if (self._options.isMarkupSocialsHandlersEnabled) {
        document.addEventListener('click', function (e) {
            var element = e.target;
            var xlData = element.attributes['data-xl-auth'];
            if (xlData) {
                var nodeValue = xlData.nodeValue;
                if (nodeValue) {
                    self.login({authType: nodeValue});
                }
            }
        });
    }
}

XL.prototype.login = function (prop, callback) {
    var self = this;

    if (!prop || !self._socialUrls) {
        return;
    }

    /**
     * props
     * authType: sn-<social name>, login-pass, sms
     */
    if (prop.authType) {
        if (prop.authType.startsWith('sn-')) {
            var socialUrl = self._socialUrls[prop.authType];
            if (socialUrl != undefined) {
                window.location.href = self._socialUrls[prop.authType];
            } else {
                console.error('Auth type: ' + prop.authType + ' doesn\'t exist');
            }

        } else if (prop.authType == 'login-pass') {
            self._api.loginPassAuth(prop.login, prop.pass, prop.rememberMe, function (a) {
                if (res.login_url) {
                    window.location.href = res.login_url;
                } else {
                    callback(self.createErrorObject('Login or pass not valid', XL.INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE));
                }
            }, function (err) {
                callback(err);
            });
        } else if (prop.authType == 'sms') {
            if (smsAuthStep == 'phone') {
                self._api.smsAuth(prop.phoneNumber, null, null);
            } else if (smsAuthStep == 'code') {

            }

        } else {
            console.error('Unknown auth type');
        }
    }
};


XL.prototype.getAllElementsWithAttribute = function (attribute) {
    var matchingElements = [];
    var allElements = document.getElementsByTagName('*');
    for (var i = 0, n = allElements.length; i < n; i++)
    {
        if (allElements[i].getAttribute(attribute) !== null)
        {
            matchingElements.push(allElements[i]);
        }
    }
    return matchingElements;
};

XL.prototype.createErrorObject = function(message, code) {
    return {
        error: {
            message: message,
            code: code || -1
        }
    };
};

XL.init = function (params) {
    if (!window.__xl) {
        var xl = new XL(params);
        window.__xl = xl;
    } else {
        console.error('XL already init!');
    }
};

XL.login = function (prop, callback) {
    if (window.__xl) {
        window.__xl.login(prop, callback);
    } else {
        console.error('Please run XL.init() first');
    }
};

XL.AuthWidget = function (divName, options) {
    if (!divName) {
        console.error('No div name!');
    } else {
        var html = '<iframe></iframe>';
        var element = document.getElementById(divName);
        if (element) {
            document.getElementById(divName).innerHTML = html;
        } else {
            console.error('Element ' + divName +' not found!');
        }
    }
};

XL.AuthButton = function (divName, options) {

};

XL.INVALID_LOGIN_ERROR_CODE = 1;
XL.INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE = 2;

module.exports = XL;
},{"./xlapi":1}]},{},["main"])("main")
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuLyoqXG4gKiBJbXBlbGVtZW50cyBYc29sbGEgTG9naW4gQXBpXG4gKiBAcGFyYW0gcHJvamVjdElkIC0gcHJvamVjdCdzIHVuaXF1ZSBpZGVudGlmaWVyXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIFhMQXBpID0gZnVuY3Rpb24gKHByb2plY3RJZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmJhc2VVcmwgPSAnaHR0cDovL2xvZ2luLnhzb2xsYS5jb20vYXBpLyc7XG4gICAgLy8gdGhpcy5iYXNlVXJsID0gJ2h0dHA6Ly94c29sbGEtbG9naW4tYXBpLmhlcm9rdWFwcC5jb20vYXBpLyc7XG4gICAgLy8gdGhpcy5iYXNlVXJsID0gJ2h0dHA6Ly90ZXN0LWxvZ2luLnhzb2xsYS5jb20vYXBpLyc7XG4gICAgdGhpcy5wcm9qZWN0SWQgPSBwcm9qZWN0SWQ7XG5cbiAgICB0aGlzLm1ha2VBcGlDYWxsID0gZnVuY3Rpb24gKHBhcmFtcywgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgdmFyIHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgci5vcGVuKHBhcmFtcy5tZXRob2QsIHNlbGYuYmFzZVVybCArIHBhcmFtcy5lbmRwb2ludCwgdHJ1ZSk7XG4gICAgICAgIHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwiKTtcbiAgICAgICAgci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoci5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgICAgICAgICBpZiAoci5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3MoSlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyLnJlc3BvbnNlVGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IoSlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3Ioe2Vycm9yOiB7bWVzc2FnZTogJ05ldHdvcmtpbmcgZXJyb3InLCBjb2RlOiByLnN0YXR1c319KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgci5zZW5kKHBhcmFtcy5nZXRBcmd1bWVudHMpO1xuICAgIH07XG59O1xuLyoqXG4gKiBHZXQgYWxsIGF2aWFsYWJsZSBzb2NpYWwgbWV0aG9kcyBhdXRoIHVybFxuICogQHBhcmFtIHN1Y2Nlc3MgLSBzdWNjZXNzIGNhbGxiYWNrXG4gKiBAcGFyYW0gZXJyb3IgLSBlcnJvciBjYWxsYmFja1xuICovXG5YTEFwaS5wcm90b3R5cGUuZ2V0U29jaWFsc1VSTHMgPSBmdW5jdGlvbiAoc3VjY2VzcywgZXJyb3IpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzb2NpYWwvbG9naW5fdXJscz9wcm9qZWN0SWQ9Jyt0aGlzLnByb2plY3RJZCwgZ2V0QXJndW1lbnRzOiBudWxsfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxuWExBcGkucHJvdG90eXBlLmxvZ2luUGFzc0F1dGggPSBmdW5jdGlvbiAobG9naW4sIHBhc3MsIHJlbWVtYmVyTWUsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgdmFyIGJvZHkgPSB7XG4gICAgICAgIHVzZXJuYW1lOiBsb2dpbixcbiAgICAgICAgcGFzc3dvcmQ6IHBhc3MsXG4gICAgICAgIHJlbWVtYmVyX21lOiByZW1lbWJlck1lXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnUE9TVCcsIGVuZHBvaW50OiAncHJveHkvbG9naW4/cHJvamVjdElkPScrdGhpcy5wcm9qZWN0SWQsIGdldEFyZ3VtZW50czogSlNPTi5zdHJpbmdpZnkoYm9keSl9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUuc21zQXV0aCA9IGZ1bmN0aW9uIChwaG9uZU51bWJlciwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzbXMnLCBnZXRBcmd1bWVudHM6ICdwaG9uZU51bWJlcj0nICsgcGhvbmVOdW1iZXJ9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhMQXBpO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cblxudmFyIFhMQXBpID0gcmVxdWlyZSgnLi94bGFwaScpO1xuLyoqXG4gKiBDcmVhdGUgYW4gYEF1dGgwYCBpbnN0YW5jZSB3aXRoIGBvcHRpb25zYFxuICpcbiAqIEBjbGFzcyBYTFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFhMIChvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgc2VsZi5fc29jaWFsVXJscyA9IHVuZGVmaW5lZDtcblxuICAgIHNlbGYuX29wdGlvbnMgPSB7fTtcbiAgICBzZWxmLl9vcHRpb25zLmVycm9ySGFuZGxlciA9IG9wdGlvbnMuZXJyb3JIYW5kbGVyIHx8IGZ1bmN0aW9uKGEpIHt9O1xuICAgIHNlbGYuX29wdGlvbnMubG9naW5QYXNzVmFsaWRhdG9yID0gb3B0aW9ucy5sb2dpblBhc3NWYWxpZGF0b3IgfHwgZnVuY3Rpb24gKGEsYikgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBzZWxmLl9vcHRpb25zLmlzTWFya3VwU29jaWFsc0hhbmRsZXJzRW5hYmxlZCA9IG9wdGlvbnMuaXNNYXJrdXBTb2NpYWxzSGFuZGxlcnNFbmFibGVkIHx8IGZhbHNlO1xuXG4gICAgc2VsZi5fYXBpID0gbmV3IFhMQXBpKG9wdGlvbnMucHJvamVjdElkKTtcbiAgICBzZWxmLl9hcGkuZ2V0U29jaWFsc1VSTHMoZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIHNlbGYuX3NvY2lhbFVybHMgPSB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHNlbGYuX3NvY2lhbFVybHNbJ3NuLScgKyBrZXldID0gcmVzcG9uc2Vba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgfSk7XG5cbiAgICB2YXIgZWxlbWVudHMgPSBzZWxmLmdldEFsbEVsZW1lbnRzV2l0aEF0dHJpYnV0ZSgnZGF0YS14bC1hdXRoJyk7XG4gICAgdmFyIGxvZ2luID0gJyc7XG4gICAgdmFyIHBhc3MgPSAnJztcblxuICAgIC8vIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAvLyAgICAgdmFyIG5vZGVWYWx1ZSA9IGVsZW1lbnRzW2ldLmF0dHJpYnV0ZXNbJ2RhdGEteGwtYXV0aCddLm5vZGVWYWx1ZTtcbiAgICAvLyAgICAgaWYgKG5vZGVWYWx1ZS5zdGFydHNXaXRoKCdzbicpKSB7XG4gICAgLy8gICAgICAgICBlbGVtZW50c1tpXS5vbmNsaWNrID0gZnVuY3Rpb24gKG5vZGVWYWx1ZSkge1xuICAgIC8vICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgLy8gICAgICAgICAgICAgICAgIHNlbGYubG9naW4oe2F1dGhUeXBlOiBub2RlVmFsdWV9KVxuICAgIC8vICAgICAgICAgICAgIH07XG4gICAgLy8gICAgICAgICB9KG5vZGVWYWx1ZSk7XG4gICAgLy8gICAgIH0gZWxzZSBpZiAobm9kZVZhbHVlID09ICdmb3JtLXNtcycpIHtcbiAgICAvLyAgICAgICAgIC8vIGVsZW1lbnRzW2ldLm9uc3VibWl0ID0gY29uZmlnLmV2ZW50SGFuZGxlcnMuc21zO1xuICAgIC8vICAgICB9IGVsc2UgaWYgKG5vZGVWYWx1ZSA9PSAnZm9ybS1sb2dpbl9wYXNzJykge1xuICAgIC8vICAgICAgICAgLy8gZWxlbWVudHNbaV0ub25zdWJtaXQgPSBjb25maWcuZXZlbnRIYW5kbGVycy5sb2dpblBhc3M7XG4gICAgLy8gICAgICAgICBlbGVtZW50c1tpXS5vbnN1Ym1pdCA9IGZ1bmN0aW9uIChsb2dpbiwgcGFzcykge1xuICAgIC8vICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoZSkge1xuICAgIC8vICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgLy8gICAgICAgICAgICAgICAgIGlmIChzZWxmLl9vcHRpb25zLmxvZ2luUGFzc1ZhbGlkYXRvcihsb2dpbiwgcGFzcykpIHtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgIHNlbGYubG9naW4oe1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgIGF1dGhUeXBlOiAnbG9naW4tcGFzcycsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgbG9naW46IGxvZ2luLFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgIHBhc3M6IHBhc3NcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzLmVycm9yKSB7XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX29wdGlvbnMuZXJyb3JIYW5kbGVyKHJlcyk7XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgLy8gICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICBzZWxmLl9vcHRpb25zLmVycm9ySGFuZGxlcihzZWxmLmNyZWF0ZUVycm9yT2JqZWN0KCdMb2dpbiBvciBwYXNzIG5vdCB2YWxpZCcsIFhMLklOVkFMSURfTE9HSU5fRVJST1JfQ09ERSkpO1xuICAgIC8vICAgICAgICAgICAgICAgICB9XG4gICAgLy8gICAgICAgICAgICAgfVxuICAgIC8vICAgICAgICAgfShsb2dpbiwgcGFzcyk7XG4gICAgLy8gICAgIH0gZWxzZSBpZiAobm9kZVZhbHVlLnN0YXJ0c1dpdGgoJ2lucHV0LScpKSB7XG4gICAgLy8gICAgICAgICBpZiAobm9kZVZhbHVlID09ICdpbnB1dC1sb2dpbicpIHtcbiAgICAvLyAgICAgICAgICAgICBsb2dpbiA9ICcnO1xuICAgIC8vICAgICAgICAgfSBlbHNlIGlmIChub2RlVmFsdWUgPT0gJ2lucHV0LXBhc3MnKSB7XG4gICAgLy8gICAgICAgICAgICAgcGFzcyA9ICcnO1xuICAgIC8vICAgICAgICAgfVxuICAgIC8vICAgICB9XG4gICAgLy8gfVxuXG4gICAgaWYgKHNlbGYuX29wdGlvbnMuaXNNYXJrdXBTb2NpYWxzSGFuZGxlcnNFbmFibGVkKSB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50ID0gZS50YXJnZXQ7XG4gICAgICAgICAgICB2YXIgeGxEYXRhID0gZWxlbWVudC5hdHRyaWJ1dGVzWydkYXRhLXhsLWF1dGgnXTtcbiAgICAgICAgICAgIGlmICh4bERhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZVZhbHVlID0geGxEYXRhLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYubG9naW4oe2F1dGhUeXBlOiBub2RlVmFsdWV9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuWEwucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24gKHByb3AsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKCFwcm9wIHx8ICFzZWxmLl9zb2NpYWxVcmxzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBwcm9wc1xuICAgICAqIGF1dGhUeXBlOiBzbi08c29jaWFsIG5hbWU+LCBsb2dpbi1wYXNzLCBzbXNcbiAgICAgKi9cbiAgICBpZiAocHJvcC5hdXRoVHlwZSkge1xuICAgICAgICBpZiAocHJvcC5hdXRoVHlwZS5zdGFydHNXaXRoKCdzbi0nKSkge1xuICAgICAgICAgICAgdmFyIHNvY2lhbFVybCA9IHNlbGYuX3NvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICBpZiAoc29jaWFsVXJsICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gc2VsZi5fc29jaWFsVXJsc1twcm9wLmF1dGhUeXBlXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQXV0aCB0eXBlOiAnICsgcHJvcC5hdXRoVHlwZSArICcgZG9lc25cXCd0IGV4aXN0Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmIChwcm9wLmF1dGhUeXBlID09ICdsb2dpbi1wYXNzJykge1xuICAgICAgICAgICAgc2VsZi5fYXBpLmxvZ2luUGFzc0F1dGgocHJvcC5sb2dpbiwgcHJvcC5wYXNzLCBwcm9wLnJlbWVtYmVyTWUsIGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlcy5sb2dpbl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXMubG9naW5fdXJsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHNlbGYuY3JlYXRlRXJyb3JPYmplY3QoJ0xvZ2luIG9yIHBhc3Mgbm90IHZhbGlkJywgWEwuSU5DT1JSRUNUX0xPR0lOX09SX1BBU1NXT1JEX0VSUk9SX0NPREUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ3NtcycpIHtcbiAgICAgICAgICAgIGlmIChzbXNBdXRoU3RlcCA9PSAncGhvbmUnKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fYXBpLnNtc0F1dGgocHJvcC5waG9uZU51bWJlciwgbnVsbCwgbnVsbCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNtc0F1dGhTdGVwID09ICdjb2RlJykge1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gYXV0aCB0eXBlJyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5cblhMLnByb3RvdHlwZS5nZXRBbGxFbGVtZW50c1dpdGhBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoYXR0cmlidXRlKSB7XG4gICAgdmFyIG1hdGNoaW5nRWxlbWVudHMgPSBbXTtcbiAgICB2YXIgYWxsRWxlbWVudHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnKicpO1xuICAgIGZvciAodmFyIGkgPSAwLCBuID0gYWxsRWxlbWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgIHtcbiAgICAgICAgaWYgKGFsbEVsZW1lbnRzW2ldLmdldEF0dHJpYnV0ZShhdHRyaWJ1dGUpICE9PSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBtYXRjaGluZ0VsZW1lbnRzLnB1c2goYWxsRWxlbWVudHNbaV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXRjaGluZ0VsZW1lbnRzO1xufTtcblxuWEwucHJvdG90eXBlLmNyZWF0ZUVycm9yT2JqZWN0ID0gZnVuY3Rpb24obWVzc2FnZSwgY29kZSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgY29kZTogY29kZSB8fCAtMVxuICAgICAgICB9XG4gICAgfTtcbn07XG5cblhMLmluaXQgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgaWYgKCF3aW5kb3cuX194bCkge1xuICAgICAgICB2YXIgeGwgPSBuZXcgWEwocGFyYW1zKTtcbiAgICAgICAgd2luZG93Ll9feGwgPSB4bDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdYTCBhbHJlYWR5IGluaXQhJyk7XG4gICAgfVxufTtcblxuWEwubG9naW4gPSBmdW5jdGlvbiAocHJvcCwgY2FsbGJhY2spIHtcbiAgICBpZiAod2luZG93Ll9feGwpIHtcbiAgICAgICAgd2luZG93Ll9feGwubG9naW4ocHJvcCwgY2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1BsZWFzZSBydW4gWEwuaW5pdCgpIGZpcnN0Jyk7XG4gICAgfVxufTtcblxuWEwuQXV0aFdpZGdldCA9IGZ1bmN0aW9uIChkaXZOYW1lLCBvcHRpb25zKSB7XG4gICAgaWYgKCFkaXZOYW1lKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ05vIGRpdiBuYW1lIScpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBodG1sID0gJzxpZnJhbWU+PC9pZnJhbWU+JztcbiAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkaXZOYW1lKTtcbiAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGRpdk5hbWUpLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFbGVtZW50ICcgKyBkaXZOYW1lICsnIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblhMLkF1dGhCdXR0b24gPSBmdW5jdGlvbiAoZGl2TmFtZSwgb3B0aW9ucykge1xuXG59O1xuXG5YTC5JTlZBTElEX0xPR0lOX0VSUk9SX0NPREUgPSAxO1xuWEwuSU5DT1JSRUNUX0xPR0lOX09SX1BBU1NXT1JEX0VSUk9SX0NPREUgPSAyO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhMOyJdfQ==
