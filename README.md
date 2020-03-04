
# Xsolla Login Javascript SDK

Currently SDK supports following types of authorization:
* via login/password
* via social networks

On this page you can see:
<!-- TOC depthFrom:1 depthTo:6 withLinks:1 updateOnSave:1 orderedList:0 -->

- [Integrating of the Widget](#integrating-of-the-widget)
	- [Step 1: Connecting SDK](#step-1-connecting-sdk)
	- [Step 2: Initializing Widget](#step-2-initializing-widget)
	- [Step 3: Choosing the Widget Placing](#step-3-choosing-the-widget-placing)
		- [Fullscreen Mode](#fullscreen-mode)
		- [Block on the Page](#block-on-the-page)
- [Usage](#usage)
	- [Customizing Widget Style](#customizing-widget-style)
	- [Tracking Widget Events](#tracking-widget-events)
		- [Loading Widget](#loading-widget)
		- [Closing Widget](#closing-widget)
		- [Sending the Registration Confirmation Email](#sending-the-registration-confirmation-email)

<!-- /TOC -->

See [documentation](https://developers.xsolla.com/doc/login/) to find more.

## Integrating of the Widget

This library allows you to quickly integrate Xsolla Login Widget with your website in following steps:
* [Connecting SDK](#step-1-connecting-sdk)
* [Initializing Widget](#step-2-initializing-widget)
* [Choosing the Widget Placing](#step-3-choosing-the-widget-placing)

### Step 1: Connecting SDK

Connect Xsolla Login Javascript SDK using one of the following methods:
* If the project uses [Bower](http://bower.io), launch the console and run
```shell script
bower install xsolla-login-js-sdk
```
* If the package is not connected, add the following code to the `<head>` tag of the HTML-page where the widget will be placed:
```html
<script src="https://cdn.xsolla.net/xsolla-login-widget/sdk/2.2.5/xl.min.js"></script>
```

### Step 2: Initializing Widget

Add the widget initialization code to the `<body>` tag.
```html
<script type="text/javascript">
XL.init({
  projectId: '[Login ID]',
  callbackUrl: '[callbackUrl]',
  locale: 'en_US'
});
</script>
```

--------------------------------------------------------------------------------

  **projectId**  
  &nbsp;&nbsp;&nbsp;&nbsp; `string`  
  Login ID from Publisher Account. **Required**.  

 ------------------------------------------------------------------
  **callbackUrl**  
  &nbsp;&nbsp;&nbsp;&nbsp; `string`  
  URL to redirect the user to after registration/authentication/password reset. Must be identical to one of the **Callback URL** specified in Publisher Account in Login settings. **Required** if there are several Callback URLs.

  You can pass several URL of the local server to make the widget available to the local build. For example `https://localhost:9000`.

 ------------------------------------------------------------------
  **locale**  
  &nbsp;&nbsp;&nbsp;&nbsp; `string`  
  Region in the `<language code>_<country code>` format, where:
  * *language code*: language code in the [ISO 639-1](https://en.wikipedia.org/wiki/ISO_639-1) format;
  * *country code*: country/region code in the [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) format.

  The language of the widget interface. Also used for sorting social networks by the frequency of use in the chosen region.

 ------------------------------------------------------------------
  **fields**  
  &nbsp;&nbsp;&nbsp;&nbsp; `array of strings`  
  List of parameters required for successful user registration/authentication. Example: '**email, promo_email_agreement**'. The user will be asked to specify these parameters in the corresponding form.

 ------------------------------------------------------------------
  **theme**  
  &nbsp;&nbsp;&nbsp;&nbsp; `string`  
  URL with the widget styles file. If the value is empty, styles uploaded to Publisher Account are used.  

 ------------------------------------------------------------------
  **popupBackgroundColor**  
  &nbsp;&nbsp;&nbsp;&nbsp; `string`  
  Widget background color in the **fullscreen** mode. The value can be in any of the CSS color formats. Default is rgba(50, 150, 150, 0.1).

 ------------------------------------------------------------------
  **iframeZIndex**  
  &nbsp;&nbsp;&nbsp;&nbsp; `string`  
  The stack order of the widget in the **fullscreen** mode. Default is 1000000.  

--------------------------------------------------------------------------------  

### Step 3: Choosing the Widget Placing

Choose the widget placing on the website start page:
* [Fullscreen Mode](#fullscreen-mode)
* [Block on the Page](#block-on-the-page)

#### Fullscreen Mode

Add the button with the `on-click` event and the `XL.show()` function to the site.
```html
<button onclick="XL.show()">Fullscreen widget</button>
```

The fullscreen mode is closed by clicking outside the widget area.

#### Block on the Page

Add the block with the widget to the `<body>` tag and set the block ID.
```html
<div id="xl_auth"></div>
```

Add the code and pass the parameter values as described below.
```html
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

 --------------------------------------------------------------------------------

   **element_id**  
   &nbsp;&nbsp;&nbsp;&nbsp; `string`  
   ID of the block containing the Login Widget. **Required**.  

  ------------------------------------------------------------------
   **options**  
   &nbsp;&nbsp;&nbsp;&nbsp; `object`  
   Login Widget block settings. The object consists of the parameters listed below.

  ------------------------------------------------------------------
   **width**  
   &nbsp;&nbsp;&nbsp;&nbsp; `number`  
   Block width in pixels. Default is 400.

  ------------------------------------------------------------------
   **height**  
   &nbsp;&nbsp;&nbsp;&nbsp; `number`  
   Block height in pixels. Default is 550.

  ------------------------------------------------------------------
   **route**  
   &nbsp;&nbsp;&nbsp;&nbsp; `string`  
   Widget start page. Can be:
   * `XL.ROUTES.LOGIN` — a login page via username/password. Used by default.
   * `XL.ROUTES.REGISTRATION` — a registration page.
   * `XL.ROUTES.RECOVER_PASSWORD` — a password reset page.
   * `XL.ROUTES.ALL_SOCIALS` — a page with a list of social networks available for user authentication.

 --------------------------------------------------------------------------------  

## Usage

If you have already integrated Login, you can also try additional features of Xsolla Login Widget:
* [Customizing Widget Style](#customizing-widget-style)
* [Tracking Widget Events](#tracking-widget-events)

### Customizing Widget Style

By default, the widget looks like this:  
<img src="https://cdn3.xsolla.com/img/misc/images/08ef59d6c3bf6b3c133854cc579423fd.png" width="75%" title="Widget by default">

You can customize the widget style by changing the following characteristics of its elements:
* Location on the screen
* Theme
* Size
* Background  

Customization is based on [CSS](https://en.wikipedia.org/wiki/Cascading_Style_Sheets).

To customize:
1. Go to [Publisher Account](https://publisher.xsolla.com/) > your Login project > **Customization** > **Widget style**, download the archive with styles and unpack it.
2. Download and install [Node.js](https://nodejs.org/en/). The version of Node.js must not be later than 10.x.x.
3. Run `npm i` from the unpacked styles folder.
4. Edit *app/styles/themes/\_default.scss*.
5. Run `npm run styles` from the unpacked styles folder.
6. Upload the file with a name resembling *app.default.css* from the **dist** folder to your Publisher Account.  

For further widget UI customization, repeat steps 4–6.

---
**NOTE**

After publication, the widget will be changed for all the projects it was connected to.

---  

### Tracking Widget Events

You can collect widget statistics on the following events:
* [Loading Widget](#loading-widget)
* [Closing Widget](#closing-widget)
* [Sending the Registration Confirmation Email](#sending-the-registration-confirmation-email)

To start tracking the event, initialize and process the action as described below.

#### Loading Widget

```js
XL.on(XL.eventTypes.LOAD, function () {
    console.log('the widget has been loaded');
});
```

#### Closing Widget

```js
XL.on(XL.eventTypes.CLOSE, function () {
    console.log('user has closed the widget');
});
```

#### Sending the Registration Confirmation Email

```js
XL.on(XL.eventTypes.REGISTRATION_REQUEST, function () {
    console.log('registration form has been sent');
});
```