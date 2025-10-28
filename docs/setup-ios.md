## iOS Setup

Once you've acquired the DOTA plugin, you need to integrate it into the Xcode project of your React Native app and configure it correctly. To do this, take the following steps:

<details>
<summary>Objective-C</summary>

1. Run `cd ios && pod install && cd ..` to install all the necessary CocoaPods dependencies.
​
2. Open up the `AppDelegate.m` file, and add an import statement for the DOTA headers:

   ```objective-c
   #import <CodePush/CodePush.h>
   ```

3. Find the following line of code, which sets the source URL for bridge for production releases:

   ```objective-c
   return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
   ```

4. Replace it with this line:
   
   ```objective-c
   return [CodePush bundleURL];
   ```
    This change configures your app to always load the most recent version of your app's JS bundle. On the first launch, this will correspond to the file that was compiled with the app. However, after an update has been pushed via DOTA, this will return the location of the most recently installed update.

   *NOTE: The `bundleURL` method assumes your app's JS bundle is named `main.jsbundle`. If you have configured your app to use a different file name, simply call the `bundleURLForResource:` method (which assumes you're using the `.jsbundle` extension) or `bundleURLForResource:withExtension:` method instead, in order to overwrite that default behavior*

   Typically, you're only going to want to use DOTA to resolve your JS bundle location within release builds, and therefore, we recommend using the `DEBUG` pre-processor macro to dynamically switch between using the packager server and DOTA, depending on whether you are debugging or not. This will make it much simpler to ensure you get the right behavior you want in production, while still being able to use the Chrome Dev Tools, live reload, etc. at debug-time.

   Your `sourceURLForBridge` method should look like this:

   ```objective-c
   - (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
   {
     #if DEBUG
       return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
     #else
       return [CodePush bundleURL];
     #endif
   }
   ```

5. Add the Deployment key and DOTA server url to `Info.plist`:

   To let the DOTA runtime know which deployment it should query for updates against, open your app's `Info.plist` file and add a new entry named `CodePushDeploymentKey`, whose value is the key of the deployment you want to configure this app against (like the key for the `Staging` deployment for the `FooBar` app). You can retrieve this value using DOTA dashboard and copying the value of the `Key` column which corresponds to the deployment you want to use.

   In `Info.plist` file, add following lines, replacing server-url with your server and deployment-key with your key.
   ```
   <key>CodePushServerURL</key>
   <string>server-url</string>
   <key>CodePushDeploymentKey</key>
   <string>deployment-key</string>
    ```

   In order to effectively make use of the `Staging` and `Production` deployments that were created along with your DOTA app, refer to the [multi-deployment testing](./multi-deployment-testing.md) docs below before actually moving your app's usage of DOTA into production.

   *Note: If you need to dynamically use a different deployment, you can also override your deployment key in JS code using [Code-Push options](./api-js.md#CodePushOptions)*

6. For react-native changes refer to [Usage](../README.md#usage)
</details>

<details>
<summary>Swift</summary>

1. Run `cd ios && pod install && cd ..` to install all the necessary CocoaPods dependencies.
​
2. Open up the `AppDelegate.swift` file, and add an import statement for the CodePush headers:

   ```swift
   import CodePush
   ```

3. Find the following line of code, which sets the source URL for bridge for production releases:

   ```swift
   Bundle.main.url(forResource: "main", withExtension: "jsbundle")
   ```

4. Replace it with this line:
   
   ```swift
   return CodePush.bundleURL()
   ```
    This change configures your app to always load the most recent version of your app's JS bundle. On the first launch, this will correspond to the file that was compiled with the app. However, after an update has been pushed via DOTA, this will return the location of the most recently installed update.

   *NOTE: The `bundleURL` method assumes your app's JS bundle is named `main.jsbundle`. If you have configured your app to use a different file name, simply call the `bundleURLForResource:` method (which assumes you're using the `.jsbundle` extension) or `bundleURLForResource:withExtension:` method instead, in order to overwrite that default behavior*

   Typically, you're only going to want to use DOTA to resolve your JS bundle location within release builds, and therefore, we recommend using the `DEBUG` pre-processor macro to dynamically switch between using the packager server and DOTA, depending on whether you are debugging or not. This will make it much simpler to ensure you get the right behavior you want in production, while still being able to use the Chrome Dev Tools, live reload, etc. at debug-time.

   Your `bundleURL` method should look like this:

   ```swift
   override func bundleURL() -> URL! {
     #if DEBUG
       return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
     #else
       // Default behavior assumes "main.jsbundle"
       return CodePush.bundleURL()
       // If you embedded a differently named file:
       // return CodePush.bundleURL(forResource: "mybundle")                       // mybundle.jsbundle
       // return CodePush.bundleURL(forResource: "mybundle", withExtension: "jsbundle")
     #endif
   }
   ```

5. Add the Deployment key and DOTA server url to `Info.plist`:

   To let the DOTA runtime know which deployment it should query for updates against, open your app's `Info.plist` file and add a new entry named `CodePushDeploymentKey`, whose value is the key of the deployment you want to configure this app against (like the key for the `Staging` deployment for the `FooBar` app). You can retrieve this value using DOTA dashboard and copying the value of the `Key` column which corresponds to the deployment you want to use.

   In `Info.plist` file, add following lines, replacing server-url with your server and deployment-key with your key.
   ```
   <key>CodePushServerURL</key>
   <string>https://dota-sdk.delivr.live/</string>
   <key>CodePushDeploymentKey</key>
   <string>deployment-key</string>
    ```

   In order to effectively make use of the `Staging` and `Production` deployments that were created along with your DOTA app, refer to the [multi-deployment testing](./multi-deployment-testing.md) docs below before actually moving your app's usage of DOTA into production.

   *Note: If you need to dynamically use a different deployment, you can also override your deployment key in JS code using [Code-Push options](./api-js.md#CodePushOptions)*

6. For react-native changes refer to [Usage](../README.md#usage)
</details>

