import type { ConfigPlugin } from "@expo/config-plugins";

import { withCodePushAppDelegate } from "./ios-config/withCodePushAppDelegate";
import { withCodePushInfoPlist } from "./ios-config/withCodePushInfoPlist";
import { withCodePushPodfile } from "./ios-config/withCodePushPodfile";
import type { DotaPluginProps } from "./types";

export const withIosDotaPlugin: ConfigPlugin<DotaPluginProps> = (
  config,
  props = {}
) => {
  config = withCodePushAppDelegate(config);
  config = withCodePushInfoPlist(config, props);
  config = withCodePushPodfile(config);

  return config;
};