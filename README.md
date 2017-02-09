# Xsolla Login Javascript SDK
The library allows you to quickly integrate Xsolla Login into your project. In order to user library please contact [bizdev@xsolla.com](mailto:bizdev@xsolla.com) 
## Installing

### In the Browser

To use the SDK in the browser, simply add the following script tag to your
HTML pages:

```html
<script src="https://static.xsolla.com/xsolla-login/1.1.0/xl.min.js"></script>
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


