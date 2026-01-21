## OTA Updates

### Problem Statement

Releasing updates for mobile apps is slow and cumbersome. Even small fixes or UI tweaks require pushing a new binary to the App Store or Play Store, followed by lengthy review cycles and user updates.

* Multiple days review cycles on app stores slows your release velocity

* Manual release overhead makes hotfixes painful

* Bug-induced releases damages user experience and retention

* Lost developer velocity due to repeated native builds

### What is DOTA?

DOTA is Delivr’s Over-The-Air (OTA) solution for React Native apps.
It allows you to deliver JavaScript and asset updates instantly — without re-submitting to app stores.

DOTA brings:

* Instant updates: Push JS changes in minutes

* Automatic rollbacks: Stay safe from bad releases

* Staged rollouts: Gradual and controlled deployment

* Enterprise scale: Battle-tested at Dream11

### How does it work?

A React Native app is composed of JavaScript files and any accompanying [images](https://reactnative.dev/docs/image), which are bundled together by the [metro bundler](https://github.com/facebook/metro) and distributed as part of a platform-specific binary (i.e. an `.ipa` or `.apk` file). Once the app is released, updating either the JavaScript code (e.g. making bug fixes, adding new features) or image assets, requires you to recompile and redistribute the entire binary, which of course, includes any review time associated with the store(s) you are publishing to.

DOTA helps get product improvements in front of your end users instantly, by keeping your JavaScript and images synchronized with updates you release to the DOTA server. This way, your app gets the benefits of an offline mobile experience, as well as the "web-like" agility of side-loading updates as soon as they are available. It's a win-win!

In order to ensure that your end users always have a functioning version of your app, the DOTA plugin maintains a copy of the previous update, so that in the event that you accidentally push an update which includes a crash, it can automatically roll back. This way, you can rest assured that your newfound release agility won't result in users becoming blocked before you have a chance to roll back on the server. It's a win-win-win!

*Note: Any product changes which touch native code (e.g. modifying your `AppDelegate.m`/`MainActivity.java` file, adding a new plugin) cannot be distributed via DOTA, and therefore, must be updated via the appropriate store(s).*
