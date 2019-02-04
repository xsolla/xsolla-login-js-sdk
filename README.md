See [documentation](https://developers.xsolla.com/doc/login/) for full Xsolla Login Widget integration.

This library allows you to quickly integrate Xsolla Login Widget with your website.

Currently SDK supports following types of authorization:
* via login/password
* via social networks

More methods on its way.

## Step 1

Connect Xsolla Login Javascript SDK:
* If your project uses [Bower](http://bower.io), launch the console and run the following command:
```
bower install xsolla-login-js-sdk
```
* If you don’t have the package installed, add the following code to the `<head>` tag of the web page where you want to place the widget: 
```
<script src="https://cdn.xsolla.net/xsolla-login-widget/sdk/1.4.0/xl.min.js"></script>
```

## Step 2

Add the widget initialization code to the `<body>` tag.
```html
<script type="text/javascript">
XL.init({
  projectId: '{Login projectId}',
  callbackUrl: '{callbackUrl}',
  locale: 'en_US',
  fields: 'email'
});
</script>
```
Parameter | Description
------------|----
`projectId` | Login ID from Publisher Account. **Required**.
`callbackUrl` | URL to redirect the user to after authentication. Must be identical to **Callback URL** specified in Publisher Account in Login settings. **Required** if there are several Callback URLs.
`locale` | User regional settings.
`fields` | List of parameters required to complete the registration, separated by commas.
`theme` | URL with the widget styles file. If the value is empty, styles uploaded to Publisher Account are used.
`popupBackgroundColor` | Background color in the fullscreen mode. The value can be in any of the CSS color formats. Default is 'rgba(50, 150, 150, 0.1)'.
`iframeZIndex` | Specifies the stack order of the widget. Default is '1000000'.

## Step 3

Add the block to contain the widget to the `<body>` tag. Specify the block’s ID in the **element_id** parameter.

``` html
<div id="xl_auth"></div>
<script type="text/javascript">
var element_id = 'xl_auth';
var options = {
  width: 400,
  height: 550,
  route: XL.ROUTES.REGISTRATION
};
XL.AuthWidget(element_id, options);
</script>
```
Parameter | Description
------------|----
`element_id` | ID of the block containing the Login Widget. **Required**.
`options` | Login Widget block settings. The object consists of the parameters listed below.
`width` | Block width in pixels. Default is 400.
`height` | Block height in pixels. Default is 550.
`route` | Widget start page. Can be: `XL.ROUTES.LOGIN`(by default), `XL.ROUTES.REGISTRATION`, `XL.ROUTES.RECOVER_PASSWORD`, `XL.ROUTES.ALL_SOCIALS`.

## Fullscreen mode

To open the widget in the fullscreen mode, add the button with an on-click event to your website and call the **XL.Show()** function. The fullscreen mode is closed by clicking outside of the widget.

``` html
<button onclick="XL.show()">Fullscreen widget</button>
```
