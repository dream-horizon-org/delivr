### Swift API Reference (iOS)

The Swift API is available by importing the `CodePush` module into your `AppDelegate.swift` file. It consists of a single public class named `CodePush`.

#### CodePush

This class contains static methods for retrieving the `URL` that represents the most recent JavaScript bundle file. This URL can be passed to the `RCTRootView`'s `initWithBundleURL` method when bootstrapping your app in the `AppDelegate.swift` file.

The `CodePush` class's methods can be thought of as composite resolvers that always load the appropriate bundle to accommodate the following scenarios:

1.  When an end-user installs your app from the store (e.g., version `1.0.0`), they will get the JS bundle that is contained within the binary. This is the behavior you would get without using DOTA, but we make sure it doesn't break :)

2.  As soon as you begin releasing OTA updates, your end-users will receive the JS bundle that represents the latest release for the configured deployment. This allows you to iterate beyond what you shipped to the store.

3.  As soon as you release an update to the app store (like `1.1.0`), and your end-users update it, they will once again get the JS bundle that is contained within the binary. This behavior ensures that OTA updates that targetted a previous binary version aren't used (since we don't know if they would work), and your end-users always have a working version of your app.

4.  Repeat #2 and #3 as the OTA releases and App Store releases continue.

Because of this behavior, you can safely deploy updates to both the App Store and DOTA as needed, confident that your end-users will always get the most recent version.

---

##### Methods

-   **`static func bundleURL() -> URL`** - Returns the most recent JS bundle `URL` as described above. This method assumes that the name of the JS bundle contained within your app binary is `main.jsbundle`.

-   **`static func bundleURL(forResource resourceName: String) -> URL`** - Equivalent to the `bundleURL()` method, but also allows you to customize the name of the JS bundle that is looked for within the app binary. This is useful if you aren't naming this file `main`. This method assumes that the JS bundle's extension is `.jsbundle`.

-   **`static func bundleURL(forResource resourceName: String, withExtension resourceExtension: String) -> URL`** - Equivalent to the `bundleURL(forResource:)` method, but also allows you to customize the extension used by the JS bundle that is looked for within the app binary. This is useful if you aren't naming this file with a `.jsbundle` extension.

-   **`static func overrideAppVersion(_ appVersionOverride: String)`** - Sets the version of the application's binary interface, which would otherwise default to the App Store version specified as `CFBundleShortVersionString` in the `Info.plist`. This should be called a single time before the bundle URL is loaded.

-   **`static func setDeploymentKey(_ deploymentKey: String)`** - Sets the deployment key that the app should use when querying for updates. This is a dynamic alternative to setting the deployment key in your `Info.plist` and/or specifying a deployment key in JS when calling `checkForUpdate` or `sync`.