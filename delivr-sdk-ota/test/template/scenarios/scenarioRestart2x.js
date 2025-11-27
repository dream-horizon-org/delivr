var CodePushWrapper = require("../codePushWrapper.js");
import CodePush from "@d11/dota";

module.exports = {
    startTest: function (testApp) {
        CodePush.restartApp(true);
        CodePushWrapper.checkAndInstall(testApp,
            () => {
                CodePush.restartApp(true);
            }
        );
    },

    getScenarioName: function () {
        return "Restart2x";
    }
};