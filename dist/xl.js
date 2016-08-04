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
    this.baseUrl = 'http://xsolla-login-api.herokuapp.com/api/'; //http://test-login.xsolla.com/api/
    this.projectId = projectId;

    this.makeApiCall = function (params, success, error) {


        var r = new XMLHttpRequest();
        r.open(params.method, self.baseUrl + params.endpoint, true);
        r.onreadystatechange = function () {
            if (r.readyState == 4) {
                if (r.status == 200) {
                    success(JSON.parse(r.responseText));
                } else {
                    if (r.responseText) {
                        error(JSON.parse(r.responseText));
                    } else {
                        error({error: 'Error'});
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

    self._socialUrls = undefined;

    self._options = {};
    self._options.errorHandler = options.errorHandler;
    self._options.loginPassValidator = options.loginPassValidator || function (a,b) { return true; };

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
                    if (self._options.loginPassValidator(login, pass)) {
                        self.login({
                            authType: 'login-pass',
                            login: login,
                            pass: pass
                        }, function (res) {
                            if (res.error) {
                                if (self._options.errorHandler) {
                                    self._options.errorHandler(res.error);
                                }
                            } else {
                                //TODO: сделать редирект
                                if (res.login_url) {
                                    window.location.href = res.login_url;
                                } else {
                                    console.error('Login/pass error');
                                }
                            }
                        });
                    } else {
                        //TODO: error
                    }
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
            self._api.loginPassAuth(prop.login, prop.pass, function (a) {
                if (res.login_url) {
                    window.location.href = res.login_url;
                } else {
                    callback({error: 'Login/pass error'});
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

module.exports = XL;
},{"./xlapi":1}]},{},["main"])("main")
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbi8qKlxuICogSW1wZWxlbWVudHMgWHNvbGxhIExvZ2luIEFwaVxuICogQHBhcmFtIHByb2plY3RJZCAtIHByb2plY3QncyB1bmlxdWUgaWRlbnRpZmllclxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBYTEFwaSA9IGZ1bmN0aW9uIChwcm9qZWN0SWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5iYXNlVXJsID0gJ2h0dHA6Ly94c29sbGEtbG9naW4tYXBpLmhlcm9rdWFwcC5jb20vYXBpLyc7IC8vaHR0cDovL3Rlc3QtbG9naW4ueHNvbGxhLmNvbS9hcGkvXG4gICAgdGhpcy5wcm9qZWN0SWQgPSBwcm9qZWN0SWQ7XG5cbiAgICB0aGlzLm1ha2VBcGlDYWxsID0gZnVuY3Rpb24gKHBhcmFtcywgc3VjY2VzcywgZXJyb3IpIHtcblxuXG4gICAgICAgIHZhciByID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHIub3BlbihwYXJhbXMubWV0aG9kLCBzZWxmLmJhc2VVcmwgKyBwYXJhbXMuZW5kcG9pbnQsIHRydWUpO1xuICAgICAgICByLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgICAgICAgIGlmIChyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyhKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcih7ZXJyb3I6ICdFcnJvcid9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByLnNlbmQocGFyYW1zLmdldEFyZ3VtZW50cyk7XG4gICAgfTtcbn07XG4vKipcbiAqIEdldCBhbGwgYXZpYWxhYmxlIHNvY2lhbCBtZXRob2RzIGF1dGggdXJsXG4gKiBAcGFyYW0gc3VjY2VzcyAtIHN1Y2Nlc3MgY2FsbGJhY2tcbiAqIEBwYXJhbSBlcnJvciAtIGVycm9yIGNhbGxiYWNrXG4gKi9cblhMQXBpLnByb3RvdHlwZS5nZXRTb2NpYWxzVVJMcyA9IGZ1bmN0aW9uIChzdWNjZXNzLCBlcnJvcikge1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ3NvY2lhbC9sb2dpbl91cmxzP3Byb2plY3RJZD0nK3RoaXMucHJvamVjdElkLCBnZXRBcmd1bWVudHM6IG51bGx9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUubG9naW5QYXNzQXV0aCA9IGZ1bmN0aW9uIChsb2dpbiwgcGFzcywgc3VjY2VzcywgZXJyb3IpIHtcbiAgICB2YXIgYm9keSA9IHtcbiAgICAgICAgdXNlcm5hbWU6IGxvZ2luLFxuICAgICAgICBwYXNzd29yZDogcGFzc1xuICAgIH07XG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ1BPU1QnLCBlbmRwb2ludDogJ3Byb3h5L2xvZ2luP3Byb2plY3RJZD0nK3RoaXMucHJvamVjdElkLCBnZXRBcmd1bWVudHM6IEpTT04uc3RyaW5naWZ5KGJvZHkpfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxuWExBcGkucHJvdG90eXBlLnNtc0F1dGggPSBmdW5jdGlvbiAocGhvbmVOdW1iZXIsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ0dFVCcsIGVuZHBvaW50OiAnc21zJywgZ2V0QXJndW1lbnRzOiAncGhvbmVOdW1iZXI9JyArIHBob25lTnVtYmVyfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBYTEFwaTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBhLmtvcm90YWV2IG9uIDI0LjA2LjE2LlxuICovXG5cbnZhciBYTEFwaSA9IHJlcXVpcmUoJy4veGxhcGknKTtcbi8qKlxuICogQ3JlYXRlIGFuIGBBdXRoMGAgaW5zdGFuY2Ugd2l0aCBgb3B0aW9uc2BcbiAqXG4gKiBAY2xhc3MgWExcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBYTCAob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBYWFggRGVwcmVjYXRlZFxuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBYTCkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBYTChvcHRpb25zKTtcbiAgICB9XG5cbiAgICBzZWxmLl9zb2NpYWxVcmxzID0gdW5kZWZpbmVkO1xuXG4gICAgc2VsZi5fb3B0aW9ucyA9IHt9O1xuICAgIHNlbGYuX29wdGlvbnMuZXJyb3JIYW5kbGVyID0gb3B0aW9ucy5lcnJvckhhbmRsZXI7XG4gICAgc2VsZi5fb3B0aW9ucy5sb2dpblBhc3NWYWxpZGF0b3IgPSBvcHRpb25zLmxvZ2luUGFzc1ZhbGlkYXRvciB8fCBmdW5jdGlvbiAoYSxiKSB7IHJldHVybiB0cnVlOyB9O1xuXG4gICAgc2VsZi5fYXBpID0gbmV3IFhMQXBpKG9wdGlvbnMucHJvamVjdElkKTtcbiAgICBzZWxmLl9hcGkuZ2V0U29jaWFsc1VSTHMoZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIHNlbGYuX3NvY2lhbFVybHMgPSB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHNlbGYuX3NvY2lhbFVybHNbJ3NuLScgKyBrZXldID0gcmVzcG9uc2Vba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgfSk7XG5cbiAgICB2YXIgZWxlbWVudHMgPSBzZWxmLmdldEFsbEVsZW1lbnRzV2l0aEF0dHJpYnV0ZSgnZGF0YS14bC1hdXRoJyk7XG4gICAgdmFyIGxvZ2luID0gJyc7XG4gICAgdmFyIHBhc3MgPSAnJztcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIG5vZGVWYWx1ZSA9IGVsZW1lbnRzW2ldLmF0dHJpYnV0ZXNbJ2RhdGEteGwtYXV0aCddLm5vZGVWYWx1ZTtcbiAgICAgICAgaWYgKG5vZGVWYWx1ZS5zdGFydHNXaXRoKCdzbicpKSB7XG4gICAgICAgICAgICBlbGVtZW50c1tpXS5vbmNsaWNrID0gZnVuY3Rpb24gKG5vZGVWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYubG9naW4oe2F1dGhUeXBlOiBub2RlVmFsdWV9KVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KG5vZGVWYWx1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZVZhbHVlID09ICdmb3JtLXNtcycpIHtcbiAgICAgICAgICAgIC8vIGVsZW1lbnRzW2ldLm9uc3VibWl0ID0gY29uZmlnLmV2ZW50SGFuZGxlcnMuc21zO1xuICAgICAgICB9IGVsc2UgaWYgKG5vZGVWYWx1ZSA9PSAnZm9ybS1sb2dpbl9wYXNzJykge1xuICAgICAgICAgICAgLy8gZWxlbWVudHNbaV0ub25zdWJtaXQgPSBjb25maWcuZXZlbnRIYW5kbGVycy5sb2dpblBhc3M7XG4gICAgICAgICAgICBlbGVtZW50c1tpXS5vbnN1Ym1pdCA9IGZ1bmN0aW9uIChsb2dpbiwgcGFzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLl9vcHRpb25zLmxvZ2luUGFzc1ZhbGlkYXRvcihsb2dpbiwgcGFzcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYubG9naW4oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dGhUeXBlOiAnbG9naW4tcGFzcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9naW46IGxvZ2luLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhc3M6IHBhc3NcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLl9vcHRpb25zLmVycm9ySGFuZGxlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fb3B0aW9ucy5lcnJvckhhbmRsZXIocmVzLmVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vVE9ETzog0YHQtNC10LvQsNGC0Ywg0YDQtdC00LjRgNC10LrRglxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzLmxvZ2luX3VybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXMubG9naW5fdXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignTG9naW4vcGFzcyBlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGVycm9yXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KGxvZ2luLCBwYXNzKTtcbiAgICAgICAgfSBlbHNlIGlmIChub2RlVmFsdWUuc3RhcnRzV2l0aCgnaW5wdXQtJykpIHtcbiAgICAgICAgICAgIGlmIChub2RlVmFsdWUgPT0gJ2lucHV0LWxvZ2luJykge1xuICAgICAgICAgICAgICAgIGxvZ2luID0gJyc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGVWYWx1ZSA9PSAnaW5wdXQtcGFzcycpIHtcbiAgICAgICAgICAgICAgICBwYXNzID0gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cblhMLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uIChwcm9wLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICghcHJvcCB8fCAhc2VsZi5fc29jaWFsVXJscykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcHJvcHNcbiAgICAgKiBhdXRoVHlwZTogc24tPHNvY2lhbCBuYW1lPiwgbG9naW4tcGFzcywgc21zXG4gICAgICovXG4gICAgaWYgKHByb3AuYXV0aFR5cGUpIHtcbiAgICAgICAgaWYgKHByb3AuYXV0aFR5cGUuc3RhcnRzV2l0aCgnc24tJykpIHtcbiAgICAgICAgICAgIHZhciBzb2NpYWxVcmwgPSBzZWxmLl9zb2NpYWxVcmxzW3Byb3AuYXV0aFR5cGVdO1xuICAgICAgICAgICAgaWYgKHNvY2lhbFVybCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHNlbGYuX3NvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F1dGggdHlwZTogJyArIHByb3AuYXV0aFR5cGUgKyAnIGRvZXNuXFwndCBleGlzdCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnbG9naW4tcGFzcycpIHtcbiAgICAgICAgICAgIHNlbGYuX2FwaS5sb2dpblBhc3NBdXRoKHByb3AubG9naW4sIHByb3AucGFzcywgZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzLmxvZ2luX3VybCkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlcy5sb2dpbl91cmw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soe2Vycm9yOiAnTG9naW4vcGFzcyBlcnJvcid9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ3NtcycpIHtcbiAgICAgICAgICAgIGlmIChzbXNBdXRoU3RlcCA9PSAncGhvbmUnKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fYXBpLnNtc0F1dGgocHJvcC5waG9uZU51bWJlciwgbnVsbCwgbnVsbCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNtc0F1dGhTdGVwID09ICdjb2RlJykge1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gYXV0aCB0eXBlJyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5cblhMLnByb3RvdHlwZS5nZXRBbGxFbGVtZW50c1dpdGhBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoYXR0cmlidXRlKSB7XG4gICAgdmFyIG1hdGNoaW5nRWxlbWVudHMgPSBbXTtcbiAgICB2YXIgYWxsRWxlbWVudHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnKicpO1xuICAgIGZvciAodmFyIGkgPSAwLCBuID0gYWxsRWxlbWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgIHtcbiAgICAgICAgaWYgKGFsbEVsZW1lbnRzW2ldLmdldEF0dHJpYnV0ZShhdHRyaWJ1dGUpICE9PSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBtYXRjaGluZ0VsZW1lbnRzLnB1c2goYWxsRWxlbWVudHNbaV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXRjaGluZ0VsZW1lbnRzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBYTDsiXX0=
