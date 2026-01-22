## Expo Setup

Add the plugin to your `app.json` or `app.config.js`.
```json
{
  "expo": {
    "plugins": [
      [
        "@d11/dota",
        {
          "serverUrl": "https://your-dota-server.example.com",
          "androidDeploymentKey": "YOUR_ANDROID_DEPLOYMENT_KEY",
          "iosDeploymentKey": "YOUR_IOS_DEPLOYMENT_KEY"
        }
      ]
    ]
  }
}
```

