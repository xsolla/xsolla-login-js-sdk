const main = require('../src/main');

const TEST_CONFIG = {
    projectId: '40db2ea4-5d42-11e6-a3ff-005056a0e04a',
    redirectUrl: 'https://publisher.xsolla.com',
    callbackUrl: 'https://test.xsolla.com',
    loginUrl: 'https://test.xsolla.com',
    popupBackgroundColor: 'rgba(102, 255, 51, 1)',
    iframeZIndex: 0,
    theme: 'testTheme.css',
    locale: 'en_US',
    fields: 'username,email',
    externalWindow: true,
    route: 'XL.ROUTES.ALL_SOCIALS',
    widgetVersion: '4.0.1',
    widgetBaseUrl: 'https://base-widget-test.com/',
    compact: true,
    onlyWidgets: true
};

beforeAll(() => {
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
        onlyWidgets: TEST_CONFIG.onlyWidgets
    });
});

describe('Config params', function () {
    test('get projectId', () => {
        expect(main.getProjectId()).toBe(TEST_CONFIG.projectId);
    });

    test('get redirectUrl', () => {
        expect(main.getRedirectURL()).toBe(TEST_CONFIG.redirectUrl);
    });

    test('get callbackUrl', () => {
        expect(main.getCallbackUrl()).toBe(TEST_CONFIG.callbackUrl);
    });

    test('get popupBackgroundColor', () => {
        expect(main.config.popupBackgroundColor).toBe(TEST_CONFIG.popupBackgroundColor);
    });

    test('get iframeZIndex', () => {
        expect(main.config.iframeZIndex).toBe(TEST_CONFIG.iframeZIndex);
    });

    test('get theme', () => {
        expect(main.config.theme).toBe(TEST_CONFIG.theme);
    });

    test('get locale', () => {
        expect(main.config.locale).toBe(TEST_CONFIG.locale);
    });

    test('get fields', () => {
        expect(main.config.fields).toBe(TEST_CONFIG.fields);
    });
});

describe('Generating url', function () {
    test('default', () => {
        const defaultUrl = main.getIframeSrc();
        const sdkStartIndex = defaultUrl.indexOf('widget_sdk_version=');
        const sdkEndIndex = defaultUrl.indexOf('&', sdkStartIndex);
        const newUrl = defaultUrl.substring(0, sdkStartIndex) + defaultUrl.substring(sdkEndIndex + 1);
        expect(newUrl)
            .toBe('https://xl-widget.xsolla.com/?projectId=40db2ea4-5d42-11e6-a3ff-005056a0e04a&locale=en_US&fields=username,email&redirectUrl=https%3A%2F%2Fpublisher.xsolla.com&login_url=https%3A%2F%2Ftest.xsolla.com&theme=testTheme.css&external_window=true&version=4.0.1&compact=true');
    });

    test('change widgetBaseUrl', () => {
        const widgetUrl = main.getIframeSrc({ widgetBaseUrl: TEST_CONFIG.widgetBaseUrl });
        const baseUrlEndIndex = widgetUrl.indexOf('?');
        const widgetBaseUrl = widgetUrl.substring(0, baseUrlEndIndex);

        expect(widgetBaseUrl).toBe(TEST_CONFIG.widgetBaseUrl);
    });

    test('change route', () => {
        const widgetUrl = main.getIframeSrc({ route: TEST_CONFIG.route });
        const routeEndIndex = widgetUrl.indexOf('?');
        const routeStartIndex = widgetUrl.indexOf('/', 8);
        const route = widgetUrl.substring(routeStartIndex + 1, routeEndIndex);

        expect(route).toBe(TEST_CONFIG.route);
    });

    test('check projectId', () => {
        const defaultUrl = main.getIframeSrc();
        const projectIdStartIndex = defaultUrl.indexOf('&projectId=');
        const projectIdEndIndex = defaultUrl.indexOf('&', projectIdStartIndex + 1);
        const projectId = defaultUrl.substring(projectIdStartIndex + 11, projectIdEndIndex);

        expect(projectId).toBe(TEST_CONFIG.projectId);
    });

    test('check locale', () => {
        const defaultUrl = main.getIframeSrc();
        const localeStartIndex = defaultUrl.indexOf('&locale=');
        const localeEndIndex = defaultUrl.indexOf('&', localeStartIndex + 1);
        const locale = defaultUrl.substring(localeStartIndex + 8, localeEndIndex);

        expect(locale).toBe(TEST_CONFIG.locale);
    });

    test('check fields', () => {
        const defaultUrl = main.getIframeSrc();
        const fieldsStartIndex = defaultUrl.indexOf('&fields=');
        const fieldsEndIndex = defaultUrl.indexOf('&', fieldsStartIndex + 1);
        const fields = defaultUrl.substring(fieldsStartIndex + 8, fieldsEndIndex);

        expect(fields).toBe(TEST_CONFIG.fields);
    });

    test('check redirectUrl', () => {
        const defaultUrl = main.getIframeSrc();
        const redirectUrlStartIndex = defaultUrl.indexOf('&redirectUrl=');
        const redirectUrlEndIndex = defaultUrl.indexOf('&', redirectUrlStartIndex + 1);
        const redirectUrl = defaultUrl.substring(redirectUrlStartIndex + 13, redirectUrlEndIndex);

        expect(redirectUrl).toBe(encodeURIComponent(TEST_CONFIG.redirectUrl));
    });

    test('check loginUrl', () => {
        const defaultUrl = main.getIframeSrc();
        const loginUrlStartIndex = defaultUrl.indexOf('&login_url=');
        const loginUrlEndIndex = defaultUrl.indexOf('&', loginUrlStartIndex + 1);
        const loginUrl = defaultUrl.substring(loginUrlStartIndex + 11, loginUrlEndIndex);

        expect(loginUrl).toBe(encodeURIComponent(TEST_CONFIG.loginUrl));
    });

    test('check theme', () => {
        const defaultUrl = main.getIframeSrc();
        const themeStartIndex = defaultUrl.indexOf('&theme=');
        const themeEndIndex = defaultUrl.indexOf('&', themeStartIndex + 1);
        const theme = defaultUrl.substring(themeStartIndex + 7, themeEndIndex);

        expect(theme).toBe(encodeURIComponent(TEST_CONFIG.theme));
    });

    test('check externalWindow', () => {
        const defaultUrl = main.getIframeSrc();
        const externalWindowStartIndex = defaultUrl.indexOf('&external_window=');
        const externalWindowEndIndex = defaultUrl.indexOf('&', externalWindowStartIndex + 1);
        const externalWindow = defaultUrl.substring(externalWindowStartIndex + 17, externalWindowEndIndex);

        expect(externalWindow).toBe(encodeURIComponent(TEST_CONFIG.externalWindow));
    });

    test('check widgetVersion', () => {
        const defaultUrl = main.getIframeSrc();
        console.dir(defaultUrl);
        const widgetVersionStartIndex = defaultUrl.indexOf('&version=');
        const widgetVersionEndIndex = defaultUrl.indexOf('&', widgetVersionStartIndex + 1);
        const widgetVersion = defaultUrl.substring(widgetVersionStartIndex + 9, widgetVersionEndIndex);

        expect(widgetVersion).toBe(encodeURIComponent(TEST_CONFIG.widgetVersion));
    });

    test('check compact', () => {
        const defaultUrl = main.getIframeSrc();
        const compactStartIndex = defaultUrl.indexOf('&compact=');
        const compact = defaultUrl.substring(compactStartIndex + 9);

        expect(compact).toBe(encodeURIComponent(TEST_CONFIG.compact));
    });
});