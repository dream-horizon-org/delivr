class CodePushError extends Error {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, CodePushError.prototype);
    }
}

class CodePushHttpError extends CodePushError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, CodePushHttpError.prototype);
    }
}

class CodePushDeployStatusError extends CodePushError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, CodePushDeployStatusError.prototype);
    }
}

class CodePushPackageError extends CodePushError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, CodePushPackageError.prototype);
    }
}

const Http = {
    Verb: {
        GET: 0, HEAD: 1, POST: 2, PUT: 3, DELETE: 4, TRACE: 5, OPTIONS: 6, CONNECT: 7, PATCH: 8
    }
};

class AcquisitionStatus {
    static DeploymentSucceeded = "DeploymentSucceeded";
    static DeploymentFailed = "DeploymentFailed";
}

class AcquisitionManager {
    constructor(httpRequester, configuration) {
        this.BASE_URL_PART = "appcenter.ms";
        this._publicPrefixUrl = "v0.1/public/codepush/";
        this._httpRequester = httpRequester;

        this._serverUrl = configuration.serverUrl;
        if (this._serverUrl.slice(-1) !== "/") {
            this._serverUrl += "/";
        }

        this._appVersion = configuration.appVersion;
        this._clientUniqueId = configuration.clientUniqueId;
        this._deploymentKey = configuration.deploymentKey;
        this._ignoreAppVersion = configuration.ignoreAppVersion;
        this._packageName = configuration.packageName;
    }

    isRecoverable = (statusCode) => statusCode >= 500 || statusCode === 408 || statusCode === 429;

    handleRequestFailure() {
        if (this._serverUrl.includes(this.BASE_URL_PART) && !this.isRecoverable(this._statusCode)) {
            AcquisitionManager._apiCallsDisabled = true;
        }
    }

    queryUpdateWithCurrentPackage(currentPackage, callback) {
        if (AcquisitionManager._apiCallsDisabled) {
            console.log(`[CodePush] Api calls are disabled, skipping API call`);
            callback(null, null);
            return;
        }

        if (!currentPackage || !currentPackage.appVersion) {
            throw new CodePushPackageError("Calling common acquisition SDK with incorrect package");
        }

        var updateRequest = {
            deployment_key: this._deploymentKey,
            app_version: currentPackage.appVersion,
            package_hash: currentPackage.packageHash,
            is_companion: this._ignoreAppVersion,
            label: currentPackage.label,
            client_unique_id: this._clientUniqueId
        };

        var requestUrl = this._serverUrl + this._publicPrefixUrl + "update_check?" + queryStringify(updateRequest);

        this._httpRequester.request(Http.Verb.GET, requestUrl, this._packageName, (error, response) => {
            if (error) {
                callback(error, null);
                return;
            }

            if (response.statusCode < 200 || response.statusCode >= 300) {
                let errorMessage;
                this._statusCode = response.statusCode;
                this.handleRequestFailure();
                if (response.statusCode === 0) {
                    errorMessage = `Couldn't send request to ${requestUrl}, xhr.statusCode = 0 was returned. One of the possible reasons for that might be connection problems. Please, check your internet connection.`;
                } else {
                    errorMessage = `${response.statusCode}: ${response.body}`;
                }
                callback(new CodePushHttpError(errorMessage), null);
                return;
            }
            try {
                var responseObject = JSON.parse(response.body);
                var updateInfo = responseObject.update_info;
            } catch (error) {
                callback(error, null);
                return;
            }

            if (!updateInfo) {
                callback(error, null);
                return;
            } else if (updateInfo.update_app_version) {
                callback(null, { updateAppVersion: true, appVersion: updateInfo.target_binary_range });
                return;
            } else if (!updateInfo.is_available) {
                callback(null, null);
                return;
            }

            var remotePackage = {
                deploymentKey: this._deploymentKey,
                description: updateInfo.description,
                label: updateInfo.label,
                appVersion: updateInfo.target_binary_range,
                isMandatory: updateInfo.is_mandatory,
                packageHash: updateInfo.package_hash,
                packageSize: updateInfo.package_size,
                downloadUrl: updateInfo.download_url,
                isBundlePatchingEnabled: updateInfo.is_bundle_patching_enabled
            };

            callback(null, remotePackage);
        });
    }

