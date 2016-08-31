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
        // r.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
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
        if (params.method == 'POST') {
            r.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            r.send(params.postBody);
        } else if (params.method == 'GET') {
            r.send(params.getArguments);
        }

        // var responseHandler = function (err, res) {
        //     if (!err) {
        //         success(JSON.parse(res.text));
        //     } else {
        //         var body = res.body || {message: err.message, code: 10};
        //         error({error: body});
        //     }
        // };
        //
        // var method = params.method || 'GET';
        // var requestUrl = self.baseUrl + params.endpoint;
        // if (method == 'GET') {
        //     request.get(requestUrl, responseHandler);
        // } else if (method == 'POST') {
        //     request
        //         .post(requestUrl)
        //         .set('Content-Type', 'application/json; charset=UTF-8')
        //         .send(params.postBody)
        //         .end(responseHandler);
        // }

    };
};
/**
 * Get all avialable social methods auth url
 * @param success - success callback
 * @param error - error callback
 */
XLApi.prototype.getSocialsURLs = function (success, error, getArguments) {
    var str = "";
    for (var key in getArguments) {
        if (str != "") {
            str += "&";
        }
        str += key + "=" + encodeURIComponent(getArguments[key]);
    }

    return this.makeApiCall({method: 'GET', endpoint: 'social/login_urls?' + str, getArguments: null}, success, error);
};

