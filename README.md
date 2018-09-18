# Xsolla Login Javascript SDK

The library allows you to quickly integrate Xsolla Login Widget with your website.  

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
<script src="https://cdn.xsolla.net/xsolla-login-widget/sdk/1.3.1/xl.min.js"></script>
```

## Step 2

Add the widget initialization code to the `<body>` tag.
```html
<script type="text/javascript">
XL.init({
  projectId: '{your Login projectId}',
  loginUrl: '{your login_url}',
  locale: 'en_US',
  onlyWidgets: true,
  fields: 'email',
  theme: '{your URL with css}'
});
</script>
```
Parameter | Decsription
------------|----
`projectId` | Project ID. **Required**.
`loginUrl` | Callback URL for redirecting after successful authentication.
`locale` | User regional settings.
`onlyWidgets` | Whether the Login Widget UI is used. *true* by default.
`fields` | List of parameters required to complete the registration, separated by commas.
`theme` | URL with the widget styles file. If the value is empty, styles uploaded to Publisher Account are used.

## Step 3

Add the block to contain the widget to the `<body>` tag. Specify the block’s ID in the **element_id** parameter.

``` html
<div id="xl_auth"></div>
<script type="text/javascript">
var element_id = 'xl_auth';
var options = {
  width: '450px',
  height: '650px',
  route: XL.ROUTES.REGISTRATION
};
XL.AuthWidget(element_id, options);
</script>
```
Parameter | Decsription
------------|----
`element_id` | ID of the block containing the Login Widget. **Required**.
`width` | Block width. Default value: `450`.
`height` | Block height. Default value: `550`.
`route` | Widget start page. Can be: `XL.ROUTES.LOGIN`(by default), `XL.ROUTES.REGISTRATION`, `XL.ROUTES.RECOVER_PASSWORD`, `XL.ROUTES.ALL_SOCIALS`.
