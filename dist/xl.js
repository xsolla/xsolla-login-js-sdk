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
            self._api.loginPassAuth(prop.login, prop.pass, prop.rememberMe, function (res) {
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQ3JlYXRlZCBieSBhLmtvcm90YWV2IG9uIDI0LjA2LjE2LlxuICovXG4vKipcbiAqIEltcGVsZW1lbnRzIFhzb2xsYSBMb2dpbiBBcGlcbiAqIEBwYXJhbSBwcm9qZWN0SWQgLSBwcm9qZWN0J3MgdW5pcXVlIGlkZW50aWZpZXJcbiAqIEBwYXJhbSBiYXNlVXJsIC0gYXBpIGVuZHBvaW50XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuXG52YXIgWExBcGkgPSBmdW5jdGlvbiAocHJvamVjdElkLCBiYXNlVXJsKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuYmFzZVVybCA9IGJhc2VVcmwgfHwgJy8vbG9naW4ueHNvbGxhLmNvbS9hcGkvJztcblxuICAgIHRoaXMucHJvamVjdElkID0gcHJvamVjdElkO1xuXG4gICAgdGhpcy5tYWtlQXBpQ2FsbCA9IGZ1bmN0aW9uIChwYXJhbXMsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgICAgIHZhciByID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICAgICAgci5vcGVuKHBhcmFtcy5tZXRob2QsIHNlbGYuYmFzZVVybCArIHBhcmFtcy5lbmRwb2ludCwgdHJ1ZSk7XG4gICAgICAgIHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHIucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzKEpTT04ucGFyc2Uoci5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoci5yZXNwb25zZVRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKEpTT04ucGFyc2Uoci5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKHtlcnJvcjoge21lc3NhZ2U6ICdOZXR3b3JraW5nIGVycm9yJywgY29kZTogci5zdGF0dXN9fSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGlmIChwYXJhbXMubWV0aG9kID09ICdQT1NUJykge1xuICAgICAgICAgICAgci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04XCIpO1xuICAgICAgICAgICAgci5zZW5kKHBhcmFtcy5wb3N0Qm9keSk7XG4gICAgICAgIH0gZWxzZSBpZiAocGFyYW1zLm1ldGhvZCA9PSAnR0VUJykge1xuICAgICAgICAgICAgci5zZW5kKHBhcmFtcy5nZXRBcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgfTtcbn07XG4vKipcbiAqIEdldCBhbGwgYXZpYWxhYmxlIHNvY2lhbCBtZXRob2RzIGF1dGggdXJsXG4gKiBAcGFyYW0gc3VjY2VzcyAtIHN1Y2Nlc3MgY2FsbGJhY2tcbiAqIEBwYXJhbSBlcnJvciAtIGVycm9yIGNhbGxiYWNrXG4gKiBAcGFyYW0gZ2V0QXJndW1lbnRzIC0gYWRkaXRpb25hbCBwYXJhbXMgdG8gc2VuZCB3aXRoIHJlcXVlc3RcbiAqL1xuWExBcGkucHJvdG90eXBlLmdldFNvY2lhbHNVUkxzID0gZnVuY3Rpb24gKHN1Y2Nlc3MsIGVycm9yLCBnZXRBcmd1bWVudHMpIHtcbiAgICB2YXIgc3RyID0gXCJcIjtcbiAgICBmb3IgKHZhciBrZXkgaW4gZ2V0QXJndW1lbnRzKSB7XG4gICAgICAgIGlmIChzdHIgIT0gXCJcIikge1xuICAgICAgICAgICAgc3RyICs9IFwiJlwiO1xuICAgICAgICB9XG4gICAgICAgIHN0ciArPSBrZXkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChnZXRBcmd1bWVudHNba2V5XSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ0dFVCcsIGVuZHBvaW50OiAnc29jaWFsL2xvZ2luX3VybHM/JyArIHN0ciwgZ2V0QXJndW1lbnRzOiBudWxsfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxuWExBcGkucHJvdG90eXBlLmxvZ2luUGFzc0F1dGggPSBmdW5jdGlvbiAobG9naW4sIHBhc3MsIHJlbWVtYmVyTWUsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgdmFyIGJvZHkgPSB7XG4gICAgICAgIHVzZXJuYW1lOiBsb2dpbixcbiAgICAgICAgcGFzc3dvcmQ6IHBhc3MsXG4gICAgICAgIHJlbWVtYmVyX21lOiByZW1lbWJlck1lXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnUE9TVCcsIGVuZHBvaW50OiAncHJveHkvbG9naW4/cHJvamVjdElkPScrdGhpcy5wcm9qZWN0SWQsIHBvc3RCb2R5OiBKU09OLnN0cmluZ2lmeShib2R5KX0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cblhMQXBpLnByb3RvdHlwZS5zbXNBdXRoID0gZnVuY3Rpb24gKHBob25lTnVtYmVyLCBzdWNjZXNzLCBlcnJvcikge1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ3NtcycsIGdldEFyZ3VtZW50czogJ3Bob25lTnVtYmVyPScgKyBwaG9uZU51bWJlcn0sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gWExBcGk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuXG52YXIgWExBcGkgPSByZXF1aXJlKCcuL3hsYXBpJyk7XG4vKipcbiAqIENyZWF0ZSBhbiBgQXV0aDBgIGluc3RhbmNlIHdpdGggYG9wdGlvbnNgXG4gKlxuICogQGNsYXNzIFhMXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gWEwgKG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBzZWxmLl9zb2NpYWxVcmxzID0ge307XG5cbiAgICBzZWxmLl9vcHRpb25zID0ge307XG4gICAgc2VsZi5fb3B0aW9ucy5lcnJvckhhbmRsZXIgPSBvcHRpb25zLmVycm9ySGFuZGxlciB8fCBmdW5jdGlvbihhKSB7fTtcbiAgICBzZWxmLl9vcHRpb25zLmxvZ2luUGFzc1ZhbGlkYXRvciA9IG9wdGlvbnMubG9naW5QYXNzVmFsaWRhdG9yIHx8IGZ1bmN0aW9uIChhLGIpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgc2VsZi5fb3B0aW9ucy5pc01hcmt1cFNvY2lhbHNIYW5kbGVyc0VuYWJsZWQgPSBvcHRpb25zLmlzTWFya3VwU29jaWFsc0hhbmRsZXJzRW5hYmxlZCB8fCBmYWxzZTtcbiAgICBzZWxmLl9vcHRpb25zLnJlZGlyZWN0VXJsID0gb3B0aW9ucy5yZWRpcmVjdFVybCB8fCB1bmRlZmluZWQ7XG4gICAgc2VsZi5fb3B0aW9ucy5hcGlVcmwgPSBvcHRpb25zLmFwaVVybCB8fCAnLy9sb2dpbi54c29sbGEuY29tL2FwaS8nO1xuICAgIHNlbGYuX29wdGlvbnMubWF4WExDbGlja0RlcHRoID0gb3B0aW9ucy5tYXhYTENsaWNrRGVwdGggfHwgMjA7XG5cbiAgICB2YXIgcGFyYW1zID0ge307XG4gICAgcGFyYW1zLnByb2plY3RJZCA9IG9wdGlvbnMucHJvamVjdElkO1xuXG4gICAgaWYgKHNlbGYuX29wdGlvbnMucmVkaXJlY3RVcmwpIHtcbiAgICAgICAgcGFyYW1zLnJlZGlyZWN0X3VybCA9IHNlbGYuX29wdGlvbnMucmVkaXJlY3RVcmw7XG4gICAgfVxuXG4gICAgc2VsZi5fYXBpID0gbmV3IFhMQXBpKG9wdGlvbnMucHJvamVjdElkLCBzZWxmLl9vcHRpb25zLmFwaVVybCk7XG5cblxuICAgdmFyIHVwZGF0ZVNvY2lhbExpbmtzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLl9hcGkuZ2V0U29jaWFsc1VSTHMoZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBzZWxmLl9zb2NpYWxVcmxzID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9zb2NpYWxVcmxzWydzbi0nICsga2V5XSA9IHJlc3BvbnNlW2tleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgfSwgcGFyYW1zKTtcbiAgICB9O1xuXG5cbiAgICAvL1VwZGF0ZSBhdXRoIGxpbmtzIGV2ZXJ5IGhvdXJcbiAgICB1cGRhdGVTb2NpYWxMaW5rcygpO1xuICAgIHNldEludGVydmFsKHVwZGF0ZVNvY2lhbExpbmtzLCAxMDAwKjYwKjU5KTtcblxuICAgIHZhciBlbGVtZW50cyA9IHNlbGYuZ2V0QWxsRWxlbWVudHNXaXRoQXR0cmlidXRlKCdkYXRhLXhsLWF1dGgnKTtcbiAgICB2YXIgbG9naW4gPSAnJztcbiAgICB2YXIgcGFzcyA9ICcnO1xuXG4gICAgLy8gRmluZCBjbG9zZXN0IGFuY2VzdG9yIHdpdGggZGF0YS14bC1hdXRoIGF0dHJpYnV0ZVxuICAgIGZ1bmN0aW9uIGZpbmRBbmNlc3RvcihlbCkge1xuICAgICAgICBpZiAoZWwuYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ10pIHtcbiAgICAgICAgICAgIHJldHVybiBlbDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHdoaWxlICgoZWwgPSBlbC5wYXJlbnRFbGVtZW50KSAmJiAhZWwuYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ10gJiYgKytpIDwgc2VsZi5fb3B0aW9ucy5tYXhYTENsaWNrRGVwdGgpO1xuICAgICAgICByZXR1cm4gZWw7XG4gICAgfVxuXG4gICAgaWYgKHNlbGYuX29wdGlvbnMuaXNNYXJrdXBTb2NpYWxzSGFuZGxlcnNFbmFibGVkKSB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSBmaW5kQW5jZXN0b3IoZS50YXJnZXQpO1xuICAgICAgICAgICAgLy8gRG8gbm90aGluZyBpZiBjbGljayB3YXMgb3V0c2lkZSBvZiBlbGVtZW50cyB3aXRoIGRhdGEteGwtYXV0aFxuICAgICAgICAgICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgeGxEYXRhID0gdGFyZ2V0LmF0dHJpYnV0ZXNbJ2RhdGEteGwtYXV0aCddO1xuICAgICAgICAgICAgaWYgKHhsRGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBub2RlVmFsdWUgPSB4bERhdGEubm9kZVZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChub2RlVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2dpbih7YXV0aFR5cGU6IG5vZGVWYWx1ZX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufVxuLyoqXG4gKiBQZXJmb3JtcyBsb2dpblxuICogQHBhcmFtIHByb3BcbiAqIEBwYXJhbSBlcnJvciAtIGNhbGwgaW4gY2FzZSBlcnJvclxuICogQHBhcmFtIHN1Y2Nlc3NcbiAqL1xuWEwucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24gKHByb3AsIGVycm9yLCBzdWNjZXNzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKCFwcm9wIHx8ICFzZWxmLl9zb2NpYWxVcmxzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBwcm9wc1xuICAgICAqIGF1dGhUeXBlOiBzbi08c29jaWFsIG5hbWU+LCBsb2dpbi1wYXNzLCBzbXNcbiAgICAgKi9cbiAgICBpZiAocHJvcC5hdXRoVHlwZSkge1xuICAgICAgICBpZiAocHJvcC5hdXRoVHlwZS5zdGFydHNXaXRoKCdzbi0nKSkge1xuICAgICAgICAgICAgdmFyIHNvY2lhbFVybCA9IHNlbGYuX3NvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICBpZiAoc29jaWFsVXJsICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gc2VsZi5fc29jaWFsVXJsc1twcm9wLmF1dGhUeXBlXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQXV0aCB0eXBlOiAnICsgcHJvcC5hdXRoVHlwZSArICcgZG9lc25cXCd0IGV4aXN0Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmIChwcm9wLmF1dGhUeXBlID09ICdsb2dpbi1wYXNzJykge1xuICAgICAgICAgICAgc2VsZi5fYXBpLmxvZ2luUGFzc0F1dGgocHJvcC5sb2dpbiwgcHJvcC5wYXNzLCBwcm9wLnJlbWVtYmVyTWUsIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzLmxvZ2luX3VybCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZmluaXNoQXV0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVzLmxvZ2luX3VybDtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3Moe3N0YXR1czogJ3N1Y2Nlc3MnLCBmaW5pc2g6IGZpbmlzaEF1dGgsIHJlZGlyZWN0VXJsOiByZXMubG9naW5fdXJsfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaW5pc2hBdXRoKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihzZWxmLmNyZWF0ZUVycm9yT2JqZWN0KCdMb2dpbiBvciBwYXNzIG5vdCB2YWxpZCcsIFhMLklOQ09SUkVDVF9MT0dJTl9PUl9QQVNTV09SRF9FUlJPUl9DT0RFKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGVycm9yKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmIChwcm9wLmF1dGhUeXBlID09ICdzbXMnKSB7XG4gICAgICAgICAgICBpZiAoc21zQXV0aFN0ZXAgPT0gJ3Bob25lJykge1xuICAgICAgICAgICAgICAgIHNlbGYuX2FwaS5zbXNBdXRoKHByb3AucGhvbmVOdW1iZXIsIG51bGwsIG51bGwpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzbXNBdXRoU3RlcCA9PSAnY29kZScpIHtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmtub3duIGF1dGggdHlwZScpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuWEwucHJvdG90eXBlLnNlbmRTbXMgPSBmdW5jdGlvbiAobnVtYmVyLCBlcnJvciwgc3VjY2Vzcykge1xuXG59O1xuXG5cblhMLnByb3RvdHlwZS5nZXRBbGxFbGVtZW50c1dpdGhBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoYXR0cmlidXRlKSB7XG4gICAgdmFyIG1hdGNoaW5nRWxlbWVudHMgPSBbXTtcbiAgICB2YXIgYWxsRWxlbWVudHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnKicpO1xuICAgIGZvciAodmFyIGkgPSAwLCBuID0gYWxsRWxlbWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxuICAgIHtcbiAgICAgICAgaWYgKGFsbEVsZW1lbnRzW2ldLmdldEF0dHJpYnV0ZShhdHRyaWJ1dGUpICE9PSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBtYXRjaGluZ0VsZW1lbnRzLnB1c2goYWxsRWxlbWVudHNbaV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXRjaGluZ0VsZW1lbnRzO1xufTtcblxuWEwucHJvdG90eXBlLmNyZWF0ZUVycm9yT2JqZWN0ID0gZnVuY3Rpb24obWVzc2FnZSwgY29kZSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgY29kZTogY29kZSB8fCAtMVxuICAgICAgICB9XG4gICAgfTtcbn07XG5cblhMLmluaXQgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgaWYgKCF3aW5kb3cuX194bCkge1xuICAgICAgICB2YXIgeGwgPSBuZXcgWEwocGFyYW1zKTtcbiAgICAgICAgd2luZG93Ll9feGwgPSB4bDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdYTCBhbHJlYWR5IGluaXQhJyk7XG4gICAgfVxufTtcblxuWEwubG9naW4gPSBmdW5jdGlvbiAocHJvcCwgY2FsbGJhY2spIHtcbiAgICBpZiAod2luZG93Ll9feGwpIHtcbiAgICAgICAgd2luZG93Ll9feGwubG9naW4ocHJvcCwgY2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1BsZWFzZSBydW4gWEwuaW5pdCgpIGZpcnN0Jyk7XG4gICAgfVxufTtcblxuWEwuQXV0aFdpZGdldCA9IGZ1bmN0aW9uIChkaXZOYW1lLCBvcHRpb25zKSB7XG4gICAgaWYgKCFkaXZOYW1lKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ05vIGRpdiBuYW1lIScpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBodG1sID0gJzxpZnJhbWU+PC9pZnJhbWU+JztcbiAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkaXZOYW1lKTtcbiAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGRpdk5hbWUpLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFbGVtZW50IFxcXCInICsgZGl2TmFtZSArJ1xcXCIgbm90IGZvdW5kIScpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuWEwuQXV0aEJ1dHRvbiA9IGZ1bmN0aW9uIChkaXZOYW1lLCBvcHRpb25zKSB7XG5cbn07XG5cblhMLklOVkFMSURfTE9HSU5fRVJST1JfQ09ERSA9IDE7XG5YTC5JTkNPUlJFQ1RfTE9HSU5fT1JfUEFTU1dPUkRfRVJST1JfQ09ERSA9IDI7XG5cbm1vZHVsZS5leHBvcnRzID0gWEw7Il19
