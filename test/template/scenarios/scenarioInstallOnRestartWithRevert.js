var CodePushWrapper = require("../codePushWrapper.js");
import CodePush from "@d11/dota";

module.exports = {
    startTest: function (testApp) {
        CodePushWrapper.checkAndInstall(testApp, undefined, undefined, CodePush.InstallMode.ON_NEXT_RESTART);
    },

    getScenarioName: function () {
        return "Install on Restart with Revert";
    }
};