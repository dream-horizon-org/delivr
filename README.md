# React Native Module for OTA Updates

Instantly deliver JS and asset updates to your React Native apps. Know more about [OTA Updates](docs/ota-updates.md).

## 🚀 Key Features

- **Full and Patch Bundle Updates**: Deliver both full updates and efficient patch updates by sending only the differences.
- **Brotli Compression Support**: Utilize [Brotli compression](https://github.com/ds-horizon/delivr-cli#release-management) to optimize both full and patch bundles for even smaller sizes compared to the default deflate algorithm.
- **Base Bytecode Optimization**: Reduce patch bundle sizes significantly using the [bytecode](#understanding-base-bytecode-optimization) structure of your base bundle.
- **Automated Bundle Handling**: Automatically manage bundles for both Android and iOS, ensuring seamless integration with the DOTA platform.
- **Flexible Configuration**: Leverage CLI capabilities for custom configuration needs. See [Delivr CLI](https://github.com/ds-horizon/delivr-cli) for more details.
- **Architecture Support**: Compatible with both old and new architecture setups.

## 🔧 Getting Started with DOTA

Integrate DOTA into your React Native app seamlessly:

### Installation

Run the following command from your app's root directory:

```shell
# Yarn
yarn add @d11/dota

# NPM
npm install @d11/dota
```

### Setup

Wrap your root component with `codePush` to enable OTA updates:

  ```javascript
  import codePush from "@d11/dota";

function MyApp() {
  // Your app code here
  }

  export default codePush(MyApp);
  ```

Additionally, complete the platform-specific setup to ensure full integration:

- [iOS Setup](docs/setup-ios.md)
- [Android Setup](docs/setup-android.md)

### Default Behavior and Configuration

By default, DOTA checks for updates every time the app starts. Updates download silently and apply on the next restart, ensuring a smooth experience. Mandatory updates install immediately to deliver critical updates promptly.

#### Customize Update Policies

- **Check Frequency**: Configure when to check for updates (e.g., on app start, button press).
  
- **User Notification**: Decide how users will be notified about updates.

For more advanced configurations, consult the [DOTA API reference](docs/api-js.md#dota).

## Creating the JavaScript bundle (Hermes)

### 1. Automated Bundle Generation (Recommended)

This method effortlessly integrates DOTA and Hermes by automatically using the bundle generated during your app's build process.

#### Android Setup

Add to `android/app/build.gradle`. This ensures the bundle is copied to the `.dota/android` directory for processing.

```gradle
apply from: "../../node_modules/@d11/dota/android/codepush.gradle"
```

To disable the default copying of the bundle, add the following in `gradle.properties`:

```
dotaCopyBundle=false
```

#### iOS Setup

In your `Podfile`, add:

```ruby
# Import at the top
require_relative '../node_modules/@d11/dota/ios/scripts/dota_pod_helpers.rb'

# Include in the `post_install` block:
post_install do |installer| 
  dota_post_install(installer, 'YourAppTarget', File.expand_path(__dir__))
end
```

To disable the bundle copy process, set the environment variable in the `.xcode.env` file or directly in the CLI:

```bash
export DOTA_COPY_BUNDLE=false
```

Run:

```bash
cd ios && pod install
```

This ensures the bundle is copied to the `.dota/ios` directory for processing.

### 2. Manual Bundle Generation

Use this method if you need more control over the bundle generation process or need to generate bundles outside of the build process.

```bash
# For Android
yarn dota bundle --platform android

# For iOS
yarn dota bundle --platform ios
```

#### CLI Options

Customize with available options:

```bash
Options:
  --platform <platform>      Specify platform: android or ios (required)
  --bundle-path <path>      Directory to place the bundle in, default is .dota/<platform> (default: ".dota")
  --assets-path <path>      Directory to place assets in, default is .dota/<platform> (default: ".dota")
  --sourcemap-path <path>   Directory to place sourcemaps in, default is .dota/<platform> (default: ".dota")
  --make-sourcemap         Generate sourcemap (default: false)
  --entry-file <file>      Entry file (default: "index.ts")
  --dev <boolean>          Development mode (default: "false")
  --base-bundle-path <path> Path to base bundle for Hermes bytecode optimization
  -h, --help              Display help for command

# Example with options
yarn dota bundle --platform android --bundle-path ./custom-path --make-sourcemap
```

> **Note**: When generating a patch bundle using this script, ensure that the base bundle shipped with the APK is identical to the one generated here. Any discrepancy in flags, especially if additional flags are passed to React Native during bundle generation, may lead to patch application issues. If uncertain, follow the Automated Bundle Generation step to maintain consistency.

## ✨ Base Bytecode Optimization (New Feature)

> Base bytecode optimization is available starting from version 1.2.0.

Significantly reduce patch bundle size using base bytecode optimization. There are two ways to set this up, depending on your bundle generation method. For more details, see [Understanding Base Bytecode Optimization](#understanding-base-bytecode-optimization) below.

### Automated Setup

Ensure your [automated bundle generation](#1-automated-bundle-generation-recommended) is configured, and set up your environment as follows:

- **Android**: Use any of the following methods to specify the base bundle path:
  - Command line option:
    ```bash
    ./gradlew assembleRelease -PdotaBaseBundlePath=/path/to/base/bundle
    ```
  - Environment variable:
    ```bash
    export DOTA_BASE_BUNDLE_PATH=/path/to/base/bundle
    ./gradlew assembleRelease
    ```
  - `gradle.properties` file:
    ```
    dotaBaseBundlePath=/path/to/base/bundle
    ```

- **iOS**: To enable base bytecode optimization, you'll need to modify `node_modules/react-native/scripts/react-native-xcode.sh`. Since React Native doesn’t directly expose this feature, creating a patch is essential for implementing custom changes.

  **Patch Package Setup** (Skip if already installed):

  1. Install [patch-package](https://www.npmjs.com/package/patch-package):

  ```bash
  yarn add patch-package postinstall-postinstall --dev
  ```

  2. Add a postinstall script to ensure patches are applied:

  ```json
  {
    "scripts": {
      "postinstall": "patch-package"
    }
  }
  ```

  **Modify and Create Patch**: Locate `node_modules/react-native/scripts/react-native-xcode.sh` and add support for base bytecode. Insert the following code **before the Hermes CLI execution block**:

  ```bash
  # Inside react-native-xcode.sh

  BASE_BYTECODE_PATH=""
  if [[ ! -z $DOTA_BASE_BUNDLE_PATH ]]; then
    if [[ -f $DOTA_BASE_BUNDLE_PATH ]]; then
      BASE_BYTECODE_PATH="--base-bytecode $DOTA_BASE_BUNDLE_PATH"
      echo "Using --base-bytecode with path: $DOTA_BASE_BUNDLE_PATH"
    else
      echo "Not using --base-bytecode, path: $DOTA_BASE_BUNDLE_PATH, file not found"
      BASE_BYTECODE_PATH=""
    fi
  fi

  "$HERMES_CLI_PATH" -emit-binary -max-diagnostic-width=80 $EXTRA_COMPILER_ARGS -out "$DEST/$BUNDLE_NAME.jsbundle" "$BUNDLE_FILE" $BASE_BYTECODE_PATH
  ```

  Create the patch using:

  ```bash
  yarn patch-package react-native
  ```

  **Environment Configuration**: Configure the base bundle path through an environment variable:

  - In `.xcode.env`:

    ```bash
    export DOTA_BASE_BUNDLE_PATH=/path/to/base.bundle
    ```

  - Or directly within a terminal session:

    ```bash
    export DOTA_BASE_BUNDLE_PATH=/path/to/base.bundle && yarn ios --mode=Release
    ```

### Manual Bundle Generation

When using [manual bundle generation](#2-manual-bundle-generation), configure the CLI with the `--base-bundle-path` option:

```bash
yarn dota bundle --platform android --base-bundle-path .dota/android/index.android.bundle
```

> **Note**: To opt-out of using the base bytecode optimization feature, ensure the DOTA_BASE_BUNDLE_PATH environment variable is not set. You can unset it by executing unset DOTA_BASE_BUNDLE_PATH. Alternatively, during manual bundle generation, simply omit the --base-bundle-path option.


### Understanding Base Bytecode Optimization

Base bytecode optimization enables smaller patch bundles by utilizing the bytecode structure of a previously created base bundle. When you generate updates, this previous bundle acts as a reference, ensuring only changes are transmitted. This method enhances performance, reducing data usage and ensuring faster updates.

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