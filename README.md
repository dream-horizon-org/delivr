# React Native Module for OTA Updates

Instantly deliver JS and asset updates to your React Native apps. Know more about [OTA Updates](docs/ota-updates.md).

## 🚀 Key Features

- **Full and Patch Bundle Updates**: Deliver both full updates and efficient patch updates by sending only the differences.
- **Brotli Compression Support**: Utilize Brotli compression to optimize both full and patch bundles for even smaller sizes compared to the default deflate algorithm.
- **Base Bytecode Optimization**: Reduce patch bundle sizes significantly using the bytecode structure of your base bundle.
- **Automated Bundle Handling**: Automatically manage bundles for both Android and iOS, ensuring seamless integration with the DOTA platform.
- **Flexible Configuration**: Leverage CLI capabilities for custom configuration needs. See [Delivr CLI](https://github.com/ds-horizon/delivr-cli) for more details.
- **Architecture Support**: Compatible with both old and new architecture setups.

## Getting Started with DOTA

Integrate DOTA into your React Native app seamlessly:

### Installation

Run the following command from your app's root directory:

```shell
# Yarn
yarn add @d11/dota

# NPM
npm install @d11/dota
```

### Quick Setup

Wrap your root component with `codePush` to enable OTA updates easily:

```javascript
import codePush from "@d11/dota";

function MyApp() {
  // Your app code here
}

export default codePush(MyApp);
```

### Platform Setup

For platform-specific details:

- [iOS Setup](docs/setup-ios.md)
- [Android Setup](docs/setup-android.md)

### Default Behavior and Configuration

By default, DOTA checks for updates every time the app starts. Updates download silently and apply on the next restart, ensuring a smooth experience. Mandatory updates install immediately to deliver critical updates promptly.

#### Customize Update Policies

- **Check Frequency**: Configure when to check for updates (e.g., on app start, button press).

- **User Notification**: Decide how users will be notified about updates.

For more advanced configurations, consult the [DOTA API reference](docs/api-js.md#dota).

## Creating the JavaScript bundle (Hermes)

There are two ways to generate the Hermes bundle for DOTA:

### 1. Automated Bundle Generation (Recommended)

This method automatically copies the bundle that is generated during your app's build process, streamlining the integration with DOTA and Hermes.

#### For Android:

Add this line to your `android/app/build.gradle`:

```gradle
apply from: "../../node_modules/@d11/dota/android/codepush.gradle"
```

This setup ensures that the bundle is automatically copied to the `.dota/android` directory for further processing.

#### For iOS:

Add following in your `Podfile`:
```ruby
# Import at top
require_relative '../node_modules/@d11/dota/ios/scripts/dota_pod_helpers.rb'

# Include in the `post_install` block:
post_install do |installer|
  dota_post_install(installer, 'YourAppTarget', File.expand_path(__dir__))
end
```

Run:
```bash
cd ios && pod install
```

#### Base Bytecode Optimization (New Feature)

DOTA provides full bundle and patch bundle updates (sending only diffs instead of full bundles). Refer to the [CLI documentation](https://github.com/ds-horizon/delivr-cli#patch-bundle-release) for patch creation and release process.

DOTA's new base bytecode feature allows you to significantly reduce patch bundle size by using the bytecode structure from your base bundle. This requires creating a new full DOTA bundle with the flag: `--base-bytecode path/to/oldBundle`.

We have automated this process, and you only need to set an environment variable, it will be handled internally.

#### For Android

Follow any of the way to set a path to base bundle path. In case of base bundle leave it empty.

- **Command line option:**
  ```bash
  ./gradlew assembleRelease -PdotaBaseBundlePath=/path/to/base/bundle
  ```

- **Environment variable:**
  ```bash
  # Using Gradle build commands
  export DOTA_BASE_BUNDLE_PATH=/path/to/base/bundle
  ./gradlew assembleRelease

  # Using RN CLI
  export DOTA_BASE_BUNDLE_PATH=/path/to/base/bundle && \
  yarn android --mode=Release
  ```

- **gradle.properties file:**
  ```
  dotaBaseBundlePath=/path/to/base/bundle
  ```

#### For iOS

To enable this feature, you need to create and apply a patch for `react-native-xcode.sh` as React Native doesn't directly expose this capability on iOS.

**Create and Apply Patch:**

<details>
<summary>Patch Package Setup (Skip if already installed)</summary>

- **Install [patch-package](https://www.npmjs.com/package/patch-package)**:
  ```bash
  yarn add patch-package postinstall-postinstall --dev
  ```

- **Add postinstall script**:
  ```json
  {
    "scripts": {
      "postinstall": "patch-package"
    }
  }
  ```

</details>

**Modify and Create Patch**:
  Locate `react-native-xcode.sh` in your `node_modules/react-native/scripts`. Edit it to add support for base bytecode:

  ```bash
  # Inside react-native-xcode.sh
  BASE_BYTECODE_PATH=""
  echo "DOTA_BASE_BUNDLE_PATH: $DOTA_BASE_BUNDLE_PATH"
  if [[ ! -z $DOTA_BASE_BUNDLE_PATH ]]; then
    BASE_BYTECODE_PATH="--base-bytecode $DOTA_BASE_BUNDLE_PATH"
  fi

  "$HERMES_CLI_PATH" -emit-binary -max-diagnostic-width=80 $EXTRA_COMPILER_ARGS -out "$DEST/$BUNDLE_NAME.jsbundle" "$BUNDLE_FILE" $BASE_BYTECODE_PATH
  ```

  Create the patch using:
  ```bash
  yarn patch-package react-native
  ```

**Environment Configuration:** Use any of the below step to pass base bundle path.

- **In `.xcode.env`:**
  ```bash
  export DOTA_BASE_BUNDLE_PATH=/path/to/base.bundle
  ```

- **Directly within a terminal session:**
  ```bash
  export DOTA_BASE_BUNDLE_PATH=/path/to/base.bundle && yarn ios --mode=Release
  ```

> Note: For your initial app release (base bundle), you don't need to set any path - the bundle will be automatically generated and copied to .dota/android. When creating CodePush updates later, you should set the path to this base bundle (from .dota/android) to enable the optimization.

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

# Example with base bytecode optimization
yarn dota bundle --platform android --base-bundle-path .dota/android/index.android.bundle

Note: The base bundle path is used for Hermes bytecode optimization. If provided, the bundle will be compiled with the base bundle as reference, which can significantly reduce the size of patch bundles. For more details on creating optimized patches, see the [delivr-cli patch bundle documentation](https://github.com/ds-horizon/delivr-cli#patch-bundle-release).
```

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