var CodePushWrapper = require("../codePushWrapper.js");
import CodePush from "@d11/dota";

module.exports = {
    startTest: function (testApp) {
        CodePushWrapper.sync(testApp, undefined, undefined,
            {
                installMode: CodePush.InstallMode.ON_NEXT_RESTART,
                mandatoryInstallMode: CodePush.InstallMode.ON_NEXT_RESUME
            });
    },

    getScenarioName: function () {
        return "Sync Mandatory Resume";
    }
};