XLApi.prototype.loginPassAuth = function (login, pass, rememberMe, success, error) {
    var body = {
        username: login,
        password: pass,
        remember_me: rememberMe
    };
    return this.makeApiCall({method: 'POST', endpoint: 'proxy/login?projectId='+this.projectId, postBody: JSON.stringify(body)}, success, error);
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
    self._options.callbackUrl = options.callbackUrl || undefined;

    var params = {};
    params.projectId = options.projectId;

    if (self._options.callbackUrl) {
        params.callback_url = self._options.callbackUrl;
    }

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
    }, params);

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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbi8qKlxuICogSW1wZWxlbWVudHMgWHNvbGxhIExvZ2luIEFwaVxuICogQHBhcmFtIHByb2plY3RJZCAtIHByb2plY3QncyB1bmlxdWUgaWRlbnRpZmllclxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxudmFyIFhMQXBpID0gZnVuY3Rpb24gKHByb2plY3RJZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmJhc2VVcmwgPSAnaHR0cDovL2xvZ2luLnhzb2xsYS5jb20vYXBpLyc7XG4gICAgLy8gdGhpcy5iYXNlVXJsID0gJ2h0dHA6Ly94c29sbGEtbG9naW4tYXBpLmhlcm9rdWFwcC5jb20vYXBpLyc7XG4gICAgLy8gdGhpcy5iYXNlVXJsID0gJ2h0dHA6Ly90ZXN0LWxvZ2luLnhzb2xsYS5jb20vYXBpLyc7XG4gICAgdGhpcy5wcm9qZWN0SWQgPSBwcm9qZWN0SWQ7XG5cbiAgICB0aGlzLm1ha2VBcGlDYWxsID0gZnVuY3Rpb24gKHBhcmFtcywgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgdmFyIHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgci5vcGVuKHBhcmFtcy5tZXRob2QsIHNlbGYuYmFzZVVybCArIHBhcmFtcy5lbmRwb2ludCwgdHJ1ZSk7XG4gICAgICAgIC8vIHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwiKTtcbiAgICAgICAgci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoci5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgICAgICAgICBpZiAoci5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3MoSlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyLnJlc3BvbnNlVGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IoSlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3Ioe2Vycm9yOiB7bWVzc2FnZTogJ05ldHdvcmtpbmcgZXJyb3InLCBjb2RlOiByLnN0YXR1c319KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHBhcmFtcy5tZXRob2QgPT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICByLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLThcIik7XG4gICAgICAgICAgICByLnNlbmQocGFyYW1zLnBvc3RCb2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMubWV0aG9kID09ICdHRVQnKSB7XG4gICAgICAgICAgICByLnNlbmQocGFyYW1zLmdldEFyZ3VtZW50cyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YXIgcmVzcG9uc2VIYW5kbGVyID0gZnVuY3Rpb24gKGVyciwgcmVzKSB7XG4gICAgICAgIC8vICAgICBpZiAoIWVycikge1xuICAgICAgICAvLyAgICAgICAgIHN1Y2Nlc3MoSlNPTi5wYXJzZShyZXMudGV4dCkpO1xuICAgICAgICAvLyAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gICAgICAgICB2YXIgYm9keSA9IHJlcy5ib2R5IHx8IHttZXNzYWdlOiBlcnIubWVzc2FnZSwgY29kZTogMTB9O1xuICAgICAgICAvLyAgICAgICAgIGVycm9yKHtlcnJvcjogYm9keX0pO1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyB9O1xuICAgICAgICAvL1xuICAgICAgICAvLyB2YXIgbWV0aG9kID0gcGFyYW1zLm1ldGhvZCB8fCAnR0VUJztcbiAgICAgICAgLy8gdmFyIHJlcXVlc3RVcmwgPSBzZWxmLmJhc2VVcmwgKyBwYXJhbXMuZW5kcG9pbnQ7XG4gICAgICAgIC8vIGlmIChtZXRob2QgPT0gJ0dFVCcpIHtcbiAgICAgICAgLy8gICAgIHJlcXVlc3QuZ2V0KHJlcXVlc3RVcmwsIHJlc3BvbnNlSGFuZGxlcik7XG4gICAgICAgIC8vIH0gZWxzZSBpZiAobWV0aG9kID09ICdQT1NUJykge1xuICAgICAgICAvLyAgICAgcmVxdWVzdFxuICAgICAgICAvLyAgICAgICAgIC5wb3N0KHJlcXVlc3RVcmwpXG4gICAgICAgIC8vICAgICAgICAgLnNldCgnQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLTgnKVxuICAgICAgICAvLyAgICAgICAgIC5zZW5kKHBhcmFtcy5wb3N0Qm9keSlcbiAgICAgICAgLy8gICAgICAgICAuZW5kKHJlc3BvbnNlSGFuZGxlcik7XG4gICAgICAgIC8vIH1cblxuICAgIH07XG59O1xuLyoqXG4gKiBHZXQgYWxsIGF2aWFsYWJsZSBzb2NpYWwgbWV0aG9kcyBhdXRoIHVybFxuICogQHBhcmFtIHN1Y2Nlc3MgLSBzdWNjZXNzIGNhbGxiYWNrXG4gKiBAcGFyYW0gZXJyb3IgLSBlcnJvciBjYWxsYmFja1xuICovXG5YTEFwaS5wcm90b3R5cGUuZ2V0U29jaWFsc1VSTHMgPSBmdW5jdGlvbiAoc3VjY2VzcywgZXJyb3IsIGdldEFyZ3VtZW50cykge1xuICAgIHZhciBzdHIgPSBcIlwiO1xuICAgIGZvciAodmFyIGtleSBpbiBnZXRBcmd1bWVudHMpIHtcbiAgICAgICAgaWYgKHN0ciAhPSBcIlwiKSB7XG4gICAgICAgICAgICBzdHIgKz0gXCImXCI7XG4gICAgICAgIH1cbiAgICAgICAgc3RyICs9IGtleSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGdldEFyZ3VtZW50c1trZXldKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzb2NpYWwvbG9naW5fdXJscz8nICsgc3RyLCBnZXRBcmd1bWVudHM6IG51bGx9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUubG9naW5QYXNzQXV0aCA9IGZ1bmN0aW9uIChsb2dpbiwgcGFzcywgcmVtZW1iZXJNZSwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICB2YXIgYm9keSA9IHtcbiAgICAgICAgdXNlcm5hbWU6IGxvZ2luLFxuICAgICAgICBwYXNzd29yZDogcGFzcyxcbiAgICAgICAgcmVtZW1iZXJfbWU6IHJlbWVtYmVyTWVcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdQT1NUJywgZW5kcG9pbnQ6ICdwcm94eS9sb2dpbj9wcm9qZWN0SWQ9Jyt0aGlzLnByb2plY3RJZCwgcG9zdEJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHkpfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxuWExBcGkucHJvdG90eXBlLnNtc0F1dGggPSBmdW5jdGlvbiAocGhvbmVOdW1iZXIsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ0dFVCcsIGVuZHBvaW50OiAnc21zJywgZ2V0QXJndW1lbnRzOiAncGhvbmVOdW1iZXI9JyArIHBob25lTnVtYmVyfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBYTEFwaTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBhLmtvcm90YWV2IG9uIDI0LjA2LjE2LlxuICovXG5cbnZhciBYTEFwaSA9IHJlcXVpcmUoJy4veGxhcGknKTtcbi8qKlxuICogQ3JlYXRlIGFuIGBBdXRoMGAgaW5zdGFuY2Ugd2l0aCBgb3B0aW9uc2BcbiAqXG4gKiBAY2xhc3MgWExcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBYTCAob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHNlbGYuX3NvY2lhbFVybHMgPSB1bmRlZmluZWQ7XG5cbiAgICBzZWxmLl9vcHRpb25zID0ge307XG4gICAgc2VsZi5fb3B0aW9ucy5lcnJvckhhbmRsZXIgPSBvcHRpb25zLmVycm9ySGFuZGxlciB8fCBmdW5jdGlvbihhKSB7fTtcbiAgICBzZWxmLl9vcHRpb25zLmxvZ2luUGFzc1ZhbGlkYXRvciA9IG9wdGlvbnMubG9naW5QYXNzVmFsaWRhdG9yIHx8IGZ1bmN0aW9uIChhLGIpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgc2VsZi5fb3B0aW9ucy5pc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQgPSBvcHRpb25zLmlzTWFya3VwU29jaWFsc0hhbmRsZXJzRW5hYmxlZCB8fCBmYWxzZTtcbiAgICBzZWxmLl9vcHRpb25zLmNhbGxiYWNrVXJsID0gb3B0aW9ucy5jYWxsYmFja1VybCB8fCB1bmRlZmluZWQ7XG5cbiAgICB2YXIgcGFyYW1zID0ge307XG4gICAgcGFyYW1zLnByb2plY3RJZCA9IG9wdGlvbnMucHJvamVjdElkO1xuXG4gICAgaWYgKHNlbGYuX29wdGlvbnMuY2FsbGJhY2tVcmwpIHtcbiAgICAgICAgcGFyYW1zLmNhbGxiYWNrX3VybCA9IHNlbGYuX29wdGlvbnMuY2FsbGJhY2tVcmw7XG4gICAgfVxuXG4gICAgc2VsZi5fYXBpID0gbmV3IFhMQXBpKG9wdGlvbnMucHJvamVjdElkKTtcbiAgICBzZWxmLl9hcGkuZ2V0U29jaWFsc1VSTHMoZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIHNlbGYuX3NvY2lhbFVybHMgPSB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHNlbGYuX3NvY2lhbFVybHNbJ3NuLScgKyBrZXldID0gcmVzcG9uc2Vba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgfSwgcGFyYW1zKTtcblxuICAgIHZhciBlbGVtZW50cyA9IHNlbGYuZ2V0QWxsRWxlbWVudHNXaXRoQXR0cmlidXRlKCdkYXRhLXhsLWF1dGgnKTtcbiAgICB2YXIgbG9naW4gPSAnJztcbiAgICB2YXIgcGFzcyA9ICcnO1xuXG4gICAgLy8gZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIC8vICAgICB2YXIgbm9kZVZhbHVlID0gZWxlbWVudHNbaV0uYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ10ubm9kZVZhbHVlO1xuICAgIC8vICAgICBpZiAobm9kZVZhbHVlLnN0YXJ0c1dpdGgoJ3NuJykpIHtcbiAgICAvLyAgICAgICAgIGVsZW1lbnRzW2ldLm9uY2xpY2sgPSBmdW5jdGlvbiAobm9kZVZhbHVlKSB7XG4gICAgLy8gICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAvLyAgICAgICAgICAgICAgICAgc2VsZi5sb2dpbih7YXV0aFR5cGU6IG5vZGVWYWx1ZX0pXG4gICAgLy8gICAgICAgICAgICAgfTtcbiAgICAvLyAgICAgICAgIH0obm9kZVZhbHVlKTtcbiAgICAvLyAgICAgfSBlbHNlIGlmIChub2RlVmFsdWUgPT0gJ2Zvcm0tc21zJykge1xuICAgIC8vICAgICAgICAgLy8gZWxlbWVudHNbaV0ub25zdWJtaXQgPSBjb25maWcuZXZlbnRIYW5kbGVycy5zbXM7XG4gICAgLy8gICAgIH0gZWxzZSBpZiAobm9kZVZhbHVlID09ICdmb3JtLWxvZ2luX3Bhc3MnKSB7XG4gICAgLy8gICAgICAgICAvLyBlbGVtZW50c1tpXS5vbnN1Ym1pdCA9IGNvbmZpZy5ldmVudEhhbmRsZXJzLmxvZ2luUGFzcztcbiAgICAvLyAgICAgICAgIGVsZW1lbnRzW2ldLm9uc3VibWl0ID0gZnVuY3Rpb24gKGxvZ2luLCBwYXNzKSB7XG4gICAgLy8gICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChlKSB7XG4gICAgLy8gICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAvLyAgICAgICAgICAgICAgICAgaWYgKHNlbGYuX29wdGlvbnMubG9naW5QYXNzVmFsaWRhdG9yKGxvZ2luLCBwYXNzKSkge1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2dpbih7XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgYXV0aFR5cGU6ICdsb2dpbi1wYXNzJyxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICBsb2dpbjogbG9naW4sXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgcGFzczogcGFzc1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlcykge1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXMuZXJyb3IpIHtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fb3B0aW9ucy5lcnJvckhhbmRsZXIocmVzKTtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAvLyAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgIHNlbGYuX29wdGlvbnMuZXJyb3JIYW5kbGVyKHNlbGYuY3JlYXRlRXJyb3JPYmplY3QoJ0xvZ2luIG9yIHBhc3Mgbm90IHZhbGlkJywgWEwuSU5WQUxJRF9MT0dJTl9FUlJPUl9DT0RFKSk7XG4gICAgLy8gICAgICAgICAgICAgICAgIH1cbiAgICAvLyAgICAgICAgICAgICB9XG4gICAgLy8gICAgICAgICB9KGxvZ2luLCBwYXNzKTtcbiAgICAvLyAgICAgfSBlbHNlIGlmIChub2RlVmFsdWUuc3RhcnRzV2l0aCgnaW5wdXQtJykpIHtcbiAgICAvLyAgICAgICAgIGlmIChub2RlVmFsdWUgPT0gJ2lucHV0LWxvZ2luJykge1xuICAgIC8vICAgICAgICAgICAgIGxvZ2luID0gJyc7XG4gICAgLy8gICAgICAgICB9IGVsc2UgaWYgKG5vZGVWYWx1ZSA9PSAnaW5wdXQtcGFzcycpIHtcbiAgICAvLyAgICAgICAgICAgICBwYXNzID0gJyc7XG4gICAgLy8gICAgICAgICB9XG4gICAgLy8gICAgIH1cbiAgICAvLyB9XG5cbiAgICBpZiAoc2VsZi5fb3B0aW9ucy5pc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQpIHtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBlLnRhcmdldDtcbiAgICAgICAgICAgIHZhciB4bERhdGEgPSBlbGVtZW50LmF0dHJpYnV0ZXNbJ2RhdGEteGwtYXV0aCddO1xuICAgICAgICAgICAgaWYgKHhsRGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBub2RlVmFsdWUgPSB4bERhdGEubm9kZVZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChub2RlVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2dpbih7YXV0aFR5cGU6IG5vZGVWYWx1ZX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5YTC5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbiAocHJvcCwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoIXByb3AgfHwgIXNlbGYuX3NvY2lhbFVybHMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHByb3BzXG4gICAgICogYXV0aFR5cGU6IHNuLTxzb2NpYWwgbmFtZT4sIGxvZ2luLXBhc3MsIHNtc1xuICAgICAqL1xuICAgIGlmIChwcm9wLmF1dGhUeXBlKSB7XG4gICAgICAgIGlmIChwcm9wLmF1dGhUeXBlLnN0YXJ0c1dpdGgoJ3NuLScpKSB7XG4gICAgICAgICAgICB2YXIgc29jaWFsVXJsID0gc2VsZi5fc29jaWFsVXJsc1twcm9wLmF1dGhUeXBlXTtcbiAgICAgICAgICAgIGlmIChzb2NpYWxVcmwgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBzZWxmLl9zb2NpYWxVcmxzW3Byb3AuYXV0aFR5cGVdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBdXRoIHR5cGU6ICcgKyBwcm9wLmF1dGhUeXBlICsgJyBkb2VzblxcJ3QgZXhpc3QnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ2xvZ2luLXBhc3MnKSB7XG4gICAgICAgICAgICBzZWxmLl9hcGkubG9naW5QYXNzQXV0aChwcm9wLmxvZ2luLCBwcm9wLnBhc3MsIHByb3AucmVtZW1iZXJNZSwgZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzLmxvZ2luX3VybCkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlcy5sb2dpbl91cmw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soc2VsZi5jcmVhdGVFcnJvck9iamVjdCgnTG9naW4gb3IgcGFzcyBub3QgdmFsaWQnLCBYTC5JTkNPUlJFQ1RfTE9HSU5fT1JfUEFTU1dPUkRfRVJST1JfQ09ERSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnc21zJykge1xuICAgICAgICAgICAgaWYgKHNtc0F1dGhTdGVwID09ICdwaG9uZScpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9hcGkuc21zQXV0aChwcm9wLnBob25lTnVtYmVyLCBudWxsLCBudWxsKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc21zQXV0aFN0ZXAgPT0gJ2NvZGUnKSB7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5rbm93biBhdXRoIHR5cGUnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxuWEwucHJvdG90eXBlLmdldEFsbEVsZW1lbnRzV2l0aEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChhdHRyaWJ1dGUpIHtcbiAgICB2YXIgbWF0Y2hpbmdFbGVtZW50cyA9IFtdO1xuICAgIHZhciBhbGxFbGVtZW50cyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCcqJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSBhbGxFbGVtZW50cy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAge1xuICAgICAgICBpZiAoYWxsRWxlbWVudHNbaV0uZ2V0QXR0cmlidXRlKGF0dHJpYnV0ZSkgIT09IG51bGwpXG4gICAgICAgIHtcbiAgICAgICAgICAgIG1hdGNoaW5nRWxlbWVudHMucHVzaChhbGxFbGVtZW50c1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1hdGNoaW5nRWxlbWVudHM7XG59O1xuXG5YTC5wcm90b3R5cGUuY3JlYXRlRXJyb3JPYmplY3QgPSBmdW5jdGlvbihtZXNzYWdlLCBjb2RlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgICAgICBjb2RlOiBjb2RlIHx8IC0xXG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuWEwuaW5pdCA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICBpZiAoIXdpbmRvdy5fX3hsKSB7XG4gICAgICAgIHZhciB4bCA9IG5ldyBYTChwYXJhbXMpO1xuICAgICAgICB3aW5kb3cuX194bCA9IHhsO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1hMIGFscmVhZHkgaW5pdCEnKTtcbiAgICB9XG59O1xuXG5YTC5sb2dpbiA9IGZ1bmN0aW9uIChwcm9wLCBjYWxsYmFjaykge1xuICAgIGlmICh3aW5kb3cuX194bCkge1xuICAgICAgICB3aW5kb3cuX194bC5sb2dpbihwcm9wLCBjYWxsYmFjayk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignUGxlYXNlIHJ1biBYTC5pbml0KCkgZmlyc3QnKTtcbiAgICB9XG59O1xuXG5YTC5BdXRoV2lkZ2V0ID0gZnVuY3Rpb24gKGRpdk5hbWUsIG9wdGlvbnMpIHtcbiAgICBpZiAoIWRpdk5hbWUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignTm8gZGl2IG5hbWUhJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGh0bWwgPSAnPGlmcmFtZT48L2lmcmFtZT4nO1xuICAgICAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGRpdk5hbWUpO1xuICAgICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZGl2TmFtZSkuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0VsZW1lbnQgJyArIGRpdk5hbWUgKycgbm90IGZvdW5kIScpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuWEwuQXV0aEJ1dHRvbiA9IGZ1bmN0aW9uIChkaXZOYW1lLCBvcHRpb25zKSB7XG5cbn07XG5cblhMLklOVkFMSURfTE9HSU5fRVJST1JfQ09ERSA9IDE7XG5YTC5JTkNPUlJFQ1RfTE9HSU5fT1JfUEFTU1dPUkRfRVJST1JfQ09ERSA9IDI7XG5cbm1vZHVsZS5leHBvcnRzID0gWEw7Il19
