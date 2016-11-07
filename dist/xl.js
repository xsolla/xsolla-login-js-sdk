(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XL = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * easyXDM
 * http://easyxdm.net/
 * Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function (window, document, location, setTimeout, decodeURIComponent, encodeURIComponent) {
/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global JSON, XMLHttpRequest, window, escape, unescape, ActiveXObject */
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

var global = this;
var channelId = Math.floor(Math.random() * 10000); // randomize the initial id in case of multiple closures loaded 
var emptyFn = Function.prototype;
var reURI = /^((http.?:)\/\/([^:\/\s]+)(:\d+)*)/; // returns groups for protocol (2), domain (3) and port (4) 
var reParent = /[\-\w]+\/\.\.\//; // matches a foo/../ expression 
var reDoubleSlash = /([^:])\/\//g; // matches // anywhere but in the protocol
var namespace = ""; // stores namespace under which easyXDM object is stored on the page (empty if object is global)
var easyXDM = {};
var _easyXDM = window.easyXDM; // map over global easyXDM in case of overwrite
var IFRAME_PREFIX = "easyXDM_";
var HAS_NAME_PROPERTY_BUG;
var useHash = false; // whether to use the hash over the query
var flashVersion; // will be set if using flash
var HAS_FLASH_THROTTLED_BUG;


// http://peter.michaux.ca/articles/feature-detection-state-of-the-art-browser-scripting
function isHostMethod(object, property){
    var t = typeof object[property];
    return t == 'function' ||
    (!!(t == 'object' && object[property])) ||
    t == 'unknown';
}

function isHostObject(object, property){
    return !!(typeof(object[property]) == 'object' && object[property]);
}

// end

// http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
function isArray(o){
    return Object.prototype.toString.call(o) === '[object Array]';
}

// end
function hasFlash(){
    var name = "Shockwave Flash", mimeType = "application/x-shockwave-flash";
    
    if (!undef(navigator.plugins) && typeof navigator.plugins[name] == "object") {
        // adapted from the swfobject code
        var description = navigator.plugins[name].description;
        if (description && !undef(navigator.mimeTypes) && navigator.mimeTypes[mimeType] && navigator.mimeTypes[mimeType].enabledPlugin) {
            flashVersion = description.match(/\d+/g);
        }
    }
    if (!flashVersion) {
        var flash;
        try {
            flash = new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
            flashVersion = Array.prototype.slice.call(flash.GetVariable("$version").match(/(\d+),(\d+),(\d+),(\d+)/), 1);
            flash = null;
        } 
        catch (notSupportedException) {
        }
    }
    if (!flashVersion) {
        return false;
    }
    var major = parseInt(flashVersion[0], 10), minor = parseInt(flashVersion[1], 10);
    HAS_FLASH_THROTTLED_BUG = major > 9 && minor > 0;
    return true;
}

/*
 * Cross Browser implementation for adding and removing event listeners.
 */
var on, un;
if (isHostMethod(window, "addEventListener")) {
    on = function(target, type, listener){
        target.addEventListener(type, listener, false);
    };
    un = function(target, type, listener){
        target.removeEventListener(type, listener, false);
    };
}
else if (isHostMethod(window, "attachEvent")) {
    on = function(object, sEvent, fpNotify){
        object.attachEvent("on" + sEvent, fpNotify);
    };
    un = function(object, sEvent, fpNotify){
        object.detachEvent("on" + sEvent, fpNotify);
    };
}
else {
    throw new Error("Browser not supported");
}

/*
 * Cross Browser implementation of DOMContentLoaded.
 */
var domIsReady = false, domReadyQueue = [], readyState;
if ("readyState" in document) {
    // If browser is WebKit-powered, check for both 'loaded' (legacy browsers) and
    // 'interactive' (HTML5 specs, recent WebKit builds) states.
    // https://bugs.webkit.org/show_bug.cgi?id=45119
    readyState = document.readyState;
    domIsReady = readyState == "complete" || (~ navigator.userAgent.indexOf('AppleWebKit/') && (readyState == "loaded" || readyState == "interactive"));
}
else {
    // If readyState is not supported in the browser, then in order to be able to fire whenReady functions apropriately
    // when added dynamically _after_ DOM load, we have to deduce wether the DOM is ready or not.
    // We only need a body to add elements to, so the existence of document.body is enough for us.
    domIsReady = !!document.body;
}

function dom_onReady(){
    if (domIsReady) {
        return;
    }
    domIsReady = true;
    for (var i = 0; i < domReadyQueue.length; i++) {
        domReadyQueue[i]();
    }
    domReadyQueue.length = 0;
}


if (!domIsReady) {
    if (isHostMethod(window, "addEventListener")) {
        on(document, "DOMContentLoaded", dom_onReady);
    }
    else {
        on(document, "readystatechange", function(){
            if (document.readyState == "complete") {
                dom_onReady();
            }
        });
        if (document.documentElement.doScroll && window === top) {
            var doScrollCheck = function(){
                if (domIsReady) {
                    return;
                }
                // http://javascript.nwbox.com/IEContentLoaded/
                try {
                    document.documentElement.doScroll("left");
                } 
                catch (e) {
                    setTimeout(doScrollCheck, 1);
                    return;
                }
                dom_onReady();
            };
            doScrollCheck();
        }
    }
    
    // A fallback to window.onload, that will always work
    on(window, "load", dom_onReady);
}
/**
 * This will add a function to the queue of functions to be run once the DOM reaches a ready state.
 * If functions are added after this event then they will be executed immediately.
 * @param {function} fn The function to add
 * @param {Object} scope An optional scope for the function to be called with.
 */
function whenReady(fn, scope){
    if (domIsReady) {
        fn.call(scope);
        return;
    }
    domReadyQueue.push(function(){
        fn.call(scope);
    });
}

/**
 * Returns an instance of easyXDM from the parent window with
 * respect to the namespace.
 *
 * @return An instance of easyXDM (in the parent window)
 */
function getParentObject(){
    var obj = parent;
    if (namespace !== "") {
        for (var i = 0, ii = namespace.split("."); i < ii.length; i++) {
            obj = obj[ii[i]];
        }
    }
    return obj.easyXDM;
}

/**
 * Removes easyXDM variable from the global scope. It also returns control
 * of the easyXDM variable to whatever code used it before.
 *
 * @param {String} ns A string representation of an object that will hold
 *                    an instance of easyXDM.
 * @return An instance of easyXDM
 */
function noConflict(ns){
    
    window.easyXDM = _easyXDM;
    namespace = ns;
    if (namespace) {
        IFRAME_PREFIX = "easyXDM_" + namespace.replace(".", "_") + "_";
    }
    return easyXDM;
}

/*
 * Methods for working with URLs
 */
/**
 * Get the domain name from a url.
 * @param {String} url The url to extract the domain from.
 * @return The domain part of the url.
 * @type {String}
 */
function getDomainName(url){
    return url.match(reURI)[3];
}

/**
 * Get the port for a given URL, or "" if none
 * @param {String} url The url to extract the port from.
 * @return The port part of the url.
 * @type {String}
 */
function getPort(url){
    return url.match(reURI)[4] || "";
}

/**
 * Returns  a string containing the schema, domain and if present the port
 * @param {String} url The url to extract the location from
 * @return {String} The location part of the url
 */
function getLocation(url){
    var m = url.toLowerCase().match(reURI);
    var proto = m[2], domain = m[3], port = m[4] || "";
    if ((proto == "http:" && port == ":80") || (proto == "https:" && port == ":443")) {
        port = "";
    }
    return proto + "//" + domain + port;
}

/**
 * Resolves a relative url into an absolute one.
 * @param {String} url The path to resolve.
 * @return {String} The resolved url.
 */
function resolveUrl(url){
    
    // replace all // except the one in proto with /
    url = url.replace(reDoubleSlash, "$1/");
    
    // If the url is a valid url we do nothing
    if (!url.match(/^(http||https):\/\//)) {
        // If this is a relative path
        var path = (url.substring(0, 1) === "/") ? "" : location.pathname;
        if (path.substring(path.length - 1) !== "/") {
            path = path.substring(0, path.lastIndexOf("/") + 1);
        }
        
        url = location.protocol + "//" + location.host + path + url;
    }
    
    // reduce all 'xyz/../' to just '' 
    while (reParent.test(url)) {
        url = url.replace(reParent, "");
    }
    
    return url;
}

/**
 * Appends the parameters to the given url.<br/>
 * The base url can contain existing query parameters.
 * @param {String} url The base url.
 * @param {Object} parameters The parameters to add.
 * @return {String} A new valid url with the parameters appended.
 */
function appendQueryParameters(url, parameters){
    
    var hash = "", indexOf = url.indexOf("#");
    if (indexOf !== -1) {
        hash = url.substring(indexOf);
        url = url.substring(0, indexOf);
    }
    var q = [];
    for (var key in parameters) {
        if (parameters.hasOwnProperty(key)) {
            q.push(key + "=" + encodeURIComponent(parameters[key]));
        }
    }
    return url + (useHash ? "#" : (url.indexOf("?") == -1 ? "?" : "&")) + q.join("&") + hash;
}


// build the query object either from location.query, if it contains the xdm_e argument, or from location.hash
var query = (function(input){
    input = input.substring(1).split("&");
    var data = {}, pair, i = input.length;
    while (i--) {
        pair = input[i].split("=");
        data[pair[0]] = decodeURIComponent(pair[1]);
    }
    return data;
}(/xdm_e=/.test(location.search) ? location.search : location.hash));

/*
 * Helper methods
 */
/**
 * Helper for checking if a variable/property is undefined
 * @param {Object} v The variable to test
 * @return {Boolean} True if the passed variable is undefined
 */
function undef(v){
    return typeof v === "undefined";
}

/**
 * A safe implementation of HTML5 JSON. Feature testing is used to make sure the implementation works.
 * @return {JSON} A valid JSON conforming object, or null if not found.
 */
var getJSON = function(){
    var cached = {};
    var obj = {
        a: [1, 2, 3]
    }, json = "{\"a\":[1,2,3]}";
    
    if (typeof JSON != "undefined" && typeof JSON.stringify === "function" && JSON.stringify(obj).replace((/\s/g), "") === json) {
        // this is a working JSON instance
        return JSON;
    }
    if (Object.toJSON) {
        if (Object.toJSON(obj).replace((/\s/g), "") === json) {
            // this is a working stringify method
            cached.stringify = Object.toJSON;
        }
    }
    
    if (typeof String.prototype.evalJSON === "function") {
        obj = json.evalJSON();
        if (obj.a && obj.a.length === 3 && obj.a[2] === 3) {
            // this is a working parse method           
            cached.parse = function(str){
                return str.evalJSON();
            };
        }
    }
    
    if (cached.stringify && cached.parse) {
        // Only memoize the result if we have valid instance
        getJSON = function(){
            return cached;
        };
        return cached;
    }
    return null;
};

/**
 * Applies properties from the source object to the target object.<br/>
 * @param {Object} target The target of the properties.
 * @param {Object} source The source of the properties.
 * @param {Boolean} noOverwrite Set to True to only set non-existing properties.
 */
function apply(destination, source, noOverwrite){
    var member;
    for (var prop in source) {
        if (source.hasOwnProperty(prop)) {
            if (prop in destination) {
                member = source[prop];
                if (typeof member === "object") {
                    apply(destination[prop], member, noOverwrite);
                }
                else if (!noOverwrite) {
                    destination[prop] = source[prop];
                }
            }
            else {
                destination[prop] = source[prop];
            }
        }
    }
    return destination;
}

// This tests for the bug in IE where setting the [name] property using javascript causes the value to be redirected into [submitName].
function testForNamePropertyBug(){
    var form = document.body.appendChild(document.createElement("form")), input = form.appendChild(document.createElement("input"));
    input.name = IFRAME_PREFIX + "TEST" + channelId; // append channelId in order to avoid caching issues
    HAS_NAME_PROPERTY_BUG = input !== form.elements[input.name];
    document.body.removeChild(form);
}

/**
 * Creates a frame and appends it to the DOM.
 * @param config {object} This object can have the following properties
 * <ul>
 * <li> {object} prop The properties that should be set on the frame. This should include the 'src' property.</li>
 * <li> {object} attr The attributes that should be set on the frame.</li>
 * <li> {DOMElement} container Its parent element (Optional).</li>
 * <li> {function} onLoad A method that should be called with the frames contentWindow as argument when the frame is fully loaded. (Optional)</li>
 * </ul>
 * @return The frames DOMElement
 * @type DOMElement
 */
function createFrame(config){
    if (undef(HAS_NAME_PROPERTY_BUG)) {
        testForNamePropertyBug();
    }
    var frame;
    // This is to work around the problems in IE6/7 with setting the name property. 
    // Internally this is set as 'submitName' instead when using 'iframe.name = ...'
    // This is not required by easyXDM itself, but is to facilitate other use cases 
    if (HAS_NAME_PROPERTY_BUG) {
        frame = document.createElement("<iframe name=\"" + config.props.name + "\"/>");
    }
    else {
        frame = document.createElement("IFRAME");
        frame.name = config.props.name;
    }
    
    frame.id = frame.name = config.props.name;
    delete config.props.name;
    
    if (typeof config.container == "string") {
        config.container = document.getElementById(config.container);
    }
    
    if (!config.container) {
        // This needs to be hidden like this, simply setting display:none and the like will cause failures in some browsers.
        apply(frame.style, {
            position: "absolute",
            top: "-2000px",
            // Avoid potential horizontal scrollbar
            left: "0px"
        });
        config.container = document.body;
    }
    
    // HACK: IE cannot have the src attribute set when the frame is appended
    //       into the container, so we set it to "javascript:false" as a
    //       placeholder for now.  If we left the src undefined, it would
    //       instead default to "about:blank", which causes SSL mixed-content
    //       warnings in IE6 when on an SSL parent page.
    var src = config.props.src;
    config.props.src = "javascript:false";
    
    // transfer properties to the frame
    apply(frame, config.props);
    
    frame.border = frame.frameBorder = 0;
    frame.allowTransparency = true;
    config.container.appendChild(frame);
    
    if (config.onLoad) {
        on(frame, "load", config.onLoad);
    }
    
    // set the frame URL to the proper value (we previously set it to
    // "javascript:false" to work around the IE issue mentioned above)
    if(config.usePost) {
        var form = config.container.appendChild(document.createElement('form')), input;
        form.target = frame.name;
        form.action = src;
        form.method = 'POST';
        if (typeof(config.usePost) === 'object') {
            for (var i in config.usePost) {
                if (config.usePost.hasOwnProperty(i)) {
                    if (HAS_NAME_PROPERTY_BUG) {
                        input = document.createElement('<input name="' + i + '"/>');
                    } else {
                        input = document.createElement("INPUT");
                        input.name = i;
                    }
                    input.value = config.usePost[i];
                    form.appendChild(input);
                }
            }
        }
        form.submit();
        form.parentNode.removeChild(form);
    } else {
        frame.src = src;
    }
    config.props.src = src;
    
    return frame;
}

/**
 * Check whether a domain is allowed using an Access Control List.
 * The ACL can contain * and ? as wildcards, or can be regular expressions.
 * If regular expressions they need to begin with ^ and end with $.
 * @param {Array/String} acl The list of allowed domains
 * @param {String} domain The domain to test.
 * @return {Boolean} True if the domain is allowed, false if not.
 */
function checkAcl(acl, domain){
    // normalize into an array
    if (typeof acl == "string") {
        acl = [acl];
    }
    var re, i = acl.length;
    while (i--) {
        re = acl[i];
        re = new RegExp(re.substr(0, 1) == "^" ? re : ("^" + re.replace(/(\*)/g, ".$1").replace(/\?/g, ".") + "$"));
        if (re.test(domain)) {
            return true;
        }
    }
    return false;
}

/*
 * Functions related to stacks
 */
/**
 * Prepares an array of stack-elements suitable for the current configuration
 * @param {Object} config The Transports configuration. See easyXDM.Socket for more.
 * @return {Array} An array of stack-elements with the TransportElement at index 0.
 */
function prepareTransportStack(config){
    var protocol = config.protocol, stackEls;
    config.isHost = config.isHost || undef(query.xdm_p);
    useHash = config.hash || false;
    
    if (!config.props) {
        config.props = {};
    }
    if (!config.isHost) {
        config.channel = query.xdm_c.replace(/["'<>\\]/g, "");
        config.secret = query.xdm_s;
        config.remote = query.xdm_e.replace(/["'<>\\]/g, "");
        ;
        protocol = query.xdm_p;
        if (config.acl && !checkAcl(config.acl, config.remote)) {
            throw new Error("Access denied for " + config.remote);
        }
    }
    else {
        config.remote = resolveUrl(config.remote);
        config.channel = config.channel || "default" + channelId++;
        config.secret = Math.random().toString(16).substring(2);
        if (undef(protocol)) {
            if (getLocation(location.href) == getLocation(config.remote)) {
                /*
                 * Both documents has the same origin, lets use direct access.
                 */
                protocol = "4";
            }
            else if (isHostMethod(window, "postMessage") || isHostMethod(document, "postMessage")) {
                /*
                 * This is supported in IE8+, Firefox 3+, Opera 9+, Chrome 2+ and Safari 4+
                 */
                protocol = "1";
            }
            else if (config.swf && isHostMethod(window, "ActiveXObject") && hasFlash()) {
                /*
                 * The Flash transport superseedes the NixTransport as the NixTransport has been blocked by MS
                 */
                protocol = "6";
            }
            else if (navigator.product === "Gecko" && "frameElement" in window && navigator.userAgent.indexOf('WebKit') == -1) {
                /*
                 * This is supported in Gecko (Firefox 1+)
                 */
                protocol = "5";
            }
            else if (config.remoteHelper) {
                /*
                 * This is supported in all browsers that retains the value of window.name when
                 * navigating from one domain to another, and where parent.frames[foo] can be used
                 * to get access to a frame from the same domain
                 */
                protocol = "2";
            }
            else {
                /*
                 * This is supported in all browsers where [window].location is writable for all
                 * The resize event will be used if resize is supported and the iframe is not put
                 * into a container, else polling will be used.
                 */
                protocol = "0";
            }
        }
    }
    config.protocol = protocol; // for conditional branching
    switch (protocol) {
        case "0":// 0 = HashTransport
            apply(config, {
                interval: 100,
                delay: 2000,
                useResize: true,
                useParent: false,
                usePolling: false
            }, true);
            if (config.isHost) {
                if (!config.local) {
                    // If no local is set then we need to find an image hosted on the current domain
                    var domain = location.protocol + "//" + location.host, images = document.body.getElementsByTagName("img"), image;
                    var i = images.length;
                    while (i--) {
                        image = images[i];
                        if (image.src.substring(0, domain.length) === domain) {
                            config.local = image.src;
                            break;
                        }
                    }
                    if (!config.local) {
                        // If no local was set, and we are unable to find a suitable file, then we resort to using the current window 
                        config.local = window;
                    }
                }
                
                var parameters = {
                    xdm_c: config.channel,
                    xdm_p: 0
                };
                
                if (config.local === window) {
                    // We are using the current window to listen to
                    config.usePolling = true;
                    config.useParent = true;
                    config.local = location.protocol + "//" + location.host + location.pathname + location.search;
                    parameters.xdm_e = config.local;
                    parameters.xdm_pa = 1; // use parent
                }
                else {
                    parameters.xdm_e = resolveUrl(config.local);
                }
                
                if (config.container) {
                    config.useResize = false;
                    parameters.xdm_po = 1; // use polling
                }
                config.remote = appendQueryParameters(config.remote, parameters);
            }
            else {
                apply(config, {
                    useParent: !undef(query.xdm_pa),
                    usePolling: !undef(query.xdm_po),
                    useResize: config.useParent ? false : config.useResize
                });
            }
            stackEls = [new easyXDM.stack.HashTransport(config), new easyXDM.stack.ReliableBehavior({}), new easyXDM.stack.QueueBehavior({
                encode: true,
                maxLength: 4000 - config.remote.length
            }), new easyXDM.stack.VerifyBehavior({
                initiate: config.isHost
            })];
            break;
        case "1":
            stackEls = [new easyXDM.stack.PostMessageTransport(config)];
            break;
        case "2":
            if (config.isHost) {
                config.remoteHelper = resolveUrl(config.remoteHelper);
            }
            stackEls = [new easyXDM.stack.NameTransport(config), new easyXDM.stack.QueueBehavior(), new easyXDM.stack.VerifyBehavior({
                initiate: config.isHost
            })];
            break;
        case "3":
            stackEls = [new easyXDM.stack.NixTransport(config)];
            break;
        case "4":
            stackEls = [new easyXDM.stack.SameOriginTransport(config)];
            break;
        case "5":
            stackEls = [new easyXDM.stack.FrameElementTransport(config)];
            break;
        case "6":
            if (!flashVersion) {
                hasFlash();
            }
            stackEls = [new easyXDM.stack.FlashTransport(config)];
            break;
    }
    // this behavior is responsible for buffering outgoing messages, and for performing lazy initialization
    stackEls.push(new easyXDM.stack.QueueBehavior({
        lazy: config.lazy,
        remove: true
    }));
    return stackEls;
}

/**
 * Chains all the separate stack elements into a single usable stack.<br/>
 * If an element is missing a necessary method then it will have a pass-through method applied.
 * @param {Array} stackElements An array of stack elements to be linked.
 * @return {easyXDM.stack.StackElement} The last element in the chain.
 */
function chainStack(stackElements){
    var stackEl, defaults = {
        incoming: function(message, origin){
            this.up.incoming(message, origin);
        },
        outgoing: function(message, recipient){
            this.down.outgoing(message, recipient);
        },
        callback: function(success){
            this.up.callback(success);
        },
        init: function(){
            this.down.init();
        },
        destroy: function(){
            this.down.destroy();
        }
    };
    for (var i = 0, len = stackElements.length; i < len; i++) {
        stackEl = stackElements[i];
        apply(stackEl, defaults, true);
        if (i !== 0) {
            stackEl.down = stackElements[i - 1];
        }
        if (i !== len - 1) {
            stackEl.up = stackElements[i + 1];
        }
    }
    return stackEl;
}

/**
 * This will remove a stackelement from its stack while leaving the stack functional.
 * @param {Object} element The elment to remove from the stack.
 */
function removeFromStack(element){
    element.up.down = element.down;
    element.down.up = element.up;
    element.up = element.down = null;
}

/*
 * Export the main object and any other methods applicable
 */
/** 
 * @class easyXDM
 * A javascript library providing cross-browser, cross-domain messaging/RPC.
 * @version 2.4.20.7
 * @singleton
 */
apply(easyXDM, {
    /**
     * The version of the library
     * @type {string}
     */
    version: "2.4.20.7",
    /**
     * This is a map containing all the query parameters passed to the document.
     * All the values has been decoded using decodeURIComponent.
     * @type {object}
     */
    query: query,
    /**
     * @private
     */
    stack: {},
    /**
     * Applies properties from the source object to the target object.<br/>
     * @param {object} target The target of the properties.
     * @param {object} source The source of the properties.
     * @param {boolean} noOverwrite Set to True to only set non-existing properties.
     */
    apply: apply,
    
    /**
     * A safe implementation of HTML5 JSON. Feature testing is used to make sure the implementation works.
     * @return {JSON} A valid JSON conforming object, or null if not found.
     */
    getJSONObject: getJSON,
    /**
     * This will add a function to the queue of functions to be run once the DOM reaches a ready state.
     * If functions are added after this event then they will be executed immediately.
     * @param {function} fn The function to add
     * @param {object} scope An optional scope for the function to be called with.
     */
    whenReady: whenReady,
    /**
     * Removes easyXDM variable from the global scope. It also returns control
     * of the easyXDM variable to whatever code used it before.
     *
     * @param {String} ns A string representation of an object that will hold
     *                    an instance of easyXDM.
     * @return An instance of easyXDM
     */
    noConflict: noConflict
});

/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global console, _FirebugCommandLine,  easyXDM, window, escape, unescape, isHostObject, undef, _trace, domIsReady, emptyFn, namespace */
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, isHostObject, isHostMethod, un, on, createFrame, debug */
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

/** 
 * @class easyXDM.DomHelper
 * Contains methods for dealing with the DOM
 * @singleton
 */
easyXDM.DomHelper = {
    /**
     * Provides a consistent interface for adding eventhandlers
     * @param {Object} target The target to add the event to
     * @param {String} type The name of the event
     * @param {Function} listener The listener
     */
    on: on,
    /**
     * Provides a consistent interface for removing eventhandlers
     * @param {Object} target The target to remove the event from
     * @param {String} type The name of the event
     * @param {Function} listener The listener
     */
    un: un,
    /**
     * Checks for the presence of the JSON object.
     * If it is not present it will use the supplied path to load the JSON2 library.
     * This should be called in the documents head right after the easyXDM script tag.
     * http://json.org/json2.js
     * @param {String} path A valid path to json2.js
     */
    requiresJSON: function(path){
        if (!isHostObject(window, "JSON")) {
            // we need to encode the < in order to avoid an illegal token error
            // when the script is inlined in a document.
            document.write('<' + 'script type="text/javascript" src="' + path + '"><' + '/script>');
        }
    }
};
/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, debug */
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

(function(){
    // The map containing the stored functions
    var _map = {};
    
    /**
     * @class easyXDM.Fn
     * This contains methods related to function handling, such as storing callbacks.
     * @singleton
     * @namespace easyXDM
     */
    easyXDM.Fn = {
        /**
         * Stores a function using the given name for reference
         * @param {String} name The name that the function should be referred by
         * @param {Function} fn The function to store
         * @namespace easyXDM.fn
         */
        set: function(name, fn){
            _map[name] = fn;
        },
        /**
         * Retrieves the function referred to by the given name
         * @param {String} name The name of the function to retrieve
         * @param {Boolean} del If the function should be deleted after retrieval
         * @return {Function} The stored function
         * @namespace easyXDM.fn
         */
        get: function(name, del){
            if (!_map.hasOwnProperty(name)) {
                return;
            }
            var fn = _map[name];
            
            if (del) {
                delete _map[name];
            }
            return fn;
        }
    };
    
}());
/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, chainStack, prepareTransportStack, getLocation, debug */
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

/**
 * @class easyXDM.Socket
 * This class creates a transport channel between two domains that is usable for sending and receiving string-based messages.<br/>
 * The channel is reliable, supports queueing, and ensures that the message originates from the expected domain.<br/>
 * Internally different stacks will be used depending on the browsers features and the available parameters.
 * <h2>How to set up</h2>
 * Setting up the provider:
 * <pre><code>
 * var socket = new easyXDM.Socket({
 * &nbsp; local: "name.html",
 * &nbsp; onReady: function(){
 * &nbsp; &nbsp; &#47;&#47; you need to wait for the onReady callback before using the socket
 * &nbsp; &nbsp; socket.postMessage("foo-message");
 * &nbsp; },
 * &nbsp; onMessage: function(message, origin) {
 * &nbsp;&nbsp; alert("received " + message + " from " + origin);
 * &nbsp; }
 * });
 * </code></pre>
 * Setting up the consumer:
 * <pre><code>
 * var socket = new easyXDM.Socket({
 * &nbsp; remote: "http:&#47;&#47;remotedomain/page.html",
 * &nbsp; remoteHelper: "http:&#47;&#47;remotedomain/name.html",
 * &nbsp; onReady: function(){
 * &nbsp; &nbsp; &#47;&#47; you need to wait for the onReady callback before using the socket
 * &nbsp; &nbsp; socket.postMessage("foo-message");
 * &nbsp; },
 * &nbsp; onMessage: function(message, origin) {
 * &nbsp;&nbsp; alert("received " + message + " from " + origin);
 * &nbsp; }
 * });
 * </code></pre>
 * If you are unable to upload the <code>name.html</code> file to the consumers domain then remove the <code>remoteHelper</code> property
 * and easyXDM will fall back to using the HashTransport instead of the NameTransport when not able to use any of the primary transports.
 * @namespace easyXDM
 * @constructor
 * @cfg {String/Window} local The url to the local name.html document, a local static file, or a reference to the local window.
 * @cfg {Boolean} lazy (Consumer only) Set this to true if you want easyXDM to defer creating the transport until really needed. 
 * @cfg {String} remote (Consumer only) The url to the providers document.
 * @cfg {String} remoteHelper (Consumer only) The url to the remote name.html file. This is to support NameTransport as a fallback. Optional.
 * @cfg {Number} delay The number of milliseconds easyXDM should try to get a reference to the local window.  Optional, defaults to 2000.
 * @cfg {Number} interval The interval used when polling for messages. Optional, defaults to 300.
 * @cfg {String} channel (Consumer only) The name of the channel to use. Can be used to set consistent iframe names. Must be unique. Optional.
 * @cfg {Function} onMessage The method that should handle incoming messages.<br/> This method should accept two arguments, the message as a string, and the origin as a string. Optional.
 * @cfg {Function} onReady A method that should be called when the transport is ready. Optional.
 * @cfg {DOMElement|String} container (Consumer only) The element, or the id of the element that the primary iframe should be inserted into. If not set then the iframe will be positioned off-screen. Optional.
 * @cfg {Array/String} acl (Provider only) Here you can specify which '[protocol]://[domain]' patterns that should be allowed to act as the consumer towards this provider.<br/>
 * This can contain the wildcards ? and *.  Examples are 'http://example.com', '*.foo.com' and '*dom?.com'. If you want to use reqular expressions then you pattern needs to start with ^ and end with $.
 * If none of the patterns match an Error will be thrown.  
 * @cfg {Object} props (Consumer only) Additional properties that should be applied to the iframe. This can also contain nested objects e.g: <code>{style:{width:"100px", height:"100px"}}</code>. 
 * Properties such as 'name' and 'src' will be overrided. Optional.
 */
easyXDM.Socket = function(config){
    
    // create the stack
    var stack = chainStack(prepareTransportStack(config).concat([{
        incoming: function(message, origin){
            config.onMessage(message, origin);
        },
        callback: function(success){
            if (config.onReady) {
                config.onReady(success);
            }
        }
    }])), recipient = getLocation(config.remote);
    
    // set the origin
    this.origin = getLocation(config.remote);
	
    /**
     * Initiates the destruction of the stack.
     */
    this.destroy = function(){
        stack.destroy();
    };
    
    /**
     * Posts a message to the remote end of the channel
     * @param {String} message The message to send
     */
    this.postMessage = function(message){
        stack.outgoing(message, recipient);
    };
    
    stack.init();
};
/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, undef,, chainStack, prepareTransportStack, debug, getLocation */
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

/** 
 * @class easyXDM.Rpc
 * Creates a proxy object that can be used to call methods implemented on the remote end of the channel, and also to provide the implementation
 * of methods to be called from the remote end.<br/>
 * The instantiated object will have methods matching those specified in <code>config.remote</code>.<br/>
 * This requires the JSON object present in the document, either natively, using json.org's json2 or as a wrapper around library spesific methods.
 * <h2>How to set up</h2>
 * <pre><code>
 * var rpc = new easyXDM.Rpc({
 * &nbsp; &#47;&#47; this configuration is equal to that used by the Socket.
 * &nbsp; remote: "http:&#47;&#47;remotedomain/...",
 * &nbsp; onReady: function(){
 * &nbsp; &nbsp; &#47;&#47; you need to wait for the onReady callback before using the proxy
 * &nbsp; &nbsp; rpc.foo(...
 * &nbsp; }
 * },{
 * &nbsp; local: {..},
 * &nbsp; remote: {..}
 * });
 * </code></pre>
 * 
 * <h2>Exposing functions (procedures)</h2>
 * <pre><code>
 * var rpc = new easyXDM.Rpc({
 * &nbsp; ...
 * },{
 * &nbsp; local: {
 * &nbsp; &nbsp; nameOfMethod: {
 * &nbsp; &nbsp; &nbsp; method: function(arg1, arg2, success, error){
 * &nbsp; &nbsp; &nbsp; &nbsp; ...
 * &nbsp; &nbsp; &nbsp; }
 * &nbsp; &nbsp; },
 * &nbsp; &nbsp; &#47;&#47; with shorthand notation 
 * &nbsp; &nbsp; nameOfAnotherMethod:  function(arg1, arg2, success, error){
 * &nbsp; &nbsp; }
 * &nbsp; },
 * &nbsp; remote: {...}
 * });
 * </code></pre>

 * The function referenced by  [method] will receive the passed arguments followed by the callback functions <code>success</code> and <code>error</code>.<br/>
 * To send a successfull result back you can use
 *     <pre><code>
 *     return foo;
 *     </pre></code>
 * or
 *     <pre><code>
 *     success(foo);
 *     </pre></code>
 *  To return an error you can use
 *     <pre><code>
 *     throw new Error("foo error");
 *     </code></pre>
 * or
 *     <pre><code>
 *     error("foo error");
 *     </code></pre>
 *
 * <h2>Defining remotely exposed methods (procedures/notifications)</h2>
 * The definition of the remote end is quite similar:
 * <pre><code>
 * var rpc = new easyXDM.Rpc({
 * &nbsp; ...
 * },{
 * &nbsp; local: {...},
 * &nbsp; remote: {
 * &nbsp; &nbsp; nameOfMethod: {}
 * &nbsp; }
 * });
 * </code></pre>
 * To call a remote method use
 * <pre><code>
 * rpc.nameOfMethod("arg1", "arg2", function(value) {
 * &nbsp; alert("success: " + value);
 * }, function(message) {
 * &nbsp; alert("error: " + message + );
 * });
 * </code></pre>
 * Both the <code>success</code> and <code>errror</code> callbacks are optional.<br/>
 * When called with no callback a JSON-RPC 2.0 notification will be executed.
 * Be aware that you will not be notified of any errors with this method.
 * <br/>
 * <h2>Specifying a custom serializer</h2>
 * If you do not want to use the JSON2 library for non-native JSON support, but instead capabilities provided by some other library
 * then you can specify a custom serializer using <code>serializer: foo</code>
 * <pre><code>
 * var rpc = new easyXDM.Rpc({
 * &nbsp; ...
 * },{
 * &nbsp; local: {...},
 * &nbsp; remote: {...},
 * &nbsp; serializer : {
 * &nbsp; &nbsp; parse: function(string){ ... },
 * &nbsp; &nbsp; stringify: function(object) {...}
 * &nbsp; }
 * });
 * </code></pre>
 * If <code>serializer</code> is set then the class will not attempt to use the native implementation.
 * @namespace easyXDM
 * @constructor
 * @param {Object} config The underlying transports configuration. See easyXDM.Socket for available parameters.
 * @param {Object} jsonRpcConfig The description of the interface to implement.
 */
easyXDM.Rpc = function(config, jsonRpcConfig){
    
    // expand shorthand notation
    if (jsonRpcConfig.local) {
        for (var method in jsonRpcConfig.local) {
            if (jsonRpcConfig.local.hasOwnProperty(method)) {
                var member = jsonRpcConfig.local[method];
                if (typeof member === "function") {
                    jsonRpcConfig.local[method] = {
                        method: member
                    };
                }
            }
        }
    }
	
    // create the stack
    var stack = chainStack(prepareTransportStack(config).concat([new easyXDM.stack.RpcBehavior(this, jsonRpcConfig), {
        callback: function(success){
            if (config.onReady) {
                config.onReady(success);
            }
        }
    }]));
	
    // set the origin 
    this.origin = getLocation(config.remote);
	
    
    /**
     * Initiates the destruction of the stack.
     */
    this.destroy = function(){
        stack.destroy();
    };
    
    stack.init();
};
/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, getLocation, appendQueryParameters, createFrame, debug, un, on, apply, whenReady, getParentObject, IFRAME_PREFIX*/
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

/**
 * @class easyXDM.stack.SameOriginTransport
 * SameOriginTransport is a transport class that can be used when both domains have the same origin.<br/>
 * This can be useful for testing and for when the main application supports both internal and external sources.
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The transports configuration.
 * @cfg {String} remote The remote document to communicate with.
 */
easyXDM.stack.SameOriginTransport = function(config){
    var pub, frame, send, targetOrigin;
    
    return (pub = {
        outgoing: function(message, domain, fn){
            send(message);
            if (fn) {
                fn();
            }
        },
        destroy: function(){
            if (frame) {
                frame.parentNode.removeChild(frame);
                frame = null;
            }
        },
        onDOMReady: function(){
            targetOrigin = getLocation(config.remote);
            
            if (config.isHost) {
                // set up the iframe
                apply(config.props, {
                    src: appendQueryParameters(config.remote, {
                        xdm_e: location.protocol + "//" + location.host + location.pathname,
                        xdm_c: config.channel,
                        xdm_p: 4 // 4 = SameOriginTransport
                    }),
                    name: IFRAME_PREFIX + config.channel + "_provider"
                });
                frame = createFrame(config);
                easyXDM.Fn.set(config.channel, function(sendFn){
                    send = sendFn;
                    setTimeout(function(){
                        pub.up.callback(true);
                    }, 0);
                    return function(msg){
                        pub.up.incoming(msg, targetOrigin);
                    };
                });
            }
            else {
                send = getParentObject().Fn.get(config.channel, true)(function(msg){
                    pub.up.incoming(msg, targetOrigin);
                });
                setTimeout(function(){
                    pub.up.callback(true);
                }, 0);
            }
        },
        init: function(){
            whenReady(pub.onDOMReady, pub);
        }
    });
};
/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global global, easyXDM, window, getLocation, appendQueryParameters, createFrame, debug, apply, whenReady, IFRAME_PREFIX, namespace, resolveUrl, getDomainName, HAS_FLASH_THROTTLED_BUG, getPort, query*/
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

/**
 * @class easyXDM.stack.FlashTransport
 * FlashTransport is a transport class that uses an SWF with LocalConnection to pass messages back and forth.
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The transports configuration.
 * @cfg {String} remote The remote domain to communicate with.
 * @cfg {String} secret the pre-shared secret used to secure the communication.
 * @cfg {String} swf The path to the swf file
 * @cfg {Boolean} swfNoThrottle Set this to true if you want to take steps to avoid beeing throttled when hidden.
 * @cfg {String || DOMElement} swfContainer Set this if you want to control where the swf is placed
 */
easyXDM.stack.FlashTransport = function(config){
    var pub, // the public interface
 frame, send, targetOrigin, swf, swfContainer;
    
    function onMessage(message, origin){
        setTimeout(function(){
            pub.up.incoming(message, targetOrigin);
        }, 0);
    }
    
    /**
     * This method adds the SWF to the DOM and prepares the initialization of the channel
     */
    function addSwf(domain){
        // the differentiating query argument is needed in Flash9 to avoid a caching issue where LocalConnection would throw an error.
        var url = config.swf + "?host=" + config.isHost;
        var id = "easyXDM_swf_" + Math.floor(Math.random() * 10000);
        
        // prepare the init function that will fire once the swf is ready
        easyXDM.Fn.set("flash_loaded" + domain.replace(/[\-.]/g, "_"), function(){
            easyXDM.stack.FlashTransport[domain].swf = swf = swfContainer.firstChild;
            var queue = easyXDM.stack.FlashTransport[domain].queue;
            for (var i = 0; i < queue.length; i++) {
                queue[i]();
            }
            queue.length = 0;
        });
        
        if (config.swfContainer) {
            swfContainer = (typeof config.swfContainer == "string") ? document.getElementById(config.swfContainer) : config.swfContainer;
        }
        else {
            // create the container that will hold the swf
            swfContainer = document.createElement('div');
            
            // http://bugs.adobe.com/jira/browse/FP-4796
            // http://tech.groups.yahoo.com/group/flexcoders/message/162365
            // https://groups.google.com/forum/#!topic/easyxdm/mJZJhWagoLc
            apply(swfContainer.style, HAS_FLASH_THROTTLED_BUG && config.swfNoThrottle ? {
                height: "20px",
                width: "20px",
                position: "fixed",
                right: 0,
                top: 0
            } : {
                height: "1px",
                width: "1px",
                position: "absolute",
                overflow: "hidden",
                right: 0,
                top: 0
            });
            document.body.appendChild(swfContainer);
        }
        
        // create the object/embed
        var flashVars = "callback=flash_loaded" + encodeURIComponent(domain.replace(/[\-.]/g, "_"))
            + "&proto=" + global.location.protocol
            + "&domain=" + encodeURIComponent(getDomainName(global.location.href))
            + "&port=" + encodeURIComponent(getPort(global.location.href))
            + "&ns=" + encodeURIComponent(namespace);
        swfContainer.innerHTML = "<object height='20' width='20' type='application/x-shockwave-flash' id='" + id + "' data='" + url + "'>" +
        "<param name='allowScriptAccess' value='always'></param>" +
        "<param name='wmode' value='transparent'>" +
        "<param name='movie' value='" +
        url +
        "'></param>" +
        "<param name='flashvars' value='" +
        flashVars +
        "'></param>" +
        "<embed type='application/x-shockwave-flash' FlashVars='" +
        flashVars +
        "' allowScriptAccess='always' wmode='transparent' src='" +
        url +
        "' height='1' width='1'></embed>" +
        "</object>";
    }
    
    return (pub = {
        outgoing: function(message, domain, fn){
            swf.postMessage(config.channel, message.toString());
            if (fn) {
                fn();
            }
        },
        destroy: function(){
            try {
                swf.destroyChannel(config.channel);
            } 
            catch (e) {
            }
            swf = null;
            if (frame) {
                frame.parentNode.removeChild(frame);
                frame = null;
            }
        },
        onDOMReady: function(){
            
            targetOrigin = config.remote;
            
            // Prepare the code that will be run after the swf has been intialized
            easyXDM.Fn.set("flash_" + config.channel + "_init", function(){
                setTimeout(function(){
                    pub.up.callback(true);
                });
            });
            
            // set up the omMessage handler
            easyXDM.Fn.set("flash_" + config.channel + "_onMessage", onMessage);
            
            config.swf = resolveUrl(config.swf); // reports have been made of requests gone rogue when using relative paths
            var swfdomain = getDomainName(config.swf);
            var fn = function(){
                // set init to true in case the fn was called was invoked from a separate instance
                easyXDM.stack.FlashTransport[swfdomain].init = true;
                swf = easyXDM.stack.FlashTransport[swfdomain].swf;
                // create the channel
                swf.createChannel(config.channel, config.secret, getLocation(config.remote), config.isHost);
                
                if (config.isHost) {
                    // if Flash is going to be throttled and we want to avoid this
                    if (HAS_FLASH_THROTTLED_BUG && config.swfNoThrottle) {
                        apply(config.props, {
                            position: "fixed",
                            right: 0,
                            top: 0,
                            height: "20px",
                            width: "20px"
                        });
                    }
                    // set up the iframe
                    apply(config.props, {
                        src: appendQueryParameters(config.remote, {
                            xdm_e: getLocation(location.href),
                            xdm_c: config.channel,
                            xdm_p: 6, // 6 = FlashTransport
                            xdm_s: config.secret
                        }),
                        name: IFRAME_PREFIX + config.channel + "_provider"
                    });
                    frame = createFrame(config);
                }
            };
            
            if (easyXDM.stack.FlashTransport[swfdomain] && easyXDM.stack.FlashTransport[swfdomain].init) {
                // if the swf is in place and we are the consumer
                fn();
            }
            else {
                // if the swf does not yet exist
                if (!easyXDM.stack.FlashTransport[swfdomain]) {
                    // add the queue to hold the init fn's
                    easyXDM.stack.FlashTransport[swfdomain] = {
                        queue: [fn]
                    };
                    addSwf(swfdomain);
                }
                else {
                    easyXDM.stack.FlashTransport[swfdomain].queue.push(fn);
                }
            }
        },
        init: function(){
            whenReady(pub.onDOMReady, pub);
        }
    });
};
/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, getLocation, appendQueryParameters, createFrame, debug, un, on, apply, whenReady, IFRAME_PREFIX*/
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

/**
 * @class easyXDM.stack.PostMessageTransport
 * PostMessageTransport is a transport class that uses HTML5 postMessage for communication.<br/>
 * <a href="http://msdn.microsoft.com/en-us/library/ms644944(VS.85).aspx">http://msdn.microsoft.com/en-us/library/ms644944(VS.85).aspx</a><br/>
 * <a href="https://developer.mozilla.org/en/DOM/window.postMessage">https://developer.mozilla.org/en/DOM/window.postMessage</a>
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The transports configuration.
 * @cfg {String} remote The remote domain to communicate with.
 */
easyXDM.stack.PostMessageTransport = function(config){
    var pub, // the public interface
 frame, // the remote frame, if any
 callerWindow, // the window that we will call with
 targetOrigin; // the domain to communicate with
    /**
     * Resolves the origin from the event object
     * @private
     * @param {Object} event The messageevent
     * @return {String} The scheme, host and port of the origin
     */
    function _getOrigin(event){
        if (event.origin) {
            // This is the HTML5 property
            return getLocation(event.origin);
        }
        if (event.uri) {
            // From earlier implementations 
            return getLocation(event.uri);
        }
        if (event.domain) {
            // This is the last option and will fail if the 
            // origin is not using the same schema as we are
            return location.protocol + "//" + event.domain;
        }
        throw "Unable to retrieve the origin of the event";
    }
    
    /**
     * This is the main implementation for the onMessage event.<br/>
     * It checks the validity of the origin and passes the message on if appropriate.
     * @private
     * @param {Object} event The messageevent
     */
    function _window_onMessage(event){
        if (typeof event.data !== "string") {
            // postMessage also supports passing objects, but easyXDM's messages are always strings
            return;
        }
        var origin = _getOrigin(event);
        if (origin == targetOrigin && event.data.substring(0, config.channel.length + 1) == config.channel + " ") {
            pub.up.incoming(event.data.substring(config.channel.length + 1), origin);
        }
    }

    
    /**
     * This adds the listener for messages when the frame is ready.
     * @private
     * @param {Object} event The messageevent
     */
    // add the event handler for listening
    function _window_waitForReady(event){  
        if (event.data == config.channel + "-ready") {
            // replace the eventlistener
            callerWindow = ("postMessage" in frame.contentWindow) ? frame.contentWindow : frame.contentWindow.document;
            un(window, "message", _window_waitForReady);
            on(window, "message", _window_onMessage);
            setTimeout(function(){
                pub.up.callback(true);
            }, 0);
        }
    }
    
    return (pub = {
        outgoing: function(message, domain, fn){
            callerWindow.postMessage(config.channel + " " + message, domain || targetOrigin);
            if (fn) {
                fn();
            }
        },
        destroy: function(){
            un(window, "message", _window_waitForReady);
            un(window, "message", _window_onMessage);
            if (frame) {
                callerWindow = null;
                frame.parentNode.removeChild(frame);
                frame = null;
            }
        },
        onDOMReady: function(){
            targetOrigin = getLocation(config.remote);
            if (config.isHost) {
                on(window, "message", _window_waitForReady);
                
                // set up the iframe
                apply(config.props, {
                    src: appendQueryParameters(config.remote, {
                        xdm_e: getLocation(location.href),
                        xdm_c: config.channel,
                        xdm_p: 1 // 1 = PostMessage
                    }),
                    name: IFRAME_PREFIX + config.channel + "_provider"
                });
                frame = createFrame(config);
            }
            else {
                // add the event handler for listening
                on(window, "message", _window_onMessage);
                callerWindow = ("postMessage" in window.parent) ? window.parent : window.parent.document;
                callerWindow.postMessage(config.channel + "-ready", targetOrigin);
                
                setTimeout(function(){
                    pub.up.callback(true);
                }, 0);
            }
        },
        init: function(){
            whenReady(pub.onDOMReady, pub);
        }
    });
};
/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, getLocation, appendQueryParameters, createFrame, debug, apply, query, whenReady, IFRAME_PREFIX*/
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

/**
 * @class easyXDM.stack.FrameElementTransport
 * FrameElementTransport is a transport class that can be used with Gecko-browser as these allow passing variables using the frameElement property.<br/>
 * Security is maintained as Gecho uses Lexical Authorization to determine under which scope a function is running.
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The transports configuration.
 * @cfg {String} remote The remote document to communicate with.
 */
easyXDM.stack.FrameElementTransport = function(config){
    var pub, frame, send, targetOrigin;
    
    return (pub = {
        outgoing: function(message, domain, fn){
            send.call(this, message);
            if (fn) {
                fn();
            }
        },
        destroy: function(){
            if (frame) {
                frame.parentNode.removeChild(frame);
                frame = null;
            }
        },
        onDOMReady: function(){
            targetOrigin = getLocation(config.remote);
            
            if (config.isHost) {
                // set up the iframe
                apply(config.props, {
                    src: appendQueryParameters(config.remote, {
                        xdm_e: getLocation(location.href),
                        xdm_c: config.channel,
                        xdm_p: 5 // 5 = FrameElementTransport
                    }),
                    name: IFRAME_PREFIX + config.channel + "_provider"
                });
                frame = createFrame(config);
                frame.fn = function(sendFn){
                    delete frame.fn;
                    send = sendFn;
                    setTimeout(function(){
                        pub.up.callback(true);
                    }, 0);
                    // remove the function so that it cannot be used to overwrite the send function later on
                    return function(msg){
                        pub.up.incoming(msg, targetOrigin);
                    };
                };
            }
            else {
                // This is to mitigate origin-spoofing
                if (document.referrer && getLocation(document.referrer) != query.xdm_e) {
                    window.top.location = query.xdm_e;
                }
                send = window.frameElement.fn(function(msg){
                    pub.up.incoming(msg, targetOrigin);
                });
                pub.up.callback(true);
            }
        },
        init: function(){
            whenReady(pub.onDOMReady, pub);
        }
    });
};
/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, undef, getLocation, appendQueryParameters, resolveUrl, createFrame, debug, un, apply, whenReady, IFRAME_PREFIX*/
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

/**
 * @class easyXDM.stack.NameTransport
 * NameTransport uses the window.name property to relay data.
 * The <code>local</code> parameter needs to be set on both the consumer and provider,<br/>
 * and the <code>remoteHelper</code> parameter needs to be set on the consumer.
 * @constructor
 * @param {Object} config The transports configuration.
 * @cfg {String} remoteHelper The url to the remote instance of hash.html - this is only needed for the host.
 * @namespace easyXDM.stack
 */
easyXDM.stack.NameTransport = function(config){
    
    var pub; // the public interface
    var isHost, callerWindow, remoteWindow, readyCount, callback, remoteOrigin, remoteUrl;
    
    function _sendMessage(message){
        var url = config.remoteHelper + (isHost ? "#_3" : "#_2") + config.channel;
        callerWindow.contentWindow.sendMessage(message, url);
    }
    
    function _onReady(){
        if (isHost) {
            if (++readyCount === 2 || !isHost) {
                pub.up.callback(true);
            }
        }
        else {
            _sendMessage("ready");
            pub.up.callback(true);
        }
    }
    
    function _onMessage(message){
        pub.up.incoming(message, remoteOrigin);
    }
    
    function _onLoad(){
        if (callback) {
            setTimeout(function(){
                callback(true);
            }, 0);
        }
    }
    
    return (pub = {
        outgoing: function(message, domain, fn){
            callback = fn;
            _sendMessage(message);
        },
        destroy: function(){
            callerWindow.parentNode.removeChild(callerWindow);
            callerWindow = null;
            if (isHost) {
                remoteWindow.parentNode.removeChild(remoteWindow);
                remoteWindow = null;
            }
        },
        onDOMReady: function(){
            isHost = config.isHost;
            readyCount = 0;
            remoteOrigin = getLocation(config.remote);
            config.local = resolveUrl(config.local);
            
            if (isHost) {
                // Register the callback
                easyXDM.Fn.set(config.channel, function(message){
                    if (isHost && message === "ready") {
                        // Replace the handler
                        easyXDM.Fn.set(config.channel, _onMessage);
                        _onReady();
                    }
                });
                
                // Set up the frame that points to the remote instance
                remoteUrl = appendQueryParameters(config.remote, {
                    xdm_e: config.local,
                    xdm_c: config.channel,
                    xdm_p: 2
                });
                apply(config.props, {
                    src: remoteUrl + '#' + config.channel,
                    name: IFRAME_PREFIX + config.channel + "_provider"
                });
                remoteWindow = createFrame(config);
            }
            else {
                config.remoteHelper = config.remote;
                easyXDM.Fn.set(config.channel, _onMessage);
            }
            
            // Set up the iframe that will be used for the transport
            var onLoad = function(){
                // Remove the handler
                var w = callerWindow || this;
                un(w, "load", onLoad);
                easyXDM.Fn.set(config.channel + "_load", _onLoad);
                (function test(){
                    if (typeof w.contentWindow.sendMessage == "function") {
                        _onReady();
                    }
                    else {
                        setTimeout(test, 50);
                    }
                }());
            };
            
            callerWindow = createFrame({
                props: {
                    src: config.local + "#_4" + config.channel
                },
                onLoad: onLoad
            });
        },
        init: function(){
            whenReady(pub.onDOMReady, pub);
        }
    });
};
/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, getLocation, createFrame, debug, un, on, apply, whenReady, IFRAME_PREFIX*/
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

/**
 * @class easyXDM.stack.HashTransport
 * HashTransport is a transport class that uses the IFrame URL Technique for communication.<br/>
 * <a href="http://msdn.microsoft.com/en-us/library/bb735305.aspx">http://msdn.microsoft.com/en-us/library/bb735305.aspx</a><br/>
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The transports configuration.
 * @cfg {String/Window} local The url to the local file used for proxying messages, or the local window.
 * @cfg {Number} delay The number of milliseconds easyXDM should try to get a reference to the local window.
 * @cfg {Number} interval The interval used when polling for messages.
 */
easyXDM.stack.HashTransport = function(config){
    var pub;
    var me = this, isHost, _timer, pollInterval, _lastMsg, _msgNr, _listenerWindow, _callerWindow;
    var useParent, _remoteOrigin;
    
    function _sendMessage(message){
        if (!_callerWindow) {
            return;
        }
        var url = config.remote + "#" + (_msgNr++) + "_" + message;
        ((isHost || !useParent) ? _callerWindow.contentWindow : _callerWindow).location = url;
    }
    
    function _handleHash(hash){
        _lastMsg = hash;
        pub.up.incoming(_lastMsg.substring(_lastMsg.indexOf("_") + 1), _remoteOrigin);
    }
    
    /**
     * Checks location.hash for a new message and relays this to the receiver.
     * @private
     */
    function _pollHash(){
        if (!_listenerWindow) {
            return;
        }
        var href = _listenerWindow.location.href, hash = "", indexOf = href.indexOf("#");
        if (indexOf != -1) {
            hash = href.substring(indexOf);
        }
        if (hash && hash != _lastMsg) {
            _handleHash(hash);
        }
    }
    
    function _attachListeners(){
        _timer = setInterval(_pollHash, pollInterval);
    }
    
    return (pub = {
        outgoing: function(message, domain){
            _sendMessage(message);
        },
        destroy: function(){
            window.clearInterval(_timer);
            if (isHost || !useParent) {
                _callerWindow.parentNode.removeChild(_callerWindow);
            }
            _callerWindow = null;
        },
        onDOMReady: function(){
            isHost = config.isHost;
            pollInterval = config.interval;
            _lastMsg = "#" + config.channel;
            _msgNr = 0;
            useParent = config.useParent;
            _remoteOrigin = getLocation(config.remote);
            if (isHost) {
                apply(config.props, {
                    src: config.remote,
                    name: IFRAME_PREFIX + config.channel + "_provider"
                });
                if (useParent) {
                    config.onLoad = function(){
                        _listenerWindow = window;
                        _attachListeners();
                        pub.up.callback(true);
                    };
                }
                else {
                    var tries = 0, max = config.delay / 50;
                    (function getRef(){
                        if (++tries > max) {
                            throw new Error("Unable to reference listenerwindow");
                        }
                        try {
                            _listenerWindow = _callerWindow.contentWindow.frames[IFRAME_PREFIX + config.channel + "_consumer"];
                        } 
                        catch (ex) {
                        }
                        if (_listenerWindow) {
                            _attachListeners();
                            pub.up.callback(true);
                        }
                        else {
                            setTimeout(getRef, 50);
                        }
                    }());
                }
                _callerWindow = createFrame(config);
            }
            else {
                _listenerWindow = window;
                _attachListeners();
                if (useParent) {
                    _callerWindow = parent;
                    pub.up.callback(true);
                }
                else {
                    apply(config, {
                        props: {
                            src: config.remote + "#" + config.channel + new Date(),
                            name: IFRAME_PREFIX + config.channel + "_consumer"
                        },
                        onLoad: function(){
                            pub.up.callback(true);
                        }
                    });
                    _callerWindow = createFrame(config);
                }
            }
        },
        init: function(){
            whenReady(pub.onDOMReady, pub);
        }
    });
};
/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, debug */
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

/**
 * @class easyXDM.stack.ReliableBehavior
 * This is a behavior that tries to make the underlying transport reliable by using acknowledgements.
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The behaviors configuration.
 */
easyXDM.stack.ReliableBehavior = function(config){
    var pub, // the public interface
 callback; // the callback to execute when we have a confirmed success/failure
    var idOut = 0, idIn = 0, currentMessage = "";
    
    return (pub = {
        incoming: function(message, origin){
            var indexOf = message.indexOf("_"), ack = message.substring(0, indexOf).split(",");
            message = message.substring(indexOf + 1);
            
            if (ack[0] == idOut) {
                currentMessage = "";
                if (callback) {
                    callback(true);
                }
            }
            if (message.length > 0) {
                pub.down.outgoing(ack[1] + "," + idOut + "_" + currentMessage, origin);
                if (idIn != ack[1]) {
                    idIn = ack[1];
                    pub.up.incoming(message, origin);
                }
            }
            
        },
        outgoing: function(message, origin, fn){
            currentMessage = message;
            callback = fn;
            pub.down.outgoing(idIn + "," + (++idOut) + "_" + message, origin);
        }
    });
};
/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, debug, undef, removeFromStack*/
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

/**
 * @class easyXDM.stack.QueueBehavior
 * This is a behavior that enables queueing of messages. <br/>
 * It will buffer incoming messages and dispach these as fast as the underlying transport allows.
 * This will also fragment/defragment messages so that the outgoing message is never bigger than the
 * set length.
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The behaviors configuration. Optional.
 * @cfg {Number} maxLength The maximum length of each outgoing message. Set this to enable fragmentation.
 */
easyXDM.stack.QueueBehavior = function(config){
    var pub, queue = [], waiting = true, incoming = "", destroying, maxLength = 0, lazy = false, doFragment = false;
    
    function dispatch(){
        if (config.remove && queue.length === 0) {
            removeFromStack(pub);
            return;
        }
        if (waiting || queue.length === 0 || destroying) {
            return;
        }
        waiting = true;
        var message = queue.shift();
        
        pub.down.outgoing(message.data, message.origin, function(success){
            waiting = false;
            if (message.callback) {
                setTimeout(function(){
                    message.callback(success);
                }, 0);
            }
            dispatch();
        });
    }
    return (pub = {
        init: function(){
            if (undef(config)) {
                config = {};
            }
            if (config.maxLength) {
                maxLength = config.maxLength;
                doFragment = true;
            }
            if (config.lazy) {
                lazy = true;
            }
            else {
                pub.down.init();
            }
        },
        callback: function(success){
            waiting = false;
            var up = pub.up; // in case dispatch calls removeFromStack
            dispatch();
            up.callback(success);
        },
        incoming: function(message, origin){
            if (doFragment) {
                var indexOf = message.indexOf("_"), seq = parseInt(message.substring(0, indexOf), 10);
                incoming += message.substring(indexOf + 1);
                if (seq === 0) {
                    if (config.encode) {
                        incoming = decodeURIComponent(incoming);
                    }
                    pub.up.incoming(incoming, origin);
                    incoming = "";
                }
            }
            else {
                pub.up.incoming(message, origin);
            }
        },
        outgoing: function(message, origin, fn){
            if (config.encode) {
                message = encodeURIComponent(message);
            }
            var fragments = [], fragment;
            if (doFragment) {
                // fragment into chunks
                while (message.length !== 0) {
                    fragment = message.substring(0, maxLength);
                    message = message.substring(fragment.length);
                    fragments.push(fragment);
                }
                // enqueue the chunks
                while ((fragment = fragments.shift())) {
                    queue.push({
                        data: fragments.length + "_" + fragment,
                        origin: origin,
                        callback: fragments.length === 0 ? fn : null
                    });
                }
            }
            else {
                queue.push({
                    data: message,
                    origin: origin,
                    callback: fn
                });
            }
            if (lazy) {
                pub.down.init();
            }
            else {
                dispatch();
            }
        },
        destroy: function(){
            destroying = true;
            pub.down.destroy();
        }
    });
};
/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, undef, debug */
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

/**
 * @class easyXDM.stack.VerifyBehavior
 * This behavior will verify that communication with the remote end is possible, and will also sign all outgoing,
 * and verify all incoming messages. This removes the risk of someone hijacking the iframe to send malicious messages.
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} config The behaviors configuration.
 * @cfg {Boolean} initiate If the verification should be initiated from this end.
 */
easyXDM.stack.VerifyBehavior = function(config){
    var pub, mySecret, theirSecret, verified = false;
    
    function startVerification(){
        mySecret = Math.random().toString(16).substring(2);
        pub.down.outgoing(mySecret);
    }
    
    return (pub = {
        incoming: function(message, origin){
            var indexOf = message.indexOf("_");
            if (indexOf === -1) {
                if (message === mySecret) {
                    pub.up.callback(true);
                }
                else if (!theirSecret) {
                    theirSecret = message;
                    if (!config.initiate) {
                        startVerification();
                    }
                    pub.down.outgoing(message);
                }
            }
            else {
                if (message.substring(0, indexOf) === theirSecret) {
                    pub.up.incoming(message.substring(indexOf + 1), origin);
                }
            }
        },
        outgoing: function(message, origin, fn){
            pub.down.outgoing(mySecret + "_" + message, origin, fn);
        },
        callback: function(success){
            if (config.initiate) {
                startVerification();
            }
        }
    });
};
/*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global easyXDM, window, escape, unescape, undef, getJSON, debug, emptyFn, isArray */
//
// easyXDM
// http://easyxdm.net/
// Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

/**
 * @class easyXDM.stack.RpcBehavior
 * This uses JSON-RPC 2.0 to expose local methods and to invoke remote methods and have responses returned over the the string based transport stack.<br/>
 * Exposed methods can return values synchronous, asyncronous, or bet set up to not return anything.
 * @namespace easyXDM.stack
 * @constructor
 * @param {Object} proxy The object to apply the methods to.
 * @param {Object} config The definition of the local and remote interface to implement.
 * @cfg {Object} local The local interface to expose.
 * @cfg {Object} remote The remote methods to expose through the proxy.
 * @cfg {Object} serializer The serializer to use for serializing and deserializing the JSON. Should be compatible with the HTML5 JSON object. Optional, will default to JSON.
 */
easyXDM.stack.RpcBehavior = function(proxy, config){
    var pub, serializer = config.serializer || getJSON();
    var _callbackCounter = 0, _callbacks = {};
    
    /**
     * Serializes and sends the message
     * @private
     * @param {Object} data The JSON-RPC message to be sent. The jsonrpc property will be added.
     */
    function _send(data){
        data.jsonrpc = "2.0";
        pub.down.outgoing(serializer.stringify(data));
    }
    
    /**
     * Creates a method that implements the given definition
     * @private
     * @param {Object} The method configuration
     * @param {String} method The name of the method
     * @return {Function} A stub capable of proxying the requested method call
     */
    function _createMethod(definition, method){
        var slice = Array.prototype.slice;
        
        return function(){
            var l = arguments.length, callback, message = {
                method: method
            };
            
            if (l > 0 && typeof arguments[l - 1] === "function") {
                //with callback, procedure
                if (l > 1 && typeof arguments[l - 2] === "function") {
                    // two callbacks, success and error
                    callback = {
                        success: arguments[l - 2],
                        error: arguments[l - 1]
                    };
                    message.params = slice.call(arguments, 0, l - 2);
                }
                else {
                    // single callback, success
                    callback = {
                        success: arguments[l - 1]
                    };
                    message.params = slice.call(arguments, 0, l - 1);
                }
                _callbacks["" + (++_callbackCounter)] = callback;
                message.id = _callbackCounter;
            }
            else {
                // no callbacks, a notification
                message.params = slice.call(arguments, 0);
            }
            if (definition.namedParams && message.params.length === 1) {
                message.params = message.params[0];
            }
            // Send the method request
            _send(message);
        };
    }
    
    /**
     * Executes the exposed method
     * @private
     * @param {String} method The name of the method
     * @param {Number} id The callback id to use
     * @param {Function} method The exposed implementation
     * @param {Array} params The parameters supplied by the remote end
     */
    function _executeMethod(method, id, fn, params){
        if (!fn) {
            if (id) {
                _send({
                    id: id,
                    error: {
                        code: -32601,
                        message: "Procedure not found."
                    }
                });
            }
            return;
        }
        
        var success, error;
        if (id) {
            success = function(result){
                success = emptyFn;
                _send({
                    id: id,
                    result: result
                });
            };
            error = function(message, data){
                error = emptyFn;
                var msg = {
                    id: id,
                    error: {
                        code: -32099,
                        message: message
                    }
                };
                if (data) {
                    msg.error.data = data;
                }
                _send(msg);
            };
        }
        else {
            success = error = emptyFn;
        }
        // Call local method
        if (!isArray(params)) {
            params = [params];
        }
        try {
            var result = fn.method.apply(fn.scope, params.concat([success, error]));
            if (!undef(result)) {
                success(result);
            }
        } 
        catch (ex1) {
            error(ex1.message);
        }
    }
    
    return (pub = {
        incoming: function(message, origin){
            var data = serializer.parse(message);
            if (data.method) {
                // A method call from the remote end
                if (config.handle) {
                    config.handle(data, _send);
                }
                else {
                    _executeMethod(data.method, data.id, config.local[data.method], data.params);
                }
            }
            else {
                // A method response from the other end
                var callback = _callbacks[data.id];
                if (data.error) {
                    if (callback.error) {
                        callback.error(data.error);
                    }
                }
                else if (callback.success) {
                    callback.success(data.result);
                }
                delete _callbacks[data.id];
            }
        },
        init: function(){
            if (config.remote) {
                // Implement the remote sides exposed methods
                for (var method in config.remote) {
                    if (config.remote.hasOwnProperty(method)) {
                        proxy[method] = _createMethod(config.remote[method], method);
                    }
                }
            }
            pub.down.init();
        },
        destroy: function(){
            for (var method in config.remote) {
                if (config.remote.hasOwnProperty(method) && proxy.hasOwnProperty(method)) {
                    delete proxy[method];
                }
            }
            pub.down.destroy();
        }
    });
};
global.easyXDM = easyXDM;
})(window, document, location, window.setTimeout, decodeURIComponent, encodeURIComponent);

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

var XLApi = require('./xlapi');
require('./easyXDM');
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
    self._options.locale = options.locale || 'en';

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
            var width = options.width || 200;
            var height = options.height || 400;

            // var styleString = 'boreder:none';
            var src = 'http://localhost:8080/home/?projectId=' + XL.getProjectId() + '&locale=' + window.__xl._options.locale;

            var redirectUrl = XL.getRedirectURL();
            if (redirectUrl) {
                src = src + '&redirectUrl='+encodeURIComponent(redirectUrl);
            }

            // var widgetHtml = '<iframe frameborder="0" width="'+width+'" height="'+height+'"  src="'+src+'">Not supported</iframe>';
            var widgetIframe = document.createElement('iframe');
            widgetIframe.onload = function () {
                element.removeChild(preloader);
                widgetIframe.style.width = width+'px';
                widgetIframe.style.height = height+'px';
            };
            widgetIframe.style.width = 0;
            widgetIframe.style.height = 0;
            widgetIframe.frameBorder = '0';
            widgetIframe.src = src;


            var preloader = document.createElement('div');
            preloader.innerHTML = 'Loading...';

            var element = document.getElementById(elementId);
            if (element) {
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
},{"./easyXDM":1,"./xlapi":2}]},{},["main"])("main")
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZWFzeVhETS5qcyIsInNyYy94bGFwaS5qcyIsInNyYy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xpRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIGVhc3lYRE1cbiAqIGh0dHA6Ly9lYXN5eGRtLm5ldC9cbiAqIENvcHlyaWdodChjKSAyMDA5LTIwMTEsIMOYeXZpbmQgU2VhbiBLaW5zZXksIG95dmluZEBraW5zZXkubm8uXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuKGZ1bmN0aW9uICh3aW5kb3csIGRvY3VtZW50LCBsb2NhdGlvbiwgc2V0VGltZW91dCwgZGVjb2RlVVJJQ29tcG9uZW50LCBlbmNvZGVVUklDb21wb25lbnQpIHtcbi8qanNsaW50IGV2aWw6IHRydWUsIGJyb3dzZXI6IHRydWUsIGltbWVkOiB0cnVlLCBwYXNzZmFpbDogdHJ1ZSwgdW5kZWY6IHRydWUsIG5ld2NhcDogdHJ1ZSovXG4vKmdsb2JhbCBKU09OLCBYTUxIdHRwUmVxdWVzdCwgd2luZG93LCBlc2NhcGUsIHVuZXNjYXBlLCBBY3RpdmVYT2JqZWN0ICovXG4vL1xuLy8gZWFzeVhETVxuLy8gaHR0cDovL2Vhc3l4ZG0ubmV0L1xuLy8gQ29weXJpZ2h0KGMpIDIwMDktMjAxMSwgw5h5dmluZCBTZWFuIEtpbnNleSwgb3l2aW5kQGtpbnNleS5uby5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4vLyBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4vLyBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4vLyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4vLyBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi8vIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4vLyBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4vLyBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuLy8gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuLy8gVEhFIFNPRlRXQVJFLlxuLy9cblxudmFyIGdsb2JhbCA9IHRoaXM7XG52YXIgY2hhbm5lbElkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDApOyAvLyByYW5kb21pemUgdGhlIGluaXRpYWwgaWQgaW4gY2FzZSBvZiBtdWx0aXBsZSBjbG9zdXJlcyBsb2FkZWQgXG52YXIgZW1wdHlGbiA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcbnZhciByZVVSSSA9IC9eKChodHRwLj86KVxcL1xcLyhbXjpcXC9cXHNdKykoOlxcZCspKikvOyAvLyByZXR1cm5zIGdyb3VwcyBmb3IgcHJvdG9jb2wgKDIpLCBkb21haW4gKDMpIGFuZCBwb3J0ICg0KSBcbnZhciByZVBhcmVudCA9IC9bXFwtXFx3XStcXC9cXC5cXC5cXC8vOyAvLyBtYXRjaGVzIGEgZm9vLy4uLyBleHByZXNzaW9uIFxudmFyIHJlRG91YmxlU2xhc2ggPSAvKFteOl0pXFwvXFwvL2c7IC8vIG1hdGNoZXMgLy8gYW55d2hlcmUgYnV0IGluIHRoZSBwcm90b2NvbFxudmFyIG5hbWVzcGFjZSA9IFwiXCI7IC8vIHN0b3JlcyBuYW1lc3BhY2UgdW5kZXIgd2hpY2ggZWFzeVhETSBvYmplY3QgaXMgc3RvcmVkIG9uIHRoZSBwYWdlIChlbXB0eSBpZiBvYmplY3QgaXMgZ2xvYmFsKVxudmFyIGVhc3lYRE0gPSB7fTtcbnZhciBfZWFzeVhETSA9IHdpbmRvdy5lYXN5WERNOyAvLyBtYXAgb3ZlciBnbG9iYWwgZWFzeVhETSBpbiBjYXNlIG9mIG92ZXJ3cml0ZVxudmFyIElGUkFNRV9QUkVGSVggPSBcImVhc3lYRE1fXCI7XG52YXIgSEFTX05BTUVfUFJPUEVSVFlfQlVHO1xudmFyIHVzZUhhc2ggPSBmYWxzZTsgLy8gd2hldGhlciB0byB1c2UgdGhlIGhhc2ggb3ZlciB0aGUgcXVlcnlcbnZhciBmbGFzaFZlcnNpb247IC8vIHdpbGwgYmUgc2V0IGlmIHVzaW5nIGZsYXNoXG52YXIgSEFTX0ZMQVNIX1RIUk9UVExFRF9CVUc7XG5cblxuLy8gaHR0cDovL3BldGVyLm1pY2hhdXguY2EvYXJ0aWNsZXMvZmVhdHVyZS1kZXRlY3Rpb24tc3RhdGUtb2YtdGhlLWFydC1icm93c2VyLXNjcmlwdGluZ1xuZnVuY3Rpb24gaXNIb3N0TWV0aG9kKG9iamVjdCwgcHJvcGVydHkpe1xuICAgIHZhciB0ID0gdHlwZW9mIG9iamVjdFtwcm9wZXJ0eV07XG4gICAgcmV0dXJuIHQgPT0gJ2Z1bmN0aW9uJyB8fFxuICAgICghISh0ID09ICdvYmplY3QnICYmIG9iamVjdFtwcm9wZXJ0eV0pKSB8fFxuICAgIHQgPT0gJ3Vua25vd24nO1xufVxuXG5mdW5jdGlvbiBpc0hvc3RPYmplY3Qob2JqZWN0LCBwcm9wZXJ0eSl7XG4gICAgcmV0dXJuICEhKHR5cGVvZihvYmplY3RbcHJvcGVydHldKSA9PSAnb2JqZWN0JyAmJiBvYmplY3RbcHJvcGVydHldKTtcbn1cblxuLy8gZW5kXG5cbi8vIGh0dHA6Ly9wZXJmZWN0aW9ua2lsbHMuY29tL2luc3RhbmNlb2YtY29uc2lkZXJlZC1oYXJtZnVsLW9yLWhvdy10by13cml0ZS1hLXJvYnVzdC1pc2FycmF5L1xuZnVuY3Rpb24gaXNBcnJheShvKXtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pID09PSAnW29iamVjdCBBcnJheV0nO1xufVxuXG4vLyBlbmRcbmZ1bmN0aW9uIGhhc0ZsYXNoKCl7XG4gICAgdmFyIG5hbWUgPSBcIlNob2Nrd2F2ZSBGbGFzaFwiLCBtaW1lVHlwZSA9IFwiYXBwbGljYXRpb24veC1zaG9ja3dhdmUtZmxhc2hcIjtcbiAgICBcbiAgICBpZiAoIXVuZGVmKG5hdmlnYXRvci5wbHVnaW5zKSAmJiB0eXBlb2YgbmF2aWdhdG9yLnBsdWdpbnNbbmFtZV0gPT0gXCJvYmplY3RcIikge1xuICAgICAgICAvLyBhZGFwdGVkIGZyb20gdGhlIHN3Zm9iamVjdCBjb2RlXG4gICAgICAgIHZhciBkZXNjcmlwdGlvbiA9IG5hdmlnYXRvci5wbHVnaW5zW25hbWVdLmRlc2NyaXB0aW9uO1xuICAgICAgICBpZiAoZGVzY3JpcHRpb24gJiYgIXVuZGVmKG5hdmlnYXRvci5taW1lVHlwZXMpICYmIG5hdmlnYXRvci5taW1lVHlwZXNbbWltZVR5cGVdICYmIG5hdmlnYXRvci5taW1lVHlwZXNbbWltZVR5cGVdLmVuYWJsZWRQbHVnaW4pIHtcbiAgICAgICAgICAgIGZsYXNoVmVyc2lvbiA9IGRlc2NyaXB0aW9uLm1hdGNoKC9cXGQrL2cpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICghZmxhc2hWZXJzaW9uKSB7XG4gICAgICAgIHZhciBmbGFzaDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZsYXNoID0gbmV3IEFjdGl2ZVhPYmplY3QoXCJTaG9ja3dhdmVGbGFzaC5TaG9ja3dhdmVGbGFzaFwiKTtcbiAgICAgICAgICAgIGZsYXNoVmVyc2lvbiA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZsYXNoLkdldFZhcmlhYmxlKFwiJHZlcnNpb25cIikubWF0Y2goLyhcXGQrKSwoXFxkKyksKFxcZCspLChcXGQrKS8pLCAxKTtcbiAgICAgICAgICAgIGZsYXNoID0gbnVsbDtcbiAgICAgICAgfSBcbiAgICAgICAgY2F0Y2ggKG5vdFN1cHBvcnRlZEV4Y2VwdGlvbikge1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICghZmxhc2hWZXJzaW9uKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIG1ham9yID0gcGFyc2VJbnQoZmxhc2hWZXJzaW9uWzBdLCAxMCksIG1pbm9yID0gcGFyc2VJbnQoZmxhc2hWZXJzaW9uWzFdLCAxMCk7XG4gICAgSEFTX0ZMQVNIX1RIUk9UVExFRF9CVUcgPSBtYWpvciA+IDkgJiYgbWlub3IgPiAwO1xuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKlxuICogQ3Jvc3MgQnJvd3NlciBpbXBsZW1lbnRhdGlvbiBmb3IgYWRkaW5nIGFuZCByZW1vdmluZyBldmVudCBsaXN0ZW5lcnMuXG4gKi9cbnZhciBvbiwgdW47XG5pZiAoaXNIb3N0TWV0aG9kKHdpbmRvdywgXCJhZGRFdmVudExpc3RlbmVyXCIpKSB7XG4gICAgb24gPSBmdW5jdGlvbih0YXJnZXQsIHR5cGUsIGxpc3RlbmVyKXtcbiAgICAgICAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgICB9O1xuICAgIHVuID0gZnVuY3Rpb24odGFyZ2V0LCB0eXBlLCBsaXN0ZW5lcil7XG4gICAgICAgIHRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCBmYWxzZSk7XG4gICAgfTtcbn1cbmVsc2UgaWYgKGlzSG9zdE1ldGhvZCh3aW5kb3csIFwiYXR0YWNoRXZlbnRcIikpIHtcbiAgICBvbiA9IGZ1bmN0aW9uKG9iamVjdCwgc0V2ZW50LCBmcE5vdGlmeSl7XG4gICAgICAgIG9iamVjdC5hdHRhY2hFdmVudChcIm9uXCIgKyBzRXZlbnQsIGZwTm90aWZ5KTtcbiAgICB9O1xuICAgIHVuID0gZnVuY3Rpb24ob2JqZWN0LCBzRXZlbnQsIGZwTm90aWZ5KXtcbiAgICAgICAgb2JqZWN0LmRldGFjaEV2ZW50KFwib25cIiArIHNFdmVudCwgZnBOb3RpZnkpO1xuICAgIH07XG59XG5lbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJCcm93c2VyIG5vdCBzdXBwb3J0ZWRcIik7XG59XG5cbi8qXG4gKiBDcm9zcyBCcm93c2VyIGltcGxlbWVudGF0aW9uIG9mIERPTUNvbnRlbnRMb2FkZWQuXG4gKi9cbnZhciBkb21Jc1JlYWR5ID0gZmFsc2UsIGRvbVJlYWR5UXVldWUgPSBbXSwgcmVhZHlTdGF0ZTtcbmlmIChcInJlYWR5U3RhdGVcIiBpbiBkb2N1bWVudCkge1xuICAgIC8vIElmIGJyb3dzZXIgaXMgV2ViS2l0LXBvd2VyZWQsIGNoZWNrIGZvciBib3RoICdsb2FkZWQnIChsZWdhY3kgYnJvd3NlcnMpIGFuZFxuICAgIC8vICdpbnRlcmFjdGl2ZScgKEhUTUw1IHNwZWNzLCByZWNlbnQgV2ViS2l0IGJ1aWxkcykgc3RhdGVzLlxuICAgIC8vIGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD00NTExOVxuICAgIHJlYWR5U3RhdGUgPSBkb2N1bWVudC5yZWFkeVN0YXRlO1xuICAgIGRvbUlzUmVhZHkgPSByZWFkeVN0YXRlID09IFwiY29tcGxldGVcIiB8fCAofiBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ0FwcGxlV2ViS2l0LycpICYmIChyZWFkeVN0YXRlID09IFwibG9hZGVkXCIgfHwgcmVhZHlTdGF0ZSA9PSBcImludGVyYWN0aXZlXCIpKTtcbn1cbmVsc2Uge1xuICAgIC8vIElmIHJlYWR5U3RhdGUgaXMgbm90IHN1cHBvcnRlZCBpbiB0aGUgYnJvd3NlciwgdGhlbiBpbiBvcmRlciB0byBiZSBhYmxlIHRvIGZpcmUgd2hlblJlYWR5IGZ1bmN0aW9ucyBhcHJvcHJpYXRlbHlcbiAgICAvLyB3aGVuIGFkZGVkIGR5bmFtaWNhbGx5IF9hZnRlcl8gRE9NIGxvYWQsIHdlIGhhdmUgdG8gZGVkdWNlIHdldGhlciB0aGUgRE9NIGlzIHJlYWR5IG9yIG5vdC5cbiAgICAvLyBXZSBvbmx5IG5lZWQgYSBib2R5IHRvIGFkZCBlbGVtZW50cyB0bywgc28gdGhlIGV4aXN0ZW5jZSBvZiBkb2N1bWVudC5ib2R5IGlzIGVub3VnaCBmb3IgdXMuXG4gICAgZG9tSXNSZWFkeSA9ICEhZG9jdW1lbnQuYm9keTtcbn1cblxuZnVuY3Rpb24gZG9tX29uUmVhZHkoKXtcbiAgICBpZiAoZG9tSXNSZWFkeSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRvbUlzUmVhZHkgPSB0cnVlO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZG9tUmVhZHlRdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICBkb21SZWFkeVF1ZXVlW2ldKCk7XG4gICAgfVxuICAgIGRvbVJlYWR5UXVldWUubGVuZ3RoID0gMDtcbn1cblxuXG5pZiAoIWRvbUlzUmVhZHkpIHtcbiAgICBpZiAoaXNIb3N0TWV0aG9kKHdpbmRvdywgXCJhZGRFdmVudExpc3RlbmVyXCIpKSB7XG4gICAgICAgIG9uKGRvY3VtZW50LCBcIkRPTUNvbnRlbnRMb2FkZWRcIiwgZG9tX29uUmVhZHkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgb24oZG9jdW1lbnQsIFwicmVhZHlzdGF0ZWNoYW5nZVwiLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT0gXCJjb21wbGV0ZVwiKSB7XG4gICAgICAgICAgICAgICAgZG9tX29uUmVhZHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZG9TY3JvbGwgJiYgd2luZG93ID09PSB0b3ApIHtcbiAgICAgICAgICAgIHZhciBkb1Njcm9sbENoZWNrID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoZG9tSXNSZWFkeSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGh0dHA6Ly9qYXZhc2NyaXB0Lm53Ym94LmNvbS9JRUNvbnRlbnRMb2FkZWQvXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmRvU2Nyb2xsKFwibGVmdFwiKTtcbiAgICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZG9TY3JvbGxDaGVjaywgMSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZG9tX29uUmVhZHkoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBkb1Njcm9sbENoZWNrKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy8gQSBmYWxsYmFjayB0byB3aW5kb3cub25sb2FkLCB0aGF0IHdpbGwgYWx3YXlzIHdvcmtcbiAgICBvbih3aW5kb3csIFwibG9hZFwiLCBkb21fb25SZWFkeSk7XG59XG4vKipcbiAqIFRoaXMgd2lsbCBhZGQgYSBmdW5jdGlvbiB0byB0aGUgcXVldWUgb2YgZnVuY3Rpb25zIHRvIGJlIHJ1biBvbmNlIHRoZSBET00gcmVhY2hlcyBhIHJlYWR5IHN0YXRlLlxuICogSWYgZnVuY3Rpb25zIGFyZSBhZGRlZCBhZnRlciB0aGlzIGV2ZW50IHRoZW4gdGhleSB3aWxsIGJlIGV4ZWN1dGVkIGltbWVkaWF0ZWx5LlxuICogQHBhcmFtIHtmdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uIHRvIGFkZFxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlIEFuIG9wdGlvbmFsIHNjb3BlIGZvciB0aGUgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGguXG4gKi9cbmZ1bmN0aW9uIHdoZW5SZWFkeShmbiwgc2NvcGUpe1xuICAgIGlmIChkb21Jc1JlYWR5KSB7XG4gICAgICAgIGZuLmNhbGwoc2NvcGUpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRvbVJlYWR5UXVldWUucHVzaChmdW5jdGlvbigpe1xuICAgICAgICBmbi5jYWxsKHNjb3BlKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIGluc3RhbmNlIG9mIGVhc3lYRE0gZnJvbSB0aGUgcGFyZW50IHdpbmRvdyB3aXRoXG4gKiByZXNwZWN0IHRvIHRoZSBuYW1lc3BhY2UuXG4gKlxuICogQHJldHVybiBBbiBpbnN0YW5jZSBvZiBlYXN5WERNIChpbiB0aGUgcGFyZW50IHdpbmRvdylcbiAqL1xuZnVuY3Rpb24gZ2V0UGFyZW50T2JqZWN0KCl7XG4gICAgdmFyIG9iaiA9IHBhcmVudDtcbiAgICBpZiAobmFtZXNwYWNlICE9PSBcIlwiKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IG5hbWVzcGFjZS5zcGxpdChcIi5cIik7IGkgPCBpaS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgb2JqID0gb2JqW2lpW2ldXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqLmVhc3lYRE07XG59XG5cbi8qKlxuICogUmVtb3ZlcyBlYXN5WERNIHZhcmlhYmxlIGZyb20gdGhlIGdsb2JhbCBzY29wZS4gSXQgYWxzbyByZXR1cm5zIGNvbnRyb2xcbiAqIG9mIHRoZSBlYXN5WERNIHZhcmlhYmxlIHRvIHdoYXRldmVyIGNvZGUgdXNlZCBpdCBiZWZvcmUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5zIEEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGFuIG9iamVjdCB0aGF0IHdpbGwgaG9sZFxuICogICAgICAgICAgICAgICAgICAgIGFuIGluc3RhbmNlIG9mIGVhc3lYRE0uXG4gKiBAcmV0dXJuIEFuIGluc3RhbmNlIG9mIGVhc3lYRE1cbiAqL1xuZnVuY3Rpb24gbm9Db25mbGljdChucyl7XG4gICAgXG4gICAgd2luZG93LmVhc3lYRE0gPSBfZWFzeVhETTtcbiAgICBuYW1lc3BhY2UgPSBucztcbiAgICBpZiAobmFtZXNwYWNlKSB7XG4gICAgICAgIElGUkFNRV9QUkVGSVggPSBcImVhc3lYRE1fXCIgKyBuYW1lc3BhY2UucmVwbGFjZShcIi5cIiwgXCJfXCIpICsgXCJfXCI7XG4gICAgfVxuICAgIHJldHVybiBlYXN5WERNO1xufVxuXG4vKlxuICogTWV0aG9kcyBmb3Igd29ya2luZyB3aXRoIFVSTHNcbiAqL1xuLyoqXG4gKiBHZXQgdGhlIGRvbWFpbiBuYW1lIGZyb20gYSB1cmwuXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsIFRoZSB1cmwgdG8gZXh0cmFjdCB0aGUgZG9tYWluIGZyb20uXG4gKiBAcmV0dXJuIFRoZSBkb21haW4gcGFydCBvZiB0aGUgdXJsLlxuICogQHR5cGUge1N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZ2V0RG9tYWluTmFtZSh1cmwpe1xuICAgIHJldHVybiB1cmwubWF0Y2gocmVVUkkpWzNdO1xufVxuXG4vKipcbiAqIEdldCB0aGUgcG9ydCBmb3IgYSBnaXZlbiBVUkwsIG9yIFwiXCIgaWYgbm9uZVxuICogQHBhcmFtIHtTdHJpbmd9IHVybCBUaGUgdXJsIHRvIGV4dHJhY3QgdGhlIHBvcnQgZnJvbS5cbiAqIEByZXR1cm4gVGhlIHBvcnQgcGFydCBvZiB0aGUgdXJsLlxuICogQHR5cGUge1N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZ2V0UG9ydCh1cmwpe1xuICAgIHJldHVybiB1cmwubWF0Y2gocmVVUkkpWzRdIHx8IFwiXCI7XG59XG5cbi8qKlxuICogUmV0dXJucyAgYSBzdHJpbmcgY29udGFpbmluZyB0aGUgc2NoZW1hLCBkb21haW4gYW5kIGlmIHByZXNlbnQgdGhlIHBvcnRcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVGhlIHVybCB0byBleHRyYWN0IHRoZSBsb2NhdGlvbiBmcm9tXG4gKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBsb2NhdGlvbiBwYXJ0IG9mIHRoZSB1cmxcbiAqL1xuZnVuY3Rpb24gZ2V0TG9jYXRpb24odXJsKXtcbiAgICB2YXIgbSA9IHVybC50b0xvd2VyQ2FzZSgpLm1hdGNoKHJlVVJJKTtcbiAgICB2YXIgcHJvdG8gPSBtWzJdLCBkb21haW4gPSBtWzNdLCBwb3J0ID0gbVs0XSB8fCBcIlwiO1xuICAgIGlmICgocHJvdG8gPT0gXCJodHRwOlwiICYmIHBvcnQgPT0gXCI6ODBcIikgfHwgKHByb3RvID09IFwiaHR0cHM6XCIgJiYgcG9ydCA9PSBcIjo0NDNcIikpIHtcbiAgICAgICAgcG9ydCA9IFwiXCI7XG4gICAgfVxuICAgIHJldHVybiBwcm90byArIFwiLy9cIiArIGRvbWFpbiArIHBvcnQ7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgYSByZWxhdGl2ZSB1cmwgaW50byBhbiBhYnNvbHV0ZSBvbmUuXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsIFRoZSBwYXRoIHRvIHJlc29sdmUuXG4gKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSByZXNvbHZlZCB1cmwuXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVVcmwodXJsKXtcbiAgICBcbiAgICAvLyByZXBsYWNlIGFsbCAvLyBleGNlcHQgdGhlIG9uZSBpbiBwcm90byB3aXRoIC9cbiAgICB1cmwgPSB1cmwucmVwbGFjZShyZURvdWJsZVNsYXNoLCBcIiQxL1wiKTtcbiAgICBcbiAgICAvLyBJZiB0aGUgdXJsIGlzIGEgdmFsaWQgdXJsIHdlIGRvIG5vdGhpbmdcbiAgICBpZiAoIXVybC5tYXRjaCgvXihodHRwfHxodHRwcyk6XFwvXFwvLykpIHtcbiAgICAgICAgLy8gSWYgdGhpcyBpcyBhIHJlbGF0aXZlIHBhdGhcbiAgICAgICAgdmFyIHBhdGggPSAodXJsLnN1YnN0cmluZygwLCAxKSA9PT0gXCIvXCIpID8gXCJcIiA6IGxvY2F0aW9uLnBhdGhuYW1lO1xuICAgICAgICBpZiAocGF0aC5zdWJzdHJpbmcocGF0aC5sZW5ndGggLSAxKSAhPT0gXCIvXCIpIHtcbiAgICAgICAgICAgIHBhdGggPSBwYXRoLnN1YnN0cmluZygwLCBwYXRoLmxhc3RJbmRleE9mKFwiL1wiKSArIDEpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB1cmwgPSBsb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIGxvY2F0aW9uLmhvc3QgKyBwYXRoICsgdXJsO1xuICAgIH1cbiAgICBcbiAgICAvLyByZWR1Y2UgYWxsICd4eXovLi4vJyB0byBqdXN0ICcnIFxuICAgIHdoaWxlIChyZVBhcmVudC50ZXN0KHVybCkpIHtcbiAgICAgICAgdXJsID0gdXJsLnJlcGxhY2UocmVQYXJlbnQsIFwiXCIpO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gdXJsO1xufVxuXG4vKipcbiAqIEFwcGVuZHMgdGhlIHBhcmFtZXRlcnMgdG8gdGhlIGdpdmVuIHVybC48YnIvPlxuICogVGhlIGJhc2UgdXJsIGNhbiBjb250YWluIGV4aXN0aW5nIHF1ZXJ5IHBhcmFtZXRlcnMuXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsIFRoZSBiYXNlIHVybC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbWV0ZXJzIFRoZSBwYXJhbWV0ZXJzIHRvIGFkZC5cbiAqIEByZXR1cm4ge1N0cmluZ30gQSBuZXcgdmFsaWQgdXJsIHdpdGggdGhlIHBhcmFtZXRlcnMgYXBwZW5kZWQuXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZFF1ZXJ5UGFyYW1ldGVycyh1cmwsIHBhcmFtZXRlcnMpe1xuICAgIFxuICAgIHZhciBoYXNoID0gXCJcIiwgaW5kZXhPZiA9IHVybC5pbmRleE9mKFwiI1wiKTtcbiAgICBpZiAoaW5kZXhPZiAhPT0gLTEpIHtcbiAgICAgICAgaGFzaCA9IHVybC5zdWJzdHJpbmcoaW5kZXhPZik7XG4gICAgICAgIHVybCA9IHVybC5zdWJzdHJpbmcoMCwgaW5kZXhPZik7XG4gICAgfVxuICAgIHZhciBxID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIHBhcmFtZXRlcnMpIHtcbiAgICAgICAgaWYgKHBhcmFtZXRlcnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgcS5wdXNoKGtleSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtZXRlcnNba2V5XSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1cmwgKyAodXNlSGFzaCA/IFwiI1wiIDogKHVybC5pbmRleE9mKFwiP1wiKSA9PSAtMSA/IFwiP1wiIDogXCImXCIpKSArIHEuam9pbihcIiZcIikgKyBoYXNoO1xufVxuXG5cbi8vIGJ1aWxkIHRoZSBxdWVyeSBvYmplY3QgZWl0aGVyIGZyb20gbG9jYXRpb24ucXVlcnksIGlmIGl0IGNvbnRhaW5zIHRoZSB4ZG1fZSBhcmd1bWVudCwgb3IgZnJvbSBsb2NhdGlvbi5oYXNoXG52YXIgcXVlcnkgPSAoZnVuY3Rpb24oaW5wdXQpe1xuICAgIGlucHV0ID0gaW5wdXQuc3Vic3RyaW5nKDEpLnNwbGl0KFwiJlwiKTtcbiAgICB2YXIgZGF0YSA9IHt9LCBwYWlyLCBpID0gaW5wdXQubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgcGFpciA9IGlucHV0W2ldLnNwbGl0KFwiPVwiKTtcbiAgICAgICAgZGF0YVtwYWlyWzBdXSA9IGRlY29kZVVSSUNvbXBvbmVudChwYWlyWzFdKTtcbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG59KC94ZG1fZT0vLnRlc3QobG9jYXRpb24uc2VhcmNoKSA/IGxvY2F0aW9uLnNlYXJjaCA6IGxvY2F0aW9uLmhhc2gpKTtcblxuLypcbiAqIEhlbHBlciBtZXRob2RzXG4gKi9cbi8qKlxuICogSGVscGVyIGZvciBjaGVja2luZyBpZiBhIHZhcmlhYmxlL3Byb3BlcnR5IGlzIHVuZGVmaW5lZFxuICogQHBhcmFtIHtPYmplY3R9IHYgVGhlIHZhcmlhYmxlIHRvIHRlc3RcbiAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIHBhc3NlZCB2YXJpYWJsZSBpcyB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gdW5kZWYodil7XG4gICAgcmV0dXJuIHR5cGVvZiB2ID09PSBcInVuZGVmaW5lZFwiO1xufVxuXG4vKipcbiAqIEEgc2FmZSBpbXBsZW1lbnRhdGlvbiBvZiBIVE1MNSBKU09OLiBGZWF0dXJlIHRlc3RpbmcgaXMgdXNlZCB0byBtYWtlIHN1cmUgdGhlIGltcGxlbWVudGF0aW9uIHdvcmtzLlxuICogQHJldHVybiB7SlNPTn0gQSB2YWxpZCBKU09OIGNvbmZvcm1pbmcgb2JqZWN0LCBvciBudWxsIGlmIG5vdCBmb3VuZC5cbiAqL1xudmFyIGdldEpTT04gPSBmdW5jdGlvbigpe1xuICAgIHZhciBjYWNoZWQgPSB7fTtcbiAgICB2YXIgb2JqID0ge1xuICAgICAgICBhOiBbMSwgMiwgM11cbiAgICB9LCBqc29uID0gXCJ7XFxcImFcXFwiOlsxLDIsM119XCI7XG4gICAgXG4gICAgaWYgKHR5cGVvZiBKU09OICE9IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIEpTT04uc3RyaW5naWZ5ID09PSBcImZ1bmN0aW9uXCIgJiYgSlNPTi5zdHJpbmdpZnkob2JqKS5yZXBsYWNlKCgvXFxzL2cpLCBcIlwiKSA9PT0ganNvbikge1xuICAgICAgICAvLyB0aGlzIGlzIGEgd29ya2luZyBKU09OIGluc3RhbmNlXG4gICAgICAgIHJldHVybiBKU09OO1xuICAgIH1cbiAgICBpZiAoT2JqZWN0LnRvSlNPTikge1xuICAgICAgICBpZiAoT2JqZWN0LnRvSlNPTihvYmopLnJlcGxhY2UoKC9cXHMvZyksIFwiXCIpID09PSBqc29uKSB7XG4gICAgICAgICAgICAvLyB0aGlzIGlzIGEgd29ya2luZyBzdHJpbmdpZnkgbWV0aG9kXG4gICAgICAgICAgICBjYWNoZWQuc3RyaW5naWZ5ID0gT2JqZWN0LnRvSlNPTjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZiAodHlwZW9mIFN0cmluZy5wcm90b3R5cGUuZXZhbEpTT04gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBvYmogPSBqc29uLmV2YWxKU09OKCk7XG4gICAgICAgIGlmIChvYmouYSAmJiBvYmouYS5sZW5ndGggPT09IDMgJiYgb2JqLmFbMl0gPT09IDMpIHtcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgYSB3b3JraW5nIHBhcnNlIG1ldGhvZCAgICAgICAgICAgXG4gICAgICAgICAgICBjYWNoZWQucGFyc2UgPSBmdW5jdGlvbihzdHIpe1xuICAgICAgICAgICAgICAgIHJldHVybiBzdHIuZXZhbEpTT04oKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaWYgKGNhY2hlZC5zdHJpbmdpZnkgJiYgY2FjaGVkLnBhcnNlKSB7XG4gICAgICAgIC8vIE9ubHkgbWVtb2l6ZSB0aGUgcmVzdWx0IGlmIHdlIGhhdmUgdmFsaWQgaW5zdGFuY2VcbiAgICAgICAgZ2V0SlNPTiA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gY2FjaGVkO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn07XG5cbi8qKlxuICogQXBwbGllcyBwcm9wZXJ0aWVzIGZyb20gdGhlIHNvdXJjZSBvYmplY3QgdG8gdGhlIHRhcmdldCBvYmplY3QuPGJyLz5cbiAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXQgVGhlIHRhcmdldCBvZiB0aGUgcHJvcGVydGllcy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBzb3VyY2UgVGhlIHNvdXJjZSBvZiB0aGUgcHJvcGVydGllcy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gbm9PdmVyd3JpdGUgU2V0IHRvIFRydWUgdG8gb25seSBzZXQgbm9uLWV4aXN0aW5nIHByb3BlcnRpZXMuXG4gKi9cbmZ1bmN0aW9uIGFwcGx5KGRlc3RpbmF0aW9uLCBzb3VyY2UsIG5vT3ZlcndyaXRlKXtcbiAgICB2YXIgbWVtYmVyO1xuICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgIGlmIChwcm9wIGluIGRlc3RpbmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgbWVtYmVyID0gc291cmNlW3Byb3BdO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVtYmVyID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcGx5KGRlc3RpbmF0aW9uW3Byb3BdLCBtZW1iZXIsIG5vT3ZlcndyaXRlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoIW5vT3ZlcndyaXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlc3RpbmF0aW9uW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlc3RpbmF0aW9uW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZXN0aW5hdGlvbjtcbn1cblxuLy8gVGhpcyB0ZXN0cyBmb3IgdGhlIGJ1ZyBpbiBJRSB3aGVyZSBzZXR0aW5nIHRoZSBbbmFtZV0gcHJvcGVydHkgdXNpbmcgamF2YXNjcmlwdCBjYXVzZXMgdGhlIHZhbHVlIHRvIGJlIHJlZGlyZWN0ZWQgaW50byBbc3VibWl0TmFtZV0uXG5mdW5jdGlvbiB0ZXN0Rm9yTmFtZVByb3BlcnR5QnVnKCl7XG4gICAgdmFyIGZvcm0gPSBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJmb3JtXCIpKSwgaW5wdXQgPSBmb3JtLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKSk7XG4gICAgaW5wdXQubmFtZSA9IElGUkFNRV9QUkVGSVggKyBcIlRFU1RcIiArIGNoYW5uZWxJZDsgLy8gYXBwZW5kIGNoYW5uZWxJZCBpbiBvcmRlciB0byBhdm9pZCBjYWNoaW5nIGlzc3Vlc1xuICAgIEhBU19OQU1FX1BST1BFUlRZX0JVRyA9IGlucHV0ICE9PSBmb3JtLmVsZW1lbnRzW2lucHV0Lm5hbWVdO1xuICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoZm9ybSk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZyYW1lIGFuZCBhcHBlbmRzIGl0IHRvIHRoZSBET00uXG4gKiBAcGFyYW0gY29uZmlnIHtvYmplY3R9IFRoaXMgb2JqZWN0IGNhbiBoYXZlIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllc1xuICogPHVsPlxuICogPGxpPiB7b2JqZWN0fSBwcm9wIFRoZSBwcm9wZXJ0aWVzIHRoYXQgc2hvdWxkIGJlIHNldCBvbiB0aGUgZnJhbWUuIFRoaXMgc2hvdWxkIGluY2x1ZGUgdGhlICdzcmMnIHByb3BlcnR5LjwvbGk+XG4gKiA8bGk+IHtvYmplY3R9IGF0dHIgVGhlIGF0dHJpYnV0ZXMgdGhhdCBzaG91bGQgYmUgc2V0IG9uIHRoZSBmcmFtZS48L2xpPlxuICogPGxpPiB7RE9NRWxlbWVudH0gY29udGFpbmVyIEl0cyBwYXJlbnQgZWxlbWVudCAoT3B0aW9uYWwpLjwvbGk+XG4gKiA8bGk+IHtmdW5jdGlvbn0gb25Mb2FkIEEgbWV0aG9kIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCB3aXRoIHRoZSBmcmFtZXMgY29udGVudFdpbmRvdyBhcyBhcmd1bWVudCB3aGVuIHRoZSBmcmFtZSBpcyBmdWxseSBsb2FkZWQuIChPcHRpb25hbCk8L2xpPlxuICogPC91bD5cbiAqIEByZXR1cm4gVGhlIGZyYW1lcyBET01FbGVtZW50XG4gKiBAdHlwZSBET01FbGVtZW50XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUZyYW1lKGNvbmZpZyl7XG4gICAgaWYgKHVuZGVmKEhBU19OQU1FX1BST1BFUlRZX0JVRykpIHtcbiAgICAgICAgdGVzdEZvck5hbWVQcm9wZXJ0eUJ1ZygpO1xuICAgIH1cbiAgICB2YXIgZnJhbWU7XG4gICAgLy8gVGhpcyBpcyB0byB3b3JrIGFyb3VuZCB0aGUgcHJvYmxlbXMgaW4gSUU2Lzcgd2l0aCBzZXR0aW5nIHRoZSBuYW1lIHByb3BlcnR5LiBcbiAgICAvLyBJbnRlcm5hbGx5IHRoaXMgaXMgc2V0IGFzICdzdWJtaXROYW1lJyBpbnN0ZWFkIHdoZW4gdXNpbmcgJ2lmcmFtZS5uYW1lID0gLi4uJ1xuICAgIC8vIFRoaXMgaXMgbm90IHJlcXVpcmVkIGJ5IGVhc3lYRE0gaXRzZWxmLCBidXQgaXMgdG8gZmFjaWxpdGF0ZSBvdGhlciB1c2UgY2FzZXMgXG4gICAgaWYgKEhBU19OQU1FX1BST1BFUlRZX0JVRykge1xuICAgICAgICBmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCI8aWZyYW1lIG5hbWU9XFxcIlwiICsgY29uZmlnLnByb3BzLm5hbWUgKyBcIlxcXCIvPlwiKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIklGUkFNRVwiKTtcbiAgICAgICAgZnJhbWUubmFtZSA9IGNvbmZpZy5wcm9wcy5uYW1lO1xuICAgIH1cbiAgICBcbiAgICBmcmFtZS5pZCA9IGZyYW1lLm5hbWUgPSBjb25maWcucHJvcHMubmFtZTtcbiAgICBkZWxldGUgY29uZmlnLnByb3BzLm5hbWU7XG4gICAgXG4gICAgaWYgKHR5cGVvZiBjb25maWcuY29udGFpbmVyID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgY29uZmlnLmNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNvbmZpZy5jb250YWluZXIpO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIWNvbmZpZy5jb250YWluZXIpIHtcbiAgICAgICAgLy8gVGhpcyBuZWVkcyB0byBiZSBoaWRkZW4gbGlrZSB0aGlzLCBzaW1wbHkgc2V0dGluZyBkaXNwbGF5Om5vbmUgYW5kIHRoZSBsaWtlIHdpbGwgY2F1c2UgZmFpbHVyZXMgaW4gc29tZSBicm93c2Vycy5cbiAgICAgICAgYXBwbHkoZnJhbWUuc3R5bGUsIHtcbiAgICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG4gICAgICAgICAgICB0b3A6IFwiLTIwMDBweFwiLFxuICAgICAgICAgICAgLy8gQXZvaWQgcG90ZW50aWFsIGhvcml6b250YWwgc2Nyb2xsYmFyXG4gICAgICAgICAgICBsZWZ0OiBcIjBweFwiXG4gICAgICAgIH0pO1xuICAgICAgICBjb25maWcuY29udGFpbmVyID0gZG9jdW1lbnQuYm9keTtcbiAgICB9XG4gICAgXG4gICAgLy8gSEFDSzogSUUgY2Fubm90IGhhdmUgdGhlIHNyYyBhdHRyaWJ1dGUgc2V0IHdoZW4gdGhlIGZyYW1lIGlzIGFwcGVuZGVkXG4gICAgLy8gICAgICAgaW50byB0aGUgY29udGFpbmVyLCBzbyB3ZSBzZXQgaXQgdG8gXCJqYXZhc2NyaXB0OmZhbHNlXCIgYXMgYVxuICAgIC8vICAgICAgIHBsYWNlaG9sZGVyIGZvciBub3cuICBJZiB3ZSBsZWZ0IHRoZSBzcmMgdW5kZWZpbmVkLCBpdCB3b3VsZFxuICAgIC8vICAgICAgIGluc3RlYWQgZGVmYXVsdCB0byBcImFib3V0OmJsYW5rXCIsIHdoaWNoIGNhdXNlcyBTU0wgbWl4ZWQtY29udGVudFxuICAgIC8vICAgICAgIHdhcm5pbmdzIGluIElFNiB3aGVuIG9uIGFuIFNTTCBwYXJlbnQgcGFnZS5cbiAgICB2YXIgc3JjID0gY29uZmlnLnByb3BzLnNyYztcbiAgICBjb25maWcucHJvcHMuc3JjID0gXCJqYXZhc2NyaXB0OmZhbHNlXCI7XG4gICAgXG4gICAgLy8gdHJhbnNmZXIgcHJvcGVydGllcyB0byB0aGUgZnJhbWVcbiAgICBhcHBseShmcmFtZSwgY29uZmlnLnByb3BzKTtcbiAgICBcbiAgICBmcmFtZS5ib3JkZXIgPSBmcmFtZS5mcmFtZUJvcmRlciA9IDA7XG4gICAgZnJhbWUuYWxsb3dUcmFuc3BhcmVuY3kgPSB0cnVlO1xuICAgIGNvbmZpZy5jb250YWluZXIuYXBwZW5kQ2hpbGQoZnJhbWUpO1xuICAgIFxuICAgIGlmIChjb25maWcub25Mb2FkKSB7XG4gICAgICAgIG9uKGZyYW1lLCBcImxvYWRcIiwgY29uZmlnLm9uTG9hZCk7XG4gICAgfVxuICAgIFxuICAgIC8vIHNldCB0aGUgZnJhbWUgVVJMIHRvIHRoZSBwcm9wZXIgdmFsdWUgKHdlIHByZXZpb3VzbHkgc2V0IGl0IHRvXG4gICAgLy8gXCJqYXZhc2NyaXB0OmZhbHNlXCIgdG8gd29yayBhcm91bmQgdGhlIElFIGlzc3VlIG1lbnRpb25lZCBhYm92ZSlcbiAgICBpZihjb25maWcudXNlUG9zdCkge1xuICAgICAgICB2YXIgZm9ybSA9IGNvbmZpZy5jb250YWluZXIuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZm9ybScpKSwgaW5wdXQ7XG4gICAgICAgIGZvcm0udGFyZ2V0ID0gZnJhbWUubmFtZTtcbiAgICAgICAgZm9ybS5hY3Rpb24gPSBzcmM7XG4gICAgICAgIGZvcm0ubWV0aG9kID0gJ1BPU1QnO1xuICAgICAgICBpZiAodHlwZW9mKGNvbmZpZy51c2VQb3N0KSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgaW4gY29uZmlnLnVzZVBvc3QpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLnVzZVBvc3QuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKEhBU19OQU1FX1BST1BFUlRZX0JVRykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCc8aW5wdXQgbmFtZT1cIicgKyBpICsgJ1wiLz4nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIklOUFVUXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQubmFtZSA9IGk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaW5wdXQudmFsdWUgPSBjb25maWcudXNlUG9zdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybS5hcHBlbmRDaGlsZChpbnB1dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvcm0uc3VibWl0KCk7XG4gICAgICAgIGZvcm0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChmb3JtKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmcmFtZS5zcmMgPSBzcmM7XG4gICAgfVxuICAgIGNvbmZpZy5wcm9wcy5zcmMgPSBzcmM7XG4gICAgXG4gICAgcmV0dXJuIGZyYW1lO1xufVxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgYSBkb21haW4gaXMgYWxsb3dlZCB1c2luZyBhbiBBY2Nlc3MgQ29udHJvbCBMaXN0LlxuICogVGhlIEFDTCBjYW4gY29udGFpbiAqIGFuZCA/IGFzIHdpbGRjYXJkcywgb3IgY2FuIGJlIHJlZ3VsYXIgZXhwcmVzc2lvbnMuXG4gKiBJZiByZWd1bGFyIGV4cHJlc3Npb25zIHRoZXkgbmVlZCB0byBiZWdpbiB3aXRoIF4gYW5kIGVuZCB3aXRoICQuXG4gKiBAcGFyYW0ge0FycmF5L1N0cmluZ30gYWNsIFRoZSBsaXN0IG9mIGFsbG93ZWQgZG9tYWluc1xuICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgZG9tYWluIHRvIHRlc3QuXG4gKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBkb21haW4gaXMgYWxsb3dlZCwgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBjaGVja0FjbChhY2wsIGRvbWFpbil7XG4gICAgLy8gbm9ybWFsaXplIGludG8gYW4gYXJyYXlcbiAgICBpZiAodHlwZW9mIGFjbCA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGFjbCA9IFthY2xdO1xuICAgIH1cbiAgICB2YXIgcmUsIGkgPSBhY2wubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgcmUgPSBhY2xbaV07XG4gICAgICAgIHJlID0gbmV3IFJlZ0V4cChyZS5zdWJzdHIoMCwgMSkgPT0gXCJeXCIgPyByZSA6IChcIl5cIiArIHJlLnJlcGxhY2UoLyhcXCopL2csIFwiLiQxXCIpLnJlcGxhY2UoL1xcPy9nLCBcIi5cIikgKyBcIiRcIikpO1xuICAgICAgICBpZiAocmUudGVzdChkb21haW4pKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qXG4gKiBGdW5jdGlvbnMgcmVsYXRlZCB0byBzdGFja3NcbiAqL1xuLyoqXG4gKiBQcmVwYXJlcyBhbiBhcnJheSBvZiBzdGFjay1lbGVtZW50cyBzdWl0YWJsZSBmb3IgdGhlIGN1cnJlbnQgY29uZmlndXJhdGlvblxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgVHJhbnNwb3J0cyBjb25maWd1cmF0aW9uLiBTZWUgZWFzeVhETS5Tb2NrZXQgZm9yIG1vcmUuXG4gKiBAcmV0dXJuIHtBcnJheX0gQW4gYXJyYXkgb2Ygc3RhY2stZWxlbWVudHMgd2l0aCB0aGUgVHJhbnNwb3J0RWxlbWVudCBhdCBpbmRleCAwLlxuICovXG5mdW5jdGlvbiBwcmVwYXJlVHJhbnNwb3J0U3RhY2soY29uZmlnKXtcbiAgICB2YXIgcHJvdG9jb2wgPSBjb25maWcucHJvdG9jb2wsIHN0YWNrRWxzO1xuICAgIGNvbmZpZy5pc0hvc3QgPSBjb25maWcuaXNIb3N0IHx8IHVuZGVmKHF1ZXJ5LnhkbV9wKTtcbiAgICB1c2VIYXNoID0gY29uZmlnLmhhc2ggfHwgZmFsc2U7XG4gICAgXG4gICAgaWYgKCFjb25maWcucHJvcHMpIHtcbiAgICAgICAgY29uZmlnLnByb3BzID0ge307XG4gICAgfVxuICAgIGlmICghY29uZmlnLmlzSG9zdCkge1xuICAgICAgICBjb25maWcuY2hhbm5lbCA9IHF1ZXJ5LnhkbV9jLnJlcGxhY2UoL1tcIic8PlxcXFxdL2csIFwiXCIpO1xuICAgICAgICBjb25maWcuc2VjcmV0ID0gcXVlcnkueGRtX3M7XG4gICAgICAgIGNvbmZpZy5yZW1vdGUgPSBxdWVyeS54ZG1fZS5yZXBsYWNlKC9bXCInPD5cXFxcXS9nLCBcIlwiKTtcbiAgICAgICAgO1xuICAgICAgICBwcm90b2NvbCA9IHF1ZXJ5LnhkbV9wO1xuICAgICAgICBpZiAoY29uZmlnLmFjbCAmJiAhY2hlY2tBY2woY29uZmlnLmFjbCwgY29uZmlnLnJlbW90ZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkFjY2VzcyBkZW5pZWQgZm9yIFwiICsgY29uZmlnLnJlbW90ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGNvbmZpZy5yZW1vdGUgPSByZXNvbHZlVXJsKGNvbmZpZy5yZW1vdGUpO1xuICAgICAgICBjb25maWcuY2hhbm5lbCA9IGNvbmZpZy5jaGFubmVsIHx8IFwiZGVmYXVsdFwiICsgY2hhbm5lbElkKys7XG4gICAgICAgIGNvbmZpZy5zZWNyZXQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDE2KS5zdWJzdHJpbmcoMik7XG4gICAgICAgIGlmICh1bmRlZihwcm90b2NvbCkpIHtcbiAgICAgICAgICAgIGlmIChnZXRMb2NhdGlvbihsb2NhdGlvbi5ocmVmKSA9PSBnZXRMb2NhdGlvbihjb25maWcucmVtb3RlKSkge1xuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICogQm90aCBkb2N1bWVudHMgaGFzIHRoZSBzYW1lIG9yaWdpbiwgbGV0cyB1c2UgZGlyZWN0IGFjY2Vzcy5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBwcm90b2NvbCA9IFwiNFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaXNIb3N0TWV0aG9kKHdpbmRvdywgXCJwb3N0TWVzc2FnZVwiKSB8fCBpc0hvc3RNZXRob2QoZG9jdW1lbnQsIFwicG9zdE1lc3NhZ2VcIikpIHtcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAqIFRoaXMgaXMgc3VwcG9ydGVkIGluIElFOCssIEZpcmVmb3ggMyssIE9wZXJhIDkrLCBDaHJvbWUgMisgYW5kIFNhZmFyaSA0K1xuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHByb3RvY29sID0gXCIxXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjb25maWcuc3dmICYmIGlzSG9zdE1ldGhvZCh3aW5kb3csIFwiQWN0aXZlWE9iamVjdFwiKSAmJiBoYXNGbGFzaCgpKSB7XG4gICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgKiBUaGUgRmxhc2ggdHJhbnNwb3J0IHN1cGVyc2VlZGVzIHRoZSBOaXhUcmFuc3BvcnQgYXMgdGhlIE5peFRyYW5zcG9ydCBoYXMgYmVlbiBibG9ja2VkIGJ5IE1TXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcHJvdG9jb2wgPSBcIjZcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG5hdmlnYXRvci5wcm9kdWN0ID09PSBcIkdlY2tvXCIgJiYgXCJmcmFtZUVsZW1lbnRcIiBpbiB3aW5kb3cgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdXZWJLaXQnKSA9PSAtMSkge1xuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICogVGhpcyBpcyBzdXBwb3J0ZWQgaW4gR2Vja28gKEZpcmVmb3ggMSspXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcHJvdG9jb2wgPSBcIjVcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNvbmZpZy5yZW1vdGVIZWxwZXIpIHtcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAqIFRoaXMgaXMgc3VwcG9ydGVkIGluIGFsbCBicm93c2VycyB0aGF0IHJldGFpbnMgdGhlIHZhbHVlIG9mIHdpbmRvdy5uYW1lIHdoZW5cbiAgICAgICAgICAgICAgICAgKiBuYXZpZ2F0aW5nIGZyb20gb25lIGRvbWFpbiB0byBhbm90aGVyLCBhbmQgd2hlcmUgcGFyZW50LmZyYW1lc1tmb29dIGNhbiBiZSB1c2VkXG4gICAgICAgICAgICAgICAgICogdG8gZ2V0IGFjY2VzcyB0byBhIGZyYW1lIGZyb20gdGhlIHNhbWUgZG9tYWluXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcHJvdG9jb2wgPSBcIjJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICogVGhpcyBpcyBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzIHdoZXJlIFt3aW5kb3ddLmxvY2F0aW9uIGlzIHdyaXRhYmxlIGZvciBhbGxcbiAgICAgICAgICAgICAgICAgKiBUaGUgcmVzaXplIGV2ZW50IHdpbGwgYmUgdXNlZCBpZiByZXNpemUgaXMgc3VwcG9ydGVkIGFuZCB0aGUgaWZyYW1lIGlzIG5vdCBwdXRcbiAgICAgICAgICAgICAgICAgKiBpbnRvIGEgY29udGFpbmVyLCBlbHNlIHBvbGxpbmcgd2lsbCBiZSB1c2VkLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHByb3RvY29sID0gXCIwXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgY29uZmlnLnByb3RvY29sID0gcHJvdG9jb2w7IC8vIGZvciBjb25kaXRpb25hbCBicmFuY2hpbmdcbiAgICBzd2l0Y2ggKHByb3RvY29sKSB7XG4gICAgICAgIGNhc2UgXCIwXCI6Ly8gMCA9IEhhc2hUcmFuc3BvcnRcbiAgICAgICAgICAgIGFwcGx5KGNvbmZpZywge1xuICAgICAgICAgICAgICAgIGludGVydmFsOiAxMDAsXG4gICAgICAgICAgICAgICAgZGVsYXk6IDIwMDAsXG4gICAgICAgICAgICAgICAgdXNlUmVzaXplOiB0cnVlLFxuICAgICAgICAgICAgICAgIHVzZVBhcmVudDogZmFsc2UsXG4gICAgICAgICAgICAgICAgdXNlUG9sbGluZzogZmFsc2VcbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5pc0hvc3QpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWNvbmZpZy5sb2NhbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiBubyBsb2NhbCBpcyBzZXQgdGhlbiB3ZSBuZWVkIHRvIGZpbmQgYW4gaW1hZ2UgaG9zdGVkIG9uIHRoZSBjdXJyZW50IGRvbWFpblxuICAgICAgICAgICAgICAgICAgICB2YXIgZG9tYWluID0gbG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyBsb2NhdGlvbi5ob3N0LCBpbWFnZXMgPSBkb2N1bWVudC5ib2R5LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW1nXCIpLCBpbWFnZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGkgPSBpbWFnZXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbWFnZSA9IGltYWdlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbWFnZS5zcmMuc3Vic3RyaW5nKDAsIGRvbWFpbi5sZW5ndGgpID09PSBkb21haW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25maWcubG9jYWwgPSBpbWFnZS5zcmM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjb25maWcubG9jYWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIG5vIGxvY2FsIHdhcyBzZXQsIGFuZCB3ZSBhcmUgdW5hYmxlIHRvIGZpbmQgYSBzdWl0YWJsZSBmaWxlLCB0aGVuIHdlIHJlc29ydCB0byB1c2luZyB0aGUgY3VycmVudCB3aW5kb3cgXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWcubG9jYWwgPSB3aW5kb3c7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtZXRlcnMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHhkbV9jOiBjb25maWcuY2hhbm5lbCxcbiAgICAgICAgICAgICAgICAgICAgeGRtX3A6IDBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChjb25maWcubG9jYWwgPT09IHdpbmRvdykge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSBhcmUgdXNpbmcgdGhlIGN1cnJlbnQgd2luZG93IHRvIGxpc3RlbiB0b1xuICAgICAgICAgICAgICAgICAgICBjb25maWcudXNlUG9sbGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy51c2VQYXJlbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBjb25maWcubG9jYWwgPSBsb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIGxvY2F0aW9uLmhvc3QgKyBsb2NhdGlvbi5wYXRobmFtZSArIGxvY2F0aW9uLnNlYXJjaDtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVycy54ZG1fZSA9IGNvbmZpZy5sb2NhbDtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVycy54ZG1fcGEgPSAxOyAvLyB1c2UgcGFyZW50XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbWV0ZXJzLnhkbV9lID0gcmVzb2x2ZVVybChjb25maWcubG9jYWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLmNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcudXNlUmVzaXplID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlcnMueGRtX3BvID0gMTsgLy8gdXNlIHBvbGxpbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uZmlnLnJlbW90ZSA9IGFwcGVuZFF1ZXJ5UGFyYW1ldGVycyhjb25maWcucmVtb3RlLCBwYXJhbWV0ZXJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGFwcGx5KGNvbmZpZywge1xuICAgICAgICAgICAgICAgICAgICB1c2VQYXJlbnQ6ICF1bmRlZihxdWVyeS54ZG1fcGEpLFxuICAgICAgICAgICAgICAgICAgICB1c2VQb2xsaW5nOiAhdW5kZWYocXVlcnkueGRtX3BvKSxcbiAgICAgICAgICAgICAgICAgICAgdXNlUmVzaXplOiBjb25maWcudXNlUGFyZW50ID8gZmFsc2UgOiBjb25maWcudXNlUmVzaXplXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGFja0VscyA9IFtuZXcgZWFzeVhETS5zdGFjay5IYXNoVHJhbnNwb3J0KGNvbmZpZyksIG5ldyBlYXN5WERNLnN0YWNrLlJlbGlhYmxlQmVoYXZpb3Ioe30pLCBuZXcgZWFzeVhETS5zdGFjay5RdWV1ZUJlaGF2aW9yKHtcbiAgICAgICAgICAgICAgICBlbmNvZGU6IHRydWUsXG4gICAgICAgICAgICAgICAgbWF4TGVuZ3RoOiA0MDAwIC0gY29uZmlnLnJlbW90ZS5sZW5ndGhcbiAgICAgICAgICAgIH0pLCBuZXcgZWFzeVhETS5zdGFjay5WZXJpZnlCZWhhdmlvcih7XG4gICAgICAgICAgICAgICAgaW5pdGlhdGU6IGNvbmZpZy5pc0hvc3RcbiAgICAgICAgICAgIH0pXTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiMVwiOlxuICAgICAgICAgICAgc3RhY2tFbHMgPSBbbmV3IGVhc3lYRE0uc3RhY2suUG9zdE1lc3NhZ2VUcmFuc3BvcnQoY29uZmlnKV07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcIjJcIjpcbiAgICAgICAgICAgIGlmIChjb25maWcuaXNIb3N0KSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLnJlbW90ZUhlbHBlciA9IHJlc29sdmVVcmwoY29uZmlnLnJlbW90ZUhlbHBlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGFja0VscyA9IFtuZXcgZWFzeVhETS5zdGFjay5OYW1lVHJhbnNwb3J0KGNvbmZpZyksIG5ldyBlYXN5WERNLnN0YWNrLlF1ZXVlQmVoYXZpb3IoKSwgbmV3IGVhc3lYRE0uc3RhY2suVmVyaWZ5QmVoYXZpb3Ioe1xuICAgICAgICAgICAgICAgIGluaXRpYXRlOiBjb25maWcuaXNIb3N0XG4gICAgICAgICAgICB9KV07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcIjNcIjpcbiAgICAgICAgICAgIHN0YWNrRWxzID0gW25ldyBlYXN5WERNLnN0YWNrLk5peFRyYW5zcG9ydChjb25maWcpXTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiNFwiOlxuICAgICAgICAgICAgc3RhY2tFbHMgPSBbbmV3IGVhc3lYRE0uc3RhY2suU2FtZU9yaWdpblRyYW5zcG9ydChjb25maWcpXTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiNVwiOlxuICAgICAgICAgICAgc3RhY2tFbHMgPSBbbmV3IGVhc3lYRE0uc3RhY2suRnJhbWVFbGVtZW50VHJhbnNwb3J0KGNvbmZpZyldO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCI2XCI6XG4gICAgICAgICAgICBpZiAoIWZsYXNoVmVyc2lvbikge1xuICAgICAgICAgICAgICAgIGhhc0ZsYXNoKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGFja0VscyA9IFtuZXcgZWFzeVhETS5zdGFjay5GbGFzaFRyYW5zcG9ydChjb25maWcpXTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICAvLyB0aGlzIGJlaGF2aW9yIGlzIHJlc3BvbnNpYmxlIGZvciBidWZmZXJpbmcgb3V0Z29pbmcgbWVzc2FnZXMsIGFuZCBmb3IgcGVyZm9ybWluZyBsYXp5IGluaXRpYWxpemF0aW9uXG4gICAgc3RhY2tFbHMucHVzaChuZXcgZWFzeVhETS5zdGFjay5RdWV1ZUJlaGF2aW9yKHtcbiAgICAgICAgbGF6eTogY29uZmlnLmxhenksXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxuICAgIH0pKTtcbiAgICByZXR1cm4gc3RhY2tFbHM7XG59XG5cbi8qKlxuICogQ2hhaW5zIGFsbCB0aGUgc2VwYXJhdGUgc3RhY2sgZWxlbWVudHMgaW50byBhIHNpbmdsZSB1c2FibGUgc3RhY2suPGJyLz5cbiAqIElmIGFuIGVsZW1lbnQgaXMgbWlzc2luZyBhIG5lY2Vzc2FyeSBtZXRob2QgdGhlbiBpdCB3aWxsIGhhdmUgYSBwYXNzLXRocm91Z2ggbWV0aG9kIGFwcGxpZWQuXG4gKiBAcGFyYW0ge0FycmF5fSBzdGFja0VsZW1lbnRzIEFuIGFycmF5IG9mIHN0YWNrIGVsZW1lbnRzIHRvIGJlIGxpbmtlZC5cbiAqIEByZXR1cm4ge2Vhc3lYRE0uc3RhY2suU3RhY2tFbGVtZW50fSBUaGUgbGFzdCBlbGVtZW50IGluIHRoZSBjaGFpbi5cbiAqL1xuZnVuY3Rpb24gY2hhaW5TdGFjayhzdGFja0VsZW1lbnRzKXtcbiAgICB2YXIgc3RhY2tFbCwgZGVmYXVsdHMgPSB7XG4gICAgICAgIGluY29taW5nOiBmdW5jdGlvbihtZXNzYWdlLCBvcmlnaW4pe1xuICAgICAgICAgICAgdGhpcy51cC5pbmNvbWluZyhtZXNzYWdlLCBvcmlnaW4pO1xuICAgICAgICB9LFxuICAgICAgICBvdXRnb2luZzogZnVuY3Rpb24obWVzc2FnZSwgcmVjaXBpZW50KXtcbiAgICAgICAgICAgIHRoaXMuZG93bi5vdXRnb2luZyhtZXNzYWdlLCByZWNpcGllbnQpO1xuICAgICAgICB9LFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oc3VjY2Vzcyl7XG4gICAgICAgICAgICB0aGlzLnVwLmNhbGxiYWNrKHN1Y2Nlc3MpO1xuICAgICAgICB9LFxuICAgICAgICBpbml0OiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5kb3duLmluaXQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVzdHJveTogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMuZG93bi5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBzdGFja0VsZW1lbnRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHN0YWNrRWwgPSBzdGFja0VsZW1lbnRzW2ldO1xuICAgICAgICBhcHBseShzdGFja0VsLCBkZWZhdWx0cywgdHJ1ZSk7XG4gICAgICAgIGlmIChpICE9PSAwKSB7XG4gICAgICAgICAgICBzdGFja0VsLmRvd24gPSBzdGFja0VsZW1lbnRzW2kgLSAxXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaSAhPT0gbGVuIC0gMSkge1xuICAgICAgICAgICAgc3RhY2tFbC51cCA9IHN0YWNrRWxlbWVudHNbaSArIDFdO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdGFja0VsO1xufVxuXG4vKipcbiAqIFRoaXMgd2lsbCByZW1vdmUgYSBzdGFja2VsZW1lbnQgZnJvbSBpdHMgc3RhY2sgd2hpbGUgbGVhdmluZyB0aGUgc3RhY2sgZnVuY3Rpb25hbC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IFRoZSBlbG1lbnQgdG8gcmVtb3ZlIGZyb20gdGhlIHN0YWNrLlxuICovXG5mdW5jdGlvbiByZW1vdmVGcm9tU3RhY2soZWxlbWVudCl7XG4gICAgZWxlbWVudC51cC5kb3duID0gZWxlbWVudC5kb3duO1xuICAgIGVsZW1lbnQuZG93bi51cCA9IGVsZW1lbnQudXA7XG4gICAgZWxlbWVudC51cCA9IGVsZW1lbnQuZG93biA9IG51bGw7XG59XG5cbi8qXG4gKiBFeHBvcnQgdGhlIG1haW4gb2JqZWN0IGFuZCBhbnkgb3RoZXIgbWV0aG9kcyBhcHBsaWNhYmxlXG4gKi9cbi8qKiBcbiAqIEBjbGFzcyBlYXN5WERNXG4gKiBBIGphdmFzY3JpcHQgbGlicmFyeSBwcm92aWRpbmcgY3Jvc3MtYnJvd3NlciwgY3Jvc3MtZG9tYWluIG1lc3NhZ2luZy9SUEMuXG4gKiBAdmVyc2lvbiAyLjQuMjAuN1xuICogQHNpbmdsZXRvblxuICovXG5hcHBseShlYXN5WERNLCB7XG4gICAgLyoqXG4gICAgICogVGhlIHZlcnNpb24gb2YgdGhlIGxpYnJhcnlcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHZlcnNpb246IFwiMi40LjIwLjdcIixcbiAgICAvKipcbiAgICAgKiBUaGlzIGlzIGEgbWFwIGNvbnRhaW5pbmcgYWxsIHRoZSBxdWVyeSBwYXJhbWV0ZXJzIHBhc3NlZCB0byB0aGUgZG9jdW1lbnQuXG4gICAgICogQWxsIHRoZSB2YWx1ZXMgaGFzIGJlZW4gZGVjb2RlZCB1c2luZyBkZWNvZGVVUklDb21wb25lbnQuXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBxdWVyeTogcXVlcnksXG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBzdGFjazoge30sXG4gICAgLyoqXG4gICAgICogQXBwbGllcyBwcm9wZXJ0aWVzIGZyb20gdGhlIHNvdXJjZSBvYmplY3QgdG8gdGhlIHRhcmdldCBvYmplY3QuPGJyLz5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0IFRoZSB0YXJnZXQgb2YgdGhlIHByb3BlcnRpZXMuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNvdXJjZSBUaGUgc291cmNlIG9mIHRoZSBwcm9wZXJ0aWVzLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gbm9PdmVyd3JpdGUgU2V0IHRvIFRydWUgdG8gb25seSBzZXQgbm9uLWV4aXN0aW5nIHByb3BlcnRpZXMuXG4gICAgICovXG4gICAgYXBwbHk6IGFwcGx5LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEEgc2FmZSBpbXBsZW1lbnRhdGlvbiBvZiBIVE1MNSBKU09OLiBGZWF0dXJlIHRlc3RpbmcgaXMgdXNlZCB0byBtYWtlIHN1cmUgdGhlIGltcGxlbWVudGF0aW9uIHdvcmtzLlxuICAgICAqIEByZXR1cm4ge0pTT059IEEgdmFsaWQgSlNPTiBjb25mb3JtaW5nIG9iamVjdCwgb3IgbnVsbCBpZiBub3QgZm91bmQuXG4gICAgICovXG4gICAgZ2V0SlNPTk9iamVjdDogZ2V0SlNPTixcbiAgICAvKipcbiAgICAgKiBUaGlzIHdpbGwgYWRkIGEgZnVuY3Rpb24gdG8gdGhlIHF1ZXVlIG9mIGZ1bmN0aW9ucyB0byBiZSBydW4gb25jZSB0aGUgRE9NIHJlYWNoZXMgYSByZWFkeSBzdGF0ZS5cbiAgICAgKiBJZiBmdW5jdGlvbnMgYXJlIGFkZGVkIGFmdGVyIHRoaXMgZXZlbnQgdGhlbiB0aGV5IHdpbGwgYmUgZXhlY3V0ZWQgaW1tZWRpYXRlbHkuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uIHRvIGFkZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzY29wZSBBbiBvcHRpb25hbCBzY29wZSBmb3IgdGhlIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoLlxuICAgICAqL1xuICAgIHdoZW5SZWFkeTogd2hlblJlYWR5LFxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgZWFzeVhETSB2YXJpYWJsZSBmcm9tIHRoZSBnbG9iYWwgc2NvcGUuIEl0IGFsc28gcmV0dXJucyBjb250cm9sXG4gICAgICogb2YgdGhlIGVhc3lYRE0gdmFyaWFibGUgdG8gd2hhdGV2ZXIgY29kZSB1c2VkIGl0IGJlZm9yZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBucyBBIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBvYmplY3QgdGhhdCB3aWxsIGhvbGRcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgYW4gaW5zdGFuY2Ugb2YgZWFzeVhETS5cbiAgICAgKiBAcmV0dXJuIEFuIGluc3RhbmNlIG9mIGVhc3lYRE1cbiAgICAgKi9cbiAgICBub0NvbmZsaWN0OiBub0NvbmZsaWN0XG59KTtcblxuLypqc2xpbnQgZXZpbDogdHJ1ZSwgYnJvd3NlcjogdHJ1ZSwgaW1tZWQ6IHRydWUsIHBhc3NmYWlsOiB0cnVlLCB1bmRlZjogdHJ1ZSwgbmV3Y2FwOiB0cnVlKi9cbi8qZ2xvYmFsIGNvbnNvbGUsIF9GaXJlYnVnQ29tbWFuZExpbmUsICBlYXN5WERNLCB3aW5kb3csIGVzY2FwZSwgdW5lc2NhcGUsIGlzSG9zdE9iamVjdCwgdW5kZWYsIF90cmFjZSwgZG9tSXNSZWFkeSwgZW1wdHlGbiwgbmFtZXNwYWNlICovXG4vL1xuLy8gZWFzeVhETVxuLy8gaHR0cDovL2Vhc3l4ZG0ubmV0L1xuLy8gQ29weXJpZ2h0KGMpIDIwMDktMjAxMSwgw5h5dmluZCBTZWFuIEtpbnNleSwgb3l2aW5kQGtpbnNleS5uby5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4vLyBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4vLyBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4vLyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4vLyBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi8vIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4vLyBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4vLyBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuLy8gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuLy8gVEhFIFNPRlRXQVJFLlxuLy9cblxuLypqc2xpbnQgZXZpbDogdHJ1ZSwgYnJvd3NlcjogdHJ1ZSwgaW1tZWQ6IHRydWUsIHBhc3NmYWlsOiB0cnVlLCB1bmRlZjogdHJ1ZSwgbmV3Y2FwOiB0cnVlKi9cbi8qZ2xvYmFsIGVhc3lYRE0sIHdpbmRvdywgZXNjYXBlLCB1bmVzY2FwZSwgaXNIb3N0T2JqZWN0LCBpc0hvc3RNZXRob2QsIHVuLCBvbiwgY3JlYXRlRnJhbWUsIGRlYnVnICovXG4vL1xuLy8gZWFzeVhETVxuLy8gaHR0cDovL2Vhc3l4ZG0ubmV0L1xuLy8gQ29weXJpZ2h0KGMpIDIwMDktMjAxMSwgw5h5dmluZCBTZWFuIEtpbnNleSwgb3l2aW5kQGtpbnNleS5uby5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4vLyBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4vLyBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4vLyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4vLyBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi8vIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4vLyBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4vLyBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuLy8gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuLy8gVEhFIFNPRlRXQVJFLlxuLy9cblxuLyoqIFxuICogQGNsYXNzIGVhc3lYRE0uRG9tSGVscGVyXG4gKiBDb250YWlucyBtZXRob2RzIGZvciBkZWFsaW5nIHdpdGggdGhlIERPTVxuICogQHNpbmdsZXRvblxuICovXG5lYXN5WERNLkRvbUhlbHBlciA9IHtcbiAgICAvKipcbiAgICAgKiBQcm92aWRlcyBhIGNvbnNpc3RlbnQgaW50ZXJmYWNlIGZvciBhZGRpbmcgZXZlbnRoYW5kbGVyc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXQgVGhlIHRhcmdldCB0byBhZGQgdGhlIGV2ZW50IHRvXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHR5cGUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgVGhlIGxpc3RlbmVyXG4gICAgICovXG4gICAgb246IG9uLFxuICAgIC8qKlxuICAgICAqIFByb3ZpZGVzIGEgY29uc2lzdGVudCBpbnRlcmZhY2UgZm9yIHJlbW92aW5nIGV2ZW50aGFuZGxlcnNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdGFyZ2V0IFRoZSB0YXJnZXQgdG8gcmVtb3ZlIHRoZSBldmVudCBmcm9tXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHR5cGUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgVGhlIGxpc3RlbmVyXG4gICAgICovXG4gICAgdW46IHVuLFxuICAgIC8qKlxuICAgICAqIENoZWNrcyBmb3IgdGhlIHByZXNlbmNlIG9mIHRoZSBKU09OIG9iamVjdC5cbiAgICAgKiBJZiBpdCBpcyBub3QgcHJlc2VudCBpdCB3aWxsIHVzZSB0aGUgc3VwcGxpZWQgcGF0aCB0byBsb2FkIHRoZSBKU09OMiBsaWJyYXJ5LlxuICAgICAqIFRoaXMgc2hvdWxkIGJlIGNhbGxlZCBpbiB0aGUgZG9jdW1lbnRzIGhlYWQgcmlnaHQgYWZ0ZXIgdGhlIGVhc3lYRE0gc2NyaXB0IHRhZy5cbiAgICAgKiBodHRwOi8vanNvbi5vcmcvanNvbjIuanNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBBIHZhbGlkIHBhdGggdG8ganNvbjIuanNcbiAgICAgKi9cbiAgICByZXF1aXJlc0pTT046IGZ1bmN0aW9uKHBhdGgpe1xuICAgICAgICBpZiAoIWlzSG9zdE9iamVjdCh3aW5kb3csIFwiSlNPTlwiKSkge1xuICAgICAgICAgICAgLy8gd2UgbmVlZCB0byBlbmNvZGUgdGhlIDwgaW4gb3JkZXIgdG8gYXZvaWQgYW4gaWxsZWdhbCB0b2tlbiBlcnJvclxuICAgICAgICAgICAgLy8gd2hlbiB0aGUgc2NyaXB0IGlzIGlubGluZWQgaW4gYSBkb2N1bWVudC5cbiAgICAgICAgICAgIGRvY3VtZW50LndyaXRlKCc8JyArICdzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiIHNyYz1cIicgKyBwYXRoICsgJ1wiPjwnICsgJy9zY3JpcHQ+Jyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuLypqc2xpbnQgZXZpbDogdHJ1ZSwgYnJvd3NlcjogdHJ1ZSwgaW1tZWQ6IHRydWUsIHBhc3NmYWlsOiB0cnVlLCB1bmRlZjogdHJ1ZSwgbmV3Y2FwOiB0cnVlKi9cbi8qZ2xvYmFsIGVhc3lYRE0sIHdpbmRvdywgZXNjYXBlLCB1bmVzY2FwZSwgZGVidWcgKi9cbi8vXG4vLyBlYXN5WERNXG4vLyBodHRwOi8vZWFzeXhkbS5uZXQvXG4vLyBDb3B5cmlnaHQoYykgMjAwOS0yMDExLCDDmHl2aW5kIFNlYW4gS2luc2V5LCBveXZpbmRAa2luc2V5Lm5vLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbi8vIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbi8vIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbi8vIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbi8vIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuLy8gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuLy8gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuLy8gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4vLyBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbi8vIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbi8vIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4vLyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4vLyBUSEUgU09GVFdBUkUuXG4vL1xuXG4oZnVuY3Rpb24oKXtcbiAgICAvLyBUaGUgbWFwIGNvbnRhaW5pbmcgdGhlIHN0b3JlZCBmdW5jdGlvbnNcbiAgICB2YXIgX21hcCA9IHt9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEBjbGFzcyBlYXN5WERNLkZuXG4gICAgICogVGhpcyBjb250YWlucyBtZXRob2RzIHJlbGF0ZWQgdG8gZnVuY3Rpb24gaGFuZGxpbmcsIHN1Y2ggYXMgc3RvcmluZyBjYWxsYmFja3MuXG4gICAgICogQHNpbmdsZXRvblxuICAgICAqIEBuYW1lc3BhY2UgZWFzeVhETVxuICAgICAqL1xuICAgIGVhc3lYRE0uRm4gPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdG9yZXMgYSBmdW5jdGlvbiB1c2luZyB0aGUgZ2l2ZW4gbmFtZSBmb3IgcmVmZXJlbmNlXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIHRoYXQgdGhlIGZ1bmN0aW9uIHNob3VsZCBiZSByZWZlcnJlZCBieVxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb24gdG8gc3RvcmVcbiAgICAgICAgICogQG5hbWVzcGFjZSBlYXN5WERNLmZuXG4gICAgICAgICAqL1xuICAgICAgICBzZXQ6IGZ1bmN0aW9uKG5hbWUsIGZuKXtcbiAgICAgICAgICAgIF9tYXBbbmFtZV0gPSBmbjtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlcyB0aGUgZnVuY3Rpb24gcmVmZXJyZWQgdG8gYnkgdGhlIGdpdmVuIG5hbWVcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uIHRvIHJldHJpZXZlXG4gICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gZGVsIElmIHRoZSBmdW5jdGlvbiBzaG91bGQgYmUgZGVsZXRlZCBhZnRlciByZXRyaWV2YWxcbiAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb259IFRoZSBzdG9yZWQgZnVuY3Rpb25cbiAgICAgICAgICogQG5hbWVzcGFjZSBlYXN5WERNLmZuXG4gICAgICAgICAqL1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKG5hbWUsIGRlbCl7XG4gICAgICAgICAgICBpZiAoIV9tYXAuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZm4gPSBfbWFwW25hbWVdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZGVsKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIF9tYXBbbmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZm47XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxufSgpKTtcbi8qanNsaW50IGV2aWw6IHRydWUsIGJyb3dzZXI6IHRydWUsIGltbWVkOiB0cnVlLCBwYXNzZmFpbDogdHJ1ZSwgdW5kZWY6IHRydWUsIG5ld2NhcDogdHJ1ZSovXG4vKmdsb2JhbCBlYXN5WERNLCB3aW5kb3csIGVzY2FwZSwgdW5lc2NhcGUsIGNoYWluU3RhY2ssIHByZXBhcmVUcmFuc3BvcnRTdGFjaywgZ2V0TG9jYXRpb24sIGRlYnVnICovXG4vL1xuLy8gZWFzeVhETVxuLy8gaHR0cDovL2Vhc3l4ZG0ubmV0L1xuLy8gQ29weXJpZ2h0KGMpIDIwMDktMjAxMSwgw5h5dmluZCBTZWFuIEtpbnNleSwgb3l2aW5kQGtpbnNleS5uby5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4vLyBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4vLyBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4vLyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4vLyBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi8vIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4vLyBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4vLyBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuLy8gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuLy8gVEhFIFNPRlRXQVJFLlxuLy9cblxuLyoqXG4gKiBAY2xhc3MgZWFzeVhETS5Tb2NrZXRcbiAqIFRoaXMgY2xhc3MgY3JlYXRlcyBhIHRyYW5zcG9ydCBjaGFubmVsIGJldHdlZW4gdHdvIGRvbWFpbnMgdGhhdCBpcyB1c2FibGUgZm9yIHNlbmRpbmcgYW5kIHJlY2VpdmluZyBzdHJpbmctYmFzZWQgbWVzc2FnZXMuPGJyLz5cbiAqIFRoZSBjaGFubmVsIGlzIHJlbGlhYmxlLCBzdXBwb3J0cyBxdWV1ZWluZywgYW5kIGVuc3VyZXMgdGhhdCB0aGUgbWVzc2FnZSBvcmlnaW5hdGVzIGZyb20gdGhlIGV4cGVjdGVkIGRvbWFpbi48YnIvPlxuICogSW50ZXJuYWxseSBkaWZmZXJlbnQgc3RhY2tzIHdpbGwgYmUgdXNlZCBkZXBlbmRpbmcgb24gdGhlIGJyb3dzZXJzIGZlYXR1cmVzIGFuZCB0aGUgYXZhaWxhYmxlIHBhcmFtZXRlcnMuXG4gKiA8aDI+SG93IHRvIHNldCB1cDwvaDI+XG4gKiBTZXR0aW5nIHVwIHRoZSBwcm92aWRlcjpcbiAqIDxwcmU+PGNvZGU+XG4gKiB2YXIgc29ja2V0ID0gbmV3IGVhc3lYRE0uU29ja2V0KHtcbiAqICZuYnNwOyBsb2NhbDogXCJuYW1lLmh0bWxcIixcbiAqICZuYnNwOyBvblJlYWR5OiBmdW5jdGlvbigpe1xuICogJm5ic3A7ICZuYnNwOyAmIzQ3OyYjNDc7IHlvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBvblJlYWR5IGNhbGxiYWNrIGJlZm9yZSB1c2luZyB0aGUgc29ja2V0XG4gKiAmbmJzcDsgJm5ic3A7IHNvY2tldC5wb3N0TWVzc2FnZShcImZvby1tZXNzYWdlXCIpO1xuICogJm5ic3A7IH0sXG4gKiAmbmJzcDsgb25NZXNzYWdlOiBmdW5jdGlvbihtZXNzYWdlLCBvcmlnaW4pIHtcbiAqICZuYnNwOyZuYnNwOyBhbGVydChcInJlY2VpdmVkIFwiICsgbWVzc2FnZSArIFwiIGZyb20gXCIgKyBvcmlnaW4pO1xuICogJm5ic3A7IH1cbiAqIH0pO1xuICogPC9jb2RlPjwvcHJlPlxuICogU2V0dGluZyB1cCB0aGUgY29uc3VtZXI6XG4gKiA8cHJlPjxjb2RlPlxuICogdmFyIHNvY2tldCA9IG5ldyBlYXN5WERNLlNvY2tldCh7XG4gKiAmbmJzcDsgcmVtb3RlOiBcImh0dHA6JiM0NzsmIzQ3O3JlbW90ZWRvbWFpbi9wYWdlLmh0bWxcIixcbiAqICZuYnNwOyByZW1vdGVIZWxwZXI6IFwiaHR0cDomIzQ3OyYjNDc7cmVtb3RlZG9tYWluL25hbWUuaHRtbFwiLFxuICogJm5ic3A7IG9uUmVhZHk6IGZ1bmN0aW9uKCl7XG4gKiAmbmJzcDsgJm5ic3A7ICYjNDc7JiM0NzsgeW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIG9uUmVhZHkgY2FsbGJhY2sgYmVmb3JlIHVzaW5nIHRoZSBzb2NrZXRcbiAqICZuYnNwOyAmbmJzcDsgc29ja2V0LnBvc3RNZXNzYWdlKFwiZm9vLW1lc3NhZ2VcIik7XG4gKiAmbmJzcDsgfSxcbiAqICZuYnNwOyBvbk1lc3NhZ2U6IGZ1bmN0aW9uKG1lc3NhZ2UsIG9yaWdpbikge1xuICogJm5ic3A7Jm5ic3A7IGFsZXJ0KFwicmVjZWl2ZWQgXCIgKyBtZXNzYWdlICsgXCIgZnJvbSBcIiArIG9yaWdpbik7XG4gKiAmbmJzcDsgfVxuICogfSk7XG4gKiA8L2NvZGU+PC9wcmU+XG4gKiBJZiB5b3UgYXJlIHVuYWJsZSB0byB1cGxvYWQgdGhlIDxjb2RlPm5hbWUuaHRtbDwvY29kZT4gZmlsZSB0byB0aGUgY29uc3VtZXJzIGRvbWFpbiB0aGVuIHJlbW92ZSB0aGUgPGNvZGU+cmVtb3RlSGVscGVyPC9jb2RlPiBwcm9wZXJ0eVxuICogYW5kIGVhc3lYRE0gd2lsbCBmYWxsIGJhY2sgdG8gdXNpbmcgdGhlIEhhc2hUcmFuc3BvcnQgaW5zdGVhZCBvZiB0aGUgTmFtZVRyYW5zcG9ydCB3aGVuIG5vdCBhYmxlIHRvIHVzZSBhbnkgb2YgdGhlIHByaW1hcnkgdHJhbnNwb3J0cy5cbiAqIEBuYW1lc3BhY2UgZWFzeVhETVxuICogQGNvbnN0cnVjdG9yXG4gKiBAY2ZnIHtTdHJpbmcvV2luZG93fSBsb2NhbCBUaGUgdXJsIHRvIHRoZSBsb2NhbCBuYW1lLmh0bWwgZG9jdW1lbnQsIGEgbG9jYWwgc3RhdGljIGZpbGUsIG9yIGEgcmVmZXJlbmNlIHRvIHRoZSBsb2NhbCB3aW5kb3cuXG4gKiBAY2ZnIHtCb29sZWFufSBsYXp5IChDb25zdW1lciBvbmx5KSBTZXQgdGhpcyB0byB0cnVlIGlmIHlvdSB3YW50IGVhc3lYRE0gdG8gZGVmZXIgY3JlYXRpbmcgdGhlIHRyYW5zcG9ydCB1bnRpbCByZWFsbHkgbmVlZGVkLiBcbiAqIEBjZmcge1N0cmluZ30gcmVtb3RlIChDb25zdW1lciBvbmx5KSBUaGUgdXJsIHRvIHRoZSBwcm92aWRlcnMgZG9jdW1lbnQuXG4gKiBAY2ZnIHtTdHJpbmd9IHJlbW90ZUhlbHBlciAoQ29uc3VtZXIgb25seSkgVGhlIHVybCB0byB0aGUgcmVtb3RlIG5hbWUuaHRtbCBmaWxlLiBUaGlzIGlzIHRvIHN1cHBvcnQgTmFtZVRyYW5zcG9ydCBhcyBhIGZhbGxiYWNrLiBPcHRpb25hbC5cbiAqIEBjZmcge051bWJlcn0gZGVsYXkgVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgZWFzeVhETSBzaG91bGQgdHJ5IHRvIGdldCBhIHJlZmVyZW5jZSB0byB0aGUgbG9jYWwgd2luZG93LiAgT3B0aW9uYWwsIGRlZmF1bHRzIHRvIDIwMDAuXG4gKiBAY2ZnIHtOdW1iZXJ9IGludGVydmFsIFRoZSBpbnRlcnZhbCB1c2VkIHdoZW4gcG9sbGluZyBmb3IgbWVzc2FnZXMuIE9wdGlvbmFsLCBkZWZhdWx0cyB0byAzMDAuXG4gKiBAY2ZnIHtTdHJpbmd9IGNoYW5uZWwgKENvbnN1bWVyIG9ubHkpIFRoZSBuYW1lIG9mIHRoZSBjaGFubmVsIHRvIHVzZS4gQ2FuIGJlIHVzZWQgdG8gc2V0IGNvbnNpc3RlbnQgaWZyYW1lIG5hbWVzLiBNdXN0IGJlIHVuaXF1ZS4gT3B0aW9uYWwuXG4gKiBAY2ZnIHtGdW5jdGlvbn0gb25NZXNzYWdlIFRoZSBtZXRob2QgdGhhdCBzaG91bGQgaGFuZGxlIGluY29taW5nIG1lc3NhZ2VzLjxici8+IFRoaXMgbWV0aG9kIHNob3VsZCBhY2NlcHQgdHdvIGFyZ3VtZW50cywgdGhlIG1lc3NhZ2UgYXMgYSBzdHJpbmcsIGFuZCB0aGUgb3JpZ2luIGFzIGEgc3RyaW5nLiBPcHRpb25hbC5cbiAqIEBjZmcge0Z1bmN0aW9ufSBvblJlYWR5IEEgbWV0aG9kIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSB0cmFuc3BvcnQgaXMgcmVhZHkuIE9wdGlvbmFsLlxuICogQGNmZyB7RE9NRWxlbWVudHxTdHJpbmd9IGNvbnRhaW5lciAoQ29uc3VtZXIgb25seSkgVGhlIGVsZW1lbnQsIG9yIHRoZSBpZCBvZiB0aGUgZWxlbWVudCB0aGF0IHRoZSBwcmltYXJ5IGlmcmFtZSBzaG91bGQgYmUgaW5zZXJ0ZWQgaW50by4gSWYgbm90IHNldCB0aGVuIHRoZSBpZnJhbWUgd2lsbCBiZSBwb3NpdGlvbmVkIG9mZi1zY3JlZW4uIE9wdGlvbmFsLlxuICogQGNmZyB7QXJyYXkvU3RyaW5nfSBhY2wgKFByb3ZpZGVyIG9ubHkpIEhlcmUgeW91IGNhbiBzcGVjaWZ5IHdoaWNoICdbcHJvdG9jb2xdOi8vW2RvbWFpbl0nIHBhdHRlcm5zIHRoYXQgc2hvdWxkIGJlIGFsbG93ZWQgdG8gYWN0IGFzIHRoZSBjb25zdW1lciB0b3dhcmRzIHRoaXMgcHJvdmlkZXIuPGJyLz5cbiAqIFRoaXMgY2FuIGNvbnRhaW4gdGhlIHdpbGRjYXJkcyA/IGFuZCAqLiAgRXhhbXBsZXMgYXJlICdodHRwOi8vZXhhbXBsZS5jb20nLCAnKi5mb28uY29tJyBhbmQgJypkb20/LmNvbScuIElmIHlvdSB3YW50IHRvIHVzZSByZXF1bGFyIGV4cHJlc3Npb25zIHRoZW4geW91IHBhdHRlcm4gbmVlZHMgdG8gc3RhcnQgd2l0aCBeIGFuZCBlbmQgd2l0aCAkLlxuICogSWYgbm9uZSBvZiB0aGUgcGF0dGVybnMgbWF0Y2ggYW4gRXJyb3Igd2lsbCBiZSB0aHJvd24uICBcbiAqIEBjZmcge09iamVjdH0gcHJvcHMgKENvbnN1bWVyIG9ubHkpIEFkZGl0aW9uYWwgcHJvcGVydGllcyB0aGF0IHNob3VsZCBiZSBhcHBsaWVkIHRvIHRoZSBpZnJhbWUuIFRoaXMgY2FuIGFsc28gY29udGFpbiBuZXN0ZWQgb2JqZWN0cyBlLmc6IDxjb2RlPntzdHlsZTp7d2lkdGg6XCIxMDBweFwiLCBoZWlnaHQ6XCIxMDBweFwifX08L2NvZGU+LiBcbiAqIFByb3BlcnRpZXMgc3VjaCBhcyAnbmFtZScgYW5kICdzcmMnIHdpbGwgYmUgb3ZlcnJpZGVkLiBPcHRpb25hbC5cbiAqL1xuZWFzeVhETS5Tb2NrZXQgPSBmdW5jdGlvbihjb25maWcpe1xuICAgIFxuICAgIC8vIGNyZWF0ZSB0aGUgc3RhY2tcbiAgICB2YXIgc3RhY2sgPSBjaGFpblN0YWNrKHByZXBhcmVUcmFuc3BvcnRTdGFjayhjb25maWcpLmNvbmNhdChbe1xuICAgICAgICBpbmNvbWluZzogZnVuY3Rpb24obWVzc2FnZSwgb3JpZ2luKXtcbiAgICAgICAgICAgIGNvbmZpZy5vbk1lc3NhZ2UobWVzc2FnZSwgb3JpZ2luKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKHN1Y2Nlc3Mpe1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5vblJlYWR5KSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLm9uUmVhZHkoc3VjY2Vzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XSkpLCByZWNpcGllbnQgPSBnZXRMb2NhdGlvbihjb25maWcucmVtb3RlKTtcbiAgICBcbiAgICAvLyBzZXQgdGhlIG9yaWdpblxuICAgIHRoaXMub3JpZ2luID0gZ2V0TG9jYXRpb24oY29uZmlnLnJlbW90ZSk7XG5cdFxuICAgIC8qKlxuICAgICAqIEluaXRpYXRlcyB0aGUgZGVzdHJ1Y3Rpb24gb2YgdGhlIHN0YWNrLlxuICAgICAqL1xuICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHN0YWNrLmRlc3Ryb3koKTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIFBvc3RzIGEgbWVzc2FnZSB0byB0aGUgcmVtb3RlIGVuZCBvZiB0aGUgY2hhbm5lbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIHNlbmRcbiAgICAgKi9cbiAgICB0aGlzLnBvc3RNZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgIHN0YWNrLm91dGdvaW5nKG1lc3NhZ2UsIHJlY2lwaWVudCk7XG4gICAgfTtcbiAgICBcbiAgICBzdGFjay5pbml0KCk7XG59O1xuLypqc2xpbnQgZXZpbDogdHJ1ZSwgYnJvd3NlcjogdHJ1ZSwgaW1tZWQ6IHRydWUsIHBhc3NmYWlsOiB0cnVlLCB1bmRlZjogdHJ1ZSwgbmV3Y2FwOiB0cnVlKi9cbi8qZ2xvYmFsIGVhc3lYRE0sIHdpbmRvdywgZXNjYXBlLCB1bmVzY2FwZSwgdW5kZWYsLCBjaGFpblN0YWNrLCBwcmVwYXJlVHJhbnNwb3J0U3RhY2ssIGRlYnVnLCBnZXRMb2NhdGlvbiAqL1xuLy9cbi8vIGVhc3lYRE1cbi8vIGh0dHA6Ly9lYXN5eGRtLm5ldC9cbi8vIENvcHlyaWdodChjKSAyMDA5LTIwMTEsIMOYeXZpbmQgU2VhbiBLaW5zZXksIG95dmluZEBraW5zZXkubm8uXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuLy8gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuLy8gaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuLy8gdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuLy8gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4vLyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4vLyBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi8vIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLy8gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuLy8gTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbi8vIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbi8vIFRIRSBTT0ZUV0FSRS5cbi8vXG5cbi8qKiBcbiAqIEBjbGFzcyBlYXN5WERNLlJwY1xuICogQ3JlYXRlcyBhIHByb3h5IG9iamVjdCB0aGF0IGNhbiBiZSB1c2VkIHRvIGNhbGwgbWV0aG9kcyBpbXBsZW1lbnRlZCBvbiB0aGUgcmVtb3RlIGVuZCBvZiB0aGUgY2hhbm5lbCwgYW5kIGFsc28gdG8gcHJvdmlkZSB0aGUgaW1wbGVtZW50YXRpb25cbiAqIG9mIG1ldGhvZHMgdG8gYmUgY2FsbGVkIGZyb20gdGhlIHJlbW90ZSBlbmQuPGJyLz5cbiAqIFRoZSBpbnN0YW50aWF0ZWQgb2JqZWN0IHdpbGwgaGF2ZSBtZXRob2RzIG1hdGNoaW5nIHRob3NlIHNwZWNpZmllZCBpbiA8Y29kZT5jb25maWcucmVtb3RlPC9jb2RlPi48YnIvPlxuICogVGhpcyByZXF1aXJlcyB0aGUgSlNPTiBvYmplY3QgcHJlc2VudCBpbiB0aGUgZG9jdW1lbnQsIGVpdGhlciBuYXRpdmVseSwgdXNpbmcganNvbi5vcmcncyBqc29uMiBvciBhcyBhIHdyYXBwZXIgYXJvdW5kIGxpYnJhcnkgc3Blc2lmaWMgbWV0aG9kcy5cbiAqIDxoMj5Ib3cgdG8gc2V0IHVwPC9oMj5cbiAqIDxwcmU+PGNvZGU+XG4gKiB2YXIgcnBjID0gbmV3IGVhc3lYRE0uUnBjKHtcbiAqICZuYnNwOyAmIzQ3OyYjNDc7IHRoaXMgY29uZmlndXJhdGlvbiBpcyBlcXVhbCB0byB0aGF0IHVzZWQgYnkgdGhlIFNvY2tldC5cbiAqICZuYnNwOyByZW1vdGU6IFwiaHR0cDomIzQ3OyYjNDc7cmVtb3RlZG9tYWluLy4uLlwiLFxuICogJm5ic3A7IG9uUmVhZHk6IGZ1bmN0aW9uKCl7XG4gKiAmbmJzcDsgJm5ic3A7ICYjNDc7JiM0NzsgeW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIG9uUmVhZHkgY2FsbGJhY2sgYmVmb3JlIHVzaW5nIHRoZSBwcm94eVxuICogJm5ic3A7ICZuYnNwOyBycGMuZm9vKC4uLlxuICogJm5ic3A7IH1cbiAqIH0se1xuICogJm5ic3A7IGxvY2FsOiB7Li59LFxuICogJm5ic3A7IHJlbW90ZTogey4ufVxuICogfSk7XG4gKiA8L2NvZGU+PC9wcmU+XG4gKiBcbiAqIDxoMj5FeHBvc2luZyBmdW5jdGlvbnMgKHByb2NlZHVyZXMpPC9oMj5cbiAqIDxwcmU+PGNvZGU+XG4gKiB2YXIgcnBjID0gbmV3IGVhc3lYRE0uUnBjKHtcbiAqICZuYnNwOyAuLi5cbiAqIH0se1xuICogJm5ic3A7IGxvY2FsOiB7XG4gKiAmbmJzcDsgJm5ic3A7IG5hbWVPZk1ldGhvZDoge1xuICogJm5ic3A7ICZuYnNwOyAmbmJzcDsgbWV0aG9kOiBmdW5jdGlvbihhcmcxLCBhcmcyLCBzdWNjZXNzLCBlcnJvcil7XG4gKiAmbmJzcDsgJm5ic3A7ICZuYnNwOyAmbmJzcDsgLi4uXG4gKiAmbmJzcDsgJm5ic3A7ICZuYnNwOyB9XG4gKiAmbmJzcDsgJm5ic3A7IH0sXG4gKiAmbmJzcDsgJm5ic3A7ICYjNDc7JiM0Nzsgd2l0aCBzaG9ydGhhbmQgbm90YXRpb24gXG4gKiAmbmJzcDsgJm5ic3A7IG5hbWVPZkFub3RoZXJNZXRob2Q6ICBmdW5jdGlvbihhcmcxLCBhcmcyLCBzdWNjZXNzLCBlcnJvcil7XG4gKiAmbmJzcDsgJm5ic3A7IH1cbiAqICZuYnNwOyB9LFxuICogJm5ic3A7IHJlbW90ZTogey4uLn1cbiAqIH0pO1xuICogPC9jb2RlPjwvcHJlPlxuXG4gKiBUaGUgZnVuY3Rpb24gcmVmZXJlbmNlZCBieSAgW21ldGhvZF0gd2lsbCByZWNlaXZlIHRoZSBwYXNzZWQgYXJndW1lbnRzIGZvbGxvd2VkIGJ5IHRoZSBjYWxsYmFjayBmdW5jdGlvbnMgPGNvZGU+c3VjY2VzczwvY29kZT4gYW5kIDxjb2RlPmVycm9yPC9jb2RlPi48YnIvPlxuICogVG8gc2VuZCBhIHN1Y2Nlc3NmdWxsIHJlc3VsdCBiYWNrIHlvdSBjYW4gdXNlXG4gKiAgICAgPHByZT48Y29kZT5cbiAqICAgICByZXR1cm4gZm9vO1xuICogICAgIDwvcHJlPjwvY29kZT5cbiAqIG9yXG4gKiAgICAgPHByZT48Y29kZT5cbiAqICAgICBzdWNjZXNzKGZvbyk7XG4gKiAgICAgPC9wcmU+PC9jb2RlPlxuICogIFRvIHJldHVybiBhbiBlcnJvciB5b3UgY2FuIHVzZVxuICogICAgIDxwcmU+PGNvZGU+XG4gKiAgICAgdGhyb3cgbmV3IEVycm9yKFwiZm9vIGVycm9yXCIpO1xuICogICAgIDwvY29kZT48L3ByZT5cbiAqIG9yXG4gKiAgICAgPHByZT48Y29kZT5cbiAqICAgICBlcnJvcihcImZvbyBlcnJvclwiKTtcbiAqICAgICA8L2NvZGU+PC9wcmU+XG4gKlxuICogPGgyPkRlZmluaW5nIHJlbW90ZWx5IGV4cG9zZWQgbWV0aG9kcyAocHJvY2VkdXJlcy9ub3RpZmljYXRpb25zKTwvaDI+XG4gKiBUaGUgZGVmaW5pdGlvbiBvZiB0aGUgcmVtb3RlIGVuZCBpcyBxdWl0ZSBzaW1pbGFyOlxuICogPHByZT48Y29kZT5cbiAqIHZhciBycGMgPSBuZXcgZWFzeVhETS5ScGMoe1xuICogJm5ic3A7IC4uLlxuICogfSx7XG4gKiAmbmJzcDsgbG9jYWw6IHsuLi59LFxuICogJm5ic3A7IHJlbW90ZToge1xuICogJm5ic3A7ICZuYnNwOyBuYW1lT2ZNZXRob2Q6IHt9XG4gKiAmbmJzcDsgfVxuICogfSk7XG4gKiA8L2NvZGU+PC9wcmU+XG4gKiBUbyBjYWxsIGEgcmVtb3RlIG1ldGhvZCB1c2VcbiAqIDxwcmU+PGNvZGU+XG4gKiBycGMubmFtZU9mTWV0aG9kKFwiYXJnMVwiLCBcImFyZzJcIiwgZnVuY3Rpb24odmFsdWUpIHtcbiAqICZuYnNwOyBhbGVydChcInN1Y2Nlc3M6IFwiICsgdmFsdWUpO1xuICogfSwgZnVuY3Rpb24obWVzc2FnZSkge1xuICogJm5ic3A7IGFsZXJ0KFwiZXJyb3I6IFwiICsgbWVzc2FnZSArICk7XG4gKiB9KTtcbiAqIDwvY29kZT48L3ByZT5cbiAqIEJvdGggdGhlIDxjb2RlPnN1Y2Nlc3M8L2NvZGU+IGFuZCA8Y29kZT5lcnJyb3I8L2NvZGU+IGNhbGxiYWNrcyBhcmUgb3B0aW9uYWwuPGJyLz5cbiAqIFdoZW4gY2FsbGVkIHdpdGggbm8gY2FsbGJhY2sgYSBKU09OLVJQQyAyLjAgbm90aWZpY2F0aW9uIHdpbGwgYmUgZXhlY3V0ZWQuXG4gKiBCZSBhd2FyZSB0aGF0IHlvdSB3aWxsIG5vdCBiZSBub3RpZmllZCBvZiBhbnkgZXJyb3JzIHdpdGggdGhpcyBtZXRob2QuXG4gKiA8YnIvPlxuICogPGgyPlNwZWNpZnlpbmcgYSBjdXN0b20gc2VyaWFsaXplcjwvaDI+XG4gKiBJZiB5b3UgZG8gbm90IHdhbnQgdG8gdXNlIHRoZSBKU09OMiBsaWJyYXJ5IGZvciBub24tbmF0aXZlIEpTT04gc3VwcG9ydCwgYnV0IGluc3RlYWQgY2FwYWJpbGl0aWVzIHByb3ZpZGVkIGJ5IHNvbWUgb3RoZXIgbGlicmFyeVxuICogdGhlbiB5b3UgY2FuIHNwZWNpZnkgYSBjdXN0b20gc2VyaWFsaXplciB1c2luZyA8Y29kZT5zZXJpYWxpemVyOiBmb288L2NvZGU+XG4gKiA8cHJlPjxjb2RlPlxuICogdmFyIHJwYyA9IG5ldyBlYXN5WERNLlJwYyh7XG4gKiAmbmJzcDsgLi4uXG4gKiB9LHtcbiAqICZuYnNwOyBsb2NhbDogey4uLn0sXG4gKiAmbmJzcDsgcmVtb3RlOiB7Li4ufSxcbiAqICZuYnNwOyBzZXJpYWxpemVyIDoge1xuICogJm5ic3A7ICZuYnNwOyBwYXJzZTogZnVuY3Rpb24oc3RyaW5nKXsgLi4uIH0sXG4gKiAmbmJzcDsgJm5ic3A7IHN0cmluZ2lmeTogZnVuY3Rpb24ob2JqZWN0KSB7Li4ufVxuICogJm5ic3A7IH1cbiAqIH0pO1xuICogPC9jb2RlPjwvcHJlPlxuICogSWYgPGNvZGU+c2VyaWFsaXplcjwvY29kZT4gaXMgc2V0IHRoZW4gdGhlIGNsYXNzIHdpbGwgbm90IGF0dGVtcHQgdG8gdXNlIHRoZSBuYXRpdmUgaW1wbGVtZW50YXRpb24uXG4gKiBAbmFtZXNwYWNlIGVhc3lYRE1cbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgdW5kZXJseWluZyB0cmFuc3BvcnRzIGNvbmZpZ3VyYXRpb24uIFNlZSBlYXN5WERNLlNvY2tldCBmb3IgYXZhaWxhYmxlIHBhcmFtZXRlcnMuXG4gKiBAcGFyYW0ge09iamVjdH0ganNvblJwY0NvbmZpZyBUaGUgZGVzY3JpcHRpb24gb2YgdGhlIGludGVyZmFjZSB0byBpbXBsZW1lbnQuXG4gKi9cbmVhc3lYRE0uUnBjID0gZnVuY3Rpb24oY29uZmlnLCBqc29uUnBjQ29uZmlnKXtcbiAgICBcbiAgICAvLyBleHBhbmQgc2hvcnRoYW5kIG5vdGF0aW9uXG4gICAgaWYgKGpzb25ScGNDb25maWcubG9jYWwpIHtcbiAgICAgICAgZm9yICh2YXIgbWV0aG9kIGluIGpzb25ScGNDb25maWcubG9jYWwpIHtcbiAgICAgICAgICAgIGlmIChqc29uUnBjQ29uZmlnLmxvY2FsLmhhc093blByb3BlcnR5KG1ldGhvZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgbWVtYmVyID0ganNvblJwY0NvbmZpZy5sb2NhbFttZXRob2RdO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVtYmVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAganNvblJwY0NvbmZpZy5sb2NhbFttZXRob2RdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBtZW1iZXJcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cdFxuICAgIC8vIGNyZWF0ZSB0aGUgc3RhY2tcbiAgICB2YXIgc3RhY2sgPSBjaGFpblN0YWNrKHByZXBhcmVUcmFuc3BvcnRTdGFjayhjb25maWcpLmNvbmNhdChbbmV3IGVhc3lYRE0uc3RhY2suUnBjQmVoYXZpb3IodGhpcywganNvblJwY0NvbmZpZyksIHtcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKHN1Y2Nlc3Mpe1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5vblJlYWR5KSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLm9uUmVhZHkoc3VjY2Vzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XSkpO1xuXHRcbiAgICAvLyBzZXQgdGhlIG9yaWdpbiBcbiAgICB0aGlzLm9yaWdpbiA9IGdldExvY2F0aW9uKGNvbmZpZy5yZW1vdGUpO1xuXHRcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWF0ZXMgdGhlIGRlc3RydWN0aW9uIG9mIHRoZSBzdGFjay5cbiAgICAgKi9cbiAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbigpe1xuICAgICAgICBzdGFjay5kZXN0cm95KCk7XG4gICAgfTtcbiAgICBcbiAgICBzdGFjay5pbml0KCk7XG59O1xuLypqc2xpbnQgZXZpbDogdHJ1ZSwgYnJvd3NlcjogdHJ1ZSwgaW1tZWQ6IHRydWUsIHBhc3NmYWlsOiB0cnVlLCB1bmRlZjogdHJ1ZSwgbmV3Y2FwOiB0cnVlKi9cbi8qZ2xvYmFsIGVhc3lYRE0sIHdpbmRvdywgZXNjYXBlLCB1bmVzY2FwZSwgZ2V0TG9jYXRpb24sIGFwcGVuZFF1ZXJ5UGFyYW1ldGVycywgY3JlYXRlRnJhbWUsIGRlYnVnLCB1biwgb24sIGFwcGx5LCB3aGVuUmVhZHksIGdldFBhcmVudE9iamVjdCwgSUZSQU1FX1BSRUZJWCovXG4vL1xuLy8gZWFzeVhETVxuLy8gaHR0cDovL2Vhc3l4ZG0ubmV0L1xuLy8gQ29weXJpZ2h0KGMpIDIwMDktMjAxMSwgw5h5dmluZCBTZWFuIEtpbnNleSwgb3l2aW5kQGtpbnNleS5uby5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4vLyBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4vLyBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4vLyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4vLyBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi8vIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4vLyBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4vLyBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuLy8gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuLy8gVEhFIFNPRlRXQVJFLlxuLy9cblxuLyoqXG4gKiBAY2xhc3MgZWFzeVhETS5zdGFjay5TYW1lT3JpZ2luVHJhbnNwb3J0XG4gKiBTYW1lT3JpZ2luVHJhbnNwb3J0IGlzIGEgdHJhbnNwb3J0IGNsYXNzIHRoYXQgY2FuIGJlIHVzZWQgd2hlbiBib3RoIGRvbWFpbnMgaGF2ZSB0aGUgc2FtZSBvcmlnaW4uPGJyLz5cbiAqIFRoaXMgY2FuIGJlIHVzZWZ1bCBmb3IgdGVzdGluZyBhbmQgZm9yIHdoZW4gdGhlIG1haW4gYXBwbGljYXRpb24gc3VwcG9ydHMgYm90aCBpbnRlcm5hbCBhbmQgZXh0ZXJuYWwgc291cmNlcy5cbiAqIEBuYW1lc3BhY2UgZWFzeVhETS5zdGFja1xuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSB0cmFuc3BvcnRzIGNvbmZpZ3VyYXRpb24uXG4gKiBAY2ZnIHtTdHJpbmd9IHJlbW90ZSBUaGUgcmVtb3RlIGRvY3VtZW50IHRvIGNvbW11bmljYXRlIHdpdGguXG4gKi9cbmVhc3lYRE0uc3RhY2suU2FtZU9yaWdpblRyYW5zcG9ydCA9IGZ1bmN0aW9uKGNvbmZpZyl7XG4gICAgdmFyIHB1YiwgZnJhbWUsIHNlbmQsIHRhcmdldE9yaWdpbjtcbiAgICBcbiAgICByZXR1cm4gKHB1YiA9IHtcbiAgICAgICAgb3V0Z29pbmc6IGZ1bmN0aW9uKG1lc3NhZ2UsIGRvbWFpbiwgZm4pe1xuICAgICAgICAgICAgc2VuZChtZXNzYWdlKTtcbiAgICAgICAgICAgIGlmIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRlc3Ryb3k6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZiAoZnJhbWUpIHtcbiAgICAgICAgICAgICAgICBmcmFtZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGZyYW1lKTtcbiAgICAgICAgICAgICAgICBmcmFtZSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9uRE9NUmVhZHk6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0YXJnZXRPcmlnaW4gPSBnZXRMb2NhdGlvbihjb25maWcucmVtb3RlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNvbmZpZy5pc0hvc3QpIHtcbiAgICAgICAgICAgICAgICAvLyBzZXQgdXAgdGhlIGlmcmFtZVxuICAgICAgICAgICAgICAgIGFwcGx5KGNvbmZpZy5wcm9wcywge1xuICAgICAgICAgICAgICAgICAgICBzcmM6IGFwcGVuZFF1ZXJ5UGFyYW1ldGVycyhjb25maWcucmVtb3RlLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4ZG1fZTogbG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyBsb2NhdGlvbi5ob3N0ICsgbG9jYXRpb24ucGF0aG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB4ZG1fYzogY29uZmlnLmNoYW5uZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICB4ZG1fcDogNCAvLyA0ID0gU2FtZU9yaWdpblRyYW5zcG9ydFxuICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogSUZSQU1FX1BSRUZJWCArIGNvbmZpZy5jaGFubmVsICsgXCJfcHJvdmlkZXJcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGZyYW1lID0gY3JlYXRlRnJhbWUoY29uZmlnKTtcbiAgICAgICAgICAgICAgICBlYXN5WERNLkZuLnNldChjb25maWcuY2hhbm5lbCwgZnVuY3Rpb24oc2VuZEZuKXtcbiAgICAgICAgICAgICAgICAgICAgc2VuZCA9IHNlbmRGbjtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcHViLnVwLmNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG1zZyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBwdWIudXAuaW5jb21pbmcobXNnLCB0YXJnZXRPcmlnaW4pO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VuZCA9IGdldFBhcmVudE9iamVjdCgpLkZuLmdldChjb25maWcuY2hhbm5lbCwgdHJ1ZSkoZnVuY3Rpb24obXNnKXtcbiAgICAgICAgICAgICAgICAgICAgcHViLnVwLmluY29taW5nKG1zZywgdGFyZ2V0T3JpZ2luKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHB1Yi51cC5jYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgaW5pdDogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHdoZW5SZWFkeShwdWIub25ET01SZWFkeSwgcHViKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcbi8qanNsaW50IGV2aWw6IHRydWUsIGJyb3dzZXI6IHRydWUsIGltbWVkOiB0cnVlLCBwYXNzZmFpbDogdHJ1ZSwgdW5kZWY6IHRydWUsIG5ld2NhcDogdHJ1ZSovXG4vKmdsb2JhbCBnbG9iYWwsIGVhc3lYRE0sIHdpbmRvdywgZ2V0TG9jYXRpb24sIGFwcGVuZFF1ZXJ5UGFyYW1ldGVycywgY3JlYXRlRnJhbWUsIGRlYnVnLCBhcHBseSwgd2hlblJlYWR5LCBJRlJBTUVfUFJFRklYLCBuYW1lc3BhY2UsIHJlc29sdmVVcmwsIGdldERvbWFpbk5hbWUsIEhBU19GTEFTSF9USFJPVFRMRURfQlVHLCBnZXRQb3J0LCBxdWVyeSovXG4vL1xuLy8gZWFzeVhETVxuLy8gaHR0cDovL2Vhc3l4ZG0ubmV0L1xuLy8gQ29weXJpZ2h0KGMpIDIwMDktMjAxMSwgw5h5dmluZCBTZWFuIEtpbnNleSwgb3l2aW5kQGtpbnNleS5uby5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4vLyBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4vLyBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4vLyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4vLyBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi8vIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4vLyBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4vLyBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuLy8gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuLy8gVEhFIFNPRlRXQVJFLlxuLy9cblxuLyoqXG4gKiBAY2xhc3MgZWFzeVhETS5zdGFjay5GbGFzaFRyYW5zcG9ydFxuICogRmxhc2hUcmFuc3BvcnQgaXMgYSB0cmFuc3BvcnQgY2xhc3MgdGhhdCB1c2VzIGFuIFNXRiB3aXRoIExvY2FsQ29ubmVjdGlvbiB0byBwYXNzIG1lc3NhZ2VzIGJhY2sgYW5kIGZvcnRoLlxuICogQG5hbWVzcGFjZSBlYXN5WERNLnN0YWNrXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgVGhlIHRyYW5zcG9ydHMgY29uZmlndXJhdGlvbi5cbiAqIEBjZmcge1N0cmluZ30gcmVtb3RlIFRoZSByZW1vdGUgZG9tYWluIHRvIGNvbW11bmljYXRlIHdpdGguXG4gKiBAY2ZnIHtTdHJpbmd9IHNlY3JldCB0aGUgcHJlLXNoYXJlZCBzZWNyZXQgdXNlZCB0byBzZWN1cmUgdGhlIGNvbW11bmljYXRpb24uXG4gKiBAY2ZnIHtTdHJpbmd9IHN3ZiBUaGUgcGF0aCB0byB0aGUgc3dmIGZpbGVcbiAqIEBjZmcge0Jvb2xlYW59IHN3Zk5vVGhyb3R0bGUgU2V0IHRoaXMgdG8gdHJ1ZSBpZiB5b3Ugd2FudCB0byB0YWtlIHN0ZXBzIHRvIGF2b2lkIGJlZWluZyB0aHJvdHRsZWQgd2hlbiBoaWRkZW4uXG4gKiBAY2ZnIHtTdHJpbmcgfHwgRE9NRWxlbWVudH0gc3dmQ29udGFpbmVyIFNldCB0aGlzIGlmIHlvdSB3YW50IHRvIGNvbnRyb2wgd2hlcmUgdGhlIHN3ZiBpcyBwbGFjZWRcbiAqL1xuZWFzeVhETS5zdGFjay5GbGFzaFRyYW5zcG9ydCA9IGZ1bmN0aW9uKGNvbmZpZyl7XG4gICAgdmFyIHB1YiwgLy8gdGhlIHB1YmxpYyBpbnRlcmZhY2VcbiBmcmFtZSwgc2VuZCwgdGFyZ2V0T3JpZ2luLCBzd2YsIHN3ZkNvbnRhaW5lcjtcbiAgICBcbiAgICBmdW5jdGlvbiBvbk1lc3NhZ2UobWVzc2FnZSwgb3JpZ2luKXtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgcHViLnVwLmluY29taW5nKG1lc3NhZ2UsIHRhcmdldE9yaWdpbik7XG4gICAgICAgIH0sIDApO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBUaGlzIG1ldGhvZCBhZGRzIHRoZSBTV0YgdG8gdGhlIERPTSBhbmQgcHJlcGFyZXMgdGhlIGluaXRpYWxpemF0aW9uIG9mIHRoZSBjaGFubmVsXG4gICAgICovXG4gICAgZnVuY3Rpb24gYWRkU3dmKGRvbWFpbil7XG4gICAgICAgIC8vIHRoZSBkaWZmZXJlbnRpYXRpbmcgcXVlcnkgYXJndW1lbnQgaXMgbmVlZGVkIGluIEZsYXNoOSB0byBhdm9pZCBhIGNhY2hpbmcgaXNzdWUgd2hlcmUgTG9jYWxDb25uZWN0aW9uIHdvdWxkIHRocm93IGFuIGVycm9yLlxuICAgICAgICB2YXIgdXJsID0gY29uZmlnLnN3ZiArIFwiP2hvc3Q9XCIgKyBjb25maWcuaXNIb3N0O1xuICAgICAgICB2YXIgaWQgPSBcImVhc3lYRE1fc3dmX1wiICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDApO1xuICAgICAgICBcbiAgICAgICAgLy8gcHJlcGFyZSB0aGUgaW5pdCBmdW5jdGlvbiB0aGF0IHdpbGwgZmlyZSBvbmNlIHRoZSBzd2YgaXMgcmVhZHlcbiAgICAgICAgZWFzeVhETS5Gbi5zZXQoXCJmbGFzaF9sb2FkZWRcIiArIGRvbWFpbi5yZXBsYWNlKC9bXFwtLl0vZywgXCJfXCIpLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgZWFzeVhETS5zdGFjay5GbGFzaFRyYW5zcG9ydFtkb21haW5dLnN3ZiA9IHN3ZiA9IHN3ZkNvbnRhaW5lci5maXJzdENoaWxkO1xuICAgICAgICAgICAgdmFyIHF1ZXVlID0gZWFzeVhETS5zdGFjay5GbGFzaFRyYW5zcG9ydFtkb21haW5dLnF1ZXVlO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHF1ZXVlW2ldKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxdWV1ZS5sZW5ndGggPSAwO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjb25maWcuc3dmQ29udGFpbmVyKSB7XG4gICAgICAgICAgICBzd2ZDb250YWluZXIgPSAodHlwZW9mIGNvbmZpZy5zd2ZDb250YWluZXIgPT0gXCJzdHJpbmdcIikgPyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjb25maWcuc3dmQ29udGFpbmVyKSA6IGNvbmZpZy5zd2ZDb250YWluZXI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBjcmVhdGUgdGhlIGNvbnRhaW5lciB0aGF0IHdpbGwgaG9sZCB0aGUgc3dmXG4gICAgICAgICAgICBzd2ZDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gaHR0cDovL2J1Z3MuYWRvYmUuY29tL2ppcmEvYnJvd3NlL0ZQLTQ3OTZcbiAgICAgICAgICAgIC8vIGh0dHA6Ly90ZWNoLmdyb3Vwcy55YWhvby5jb20vZ3JvdXAvZmxleGNvZGVycy9tZXNzYWdlLzE2MjM2NVxuICAgICAgICAgICAgLy8gaHR0cHM6Ly9ncm91cHMuZ29vZ2xlLmNvbS9mb3J1bS8jIXRvcGljL2Vhc3l4ZG0vbUpaSmhXYWdvTGNcbiAgICAgICAgICAgIGFwcGx5KHN3ZkNvbnRhaW5lci5zdHlsZSwgSEFTX0ZMQVNIX1RIUk9UVExFRF9CVUcgJiYgY29uZmlnLnN3Zk5vVGhyb3R0bGUgPyB7XG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBcIjIwcHhcIixcbiAgICAgICAgICAgICAgICB3aWR0aDogXCIyMHB4XCIsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IFwiZml4ZWRcIixcbiAgICAgICAgICAgICAgICByaWdodDogMCxcbiAgICAgICAgICAgICAgICB0b3A6IDBcbiAgICAgICAgICAgIH0gOiB7XG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBcIjFweFwiLFxuICAgICAgICAgICAgICAgIHdpZHRoOiBcIjFweFwiLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG4gICAgICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IDAsXG4gICAgICAgICAgICAgICAgdG9wOiAwXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc3dmQ29udGFpbmVyKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gY3JlYXRlIHRoZSBvYmplY3QvZW1iZWRcbiAgICAgICAgdmFyIGZsYXNoVmFycyA9IFwiY2FsbGJhY2s9Zmxhc2hfbG9hZGVkXCIgKyBlbmNvZGVVUklDb21wb25lbnQoZG9tYWluLnJlcGxhY2UoL1tcXC0uXS9nLCBcIl9cIikpXG4gICAgICAgICAgICArIFwiJnByb3RvPVwiICsgZ2xvYmFsLmxvY2F0aW9uLnByb3RvY29sXG4gICAgICAgICAgICArIFwiJmRvbWFpbj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChnZXREb21haW5OYW1lKGdsb2JhbC5sb2NhdGlvbi5ocmVmKSlcbiAgICAgICAgICAgICsgXCImcG9ydD1cIiArIGVuY29kZVVSSUNvbXBvbmVudChnZXRQb3J0KGdsb2JhbC5sb2NhdGlvbi5ocmVmKSlcbiAgICAgICAgICAgICsgXCImbnM9XCIgKyBlbmNvZGVVUklDb21wb25lbnQobmFtZXNwYWNlKTtcbiAgICAgICAgc3dmQ29udGFpbmVyLmlubmVySFRNTCA9IFwiPG9iamVjdCBoZWlnaHQ9JzIwJyB3aWR0aD0nMjAnIHR5cGU9J2FwcGxpY2F0aW9uL3gtc2hvY2t3YXZlLWZsYXNoJyBpZD0nXCIgKyBpZCArIFwiJyBkYXRhPSdcIiArIHVybCArIFwiJz5cIiArXG4gICAgICAgIFwiPHBhcmFtIG5hbWU9J2FsbG93U2NyaXB0QWNjZXNzJyB2YWx1ZT0nYWx3YXlzJz48L3BhcmFtPlwiICtcbiAgICAgICAgXCI8cGFyYW0gbmFtZT0nd21vZGUnIHZhbHVlPSd0cmFuc3BhcmVudCc+XCIgK1xuICAgICAgICBcIjxwYXJhbSBuYW1lPSdtb3ZpZScgdmFsdWU9J1wiICtcbiAgICAgICAgdXJsICtcbiAgICAgICAgXCInPjwvcGFyYW0+XCIgK1xuICAgICAgICBcIjxwYXJhbSBuYW1lPSdmbGFzaHZhcnMnIHZhbHVlPSdcIiArXG4gICAgICAgIGZsYXNoVmFycyArXG4gICAgICAgIFwiJz48L3BhcmFtPlwiICtcbiAgICAgICAgXCI8ZW1iZWQgdHlwZT0nYXBwbGljYXRpb24veC1zaG9ja3dhdmUtZmxhc2gnIEZsYXNoVmFycz0nXCIgK1xuICAgICAgICBmbGFzaFZhcnMgK1xuICAgICAgICBcIicgYWxsb3dTY3JpcHRBY2Nlc3M9J2Fsd2F5cycgd21vZGU9J3RyYW5zcGFyZW50JyBzcmM9J1wiICtcbiAgICAgICAgdXJsICtcbiAgICAgICAgXCInIGhlaWdodD0nMScgd2lkdGg9JzEnPjwvZW1iZWQ+XCIgK1xuICAgICAgICBcIjwvb2JqZWN0PlwiO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gKHB1YiA9IHtcbiAgICAgICAgb3V0Z29pbmc6IGZ1bmN0aW9uKG1lc3NhZ2UsIGRvbWFpbiwgZm4pe1xuICAgICAgICAgICAgc3dmLnBvc3RNZXNzYWdlKGNvbmZpZy5jaGFubmVsLCBtZXNzYWdlLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgaWYgKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZGVzdHJveTogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgc3dmLmRlc3Ryb3lDaGFubmVsKGNvbmZpZy5jaGFubmVsKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dmID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChmcmFtZSkge1xuICAgICAgICAgICAgICAgIGZyYW1lLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZnJhbWUpO1xuICAgICAgICAgICAgICAgIGZyYW1lID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb25ET01SZWFkeTogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGFyZ2V0T3JpZ2luID0gY29uZmlnLnJlbW90ZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUHJlcGFyZSB0aGUgY29kZSB0aGF0IHdpbGwgYmUgcnVuIGFmdGVyIHRoZSBzd2YgaGFzIGJlZW4gaW50aWFsaXplZFxuICAgICAgICAgICAgZWFzeVhETS5Gbi5zZXQoXCJmbGFzaF9cIiArIGNvbmZpZy5jaGFubmVsICsgXCJfaW5pdFwiLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgcHViLnVwLmNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHNldCB1cCB0aGUgb21NZXNzYWdlIGhhbmRsZXJcbiAgICAgICAgICAgIGVhc3lYRE0uRm4uc2V0KFwiZmxhc2hfXCIgKyBjb25maWcuY2hhbm5lbCArIFwiX29uTWVzc2FnZVwiLCBvbk1lc3NhZ2UpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25maWcuc3dmID0gcmVzb2x2ZVVybChjb25maWcuc3dmKTsgLy8gcmVwb3J0cyBoYXZlIGJlZW4gbWFkZSBvZiByZXF1ZXN0cyBnb25lIHJvZ3VlIHdoZW4gdXNpbmcgcmVsYXRpdmUgcGF0aHNcbiAgICAgICAgICAgIHZhciBzd2Zkb21haW4gPSBnZXREb21haW5OYW1lKGNvbmZpZy5zd2YpO1xuICAgICAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAvLyBzZXQgaW5pdCB0byB0cnVlIGluIGNhc2UgdGhlIGZuIHdhcyBjYWxsZWQgd2FzIGludm9rZWQgZnJvbSBhIHNlcGFyYXRlIGluc3RhbmNlXG4gICAgICAgICAgICAgICAgZWFzeVhETS5zdGFjay5GbGFzaFRyYW5zcG9ydFtzd2Zkb21haW5dLmluaXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHN3ZiA9IGVhc3lYRE0uc3RhY2suRmxhc2hUcmFuc3BvcnRbc3dmZG9tYWluXS5zd2Y7XG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIHRoZSBjaGFubmVsXG4gICAgICAgICAgICAgICAgc3dmLmNyZWF0ZUNoYW5uZWwoY29uZmlnLmNoYW5uZWwsIGNvbmZpZy5zZWNyZXQsIGdldExvY2F0aW9uKGNvbmZpZy5yZW1vdGUpLCBjb25maWcuaXNIb3N0KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLmlzSG9zdCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiBGbGFzaCBpcyBnb2luZyB0byBiZSB0aHJvdHRsZWQgYW5kIHdlIHdhbnQgdG8gYXZvaWQgdGhpc1xuICAgICAgICAgICAgICAgICAgICBpZiAoSEFTX0ZMQVNIX1RIUk9UVExFRF9CVUcgJiYgY29uZmlnLnN3Zk5vVGhyb3R0bGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGx5KGNvbmZpZy5wcm9wcywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBcImZpeGVkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogXCIyMHB4XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IFwiMjBweFwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgdXAgdGhlIGlmcmFtZVxuICAgICAgICAgICAgICAgICAgICBhcHBseShjb25maWcucHJvcHMsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNyYzogYXBwZW5kUXVlcnlQYXJhbWV0ZXJzKGNvbmZpZy5yZW1vdGUsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ZG1fZTogZ2V0TG9jYXRpb24obG9jYXRpb24uaHJlZiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeGRtX2M6IGNvbmZpZy5jaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhkbV9wOiA2LCAvLyA2ID0gRmxhc2hUcmFuc3BvcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ZG1fczogY29uZmlnLnNlY3JldFxuICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBJRlJBTUVfUFJFRklYICsgY29uZmlnLmNoYW5uZWwgKyBcIl9wcm92aWRlclwiXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBmcmFtZSA9IGNyZWF0ZUZyYW1lKGNvbmZpZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGVhc3lYRE0uc3RhY2suRmxhc2hUcmFuc3BvcnRbc3dmZG9tYWluXSAmJiBlYXN5WERNLnN0YWNrLkZsYXNoVHJhbnNwb3J0W3N3ZmRvbWFpbl0uaW5pdCkge1xuICAgICAgICAgICAgICAgIC8vIGlmIHRoZSBzd2YgaXMgaW4gcGxhY2UgYW5kIHdlIGFyZSB0aGUgY29uc3VtZXJcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgdGhlIHN3ZiBkb2VzIG5vdCB5ZXQgZXhpc3RcbiAgICAgICAgICAgICAgICBpZiAoIWVhc3lYRE0uc3RhY2suRmxhc2hUcmFuc3BvcnRbc3dmZG9tYWluXSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBhZGQgdGhlIHF1ZXVlIHRvIGhvbGQgdGhlIGluaXQgZm4nc1xuICAgICAgICAgICAgICAgICAgICBlYXN5WERNLnN0YWNrLkZsYXNoVHJhbnNwb3J0W3N3ZmRvbWFpbl0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWV1ZTogW2ZuXVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBhZGRTd2Yoc3dmZG9tYWluKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVhc3lYRE0uc3RhY2suRmxhc2hUcmFuc3BvcnRbc3dmZG9tYWluXS5xdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB3aGVuUmVhZHkocHViLm9uRE9NUmVhZHksIHB1Yik7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4vKmpzbGludCBldmlsOiB0cnVlLCBicm93c2VyOiB0cnVlLCBpbW1lZDogdHJ1ZSwgcGFzc2ZhaWw6IHRydWUsIHVuZGVmOiB0cnVlLCBuZXdjYXA6IHRydWUqL1xuLypnbG9iYWwgZWFzeVhETSwgd2luZG93LCBlc2NhcGUsIHVuZXNjYXBlLCBnZXRMb2NhdGlvbiwgYXBwZW5kUXVlcnlQYXJhbWV0ZXJzLCBjcmVhdGVGcmFtZSwgZGVidWcsIHVuLCBvbiwgYXBwbHksIHdoZW5SZWFkeSwgSUZSQU1FX1BSRUZJWCovXG4vL1xuLy8gZWFzeVhETVxuLy8gaHR0cDovL2Vhc3l4ZG0ubmV0L1xuLy8gQ29weXJpZ2h0KGMpIDIwMDktMjAxMSwgw5h5dmluZCBTZWFuIEtpbnNleSwgb3l2aW5kQGtpbnNleS5uby5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4vLyBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4vLyBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4vLyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4vLyBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi8vIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4vLyBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4vLyBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuLy8gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuLy8gVEhFIFNPRlRXQVJFLlxuLy9cblxuLyoqXG4gKiBAY2xhc3MgZWFzeVhETS5zdGFjay5Qb3N0TWVzc2FnZVRyYW5zcG9ydFxuICogUG9zdE1lc3NhZ2VUcmFuc3BvcnQgaXMgYSB0cmFuc3BvcnQgY2xhc3MgdGhhdCB1c2VzIEhUTUw1IHBvc3RNZXNzYWdlIGZvciBjb21tdW5pY2F0aW9uLjxici8+XG4gKiA8YSBocmVmPVwiaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L21zNjQ0OTQ0KFZTLjg1KS5hc3B4XCI+aHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L21zNjQ0OTQ0KFZTLjg1KS5hc3B4PC9hPjxici8+XG4gKiA8YSBocmVmPVwiaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vRE9NL3dpbmRvdy5wb3N0TWVzc2FnZVwiPmh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0RPTS93aW5kb3cucG9zdE1lc3NhZ2U8L2E+XG4gKiBAbmFtZXNwYWNlIGVhc3lYRE0uc3RhY2tcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgdHJhbnNwb3J0cyBjb25maWd1cmF0aW9uLlxuICogQGNmZyB7U3RyaW5nfSByZW1vdGUgVGhlIHJlbW90ZSBkb21haW4gdG8gY29tbXVuaWNhdGUgd2l0aC5cbiAqL1xuZWFzeVhETS5zdGFjay5Qb3N0TWVzc2FnZVRyYW5zcG9ydCA9IGZ1bmN0aW9uKGNvbmZpZyl7XG4gICAgdmFyIHB1YiwgLy8gdGhlIHB1YmxpYyBpbnRlcmZhY2VcbiBmcmFtZSwgLy8gdGhlIHJlbW90ZSBmcmFtZSwgaWYgYW55XG4gY2FsbGVyV2luZG93LCAvLyB0aGUgd2luZG93IHRoYXQgd2Ugd2lsbCBjYWxsIHdpdGhcbiB0YXJnZXRPcmlnaW47IC8vIHRoZSBkb21haW4gdG8gY29tbXVuaWNhdGUgd2l0aFxuICAgIC8qKlxuICAgICAqIFJlc29sdmVzIHRoZSBvcmlnaW4gZnJvbSB0aGUgZXZlbnQgb2JqZWN0XG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZXZlbnQgVGhlIG1lc3NhZ2VldmVudFxuICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHNjaGVtZSwgaG9zdCBhbmQgcG9ydCBvZiB0aGUgb3JpZ2luXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldE9yaWdpbihldmVudCl7XG4gICAgICAgIGlmIChldmVudC5vcmlnaW4pIHtcbiAgICAgICAgICAgIC8vIFRoaXMgaXMgdGhlIEhUTUw1IHByb3BlcnR5XG4gICAgICAgICAgICByZXR1cm4gZ2V0TG9jYXRpb24oZXZlbnQub3JpZ2luKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZXZlbnQudXJpKSB7XG4gICAgICAgICAgICAvLyBGcm9tIGVhcmxpZXIgaW1wbGVtZW50YXRpb25zIFxuICAgICAgICAgICAgcmV0dXJuIGdldExvY2F0aW9uKGV2ZW50LnVyaSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV2ZW50LmRvbWFpbikge1xuICAgICAgICAgICAgLy8gVGhpcyBpcyB0aGUgbGFzdCBvcHRpb24gYW5kIHdpbGwgZmFpbCBpZiB0aGUgXG4gICAgICAgICAgICAvLyBvcmlnaW4gaXMgbm90IHVzaW5nIHRoZSBzYW1lIHNjaGVtYSBhcyB3ZSBhcmVcbiAgICAgICAgICAgIHJldHVybiBsb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIGV2ZW50LmRvbWFpbjtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBcIlVuYWJsZSB0byByZXRyaWV2ZSB0aGUgb3JpZ2luIG9mIHRoZSBldmVudFwiO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBUaGlzIGlzIHRoZSBtYWluIGltcGxlbWVudGF0aW9uIGZvciB0aGUgb25NZXNzYWdlIGV2ZW50Ljxici8+XG4gICAgICogSXQgY2hlY2tzIHRoZSB2YWxpZGl0eSBvZiB0aGUgb3JpZ2luIGFuZCBwYXNzZXMgdGhlIG1lc3NhZ2Ugb24gaWYgYXBwcm9wcmlhdGUuXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZXZlbnQgVGhlIG1lc3NhZ2VldmVudFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF93aW5kb3dfb25NZXNzYWdlKGV2ZW50KXtcbiAgICAgICAgaWYgKHR5cGVvZiBldmVudC5kYXRhICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAvLyBwb3N0TWVzc2FnZSBhbHNvIHN1cHBvcnRzIHBhc3Npbmcgb2JqZWN0cywgYnV0IGVhc3lYRE0ncyBtZXNzYWdlcyBhcmUgYWx3YXlzIHN0cmluZ3NcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgb3JpZ2luID0gX2dldE9yaWdpbihldmVudCk7XG4gICAgICAgIGlmIChvcmlnaW4gPT0gdGFyZ2V0T3JpZ2luICYmIGV2ZW50LmRhdGEuc3Vic3RyaW5nKDAsIGNvbmZpZy5jaGFubmVsLmxlbmd0aCArIDEpID09IGNvbmZpZy5jaGFubmVsICsgXCIgXCIpIHtcbiAgICAgICAgICAgIHB1Yi51cC5pbmNvbWluZyhldmVudC5kYXRhLnN1YnN0cmluZyhjb25maWcuY2hhbm5lbC5sZW5ndGggKyAxKSwgb3JpZ2luKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFxuICAgIC8qKlxuICAgICAqIFRoaXMgYWRkcyB0aGUgbGlzdGVuZXIgZm9yIG1lc3NhZ2VzIHdoZW4gdGhlIGZyYW1lIGlzIHJlYWR5LlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IFRoZSBtZXNzYWdlZXZlbnRcbiAgICAgKi9cbiAgICAvLyBhZGQgdGhlIGV2ZW50IGhhbmRsZXIgZm9yIGxpc3RlbmluZ1xuICAgIGZ1bmN0aW9uIF93aW5kb3dfd2FpdEZvclJlYWR5KGV2ZW50KXsgIFxuICAgICAgICBpZiAoZXZlbnQuZGF0YSA9PSBjb25maWcuY2hhbm5lbCArIFwiLXJlYWR5XCIpIHtcbiAgICAgICAgICAgIC8vIHJlcGxhY2UgdGhlIGV2ZW50bGlzdGVuZXJcbiAgICAgICAgICAgIGNhbGxlcldpbmRvdyA9IChcInBvc3RNZXNzYWdlXCIgaW4gZnJhbWUuY29udGVudFdpbmRvdykgPyBmcmFtZS5jb250ZW50V2luZG93IDogZnJhbWUuY29udGVudFdpbmRvdy5kb2N1bWVudDtcbiAgICAgICAgICAgIHVuKHdpbmRvdywgXCJtZXNzYWdlXCIsIF93aW5kb3dfd2FpdEZvclJlYWR5KTtcbiAgICAgICAgICAgIG9uKHdpbmRvdywgXCJtZXNzYWdlXCIsIF93aW5kb3dfb25NZXNzYWdlKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBwdWIudXAuY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gKHB1YiA9IHtcbiAgICAgICAgb3V0Z29pbmc6IGZ1bmN0aW9uKG1lc3NhZ2UsIGRvbWFpbiwgZm4pe1xuICAgICAgICAgICAgY2FsbGVyV2luZG93LnBvc3RNZXNzYWdlKGNvbmZpZy5jaGFubmVsICsgXCIgXCIgKyBtZXNzYWdlLCBkb21haW4gfHwgdGFyZ2V0T3JpZ2luKTtcbiAgICAgICAgICAgIGlmIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRlc3Ryb3k6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB1bih3aW5kb3csIFwibWVzc2FnZVwiLCBfd2luZG93X3dhaXRGb3JSZWFkeSk7XG4gICAgICAgICAgICB1bih3aW5kb3csIFwibWVzc2FnZVwiLCBfd2luZG93X29uTWVzc2FnZSk7XG4gICAgICAgICAgICBpZiAoZnJhbWUpIHtcbiAgICAgICAgICAgICAgICBjYWxsZXJXaW5kb3cgPSBudWxsO1xuICAgICAgICAgICAgICAgIGZyYW1lLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZnJhbWUpO1xuICAgICAgICAgICAgICAgIGZyYW1lID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb25ET01SZWFkeTogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRhcmdldE9yaWdpbiA9IGdldExvY2F0aW9uKGNvbmZpZy5yZW1vdGUpO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5pc0hvc3QpIHtcbiAgICAgICAgICAgICAgICBvbih3aW5kb3csIFwibWVzc2FnZVwiLCBfd2luZG93X3dhaXRGb3JSZWFkeSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gc2V0IHVwIHRoZSBpZnJhbWVcbiAgICAgICAgICAgICAgICBhcHBseShjb25maWcucHJvcHMsIHtcbiAgICAgICAgICAgICAgICAgICAgc3JjOiBhcHBlbmRRdWVyeVBhcmFtZXRlcnMoY29uZmlnLnJlbW90ZSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgeGRtX2U6IGdldExvY2F0aW9uKGxvY2F0aW9uLmhyZWYpLFxuICAgICAgICAgICAgICAgICAgICAgICAgeGRtX2M6IGNvbmZpZy5jaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgeGRtX3A6IDEgLy8gMSA9IFBvc3RNZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBJRlJBTUVfUFJFRklYICsgY29uZmlnLmNoYW5uZWwgKyBcIl9wcm92aWRlclwiXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZnJhbWUgPSBjcmVhdGVGcmFtZShjb25maWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gYWRkIHRoZSBldmVudCBoYW5kbGVyIGZvciBsaXN0ZW5pbmdcbiAgICAgICAgICAgICAgICBvbih3aW5kb3csIFwibWVzc2FnZVwiLCBfd2luZG93X29uTWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgY2FsbGVyV2luZG93ID0gKFwicG9zdE1lc3NhZ2VcIiBpbiB3aW5kb3cucGFyZW50KSA/IHdpbmRvdy5wYXJlbnQgOiB3aW5kb3cucGFyZW50LmRvY3VtZW50O1xuICAgICAgICAgICAgICAgIGNhbGxlcldpbmRvdy5wb3N0TWVzc2FnZShjb25maWcuY2hhbm5lbCArIFwiLXJlYWR5XCIsIHRhcmdldE9yaWdpbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBwdWIudXAuY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB3aGVuUmVhZHkocHViLm9uRE9NUmVhZHksIHB1Yik7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4vKmpzbGludCBldmlsOiB0cnVlLCBicm93c2VyOiB0cnVlLCBpbW1lZDogdHJ1ZSwgcGFzc2ZhaWw6IHRydWUsIHVuZGVmOiB0cnVlLCBuZXdjYXA6IHRydWUqL1xuLypnbG9iYWwgZWFzeVhETSwgd2luZG93LCBlc2NhcGUsIHVuZXNjYXBlLCBnZXRMb2NhdGlvbiwgYXBwZW5kUXVlcnlQYXJhbWV0ZXJzLCBjcmVhdGVGcmFtZSwgZGVidWcsIGFwcGx5LCBxdWVyeSwgd2hlblJlYWR5LCBJRlJBTUVfUFJFRklYKi9cbi8vXG4vLyBlYXN5WERNXG4vLyBodHRwOi8vZWFzeXhkbS5uZXQvXG4vLyBDb3B5cmlnaHQoYykgMjAwOS0yMDExLCDDmHl2aW5kIFNlYW4gS2luc2V5LCBveXZpbmRAa2luc2V5Lm5vLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbi8vIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbi8vIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbi8vIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbi8vIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuLy8gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuLy8gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuLy8gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4vLyBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbi8vIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbi8vIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4vLyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4vLyBUSEUgU09GVFdBUkUuXG4vL1xuXG4vKipcbiAqIEBjbGFzcyBlYXN5WERNLnN0YWNrLkZyYW1lRWxlbWVudFRyYW5zcG9ydFxuICogRnJhbWVFbGVtZW50VHJhbnNwb3J0IGlzIGEgdHJhbnNwb3J0IGNsYXNzIHRoYXQgY2FuIGJlIHVzZWQgd2l0aCBHZWNrby1icm93c2VyIGFzIHRoZXNlIGFsbG93IHBhc3NpbmcgdmFyaWFibGVzIHVzaW5nIHRoZSBmcmFtZUVsZW1lbnQgcHJvcGVydHkuPGJyLz5cbiAqIFNlY3VyaXR5IGlzIG1haW50YWluZWQgYXMgR2VjaG8gdXNlcyBMZXhpY2FsIEF1dGhvcml6YXRpb24gdG8gZGV0ZXJtaW5lIHVuZGVyIHdoaWNoIHNjb3BlIGEgZnVuY3Rpb24gaXMgcnVubmluZy5cbiAqIEBuYW1lc3BhY2UgZWFzeVhETS5zdGFja1xuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSB0cmFuc3BvcnRzIGNvbmZpZ3VyYXRpb24uXG4gKiBAY2ZnIHtTdHJpbmd9IHJlbW90ZSBUaGUgcmVtb3RlIGRvY3VtZW50IHRvIGNvbW11bmljYXRlIHdpdGguXG4gKi9cbmVhc3lYRE0uc3RhY2suRnJhbWVFbGVtZW50VHJhbnNwb3J0ID0gZnVuY3Rpb24oY29uZmlnKXtcbiAgICB2YXIgcHViLCBmcmFtZSwgc2VuZCwgdGFyZ2V0T3JpZ2luO1xuICAgIFxuICAgIHJldHVybiAocHViID0ge1xuICAgICAgICBvdXRnb2luZzogZnVuY3Rpb24obWVzc2FnZSwgZG9tYWluLCBmbil7XG4gICAgICAgICAgICBzZW5kLmNhbGwodGhpcywgbWVzc2FnZSk7XG4gICAgICAgICAgICBpZiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBkZXN0cm95OiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgaWYgKGZyYW1lKSB7XG4gICAgICAgICAgICAgICAgZnJhbWUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChmcmFtZSk7XG4gICAgICAgICAgICAgICAgZnJhbWUgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvbkRPTVJlYWR5OiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGFyZ2V0T3JpZ2luID0gZ2V0TG9jYXRpb24oY29uZmlnLnJlbW90ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjb25maWcuaXNIb3N0KSB7XG4gICAgICAgICAgICAgICAgLy8gc2V0IHVwIHRoZSBpZnJhbWVcbiAgICAgICAgICAgICAgICBhcHBseShjb25maWcucHJvcHMsIHtcbiAgICAgICAgICAgICAgICAgICAgc3JjOiBhcHBlbmRRdWVyeVBhcmFtZXRlcnMoY29uZmlnLnJlbW90ZSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgeGRtX2U6IGdldExvY2F0aW9uKGxvY2F0aW9uLmhyZWYpLFxuICAgICAgICAgICAgICAgICAgICAgICAgeGRtX2M6IGNvbmZpZy5jaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgeGRtX3A6IDUgLy8gNSA9IEZyYW1lRWxlbWVudFRyYW5zcG9ydFxuICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogSUZSQU1FX1BSRUZJWCArIGNvbmZpZy5jaGFubmVsICsgXCJfcHJvdmlkZXJcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGZyYW1lID0gY3JlYXRlRnJhbWUoY29uZmlnKTtcbiAgICAgICAgICAgICAgICBmcmFtZS5mbiA9IGZ1bmN0aW9uKHNlbmRGbil7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBmcmFtZS5mbjtcbiAgICAgICAgICAgICAgICAgICAgc2VuZCA9IHNlbmRGbjtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcHViLnVwLmNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlIHRoZSBmdW5jdGlvbiBzbyB0aGF0IGl0IGNhbm5vdCBiZSB1c2VkIHRvIG92ZXJ3cml0ZSB0aGUgc2VuZCBmdW5jdGlvbiBsYXRlciBvblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24obXNnKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHB1Yi51cC5pbmNvbWluZyhtc2csIHRhcmdldE9yaWdpbik7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgdG8gbWl0aWdhdGUgb3JpZ2luLXNwb29maW5nXG4gICAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LnJlZmVycmVyICYmIGdldExvY2F0aW9uKGRvY3VtZW50LnJlZmVycmVyKSAhPSBxdWVyeS54ZG1fZSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cudG9wLmxvY2F0aW9uID0gcXVlcnkueGRtX2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlbmQgPSB3aW5kb3cuZnJhbWVFbGVtZW50LmZuKGZ1bmN0aW9uKG1zZyl7XG4gICAgICAgICAgICAgICAgICAgIHB1Yi51cC5pbmNvbWluZyhtc2csIHRhcmdldE9yaWdpbik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcHViLnVwLmNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBpbml0OiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgd2hlblJlYWR5KHB1Yi5vbkRPTVJlYWR5LCBwdWIpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuLypqc2xpbnQgZXZpbDogdHJ1ZSwgYnJvd3NlcjogdHJ1ZSwgaW1tZWQ6IHRydWUsIHBhc3NmYWlsOiB0cnVlLCB1bmRlZjogdHJ1ZSwgbmV3Y2FwOiB0cnVlKi9cbi8qZ2xvYmFsIGVhc3lYRE0sIHdpbmRvdywgZXNjYXBlLCB1bmVzY2FwZSwgdW5kZWYsIGdldExvY2F0aW9uLCBhcHBlbmRRdWVyeVBhcmFtZXRlcnMsIHJlc29sdmVVcmwsIGNyZWF0ZUZyYW1lLCBkZWJ1ZywgdW4sIGFwcGx5LCB3aGVuUmVhZHksIElGUkFNRV9QUkVGSVgqL1xuLy9cbi8vIGVhc3lYRE1cbi8vIGh0dHA6Ly9lYXN5eGRtLm5ldC9cbi8vIENvcHlyaWdodChjKSAyMDA5LTIwMTEsIMOYeXZpbmQgU2VhbiBLaW5zZXksIG95dmluZEBraW5zZXkubm8uXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuLy8gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuLy8gaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuLy8gdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuLy8gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4vLyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4vLyBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi8vIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLy8gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuLy8gTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbi8vIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbi8vIFRIRSBTT0ZUV0FSRS5cbi8vXG5cbi8qKlxuICogQGNsYXNzIGVhc3lYRE0uc3RhY2suTmFtZVRyYW5zcG9ydFxuICogTmFtZVRyYW5zcG9ydCB1c2VzIHRoZSB3aW5kb3cubmFtZSBwcm9wZXJ0eSB0byByZWxheSBkYXRhLlxuICogVGhlIDxjb2RlPmxvY2FsPC9jb2RlPiBwYXJhbWV0ZXIgbmVlZHMgdG8gYmUgc2V0IG9uIGJvdGggdGhlIGNvbnN1bWVyIGFuZCBwcm92aWRlciw8YnIvPlxuICogYW5kIHRoZSA8Y29kZT5yZW1vdGVIZWxwZXI8L2NvZGU+IHBhcmFtZXRlciBuZWVkcyB0byBiZSBzZXQgb24gdGhlIGNvbnN1bWVyLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSB0cmFuc3BvcnRzIGNvbmZpZ3VyYXRpb24uXG4gKiBAY2ZnIHtTdHJpbmd9IHJlbW90ZUhlbHBlciBUaGUgdXJsIHRvIHRoZSByZW1vdGUgaW5zdGFuY2Ugb2YgaGFzaC5odG1sIC0gdGhpcyBpcyBvbmx5IG5lZWRlZCBmb3IgdGhlIGhvc3QuXG4gKiBAbmFtZXNwYWNlIGVhc3lYRE0uc3RhY2tcbiAqL1xuZWFzeVhETS5zdGFjay5OYW1lVHJhbnNwb3J0ID0gZnVuY3Rpb24oY29uZmlnKXtcbiAgICBcbiAgICB2YXIgcHViOyAvLyB0aGUgcHVibGljIGludGVyZmFjZVxuICAgIHZhciBpc0hvc3QsIGNhbGxlcldpbmRvdywgcmVtb3RlV2luZG93LCByZWFkeUNvdW50LCBjYWxsYmFjaywgcmVtb3RlT3JpZ2luLCByZW1vdGVVcmw7XG4gICAgXG4gICAgZnVuY3Rpb24gX3NlbmRNZXNzYWdlKG1lc3NhZ2Upe1xuICAgICAgICB2YXIgdXJsID0gY29uZmlnLnJlbW90ZUhlbHBlciArIChpc0hvc3QgPyBcIiNfM1wiIDogXCIjXzJcIikgKyBjb25maWcuY2hhbm5lbDtcbiAgICAgICAgY2FsbGVyV2luZG93LmNvbnRlbnRXaW5kb3cuc2VuZE1lc3NhZ2UobWVzc2FnZSwgdXJsKTtcbiAgICB9XG4gICAgXG4gICAgZnVuY3Rpb24gX29uUmVhZHkoKXtcbiAgICAgICAgaWYgKGlzSG9zdCkge1xuICAgICAgICAgICAgaWYgKCsrcmVhZHlDb3VudCA9PT0gMiB8fCAhaXNIb3N0KSB7XG4gICAgICAgICAgICAgICAgcHViLnVwLmNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgX3NlbmRNZXNzYWdlKFwicmVhZHlcIik7XG4gICAgICAgICAgICBwdWIudXAuY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgZnVuY3Rpb24gX29uTWVzc2FnZShtZXNzYWdlKXtcbiAgICAgICAgcHViLnVwLmluY29taW5nKG1lc3NhZ2UsIHJlbW90ZU9yaWdpbik7XG4gICAgfVxuICAgIFxuICAgIGZ1bmN0aW9uIF9vbkxvYWQoKXtcbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gKHB1YiA9IHtcbiAgICAgICAgb3V0Z29pbmc6IGZ1bmN0aW9uKG1lc3NhZ2UsIGRvbWFpbiwgZm4pe1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBmbjtcbiAgICAgICAgICAgIF9zZW5kTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVzdHJveTogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGNhbGxlcldpbmRvdy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGNhbGxlcldpbmRvdyk7XG4gICAgICAgICAgICBjYWxsZXJXaW5kb3cgPSBudWxsO1xuICAgICAgICAgICAgaWYgKGlzSG9zdCkge1xuICAgICAgICAgICAgICAgIHJlbW90ZVdpbmRvdy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHJlbW90ZVdpbmRvdyk7XG4gICAgICAgICAgICAgICAgcmVtb3RlV2luZG93ID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb25ET01SZWFkeTogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlzSG9zdCA9IGNvbmZpZy5pc0hvc3Q7XG4gICAgICAgICAgICByZWFkeUNvdW50ID0gMDtcbiAgICAgICAgICAgIHJlbW90ZU9yaWdpbiA9IGdldExvY2F0aW9uKGNvbmZpZy5yZW1vdGUpO1xuICAgICAgICAgICAgY29uZmlnLmxvY2FsID0gcmVzb2x2ZVVybChjb25maWcubG9jYWwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaXNIb3N0KSB7XG4gICAgICAgICAgICAgICAgLy8gUmVnaXN0ZXIgdGhlIGNhbGxiYWNrXG4gICAgICAgICAgICAgICAgZWFzeVhETS5Gbi5zZXQoY29uZmlnLmNoYW5uZWwsIGZ1bmN0aW9uKG1lc3NhZ2Upe1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNIb3N0ICYmIG1lc3NhZ2UgPT09IFwicmVhZHlcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVwbGFjZSB0aGUgaGFuZGxlclxuICAgICAgICAgICAgICAgICAgICAgICAgZWFzeVhETS5Gbi5zZXQoY29uZmlnLmNoYW5uZWwsIF9vbk1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgX29uUmVhZHkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCB1cCB0aGUgZnJhbWUgdGhhdCBwb2ludHMgdG8gdGhlIHJlbW90ZSBpbnN0YW5jZVxuICAgICAgICAgICAgICAgIHJlbW90ZVVybCA9IGFwcGVuZFF1ZXJ5UGFyYW1ldGVycyhjb25maWcucmVtb3RlLCB7XG4gICAgICAgICAgICAgICAgICAgIHhkbV9lOiBjb25maWcubG9jYWwsXG4gICAgICAgICAgICAgICAgICAgIHhkbV9jOiBjb25maWcuY2hhbm5lbCxcbiAgICAgICAgICAgICAgICAgICAgeGRtX3A6IDJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBhcHBseShjb25maWcucHJvcHMsIHtcbiAgICAgICAgICAgICAgICAgICAgc3JjOiByZW1vdGVVcmwgKyAnIycgKyBjb25maWcuY2hhbm5lbCxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogSUZSQU1FX1BSRUZJWCArIGNvbmZpZy5jaGFubmVsICsgXCJfcHJvdmlkZXJcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlbW90ZVdpbmRvdyA9IGNyZWF0ZUZyYW1lKGNvbmZpZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25maWcucmVtb3RlSGVscGVyID0gY29uZmlnLnJlbW90ZTtcbiAgICAgICAgICAgICAgICBlYXN5WERNLkZuLnNldChjb25maWcuY2hhbm5lbCwgX29uTWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCB1cCB0aGUgaWZyYW1lIHRoYXQgd2lsbCBiZSB1c2VkIGZvciB0aGUgdHJhbnNwb3J0XG4gICAgICAgICAgICB2YXIgb25Mb2FkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgdGhlIGhhbmRsZXJcbiAgICAgICAgICAgICAgICB2YXIgdyA9IGNhbGxlcldpbmRvdyB8fCB0aGlzO1xuICAgICAgICAgICAgICAgIHVuKHcsIFwibG9hZFwiLCBvbkxvYWQpO1xuICAgICAgICAgICAgICAgIGVhc3lYRE0uRm4uc2V0KGNvbmZpZy5jaGFubmVsICsgXCJfbG9hZFwiLCBfb25Mb2FkKTtcbiAgICAgICAgICAgICAgICAoZnVuY3Rpb24gdGVzdCgpe1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHcuY29udGVudFdpbmRvdy5zZW5kTWVzc2FnZSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9vblJlYWR5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRlc3QsIDUwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0oKSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjYWxsZXJXaW5kb3cgPSBjcmVhdGVGcmFtZSh7XG4gICAgICAgICAgICAgICAgcHJvcHM6IHtcbiAgICAgICAgICAgICAgICAgICAgc3JjOiBjb25maWcubG9jYWwgKyBcIiNfNFwiICsgY29uZmlnLmNoYW5uZWxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uTG9hZDogb25Mb2FkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgaW5pdDogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHdoZW5SZWFkeShwdWIub25ET01SZWFkeSwgcHViKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcbi8qanNsaW50IGV2aWw6IHRydWUsIGJyb3dzZXI6IHRydWUsIGltbWVkOiB0cnVlLCBwYXNzZmFpbDogdHJ1ZSwgdW5kZWY6IHRydWUsIG5ld2NhcDogdHJ1ZSovXG4vKmdsb2JhbCBlYXN5WERNLCB3aW5kb3csIGVzY2FwZSwgdW5lc2NhcGUsIGdldExvY2F0aW9uLCBjcmVhdGVGcmFtZSwgZGVidWcsIHVuLCBvbiwgYXBwbHksIHdoZW5SZWFkeSwgSUZSQU1FX1BSRUZJWCovXG4vL1xuLy8gZWFzeVhETVxuLy8gaHR0cDovL2Vhc3l4ZG0ubmV0L1xuLy8gQ29weXJpZ2h0KGMpIDIwMDktMjAxMSwgw5h5dmluZCBTZWFuIEtpbnNleSwgb3l2aW5kQGtpbnNleS5uby5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4vLyBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4vLyBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4vLyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4vLyBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi8vIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4vLyBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4vLyBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuLy8gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuLy8gVEhFIFNPRlRXQVJFLlxuLy9cblxuLyoqXG4gKiBAY2xhc3MgZWFzeVhETS5zdGFjay5IYXNoVHJhbnNwb3J0XG4gKiBIYXNoVHJhbnNwb3J0IGlzIGEgdHJhbnNwb3J0IGNsYXNzIHRoYXQgdXNlcyB0aGUgSUZyYW1lIFVSTCBUZWNobmlxdWUgZm9yIGNvbW11bmljYXRpb24uPGJyLz5cbiAqIDxhIGhyZWY9XCJodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvYmI3MzUzMDUuYXNweFwiPmh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9iYjczNTMwNS5hc3B4PC9hPjxici8+XG4gKiBAbmFtZXNwYWNlIGVhc3lYRE0uc3RhY2tcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgdHJhbnNwb3J0cyBjb25maWd1cmF0aW9uLlxuICogQGNmZyB7U3RyaW5nL1dpbmRvd30gbG9jYWwgVGhlIHVybCB0byB0aGUgbG9jYWwgZmlsZSB1c2VkIGZvciBwcm94eWluZyBtZXNzYWdlcywgb3IgdGhlIGxvY2FsIHdpbmRvdy5cbiAqIEBjZmcge051bWJlcn0gZGVsYXkgVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgZWFzeVhETSBzaG91bGQgdHJ5IHRvIGdldCBhIHJlZmVyZW5jZSB0byB0aGUgbG9jYWwgd2luZG93LlxuICogQGNmZyB7TnVtYmVyfSBpbnRlcnZhbCBUaGUgaW50ZXJ2YWwgdXNlZCB3aGVuIHBvbGxpbmcgZm9yIG1lc3NhZ2VzLlxuICovXG5lYXN5WERNLnN0YWNrLkhhc2hUcmFuc3BvcnQgPSBmdW5jdGlvbihjb25maWcpe1xuICAgIHZhciBwdWI7XG4gICAgdmFyIG1lID0gdGhpcywgaXNIb3N0LCBfdGltZXIsIHBvbGxJbnRlcnZhbCwgX2xhc3RNc2csIF9tc2dOciwgX2xpc3RlbmVyV2luZG93LCBfY2FsbGVyV2luZG93O1xuICAgIHZhciB1c2VQYXJlbnQsIF9yZW1vdGVPcmlnaW47XG4gICAgXG4gICAgZnVuY3Rpb24gX3NlbmRNZXNzYWdlKG1lc3NhZ2Upe1xuICAgICAgICBpZiAoIV9jYWxsZXJXaW5kb3cpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdXJsID0gY29uZmlnLnJlbW90ZSArIFwiI1wiICsgKF9tc2dOcisrKSArIFwiX1wiICsgbWVzc2FnZTtcbiAgICAgICAgKChpc0hvc3QgfHwgIXVzZVBhcmVudCkgPyBfY2FsbGVyV2luZG93LmNvbnRlbnRXaW5kb3cgOiBfY2FsbGVyV2luZG93KS5sb2NhdGlvbiA9IHVybDtcbiAgICB9XG4gICAgXG4gICAgZnVuY3Rpb24gX2hhbmRsZUhhc2goaGFzaCl7XG4gICAgICAgIF9sYXN0TXNnID0gaGFzaDtcbiAgICAgICAgcHViLnVwLmluY29taW5nKF9sYXN0TXNnLnN1YnN0cmluZyhfbGFzdE1zZy5pbmRleE9mKFwiX1wiKSArIDEpLCBfcmVtb3RlT3JpZ2luKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGxvY2F0aW9uLmhhc2ggZm9yIGEgbmV3IG1lc3NhZ2UgYW5kIHJlbGF5cyB0aGlzIHRvIHRoZSByZWNlaXZlci5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9wb2xsSGFzaCgpe1xuICAgICAgICBpZiAoIV9saXN0ZW5lcldpbmRvdykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBocmVmID0gX2xpc3RlbmVyV2luZG93LmxvY2F0aW9uLmhyZWYsIGhhc2ggPSBcIlwiLCBpbmRleE9mID0gaHJlZi5pbmRleE9mKFwiI1wiKTtcbiAgICAgICAgaWYgKGluZGV4T2YgIT0gLTEpIHtcbiAgICAgICAgICAgIGhhc2ggPSBocmVmLnN1YnN0cmluZyhpbmRleE9mKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGFzaCAmJiBoYXNoICE9IF9sYXN0TXNnKSB7XG4gICAgICAgICAgICBfaGFuZGxlSGFzaChoYXNoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBmdW5jdGlvbiBfYXR0YWNoTGlzdGVuZXJzKCl7XG4gICAgICAgIF90aW1lciA9IHNldEludGVydmFsKF9wb2xsSGFzaCwgcG9sbEludGVydmFsKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIChwdWIgPSB7XG4gICAgICAgIG91dGdvaW5nOiBmdW5jdGlvbihtZXNzYWdlLCBkb21haW4pe1xuICAgICAgICAgICAgX3NlbmRNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICB9LFxuICAgICAgICBkZXN0cm95OiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwoX3RpbWVyKTtcbiAgICAgICAgICAgIGlmIChpc0hvc3QgfHwgIXVzZVBhcmVudCkge1xuICAgICAgICAgICAgICAgIF9jYWxsZXJXaW5kb3cucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChfY2FsbGVyV2luZG93KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF9jYWxsZXJXaW5kb3cgPSBudWxsO1xuICAgICAgICB9LFxuICAgICAgICBvbkRPTVJlYWR5OiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgaXNIb3N0ID0gY29uZmlnLmlzSG9zdDtcbiAgICAgICAgICAgIHBvbGxJbnRlcnZhbCA9IGNvbmZpZy5pbnRlcnZhbDtcbiAgICAgICAgICAgIF9sYXN0TXNnID0gXCIjXCIgKyBjb25maWcuY2hhbm5lbDtcbiAgICAgICAgICAgIF9tc2dOciA9IDA7XG4gICAgICAgICAgICB1c2VQYXJlbnQgPSBjb25maWcudXNlUGFyZW50O1xuICAgICAgICAgICAgX3JlbW90ZU9yaWdpbiA9IGdldExvY2F0aW9uKGNvbmZpZy5yZW1vdGUpO1xuICAgICAgICAgICAgaWYgKGlzSG9zdCkge1xuICAgICAgICAgICAgICAgIGFwcGx5KGNvbmZpZy5wcm9wcywge1xuICAgICAgICAgICAgICAgICAgICBzcmM6IGNvbmZpZy5yZW1vdGUsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IElGUkFNRV9QUkVGSVggKyBjb25maWcuY2hhbm5lbCArIFwiX3Byb3ZpZGVyXCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAodXNlUGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5vbkxvYWQgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgX2xpc3RlbmVyV2luZG93ID0gd2luZG93O1xuICAgICAgICAgICAgICAgICAgICAgICAgX2F0dGFjaExpc3RlbmVycygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHViLnVwLmNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRyaWVzID0gMCwgbWF4ID0gY29uZmlnLmRlbGF5IC8gNTA7XG4gICAgICAgICAgICAgICAgICAgIChmdW5jdGlvbiBnZXRSZWYoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgrK3RyaWVzID4gbWF4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5hYmxlIHRvIHJlZmVyZW5jZSBsaXN0ZW5lcndpbmRvd1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2xpc3RlbmVyV2luZG93ID0gX2NhbGxlcldpbmRvdy5jb250ZW50V2luZG93LmZyYW1lc1tJRlJBTUVfUFJFRklYICsgY29uZmlnLmNoYW5uZWwgKyBcIl9jb25zdW1lclwiXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfbGlzdGVuZXJXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfYXR0YWNoTGlzdGVuZXJzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHViLnVwLmNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChnZXRSZWYsIDUwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgX2NhbGxlcldpbmRvdyA9IGNyZWF0ZUZyYW1lKGNvbmZpZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBfbGlzdGVuZXJXaW5kb3cgPSB3aW5kb3c7XG4gICAgICAgICAgICAgICAgX2F0dGFjaExpc3RlbmVycygpO1xuICAgICAgICAgICAgICAgIGlmICh1c2VQYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgX2NhbGxlcldpbmRvdyA9IHBhcmVudDtcbiAgICAgICAgICAgICAgICAgICAgcHViLnVwLmNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXBwbHkoY29uZmlnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNyYzogY29uZmlnLnJlbW90ZSArIFwiI1wiICsgY29uZmlnLmNoYW5uZWwgKyBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IElGUkFNRV9QUkVGSVggKyBjb25maWcuY2hhbm5lbCArIFwiX2NvbnN1bWVyXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkxvYWQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHViLnVwLmNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgX2NhbGxlcldpbmRvdyA9IGNyZWF0ZUZyYW1lKGNvbmZpZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBpbml0OiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgd2hlblJlYWR5KHB1Yi5vbkRPTVJlYWR5LCBwdWIpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuLypqc2xpbnQgZXZpbDogdHJ1ZSwgYnJvd3NlcjogdHJ1ZSwgaW1tZWQ6IHRydWUsIHBhc3NmYWlsOiB0cnVlLCB1bmRlZjogdHJ1ZSwgbmV3Y2FwOiB0cnVlKi9cbi8qZ2xvYmFsIGVhc3lYRE0sIHdpbmRvdywgZXNjYXBlLCB1bmVzY2FwZSwgZGVidWcgKi9cbi8vXG4vLyBlYXN5WERNXG4vLyBodHRwOi8vZWFzeXhkbS5uZXQvXG4vLyBDb3B5cmlnaHQoYykgMjAwOS0yMDExLCDDmHl2aW5kIFNlYW4gS2luc2V5LCBveXZpbmRAa2luc2V5Lm5vLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbi8vIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbi8vIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbi8vIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbi8vIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuLy8gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuLy8gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuLy8gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4vLyBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbi8vIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbi8vIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4vLyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4vLyBUSEUgU09GVFdBUkUuXG4vL1xuXG4vKipcbiAqIEBjbGFzcyBlYXN5WERNLnN0YWNrLlJlbGlhYmxlQmVoYXZpb3JcbiAqIFRoaXMgaXMgYSBiZWhhdmlvciB0aGF0IHRyaWVzIHRvIG1ha2UgdGhlIHVuZGVybHlpbmcgdHJhbnNwb3J0IHJlbGlhYmxlIGJ5IHVzaW5nIGFja25vd2xlZGdlbWVudHMuXG4gKiBAbmFtZXNwYWNlIGVhc3lYRE0uc3RhY2tcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgYmVoYXZpb3JzIGNvbmZpZ3VyYXRpb24uXG4gKi9cbmVhc3lYRE0uc3RhY2suUmVsaWFibGVCZWhhdmlvciA9IGZ1bmN0aW9uKGNvbmZpZyl7XG4gICAgdmFyIHB1YiwgLy8gdGhlIHB1YmxpYyBpbnRlcmZhY2VcbiBjYWxsYmFjazsgLy8gdGhlIGNhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB3ZSBoYXZlIGEgY29uZmlybWVkIHN1Y2Nlc3MvZmFpbHVyZVxuICAgIHZhciBpZE91dCA9IDAsIGlkSW4gPSAwLCBjdXJyZW50TWVzc2FnZSA9IFwiXCI7XG4gICAgXG4gICAgcmV0dXJuIChwdWIgPSB7XG4gICAgICAgIGluY29taW5nOiBmdW5jdGlvbihtZXNzYWdlLCBvcmlnaW4pe1xuICAgICAgICAgICAgdmFyIGluZGV4T2YgPSBtZXNzYWdlLmluZGV4T2YoXCJfXCIpLCBhY2sgPSBtZXNzYWdlLnN1YnN0cmluZygwLCBpbmRleE9mKS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICBtZXNzYWdlID0gbWVzc2FnZS5zdWJzdHJpbmcoaW5kZXhPZiArIDEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoYWNrWzBdID09IGlkT3V0KSB7XG4gICAgICAgICAgICAgICAgY3VycmVudE1lc3NhZ2UgPSBcIlwiO1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcHViLmRvd24ub3V0Z29pbmcoYWNrWzFdICsgXCIsXCIgKyBpZE91dCArIFwiX1wiICsgY3VycmVudE1lc3NhZ2UsIG9yaWdpbik7XG4gICAgICAgICAgICAgICAgaWYgKGlkSW4gIT0gYWNrWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgIGlkSW4gPSBhY2tbMV07XG4gICAgICAgICAgICAgICAgICAgIHB1Yi51cC5pbmNvbWluZyhtZXNzYWdlLCBvcmlnaW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9LFxuICAgICAgICBvdXRnb2luZzogZnVuY3Rpb24obWVzc2FnZSwgb3JpZ2luLCBmbil7XG4gICAgICAgICAgICBjdXJyZW50TWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgICAgICAgICBjYWxsYmFjayA9IGZuO1xuICAgICAgICAgICAgcHViLmRvd24ub3V0Z29pbmcoaWRJbiArIFwiLFwiICsgKCsraWRPdXQpICsgXCJfXCIgKyBtZXNzYWdlLCBvcmlnaW4pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuLypqc2xpbnQgZXZpbDogdHJ1ZSwgYnJvd3NlcjogdHJ1ZSwgaW1tZWQ6IHRydWUsIHBhc3NmYWlsOiB0cnVlLCB1bmRlZjogdHJ1ZSwgbmV3Y2FwOiB0cnVlKi9cbi8qZ2xvYmFsIGVhc3lYRE0sIHdpbmRvdywgZXNjYXBlLCB1bmVzY2FwZSwgZGVidWcsIHVuZGVmLCByZW1vdmVGcm9tU3RhY2sqL1xuLy9cbi8vIGVhc3lYRE1cbi8vIGh0dHA6Ly9lYXN5eGRtLm5ldC9cbi8vIENvcHlyaWdodChjKSAyMDA5LTIwMTEsIMOYeXZpbmQgU2VhbiBLaW5zZXksIG95dmluZEBraW5zZXkubm8uXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuLy8gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuLy8gaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuLy8gdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuLy8gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4vLyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4vLyBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi8vIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLy8gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuLy8gTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbi8vIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbi8vIFRIRSBTT0ZUV0FSRS5cbi8vXG5cbi8qKlxuICogQGNsYXNzIGVhc3lYRE0uc3RhY2suUXVldWVCZWhhdmlvclxuICogVGhpcyBpcyBhIGJlaGF2aW9yIHRoYXQgZW5hYmxlcyBxdWV1ZWluZyBvZiBtZXNzYWdlcy4gPGJyLz5cbiAqIEl0IHdpbGwgYnVmZmVyIGluY29taW5nIG1lc3NhZ2VzIGFuZCBkaXNwYWNoIHRoZXNlIGFzIGZhc3QgYXMgdGhlIHVuZGVybHlpbmcgdHJhbnNwb3J0IGFsbG93cy5cbiAqIFRoaXMgd2lsbCBhbHNvIGZyYWdtZW50L2RlZnJhZ21lbnQgbWVzc2FnZXMgc28gdGhhdCB0aGUgb3V0Z29pbmcgbWVzc2FnZSBpcyBuZXZlciBiaWdnZXIgdGhhbiB0aGVcbiAqIHNldCBsZW5ndGguXG4gKiBAbmFtZXNwYWNlIGVhc3lYRE0uc3RhY2tcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgYmVoYXZpb3JzIGNvbmZpZ3VyYXRpb24uIE9wdGlvbmFsLlxuICogQGNmZyB7TnVtYmVyfSBtYXhMZW5ndGggVGhlIG1heGltdW0gbGVuZ3RoIG9mIGVhY2ggb3V0Z29pbmcgbWVzc2FnZS4gU2V0IHRoaXMgdG8gZW5hYmxlIGZyYWdtZW50YXRpb24uXG4gKi9cbmVhc3lYRE0uc3RhY2suUXVldWVCZWhhdmlvciA9IGZ1bmN0aW9uKGNvbmZpZyl7XG4gICAgdmFyIHB1YiwgcXVldWUgPSBbXSwgd2FpdGluZyA9IHRydWUsIGluY29taW5nID0gXCJcIiwgZGVzdHJveWluZywgbWF4TGVuZ3RoID0gMCwgbGF6eSA9IGZhbHNlLCBkb0ZyYWdtZW50ID0gZmFsc2U7XG4gICAgXG4gICAgZnVuY3Rpb24gZGlzcGF0Y2goKXtcbiAgICAgICAgaWYgKGNvbmZpZy5yZW1vdmUgJiYgcXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZW1vdmVGcm9tU3RhY2socHViKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAod2FpdGluZyB8fCBxdWV1ZS5sZW5ndGggPT09IDAgfHwgZGVzdHJveWluZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHdhaXRpbmcgPSB0cnVlO1xuICAgICAgICB2YXIgbWVzc2FnZSA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgIFxuICAgICAgICBwdWIuZG93bi5vdXRnb2luZyhtZXNzYWdlLmRhdGEsIG1lc3NhZ2Uub3JpZ2luLCBmdW5jdGlvbihzdWNjZXNzKXtcbiAgICAgICAgICAgIHdhaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmNhbGxiYWNrKHN1Y2Nlc3MpO1xuICAgICAgICAgICAgICAgIH0sIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGlzcGF0Y2goKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiAocHViID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgaWYgKHVuZGVmKGNvbmZpZykpIHtcbiAgICAgICAgICAgICAgICBjb25maWcgPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjb25maWcubWF4TGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgbWF4TGVuZ3RoID0gY29uZmlnLm1heExlbmd0aDtcbiAgICAgICAgICAgICAgICBkb0ZyYWdtZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjb25maWcubGF6eSkge1xuICAgICAgICAgICAgICAgIGxhenkgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcHViLmRvd24uaW5pdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oc3VjY2Vzcyl7XG4gICAgICAgICAgICB3YWl0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgdXAgPSBwdWIudXA7IC8vIGluIGNhc2UgZGlzcGF0Y2ggY2FsbHMgcmVtb3ZlRnJvbVN0YWNrXG4gICAgICAgICAgICBkaXNwYXRjaCgpO1xuICAgICAgICAgICAgdXAuY2FsbGJhY2soc3VjY2Vzcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGluY29taW5nOiBmdW5jdGlvbihtZXNzYWdlLCBvcmlnaW4pe1xuICAgICAgICAgICAgaWYgKGRvRnJhZ21lbnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXhPZiA9IG1lc3NhZ2UuaW5kZXhPZihcIl9cIiksIHNlcSA9IHBhcnNlSW50KG1lc3NhZ2Uuc3Vic3RyaW5nKDAsIGluZGV4T2YpLCAxMCk7XG4gICAgICAgICAgICAgICAgaW5jb21pbmcgKz0gbWVzc2FnZS5zdWJzdHJpbmcoaW5kZXhPZiArIDEpO1xuICAgICAgICAgICAgICAgIGlmIChzZXEgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5lbmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY29taW5nID0gZGVjb2RlVVJJQ29tcG9uZW50KGluY29taW5nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBwdWIudXAuaW5jb21pbmcoaW5jb21pbmcsIG9yaWdpbik7XG4gICAgICAgICAgICAgICAgICAgIGluY29taW5nID0gXCJcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwdWIudXAuaW5jb21pbmcobWVzc2FnZSwgb3JpZ2luKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb3V0Z29pbmc6IGZ1bmN0aW9uKG1lc3NhZ2UsIG9yaWdpbiwgZm4pe1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5lbmNvZGUpIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gZW5jb2RlVVJJQ29tcG9uZW50KG1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGZyYWdtZW50cyA9IFtdLCBmcmFnbWVudDtcbiAgICAgICAgICAgIGlmIChkb0ZyYWdtZW50KSB7XG4gICAgICAgICAgICAgICAgLy8gZnJhZ21lbnQgaW50byBjaHVua3NcbiAgICAgICAgICAgICAgICB3aGlsZSAobWVzc2FnZS5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZnJhZ21lbnQgPSBtZXNzYWdlLnN1YnN0cmluZygwLCBtYXhMZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gbWVzc2FnZS5zdWJzdHJpbmcoZnJhZ21lbnQubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgZnJhZ21lbnRzLnB1c2goZnJhZ21lbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBlbnF1ZXVlIHRoZSBjaHVua3NcbiAgICAgICAgICAgICAgICB3aGlsZSAoKGZyYWdtZW50ID0gZnJhZ21lbnRzLnNoaWZ0KCkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHF1ZXVlLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogZnJhZ21lbnRzLmxlbmd0aCArIFwiX1wiICsgZnJhZ21lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW46IG9yaWdpbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBmcmFnbWVudHMubGVuZ3RoID09PSAwID8gZm4gOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHF1ZXVlLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICBvcmlnaW46IG9yaWdpbixcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZuXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobGF6eSkge1xuICAgICAgICAgICAgICAgIHB1Yi5kb3duLmluaXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGRpc3BhdGNoKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRlc3Ryb3k6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBkZXN0cm95aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHB1Yi5kb3duLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcbi8qanNsaW50IGV2aWw6IHRydWUsIGJyb3dzZXI6IHRydWUsIGltbWVkOiB0cnVlLCBwYXNzZmFpbDogdHJ1ZSwgdW5kZWY6IHRydWUsIG5ld2NhcDogdHJ1ZSovXG4vKmdsb2JhbCBlYXN5WERNLCB3aW5kb3csIGVzY2FwZSwgdW5lc2NhcGUsIHVuZGVmLCBkZWJ1ZyAqL1xuLy9cbi8vIGVhc3lYRE1cbi8vIGh0dHA6Ly9lYXN5eGRtLm5ldC9cbi8vIENvcHlyaWdodChjKSAyMDA5LTIwMTEsIMOYeXZpbmQgU2VhbiBLaW5zZXksIG95dmluZEBraW5zZXkubm8uXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuLy8gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuLy8gaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuLy8gdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuLy8gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4vLyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4vLyBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi8vIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLy8gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuLy8gTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbi8vIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbi8vIFRIRSBTT0ZUV0FSRS5cbi8vXG5cbi8qKlxuICogQGNsYXNzIGVhc3lYRE0uc3RhY2suVmVyaWZ5QmVoYXZpb3JcbiAqIFRoaXMgYmVoYXZpb3Igd2lsbCB2ZXJpZnkgdGhhdCBjb21tdW5pY2F0aW9uIHdpdGggdGhlIHJlbW90ZSBlbmQgaXMgcG9zc2libGUsIGFuZCB3aWxsIGFsc28gc2lnbiBhbGwgb3V0Z29pbmcsXG4gKiBhbmQgdmVyaWZ5IGFsbCBpbmNvbWluZyBtZXNzYWdlcy4gVGhpcyByZW1vdmVzIHRoZSByaXNrIG9mIHNvbWVvbmUgaGlqYWNraW5nIHRoZSBpZnJhbWUgdG8gc2VuZCBtYWxpY2lvdXMgbWVzc2FnZXMuXG4gKiBAbmFtZXNwYWNlIGVhc3lYRE0uc3RhY2tcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgYmVoYXZpb3JzIGNvbmZpZ3VyYXRpb24uXG4gKiBAY2ZnIHtCb29sZWFufSBpbml0aWF0ZSBJZiB0aGUgdmVyaWZpY2F0aW9uIHNob3VsZCBiZSBpbml0aWF0ZWQgZnJvbSB0aGlzIGVuZC5cbiAqL1xuZWFzeVhETS5zdGFjay5WZXJpZnlCZWhhdmlvciA9IGZ1bmN0aW9uKGNvbmZpZyl7XG4gICAgdmFyIHB1YiwgbXlTZWNyZXQsIHRoZWlyU2VjcmV0LCB2ZXJpZmllZCA9IGZhbHNlO1xuICAgIFxuICAgIGZ1bmN0aW9uIHN0YXJ0VmVyaWZpY2F0aW9uKCl7XG4gICAgICAgIG15U2VjcmV0ID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc3Vic3RyaW5nKDIpO1xuICAgICAgICBwdWIuZG93bi5vdXRnb2luZyhteVNlY3JldCk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiAocHViID0ge1xuICAgICAgICBpbmNvbWluZzogZnVuY3Rpb24obWVzc2FnZSwgb3JpZ2luKXtcbiAgICAgICAgICAgIHZhciBpbmRleE9mID0gbWVzc2FnZS5pbmRleE9mKFwiX1wiKTtcbiAgICAgICAgICAgIGlmIChpbmRleE9mID09PSAtMSkge1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlID09PSBteVNlY3JldCkge1xuICAgICAgICAgICAgICAgICAgICBwdWIudXAuY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKCF0aGVpclNlY3JldCkge1xuICAgICAgICAgICAgICAgICAgICB0aGVpclNlY3JldCA9IG1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgICAgIGlmICghY29uZmlnLmluaXRpYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydFZlcmlmaWNhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHB1Yi5kb3duLm91dGdvaW5nKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLnN1YnN0cmluZygwLCBpbmRleE9mKSA9PT0gdGhlaXJTZWNyZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgcHViLnVwLmluY29taW5nKG1lc3NhZ2Uuc3Vic3RyaW5nKGluZGV4T2YgKyAxKSwgb3JpZ2luKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG91dGdvaW5nOiBmdW5jdGlvbihtZXNzYWdlLCBvcmlnaW4sIGZuKXtcbiAgICAgICAgICAgIHB1Yi5kb3duLm91dGdvaW5nKG15U2VjcmV0ICsgXCJfXCIgKyBtZXNzYWdlLCBvcmlnaW4sIGZuKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKHN1Y2Nlc3Mpe1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5pbml0aWF0ZSkge1xuICAgICAgICAgICAgICAgIHN0YXJ0VmVyaWZpY2F0aW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4vKmpzbGludCBldmlsOiB0cnVlLCBicm93c2VyOiB0cnVlLCBpbW1lZDogdHJ1ZSwgcGFzc2ZhaWw6IHRydWUsIHVuZGVmOiB0cnVlLCBuZXdjYXA6IHRydWUqL1xuLypnbG9iYWwgZWFzeVhETSwgd2luZG93LCBlc2NhcGUsIHVuZXNjYXBlLCB1bmRlZiwgZ2V0SlNPTiwgZGVidWcsIGVtcHR5Rm4sIGlzQXJyYXkgKi9cbi8vXG4vLyBlYXN5WERNXG4vLyBodHRwOi8vZWFzeXhkbS5uZXQvXG4vLyBDb3B5cmlnaHQoYykgMjAwOS0yMDExLCDDmHl2aW5kIFNlYW4gS2luc2V5LCBveXZpbmRAa2luc2V5Lm5vLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbi8vIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbi8vIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbi8vIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbi8vIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuLy8gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuLy8gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuLy8gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4vLyBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbi8vIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbi8vIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4vLyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4vLyBUSEUgU09GVFdBUkUuXG4vL1xuXG4vKipcbiAqIEBjbGFzcyBlYXN5WERNLnN0YWNrLlJwY0JlaGF2aW9yXG4gKiBUaGlzIHVzZXMgSlNPTi1SUEMgMi4wIHRvIGV4cG9zZSBsb2NhbCBtZXRob2RzIGFuZCB0byBpbnZva2UgcmVtb3RlIG1ldGhvZHMgYW5kIGhhdmUgcmVzcG9uc2VzIHJldHVybmVkIG92ZXIgdGhlIHRoZSBzdHJpbmcgYmFzZWQgdHJhbnNwb3J0IHN0YWNrLjxici8+XG4gKiBFeHBvc2VkIG1ldGhvZHMgY2FuIHJldHVybiB2YWx1ZXMgc3luY2hyb25vdXMsIGFzeW5jcm9ub3VzLCBvciBiZXQgc2V0IHVwIHRvIG5vdCByZXR1cm4gYW55dGhpbmcuXG4gKiBAbmFtZXNwYWNlIGVhc3lYRE0uc3RhY2tcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3R9IHByb3h5IFRoZSBvYmplY3QgdG8gYXBwbHkgdGhlIG1ldGhvZHMgdG8uXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSBkZWZpbml0aW9uIG9mIHRoZSBsb2NhbCBhbmQgcmVtb3RlIGludGVyZmFjZSB0byBpbXBsZW1lbnQuXG4gKiBAY2ZnIHtPYmplY3R9IGxvY2FsIFRoZSBsb2NhbCBpbnRlcmZhY2UgdG8gZXhwb3NlLlxuICogQGNmZyB7T2JqZWN0fSByZW1vdGUgVGhlIHJlbW90ZSBtZXRob2RzIHRvIGV4cG9zZSB0aHJvdWdoIHRoZSBwcm94eS5cbiAqIEBjZmcge09iamVjdH0gc2VyaWFsaXplciBUaGUgc2VyaWFsaXplciB0byB1c2UgZm9yIHNlcmlhbGl6aW5nIGFuZCBkZXNlcmlhbGl6aW5nIHRoZSBKU09OLiBTaG91bGQgYmUgY29tcGF0aWJsZSB3aXRoIHRoZSBIVE1MNSBKU09OIG9iamVjdC4gT3B0aW9uYWwsIHdpbGwgZGVmYXVsdCB0byBKU09OLlxuICovXG5lYXN5WERNLnN0YWNrLlJwY0JlaGF2aW9yID0gZnVuY3Rpb24ocHJveHksIGNvbmZpZyl7XG4gICAgdmFyIHB1Yiwgc2VyaWFsaXplciA9IGNvbmZpZy5zZXJpYWxpemVyIHx8IGdldEpTT04oKTtcbiAgICB2YXIgX2NhbGxiYWNrQ291bnRlciA9IDAsIF9jYWxsYmFja3MgPSB7fTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXJpYWxpemVzIGFuZCBzZW5kcyB0aGUgbWVzc2FnZVxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIEpTT04tUlBDIG1lc3NhZ2UgdG8gYmUgc2VudC4gVGhlIGpzb25ycGMgcHJvcGVydHkgd2lsbCBiZSBhZGRlZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfc2VuZChkYXRhKXtcbiAgICAgICAgZGF0YS5qc29ucnBjID0gXCIyLjBcIjtcbiAgICAgICAgcHViLmRvd24ub3V0Z29pbmcoc2VyaWFsaXplci5zdHJpbmdpZnkoZGF0YSkpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbWV0aG9kIHRoYXQgaW1wbGVtZW50cyB0aGUgZ2l2ZW4gZGVmaW5pdGlvblxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFRoZSBtZXRob2QgY29uZmlndXJhdGlvblxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2QgVGhlIG5hbWUgb2YgdGhlIG1ldGhvZFxuICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSBBIHN0dWIgY2FwYWJsZSBvZiBwcm94eWluZyB0aGUgcmVxdWVzdGVkIG1ldGhvZCBjYWxsXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2NyZWF0ZU1ldGhvZChkZWZpbml0aW9uLCBtZXRob2Qpe1xuICAgICAgICB2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBsID0gYXJndW1lbnRzLmxlbmd0aCwgY2FsbGJhY2ssIG1lc3NhZ2UgPSB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiBtZXRob2RcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChsID4gMCAmJiB0eXBlb2YgYXJndW1lbnRzW2wgLSAxXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgLy93aXRoIGNhbGxiYWNrLCBwcm9jZWR1cmVcbiAgICAgICAgICAgICAgICBpZiAobCA+IDEgJiYgdHlwZW9mIGFyZ3VtZW50c1tsIC0gMl0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICAvLyB0d28gY2FsbGJhY2tzLCBzdWNjZXNzIGFuZCBlcnJvclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGFyZ3VtZW50c1tsIC0gMl0sXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYXJndW1lbnRzW2wgLSAxXVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnBhcmFtcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAwLCBsIC0gMik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGUgY2FsbGJhY2ssIHN1Y2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBhcmd1bWVudHNbbCAtIDFdXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UucGFyYW1zID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDAsIGwgLSAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgX2NhbGxiYWNrc1tcIlwiICsgKCsrX2NhbGxiYWNrQ291bnRlcildID0gY2FsbGJhY2s7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5pZCA9IF9jYWxsYmFja0NvdW50ZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBubyBjYWxsYmFja3MsIGEgbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgbWVzc2FnZS5wYXJhbXMgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGVmaW5pdGlvbi5uYW1lZFBhcmFtcyAmJiBtZXNzYWdlLnBhcmFtcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLnBhcmFtcyA9IG1lc3NhZ2UucGFyYW1zWzBdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gU2VuZCB0aGUgbWV0aG9kIHJlcXVlc3RcbiAgICAgICAgICAgIF9zZW5kKG1lc3NhZ2UpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBFeGVjdXRlcyB0aGUgZXhwb3NlZCBtZXRob2RcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2QgVGhlIG5hbWUgb2YgdGhlIG1ldGhvZFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBpZCBUaGUgY2FsbGJhY2sgaWQgdG8gdXNlXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbWV0aG9kIFRoZSBleHBvc2VkIGltcGxlbWVudGF0aW9uXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGFyYW1zIFRoZSBwYXJhbWV0ZXJzIHN1cHBsaWVkIGJ5IHRoZSByZW1vdGUgZW5kXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2V4ZWN1dGVNZXRob2QobWV0aG9kLCBpZCwgZm4sIHBhcmFtcyl7XG4gICAgICAgIGlmICghZm4pIHtcbiAgICAgICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgICAgIF9zZW5kKHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXCJQcm9jZWR1cmUgbm90IGZvdW5kLlwiXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHN1Y2Nlc3MsIGVycm9yO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHN1Y2Nlc3MgPSBmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3MgPSBlbXB0eUZuO1xuICAgICAgICAgICAgICAgIF9zZW5kKHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHJlc3VsdFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGVycm9yID0gZnVuY3Rpb24obWVzc2FnZSwgZGF0YSl7XG4gICAgICAgICAgICAgICAgZXJyb3IgPSBlbXB0eUZuO1xuICAgICAgICAgICAgICAgIHZhciBtc2cgPSB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjA5OSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgbXNnLmVycm9yLmRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBfc2VuZChtc2cpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN1Y2Nlc3MgPSBlcnJvciA9IGVtcHR5Rm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2FsbCBsb2NhbCBtZXRob2RcbiAgICAgICAgaWYgKCFpc0FycmF5KHBhcmFtcykpIHtcbiAgICAgICAgICAgIHBhcmFtcyA9IFtwYXJhbXNdO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gZm4ubWV0aG9kLmFwcGx5KGZuLnNjb3BlLCBwYXJhbXMuY29uY2F0KFtzdWNjZXNzLCBlcnJvcl0pKTtcbiAgICAgICAgICAgIGlmICghdW5kZWYocmVzdWx0KSkge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3MocmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBcbiAgICAgICAgY2F0Y2ggKGV4MSkge1xuICAgICAgICAgICAgZXJyb3IoZXgxLm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiAocHViID0ge1xuICAgICAgICBpbmNvbWluZzogZnVuY3Rpb24obWVzc2FnZSwgb3JpZ2luKXtcbiAgICAgICAgICAgIHZhciBkYXRhID0gc2VyaWFsaXplci5wYXJzZShtZXNzYWdlKTtcbiAgICAgICAgICAgIGlmIChkYXRhLm1ldGhvZCkge1xuICAgICAgICAgICAgICAgIC8vIEEgbWV0aG9kIGNhbGwgZnJvbSB0aGUgcmVtb3RlIGVuZFxuICAgICAgICAgICAgICAgIGlmIChjb25maWcuaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5oYW5kbGUoZGF0YSwgX3NlbmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgX2V4ZWN1dGVNZXRob2QoZGF0YS5tZXRob2QsIGRhdGEuaWQsIGNvbmZpZy5sb2NhbFtkYXRhLm1ldGhvZF0sIGRhdGEucGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBBIG1ldGhvZCByZXNwb25zZSBmcm9tIHRoZSBvdGhlciBlbmRcbiAgICAgICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBfY2FsbGJhY2tzW2RhdGEuaWRdO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjay5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suZXJyb3IoZGF0YS5lcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoY2FsbGJhY2suc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5zdWNjZXNzKGRhdGEucmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVsZXRlIF9jYWxsYmFja3NbZGF0YS5pZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZiAoY29uZmlnLnJlbW90ZSkge1xuICAgICAgICAgICAgICAgIC8vIEltcGxlbWVudCB0aGUgcmVtb3RlIHNpZGVzIGV4cG9zZWQgbWV0aG9kc1xuICAgICAgICAgICAgICAgIGZvciAodmFyIG1ldGhvZCBpbiBjb25maWcucmVtb3RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25maWcucmVtb3RlLmhhc093blByb3BlcnR5KG1ldGhvZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3h5W21ldGhvZF0gPSBfY3JlYXRlTWV0aG9kKGNvbmZpZy5yZW1vdGVbbWV0aG9kXSwgbWV0aG9kKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHB1Yi5kb3duLmluaXQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVzdHJveTogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGZvciAodmFyIG1ldGhvZCBpbiBjb25maWcucmVtb3RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5yZW1vdGUuaGFzT3duUHJvcGVydHkobWV0aG9kKSAmJiBwcm94eS5oYXNPd25Qcm9wZXJ0eShtZXRob2QpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBwcm94eVttZXRob2RdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHB1Yi5kb3duLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcbmdsb2JhbC5lYXN5WERNID0gZWFzeVhETTtcbn0pKHdpbmRvdywgZG9jdW1lbnQsIGxvY2F0aW9uLCB3aW5kb3cuc2V0VGltZW91dCwgZGVjb2RlVVJJQ29tcG9uZW50LCBlbmNvZGVVUklDb21wb25lbnQpO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGEua29yb3RhZXYgb24gMjQuMDYuMTYuXG4gKi9cbi8qKlxuICogSW1wZWxlbWVudHMgWHNvbGxhIExvZ2luIEFwaVxuICogQHBhcmFtIHByb2plY3RJZCAtIHByb2plY3QncyB1bmlxdWUgaWRlbnRpZmllclxuICogQHBhcmFtIGJhc2VVcmwgLSBhcGkgZW5kcG9pbnRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5cbnZhciBYTEFwaSA9IGZ1bmN0aW9uIChwcm9qZWN0SWQsIGJhc2VVcmwpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5iYXNlVXJsID0gYmFzZVVybCB8fCAnLy9sb2dpbi54c29sbGEuY29tL2FwaS8nO1xuXG4gICAgdGhpcy5wcm9qZWN0SWQgPSBwcm9qZWN0SWQ7XG5cbiAgICB0aGlzLm1ha2VBcGlDYWxsID0gZnVuY3Rpb24gKHBhcmFtcywgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgdmFyIHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuICAgICAgICByLm9wZW4ocGFyYW1zLm1ldGhvZCwgc2VsZi5iYXNlVXJsICsgcGFyYW1zLmVuZHBvaW50LCB0cnVlKTtcbiAgICAgICAgci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoci5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgICAgICAgICBpZiAoci5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3MoSlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyLnJlc3BvbnNlVGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IoSlNPTi5wYXJzZShyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3Ioe2Vycm9yOiB7bWVzc2FnZTogJ05ldHdvcmtpbmcgZXJyb3InLCBjb2RlOiByLnN0YXR1c319KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHBhcmFtcy5tZXRob2QgPT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICByLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLThcIik7XG4gICAgICAgICAgICByLnNlbmQocGFyYW1zLnBvc3RCb2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMubWV0aG9kID09ICdHRVQnKSB7XG4gICAgICAgICAgICByLnNlbmQocGFyYW1zLmdldEFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcbi8qKlxuICogR2V0IGFsbCBhdmlhbGFibGUgc29jaWFsIG1ldGhvZHMgYXV0aCB1cmxcbiAqIEBwYXJhbSBzdWNjZXNzIC0gc3VjY2VzcyBjYWxsYmFja1xuICogQHBhcmFtIGVycm9yIC0gZXJyb3IgY2FsbGJhY2tcbiAqIEBwYXJhbSBnZXRBcmd1bWVudHMgLSBhZGRpdGlvbmFsIHBhcmFtcyB0byBzZW5kIHdpdGggcmVxdWVzdFxuICovXG5YTEFwaS5wcm90b3R5cGUuZ2V0U29jaWFsc1VSTHMgPSBmdW5jdGlvbiAoc3VjY2VzcywgZXJyb3IsIGdldEFyZ3VtZW50cykge1xuICAgIHZhciBzdHIgPSBcIlwiO1xuICAgIGZvciAodmFyIGtleSBpbiBnZXRBcmd1bWVudHMpIHtcbiAgICAgICAgaWYgKHN0ciAhPSBcIlwiKSB7XG4gICAgICAgICAgICBzdHIgKz0gXCImXCI7XG4gICAgICAgIH1cbiAgICAgICAgc3RyICs9IGtleSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGdldEFyZ3VtZW50c1trZXldKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnR0VUJywgZW5kcG9pbnQ6ICdzb2NpYWwvbG9naW5fdXJscz8nICsgc3RyLCBnZXRBcmd1bWVudHM6IG51bGx9LCBzdWNjZXNzLCBlcnJvcik7XG59O1xuXG5YTEFwaS5wcm90b3R5cGUubG9naW5QYXNzQXV0aCA9IGZ1bmN0aW9uIChsb2dpbiwgcGFzcywgcmVtZW1iZXJNZSwgcmVkaXJlY3RVcmwsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgdmFyIGJvZHkgPSB7XG4gICAgICAgIHVzZXJuYW1lOiBsb2dpbixcbiAgICAgICAgcGFzc3dvcmQ6IHBhc3MsXG4gICAgICAgIHJlbWVtYmVyX21lOiByZW1lbWJlck1lXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5tYWtlQXBpQ2FsbCh7bWV0aG9kOiAnUE9TVCcsIGVuZHBvaW50OiAncHJveHkvbG9naW4/cHJvamVjdElkPScrdGhpcy5wcm9qZWN0SWQgKyAnJnJlZGlyZWN0X3VybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHJlZGlyZWN0VXJsKSwgcG9zdEJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHkpfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxuWExBcGkucHJvdG90eXBlLnNtc0F1dGggPSBmdW5jdGlvbiAocGhvbmVOdW1iZXIsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgcmV0dXJuIHRoaXMubWFrZUFwaUNhbGwoe21ldGhvZDogJ0dFVCcsIGVuZHBvaW50OiAnc21zJywgZ2V0QXJndW1lbnRzOiAncGhvbmVOdW1iZXI9JyArIHBob25lTnVtYmVyfSwgc3VjY2VzcywgZXJyb3IpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBYTEFwaTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBhLmtvcm90YWV2IG9uIDI0LjA2LjE2LlxuICovXG5cbnZhciBYTEFwaSA9IHJlcXVpcmUoJy4veGxhcGknKTtcbnJlcXVpcmUoJy4vZWFzeVhETScpO1xuLyoqXG4gKiBDcmVhdGUgYW4gYEF1dGgwYCBpbnN0YW5jZSB3aXRoIGBvcHRpb25zYFxuICpcbiAqIEBjbGFzcyBYTFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFhMIChvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgc2VsZi5fc29jaWFsVXJscyA9IHt9O1xuXG4gICAgc2VsZi5fb3B0aW9ucyA9IHt9O1xuICAgIHNlbGYuX29wdGlvbnMuZXJyb3JIYW5kbGVyID0gb3B0aW9ucy5lcnJvckhhbmRsZXIgfHwgZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgfTtcbiAgICBzZWxmLl9vcHRpb25zLmxvZ2luUGFzc1ZhbGlkYXRvciA9IG9wdGlvbnMubG9naW5QYXNzVmFsaWRhdG9yIHx8IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcbiAgICBzZWxmLl9vcHRpb25zLmlzTWFya3VwU29jaWFsc0hhbmRsZXJzRW5hYmxlZCA9IG9wdGlvbnMuaXNNYXJrdXBTb2NpYWxzSGFuZGxlcnNFbmFibGVkIHx8IGZhbHNlO1xuICAgIHNlbGYuX29wdGlvbnMucmVkaXJlY3RVcmwgPSBvcHRpb25zLnJlZGlyZWN0VXJsIHx8IHVuZGVmaW5lZDtcbiAgICBzZWxmLl9vcHRpb25zLmFwaVVybCA9IG9wdGlvbnMuYXBpVXJsIHx8ICcvL2xvZ2luLnhzb2xsYS5jb20vYXBpLyc7XG4gICAgc2VsZi5fb3B0aW9ucy5tYXhYTENsaWNrRGVwdGggPSBvcHRpb25zLm1heFhMQ2xpY2tEZXB0aCB8fCAyMDtcbiAgICBzZWxmLl9vcHRpb25zLm9ubHlXaWRnZXRzID0gb3B0aW9ucy5vbmx5V2lkZ2V0cyB8fCBmYWxzZTtcbiAgICBzZWxmLl9vcHRpb25zLnByb2plY3RJZCA9IG9wdGlvbnMucHJvamVjdElkO1xuICAgIHNlbGYuX29wdGlvbnMubG9jYWxlID0gb3B0aW9ucy5sb2NhbGUgfHwgJ2VuJztcblxuICAgIHZhciBwYXJhbXMgPSB7fTtcbiAgICBwYXJhbXMucHJvamVjdElkID0gb3B0aW9ucy5wcm9qZWN0SWQ7XG5cbiAgICBpZiAoc2VsZi5fb3B0aW9ucy5yZWRpcmVjdFVybCkge1xuICAgICAgICBwYXJhbXMucmVkaXJlY3RfdXJsID0gc2VsZi5fb3B0aW9ucy5yZWRpcmVjdFVybDtcbiAgICB9XG5cbiAgICBzZWxmLl9hcGkgPSBuZXcgWExBcGkob3B0aW9ucy5wcm9qZWN0SWQsIHNlbGYuX29wdGlvbnMuYXBpVXJsKTtcblxuICAgIGlmICghc2VsZi5fb3B0aW9ucy5vbmx5V2lkZ2V0cykge1xuXG4gICAgICAgIHZhciB1cGRhdGVTb2NpYWxMaW5rcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuX2FwaS5nZXRTb2NpYWxzVVJMcyhmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9zb2NpYWxVcmxzID0ge307XG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9zb2NpYWxVcmxzWydzbi0nICsga2V5XSA9IHJlc3BvbnNlW2tleV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICB9LCBwYXJhbXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vVXBkYXRlIGF1dGggbGlua3MgZXZlcnkgaG91clxuICAgICAgICB1cGRhdGVTb2NpYWxMaW5rcygpO1xuICAgICAgICBzZXRJbnRlcnZhbCh1cGRhdGVTb2NpYWxMaW5rcywgMTAwMCAqIDYwICogNTkpO1xuXG4gICAgICAgIHZhciBlbGVtZW50cyA9IHNlbGYuZ2V0QWxsRWxlbWVudHNXaXRoQXR0cmlidXRlKCdkYXRhLXhsLWF1dGgnKTtcbiAgICAgICAgdmFyIGxvZ2luID0gJyc7XG4gICAgICAgIHZhciBwYXNzID0gJyc7XG5cbiAgICAgICAgLy8gRmluZCBjbG9zZXN0IGFuY2VzdG9yIHdpdGggZGF0YS14bC1hdXRoIGF0dHJpYnV0ZVxuICAgICAgICBmdW5jdGlvbiBmaW5kQW5jZXN0b3IoZWwpIHtcbiAgICAgICAgICAgIGlmIChlbC5hdHRyaWJ1dGVzWydkYXRhLXhsLWF1dGgnXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBlbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgICAgIHdoaWxlICgoZWwgPSBlbC5wYXJlbnRFbGVtZW50KSAmJiAhZWwuYXR0cmlidXRlc1snZGF0YS14bC1hdXRoJ10gJiYgKytpIDwgc2VsZi5fb3B0aW9ucy5tYXhYTENsaWNrRGVwdGgpO1xuICAgICAgICAgICAgcmV0dXJuIGVsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNlbGYuX29wdGlvbnMuaXNNYXJrdXBTb2NpYWxzSGFuZGxlcnNFbmFibGVkKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9IGZpbmRBbmNlc3RvcihlLnRhcmdldCk7XG4gICAgICAgICAgICAgICAgLy8gRG8gbm90aGluZyBpZiBjbGljayB3YXMgb3V0c2lkZSBvZiBlbGVtZW50cyB3aXRoIGRhdGEteGwtYXV0aFxuICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHhsRGF0YSA9IHRhcmdldC5hdHRyaWJ1dGVzWydkYXRhLXhsLWF1dGgnXTtcbiAgICAgICAgICAgICAgICBpZiAoeGxEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBub2RlVmFsdWUgPSB4bERhdGEubm9kZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmxvZ2luKHthdXRoVHlwZTogbm9kZVZhbHVlfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8qKlxuICogUGVyZm9ybXMgbG9naW5cbiAqIEBwYXJhbSBwcm9wXG4gKiBAcGFyYW0gZXJyb3IgLSBjYWxsIGluIGNhc2UgZXJyb3JcbiAqIEBwYXJhbSBzdWNjZXNzXG4gKi9cblhMLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uIChwcm9wLCBlcnJvciwgc3VjY2Vzcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICghcHJvcCB8fCAhc2VsZi5fc29jaWFsVXJscykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcHJvcHNcbiAgICAgKiBhdXRoVHlwZTogc24tPHNvY2lhbCBuYW1lPiwgbG9naW4tcGFzcywgc21zXG4gICAgICovXG4gICAgaWYgKHByb3AuYXV0aFR5cGUpIHtcbiAgICAgICAgaWYgKHByb3AuYXV0aFR5cGUuc3RhcnRzV2l0aCgnc24tJykpIHtcbiAgICAgICAgICAgIHZhciBzb2NpYWxVcmwgPSBzZWxmLl9zb2NpYWxVcmxzW3Byb3AuYXV0aFR5cGVdO1xuICAgICAgICAgICAgaWYgKHNvY2lhbFVybCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHNlbGYuX3NvY2lhbFVybHNbcHJvcC5hdXRoVHlwZV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F1dGggdHlwZTogJyArIHByb3AuYXV0aFR5cGUgKyAnIGRvZXNuXFwndCBleGlzdCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnbG9naW4tcGFzcycpIHtcbiAgICAgICAgICAgIHNlbGYuX2FwaS5sb2dpblBhc3NBdXRoKHByb3AubG9naW4sIHByb3AucGFzcywgcHJvcC5yZW1lbWJlck1lLCBzZWxmLl9vcHRpb25zLnJlZGlyZWN0VXJsLCBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlcy5sb2dpbl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpbmlzaEF1dGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlcy5sb2dpbl91cmw7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzKHtzdGF0dXM6ICdzdWNjZXNzJywgZmluaXNoOiBmaW5pc2hBdXRoLCByZWRpcmVjdFVybDogcmVzLmxvZ2luX3VybH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmluaXNoQXV0aCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3Ioc2VsZi5jcmVhdGVFcnJvck9iamVjdCgnTG9naW4gb3IgcGFzcyBub3QgdmFsaWQnLCBYTC5JTkNPUlJFQ1RfTE9HSU5fT1JfUEFTU1dPUkRfRVJST1JfQ09ERSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBlcnJvcihlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAocHJvcC5hdXRoVHlwZSA9PSAnc21zJykge1xuICAgICAgICAgICAgaWYgKHNtc0F1dGhTdGVwID09ICdwaG9uZScpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9hcGkuc21zQXV0aChwcm9wLnBob25lTnVtYmVyLCBudWxsLCBudWxsKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc21zQXV0aFN0ZXAgPT0gJ2NvZGUnKSB7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5rbm93biBhdXRoIHR5cGUnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblhMLnByb3RvdHlwZS5zZW5kU21zID0gZnVuY3Rpb24gKG51bWJlciwgZXJyb3IsIHN1Y2Nlc3MpIHtcblxufTtcblxuXG5YTC5wcm90b3R5cGUuZ2V0QWxsRWxlbWVudHNXaXRoQXR0cmlidXRlID0gZnVuY3Rpb24gKGF0dHJpYnV0ZSkge1xuICAgIHZhciBtYXRjaGluZ0VsZW1lbnRzID0gW107XG4gICAgdmFyIGFsbEVsZW1lbnRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJyonKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IGFsbEVsZW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKylcbiAgICB7XG4gICAgICAgIGlmIChhbGxFbGVtZW50c1tpXS5nZXRBdHRyaWJ1dGUoYXR0cmlidXRlKSAhPT0gbnVsbClcbiAgICAgICAge1xuICAgICAgICAgICAgbWF0Y2hpbmdFbGVtZW50cy5wdXNoKGFsbEVsZW1lbnRzW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF0Y2hpbmdFbGVtZW50cztcbn07XG5cblhMLnByb3RvdHlwZS5jcmVhdGVFcnJvck9iamVjdCA9IGZ1bmN0aW9uKG1lc3NhZ2UsIGNvZGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICAgIGNvZGU6IGNvZGUgfHwgLTFcbiAgICAgICAgfVxuICAgIH07XG59O1xuXG5YTC5nZXRQcm9qZWN0SWQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gd2luZG93Ll9feGwuX29wdGlvbnMucHJvamVjdElkO1xufTtcblxuWEwuZ2V0UmVkaXJlY3RVUkwgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHdpbmRvdy5fX3hsLl9vcHRpb25zLnJlZGlyZWN0VXJsO1xufTtcblxuWEwuaW5pdCA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICBpZiAoIXdpbmRvdy5fX3hsKSB7XG4gICAgICAgIHZhciB4bCA9IG5ldyBYTChwYXJhbXMpO1xuICAgICAgICB3aW5kb3cuX194bCA9IHhsO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1hMIGFscmVhZHkgaW5pdCEnKTtcbiAgICB9XG59O1xuXG5YTC5sb2dpbiA9IGZ1bmN0aW9uIChwcm9wLCBlcnJvciwgc3VjY2Vzcykge1xuICAgIGlmICh3aW5kb3cuX194bCkge1xuICAgICAgICB3aW5kb3cuX194bC5sb2dpbihwcm9wLCBlcnJvciwgc3VjY2Vzcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignUGxlYXNlIHJ1biBYTC5pbml0KCkgZmlyc3QnKTtcbiAgICB9XG59O1xuXG5YTC5BdXRoV2lkZ2V0ID0gZnVuY3Rpb24gKGVsZW1lbnRJZCwgb3B0aW9ucykge1xuICAgIGlmICh3aW5kb3cuX194bCkge1xuICAgICAgICBpZiAoIWVsZW1lbnRJZCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTm8gZGl2IG5hbWUhJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucz09dW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHdpZHRoID0gb3B0aW9ucy53aWR0aCB8fCAyMDA7XG4gICAgICAgICAgICB2YXIgaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgNDAwO1xuXG4gICAgICAgICAgICAvLyB2YXIgc3R5bGVTdHJpbmcgPSAnYm9yZWRlcjpub25lJztcbiAgICAgICAgICAgIHZhciBzcmMgPSAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL2hvbWUvP3Byb2plY3RJZD0nICsgWEwuZ2V0UHJvamVjdElkKCkgKyAnJmxvY2FsZT0nICsgd2luZG93Ll9feGwuX29wdGlvbnMubG9jYWxlO1xuXG4gICAgICAgICAgICB2YXIgcmVkaXJlY3RVcmwgPSBYTC5nZXRSZWRpcmVjdFVSTCgpO1xuICAgICAgICAgICAgaWYgKHJlZGlyZWN0VXJsKSB7XG4gICAgICAgICAgICAgICAgc3JjID0gc3JjICsgJyZyZWRpcmVjdFVybD0nK2VuY29kZVVSSUNvbXBvbmVudChyZWRpcmVjdFVybCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHZhciB3aWRnZXRIdG1sID0gJzxpZnJhbWUgZnJhbWVib3JkZXI9XCIwXCIgd2lkdGg9XCInK3dpZHRoKydcIiBoZWlnaHQ9XCInK2hlaWdodCsnXCIgIHNyYz1cIicrc3JjKydcIj5Ob3Qgc3VwcG9ydGVkPC9pZnJhbWU+JztcbiAgICAgICAgICAgIHZhciB3aWRnZXRJZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5yZW1vdmVDaGlsZChwcmVsb2FkZXIpO1xuICAgICAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9IHdpZHRoKydweCc7XG4gICAgICAgICAgICAgICAgd2lkZ2V0SWZyYW1lLnN0eWxlLmhlaWdodCA9IGhlaWdodCsncHgnO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgICAgICB3aWRnZXRJZnJhbWUuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5mcmFtZUJvcmRlciA9ICcwJztcbiAgICAgICAgICAgIHdpZGdldElmcmFtZS5zcmMgPSBzcmM7XG5cblxuICAgICAgICAgICAgdmFyIHByZWxvYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgcHJlbG9hZGVyLmlubmVySFRNTCA9ICdMb2FkaW5nLi4uJztcblxuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtZW50SWQpO1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZENoaWxkKHByZWxvYWRlcik7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZCh3aWRnZXRJZnJhbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFbGVtZW50IFxcXCInICsgZWxlbWVudElkICsnXFxcIiBub3QgZm91bmQhJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHZhciBzb2NrZXQgPSBuZXcgZWFzeVhETS5Tb2NrZXQoe1xuICAgICAgICAgICAgLy8gICAgIHJlbW90ZTogc3JjLCAvLyB0aGUgcGF0aCB0byB0aGUgcHJvdmlkZXIsXG4gICAgICAgICAgICAvLyAgICAgY29udGFpbmVyOiBlbGVtZW50LFxuICAgICAgICAgICAgLy8gICAgIG9uTWVzc2FnZTpmdW5jdGlvbihtZXNzYWdlLCBvcmlnaW4pIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgLy9kbyBzb21ldGhpbmcgd2l0aCBtZXNzYWdlXG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gfSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdQbGVhc2UgcnVuIFhMLmluaXQoKSBmaXJzdCcpO1xuICAgIH1cbn07XG5cblhMLkF1dGhCdXR0b24gPSBmdW5jdGlvbiAoZGl2TmFtZSwgb3B0aW9ucykge1xuXG59O1xuXG5YTC5JTlZBTElEX0xPR0lOX0VSUk9SX0NPREUgPSAxO1xuWEwuSU5DT1JSRUNUX0xPR0lOX09SX1BBU1NXT1JEX0VSUk9SX0NPREUgPSAyO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhMOyJdfQ==
