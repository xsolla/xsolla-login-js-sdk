/**
 * Created by a.korotaev on 24.06.16.
 */
require('./supports');

import XLApi from './xlapi';
/**
 * Create an `Auth0` instance with `options`
 *
 * @class XL
 * @constructor
 */

const ROUTES = {
    LOGIN: '',
    REGISTRATION: 'registration',
    RECOVER_PASSWORD: 'reset-password',
    ALL_SOCIALS: 'other'
};

const DEFAULT_CONFIG = {
    errorHandler: function (a) {
    },
    loginPassValidator: function (a, b) {
        return true;
    },
    isMarkupSocialsHandlersEnabled: false,
    apiUrl: '//login.xsolla.com/api/',
    maxXLClickDepth: 20,
    onlyWidgets: false,
    popupBackgroundColor: 'rgb(187, 187, 187)',
    iframeZIndex: 1000000,
    theme: 'app.default.css',
    preloader: '<div></div>',
    widgetBaseUrl: 'https://xl-widget.xsolla.com/',
    route: ROUTES.LOGIN,
    inFullscreenMode: false
};

const INVALID_LOGIN_ERROR_CODE = 1;
const INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE = 2;

const IFRAME_ID = 'XsollaLoginWidgetIframe';
const widgetIframe = document.createElement('iframe');

class XL {
    constructor() {
        this.socialUrls = {};
        this.eventTypes = {
            LOAD: 'load',
            CLOSE: 'close',
            HIDE_POPUP: 'hide popup'
        };

        // need for export purposes
        this.ROUTES = ROUTES;

        this.dispatcher = document.createElement('div');
        this.onHideEvent = this.onHideEvent.bind(this);
    }

