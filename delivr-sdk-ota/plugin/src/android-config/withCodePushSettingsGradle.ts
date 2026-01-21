import type { ConfigPlugin } from "@expo/config-plugins";
import { withSettingsGradle } from "@expo/config-plugins";

import { applySettings } from "./utils";

export const withCodePushSettingsGradle: ConfigPlugin = (config) => {
  return withSettingsGradle(config, (config) => {
    try {
      config.modResults.contents = applySettings(config.modResults.contents);
      return config;
    } catch (error) {
      console.error("Error modifying settings.gradle:", error);
      return config;
    }
  });
};
