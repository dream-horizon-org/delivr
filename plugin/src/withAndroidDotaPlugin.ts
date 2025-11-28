import type { ConfigPlugin } from "@expo/config-plugins";

import { withAppBuildGradleModule } from "./android-config/withCodePushBuildGradle";
import { withCodePushMainApplication } from "./android-config/withCodePushMainApplication";
import { withCodePushSettingsGradle } from "./android-config/withCodePushSettingsGradle";
import { withCodePushStrings } from "./android-config/withCodePushStrings";
import type { DotaPluginProps } from "./types";

export const withAndroidDotaPlugin: ConfigPlugin<DotaPluginProps> = (
  config,
  props = {}
) => {
  config = withCodePushStrings(config, props);
  config = withCodePushSettingsGradle(config);
  config = withAppBuildGradleModule(config);
  config = withCodePushMainApplication(config);

  return config;
};