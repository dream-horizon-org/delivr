export const CODE_PUSH_DEPLOYMENT_KEY = "CodePushDeploymentKey";

export const CODE_PUSH_SERVER_URL = "CodePushServerUrl";

export const MODULE_NAME = ":d11_dota";

export const PACKAGE_PATH = "@d11/dota/android/app";

const CODEPUSH_GRADLE_PATH =
  "../../node_modules/@d11/dota/android/codepush.gradle";

export const DEPENDENCY = `    implementation project('${MODULE_NAME}')`;

export const APPLY_FROM = `apply from: "${CODEPUSH_GRADLE_PATH}"`;

export const CODEPUSH_IMPORT = `import com.microsoft.codepush.react.CodePush`;

export const CODEPUSH_PACKAGE_KOTLIN = `
            add(CodePush.getInstance(
              resources.getString(R.string.CodePushDeploymentKey),
              applicationContext,
              BuildConfig.DEBUG
            ))`;

export const CODEPUSH_PACKAGE_KOTLIN_WITH_PACKAGE_LIST = `
            packages.add(CodePush.getInstance(
              resources.getString(R.string.CodePushDeploymentKey),
              applicationContext,
              BuildConfig.DEBUG
            ))`;

export const CODEPUSH_PACKAGE_JAVA = `
            packages.add(CodePush.getInstance(
              getResources().getString(R.string.CodePushDeploymentKey),
              getApplicationContext(),
              BuildConfig.DEBUG
            ));
            `;

export const JS_BUNDLE_OVERRIDE_KOTLIN = `
          override fun getJSBundleFile(): String? {
            CodePush.getInstance(
                resources.getString(R.string.CodePushDeploymentKey),
                applicationContext,
                BuildConfig.DEBUG
              )
            return CodePush.getJSBundleFile()
          }`;

export const JS_BUNDLE_OVERRIDE_JAVA = `
  @Override
  protected String getJSBundleFile() {
    CodePush.getInstance(
      getResources().getString(R.string.CodePushDeploymentKey),
      getApplicationContext(),
      BuildConfig.DEBUG
    );
    return CodePush.getJSBundleFile();
  }`;

export const IOS_CODEPUSH_IMPORT_SWIFT = `import CodePush`;
export const IOS_CODEPUSH_IMPORT_OBJC = `#import <CodePush/CodePush.h>`;

export const DOTA_POD_HELPERS_REQUIRE = `require_relative '../node_modules/@d11/dota/ios/scripts/dota_pod_helpers.rb'`;

export const DOTA_POST_INSTALL_CALL = (projectName: string): string =>
  `dota_post_install(installer, '${projectName}', File.expand_path(__dir__))`;

export const PODFILE_MERGE_TAGS = {
  POD_HELPERS: "dota-pod-helpers",
  POST_INSTALL: "dota-post-install",
} as const;

export const PODFILE_ANCHOR_PATTERNS = {
  REQUIRE_STATEMENT: /^require /m,
  MAC_CATALYST_ENABLED: /:mac_catalyst_enabled\s*=>/,
} as const;

export const PODFILE_OFFSETS = {
  REQUIRE_ANCHOR: 0,
  POST_INSTALL_ANCHOR: 3,
} as const;

export const PODFILE_COMMENT = "#";

export const ERROR_MESSAGES = {
  MODIFYING_PODFILE: "Error modifying Podfile:",
} as const;