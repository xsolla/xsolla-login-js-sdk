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
    return this.makeApiCall({method: 'POST', endpoint: 'proxy/login?projectId='+this.projectId + '&redirect_url=' + redirectUrl, postBody: JSON.stringify(body)}, success, error);
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
            console.error('Element \"' + divName +'\" not found!');
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQ3JlYXRlZCBieSBhLmtvcm90YWV2IG9uIDI0LjA2LjE2LlxuICovXG4vKipcbiAqIEltcGVsZW1lbnRzIFhzb2xsYSBMb2dpbiBBcGlcbiAqIEBwYXJhbSBwcm9qZWN0SWQgLSBwcm9qZWN0J3MgdW5pcXVlIGlkZW50aWZpZXJcbiAqIEBwYXJhbSBiYXNlVXJsIC0gYXBpIGVuZHBvaW50XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuXG52YXIgWExBcGkgPSBmdW5jdGlvbiAocHJvamVjdElkLCBiYXNlVXJsKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuYmFzZVVybCA9IGJhc2VVcmwgfHwgJy8vbG9naW4ueHNvbGxhLmNvbS9hcGkvJztcblxuICAgIHRoaXMucHJvamVjdElkID0gcHJvamVjdElkO1xuXG4gICAgdGhpcy5tYWtlQXBpQ2FsbCA9IGZ1bmN0aW9uIChwYXJhbXMsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgICAgIHZhciByID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICAgICAgci5vcGVuKHBhcmFtcy5tZXRob2QsIHNlbGYuYmFzZVVybCArIHBhcmFtcy5lbmRwb2ludCwgdHJ1ZSk7XG4gICAgICAgIHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHIucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzKEpTT04ucGFyc2Uoci5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoci5yZXNwb25zZVRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKEpTT04ucGFyc2Uoci5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKHtlcnJvcjoge21lc3NhZ2U6ICdOZXR3b3JraW5nIGVycm9yJywgY29kZTogci5zdGF0dXN9fSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGlmIChwYXJhbXMubWV0aG9kID09ICdQT1NUJykge1xuICAgICAgICAgICAgci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04XCIpO1xuICAgICAgICAgICAgci5zZW5kKHBhcmFtcy5wb3N0Qm9keSk7XG4gICAgICAgIH0gZWxzZSBpZiAocGFyYW1zLm1ldGhvZCA9PSAnR0VUJykge1xuICAgICAgICAgICAgci5zZW5kKHBhcmFtcy5nZXRBcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgfTtcbn07XG4vKipcbiAqIEdldCBhbGwgYXZpYWxhYmxlIHNvY2lhbCBtZXRob2RzIGF1dGggdXJsXG4gKiBAcGFyYW0gc3VjY2VzcyAtIHN1Y2Nlc3MgY2FsbGJhY2tcbiAqIEBwYXJhbSBlcnJvciAtIGVycm9yIGNhbGxiYWNrXG4gKiBAcGFyYW0gZ2V0QXJndW1lbnRzIC0gYWRkaXRpb25hbCBwYXJhbXMgdG8gc2VuZCB3aXRoIHJlcXVlc3RcbiAqL1xuWExBcGkucHJvdG90eXBlLmdldFNvY2lhbHNVUkxzID0gZnVuY3Rpb24gKHN1Y2Nlc3MsIGVycm9yLCBnZXRBcmd1bWVudHMpIHtcbiAgICB2YXIgc3RyID0gXCJcIjtcbiAgICBmb3IgKHZhciBrZXkgaW4gZ2V0QXJndW1lbnRzKSB7XG4gICAgICAgIGlmIChzdHIgIT0gXCJcIikge1xuICAgICAgICAgICAgc3RyICs9IFwiJlwiO1xuICAgICAgICB9XG4gICAgICAgIHN0ciArPSBrZXkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChnZXRBcmd1bWVudHNba2V5XSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ0dFVCcsIGVuZHBvaW50OiAnc29jaWFsL2xvZ2luX3VybHM/JyArIHN0ciwgZ2V0QXJndW1lbnRzOiBudWxsfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxuWExBcGkucHJvdG90eXBlLmxvZ2luUGFzc0F1dGggPSBmdW5jdGlvbiAobG9naW4sIHBhc3MsIHJlbWVtYmVyTWUsIHJlZGlyZWN0VXJsLCBzdWNjZXNzLCBlcnJvcikge1xuICAgIHZhciBib2R5ID0ge1xuICAgICAgICB1c2VybmFtZTogbG9naW4sXG4gICAgICAgIHBhc3N3b3JkOiBwYXNzLFxuICAgICAgICByZW1lbWJlcl9tZTogcmVtZW1iZXJNZVxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ1BPU1QnLCBlbmRwb2ludDogJ3Byb3h5L2xvZ2luP3Byb2plY3RJZD0nK3RoaXMucHJvamVjdElkICsgJyZyZWRpcmVjdF91cmw9JyArIHJlZGlyZWN0VXJsLCBwb3N0Qm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSl9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUuc21zQXV0aCA9IGZ1bmN0aW9uIChwaG9uZU51bWJlciwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzbXMnLCBnZXRBcmd1bWVudHM6ICdwaG9uZU51bWJlcj0nICsgcGhvbmVOdW1iZXJ9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhMQXBpO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cblxudmFyIFhMQXBpID0gcmVxdWlyZSgnLi94bGFwaScpO1xuLyoqXG4gKiBDcmVhdGUgYW4gYEF1dGgwYCBpbnN0YW5jZSB3aXRoIGBvcHRpb25zYFxuICpcbiAqIEBjbGFzcyBYTFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFhMIChvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgc2VsZi5fc29jaWFsVXJscyA9IHt9O1xuXG4gICAgc2VsZi5fb3B0aW9ucyA9IHt9O1xuICAgIHNlbGYuX29wdGlvbnMuZXJyb3JIYW5kbGVyID0gb3B0aW9ucy5lcnJvckhhbmRsZXIgfHwgZnVuY3Rpb24oYSkge307XG4gICAgc2VsZi5fb3B0aW9ucy5sb2dpblBhc3NWYWxpZGF0b3IgPSBvcHRpb25zLmxvZ2luUGFzc1ZhbGlkYXRvciB8fCBmdW5jdGlvbiAoYSxiKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIHNlbGYuX29wdGlvbnMuaXNNYXJrdXBTb2NpYWxzSGFuZGxlcnNFbmFibGVkID0gb3B0aW9ucy5pc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQgfHwgZmFsc2U7XG4gICAgc2VsZi5fb3B0aW9ucy5yZWRpcmVjdFVybCA9IG9wdGlvbnMucmVkaXJlY3RVcmwgfHwgdW5kZWZpbmVkO1xuICAgIHNlbGYuX29wdGlvbnMuYXBpVXJsID0gb3B0aW9ucy5hcGlVcmwgfHwgJy8vbG9naW4ueHNvbGxhLmNvbS9hcGkvJztcbiAgICBzZWxmLl9vcHRpb25zLm1heFhMQ2xpY2tEZXB0aCA9IG9wdGlvbnMubWF4WExDbGlja0RlcHRoIHx8IDIwO1xuXG4gICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgIHBhcmFtcy5wcm9qZWN0SWQgPSBvcHRpb25zLnByb2plY3RJZDtcblxuICAgIGlmIChzZWxmLl9vcHRpb25zLnJlZGlyZWN0VXJsKSB7XG4gICAgICAgIHBhcmFtcy5yZWRpcmVjdF91cmwgPSBzZWxmLl9vcHRpb25zLnJlZGlyZWN0VXJsO1xuICAgIH1cblxuICAgIHNlbGYuX2FwaSA9IG5ldyBYTEFwaShvcHRpb25zLnByb2plY3RJZCwgc2VsZi5fb3B0aW9ucy5hcGlVcmwpO1xuXG5cbiAgIHZhciB1cGRhdGVTb2NpYWxMaW5rcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5fYXBpLmdldFNvY2lhbHNVUkxzKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgc2VsZi5fc29jaWFsVXJscyA9IHt9O1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fc29jaWFsVXJsc1snc24tJyArIGtleV0gPSByZXNwb25zZVtrZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgIH0sIHBhcmFtcyk7XG4gICAgfTtcblxuXG4gICAgLy9VcGRhdGUgYXV0aCBsaW5rcyBldmVyeSBob3VyXG4gICAgdXBkYXRlU29jaWFsTGlua3MoKTtcbiAgICBzZXRJbnRlcnZhbCh1cGRhdGVTb2NpYWxMaW5rcywgMTAwMCo2MCo1OSk7XG5cbiAgICB2YXIgZWxlbWVudHMgPSBzZWxmLmdldEFsbEVsZW1lbnRzV2l0aEF0dHJpYnV0ZSgnZGF0YS14bC1hdXRoJyk7XG4gICAgdmFyIGxvZ2luID0gJyc7XG4gICAgdmFyIHBhc3MgPSAnJztcblxuICAgIC8vIEZpbmQgY2xvc2VzdCBhbmNlc3RvciB3aXRoIGRhdGEteGwtYXV0aCBhdHRyaWJ1dGVcbiAgICBmdW5jdGlvbiBmaW5kQW5jZXN0b3IoZWwpIHtcbiAgICAgICAgaWYgKGVsLmF0dHJpYnV0ZXNbJ2RhdGEteGwtYXV0aCddKSB7XG4gICAgICAgICAgICByZXR1cm4gZWw7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICB3aGlsZSAoKGVsID0gZWwucGFyZW50RWxlbWVudCkgJiYgIWVsLmF0dHJpYnV0ZXNbJ2RhdGEteGwtYXV0aCddICYmICsraSA8IHNlbGYuX29wdGlvbnMubWF4WExDbGlja0RlcHRoKTtcbiAgICAgICAgcmV0dXJuIGVsO1xuICAgIH1cblxuICAgIGlmIChzZWxmLl9vcHRpb25zLmlzTWFya3VwU29jaWFsc0hhbmRsZXJzRW5hYmxlZCkge1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gZmluZEFuY2VzdG9yKGUudGFyZ2V0KTtcbiAgICAgICAgICAgIC8vIERvIG5vdGhpbmcgaWYgY2xpY2sgd2FzIG91dHNpZGUgb2YgZWxlbWVudHMgd2l0aCBkYXRhLXhsLWF1dGhcbiAgICAgICAgICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHhsRGF0YSA9IHRhcmdldC5hdHRyaWJ1dGVzWydkYXRhLXhsLWF1dGgnXTtcbiAgICAgICAgICAgIGlmICh4bERhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZVZhbHVlID0geGxEYXRhLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYubG9naW4oe2F1dGhUeXBlOiBub2RlVmFsdWV9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbi8qKlxuICogUGVyZm9ybXMgbG9naW5cbiAqIEBwYXJhbSBwcm9wXG4gKiBAcGFyYW0gZXJyb3IgLSBjYWxsIGluIGNhc2UgZXJyb3JcbiAqIEBwYXJhbSBzdWNjZXNzXG4gKi9cblhMLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uIChwcm9wLCBlcnJvciwgc3VjY2Vzcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICghcHJvcCB8fCAhc2VsZi5fc29jaWFsVXJscykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcHJvcHNcbiAgICAgKiBhdXRoVHlwZTogc24tPHNvY2lhbCBuYW1lPiwgbG9naW4tcGFzcywgc21zXG4gICAgICovXG4gICAgaWYgKHByb3AuYXV0aFR5cGUpIHtcbiAgICAgICAgaWYgKHByb3AuYXV0aFR5cGUuc3RhcnRzV2l0aCgnc24tJykpIHtcbiAgICAgICAgICAgIHZhciBzb2NpYWxVcmwgPSBzZWxmLl9zb2NpYWxVcmxzW3Byb3AuYXV0aFR5cGVdO1xuICAgICAgICAgICAgaWYgKHNvY2lhbFVybCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHNlbGYuX3NvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F1dGggdHlwZTogJyArIHByb3AuYXV0aFR5cGUgKyAnIGRvZXNuXFwndCBleGlzdCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnbG9naW4tcGFzcycpIHtcbiAgICAgICAgICAgIHNlbGYuX2FwaS5sb2dpblBhc3NBdXRoKHByb3AubG9naW4sIHByb3AucGFzcywgcHJvcC5yZW1lbWJlck1lLCBzZWxmLl9vcHRpb25zLnJlZGlyZWN0VXJsLCBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlcy5sb2dpbl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpbmlzaEF1dGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlcy5sb2dpbl91cmw7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzKHtzdGF0dXM6ICdzdWNjZXNzJywgZmluaXNoOiBmaW5pc2hBdXRoLCByZWRpcmVjdFVybDogcmVzLmxvZ2luX3VybH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmluaXNoQXV0aCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3Ioc2VsZi5jcmVhdGVFcnJvck9iamVjdCgnTG9naW4gb3IgcGFzcyBub3QgdmFsaWQnLCBYTC5JTkNPUlJFQ1RfTE9HSU5fT1JfUEFTU1dPUkRfRVJST1JfQ09ERSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBlcnJvcihlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnc21zJykge1xuICAgICAgICAgICAgaWYgKHNtc0F1dGhTdGVwID09ICdwaG9uZScpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9hcGkuc21zQXV0aChwcm9wLnBob25lTnVtYmVyLCBudWxsLCBudWxsKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc21zQXV0aFN0ZXAgPT0gJ2NvZGUnKSB7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5rbm93biBhdXRoIHR5cGUnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblhMLnByb3RvdHlwZS5zZW5kU21zID0gZnVuY3Rpb24gKG51bWJlciwgZXJyb3IsIHN1Y2Nlc3MpIHtcblxufTtcblxuXG5YTC5wcm90b3R5cGUuZ2V0QWxsRWxlbWVudHNXaXRoQXR0cmlidXRlID0gZnVuY3Rpb24gKGF0dHJpYnV0ZSkge1xuICAgIHZhciBtYXRjaGluZ0VsZW1lbnRzID0gW107XG4gICAgdmFyIGFsbEVsZW1lbnRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJyonKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IGFsbEVsZW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICB7XG4gICAgICAgIGlmIChhbGxFbGVtZW50c1tpXS5nZXRBdHRyaWJ1dGUoYXR0cmlidXRlKSAhPT0gbnVsbClcbiAgICAgICAge1xuICAgICAgICAgICAgbWF0Y2hpbmdFbGVtZW50cy5wdXNoKGFsbEVsZW1lbnRzW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF0Y2hpbmdFbGVtZW50cztcbn07XG5cblhMLnByb3RvdHlwZS5jcmVhdGVFcnJvck9iamVjdCA9IGZ1bmN0aW9uKG1lc3NhZ2UsIGNvZGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICAgIGNvZGU6IGNvZGUgfHwgLTFcbiAgICAgICAgfVxuICAgIH07XG59O1xuXG5YTC5pbml0ID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgIGlmICghd2luZG93Ll9feGwpIHtcbiAgICAgICAgdmFyIHhsID0gbmV3IFhMKHBhcmFtcyk7XG4gICAgICAgIHdpbmRvdy5fX3hsID0geGw7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignWEwgYWxyZWFkeSBpbml0IScpO1xuICAgIH1cbn07XG5cblhMLmxvZ2luID0gZnVuY3Rpb24gKHByb3AsIGNhbGxiYWNrKSB7XG4gICAgaWYgKHdpbmRvdy5fX3hsKSB7XG4gICAgICAgIHdpbmRvdy5fX3hsLmxvZ2luKHByb3AsIGNhbGxiYWNrKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdQbGVhc2UgcnVuIFhMLmluaXQoKSBmaXJzdCcpO1xuICAgIH1cbn07XG5cblhMLkF1dGhXaWRnZXQgPSBmdW5jdGlvbiAoZGl2TmFtZSwgb3B0aW9ucykge1xuICAgIGlmICghZGl2TmFtZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdObyBkaXYgbmFtZSEnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaHRtbCA9ICc8aWZyYW1lPjwvaWZyYW1lPic7XG4gICAgICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZGl2TmFtZSk7XG4gICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkaXZOYW1lKS5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRWxlbWVudCBcXFwiJyArIGRpdk5hbWUgKydcXFwiIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblhMLkF1dGhCdXR0b24gPSBmdW5jdGlvbiAoZGl2TmFtZSwgb3B0aW9ucykge1xuXG59O1xuXG5YTC5JTlZBTElEX0xPR0lOX0VSUk9SX0NPREUgPSAxO1xuWEwuSU5DT1JSRUNUX0xPR0lOX09SX1BBU1NXT1JEX0VSUk9SX0NPREUgPSAyO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhMOyJdfQ==
