import type { ConfigPlugin } from "@expo/config-plugins";
import { withInfoPlist } from "@expo/config-plugins";

import type { DotaPluginProps } from "../types";

export const withCodePushInfoPlist: ConfigPlugin<DotaPluginProps> = (
  config,
  props
) => {
  if (!props.iosDeploymentKey || !props.serverUrl) return config;
  return withInfoPlist(config, (config) => {
    config.modResults.CodePushDeploymentKey = props.iosDeploymentKey;
    config.modResults.CodePushServerURL = props.serverUrl;
    return config;
  });
};
