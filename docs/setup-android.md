## Android Setup

In order to integrate CodePush into your Android project, please perform the following steps:

### Plugin Installation and Configuration for React Native 0.60 version and above (Android)

1. In your `android/settings.gradle` file, make the following additions at the end of the file:

    ```gradle
    ...
    include ':app', ':d11_dota'
    project(':d11_dota').projectDir = new File(rootProject.projectDir, '../node_modules/@d11/dota/android/app')
    ```
    
2. In your `android/app/build.gradle` file, add the `codepush.gradle` file as an additional build task definition to the end of the file:

    ```gradle
    ...
    apply from: "../../node_modules/@d11/dota/android/codepush.gradle"
    ...
    ```

3. Update the `MainApplication` file to use CodePush via the following changes:

    For React Native 0.73 and above: update the `MainApplication.kt`

    ```kotlin
    ...
    // 1. Import the plugin class.
    import com.microsoft.codepush.react.CodePush

    class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            ...
            // 2. Add Codepush package for manual linking
              add(CodePush(
                resources.getString(R.string.CodePushDeploymentKey),
                applicationContext,
                BuildConfig.DEBUG,
                resources.getString(R.string.CodePushServerUrl)
              ))
            // 3. Override the getJSBundleFile method in order to let
            // the CodePush runtime determine where to get the JS
            // bundle location from on each app start
            override fun getJSBundleFile(): String {
                return CodePush.getJSBundleFile() 
            }
        };
    }
    ```

    For React Native 0.72 and below: update the `MainApplication.java`

    ```java
    ...
    // 1. Import the plugin class.
    import com.microsoft.codepush.react.CodePush;

    public class MainApplication extends Application implements ReactApplication {

        private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
            ...
            // 2. Add Codepush package for manual linking
            packages.add(new CodePush(
                getResources().getString(R.string.CodePushDeploymentKey),
                getApplicationContext(),
                BuildConfig.DEBUG,
                getResources().getString(R.string.CodePushServerUrl)
            ));
            // 3. Override the getJSBundleFile method in order to let
            // the CodePush runtime determine where to get the JS
            // bundle location from on each app start
            @Override
            protected String getJSBundleFile() {
                return CodePush.getJSBundleFile();
            }
        };
    }
    ```

4. Add the Deployment key and server url to `strings.xml`:

   To let the CodePush runtime know which deployment it should query for updates, open your app's `strings.xml` file and add a new string named `CodePushDeploymentKey`, whose value is the key of the deployment you want to configure this app against (like the key for the `Staging` deployment for the `FooBar` app). You can retrieve this value using DOTA dashboard and copying the value of the `Key` column which corresponds to the deployment you want to use.

   In order to effectively make use of the `Staging` and `Production` deployments that were created along with your CodePush app, refer to the [multi-deployment testing](../README.md#multi-deployment-testing) docs below before actually moving your app's usage of CodePush into production.

   Your `strings.xml` should looks like this:

   ```xml
    <resources>
        <string name="app_name">AppName</string>
        <string moduleConfig="true" name="CodePushDeploymentKey">DeploymentKey</string>
        <string moduleConfig="true" name="CodePushServerUrl">Server-Url</string>
    </resources>
    ```

    *Note: If you need to dynamically use a different deployment, you can also override your deployment key in JS code using [Code-Push options](./api-js.md#CodePushOptions)*

For Plugin usage refer to [Plugin Usage](README.md)