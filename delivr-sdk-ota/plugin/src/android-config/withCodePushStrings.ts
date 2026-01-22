import { withStringsXml, type ConfigPlugin } from "@expo/config-plugins";

import { CODE_PUSH_DEPLOYMENT_KEY, CODE_PUSH_SERVER_URL } from "../constants";
import type { DotaPluginProps } from "../types";

import { setStrings } from "./utils";

export const withCodePushStrings: ConfigPlugin<DotaPluginProps> = (
  config,
  props = {}
) => {
  return withStringsXml(config, (config) => {
    if (props.androidDeploymentKey) {
      config.modResults = setStrings(
        config.modResults,
        CODE_PUSH_DEPLOYMENT_KEY,
        props.androidDeploymentKey,
        true
      );
    }
    if (props.serverUrl) {
      config.modResults = setStrings(
        config.modResults,
        CODE_PUSH_SERVER_URL,
        props.serverUrl,
        true
      );
    }

    return config;
  });
};
