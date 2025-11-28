import { AndroidConfig } from "@expo/config-plugins";
import type { ResourceXML } from "@expo/config-plugins/build/android/Resources";
import { MODULE_NAME, PACKAGE_PATH } from "../constants";

export function setStrings(
  strings: ResourceXML,
  name: string,
  value: string,
  moduleConfig: boolean = false
) {
  const stringItem = moduleConfig
    ? { $: { name, moduleConfig: "true" }, _: value }
    : { $: { name }, _: value };

  return AndroidConfig.Strings.setStringItem([stringItem], strings);
}

export function applySettings(gradleSettings: string) {
  const moduleInclude = `include ':app', '${MODULE_NAME}'`;
  const projectDir = `project('${MODULE_NAME}').projectDir = new File(rootProject.projectDir, '../node_modules/${PACKAGE_PATH}')`;

  const moduleSettings = `\n${moduleInclude}\n${projectDir}`;

  if (gradleSettings.includes(MODULE_NAME)) {
    return gradleSettings;
  }

  const standaloneAppRegex = /^include\s+['"]:app['"]\s*$/gm;
  gradleSettings = gradleSettings.replace(standaloneAppRegex, "");

  return gradleSettings + moduleSettings;
}