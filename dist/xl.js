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
    this.baseUrl = 'https://login.xsolla.com/';
    this.projectId = projectId;

    this.makeApiCall = function (params, success, error) {
        var r = new XMLHttpRequest();
        r.open(params.method, self.baseUrl + params.endpoint, true);
        r.onreadystatechange = function () {
            if (r.readyState != 4 || r.status != 200)
            {
                error('error');
                return;
            }
            success(r.responseText);
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
    return this.makeApiCall({method: 'GET', endpoint: 'socials', getArguments: ''}, success, error);
};

XLApi.prototype.loginPassAuth = function (login, pass, success, error) {
    return this.makeApiCall({method: 'GET', endpoint: 'loginpass', getArguments: 'login=' + login + '&pass=' + pass}, success, error);
};

module.exports = XLApi;

},{}],"main":[function(require,module,exports){
/**
 * Created by a.korotaev on 24.06.16.
 */

var XLApi = require('xlapi.js');
/**
 * Create an `Auth0` instance with `options`
 *
 * @class XL
 * @constructor
 */
function XL (options) {
    var self = this;
    // XXX Deprecated: We prefer new Auth0(...)
    if (!(this instanceof XL)) {
        return new XL(options);
    }

    self._api = new XLApi(123);
    self._api.getSocialsURLs(function (e) {
        self._socialUrls = value;
    }, function (e) {
        console.log(e);
    });

    self._socialUrls = {'sn-facebook': 'https://facebook.com'};
}

XL.prototype.login = function (prop, callback) {
    var self = this;

    if (!prop) {
        return;
    }

    /**
     * props
     * authType: sn-<social name>, login-pass, sms
     */
    if (prop.authType) {
        if (prop.authType.startsWith('sn-')) {
            window.open(self._socialUrls[prop.authType]);
        } else if (prop.authType == 'login-pass') {
            self._api.loginPassAuth(prop.login, prop.pass, null, null);
        } else if (prop.authType == 'sms') {
            
        } else {
            console.error('Unknown auth type');
        }
    }
};




module.exports = XL;
},{"xlapi.js":1}]},{},["main"])("main")
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMveGxhcGkuanMiLCJzcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuLyoqXG4gKiBJbXBlbGVtZW50cyBYc29sbGEgTG9naW4gQXBpXG4gKiBAcGFyYW0gcHJvamVjdElkIC0gcHJvamVjdCdzIHVuaXF1ZSBpZGVudGlmaWVyXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIFhMQXBpID0gZnVuY3Rpb24gKHByb2plY3RJZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmJhc2VVcmwgPSAnaHR0cHM6Ly9sb2dpbi54c29sbGEuY29tLyc7XG4gICAgdGhpcy5wcm9qZWN0SWQgPSBwcm9qZWN0SWQ7XG5cbiAgICB0aGlzLm1ha2VBcGlDYWxsID0gZnVuY3Rpb24gKHBhcmFtcywgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgdmFyIHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgci5vcGVuKHBhcmFtcy5tZXRob2QsIHNlbGYuYmFzZVVybCArIHBhcmFtcy5lbmRwb2ludCwgdHJ1ZSk7XG4gICAgICAgIHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHIucmVhZHlTdGF0ZSAhPSA0IHx8IHIuc3RhdHVzICE9IDIwMClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlcnJvcignZXJyb3InKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdWNjZXNzKHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgfTtcbiAgICAgICAgci5zZW5kKHBhcmFtcy5nZXRBcmd1bWVudHMpO1xuICAgIH07XG59O1xuLyoqXG4gKiBHZXQgYWxsIGF2aWFsYWJsZSBzb2NpYWwgbWV0aG9kcyBhdXRoIHVybFxuICogQHBhcmFtIHN1Y2Nlc3MgLSBzdWNjZXNzIGNhbGxiYWNrXG4gKiBAcGFyYW0gZXJyb3IgLSBlcnJvciBjYWxsYmFja1xuICovXG5YTEFwaS5wcm90b3R5cGUuZ2V0U29jaWFsc1VSTHMgPSBmdW5jdGlvbiAoc3VjY2VzcywgZXJyb3IpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzb2NpYWxzJywgZ2V0QXJndW1lbnRzOiAnJ30sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cblhMQXBpLnByb3RvdHlwZS5sb2dpblBhc3NBdXRoID0gZnVuY3Rpb24gKGxvZ2luLCBwYXNzLCBzdWNjZXNzLCBlcnJvcikge1xuICAgIHJldHVybiB0aGlzLm1ha2VBcGlDYWxsKHttZXRob2Q6ICdHRVQnLCBlbmRwb2ludDogJ2xvZ2lucGFzcycsIGdldEFyZ3VtZW50czogJ2xvZ2luPScgKyBsb2dpbiArICcmcGFzcz0nICsgcGFzc30sIHN1Y2Nlc3MsIGVycm9yKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gWExBcGk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgYS5rb3JvdGFldiBvbiAyNC4wNi4xNi5cbiAqL1xuXG52YXIgWExBcGkgPSByZXF1aXJlKCd4bGFwaS5qcycpO1xuLyoqXG4gKiBDcmVhdGUgYW4gYEF1dGgwYCBpbnN0YW5jZSB3aXRoIGBvcHRpb25zYFxuICpcbiAqIEBjbGFzcyBYTFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFhMIChvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIFhYWCBEZXByZWNhdGVkOiBXZSBwcmVmZXIgbmV3IEF1dGgwKC4uLilcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgWEwpKSB7XG4gICAgICAgIHJldHVybiBuZXcgWEwob3B0aW9ucyk7XG4gICAgfVxuXG4gICAgc2VsZi5fYXBpID0gbmV3IFhMQXBpKDEyMyk7XG4gICAgc2VsZi5fYXBpLmdldFNvY2lhbHNVUkxzKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNlbGYuX3NvY2lhbFVybHMgPSB2YWx1ZTtcbiAgICB9LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICB9KTtcblxuICAgIHNlbGYuX3NvY2lhbFVybHMgPSB7J3NuLWZhY2Vib29rJzogJ2h0dHBzOi8vZmFjZWJvb2suY29tJ307XG59XG5cblhMLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uIChwcm9wLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICghcHJvcCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcHJvcHNcbiAgICAgKiBhdXRoVHlwZTogc24tPHNvY2lhbCBuYW1lPiwgbG9naW4tcGFzcywgc21zXG4gICAgICovXG4gICAgaWYgKHByb3AuYXV0aFR5cGUpIHtcbiAgICAgICAgaWYgKHByb3AuYXV0aFR5cGUuc3RhcnRzV2l0aCgnc24tJykpIHtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKHNlbGYuX3NvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ2xvZ2luLXBhc3MnKSB7XG4gICAgICAgICAgICBzZWxmLl9hcGkubG9naW5QYXNzQXV0aChwcm9wLmxvZ2luLCBwcm9wLnBhc3MsIG51bGwsIG51bGwpO1xuICAgICAgICB9IGVsc2UgaWYgKHByb3AuYXV0aFR5cGUgPT0gJ3NtcycpIHtcbiAgICAgICAgICAgIFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5rbm93biBhdXRoIHR5cGUnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gWEw7Il19