    reportStatusDeploy(deployedPackage, status, previousLabelOrAppVersion, previousDeploymentKey, callback) {
        if (AcquisitionManager._apiCallsDisabled) {
            console.log(`[CodePush] Api calls are disabled, skipping API call`);
            callback(null, null);
            return;
        }

        var url = this._serverUrl + this._publicPrefixUrl + "report_status/deploy";
        var body = {
            app_version: this._appVersion,
            deployment_key: this._deploymentKey
        };

        if (this._clientUniqueId) {
            body.client_unique_id = this._clientUniqueId;
        }

        if (deployedPackage) {
            body.label = deployedPackage.label;
            body.app_version = deployedPackage.appVersion;

            switch (status) {
                case AcquisitionStatus.DeploymentSucceeded:
                case AcquisitionStatus.DeploymentFailed:
                    body.status = status;
                    break;

                default:
                    if (callback) {
                        if (!status) {
                            callback(new CodePushDeployStatusError("Missing status argument."), null);
                        } else {
                            callback(new CodePushDeployStatusError("Unrecognized status \"" + status + "\"."), null);
                        }
                    }
                    return;
            }
        }

        if (previousLabelOrAppVersion) {
            body.previous_label_or_app_version = previousLabelOrAppVersion;
        }

        if (previousDeploymentKey) {
            body.previous_deployment_key = previousDeploymentKey;
        }

        callback = typeof arguments[arguments.length - 1] === "function" && arguments[arguments.length - 1];

        this._httpRequester.request(Http.Verb.POST, url, this._packageName, JSON.stringify(body), (error, response) => {
            if (callback) {
                if (error) {
                    callback(error, null);
                    return;
                }

                if (response.statusCode < 200 || response.statusCode >= 300) {
                    this._statusCode = response.statusCode;
                    this.handleRequestFailure();
                    callback(new CodePushHttpError(response.statusCode + ": " + response.body), null);
                    return;
                }

                callback(null, null);
            }
        });
    }

    reportStatusDownload(downloadedPackage, callback) {
        if (AcquisitionManager._apiCallsDisabled) {
            console.log(`[CodePush] Api calls are disabled, skipping API call`);
            callback(null, null);
            return;
        }

        var url = this._serverUrl + this._publicPrefixUrl + "report_status/download";
        var body = {
            client_unique_id: this._clientUniqueId,
            deployment_key: this._deploymentKey,
            label: downloadedPackage.label
        };

        this._httpRequester.request(Http.Verb.POST, url, this._packageName, JSON.stringify(body), (error, response) => {
            if (callback) {
                if (error) {
                    callback(error, null);
                    return;
                }

                if (response.statusCode < 200 || response.statusCode >= 300) {
                    this._statusCode = response.statusCode;
                    this.handleRequestFailure();
                    callback(new CodePushHttpError(response.statusCode + ": " + response.body), null);
                    return;
                }

                callback(null, null);
            }
        });
    }
}

function queryStringify(object) {
    var queryString = "";
    var isFirst = true;

    for (var property in object) {
        if (object.hasOwnProperty(property)) {
            var value = object[property];
            if (value !== null && typeof value !== "undefined") {
                if (!isFirst) {
                    queryString += "&";
                }

                queryString += encodeURIComponent(property) + "=";
                queryString += encodeURIComponent(value);
            }

            isFirst = false;
        }
    }

    return queryString;
}

AcquisitionManager._apiCallsDisabled = false;

module.exports = {
    Http,
    AcquisitionStatus,
    AcquisitionManager,
    CodePushError,
    CodePushHttpError,
    CodePushDeployStatusError,
    CodePushPackageError
};