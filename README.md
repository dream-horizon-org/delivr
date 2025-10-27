# React Native Module for OTA Updates

Instantly deliver JS and asset updates to your React Native apps. Know more about [OTA Updates](docs/ota-updates.md)
<!-- React Native Catalog -->

* [Getting Started](#getting-started)
* [Usage](#usage)
* [Creating the JavaScript bundle](#creating-the-javascript-bundle-hermes)
* [Releasing Updates](#releasing-updates)
* [Debugging](#debugging)
* [Advanced Topics](#advanced-topics)
* [API Reference](#api-reference)

<!-- React Native Catalog -->

## Getting Started

You can add [DOTA](docs/ota-updates.md) to your React Native app by running the following command from within your app's root directory:

* Yarn
```shell
yarn add @d11/dota
```
* NPM
```shell
npm install @d11/dota
```

As with all other React Native plugins, the integration experience is different for iOS and Android, so perform the following setup steps depending on which platform(s) you are targeting. Note, if you are targeting both platforms it is recommended to create separate DOTA applications for each platform through DOTA dashboard.

Then continue with installing the native module
  * [iOS Setup](docs/setup-ios.md)
  * [Android Setup](docs/setup-android.md)

## Usage

The only thing left is to add the necessary code to your app to control the following policies:

1. When (and how often) to check for an update? (for example app start, in response to clicking a button in a settings page, periodically at some fixed interval)

2. When an update is available, how to present it to the end user?

The simplest way to get started:

* Wrap your root component with the `codePush`:

  ```javascript
  import codePush from "@d11/dota";

  function MyApp () {
    ...
  }

  export default codePush(MyApp);
  ```

By default, DOTA will check for updates on every app start. If an update is available, it will be silently downloaded, and installed the next time the app is restarted (either explicitly by the end user or by the OS), which ensures the least invasive experience for your end users. If an available update is mandatory, then it will be installed immediately, ensuring that the end user gets it as soon as possible.

If you would like your app to discover updates more quickly, you can refer to the [DOTA API reference](docs/api-js.md#dota) 

## Creating the JavaScript bundle (Hermes)

There are two ways to generate the JavaScript bundle for DOTA:

### 1. Automated Bundle Generation (Recommended)

This method automatically copies the bundle that is generated during your app's build process.

#### For Android:

Add this line to your `android/app/build.gradle`:

```gradle
apply from: "../../node_modules/@d11/dota/android/codepush.gradle"
```

#### For iOS:

1. Add this line at the top of your `Podfile`:
```ruby
require_relative '../node_modules/@d11/dota/ios/scripts/dota_pod_helpers.rb'
```
Note: Make sure that it correctly points to node_modules path.

2. In the `post_install` block of your `Podfile`, add:
```ruby
post_install do |installer| 
  
  # Add the Dota post install script
  # Replace with your app's target name
  dota_post_install(installer, <target>, File.expand_path(__dir__))
end
```

3. Run pod install:
```bash
cd ios && pod install
```

This will add a new build phase named "[Dota] Copy DOTA Bundle" that automatically handles bundle generation and copying. The bundles and assets will be generated in `.dota/<platform>` directory at your project root.

### 2. Manual Bundle Generation (Using CLI Tool)

Use this method if you need more control over the bundle generation process or need to generate bundles outside of the build process.

```bash
# For Android
yarn dota bundle --platform android

# For iOS
yarn dota bundle --platform ios
```

#### Available Options

The CLI supports the following options:

```bash
Options:
  --platform <platform>      Specify platform: android or ios (required)
  --bundle-path <path>      Directory to place the bundle in (default: ".dota")
  --assets-path <path>      Directory to place assets in (default: ".dota")
  --sourcemap-path <path>   Directory to place sourcemaps in (default: ".dota")
  --make-sourcemap         Generate sourcemap (default: false)
  --entry-file <file>      Entry file (default: "index.ts")
  --dev <boolean>          Development mode (default: "false")
  -h, --help              Display help for command

# Example with options
yarn dota bundle --platform android --bundle-path ./custom-path --make-sourcemap
```

#### Output Files

By default, the CLI will generate:
- For Android:
  - `.dota/index.android.bundle` - The optimized Hermes bundle
  - `.dota/` - Directory containing any assets
  - `.dota/index.android.bundle.json` - Sourcemap file (if --make-sourcemap is enabled)

- For iOS:
  - `.dota/main.jsbundle` - The optimized Hermes bundle
  - `.dota/` - Directory containing any assets
  - `.dota/main.jsbundle.json` - Sourcemap file (if --make-sourcemap is enabled)

## Releasing Updates

Once your app is configured and distributed to your users, and you have made some JS or asset changes, it's time to release them.

Before you start, generate your JS bundle and assets. See [Creating the JavaScript bundle](#creating-the-javascript-bundle-hermes).

There are two ways to release OTA updates:

### 1. [Using CLI](https://github.com/ds-horizon/delivr-cli?tab=readme-ov-file#release-management)
- Ideal for local workflows and CI/CD pipelines
- Supports [patch bundle release](https://github.com/ds-horizon/delivr-cli?tab=readme-ov-file#patch-bundle-release)
- You can release, promote across deployments, and manage rollout percentages using CLI

### 2. [Using Web Panel](https://github.com/ds-horizon/delivr-web-panel)
- Use the web UI to upload bundles, configure rollout percentage, and publish
- You can monitor, pause/resume, or adjust rollout directly from the panel.

If you run into any issues, check out the [troubleshooting](#debugging) details below.

*NOTE: DOTA updates should be tested in modes other than Debug mode. In Debug mode, React Native app always downloads JS bundle generated by packager, so JS bundle downloaded by DOTA does not apply.*

### Debugging

The `sync` method includes a lot of diagnostic logging out-of-the-box, so if you're encountering an issue when 
using it, the best thing to try first is examining the output logs of your app. This will tell you whether the 
app is configured correctly (like can the plugin find your deployment key?), if the app is able to reach the 
server, if an available update is being discovered, if the update is being successfully downloaded/installed, etc.

Key statuses to watch:
- CHECKING_FOR_UPDATE → Confirms server reachability/config.
- UPDATE_AVAILABLE → Ensure deployment key and target app version are correct.
- DOWNLOADING_PACKAGE → If stuck, check network/connectivity and server availability.
- INSTALLING_UPDATE → Short stage; if it never occurs, re-check disk space/permissions.
- UPDATE_INSTALLED → Shown immediately or on next restart/resume per your `installMode`.
- UP_TO_DATE / UNKNOWN_ERROR → Log details and verify configuration.

See [Sync API](docs/api-js.md#codepushsync) and [SyncOptions](docs/api-js.md#syncoptions) for details.

### Advanced Topics
- [Store Guideline Compliance](docs/store-guidelines.md)
- [Multi-Deployment Testing](docs/multi-deployment-testing.md)
- [Dynamic Deployment Assignment](docs/dynamic-deployment-assignment.md)
- [Supported Components](docs/supported-components.md)

## API Reference

* [JavaScript API](docs/api-js.md)
* [Objective-C API Reference (iOS)](docs/api-ios.md)
* [Swift API Reference (iOS)](docs/api-ios-swift.md)
* [Java API Reference (Android)](docs/api-android.md)


## Contributing

We welcome contributions to improve FastImage! Please check out our [contributing guide](CONTRIBUTING.md) for guidelines on how to proceed.

## Credits

This is a fork of [react-native-code-push](https://github.com/microsoft/react-native-code-push). All credit goes to the original author.