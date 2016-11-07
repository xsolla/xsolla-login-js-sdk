(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XL = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Created by a.korotaev on 07.11.16.
 */
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    };
}
},{}],2:[function(require,module,exports){
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

    return this.makeApiCall({method: 'GET', endpoint: 'social/login_urls?' + str, getArguments: null}, success, error);
};

XLApi.prototype.loginPassAuth = function (login, pass, rememberMe, redirectUrl, success, error) {
    var body = {
        username: login,
        password: pass,
        remember_me: rememberMe
    };
    return this.makeApiCall({method: 'POST', endpoint: 'proxy/login?projectId='+this.projectId + '&redirect_url=' + encodeURIComponent(redirectUrl), postBody: JSON.stringify(body)}, success, error);
};

XLApi.prototype.smsAuth = function (phoneNumber, success, error) {
    return this.makeApiCall({method: 'GET', endpoint: 'sms', getArguments: 'phoneNumber=' + phoneNumber}, success, error);
};

module.exports = XLApi;

},{}],"main":[function(require,module,exports){
/**
 * Created by a.korotaev on 24.06.16.
 */
require('./supports');

var XLApi = require('./xlapi');
/**
 * Create an `Auth0` instance with `options`
 *
 * @class XL
 * @constructor
 */
function XL (options) {
    var self = this;

    self._socialUrls = {};

    self._options = {};
    self._options.errorHandler = options.errorHandler || function(a) {};
    self._options.loginPassValidator = options.loginPassValidator || function (a,b) { return true; };
    self._options.isMarkupSocialsHandlersEnabled = options.isMarkupSocialsHandlersEnabled || false;
    self._options.redirectUrl = options.redirectUrl || undefined;
    self._options.apiUrl = options.apiUrl || '//login.xsolla.com/api/';
    self._options.maxXLClickDepth = options.maxXLClickDepth || 20;

    var params = {};
    params.projectId = options.projectId;

    if (self._options.redirectUrl) {
        params.redirect_url = self._options.redirectUrl;
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
/**
 * Performs login
 * @param prop
 * @param error - call in case error
 * @param success
 */
XL.prototype.login = function (prop, error, success) {
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
            self._api.loginPassAuth(prop.login, prop.pass, prop.rememberMe, self._options.redirectUrl, function (res) {
                if (res.login_url) {
                    var finishAuth = function () {
                        window.location.href = res.login_url;
                    };
                    if (success) {
                        success({status: 'success', finish: finishAuth, redirectUrl: res.login_url});
                    } else {
                        finishAuth();
                    }
                } else {
                    error(self.createErrorObject('Login or pass not valid', XL.INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE));
                }
            }, function (err) {
                error(err);
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

XL.prototype.sendSms = function (number, error, success) {

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

XL.login = function (prop, error, success) {
    if (window.__xl) {
        window.__xl.login(prop, error, success);
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
            console.error('Element \"' + divName +'\" not found!');
        }
    }
};

XL.AuthButton = function (divName, options) {

};

XL.INVALID_LOGIN_ERROR_CODE = 1;
XL.INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE = 2;



module.exports = XL;



},{"./supports":1,"./xlapi":2}]},{},["main"])("main")
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc3VwcG9ydHMuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAwNy4xMS4xNi5cbiAqL1xuaWYgKCFTdHJpbmcucHJvdG90eXBlLnN0YXJ0c1dpdGgpIHtcbiAgICBTdHJpbmcucHJvdG90eXBlLnN0YXJ0c1dpdGggPSBmdW5jdGlvbihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSB7XG4gICAgICAgIHBvc2l0aW9uID0gcG9zaXRpb24gfHwgMDtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXhPZihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSA9PT0gcG9zaXRpb247XG4gICAgfTtcbn0iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuLyoqXG4gKiBJbXBlbGVtZW50cyBYc29sbGEgTG9naW4gQXBpXG4gKiBAcGFyYW0gcHJvamVjdElkIC0gcHJvamVjdCdzIHVuaXF1ZSBpZGVudGlmaWVyXG4gKiBAcGFyYW0gYmFzZVVybCAtIGFwaSBlbmRwb2ludFxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxudmFyIFhMQXBpID0gZnVuY3Rpb24gKHByb2plY3RJZCwgYmFzZVVybCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmJhc2VVcmwgPSBiYXNlVXJsIHx8ICcvL2xvZ2luLnhzb2xsYS5jb20vYXBpLyc7XG5cbiAgICB0aGlzLnByb2plY3RJZCA9IHByb2plY3RJZDtcblxuICAgIHRoaXMubWFrZUFwaUNhbGwgPSBmdW5jdGlvbiAocGFyYW1zLCBzdWNjZXNzLCBlcnJvcikge1xuICAgICAgICB2YXIgciA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG4gICAgICAgIHIub3BlbihwYXJhbXMubWV0aG9kLCBzZWxmLmJhc2VVcmwgKyBwYXJhbXMuZW5kcG9pbnQsIHRydWUpO1xuICAgICAgICByLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgICAgICAgIGlmIChyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyhKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihKU09OLnBhcnNlKHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcih7ZXJyb3I6IHttZXNzYWdlOiAnTmV0d29ya2luZyBlcnJvcicsIGNvZGU6IHIuc3RhdHVzfX0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBpZiAocGFyYW1zLm1ldGhvZCA9PSAnUE9TVCcpIHtcbiAgICAgICAgICAgIHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwiKTtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMucG9zdEJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy5tZXRob2QgPT0gJ0dFVCcpIHtcbiAgICAgICAgICAgIHIuc2VuZChwYXJhbXMuZ2V0QXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuLyoqXG4gKiBHZXQgYWxsIGF2aWFsYWJsZSBzb2NpYWwgbWV0aG9kcyBhdXRoIHVybFxuICogQHBhcmFtIHN1Y2Nlc3MgLSBzdWNjZXNzIGNhbGxiYWNrXG4gKiBAcGFyYW0gZXJyb3IgLSBlcnJvciBjYWxsYmFja1xuICogQHBhcmFtIGdldEFyZ3VtZW50cyAtIGFkZGl0aW9uYWwgcGFyYW1zIHRvIHNlbmQgd2l0aCByZXF1ZXN0XG4gKi9cblhMQXBpLnByb3RvdHlwZS5nZXRTb2NpYWxzVVJMcyA9IGZ1bmN0aW9uIChzdWNjZXNzLCBlcnJvciwgZ2V0QXJndW1lbnRzKSB7XG4gICAgdmFyIHN0ciA9IFwiXCI7XG4gICAgZm9yICh2YXIga2V5IGluIGdldEFyZ3VtZW50cykge1xuICAgICAgICBpZiAoc3RyICE9IFwiXCIpIHtcbiAgICAgICAgICAgIHN0ciArPSBcIiZcIjtcbiAgICAgICAgfVxuICAgICAgICBzdHIgKz0ga2V5ICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoZ2V0QXJndW1lbnRzW2tleV0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ3NvY2lhbC9sb2dpbl91cmxzPycgKyBzdHIsIGdldEFyZ3VtZW50czogbnVsbH0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cblhMQXBpLnByb3RvdHlwZS5sb2dpblBhc3NBdXRoID0gZnVuY3Rpb24gKGxvZ2luLCBwYXNzLCByZW1lbWJlck1lLCByZWRpcmVjdFVybCwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICB2YXIgYm9keSA9IHtcbiAgICAgICAgdXNlcm5hbWU6IGxvZ2luLFxuICAgICAgICBwYXNzd29yZDogcGFzcyxcbiAgICAgICAgcmVtZW1iZXJfbWU6IHJlbWVtYmVyTWVcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdQT1NUJywgZW5kcG9pbnQ6ICdwcm94eS9sb2dpbj9wcm9qZWN0SWQ9Jyt0aGlzLnByb2plY3RJZCArICcmcmVkaXJlY3RfdXJsPScgKyBlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmwpLCBwb3N0Qm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSl9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUuc21zQXV0aCA9IGZ1bmN0aW9uIChwaG9uZU51bWJlciwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzbXMnLCBnZXRBcmd1bWVudHM6ICdwaG9uZU51bWJlcj0nICsgcGhvbmVOdW1iZXJ9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhMQXBpO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbnJlcXVpcmUoJy4vc3VwcG9ydHMnKTtcblxudmFyIFhMQXBpID0gcmVxdWlyZSgnLi94bGFwaScpO1xuLyoqXG4gKiBDcmVhdGUgYW4gYEF1dGgwYCBpbnN0YW5jZSB3aXRoIGBvcHRpb25zYFxuICpcbiAqIEBjbGFzcyBYTFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFhMIChvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgc2VsZi5fc29jaWFsVXJscyA9IHt9O1xuXG4gICAgc2VsZi5fb3B0aW9ucyA9IHt9O1xuICAgIHNlbGYuX29wdGlvbnMuZXJyb3JIYW5kbGVyID0gb3B0aW9ucy5lcnJvckhhbmRsZXIgfHwgZnVuY3Rpb24oYSkge307XG4gICAgc2VsZi5fb3B0aW9ucy5sb2dpblBhc3NWYWxpZGF0b3IgPSBvcHRpb25zLmxvZ2luUGFzc1ZhbGlkYXRvciB8fCBmdW5jdGlvbiAoYSxiKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIHNlbGYuX29wdGlvbnMuaXNNYXJrdXBTb2NpYWxzSGFuZGxlcnNFbmFibGVkID0gb3B0aW9ucy5pc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQgfHwgZmFsc2U7XG4gICAgc2VsZi5fb3B0aW9ucy5yZWRpcmVjdFVybCA9IG9wdGlvbnMucmVkaXJlY3RVcmwgfHwgdW5kZWZpbmVkO1xuICAgIHNlbGYuX29wdGlvbnMuYXBpVXJsID0gb3B0aW9ucy5hcGlVcmwgfHwgJy8vbG9naW4ueHNvbGxhLmNvbS9hcGkvJztcbiAgICBzZWxmLl9vcHRpb25zLm1heFhMQ2xpY2tEZXB0aCA9IG9wdGlvbnMubWF4WExDbGlja0RlcHRoIHx8IDIwO1xuXG4gICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgIHBhcmFtcy5wcm9qZWN0SWQgPSBvcHRpb25zLnByb2plY3RJZDtcblxuICAgIGlmIChzZWxmLl9vcHRpb25zLnJlZGlyZWN0VXJsKSB7XG4gICAgICAgIHBhcmFtcy5yZWRpcmVjdF91cmwgPSBzZWxmLl9vcHRpb25zLnJlZGlyZWN0VXJsO1xuICAgIH1cblxuICAgIHNlbGYuX2FwaSA9IG5ldyBYTEFwaShvcHRpb25zLnByb2plY3RJZCwgc2VsZi5fb3B0aW9ucy5hcGlVcmwpO1xuXG5cbiAgIHZhciB1cGRhdGVTb2NpYWxMaW5rcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5fYXBpLmdldFNvY2lhbHNVUkxzKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgc2VsZi5fc29jaWFsVXJscyA9IHt9O1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fc29jaWFsVXJsc1snc24tJyArIGtleV0gPSByZXNwb25zZVtrZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgIH0sIHBhcmFtcyk7XG4gICAgfTtcblxuXG4gICAgLy9VcGRhdGUgYXV0aCBsaW5rcyBldmVyeSBob3VyXG4gICAgdXBkYXRlU29jaWFsTGlua3MoKTtcbiAgICBzZXRJbnRlcnZhbCh1cGRhdGVTb2NpYWxMaW5rcywgMTAwMCo2MCo1OSk7XG5cbiAgICB2YXIgZWxlbWVudHMgPSBzZWxmLmdldEFsbEVsZW1lbnRzV2l0aEF0dHJpYnV0ZSgnZGF0YS14bC1hdXRoJyk7XG4gICAgdmFyIGxvZ2luID0gJyc7XG4gICAgdmFyIHBhc3MgPSAnJztcblxuICAgIC8vIEZpbmQgY2xvc2VzdCBhbmNlc3RvciB3aXRoIGRhdGEteGwtYXV0aCBhdHRyaWJ1dGVcbiAgICBmdW5jdGlvbiBmaW5kQW5jZXN0b3IoZWwpIHtcbiAgICAgICAgaWYgKGVsLmF0dHJpYnV0ZXNbJ2RhdGEteGwtYXV0aCddKSB7XG4gICAgICAgICAgICByZXR1cm4gZWw7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICB3aGlsZSAoKGVsID0gZWwucGFyZW50RWxlbWVudCkgJiYgIWVsLmF0dHJpYnV0ZXNbJ2RhdGEteGwtYXV0aCddICYmICsraSA8IHNlbGYuX29wdGlvbnMubWF4WExDbGlja0RlcHRoKTtcbiAgICAgICAgcmV0dXJuIGVsO1xuICAgIH1cblxuICAgIGlmIChzZWxmLl9vcHRpb25zLmlzTWFya3VwU29jaWFsc0hhbmRsZXJzRW5hYmxlZCkge1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gZmluZEFuY2VzdG9yKGUudGFyZ2V0KTtcbiAgICAgICAgICAgIC8vIERvIG5vdGhpbmcgaWYgY2xpY2sgd2FzIG91dHNpZGUgb2YgZWxlbWVudHMgd2l0aCBkYXRhLXhsLWF1dGhcbiAgICAgICAgICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHhsRGF0YSA9IHRhcmdldC5hdHRyaWJ1dGVzWydkYXRhLXhsLWF1dGgnXTtcbiAgICAgICAgICAgIGlmICh4bERhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZVZhbHVlID0geGxEYXRhLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYubG9naW4oe2F1dGhUeXBlOiBub2RlVmFsdWV9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbi8qKlxuICogUGVyZm9ybXMgbG9naW5cbiAqIEBwYXJhbSBwcm9wXG4gKiBAcGFyYW0gZXJyb3IgLSBjYWxsIGluIGNhc2UgZXJyb3JcbiAqIEBwYXJhbSBzdWNjZXNzXG4gKi9cblhMLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uIChwcm9wLCBlcnJvciwgc3VjY2Vzcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICghcHJvcCB8fCAhc2VsZi5fc29jaWFsVXJscykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcHJvcHNcbiAgICAgKiBhdXRoVHlwZTogc24tPHNvY2lhbCBuYW1lPiwgbG9naW4tcGFzcywgc21zXG4gICAgICovXG4gICAgaWYgKHByb3AuYXV0aFR5cGUpIHtcbiAgICAgICAgaWYgKHByb3AuYXV0aFR5cGUuc3RhcnRzV2l0aCgnc24tJykpIHtcbiAgICAgICAgICAgIHZhciBzb2NpYWxVcmwgPSBzZWxmLl9zb2NpYWxVcmxzW3Byb3AuYXV0aFR5cGVdO1xuICAgICAgICAgICAgaWYgKHNvY2lhbFVybCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHNlbGYuX3NvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F1dGggdHlwZTogJyArIHByb3AuYXV0aFR5cGUgKyAnIGRvZXNuXFwndCBleGlzdCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnbG9naW4tcGFzcycpIHtcbiAgICAgICAgICAgIHNlbGYuX2FwaS5sb2dpblBhc3NBdXRoKHByb3AubG9naW4sIHByb3AucGFzcywgcHJvcC5yZW1lbWJlck1lLCBzZWxmLl9vcHRpb25zLnJlZGlyZWN0VXJsLCBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlcy5sb2dpbl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpbmlzaEF1dGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlcy5sb2dpbl91cmw7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzKHtzdGF0dXM6ICdzdWNjZXNzJywgZmluaXNoOiBmaW5pc2hBdXRoLCByZWRpcmVjdFVybDogcmVzLmxvZ2luX3VybH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmluaXNoQXV0aCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3Ioc2VsZi5jcmVhdGVFcnJvck9iamVjdCgnTG9naW4gb3IgcGFzcyBub3QgdmFsaWQnLCBYTC5JTkNPUlJFQ1RfTE9HSU5fT1JfUEFTU1dPUkRfRVJST1JfQ09ERSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBlcnJvcihlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnc21zJykge1xuICAgICAgICAgICAgaWYgKHNtc0F1dGhTdGVwID09ICdwaG9uZScpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9hcGkuc21zQXV0aChwcm9wLnBob25lTnVtYmVyLCBudWxsLCBudWxsKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc21zQXV0aFN0ZXAgPT0gJ2NvZGUnKSB7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5rbm93biBhdXRoIHR5cGUnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblhMLnByb3RvdHlwZS5zZW5kU21zID0gZnVuY3Rpb24gKG51bWJlciwgZXJyb3IsIHN1Y2Nlc3MpIHtcblxufTtcblxuXG5YTC5wcm90b3R5cGUuZ2V0QWxsRWxlbWVudHNXaXRoQXR0cmlidXRlID0gZnVuY3Rpb24gKGF0dHJpYnV0ZSkge1xuICAgIHZhciBtYXRjaGluZ0VsZW1lbnRzID0gW107XG4gICAgdmFyIGFsbEVsZW1lbnRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJyonKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IGFsbEVsZW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICB7XG4gICAgICAgIGlmIChhbGxFbGVtZW50c1tpXS5nZXRBdHRyaWJ1dGUoYXR0cmlidXRlKSAhPT0gbnVsbClcbiAgICAgICAge1xuICAgICAgICAgICAgbWF0Y2hpbmdFbGVtZW50cy5wdXNoKGFsbEVsZW1lbnRzW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF0Y2hpbmdFbGVtZW50cztcbn07XG5cblhMLnByb3RvdHlwZS5jcmVhdGVFcnJvck9iamVjdCA9IGZ1bmN0aW9uKG1lc3NhZ2UsIGNvZGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICAgIGNvZGU6IGNvZGUgfHwgLTFcbiAgICAgICAgfVxuICAgIH07XG59O1xuXG5YTC5pbml0ID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgIGlmICghd2luZG93Ll9feGwpIHtcbiAgICAgICAgdmFyIHhsID0gbmV3IFhMKHBhcmFtcyk7XG4gICAgICAgIHdpbmRvdy5fX3hsID0geGw7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignWEwgYWxyZWFkeSBpbml0IScpO1xuICAgIH1cbn07XG5cblhMLmxvZ2luID0gZnVuY3Rpb24gKHByb3AsIGVycm9yLCBzdWNjZXNzKSB7XG4gICAgaWYgKHdpbmRvdy5fX3hsKSB7XG4gICAgICAgIHdpbmRvdy5fX3hsLmxvZ2luKHByb3AsIGVycm9yLCBzdWNjZXNzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdQbGVhc2UgcnVuIFhMLmluaXQoKSBmaXJzdCcpO1xuICAgIH1cbn07XG5cblhMLkF1dGhXaWRnZXQgPSBmdW5jdGlvbiAoZGl2TmFtZSwgb3B0aW9ucykge1xuICAgIGlmICghZGl2TmFtZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdObyBkaXYgbmFtZSEnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaHRtbCA9ICc8aWZyYW1lPjwvaWZyYW1lPic7XG4gICAgICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZGl2TmFtZSk7XG4gICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkaXZOYW1lKS5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRWxlbWVudCBcXFwiJyArIGRpdk5hbWUgKydcXFwiIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblhMLkF1dGhCdXR0b24gPSBmdW5jdGlvbiAoZGl2TmFtZSwgb3B0aW9ucykge1xuXG59O1xuXG5YTC5JTlZBTElEX0xPR0lOX0VSUk9SX0NPREUgPSAxO1xuWEwuSU5DT1JSRUNUX0xPR0lOX09SX1BBU1NXT1JEX0VSUk9SX0NPREUgPSAyO1xuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBYTDtcblxuXG4iXX0=
