const main = require('../src/main');
const ParseUrl = require('url-parse');

const TEST_CONFIG = {
    projectId: '40db2ea4-5d42-11e6-a3ff-005056a0e04a',
    redirectUrl: 'https://publisher.xsolla.com',
    callbackUrl: 'https://test.xsolla.com',
    loginUrl: 'https://test.xsolla.com',
    popupBackgroundColor: 'rgba(102, 255, 51, 1)',
    iframeZIndex: '0',
    theme: 'testTheme.css',
    locale: 'en_US',
    fields: 'username,email',
    externalWindow: 'true',
    route: 'XL.ROUTES.ALL_SOCIALS',
    widgetVersion: '4.0.1',
    widgetBaseUrl: 'https://base-widget-test.com/',
    compact: 'true',
    onlyWidgets: 'true',
    state: 'ABCD1234',
    clientId: '1',
    redirectUri: 'http://example.com',
    responseType: 'code'
};

beforeEach(() => {
    main.init({
        projectId: TEST_CONFIG.projectId,
        redirectUrl: TEST_CONFIG.redirectUrl,
        callbackUrl: TEST_CONFIG.callbackUrl,
        popupBackgroundColor: TEST_CONFIG.popupBackgroundColor,
        iframeZIndex: TEST_CONFIG.iframeZIndex,
        theme: TEST_CONFIG.theme,
        locale: TEST_CONFIG.locale,
        fields: TEST_CONFIG.fields,
        externalWindow: TEST_CONFIG.externalWindow,
        widgetVersion: TEST_CONFIG.widgetVersion,
        compact: TEST_CONFIG.compact,
        onlyWidgets: TEST_CONFIG.onlyWidgets,
        state: TEST_CONFIG.state,
        clientId: TEST_CONFIG.clientId,
        redirectUri: TEST_CONFIG.redirectUri,
        responseType: TEST_CONFIG.responseType,
    });
});

describe('Widget config params', function () {
    it('contains popupBackgroundColor param', () => {
        expect(main.config.popupBackgroundColor).toBe(TEST_CONFIG.popupBackgroundColor);
    });

    it('contains iframeZIndex param', () => {
        expect(main.config.iframeZIndex).toBe(TEST_CONFIG.iframeZIndex);
    });
});

describe('Get iframe source', function () {
    it('returns default value', () => {
        const defaultUrl = ParseUrl(main.getLink(), true);

        expect(defaultUrl.origin).toBe('https://xl-widget.xsolla.com');
    });

    it('changes widgetBaseUrl param', () => {
        const defaultUrl = ParseUrl(main.getLink({ widgetBaseUrl: TEST_CONFIG.widgetBaseUrl }), true);

        expect(defaultUrl.origin + '/').toBe(TEST_CONFIG.widgetBaseUrl);
    });

    it('changes route param', () => {
        const defaultUrl = ParseUrl(main.getLink({ route: TEST_CONFIG.route }), true);

        expect(defaultUrl.pathname.substring(1)).toBe(TEST_CONFIG.route);
    });

    it('contains projectId param', () => {
        const defaultUrl = ParseUrl(main.getLink(), true);

        expect(decodeURIComponent(defaultUrl.query.projectId)).toBe(TEST_CONFIG.projectId);
    });

    it('contains locale param', () => {
        const defaultUrl = ParseUrl(main.getLink(), true);

        expect(decodeURIComponent(defaultUrl.query.locale)).toBe(TEST_CONFIG.locale);
    });

    it('contains fields param', () => {
        const defaultUrl = ParseUrl(main.getLink(), true);

        expect(decodeURIComponent(defaultUrl.query.fields)).toBe(TEST_CONFIG.fields);
    });

    it('contains redirectUrl param', () => {
        const defaultUrl = ParseUrl(main.getLink(), true);

        expect(decodeURIComponent(defaultUrl.query.redirectUrl)).toBe(TEST_CONFIG.redirectUrl);
    });

    it('contains loginUrl param', () => {
        const defaultUrl = ParseUrl(main.getLink(), true);

        expect(decodeURIComponent(defaultUrl.query.login_url)).toBe(TEST_CONFIG.loginUrl);
    });

    it('contains theme param', () => {
        const defaultUrl = ParseUrl(main.getLink(), true);

        expect(decodeURIComponent(defaultUrl.query.theme)).toBe(TEST_CONFIG.theme);
    });

    it('contains externalWindow param', () => {
        const defaultUrl = ParseUrl(main.getLink(), true);

        expect(decodeURIComponent(defaultUrl.query.external_window)).toBe(TEST_CONFIG.externalWindow);
    });

    it('contains widgetVersion param', () => {
        const defaultUrl = ParseUrl(main.getLink(), true);

        expect(decodeURIComponent(defaultUrl.query.version)).toBe(TEST_CONFIG.widgetVersion);
    });

    it('contains compact param', () => {
        const defaultUrl = ParseUrl(main.getLink(), true);

        expect(decodeURIComponent(defaultUrl.query.compact)).toBe(TEST_CONFIG.compact);
    });

    it('contains state param', () => {
        const defaultUrl = ParseUrl(main.getLink(), true);

        expect(decodeURIComponent(defaultUrl.query.state)).toBe(TEST_CONFIG.state);
    });

    it('should randomize state by default', () => {
        main.init({
            projectId: 'test',
            clientId: '1'
        });
        const url = ParseUrl(main.getLink(), true);

        expect(decodeURI(url.query.state).length).toBeGreaterThan(8);
    });

    it('contains client_id param', () => {
        const defaultUrl = ParseUrl(main.getLink(), true);

        expect(decodeURIComponent(defaultUrl.query.client_id)).toBe(TEST_CONFIG.clientId);
    });

    it('contains redirect_uri param', () => {
        const defaultUrl = ParseUrl(main.getLink(), true);

        expect(decodeURIComponent(defaultUrl.query.redirect_uri)).toBe(TEST_CONFIG.redirectUri);
    });

    it('contains response_type param', () => {
        const defaultUrl = ParseUrl(main.getLink(), true);

        expect(decodeURIComponent(defaultUrl.query.response_type)).toBe(TEST_CONFIG.responseType);
    });

    it('response_type should by "code" by default', () => {
        main.init({
            projectId: 'test',
            clientId: '1'
        });
        const url = ParseUrl(main.getLink(), true);

        expect(decodeURIComponent(url.query.response_type)).toBe('code');
    });
});