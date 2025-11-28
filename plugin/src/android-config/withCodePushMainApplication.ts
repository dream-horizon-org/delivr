import type { ConfigPlugin } from "@expo/config-plugins";
import { withMainApplication } from "@expo/config-plugins";
import { mergeContents } from "@expo/config-plugins/build/utils/generateCode";

import {
  CODEPUSH_IMPORT,
  JS_BUNDLE_OVERRIDE_KOTLIN,
  JS_BUNDLE_OVERRIDE_JAVA,
  CODEPUSH_PACKAGE_KOTLIN,
  CODEPUSH_PACKAGE_JAVA,
} from "../constants";

export const withCodePushMainApplication: ConfigPlugin = (config) => {
  return withMainApplication(config, (config) => {
    try {
      config.modResults.contents = mergeContents({
        src: config.modResults.contents,
        newSrc: CODEPUSH_IMPORT,
        tag: "d11-dota-import",
        comment: "//",
        anchor: /import\s+com\.facebook\.react\.ReactApplication/,
        offset: 1,
      }).contents;

      const contents = config.modResults.contents;
      const isKotlin =
        (config.modResults as unknown as { language?: string })?.language ===
          "kt" ||
        /class\s+MainApplication\s*:/.test(contents) ||
        /override val isNewArchEnabled: Boolean = BuildConfig\.IS_NEW_ARCHITECTURE_ENABLED/.test(
          contents
        );

      if (isKotlin) {
        config.modResults.contents = mergeContents({
          src: config.modResults.contents,
          newSrc: JS_BUNDLE_OVERRIDE_KOTLIN,
          tag: "d11-dota-js-bundle",
          comment: "//",
          anchor:
            /override val isNewArchEnabled: Boolean = BuildConfig\.IS_NEW_ARCHITECTURE_ENABLED/,
          offset: 1,
        }).contents;

        config.modResults.contents = mergeContents({
          src: config.modResults.contents,
          newSrc: CODEPUSH_PACKAGE_KOTLIN,
          tag: "d11-dota-package",
          comment: "//",
          anchor: /PackageList\(this\)\.packages\.apply \{/,
          offset: 1,
        }).contents;
      } else {
        config.modResults.contents = mergeContents({
          src: config.modResults.contents,
          newSrc: JS_BUNDLE_OVERRIDE_JAVA,
          tag: "d11-dota-js-bundle",
          comment: "//",
          anchor: /new ReactNativeHost\(this\)\s*\{/,
          offset: 1,
        }).contents;

        config.modResults.contents = mergeContents({
          src: config.modResults.contents,
          newSrc: CODEPUSH_PACKAGE_JAVA,
          tag: "d11-dota-package",
          comment: "//",
          anchor:
            /List<ReactPackage>\s+packages\s*=\s*new PackageList\(this\)\.getPackages\(\);/,
          offset: 1,
        }).contents;
      }

      return config;
    } catch (error) {
      console.error("Error modifying MainApplication:", error);
      return config;
    }
  });
};