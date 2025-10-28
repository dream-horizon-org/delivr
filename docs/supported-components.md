## Supported Components

When using the React Native assets system (i.e. using the `require("./foo.png")` syntax), the following list represents the set of core components (and props) that support having their referenced images and videos updated via DOTA:

| Component                                       | Prop(s)                                  |
|-------------------------------------------------|------------------------------------------|
| `Image`                                         | `source`                                 |
| `MapView.Marker` <br />*(Requires [react-native-maps](https://github.com/lelandrichardson/react-native-maps) `>=O.3.2`)* | `image`                             |
| `ProgressViewIOS`                               | `progressImage`, `trackImage`            |
| `TabBarIOS.Item`                                | `icon`, `selectedIcon`                   |
| `ToolbarAndroid` <br />*(React Native 0.21.0+)* | `actions[].icon`, `logo`, `overflowIcon` |
| `Video`                                         | `source`                                 |

The following list represents the set of components (and props) that don't currently support their assets being updated via DOTA, due to their dependency on static images and videos (i.e. using the `{ uri: "foo" }` syntax):

| Component   | Prop(s)                                                              |
|-------------|----------------------------------------------------------------------|
| `SliderIOS` | `maximumTrackImage`, `minimumTrackImage`, `thumbImage`, `trackImage` |
| `Video`     | `source`                                                             |

As new core components are released, which support referencing assets, we'll update this list to ensure users know what exactly they can expect to update using DOTA.

*Note: DOTA only works with Video components when using `require` in the source prop. For example:*

```javascript
<Video source={require("./foo.mp4")} />
```