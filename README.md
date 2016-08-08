# Xsolla Login Javascript SDK
A library allows you to quickly integrate Xsolla Login into your project. In order to user library please contact [bizdev@xsolla.com](mailto:bizdev@xsolla.com) 
## Installing

### In the Browser

To use the SDK in the browser, simply add the following script tag to your
HTML pages:

```html
<script src="https://cdn.xsolla.com/js/xl-1.0.min.js"></script>
```
### Using Bower

You can also use [Bower](http://bower.io) to install the SDK by typing the
following into a terminal window:

```sh
bower install xsolla-login-js-sdk
```

## Usage and Getting Started
SDK supports following types of authorization:
* Login/Password
* Social networks:
  * Facebook
  * Google+
  * LinkedIn
  * Twitter
  * VK

### Initializing

Add the following script at the bottom of your login page.
```html
<script type="application/javascript" >
    var options = { 
        projectId: '<project_id>'
    };
    var xl = new XL(options);
</script>
```
The `options` object can has the following properties:


SDK supports two types of integration:
1. Markup integration
1. API call integration

You can mix intefration types within project.
### Markup Integration
You can integrate Xsolla Login simply mark your code html controls with `data-xl-auth=""` attribute so SDK automatically applies appropriate `onclick` handler.
The `data-xl-auth` attribute has the following values:

Attribute Value | Decsription
----------------|---
sn-facebook     | Marks element as [Facebook](https://facebook.com) login button 
sn-google       | Marks element as [Google+](https://plus.google.com) login button 
sn-linkedin     | Marks element as [LinkedIn](https://linkedin.com) login button
sn-twitter      | Marks element as [Twitter](https://twitter.com) login button
sn-vk           | Marks element as [VK](https://vk.com) login button
form-login_pass | Marks form as submit form with user login and password
input-login     | Marks input of login/pass form as containing login
input-pass      | Marks input of login/pass form as containing password

### API call integration

API call intagration provide you with full controll of Xsolla Login authorization.

To perform social network auth call 
```javascript
xl.login({
    authType: 'sn-*'
});
```
on your allready initialized `XL` object, where * is social network name.

Supported names:
* `facebook`
* `google`
* `linkedin`
* `twitter`
* `vk`

This method redirects user to appropriate social network and ended up on you `callback_url`.