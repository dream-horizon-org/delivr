import type { ConfigPlugin } from "@expo/config-plugins";
import { withPodfile } from "@expo/config-plugins";
import { mergeContents } from "@expo/config-plugins/build/utils/generateCode";

import { DOTA_POD_HELPERS_REQUIRE, DOTA_POST_INSTALL_CALL } from "../constants";

export const withCodePushPodfile: ConfigPlugin = (config) => {
  return withPodfile(config, (config) => {
    const projectName = config.modRequest.projectName ?? config.name;
    if (!projectName) return config;

    // Add require_relative at the top (anchor to first require statement)
    try {
      const importResult = mergeContents({
        tag: "dota-pod-helpers",
        src: config.modResults.contents,
        newSrc: DOTA_POD_HELPERS_REQUIRE,
        anchor: /^require /m,
        offset: 0,
        comment: "#",
      });
      config.modResults.contents = importResult.contents;
    } catch (error: unknown) {
      const isNoMatchError = (error as { code?: string })?.code === "ERR_NO_MATCH";
      if (isNoMatchError) {
        config.modResults.contents = `${DOTA_POD_HELPERS_REQUIRE}\n\n${config.modResults.contents}`;
      } else {
        throw error;
      }
    }

    // Add dota_post_install inside post_install block
    try {
      const postInstallResult = mergeContents({
        tag: "dota-post-install",
        src: config.modResults.contents,
        newSrc: `  ${DOTA_POST_INSTALL_CALL(projectName)}`,
        anchor: /post_install\s+do\s+\|installer\|/,
        offset: 1,
        comment: "#",
      });
      config.modResults.contents = postInstallResult.contents;
    } catch (error: unknown) {
      const isNoMatchError = (error as { code?: string })?.code === "ERR_NO_MATCH";
      if (isNoMatchError) {
        const postInstallBlock = `\npost_install do |installer|\n  ${DOTA_POST_INSTALL_CALL(projectName)}\nend\n`;
        config.modResults.contents += postInstallBlock;
      } else {
        throw error;
      }
    }

    return config;
  });
};
