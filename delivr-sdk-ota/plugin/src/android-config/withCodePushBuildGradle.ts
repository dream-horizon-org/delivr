import type { ConfigPlugin } from "@expo/config-plugins";
import { withAppBuildGradle } from "@expo/config-plugins";
import { mergeContents } from "@expo/config-plugins/build/utils/generateCode";

import { APPLY_FROM, DEPENDENCY } from "../constants";

export const withAppBuildGradleModule: ConfigPlugin = (config) => {
  return withAppBuildGradle(config, (config) => {
    try {
      config.modResults.contents = mergeContents({
        src: config.modResults.contents,
        newSrc: DEPENDENCY,
        tag: "d11-dota-dependency",
        comment: "//",
        anchor: /dependencies\s*{/,
        offset: 1,
      }).contents;

      if (!config.modResults.contents.includes(APPLY_FROM)) {
        config.modResults.contents =
          config.modResults.contents.trimEnd() + `\n\n${APPLY_FROM}\n`;
      }

      return config;
    } catch (error) {
      console.error("Error modifying build.gradle:", error);
      return config;
    }
  });
};
