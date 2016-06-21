/**
 * Created by a.korotaev on 14.06.16.
 */
(function() {
    var XL =  {};

    var API_PATH = "https://login.xsolla.com/";
    var SOCIALS_BUTTONS = ["facebook", "vk"];

    var socialUrls = {};



    var config = {
        appId: undefined,
        shouldDisplayWidget: false,
        winName: "_blank",
        eventHandlers: {
            loginPass: function (e) {
                e.preventDefault();
                console.log('log/pass');
            },
            sms: function (e) {
                e.preventDefault();
                console.log('sms');
                // Create the event
                var event = new CustomEvent("xl-event", { "event-type": "sms sent" });
                // Dispatch/Trigger/Fire the event
                document.dispatchEvent(event);
            },
            social: function (e) {
                e.preventDefault();
                var nodeValue = e.srcElement.attributes['data-xl-auth'].nodeValue;
                window.open(socialUrls[nodeValue]);
            }
        }
    };

    XL.init = function(conf) {

        if (!conf.projectId) {
            console.error('No projectId');
        }

        //TODO: merge configs

        //Get all elements marked for Xsolla Login
        var elements = getAllElementsWithAttribute('data-xl-auth');

        //Get auth URLs
        // var r = new XMLHttpRequest();
        // r.open("GET", API_PATH, true);
        // r.onreadystatechange = function () {
        //     if (r.readyState != 4 || r.status != 200)
        //     {
        //         return;
        //     }
        //
        //     socialUrls = r.responseText;
        // };
        // r.send("a=1&b=2&c=3");

        var xlApi = new XLApi(conf.projectId);
        xlApi.getSocialsURLs(function (value) {
            socialUrls = value;
        }, function (err) {
            console.log(err);
        });

        for (var i = 0; i < elements.length; i++) {
            var nodeValue = elements[i].attributes['data-xl-auth'].nodeValue;
            if (nodeValue.startsWith('sn')) {
                elements[i].onclick = config.eventHandlers.social;
            } else if (nodeValue == 'form-sms') {
                elements[i].onsubmit = config.eventHandlers.sms;
            } else if (nodeValue == 'form-login_pass') {
                elements[i].onsubmit = config.eventHandlers.loginPass;
            }
        }
    };

    function getAllElementsWithAttribute(attribute)
    {
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
    }



    var XLApi = function (projectId) {
        var self = this;
        this.baseUrl = 'https://login.xsolla.com/';
        this.projectId = projectId;

        this.makeApiCall = function (params, success, errr) {
            var r = new XMLHttpRequest();
            r.open(params.method, self.baseUrl + params.endpoint, true);
            r.onreadystatechange = function () {
                if (r.readyState != 4 || r.status != 200)
                {
                    errr('error');
                    return;
                }
                success(r.responseText);
            };
            r.send(params.getArguments);
        };
    };
    XLApi.prototype.getSocialsURLs = function (success, error) {
        return this.makeApiCall({method: 'GET', endpoint: 'socials', getArguments: ''}, success, error);
    };

    if(!window.XL) {
        window.XL = XL;
    }
})();