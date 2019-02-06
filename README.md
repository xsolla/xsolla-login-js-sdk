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
<script src="https://cdn.xsolla.net/xsolla-login-widget/sdk/1.3.2/xl.min.js"></script>
```

## Step 2

Add the widget initialization code to the `<body>` tag.
```html
<script type="text/javascript">
XL.init({
  projectId: '{Login projectId}',
  callbackUrl: '{callbackUrl}',
  locale: 'en_US',
  onlyWidgets: true,
  fields: 'email',
  popupBackgroundColor: 'rgba(50, 150, 150, 0.1)'
});
</script>
```
Parameter | Decsription
------------|----
`projectId` | Login ID from Publisher Account. **Required**.
`callbackUrl` | URL to redirect the user to after authentication. Must be identical to **Callback URL** specified in Publisher Account in Login settings. **Required** if there are several Callback URLs.
`locale` | User regional settings.
`onlyWidgets` | Whether the Login Widget UI is used. *true* by default.
`fields` | List of parameters required to complete the registration, separated by commas.
`theme` | URL with the widget styles file. If the value is empty, styles uploaded to Publisher Account are used.
`popupBackgroundColor` | Color for background of fullscreen popup window

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
Parameter | Decsription
------------|----
`element_id` | ID of the block containing the Login Widget. **Required**.
`options` | Login Widget block settings. The object consists of the parameters listed below.
`width` | Block width in pixels. Default is 400.
`height` | Block height in pixels. Default is 550.
`route` | Widget start page. Can be: `XL.ROUTES.LOGIN`(by default), `XL.ROUTES.REGISTRATION`, `XL.ROUTES.RECOVER_PASSWORD`, `XL.ROUTES.ALL_SOCIALS`.

## Additionally

Add the button with on click event and call **XL.Show()**. Click on this button will open widget in fullscreen popup window. To close it, click on any area around widget.

``` html
<button onclick="XL.show()">Full screen</button>
```