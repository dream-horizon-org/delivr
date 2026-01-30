import type { ConfigPlugin } from "@expo/config-plugins";
import { withPodfile } from "@expo/config-plugins";
import { mergeContents } from "@expo/config-plugins/build/utils/generateCode";

import {
  DOTA_POD_HELPERS_REQUIRE,
  DOTA_POST_INSTALL_CALL,
  PODFILE_MERGE_TAGS,
  PODFILE_ANCHOR_PATTERNS,
  PODFILE_OFFSETS,
  PODFILE_COMMENT,
  ERROR_MESSAGES,
} from "../constants";

type PodfileModifier = Parameters<typeof withPodfile>[1];

const modifyPodfile: PodfileModifier = (config) => {
  const projectName = config.modRequest.projectName;
  if (!projectName) return config;

  // Add require_relative at the top (anchor to first require statement)
  try {
    const importResult = mergeContents({
      tag: PODFILE_MERGE_TAGS.POD_HELPERS,
      src: config.modResults.contents,
      newSrc: DOTA_POD_HELPERS_REQUIRE,
      anchor: PODFILE_ANCHOR_PATTERNS.REQUIRE_STATEMENT,
      offset: PODFILE_OFFSETS.REQUIRE_ANCHOR,
      comment: PODFILE_COMMENT,
    });
    config.modResults.contents = importResult.contents;
  } catch (error: unknown) {
    console.error(ERROR_MESSAGES.MODIFYING_PODFILE, error);
    return config;
  }

  // Add dota_post_install inside post_install block
  try {
    const postInstallResult = mergeContents({
      tag: PODFILE_MERGE_TAGS.POST_INSTALL,
      src: config.modResults.contents,
      newSrc: `  ${DOTA_POST_INSTALL_CALL(projectName)}`,
      anchor: PODFILE_ANCHOR_PATTERNS.MAC_CATALYST_ENABLED,
      offset: PODFILE_OFFSETS.POST_INSTALL_ANCHOR,
      comment: PODFILE_COMMENT,
    });
    config.modResults.contents = postInstallResult.contents;
  } catch (error: unknown) {
    console.error(ERROR_MESSAGES.MODIFYING_PODFILE, error);
    return config;
  }

  return config;
};

export const withCodePushPodfile: ConfigPlugin = (config) => {
  return withPodfile(config, modifyPodfile);
};
