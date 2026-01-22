import { createRunOncePlugin, type ConfigPlugin } from "@expo/config-plugins";

import type { DotaPluginProps } from "./types";
import { withAndroidDotaPlugin } from "./withAndroidDotaPlugin";
import { withIosDotaPlugin } from "./withIosDotaPlugin";

const pkg = require("../../package.json");

const withDotaPlugin: ConfigPlugin<DotaPluginProps> = (config, props = {}) => {
  config = withAndroidDotaPlugin(config, props);
  config = withIosDotaPlugin(config, props);

  return config;
};

export default createRunOncePlugin(withDotaPlugin, pkg.name, pkg.version);