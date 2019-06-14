const main = require('../src/main');

main.init({
    projectId: '40db2ea4-5d42-11e6-a3ff-005056a0e04a',
    redirectUrl: 'https://publisher.xsolla.com',
    callbackUrl: 'https://test.xsolla.com',
    popupBackgroundColor: 'rgba(102, 255, 51, 1)',
    iframeZIndex: 0,
    theme: 'testTheme.css',
    locale: 'en_US',
    fields: 'username, email',
    onlyWidgets: true
});

test('get projectId', () => {
    expect(main.getProjectId()).toBe('40db2ea4-5d42-11e6-a3ff-005056a0e04a');
});

test('get redirectUrl', () => {
    expect(main.getRedirectURL()).toBe('https://publisher.xsolla.com');
});

test('get callbackUrl', () => {
    expect(main.getCallbackUrl()).toBe('https://test.xsolla.com');
});

test('get popupBackgroundColor', () => {
    expect(main.config.popupBackgroundColor).toBe('rgba(102, 255, 51, 1)');
});

test('get iframeZIndex', () => {
    expect(main.config.iframeZIndex).toBe(0);
});

test('get theme', () => {
    expect(main.config.theme).toBe('testTheme.css');
});

test('get locale', () => {
    expect(main.config.locale).toBe('en_US');
});

test('get fields', () => {
    expect(main.config.fields).toBe('username, email');
});