    init(options) {
        this.config = Object.assign({}, DEFAULT_CONFIG, options);
        this.config.popupBackgroundColor = DEFAULT_CONFIG.popupBackgroundColor;
        this.api = new XLApi(options.projectId, this.config.apiUrl);

        const eventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent';
        const eventer = window[eventMethod];
        const messageEvent = eventMethod == 'attachEvent' ? 'onmessage' : 'message';

        // Listen to message from child window
        eventer(messageEvent, (e) => {
            let event = new CustomEvent(this.eventTypes[e.data]);
            this.dispatcher.dispatchEvent(event);
        }, false);

        Object.keys(this.eventTypes).map((eventKey) => {
            this.on(this.eventTypes[eventKey]);
        });

        if(options.popupBackgroundColor) {
            this.config.popupBackgroundColor = options.popupBackgroundColor;
        }

        this.dispatcher.addEventListener(this.eventTypes.HIDE_POPUP, this.onHideEvent);

        if (!this.config.onlyWidgets) {

            let params = {};
            params.projectId = options.projectId;
            if (this.config.redirectUrl) {
                params.redirect_url = this.config.redirectUrl;
            }
            if (this.config.loginUrl) {
                params.login_url = this.config.loginUrl;
            }
            if (this.config.callbackUrl) {
                params.login_url = this.config.callbackUrl;
            }

            const updateSocialLinks = () => {
                this.api.getSocialsURLs((response) => {
                    this.socialUrls = {};
                    for (let key in response) {
                        if (response.hasOwnProperty(key)) {
                            this.socialUrls['sn-' + key] = response[key];
                        }
                    }
                }, (e) => {
                    console.error(e);
                }, params);
            };

            updateSocialLinks();
            setInterval(updateSocialLinks, 1000 * 60 * 59);

            const maxClickDepth = this.config.maxXLClickDepth;
            // Find closest ancestor with data-xl-auth attribute
            function findAncestor(el) {
                if (el.attributes['data-xl-auth']) {
                    return el;
                }
                let i = 0;
                while ((el = el.parentElement) && !el.attributes['data-xl-auth'] && ++i < maxClickDepth);
                return el;
            }

            if (this.config.isMarkupSocialsHandlersEnabled) {
                document.addEventListener('click', (e) => {
                    const target = findAncestor(e.target);
                    // Do nothing if click was outside of elements with data-xl-auth
                    if (!target) {
                        return;
                    }
                    const xlData = target.attributes['data-xl-auth'];
                    if (xlData) {
                        let nodeValue = xlData.nodeValue;
                        if (nodeValue) {
                            this.login({authType: nodeValue});
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
    login(prop, error, success) {

        if (!prop || !this.socialUrls) {
            return;
        }

        /**
         * props
         * authType: sn-<social name>, login-pass, sms
         */
        if (prop.authType) {
            if (prop.authType.startsWith('sn-')) {
                const socialUrl = this.socialUrls[prop.authType];
                if (socialUrl != undefined) {
                    window.location.href = this.socialUrls[prop.authType];
                } else {
                    console.error('Auth type: ' + prop.authType + ' doesn\'t exist');
                }

            } else if (prop.authType == 'login-pass') {
                this.api.loginPassAuth(prop.login, prop.pass, prop.rememberMe, this.config.redirectUrl, (res) => {
                    if (res.login_url) {
                        const finishAuth = function () {
                            window.location.href = res.login_url;
                        };
                        if (success) {
                            success({status: 'success', finish: finishAuth, redirectUrl: res.login_url});
                        } else {
                            finishAuth();
                        }
                    } else {
                        error(this.createErrorObject('Login or pass not valid', INCORRECT_LOGIN_OR_PASSWORD_ERROR_CODE));
                    }
                }, function (err) {
                    error(err);
                });
            } else if (prop.authType == 'sms') {
                if (smsAuthStep == 'phone') {
                    this.api.smsAuth(prop.phoneNumber, null, null);
                } else if (smsAuthStep == 'code') {

                }
            } else {
                console.error('Unknown auth type');
            }
        }
    }

    createErrorObject(message, code) {
        return {
            error: {
                message: message,
                code: code || -1
            }
        };
    };

    getProjectId() {
        return this.config.projectId;
    };

    getRedirectURL() {
        return this.config.redirectUrl;
    };

    getTheme() {
        return this.config.theme;
    }

    getCallbackUrl() {
        if (this.config.loginUrl) return this.config.loginUrl;
        else return this.config.callbackUrl
    };

    getIframeSrc(options = {}) {
        const widgetBaseUrl = options.widgetBaseUrl || this.config.widgetBaseUrl;

        const route = options.route || this.config.route;

        let src = widgetBaseUrl + route + '?projectId=' + this.getProjectId();

        if (this.config.locale) {
            src = src + '&locale=' + this.config.locale;
        }
        if (this.config.fields) {
            src = src + '&fields=' + this.config.fields;
        }
        const redirectUrl = this.getRedirectURL();
        if (redirectUrl) {
            src = src + '&redirectUrl=' + encodeURIComponent(redirectUrl);
        }

        const callbackUrl = this.getCallbackUrl();

        if (callbackUrl) {
            src = src + '&login_url=' + encodeURIComponent(callbackUrl);
        }

        const theme = this.getTheme();
        if (theme) {
            src = src + '&theme=' + encodeURIComponent(theme);
        }

        return src;
    }

    AuthWidget(elementId, options) {
        if (this.api) {
            if (!elementId) {
                console.error('No div name!');
            } else {
                if (options == undefined) {
                    options = {};
                }
                const width = `${options.width || 400}px`;
                const height = `${options.height || 550}px`;

                widgetIframe.onload = () => {
                    element.removeChild(preloader);
                    widgetIframe.style.width = '100%';
                    widgetIframe.style.height = '100%';
                    let event = new CustomEvent('load');
                    this.dispatcher.dispatchEvent(event);
                };
                widgetIframe.style.width = 0;
                widgetIframe.style.height = 0;
                widgetIframe.frameBorder = '0';
                widgetIframe.src = this.getIframeSrc(options);
                widgetIframe.id = IFRAME_ID;



                const preloader = document.createElement('div');

                preloader.innerHTML = this.config.preloader;

                const element = document.getElementById(elementId);
                if (element) {
                    element.style.width = width;
                    element.style.height = height;
                    element.appendChild(preloader);
                    element.appendChild(widgetIframe);
                } else {
                    console.error('Element \"' + elementId + '\" not found!');
                }

            }
        } else {
            console.error('Please run XL.init() first');
        }
    };

    onCloseEvent() {
        widgetIframe.parentNode.removeChild(widgetIframe);
    }

    _hide() {
        widgetIframe.style.position = '';
        widgetIframe.style.zIndex = '';
        widgetIframe.style.left = '';
        widgetIframe.style.top = '';
        widgetIframe.style.width = 0;
        widgetIframe.style.height = 0;
        widgetIframe.style.backgroundColor = '';
    }

    onHideEvent() {
        if (this.config.inFullscreenMode) {
            this._hide();
        }
    }

    /**
     * link event with handler
     * @param event
     * @param handler
     */

    on(event, handler) {
        handler = handler || null;

        if (event === this.eventTypes.CLOSE) {
            if (!handler) {
                handler = this.onCloseEvent;
            }
            else {
                this.dispatcher.removeEventListener(event, this.onCloseEvent);
            }
        }

        this.dispatcher.addEventListener(event, handler);
    };

    _show() {
        widgetIframe.style.position = 'fixed';
        widgetIframe.style.zIndex = this.config.iframeZIndex;
        widgetIframe.style.left = '0';
        widgetIframe.style.top = '0';
        widgetIframe.style.width = '100%';
        widgetIframe.style.height = '100%';
        widgetIframe.style.backgroundColor = this.config.popupBackgroundColor;
        this.config.inFullscreenMode = true;
    }

    /**
     * open fullsreen popup for widget
     */

    show() {
        if (!document.getElementById(IFRAME_ID)) {
            widgetIframe.src = this.getIframeSrc();
            widgetIframe.id = IFRAME_ID;
            widgetIframe.style.width = 0;
            widgetIframe.style.height = 0;
            widgetIframe.frameBorder = '0';

            widgetIframe.onload = () => {
                let event = new CustomEvent('load');
                this.dispatcher.dispatchEvent(event);
            };
            this._show();

            document.body.appendChild(widgetIframe);
        } else {
            this._show();
        }
    };
}

const result = new XL();

module.exports = result;