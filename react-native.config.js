module.exports = {
    dependency: {
        platforms: {
            android: {
                packageInstance:
                    "CodePush.getInstance(getApplicationContext(), BuildConfig.DEBUG)"
            }
        }
    }
};
