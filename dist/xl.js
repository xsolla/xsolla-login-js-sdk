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
    this.baseUrl = 'http://xsolla-login-api.herokuapp.com/api/';
    this.projectId = projectId;

    this.makeApiCall = function (params, success, error) {


        var r = new XMLHttpRequest();
        r.open(params.method, self.baseUrl + params.endpoint, true);
        r.onreadystatechange = function () {
            if (r.readyState == 4) {
                if (r.status == 200) {
                    success(JSON.parse(r.responseText));
                } else {
                    error(JSON.parse(r.responseText));
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

XLApi.prototype.loginPassAuth = function (login, pass, success, error) {
    var body = {
        username: login,
        password: pass
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
    // XXX Deprecated
    if (!(this instanceof XL)) {
        return new XL(options);
    }

    self._socialUrls = {};
    self._errorHandler = options.errorHandler;

    self._api = new XLApi(options.projectId);
    self._api.getSocialsURLs(function (response) {
        for (key in response) {
            self._socialUrls['sn-' + key] = response[key];
        }

        console.log(self._socialUrls);
    }, function (e) {
        console.error(e);
    });

    // self._socialUrls = {'sn-facebook': 'https://facebook.com', 'sn-vk': 'https://vk.com'};

    if (options.addHandlers == true) {
        var elements = self.getAllElementsWithAttribute('data-xl-auth');
        var login = '';
        var pass = '';

        for (var i = 0; i < elements.length; i++) {
            var nodeValue = elements[i].attributes['data-xl-auth'].nodeValue;
            if (nodeValue.startsWith('sn')) {
                elements[i].onclick = function (nodeValue) {
                    return function () {
                        self.login({authType: nodeValue})
                    };
                }(nodeValue);
            } else if (nodeValue == 'form-sms') {
                // elements[i].onsubmit = config.eventHandlers.sms;
            } else if (nodeValue == 'form-login_pass') {
                // elements[i].onsubmit = config.eventHandlers.loginPass;
                elements[i].onsubmit = function (login, pass) {
                    return function (e) {
                        e.preventDefault();
                        self.login({
                            authType: 'login-pass',
                            login: login,
                            pass: pass
                        }, function (res) {
                            if (res.error) {
                                if (self._errorHandler) {
                                    self._errorHandler(res.error);
                                }
                            } else {
                                //TODO: сделать редирект
                                window.location.href = '';
                            }
                        });
                    }
                }(login, pass);
            } else if (nodeValue.startsWith('input-')) {
                if (nodeValue == 'input-login') {
                    login = '';
                } else if (nodeValue == 'input-pass') {
                    pass = '';
                }
            }
        }
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
            self._api.loginPassAuth(prop.login, prop.pass, callback, callback);
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

module.exports = XL;
},{"./xlapi":1}]},{},["main"])("main")
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbi8qKlxuICogSW1wZWxlbWVudHMgWHNvbGxhIExvZ2luIEFwaVxuICogQHBhcmFtIHByb2plY3RJZCAtIHByb2plY3QncyB1bmlxdWUgaWRlbnRpZmllclxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBYTEFwaSA9IGZ1bmN0aW9uIChwcm9qZWN0SWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5iYXNlVXJsID0gJ2h0dHA6Ly94c29sbGEtbG9naW4tYXBpLmhlcm9rdWFwcC5jb20vYXBpLyc7XG4gICAgdGhpcy5wcm9qZWN0SWQgPSBwcm9qZWN0SWQ7XG5cbiAgICB0aGlzLm1ha2VBcGlDYWxsID0gZnVuY3Rpb24gKHBhcmFtcywgc3VjY2VzcywgZXJyb3IpIHtcblxuXG4gICAgICAgIHZhciByID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHIub3BlbihwYXJhbXMubWV0aG9kLCBzZWxmLmJhc2VVcmwgKyBwYXJhbXMuZW5kcG9pbnQsIHRydWUpO1xuICAgICAgICByLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgICAgICAgIGlmIChyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyhKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoSlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgci5zZW5kKHBhcmFtcy5nZXRBcmd1bWVudHMpO1xuICAgIH07XG59O1xuLyoqXG4gKiBHZXQgYWxsIGF2aWFsYWJsZSBzb2NpYWwgbWV0aG9kcyBhdXRoIHVybFxuICogQHBhcmFtIHN1Y2Nlc3MgLSBzdWNjZXNzIGNhbGxiYWNrXG4gKiBAcGFyYW0gZXJyb3IgLSBlcnJvciBjYWxsYmFja1xuICovXG5YTEFwaS5wcm90b3R5cGUuZ2V0U29jaWFsc1VSTHMgPSBmdW5jdGlvbiAoc3VjY2VzcywgZXJyb3IpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzb2NpYWwvbG9naW5fdXJscz9wcm9qZWN0SWQ9Jyt0aGlzLnByb2plY3RJZCwgZ2V0QXJndW1lbnRzOiBudWxsfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxuWExBcGkucHJvdG90eXBlLmxvZ2luUGFzc0F1dGggPSBmdW5jdGlvbiAobG9naW4sIHBhc3MsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgdmFyIGJvZHkgPSB7XG4gICAgICAgIHVzZXJuYW1lOiBsb2dpbixcbiAgICAgICAgcGFzc3dvcmQ6IHBhc3NcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdQT1NUJywgZW5kcG9pbnQ6ICdwcm94eS9sb2dpbj9wcm9qZWN0SWQ9Jyt0aGlzLnByb2plY3RJZCwgZ2V0QXJndW1lbnRzOiBKU09OLnN0cmluZ2lmeShib2R5KX0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cblhMQXBpLnByb3RvdHlwZS5zbXNBdXRoID0gZnVuY3Rpb24gKHBob25lTnVtYmVyLCBzdWNjZXNzLCBlcnJvcikge1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ3NtcycsIGdldEFyZ3VtZW50czogJ3Bob25lTnVtYmVyPScgKyBwaG9uZU51bWJlcn0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gWExBcGk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuXG52YXIgWExBcGkgPSByZXF1aXJlKCcuL3hsYXBpJyk7XG4vKipcbiAqIENyZWF0ZSBhbiBgQXV0aDBgIGluc3RhbmNlIHdpdGggYG9wdGlvbnNgXG4gKlxuICogQGNsYXNzIFhMXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gWEwgKG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gWFhYIERlcHJlY2F0ZWRcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgWEwpKSB7XG4gICAgICAgIHJldHVybiBuZXcgWEwob3B0aW9ucyk7XG4gICAgfVxuXG4gICAgc2VsZi5fc29jaWFsVXJscyA9IHt9O1xuICAgIHNlbGYuX2Vycm9ySGFuZGxlciA9IG9wdGlvbnMuZXJyb3JIYW5kbGVyO1xuXG4gICAgc2VsZi5fYXBpID0gbmV3IFhMQXBpKG9wdGlvbnMucHJvamVjdElkKTtcbiAgICBzZWxmLl9hcGkuZ2V0U29jaWFsc1VSTHMoZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIGZvciAoa2V5IGluIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBzZWxmLl9zb2NpYWxVcmxzWydzbi0nICsga2V5XSA9IHJlc3BvbnNlW2tleV07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZyhzZWxmLl9zb2NpYWxVcmxzKTtcbiAgICB9LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgIH0pO1xuXG4gICAgLy8gc2VsZi5fc29jaWFsVXJscyA9IHsnc24tZmFjZWJvb2snOiAnaHR0cHM6Ly9mYWNlYm9vay5jb20nLCAnc24tdmsnOiAnaHR0cHM6Ly92ay5jb20nfTtcblxuICAgIGlmIChvcHRpb25zLmFkZEhhbmRsZXJzID09IHRydWUpIHtcbiAgICAgICAgdmFyIGVsZW1lbnRzID0gc2VsZi5nZXRBbGxFbGVtZW50c1dpdGhBdHRyaWJ1dGUoJ2RhdGEteGwtYXV0aCcpO1xuICAgICAgICB2YXIgbG9naW4gPSAnJztcbiAgICAgICAgdmFyIHBhc3MgPSAnJztcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgbm9kZVZhbHVlID0gZWxlbWVudHNbaV0uYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ10ubm9kZVZhbHVlO1xuICAgICAgICAgICAgaWYgKG5vZGVWYWx1ZS5zdGFydHNXaXRoKCdzbicpKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudHNbaV0ub25jbGljayA9IGZ1bmN0aW9uIChub2RlVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYubG9naW4oe2F1dGhUeXBlOiBub2RlVmFsdWV9KVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0obm9kZVZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZVZhbHVlID09ICdmb3JtLXNtcycpIHtcbiAgICAgICAgICAgICAgICAvLyBlbGVtZW50c1tpXS5vbnN1Ym1pdCA9IGNvbmZpZy5ldmVudEhhbmRsZXJzLnNtcztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZVZhbHVlID09ICdmb3JtLWxvZ2luX3Bhc3MnKSB7XG4gICAgICAgICAgICAgICAgLy8gZWxlbWVudHNbaV0ub25zdWJtaXQgPSBjb25maWcuZXZlbnRIYW5kbGVycy5sb2dpblBhc3M7XG4gICAgICAgICAgICAgICAgZWxlbWVudHNbaV0ub25zdWJtaXQgPSBmdW5jdGlvbiAobG9naW4sIHBhc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmxvZ2luKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRoVHlwZTogJ2xvZ2luLXBhc3MnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2luOiBsb2dpbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXNzOiBwYXNzXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5fZXJyb3JIYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9lcnJvckhhbmRsZXIocmVzLmVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vVE9ETzog0YHQtNC10LvQsNGC0Ywg0YDQtdC00LjRgNC10LrRglxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfShsb2dpbiwgcGFzcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGVWYWx1ZS5zdGFydHNXaXRoKCdpbnB1dC0nKSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlVmFsdWUgPT0gJ2lucHV0LWxvZ2luJykge1xuICAgICAgICAgICAgICAgICAgICBsb2dpbiA9ICcnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZVZhbHVlID09ICdpbnB1dC1wYXNzJykge1xuICAgICAgICAgICAgICAgICAgICBwYXNzID0gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5YTC5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbiAocHJvcCwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoIXByb3AgfHwgIXNlbGYuX3NvY2lhbFVybHMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHByb3BzXG4gICAgICogYXV0aFR5cGU6IHNuLTxzb2NpYWwgbmFtZT4sIGxvZ2luLXBhc3MsIHNtc1xuICAgICAqL1xuICAgIGlmIChwcm9wLmF1dGhUeXBlKSB7XG4gICAgICAgIGlmIChwcm9wLmF1dGhUeXBlLnN0YXJ0c1dpdGgoJ3NuLScpKSB7XG4gICAgICAgICAgICB2YXIgc29jaWFsVXJsID0gc2VsZi5fc29jaWFsVXJsc1twcm9wLmF1dGhUeXBlXTtcbiAgICAgICAgICAgIGlmIChzb2NpYWxVcmwgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBzZWxmLl9zb2NpYWxVcmxzW3Byb3AuYXV0aFR5cGVdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBdXRoIHR5cGU6ICcgKyBwcm9wLmF1dGhUeXBlICsgJyBkb2VzblxcJ3QgZXhpc3QnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ2xvZ2luLXBhc3MnKSB7XG4gICAgICAgICAgICBzZWxmLl9hcGkubG9naW5QYXNzQXV0aChwcm9wLmxvZ2luLCBwcm9wLnBhc3MsIGNhbGxiYWNrLCBjYWxsYmFjayk7XG4gICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnc21zJykge1xuICAgICAgICAgICAgaWYgKHNtc0F1dGhTdGVwID09ICdwaG9uZScpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9hcGkuc21zQXV0aChwcm9wLnBob25lTnVtYmVyLCBudWxsLCBudWxsKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc21zQXV0aFN0ZXAgPT0gJ2NvZGUnKSB7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5rbm93biBhdXRoIHR5cGUnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxuWEwucHJvdG90eXBlLmdldEFsbEVsZW1lbnRzV2l0aEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChhdHRyaWJ1dGUpIHtcbiAgICB2YXIgbWF0Y2hpbmdFbGVtZW50cyA9IFtdO1xuICAgIHZhciBhbGxFbGVtZW50cyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCcqJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSBhbGxFbGVtZW50cy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAge1xuICAgICAgICBpZiAoYWxsRWxlbWVudHNbaV0uZ2V0QXR0cmlidXRlKGF0dHJpYnV0ZSkgIT09IG51bGwpXG4gICAgICAgIHtcbiAgICAgICAgICAgIG1hdGNoaW5nRWxlbWVudHMucHVzaChhbGxFbGVtZW50c1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1hdGNoaW5nRWxlbWVudHM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhMOyJdfQ==
