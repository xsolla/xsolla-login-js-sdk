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
    self._options.errorHandler = options.errorHandler || function (a) {
        };
    self._options.loginPassValidator = options.loginPassValidator || function (a, b) {
            return true;
        };
    self._options.isMarkupSocialsHandlersEnabled = options.isMarkupSocialsHandlersEnabled || false;
    self._options.redirectUrl = options.redirectUrl || undefined;
    self._options.apiUrl = options.apiUrl || '//login.xsolla.com/api/';
    self._options.maxXLClickDepth = options.maxXLClickDepth || 20;
    self._options.onlyWidgets = options.onlyWidgets || false;
    self._options.projectId = options.projectId;
    self._options.locale = options.locale || undefined;
    self._options.fields = options.fields || undefined;
    self._options.preloader = options.preloader || '<div></div>';

    var params = {};
    params.projectId = options.projectId;

    if (self._options.redirectUrl) {
        params.redirect_url = self._options.redirectUrl;
    }

    self._api = new XLApi(options.projectId, self._options.apiUrl);

    if (!self._options.onlyWidgets) {

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
        setInterval(updateSocialLinks, 1000 * 60 * 59);

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

XL.getProjectId = function() {
    return window.__xl._options.projectId;
};

XL.getRedirectURL = function () {
    return window.__xl._options.redirectUrl;
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

XL.AuthWidget = function (elementId, options) {
    if (window.__xl) {
        if (!elementId) {
            console.error('No div name!');
        } else {
            if (options==undefined) {
                options = {};
            }
            var width = options.width || 400 + 'px';
            var height = options.height || 550 + 'px';

            var widgetBaseUrl = options.widgetBaseUrl || 'https://xl-widget.xsolla.com/';

            // var styleString = 'boreder:none';
            var src = widgetBaseUrl + '?projectId=' + XL.getProjectId();

            if (window.__xl._options.locale) {
                src = src + '&locale=' + window.__xl._options.locale;
            }
            if (window.__xl._options.fields) {
                src = src + '&fields=' + window.__xl._options.fields;
            }
            var redirectUrl = XL.getRedirectURL();
            if (redirectUrl) {
                src = src + '&redirectUrl='+encodeURIComponent(redirectUrl);
            }

            // var widgetHtml = '<iframe frameborder="0" width="'+width+'" height="'+height+'"  src="'+src+'">Not supported</iframe>';
            var widgetIframe = document.createElement('iframe');
            widgetIframe.onload = function () {
                element.removeChild(preloader);
                widgetIframe.style.width = '100%';
                widgetIframe.style.height = '100%';
            };
            widgetIframe.style.width = 0;
            widgetIframe.style.height = 0;
            widgetIframe.frameBorder = '0';
            widgetIframe.src = src;


            var preloader = document.createElement('div');

            preloader.innerHTML = window.__xl._options.preloader;

            var element = document.getElementById(elementId);
            if (element) {
                element.style.width = width;
                element.style.height = height;
                element.appendChild(preloader);
                element.appendChild(widgetIframe);
            } else {
                console.error('Element \"' + elementId +'\" not found!');
            }

            // var socket = new easyXDM.Socket({
            //     remote: src, // the path to the provider,
            //     container: element,
            //     onMessage:function(message, origin) {
            //         //do something with message
            //     }
            // });
        }
    } else {
        console.error('Please run XL.init() first');
    }
};

XL.AuthButton = function (divName, options) {

};

XL.INVALID_LOGIN_ERROR_CODE = 1;
XL.INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE = 2;

module.exports = XL;
},{"./xlapi":1}]},{},["main"])("main")
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbi8qKlxuICogSW1wZWxlbWVudHMgWHNvbGxhIExvZ2luIEFwaVxuICogQHBhcmFtIHByb2plY3RJZCAtIHByb2plY3QncyB1bmlxdWUgaWRlbnRpZmllclxuICogQHBhcmFtIGJhc2VVcmwgLSBhcGkgZW5kcG9pbnRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5cbnZhciBYTEFwaSA9IGZ1bmN0aW9uIChwcm9qZWN0SWQsIGJhc2VVcmwpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5iYXNlVXJsID0gYmFzZVVybCB8fCAnLy9sb2dpbi54c29sbGEuY29tL2FwaS8nO1xuXG4gICAgdGhpcy5wcm9qZWN0SWQgPSBwcm9qZWN0SWQ7XG5cbiAgICB0aGlzLm1ha2VBcGlDYWxsID0gZnVuY3Rpb24gKHBhcmFtcywgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgdmFyIHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuICAgICAgICByLm9wZW4ocGFyYW1zLm1ldGhvZCwgc2VsZi5iYXNlVXJsICsgcGFyYW1zLmVuZHBvaW50LCB0cnVlKTtcbiAgICAgICAgci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoci5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgICAgICAgICBpZiAoci5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3MoSlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyLnJlc3BvbnNlVGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IoSlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3Ioe2Vycm9yOiB7bWVzc2FnZTogJ05ldHdvcmtpbmcgZXJyb3InLCBjb2RlOiByLnN0YXR1c319KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHBhcmFtcy5tZXRob2QgPT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICByLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLThcIik7XG4gICAgICAgICAgICByLnNlbmQocGFyYW1zLnBvc3RCb2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMubWV0aG9kID09ICdHRVQnKSB7XG4gICAgICAgICAgICByLnNlbmQocGFyYW1zLmdldEFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcbi8qKlxuICogR2V0IGFsbCBhdmlhbGFibGUgc29jaWFsIG1ldGhvZHMgYXV0aCB1cmxcbiAqIEBwYXJhbSBzdWNjZXNzIC0gc3VjY2VzcyBjYWxsYmFja1xuICogQHBhcmFtIGVycm9yIC0gZXJyb3IgY2FsbGJhY2tcbiAqIEBwYXJhbSBnZXRBcmd1bWVudHMgLSBhZGRpdGlvbmFsIHBhcmFtcyB0byBzZW5kIHdpdGggcmVxdWVzdFxuICovXG5YTEFwaS5wcm90b3R5cGUuZ2V0U29jaWFsc1VSTHMgPSBmdW5jdGlvbiAoc3VjY2VzcywgZXJyb3IsIGdldEFyZ3VtZW50cykge1xuICAgIHZhciBzdHIgPSBcIlwiO1xuICAgIGZvciAodmFyIGtleSBpbiBnZXRBcmd1bWVudHMpIHtcbiAgICAgICAgaWYgKHN0ciAhPSBcIlwiKSB7XG4gICAgICAgICAgICBzdHIgKz0gXCImXCI7XG4gICAgICAgIH1cbiAgICAgICAgc3RyICs9IGtleSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGdldEFyZ3VtZW50c1trZXldKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzb2NpYWwvbG9naW5fdXJscz8nICsgc3RyLCBnZXRBcmd1bWVudHM6IG51bGx9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUubG9naW5QYXNzQXV0aCA9IGZ1bmN0aW9uIChsb2dpbiwgcGFzcywgcmVtZW1iZXJNZSwgcmVkaXJlY3RVcmwsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgdmFyIGJvZHkgPSB7XG4gICAgICAgIHVzZXJuYW1lOiBsb2dpbixcbiAgICAgICAgcGFzc3dvcmQ6IHBhc3MsXG4gICAgICAgIHJlbWVtYmVyX21lOiByZW1lbWJlck1lXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnUE9TVCcsIGVuZHBvaW50OiAncHJveHkvbG9naW4/cHJvamVjdElkPScrdGhpcy5wcm9qZWN0SWQgKyAnJnJlZGlyZWN0X3VybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHJlZGlyZWN0VXJsKSwgcG9zdEJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHkpfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxuWExBcGkucHJvdG90eXBlLnNtc0F1dGggPSBmdW5jdGlvbiAocGhvbmVOdW1iZXIsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ0dFVCcsIGVuZHBvaW50OiAnc21zJywgZ2V0QXJndW1lbnRzOiAncGhvbmVOdW1iZXI9JyArIHBob25lTnVtYmVyfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBYTEFwaTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBhLmtvcm90YWV2IG9uIDI0LjA2LjE2LlxuICovXG5cbnZhciBYTEFwaSA9IHJlcXVpcmUoJy4veGxhcGknKTtcbi8qKlxuICogQ3JlYXRlIGFuIGBBdXRoMGAgaW5zdGFuY2Ugd2l0aCBgb3B0aW9uc2BcbiAqXG4gKiBAY2xhc3MgWExcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBYTCAob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHNlbGYuX3NvY2lhbFVybHMgPSB7fTtcblxuICAgIHNlbGYuX29wdGlvbnMgPSB7fTtcbiAgICBzZWxmLl9vcHRpb25zLmVycm9ySGFuZGxlciA9IG9wdGlvbnMuZXJyb3JIYW5kbGVyIHx8IGZ1bmN0aW9uIChhKSB7XG4gICAgICAgIH07XG4gICAgc2VsZi5fb3B0aW9ucy5sb2dpblBhc3NWYWxpZGF0b3IgPSBvcHRpb25zLmxvZ2luUGFzc1ZhbGlkYXRvciB8fCBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG4gICAgc2VsZi5fb3B0aW9ucy5pc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQgPSBvcHRpb25zLmlzTWFya3VwU29jaWFsc0hhbmRsZXJzRW5hYmxlZCB8fCBmYWxzZTtcbiAgICBzZWxmLl9vcHRpb25zLnJlZGlyZWN0VXJsID0gb3B0aW9ucy5yZWRpcmVjdFVybCB8fCB1bmRlZmluZWQ7XG4gICAgc2VsZi5fb3B0aW9ucy5hcGlVcmwgPSBvcHRpb25zLmFwaVVybCB8fCAnLy9sb2dpbi54c29sbGEuY29tL2FwaS8nO1xuICAgIHNlbGYuX29wdGlvbnMubWF4WExDbGlja0RlcHRoID0gb3B0aW9ucy5tYXhYTENsaWNrRGVwdGggfHwgMjA7XG4gICAgc2VsZi5fb3B0aW9ucy5vbmx5V2lkZ2V0cyA9IG9wdGlvbnMub25seVdpZGdldHMgfHwgZmFsc2U7XG4gICAgc2VsZi5fb3B0aW9ucy5wcm9qZWN0SWQgPSBvcHRpb25zLnByb2plY3RJZDtcbiAgICBzZWxmLl9vcHRpb25zLmxvY2FsZSA9IG9wdGlvbnMubG9jYWxlIHx8IHVuZGVmaW5lZDtcbiAgICBzZWxmLl9vcHRpb25zLmZpZWxkcyA9IG9wdGlvbnMuZmllbGRzIHx8IHVuZGVmaW5lZDtcbiAgICBzZWxmLl9vcHRpb25zLnByZWxvYWRlciA9IG9wdGlvbnMucHJlbG9hZGVyIHx8ICc8ZGl2PjwvZGl2Pic7XG5cbiAgICB2YXIgcGFyYW1zID0ge307XG4gICAgcGFyYW1zLnByb2plY3RJZCA9IG9wdGlvbnMucHJvamVjdElkO1xuXG4gICAgaWYgKHNlbGYuX29wdGlvbnMucmVkaXJlY3RVcmwpIHtcbiAgICAgICAgcGFyYW1zLnJlZGlyZWN0X3VybCA9IHNlbGYuX29wdGlvbnMucmVkaXJlY3RVcmw7XG4gICAgfVxuXG4gICAgc2VsZi5fYXBpID0gbmV3IFhMQXBpKG9wdGlvbnMucHJvamVjdElkLCBzZWxmLl9vcHRpb25zLmFwaVVybCk7XG5cbiAgICBpZiAoIXNlbGYuX29wdGlvbnMub25seVdpZGdldHMpIHtcblxuICAgICAgICB2YXIgdXBkYXRlU29jaWFsTGlua3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLl9hcGkuZ2V0U29jaWFsc1VSTHMoZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fc29jaWFsVXJscyA9IHt9O1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fc29jaWFsVXJsc1snc24tJyArIGtleV0gPSByZXNwb25zZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgfSwgcGFyYW1zKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvL1VwZGF0ZSBhdXRoIGxpbmtzIGV2ZXJ5IGhvdXJcbiAgICAgICAgdXBkYXRlU29jaWFsTGlua3MoKTtcbiAgICAgICAgc2V0SW50ZXJ2YWwodXBkYXRlU29jaWFsTGlua3MsIDEwMDAgKiA2MCAqIDU5KTtcblxuICAgICAgICB2YXIgZWxlbWVudHMgPSBzZWxmLmdldEFsbEVsZW1lbnRzV2l0aEF0dHJpYnV0ZSgnZGF0YS14bC1hdXRoJyk7XG4gICAgICAgIHZhciBsb2dpbiA9ICcnO1xuICAgICAgICB2YXIgcGFzcyA9ICcnO1xuXG4gICAgICAgIC8vIEZpbmQgY2xvc2VzdCBhbmNlc3RvciB3aXRoIGRhdGEteGwtYXV0aCBhdHRyaWJ1dGVcbiAgICAgICAgZnVuY3Rpb24gZmluZEFuY2VzdG9yKGVsKSB7XG4gICAgICAgICAgICBpZiAoZWwuYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ10pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgICAgICB3aGlsZSAoKGVsID0gZWwucGFyZW50RWxlbWVudCkgJiYgIWVsLmF0dHJpYnV0ZXNbJ2RhdGEteGwtYXV0aCddICYmICsraSA8IHNlbGYuX29wdGlvbnMubWF4WExDbGlja0RlcHRoKTtcbiAgICAgICAgICAgIHJldHVybiBlbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzZWxmLl9vcHRpb25zLmlzTWFya3VwU29jaWFsc0hhbmRsZXJzRW5hYmxlZCkge1xuICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSBmaW5kQW5jZXN0b3IoZS50YXJnZXQpO1xuICAgICAgICAgICAgICAgIC8vIERvIG5vdGhpbmcgaWYgY2xpY2sgd2FzIG91dHNpZGUgb2YgZWxlbWVudHMgd2l0aCBkYXRhLXhsLWF1dGhcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciB4bERhdGEgPSB0YXJnZXQuYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ107XG4gICAgICAgICAgICAgICAgaWYgKHhsRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbm9kZVZhbHVlID0geGxEYXRhLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGVWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2dpbih7YXV0aFR5cGU6IG5vZGVWYWx1ZX0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG59XG4vKipcbiAqIFBlcmZvcm1zIGxvZ2luXG4gKiBAcGFyYW0gcHJvcFxuICogQHBhcmFtIGVycm9yIC0gY2FsbCBpbiBjYXNlIGVycm9yXG4gKiBAcGFyYW0gc3VjY2Vzc1xuICovXG5YTC5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbiAocHJvcCwgZXJyb3IsIHN1Y2Nlc3MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoIXByb3AgfHwgIXNlbGYuX3NvY2lhbFVybHMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHByb3BzXG4gICAgICogYXV0aFR5cGU6IHNuLTxzb2NpYWwgbmFtZT4sIGxvZ2luLXBhc3MsIHNtc1xuICAgICAqL1xuICAgIGlmIChwcm9wLmF1dGhUeXBlKSB7XG4gICAgICAgIGlmIChwcm9wLmF1dGhUeXBlLnN0YXJ0c1dpdGgoJ3NuLScpKSB7XG4gICAgICAgICAgICB2YXIgc29jaWFsVXJsID0gc2VsZi5fc29jaWFsVXJsc1twcm9wLmF1dGhUeXBlXTtcbiAgICAgICAgICAgIGlmIChzb2NpYWxVcmwgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBzZWxmLl9zb2NpYWxVcmxzW3Byb3AuYXV0aFR5cGVdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBdXRoIHR5cGU6ICcgKyBwcm9wLmF1dGhUeXBlICsgJyBkb2VzblxcJ3QgZXhpc3QnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ2xvZ2luLXBhc3MnKSB7XG4gICAgICAgICAgICBzZWxmLl9hcGkubG9naW5QYXNzQXV0aChwcm9wLmxvZ2luLCBwcm9wLnBhc3MsIHByb3AucmVtZW1iZXJNZSwgc2VsZi5fb3B0aW9ucy5yZWRpcmVjdFVybCwgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgIGlmIChyZXMubG9naW5fdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmaW5pc2hBdXRoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXMubG9naW5fdXJsO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzcyh7c3RhdHVzOiAnc3VjY2VzcycsIGZpbmlzaDogZmluaXNoQXV0aCwgcmVkaXJlY3RVcmw6IHJlcy5sb2dpbl91cmx9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbmlzaEF1dGgoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKHNlbGYuY3JlYXRlRXJyb3JPYmplY3QoJ0xvZ2luIG9yIHBhc3Mgbm90IHZhbGlkJywgWEwuSU5DT1JSRUNUX0xPR0lOX09SX1BBU1NXT1JEX0VSUk9SX0NPREUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IoZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ3NtcycpIHtcbiAgICAgICAgICAgIGlmIChzbXNBdXRoU3RlcCA9PSAncGhvbmUnKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fYXBpLnNtc0F1dGgocHJvcC5waG9uZU51bWJlciwgbnVsbCwgbnVsbCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNtc0F1dGhTdGVwID09ICdjb2RlJykge1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gYXV0aCB0eXBlJyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5YTC5wcm90b3R5cGUuc2VuZFNtcyA9IGZ1bmN0aW9uIChudW1iZXIsIGVycm9yLCBzdWNjZXNzKSB7XG5cbn07XG5cblxuWEwucHJvdG90eXBlLmdldEFsbEVsZW1lbnRzV2l0aEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChhdHRyaWJ1dGUpIHtcbiAgICB2YXIgbWF0Y2hpbmdFbGVtZW50cyA9IFtdO1xuICAgIHZhciBhbGxFbGVtZW50cyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCcqJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSBhbGxFbGVtZW50cy5sZW5ndGg7IGkgPCBuOyBpKyspXG4gICAge1xuICAgICAgICBpZiAoYWxsRWxlbWVudHNbaV0uZ2V0QXR0cmlidXRlKGF0dHJpYnV0ZSkgIT09IG51bGwpXG4gICAgICAgIHtcbiAgICAgICAgICAgIG1hdGNoaW5nRWxlbWVudHMucHVzaChhbGxFbGVtZW50c1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1hdGNoaW5nRWxlbWVudHM7XG59O1xuXG5YTC5wcm90b3R5cGUuY3JlYXRlRXJyb3JPYmplY3QgPSBmdW5jdGlvbihtZXNzYWdlLCBjb2RlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgICAgICBjb2RlOiBjb2RlIHx8IC0xXG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuWEwuZ2V0UHJvamVjdElkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHdpbmRvdy5fX3hsLl9vcHRpb25zLnByb2plY3RJZDtcbn07XG5cblhMLmdldFJlZGlyZWN0VVJMID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB3aW5kb3cuX194bC5fb3B0aW9ucy5yZWRpcmVjdFVybDtcbn07XG5cblhMLmluaXQgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgaWYgKCF3aW5kb3cuX194bCkge1xuICAgICAgICB2YXIgeGwgPSBuZXcgWEwocGFyYW1zKTtcbiAgICAgICAgd2luZG93Ll9feGwgPSB4bDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdYTCBhbHJlYWR5IGluaXQhJyk7XG4gICAgfVxufTtcblxuWEwubG9naW4gPSBmdW5jdGlvbiAocHJvcCwgZXJyb3IsIHN1Y2Nlc3MpIHtcbiAgICBpZiAod2luZG93Ll9feGwpIHtcbiAgICAgICAgd2luZG93Ll9feGwubG9naW4ocHJvcCwgZXJyb3IsIHN1Y2Nlc3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1BsZWFzZSBydW4gWEwuaW5pdCgpIGZpcnN0Jyk7XG4gICAgfVxufTtcblxuWEwuQXV0aFdpZGdldCA9IGZ1bmN0aW9uIChlbGVtZW50SWQsIG9wdGlvbnMpIHtcbiAgICBpZiAod2luZG93Ll9feGwpIHtcbiAgICAgICAgaWYgKCFlbGVtZW50SWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ05vIGRpdiBuYW1lIScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnM9PXVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB3aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgNDAwICsgJ3B4JztcbiAgICAgICAgICAgIHZhciBoZWlnaHQgPSBvcHRpb25zLmhlaWdodCB8fCA1NTAgKyAncHgnO1xuXG4gICAgICAgICAgICB2YXIgd2lkZ2V0QmFzZVVybCA9IG9wdGlvbnMud2lkZ2V0QmFzZVVybCB8fCAnaHR0cHM6Ly94bC13aWRnZXQueHNvbGxhLmNvbS8nO1xuXG4gICAgICAgICAgICAvLyB2YXIgc3R5bGVTdHJpbmcgPSAnYm9yZWRlcjpub25lJztcbiAgICAgICAgICAgIHZhciBzcmMgPSB3aWRnZXRCYXNlVXJsICsgJz9wcm9qZWN0SWQ9JyArIFhMLmdldFByb2plY3RJZCgpO1xuXG4gICAgICAgICAgICBpZiAod2luZG93Ll9feGwuX29wdGlvbnMubG9jYWxlKSB7XG4gICAgICAgICAgICAgICAgc3JjID0gc3JjICsgJyZsb2NhbGU9JyArIHdpbmRvdy5fX3hsLl9vcHRpb25zLmxvY2FsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh3aW5kb3cuX194bC5fb3B0aW9ucy5maWVsZHMpIHtcbiAgICAgICAgICAgICAgICBzcmMgPSBzcmMgKyAnJmZpZWxkcz0nICsgd2luZG93Ll9feGwuX29wdGlvbnMuZmllbGRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlZGlyZWN0VXJsID0gWEwuZ2V0UmVkaXJlY3RVUkwoKTtcbiAgICAgICAgICAgIGlmIChyZWRpcmVjdFVybCkge1xuICAgICAgICAgICAgICAgIHNyYyA9IHNyYyArICcmcmVkaXJlY3RVcmw9JytlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmwpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB2YXIgd2lkZ2V0SHRtbCA9ICc8aWZyYW1lIGZyYW1lYm9yZGVyPVwiMFwiIHdpZHRoPVwiJyt3aWR0aCsnXCIgaGVpZ2h0PVwiJytoZWlnaHQrJ1wiICBzcmM9XCInK3NyYysnXCI+Tm90IHN1cHBvcnRlZDwvaWZyYW1lPic7XG4gICAgICAgICAgICB2YXIgd2lkZ2V0SWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2hpbGQocHJlbG9hZGVyKTtcbiAgICAgICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUud2lkdGggPSAwO1xuICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuZnJhbWVCb3JkZXIgPSAnMCc7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3JjID0gc3JjO1xuXG5cbiAgICAgICAgICAgIHZhciBwcmVsb2FkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgICAgICAgICAgcHJlbG9hZGVyLmlubmVySFRNTCA9IHdpbmRvdy5fX3hsLl9vcHRpb25zLnByZWxvYWRlcjtcblxuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtZW50SWQpO1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50LnN0eWxlLndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5zdHlsZS5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZChwcmVsb2FkZXIpO1xuICAgICAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQod2lkZ2V0SWZyYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRWxlbWVudCBcXFwiJyArIGVsZW1lbnRJZCArJ1xcXCIgbm90IGZvdW5kIScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB2YXIgc29ja2V0ID0gbmV3IGVhc3lYRE0uU29ja2V0KHtcbiAgICAgICAgICAgIC8vICAgICByZW1vdGU6IHNyYywgLy8gdGhlIHBhdGggdG8gdGhlIHByb3ZpZGVyLFxuICAgICAgICAgICAgLy8gICAgIGNvbnRhaW5lcjogZWxlbWVudCxcbiAgICAgICAgICAgIC8vICAgICBvbk1lc3NhZ2U6ZnVuY3Rpb24obWVzc2FnZSwgb3JpZ2luKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIC8vZG8gc29tZXRoaW5nIHdpdGggbWVzc2FnZVxuICAgICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAgIC8vIH0pO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignUGxlYXNlIHJ1biBYTC5pbml0KCkgZmlyc3QnKTtcbiAgICB9XG59O1xuXG5YTC5BdXRoQnV0dG9uID0gZnVuY3Rpb24gKGRpdk5hbWUsIG9wdGlvbnMpIHtcblxufTtcblxuWEwuSU5WQUxJRF9MT0dJTl9FUlJPUl9DT0RFID0gMTtcblhMLklOQ09SUkVDVF9MT0dJTl9PUl9QQVNTV09SRF9FUlJPUl9DT0RFID0gMjtcblxubW9kdWxlLmV4cG9ydHMgPSBYTDsiXX0=
