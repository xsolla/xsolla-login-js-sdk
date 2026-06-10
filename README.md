# Xsolla Login JavaScript SDK

![License](https://img.shields.io/github/license/xsolla/xsolla-login-js-sdk)

## Overview

The Xsolla Login JavaScript SDK lets you embed the Xsolla Login Widget into a website in a few steps, giving players authentication via login/password and via social networks. The widget can be shown fullscreen or as an inline block, and supports OAuth 2.0, custom styling, and event tracking.

It is intended for web developers adding player sign-up and sign-in to a browser-based game or storefront.

## Requirements

- A modern web browser environment (the widget is loaded via a script tag or Bower)
- An [Xsolla Publisher Account](https://publisher.xsolla.com) Login project (provides the Login ID and Callback URL)

## Install

Load the SDK via CDN by adding it to the `<head>` of your page:

```html
<script src="https://cdn.xsolla.net/xsolla-login-widget/sdk/2.2.6/xl.min.js"></script>
```

Or install via [Bower](https://bower.io):

```shell
bower install xsolla-login-js-sdk
```

## Usage

Initialize the widget with your Login ID and callback URL, then show it:

```html
<script type="text/javascript">
  XL.init({
    projectId: '[Login ID]',
    callbackUrl: '[callbackUrl]',
    locale: 'en_US'
  });
</script>

<button onclick="XL.show()">Sign in</button>
```

## Documentation

- Login documentation: [developers.xsolla.com/doc/login](https://developers.xsolla.com/doc/login/)
- Developer portal: [developers.xsolla.com](https://developers.xsolla.com)

## Support

- **GitHub Issues:** [github.com/xsolla/xsolla-login-js-sdk/issues](https://github.com/xsolla/xsolla-login-js-sdk/issues)
- **Developer portal:** [developers.xsolla.com](https://developers.xsolla.com)

## License

Apache License 2.0. See [LICENSE](./LICENSE).
