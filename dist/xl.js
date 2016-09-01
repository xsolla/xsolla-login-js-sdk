(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XL = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Created by a.korotaev on 24.06.16.
 */
/**
 * Impelements Xsolla Login Api
 * @param projectId - project's unique identifier
 * @param baseUrl - api endpoint
 * @constructor
 */

var XLApi = function (projectId, baseUrl) {
    var self = this;
    this.baseUrl = baseUrl || 'http://login.xsolla.com/api/';

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
    self._options.apiUrl = options.apiUrl || 'http://login.xsolla.com/api/';
    self._options.maxXLClickDepth = options.maxXLClickDepth || 20;

    var params = {};
    params.projectId = options.projectId;

    if (self._options.callbackUrl) {
        params.callback_url = self._options.callbackUrl;
    }

    self._api = new XLApi(options.projectId, self._options.apiUrl);


   var updateSocialLinks = function () {
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
    };


    //Update auth links every hour
    updateSocialLinks();
    setInterval(updateSocialLinks, 1000*60*59);

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

    // Find closest ancestor with data-xl-auth attribute
    function findAncestor(el) {
        if (el.attributes['data-xl-auth']) {
            return el;
        }
        var i = 0;
        while ((el = el.parentElement) && !el.attributes['data-xl-auth'] && ++i < self._options.maxXLClickDepth);
        return el;
    }

    if (self._options.isMarkupSocialsHandlersEnabled) {
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuLyoqXG4gKiBJbXBlbGVtZW50cyBYc29sbGEgTG9naW4gQXBpXG4gKiBAcGFyYW0gcHJvamVjdElkIC0gcHJvamVjdCdzIHVuaXF1ZSBpZGVudGlmaWVyXG4gKiBAcGFyYW0gYmFzZVVybCAtIGFwaSBlbmRwb2ludFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxudmFyIFhMQXBpID0gZnVuY3Rpb24gKHByb2plY3RJZCwgYmFzZVVybCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmJhc2VVcmwgPSBiYXNlVXJsIHx8ICdodHRwOi8vbG9naW4ueHNvbGxhLmNvbS9hcGkvJztcblxuICAgIHRoaXMucHJvamVjdElkID0gcHJvamVjdElkO1xuXG4gICAgdGhpcy5tYWtlQXBpQ2FsbCA9IGZ1bmN0aW9uIChwYXJhbXMsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgICAgIHZhciByID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHIub3BlbihwYXJhbXMubWV0aG9kLCBzZWxmLmJhc2VVcmwgKyBwYXJhbXMuZW5kcG9pbnQsIHRydWUpO1xuICAgICAgICAvLyByLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLThcIik7XG4gICAgICAgIHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHIucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzKEpTT04ucGFyc2Uoci5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoci5yZXNwb25zZVRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKEpTT04ucGFyc2Uoci5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKHtlcnJvcjoge21lc3NhZ2U6ICdOZXR3b3JraW5nIGVycm9yJywgY29kZTogci5zdGF0dXN9fSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGlmIChwYXJhbXMubWV0aG9kID09ICdQT1NUJykge1xuICAgICAgICAgICAgci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04XCIpO1xuICAgICAgICAgICAgci5zZW5kKHBhcmFtcy5wb3N0Qm9keSk7XG4gICAgICAgIH0gZWxzZSBpZiAocGFyYW1zLm1ldGhvZCA9PSAnR0VUJykge1xuICAgICAgICAgICAgci5zZW5kKHBhcmFtcy5nZXRBcmd1bWVudHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFyIHJlc3BvbnNlSGFuZGxlciA9IGZ1bmN0aW9uIChlcnIsIHJlcykge1xuICAgICAgICAvLyAgICAgaWYgKCFlcnIpIHtcbiAgICAgICAgLy8gICAgICAgICBzdWNjZXNzKEpTT04ucGFyc2UocmVzLnRleHQpKTtcbiAgICAgICAgLy8gICAgIH0gZWxzZSB7XG4gICAgICAgIC8vICAgICAgICAgdmFyIGJvZHkgPSByZXMuYm9keSB8fCB7bWVzc2FnZTogZXJyLm1lc3NhZ2UsIGNvZGU6IDEwfTtcbiAgICAgICAgLy8gICAgICAgICBlcnJvcih7ZXJyb3I6IGJvZHl9KTtcbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gfTtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gdmFyIG1ldGhvZCA9IHBhcmFtcy5tZXRob2QgfHwgJ0dFVCc7XG4gICAgICAgIC8vIHZhciByZXF1ZXN0VXJsID0gc2VsZi5iYXNlVXJsICsgcGFyYW1zLmVuZHBvaW50O1xuICAgICAgICAvLyBpZiAobWV0aG9kID09ICdHRVQnKSB7XG4gICAgICAgIC8vICAgICByZXF1ZXN0LmdldChyZXF1ZXN0VXJsLCByZXNwb25zZUhhbmRsZXIpO1xuICAgICAgICAvLyB9IGVsc2UgaWYgKG1ldGhvZCA9PSAnUE9TVCcpIHtcbiAgICAgICAgLy8gICAgIHJlcXVlc3RcbiAgICAgICAgLy8gICAgICAgICAucG9zdChyZXF1ZXN0VXJsKVxuICAgICAgICAvLyAgICAgICAgIC5zZXQoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04JylcbiAgICAgICAgLy8gICAgICAgICAuc2VuZChwYXJhbXMucG9zdEJvZHkpXG4gICAgICAgIC8vICAgICAgICAgLmVuZChyZXNwb25zZUhhbmRsZXIpO1xuICAgICAgICAvLyB9XG5cbiAgICB9O1xufTtcbi8qKlxuICogR2V0IGFsbCBhdmlhbGFibGUgc29jaWFsIG1ldGhvZHMgYXV0aCB1cmxcbiAqIEBwYXJhbSBzdWNjZXNzIC0gc3VjY2VzcyBjYWxsYmFja1xuICogQHBhcmFtIGVycm9yIC0gZXJyb3IgY2FsbGJhY2tcbiAqL1xuWExBcGkucHJvdG90eXBlLmdldFNvY2lhbHNVUkxzID0gZnVuY3Rpb24gKHN1Y2Nlc3MsIGVycm9yLCBnZXRBcmd1bWVudHMpIHtcbiAgICB2YXIgc3RyID0gXCJcIjtcbiAgICBmb3IgKHZhciBrZXkgaW4gZ2V0QXJndW1lbnRzKSB7XG4gICAgICAgIGlmIChzdHIgIT0gXCJcIikge1xuICAgICAgICAgICAgc3RyICs9IFwiJlwiO1xuICAgICAgICB9XG4gICAgICAgIHN0ciArPSBrZXkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChnZXRBcmd1bWVudHNba2V5XSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ0dFVCcsIGVuZHBvaW50OiAnc29jaWFsL2xvZ2luX3VybHM/JyArIHN0ciwgZ2V0QXJndW1lbnRzOiBudWxsfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxuWExBcGkucHJvdG90eXBlLmxvZ2luUGFzc0F1dGggPSBmdW5jdGlvbiAobG9naW4sIHBhc3MsIHJlbWVtYmVyTWUsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgdmFyIGJvZHkgPSB7XG4gICAgICAgIHVzZXJuYW1lOiBsb2dpbixcbiAgICAgICAgcGFzc3dvcmQ6IHBhc3MsXG4gICAgICAgIHJlbWVtYmVyX21lOiByZW1lbWJlck1lXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnUE9TVCcsIGVuZHBvaW50OiAncHJveHkvbG9naW4/cHJvamVjdElkPScrdGhpcy5wcm9qZWN0SWQsIHBvc3RCb2R5OiBKU09OLnN0cmluZ2lmeShib2R5KX0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cblhMQXBpLnByb3RvdHlwZS5zbXNBdXRoID0gZnVuY3Rpb24gKHBob25lTnVtYmVyLCBzdWNjZXNzLCBlcnJvcikge1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ3NtcycsIGdldEFyZ3VtZW50czogJ3Bob25lTnVtYmVyPScgKyBwaG9uZU51bWJlcn0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gWExBcGk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuXG52YXIgWExBcGkgPSByZXF1aXJlKCcuL3hsYXBpJyk7XG4vKipcbiAqIENyZWF0ZSBhbiBgQXV0aDBgIGluc3RhbmNlIHdpdGggYG9wdGlvbnNgXG4gKlxuICogQGNsYXNzIFhMXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gWEwgKG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBzZWxmLl9zb2NpYWxVcmxzID0gdW5kZWZpbmVkO1xuXG4gICAgc2VsZi5fb3B0aW9ucyA9IHt9O1xuICAgIHNlbGYuX29wdGlvbnMuZXJyb3JIYW5kbGVyID0gb3B0aW9ucy5lcnJvckhhbmRsZXIgfHwgZnVuY3Rpb24oYSkge307XG4gICAgc2VsZi5fb3B0aW9ucy5sb2dpblBhc3NWYWxpZGF0b3IgPSBvcHRpb25zLmxvZ2luUGFzc1ZhbGlkYXRvciB8fCBmdW5jdGlvbiAoYSxiKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIHNlbGYuX29wdGlvbnMuaXNNYXJrdXBTb2NpYWxzSGFuZGxlcnNFbmFibGVkID0gb3B0aW9ucy5pc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQgfHwgZmFsc2U7XG4gICAgc2VsZi5fb3B0aW9ucy5jYWxsYmFja1VybCA9IG9wdGlvbnMuY2FsbGJhY2tVcmwgfHwgdW5kZWZpbmVkO1xuICAgIHNlbGYuX29wdGlvbnMuYXBpVXJsID0gb3B0aW9ucy5hcGlVcmwgfHwgJ2h0dHA6Ly9sb2dpbi54c29sbGEuY29tL2FwaS8nO1xuICAgIHNlbGYuX29wdGlvbnMubWF4WExDbGlja0RlcHRoID0gb3B0aW9ucy5tYXhYTENsaWNrRGVwdGggfHwgMjA7XG5cbiAgICB2YXIgcGFyYW1zID0ge307XG4gICAgcGFyYW1zLnByb2plY3RJZCA9IG9wdGlvbnMucHJvamVjdElkO1xuXG4gICAgaWYgKHNlbGYuX29wdGlvbnMuY2FsbGJhY2tVcmwpIHtcbiAgICAgICAgcGFyYW1zLmNhbGxiYWNrX3VybCA9IHNlbGYuX29wdGlvbnMuY2FsbGJhY2tVcmw7XG4gICAgfVxuXG4gICAgc2VsZi5fYXBpID0gbmV3IFhMQXBpKG9wdGlvbnMucHJvamVjdElkLCBzZWxmLl9vcHRpb25zLmFwaVVybCk7XG5cblxuICAgdmFyIHVwZGF0ZVNvY2lhbExpbmtzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLl9hcGkuZ2V0U29jaWFsc1VSTHMoZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBzZWxmLl9zb2NpYWxVcmxzID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9zb2NpYWxVcmxzWydzbi0nICsga2V5XSA9IHJlc3BvbnNlW2tleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgfSwgcGFyYW1zKTtcbiAgICB9O1xuXG5cbiAgICAvL1VwZGF0ZSBhdXRoIGxpbmtzIGV2ZXJ5IGhvdXJcbiAgICB1cGRhdGVTb2NpYWxMaW5rcygpO1xuICAgIHNldEludGVydmFsKHVwZGF0ZVNvY2lhbExpbmtzLCAxMDAwKjYwKjU5KTtcblxuICAgIHZhciBlbGVtZW50cyA9IHNlbGYuZ2V0QWxsRWxlbWVudHNXaXRoQXR0cmlidXRlKCdkYXRhLXhsLWF1dGgnKTtcbiAgICB2YXIgbG9naW4gPSAnJztcbiAgICB2YXIgcGFzcyA9ICcnO1xuXG4gICAgLy8gZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIC8vICAgICB2YXIgbm9kZVZhbHVlID0gZWxlbWVudHNbaV0uYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ10ubm9kZVZhbHVlO1xuICAgIC8vICAgICBpZiAobm9kZVZhbHVlLnN0YXJ0c1dpdGgoJ3NuJykpIHtcbiAgICAvLyAgICAgICAgIGVsZW1lbnRzW2ldLm9uY2xpY2sgPSBmdW5jdGlvbiAobm9kZVZhbHVlKSB7XG4gICAgLy8gICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAvLyAgICAgICAgICAgICAgICAgc2VsZi5sb2dpbih7YXV0aFR5cGU6IG5vZGVWYWx1ZX0pXG4gICAgLy8gICAgICAgICAgICAgfTtcbiAgICAvLyAgICAgICAgIH0obm9kZVZhbHVlKTtcbiAgICAvLyAgICAgfSBlbHNlIGlmIChub2RlVmFsdWUgPT0gJ2Zvcm0tc21zJykge1xuICAgIC8vICAgICAgICAgLy8gZWxlbWVudHNbaV0ub25zdWJtaXQgPSBjb25maWcuZXZlbnRIYW5kbGVycy5zbXM7XG4gICAgLy8gICAgIH0gZWxzZSBpZiAobm9kZVZhbHVlID09ICdmb3JtLWxvZ2luX3Bhc3MnKSB7XG4gICAgLy8gICAgICAgICAvLyBlbGVtZW50c1tpXS5vbnN1Ym1pdCA9IGNvbmZpZy5ldmVudEhhbmRsZXJzLmxvZ2luUGFzcztcbiAgICAvLyAgICAgICAgIGVsZW1lbnRzW2ldLm9uc3VibWl0ID0gZnVuY3Rpb24gKGxvZ2luLCBwYXNzKSB7XG4gICAgLy8gICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChlKSB7XG4gICAgLy8gICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAvLyAgICAgICAgICAgICAgICAgaWYgKHNlbGYuX29wdGlvbnMubG9naW5QYXNzVmFsaWRhdG9yKGxvZ2luLCBwYXNzKSkge1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2dpbih7XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgYXV0aFR5cGU6ICdsb2dpbi1wYXNzJyxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICBsb2dpbjogbG9naW4sXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgcGFzczogcGFzc1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlcykge1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXMuZXJyb3IpIHtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fb3B0aW9ucy5lcnJvckhhbmRsZXIocmVzKTtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAvLyAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgIHNlbGYuX29wdGlvbnMuZXJyb3JIYW5kbGVyKHNlbGYuY3JlYXRlRXJyb3JPYmplY3QoJ0xvZ2luIG9yIHBhc3Mgbm90IHZhbGlkJywgWEwuSU5WQUxJRF9MT0dJTl9FUlJPUl9DT0RFKSk7XG4gICAgLy8gICAgICAgICAgICAgICAgIH1cbiAgICAvLyAgICAgICAgICAgICB9XG4gICAgLy8gICAgICAgICB9KGxvZ2luLCBwYXNzKTtcbiAgICAvLyAgICAgfSBlbHNlIGlmIChub2RlVmFsdWUuc3RhcnRzV2l0aCgnaW5wdXQtJykpIHtcbiAgICAvLyAgICAgICAgIGlmIChub2RlVmFsdWUgPT0gJ2lucHV0LWxvZ2luJykge1xuICAgIC8vICAgICAgICAgICAgIGxvZ2luID0gJyc7XG4gICAgLy8gICAgICAgICB9IGVsc2UgaWYgKG5vZGVWYWx1ZSA9PSAnaW5wdXQtcGFzcycpIHtcbiAgICAvLyAgICAgICAgICAgICBwYXNzID0gJyc7XG4gICAgLy8gICAgICAgICB9XG4gICAgLy8gICAgIH1cbiAgICAvLyB9XG5cbiAgICAvLyBGaW5kIGNsb3Nlc3QgYW5jZXN0b3Igd2l0aCBkYXRhLXhsLWF1dGggYXR0cmlidXRlXG4gICAgZnVuY3Rpb24gZmluZEFuY2VzdG9yKGVsKSB7XG4gICAgICAgIGlmIChlbC5hdHRyaWJ1dGVzWydkYXRhLXhsLWF1dGgnXSkge1xuICAgICAgICAgICAgcmV0dXJuIGVsO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgd2hpbGUgKChlbCA9IGVsLnBhcmVudEVsZW1lbnQpICYmICFlbC5hdHRyaWJ1dGVzWydkYXRhLXhsLWF1dGgnXSAmJiArK2kgPCBzZWxmLl9vcHRpb25zLm1heFhMQ2xpY2tEZXB0aCk7XG4gICAgICAgIHJldHVybiBlbDtcbiAgICB9XG5cbiAgICBpZiAoc2VsZi5fb3B0aW9ucy5pc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQpIHtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdmFyIHRhcmdldCA9IGZpbmRBbmNlc3RvcihlLnRhcmdldCk7XG4gICAgICAgICAgICAvLyBEbyBub3RoaW5nIGlmIGNsaWNrIHdhcyBvdXRzaWRlIG9mIGVsZW1lbnRzIHdpdGggZGF0YS14bC1hdXRoXG4gICAgICAgICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB4bERhdGEgPSB0YXJnZXQuYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ107XG4gICAgICAgICAgICBpZiAoeGxEYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5vZGVWYWx1ZSA9IHhsRGF0YS5ub2RlVmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGVWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmxvZ2luKHthdXRoVHlwZTogbm9kZVZhbHVlfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59XG5cblhMLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uIChwcm9wLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICghcHJvcCB8fCAhc2VsZi5fc29jaWFsVXJscykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcHJvcHNcbiAgICAgKiBhdXRoVHlwZTogc24tPHNvY2lhbCBuYW1lPiwgbG9naW4tcGFzcywgc21zXG4gICAgICovXG4gICAgaWYgKHByb3AuYXV0aFR5cGUpIHtcbiAgICAgICAgaWYgKHByb3AuYXV0aFR5cGUuc3RhcnRzV2l0aCgnc24tJykpIHtcbiAgICAgICAgICAgIHZhciBzb2NpYWxVcmwgPSBzZWxmLl9zb2NpYWxVcmxzW3Byb3AuYXV0aFR5cGVdO1xuICAgICAgICAgICAgaWYgKHNvY2lhbFVybCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHNlbGYuX3NvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F1dGggdHlwZTogJyArIHByb3AuYXV0aFR5cGUgKyAnIGRvZXNuXFwndCBleGlzdCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnbG9naW4tcGFzcycpIHtcbiAgICAgICAgICAgIHNlbGYuX2FwaS5sb2dpblBhc3NBdXRoKHByb3AubG9naW4sIHByb3AucGFzcywgcHJvcC5yZW1lbWJlck1lLCBmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXMubG9naW5fdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVzLmxvZ2luX3VybDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhzZWxmLmNyZWF0ZUVycm9yT2JqZWN0KCdMb2dpbiBvciBwYXNzIG5vdCB2YWxpZCcsIFhMLklOQ09SUkVDVF9MT0dJTl9PUl9QQVNTV09SRF9FUlJPUl9DT0RFKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmIChwcm9wLmF1dGhUeXBlID09ICdzbXMnKSB7XG4gICAgICAgICAgICBpZiAoc21zQXV0aFN0ZXAgPT0gJ3Bob25lJykge1xuICAgICAgICAgICAgICAgIHNlbGYuX2FwaS5zbXNBdXRoKHByb3AucGhvbmVOdW1iZXIsIG51bGwsIG51bGwpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzbXNBdXRoU3RlcCA9PSAnY29kZScpIHtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmtub3duIGF1dGggdHlwZScpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuXG5YTC5wcm90b3R5cGUuZ2V0QWxsRWxlbWVudHNXaXRoQXR0cmlidXRlID0gZnVuY3Rpb24gKGF0dHJpYnV0ZSkge1xuICAgIHZhciBtYXRjaGluZ0VsZW1lbnRzID0gW107XG4gICAgdmFyIGFsbEVsZW1lbnRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJyonKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IGFsbEVsZW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICB7XG4gICAgICAgIGlmIChhbGxFbGVtZW50c1tpXS5nZXRBdHRyaWJ1dGUoYXR0cmlidXRlKSAhPT0gbnVsbClcbiAgICAgICAge1xuICAgICAgICAgICAgbWF0Y2hpbmdFbGVtZW50cy5wdXNoKGFsbEVsZW1lbnRzW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF0Y2hpbmdFbGVtZW50cztcbn07XG5cblhMLnByb3RvdHlwZS5jcmVhdGVFcnJvck9iamVjdCA9IGZ1bmN0aW9uKG1lc3NhZ2UsIGNvZGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICAgIGNvZGU6IGNvZGUgfHwgLTFcbiAgICAgICAgfVxuICAgIH07XG59O1xuXG5YTC5pbml0ID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgIGlmICghd2luZG93Ll9feGwpIHtcbiAgICAgICAgdmFyIHhsID0gbmV3IFhMKHBhcmFtcyk7XG4gICAgICAgIHdpbmRvdy5fX3hsID0geGw7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignWEwgYWxyZWFkeSBpbml0IScpO1xuICAgIH1cbn07XG5cblhMLmxvZ2luID0gZnVuY3Rpb24gKHByb3AsIGNhbGxiYWNrKSB7XG4gICAgaWYgKHdpbmRvdy5fX3hsKSB7XG4gICAgICAgIHdpbmRvdy5fX3hsLmxvZ2luKHByb3AsIGNhbGxiYWNrKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdQbGVhc2UgcnVuIFhMLmluaXQoKSBmaXJzdCcpO1xuICAgIH1cbn07XG5cblhMLkF1dGhXaWRnZXQgPSBmdW5jdGlvbiAoZGl2TmFtZSwgb3B0aW9ucykge1xuICAgIGlmICghZGl2TmFtZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdObyBkaXYgbmFtZSEnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaHRtbCA9ICc8aWZyYW1lPjwvaWZyYW1lPic7XG4gICAgICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZGl2TmFtZSk7XG4gICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkaXZOYW1lKS5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRWxlbWVudCAnICsgZGl2TmFtZSArJyBub3QgZm91bmQhJyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5YTC5BdXRoQnV0dG9uID0gZnVuY3Rpb24gKGRpdk5hbWUsIG9wdGlvbnMpIHtcblxufTtcblxuWEwuSU5WQUxJRF9MT0dJTl9FUlJPUl9DT0RFID0gMTtcblhMLklOQ09SUkVDVF9MT0dJTl9PUl9QQVNTV09SRF9FUlJPUl9DT0RFID0gMjtcblxubW9kdWxlLmV4cG9ydHMgPSBYTDsiXX0=
