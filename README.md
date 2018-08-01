# Xsolla Login Javascript SDK
The library allows you to quickly integrate Xsolla Login into your project. In order to user library please contact [bizdev@xsolla.com](mailto:bizdev@xsolla.com) 
## Installing

### In the Browser

To use the SDK in the browser, simply add the following script tag to your
HTML pages:

```html
<script src="https://cdn.xsolla.net/xsolla-login-widget/sdk/1.3.0/xl.min.js"></script>
```
### Using Bower

You can also use [Bower](http://bower.io) to install the SDK by typing the
following into a terminal window:

```sh
bower install xsolla-login-js-sdk
```

## Usage and Getting Started
Currently SDK supports following types of authorization:
* via login/password
* via social networks

More methods on its way.
### Initializing

Add the following script at the bottom of your login page.
```html
<script type="application/javascript" >
    var options = { 
        projectId: '<project_id>'
    };
    XL.init(options);
</script>
```
The `options` object can has the following properties:

Option name | Decsription
------------|----
`projectId` _(required)_| Unique identifer of your project
`callbackUrl` | URL where user will be redirected at the end of authoreization cycle. URL can be `localhost` or one of the specified in app settings.
`isMarkupSocialsHandlersEnabled` | Enables markup integration for social networks.


SDK supports two types of integration:
1. Markup integration
1. API call integration

You can mix intefration types within project.

### Authentication widget 
You can add a standard authentication widget using the example below. The layout can be customized using CSS. 
The default block width is 400 px; the height depends on the authentication options.

To add an Xsolla Login widget to your game:
1. Enable js-sdk.js in the `<head>` tag: 
1. Add the initialization code in the `<body>` tag: 

```html
     <script type="text/javascript">
     XL.init({
             projectId: '40db2ea4-5p47-11e6-a3ff-005056a0e04a',
             locale: 'en_US',
             onlyWidgets: true,
             redirectUrl: '<your redirect url>',
             loginUrl: '<your login url>',
             theme: '<your theme url>'
             fields: 'email'
         });
     </script>
     
     <div id="xl_auth"></div>
     <script type="text/javascript">
     var element_id = 'xl_auth';
     var options = {
         width: 200,
         height: 200,
         route: XL.ROUTES.REGISTRATION
     };
     XL.AuthWidget(element_id, options);
     </script>
```
Option name | Decsription
------------|----
`width` | Sets widget container's width in pixels. Default value: `400`
`height` | Sets widget container's height in pixels. Default value: `550`
`widgetBaseUrl` | Sets widget base url. Default value: `https://xl-widget.xsolla.com/`
`route` | Sets route for widget to open. Supports values: `XL.ROUTES.LOGIN`(default), `XL.ROUTES.REGISTRATION`, `XL.ROUTES.RECOVER_PASSWORD`, `XL.ROUTES.ALL_SOCIALS`

### Markup Integration
You can integrate Xsolla Login simply mark your code html controls with `data-xl-auth=""` attribute so SDK automatically applies appropriate `onclick` handler.

Markup integration is currently supported by social networks.


### API Call Integration

API call intagration provide you with full controll of Xsolla Login authorization.

#### Social Networks
To perform social network auth call 
```javascript
XL.login({
    authType: 'sn-*'
});
```
on `XL` object, where * is social network name. For example: `sn-facebook`.


This method redirects user to appropriate social network and ended up on your `callback_url`.

#### Login and Password
To perform login/pass auth call:
```javascript
XL.login({
    authType: 'login-pass',
    login: '<login>',
    pass: '<pass>',
    rememberMe: true
},  function (error) {
    
},  function (success) {
     
});
```
This method method checks user's credentials and redirects to destination page. If success callback is passed you should mannualy finish auth process by calling `success.finish()`. 

You should pass an object with following keys:

Field name | Value
-----------|------
authType   | login-pass
login      | user's login
pass       | user's password
rememberMe | Whether browser should remember this user's auth

### Events

* **load** — Event after widget was loaded
* **close** — Event after close button was clicked (by default widget will be closed, but if you pass your own function you should close it yourself)

You can access list of event using XL.eventTypes object.

#### Example

``` javascript
XL.on(XL.eventTypes.LOAD, function () {
    console.log('loaded');
});
```


