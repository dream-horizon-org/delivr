import type { ConfigPlugin } from "@expo/config-plugins";
import { withAppDelegate } from "@expo/config-plugins";
import { mergeContents } from "@expo/config-plugins/build/utils/generateCode";

import { IOS_CODEPUSH_IMPORT_SWIFT, IOS_CODEPUSH_IMPORT_OBJC } from "../constants";

export const withCodePushAppDelegate: ConfigPlugin = (config) => {
  return withAppDelegate(config, (config) => {
    try {
      const contents = config.modResults.contents;
      const language =
        (config.modResults as unknown as { language?: string })?.language ??
        "";
      const isObjectiveC =
        language === "objc" ||
        /#import\s+<UIKit\/UIKit\.h>/.test(contents) ||
        /@interface\s+AppDelegate/.test(contents);

      if (isObjectiveC) {
        // Insert Objective-C import
        config.modResults.contents = mergeContents({
          src: config.modResults.contents,
          newSrc: IOS_CODEPUSH_IMPORT_OBJC,
          tag: "codepush-import",
          comment: "//",
          anchor: /#import\s+<React\/RCTBundleURLProvider\.h>/,
          offset: 1,
        }).contents;

        // Replace production bundle URL with CodePush in Obj-C
        const objcBundleUrlPattern =
          /\[\[NSBundle\s+mainBundle\]\s+URLForResource:@"main"\s*,?\s*withExtension:@"jsbundle"\]/;

        if (objcBundleUrlPattern.test(config.modResults.contents)) {
          config.modResults.contents = config.modResults.contents.replace(
            objcBundleUrlPattern,
            "[CodePush bundleURL]"
          );
          console.log(
            "Successfully replaced Bundle URL with [CodePush bundleURL]"
          );
        } else {
          console.error(
            "Could not find NSBundle URL pattern in AppDelegate.m to replace with [CodePush bundleURL]."
          );
        }
      } else {
        // Swift path (default)
        config.modResults.contents = mergeContents({
          src: config.modResults.contents,
          newSrc: IOS_CODEPUSH_IMPORT_SWIFT,
          tag: "codepush-import",
          comment: "//",
          anchor: /import\s+React/,
          offset: 1,
        }).contents;

        const bundleUrlPattern =
          /Bundle\.main\.url\(forResource:\s*"main",\s*withExtension:\s*"jsbundle"\)/;

        if (bundleUrlPattern.test(config.modResults.contents)) {
          config.modResults.contents = config.modResults.contents.replace(
            bundleUrlPattern,
            "CodePush.bundleURL()"
          );
          console.log(
            "Successfully replaced Bundle URL with CodePush.bundleURL()"
          );
        } else {
          console.error(
            "Could not find Bundle.main.url pattern in AppDelegate.swift."
          );
        }
      }

      return config;
    } catch (error) {
      console.error("Error modifying AppDelegate.swift:", error);
      return config;
    }
  });
};
