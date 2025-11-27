package com.microsoft.codepush.react;

import android.os.Build;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.ByteBuffer;

import javax.net.ssl.HttpsURLConnection;

public class CodePushUpdateManager {

    private String mDocumentsDirectory;

    private int bsPatchFile(String oldFile, String newFile, String patchFile) {
        CodePushUtils.log("Applying patch from " + oldFile + " to " + newFile + " with patch file " + patchFile);

        File oldFileObj = new File(oldFile);
        if (!oldFileObj.exists()) {
            CodePushUtils.log("bsPatchFile: oldFile does not exist.");
            return -1;
        }

        File patchFileObj = new File(patchFile);
        if (!patchFileObj.exists()) {
            CodePushUtils.log("bsPatchFile: patchFile does not exist.");
            return -1;
        }

        File newFileObj = new File(newFile);
        if (newFileObj.exists()) {
            CodePushUtils.log("bsPatchFile: newFile exists, deleting it.");
            if (!newFileObj.delete()) {
                CodePushUtils.log("bsPatchFile: Failed to delete existing newFile.");
                return -1;
            }
        }

        return BsDiffPatchLoader.nativeBsPatchFile(oldFile, newFile, patchFile);
    }

    public CodePushUpdateManager(String documentsDirectory) {
        mDocumentsDirectory = documentsDirectory;
    }

    private String getDownloadFilePath() {
        return CodePushUtils.appendPathComponent(getCodePushPath(), CodePushConstants.DOWNLOAD_FILE_NAME);
    }

    private String getUnzippedFolderPath() {
        return CodePushUtils.appendPathComponent(getCodePushPath(), CodePushConstants.UNZIPPED_FOLDER_NAME);
    }

    private String getDecompressedFolderPath() {
        return CodePushUtils.appendPathComponent(getCodePushPath(), CodePushConstants.DECOMPRESSED_FOLDER_NAME);
    }

    private String getDocumentsDirectory() {
        return mDocumentsDirectory;
    }

    private String getCodePushPath() {
        String codePushPath = CodePushUtils.appendPathComponent(getDocumentsDirectory(), CodePushConstants.CODE_PUSH_FOLDER_PREFIX);
        if (CodePush.isUsingTestConfiguration()) {
            codePushPath = CodePushUtils.appendPathComponent(codePushPath, "TestPackages");
        }

        return codePushPath;
    }

    private String getStatusFilePath() {
        return CodePushUtils.appendPathComponent(getCodePushPath(), CodePushConstants.STATUS_FILE);
    }

    private void emitDownloadStatusEvent(ReactApplicationContext context, String eventName) {
        WritableMap map = new WritableNativeMap();
        map.putString("name", eventName);
        context.getJSModule(ReactContext.RCTDeviceEventEmitter.class).emit(CodePushConstants.DOWNLOAD_STATUS_EVENT_NAME, map);
    }

    public JSONObject getCurrentPackageInfo() {
        String statusFilePath = getStatusFilePath();
        CodePushUtils.log("statusFilePath in getCurrentPackageInfo :: " + statusFilePath);
        if (!FileUtils.fileAtPathExists(statusFilePath)) {
            return new JSONObject();
        }

        try {
            return CodePushUtils.getJsonObjectFromFile(statusFilePath);
        } catch (IOException e) {
            // Should not happen.
            throw new CodePushUnknownException("Error getting current package info", e);
        }
    }

    public void updateCurrentPackageInfo(JSONObject packageInfo) {
        try {
            CodePushUtils.writeJsonToFile(packageInfo, getStatusFilePath());
        } catch (IOException e) {
            // Should not happen.
            throw new CodePushUnknownException("Error updating current package info", e);
        }
    }

    public String getCurrentPackageFolderPath() {
        JSONObject info = getCurrentPackageInfo();
        CodePushUtils.log("info in getCurrentPackageFolderPath :: "+ info );
        String packageHash = info.optString(CodePushConstants.CURRENT_PACKAGE_KEY, null);
        CodePushUtils.log("packageHash in getCurrentPackageFolderPath :: "+ packageHash );
        if (packageHash == null) {
            return null;
        }

        return getPackageFolderPath(packageHash);
    }

    public String getCurrentPackageBundlePath(String bundleFileName) {
        String packageFolder = getCurrentPackageFolderPath();
        if (packageFolder == null) {
            return null;
        }

        JSONObject currentPackage = getCurrentPackage();
        if (currentPackage == null) {
            return null;
        }

        String relativeBundlePath = currentPackage.optString(CodePushConstants.RELATIVE_BUNDLE_PATH_KEY, null);
        if (relativeBundlePath == null) {
            return CodePushUtils.appendPathComponent(packageFolder, bundleFileName);
        } else {
            return CodePushUtils.appendPathComponent(packageFolder, relativeBundlePath);
        }
    }

    public String getPackageFolderPath(String packageHash) {
        return CodePushUtils.appendPathComponent(getCodePushPath(), packageHash);
    }

    public String getCurrentPackageHash() {
        JSONObject info = getCurrentPackageInfo();
        CodePushUtils.log("info in getCurrentPackageHash :: "+ info);
        return info.optString(CodePushConstants.CURRENT_PACKAGE_KEY, null);
    }

    public String getPreviousPackageHash() {
        JSONObject info = getCurrentPackageInfo();
        return info.optString(CodePushConstants.PREVIOUS_PACKAGE_KEY, null);
    }

    public JSONObject getCurrentPackage() {
        String packageHash = getCurrentPackageHash();
        if (packageHash == null) {
            return null;
        }
        CodePushUtils.log("packageHash in getCurrentPackage ::" + packageHash);

        return getPackage(packageHash);
    }

    public JSONObject getPreviousPackage() {
        String packageHash = getPreviousPackageHash();
        if (packageHash == null) {
            return null;
        }

        return getPackage(packageHash);
    }

    public JSONObject getPackage(String packageHash) {
        String folderPath = getPackageFolderPath(packageHash);
        String packageFilePath = CodePushUtils.appendPathComponent(folderPath, CodePushConstants.PACKAGE_FILE_NAME);
        CodePushUtils.log("folderPath :: "+ folderPath + " packageFilePath :: "+ packageFilePath+ " in getPackage");
        try {
            return CodePushUtils.getJsonObjectFromFile(packageFilePath);
        } catch (IOException e) {
            return null;
        }
    }

    public void downloadPackage(ReactApplicationContext context, JSONObject updatePackage, String expectedBundleFileName,
                                DownloadProgressCallback progressCallback,
                                String stringPublicKey) throws IOException {
        String newUpdateHash = updatePackage.optString(CodePushConstants.PACKAGE_HASH_KEY, null);
        boolean isBundlePatchingEnabled = updatePackage.optBoolean(CodePushConstants.IS_BUNDLE_PATCHING_ENABLED, false);
        String newUpdateFolderPath = getPackageFolderPath(newUpdateHash);
        String newUpdateMetadataPath = CodePushUtils.appendPathComponent(newUpdateFolderPath, CodePushConstants.PACKAGE_FILE_NAME);
        CodePushUtils.log("DownloadingPackage initiated");
        CodePushUtils.log("newUpdateHash :: " + newUpdateHash);
        CodePushUtils.log("newUpdateFolderPath :: " + newUpdateFolderPath);
        CodePushUtils.log("newUpdateMetadataPath :: " + newUpdateMetadataPath);
        CodePushUtils.log("isBundlePatchingEnabled: " + isBundlePatchingEnabled);
        if (FileUtils.fileAtPathExists(newUpdateFolderPath)) {
            // This removes any stale data in newPackageFolderPath that could have been left
            // uncleared due to a crash or error during the download or install process.
            FileUtils.deleteDirectoryAtPath(newUpdateFolderPath);
            CodePushUtils.log("fileAtPath Exists, deleting directory");
        }

        String downloadUrlString = updatePackage.optString(CodePushConstants.DOWNLOAD_URL_KEY, null);
        //This must be logged to evaluate infra
        CodePushUtils.log("downloadUrlString :: " + downloadUrlString);
        HttpURLConnection connection = null;
        BufferedInputStream bin = null;
        FileOutputStream fos = null;
        BufferedOutputStream bout = null;
        File downloadFile = null;
        boolean isZip = false;

        // Download the file while checking if it is a zip and notifying client of progress.
        try {
            URL downloadUrl = new URL(downloadUrlString);
            connection = (HttpURLConnection) (downloadUrl.openConnection());

            if (android.os.Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP &&
                downloadUrl.toString().startsWith("https")) {
                try {
                    ((HttpsURLConnection)connection).setSSLSocketFactory(new TLSSocketFactory());
                } catch (Exception e) {
                    CodePushUtils.log("HTTP exists due to Build version:: " + downloadUrlString);
                    throw new CodePushUnknownException("Error set SSLSocketFactory. ", e);
                }
            }

            String packageName = context.getPackageName();
            connection.setRequestProperty(CodePushConstants.PACKAGE_NAME_HEADER_KEY, packageName);
            CodePushUtils.log("Setting " + CodePushConstants.PACKAGE_NAME_HEADER_KEY + " header: " + packageName);

            connection.setRequestProperty("Accept-Encoding", "identity");
            bin = new BufferedInputStream(connection.getInputStream());

            long totalBytes = connection.getContentLength();
            long receivedBytes = 0;
            CodePushUtils.log("totalBytes received in bytes:: "+ totalBytes);

            File downloadFolder = new File(getCodePushPath());
            downloadFolder.mkdirs();
            downloadFile = new File(downloadFolder, CodePushConstants.DOWNLOAD_FILE_NAME);
            fos = new FileOutputStream(downloadFile);
            bout = new BufferedOutputStream(fos, CodePushConstants.DOWNLOAD_BUFFER_SIZE);
            byte[] data = new byte[CodePushConstants.DOWNLOAD_BUFFER_SIZE];
            byte[] header = new byte[4];
            CodePushUtils.log("downloadFolder path :: "+ getCodePushPath());

            int numBytesRead = 0;
            while ((numBytesRead = bin.read(data, 0, CodePushConstants.DOWNLOAD_BUFFER_SIZE)) >= 0) {
                if (receivedBytes < 4) {
                    for (int i = 0; i < numBytesRead; i++) {
                        int headerOffset = (int) (receivedBytes) + i;
                        if (headerOffset >= 4) {
                            break;
                        }

                        header[headerOffset] = data[i];
                    }
                }

                receivedBytes += numBytesRead;
                bout.write(data, 0, numBytesRead);
                progressCallback.call(new DownloadProgress(totalBytes, receivedBytes));
            }

            if (totalBytes != receivedBytes) {
                throw new CodePushUnknownException("Received " + receivedBytes + " bytes, expected " + totalBytes);
            }

            emitDownloadStatusEvent(context, CodePushConstants.DOWNLOAD_REQUEST_SUCCESS);

            isZip = ByteBuffer.wrap(header).getInt() == 0x504b0304;
        } catch (MalformedURLException e) {
            throw new CodePushMalformedDataException(downloadUrlString, e);
        } finally {
            try {
                if (bout != null) bout.close();
                if (fos != null) fos.close();
                if (bin != null) bin.close();
                if (connection != null) connection.disconnect();
            } catch (IOException e) {
                throw new CodePushUnknownException("Error closing IO resources.", e);
            }
        }

        if (isZip) {
            CodePushUtils.log("Unzipping ");
            // Unzip the downloaded file and then delete the zip
            String unzippedFolderPath = getUnzippedFolderPath();
            CodePushCompressionMode compressionMode = FileUtils.unzipFile(downloadFile, unzippedFolderPath);

            emitDownloadStatusEvent(context, CodePushConstants.UNZIPPED_SUCCESS);
            FileUtils.deleteFileOrFolderSilently(downloadFile);
        
            if (compressionMode == CodePushCompressionMode.BROTLI) {
                String decompressedFolderPath = getDecompressedFolderPath();

                CodePushUtils.log("Decompressing brotli compressed files at path: " + decompressedFolderPath);
                FileUtils.decompressFiles(unzippedFolderPath, decompressedFolderPath);
                CodePushUtils.log("Decompressed brotli compressed files at path: " + decompressedFolderPath);
                FileUtils.deleteFileAtPathSilently(unzippedFolderPath);
                unzippedFolderPath = decompressedFolderPath;
                emitDownloadStatusEvent(context, CodePushConstants.DECOMPRESSED_SUCCESS);
            }

            // Merge contents with current update based on the manifest
            String diffManifestFilePath = CodePushUtils.appendPathComponent(unzippedFolderPath,
                    CodePushConstants.DIFF_MANIFEST_FILE_NAME);
            CodePushUtils.log("diffManifestFilePath  :: " + diffManifestFilePath);
            boolean isDiffUpdate = FileUtils.fileAtPathExists(diffManifestFilePath);
            CodePushUtils.log("isDiffUpdate  :: " + isDiffUpdate);
            if (isDiffUpdate) {
                String currentPackageFolderPath = getCurrentPackageFolderPath();
                CodePushUpdateUtils.copyNecessaryFilesFromCurrentPackage(diffManifestFilePath, currentPackageFolderPath, newUpdateFolderPath);
                File diffManifestFile = new File(diffManifestFilePath);
                diffManifestFile.delete();
            }


            FileUtils.copyDirectoryContents(unzippedFolderPath, newUpdateFolderPath);
            FileUtils.deleteFileAtPathSilently(unzippedFolderPath);

            if (isBundlePatchingEnabled) {
                applyPatch(newUpdateFolderPath, context);
            }

            // For zip updates, we need to find the relative path to the jsBundle and save it in the
            // metadata so that we can find and run it easily the next time.
            String relativeBundlePath = CodePushUpdateUtils.findJSBundleInUpdateContents(newUpdateFolderPath, expectedBundleFileName);
            CodePushUtils.log("relativeBundlePath  :: " + relativeBundlePath);
            if (relativeBundlePath == null) {
                throw new CodePushInvalidUpdateException("Update is invalid - A JS bundle file named \"" + expectedBundleFileName + "\" could not be found within the downloaded contents. Please check that you are releasing your CodePush updates using the exact same JS bundle file name that was shipped with your app's binary.");
            } else {
                if (FileUtils.fileAtPathExists(newUpdateMetadataPath)) {
                    File metadataFileFromOldUpdate = new File(newUpdateMetadataPath);
                    metadataFileFromOldUpdate.delete();
                }

                if (isDiffUpdate) {
                    CodePushUtils.log("Applying diff update.");
                } else {
                    CodePushUtils.log("Applying full update.");
                }

                boolean isSignatureVerificationEnabled = (stringPublicKey != null);

                String signaturePath = CodePushUpdateUtils.getSignatureFilePath(newUpdateFolderPath);
                boolean isSignatureAppearedInBundle = FileUtils.fileAtPathExists(signaturePath);

                if (isSignatureVerificationEnabled) {
                    if (isSignatureAppearedInBundle) {
                        CodePushUpdateUtils.verifyFolderHash(newUpdateFolderPath, newUpdateHash);
                        CodePushUpdateUtils.verifyUpdateSignature(newUpdateFolderPath, newUpdateHash, stringPublicKey);
                    } else {
                        throw new CodePushInvalidUpdateException(
                                "Error! Public key was provided but there is no JWT signature within app bundle to verify. " +
                                "Possible reasons, why that might happen: \n" +
                                "1. You've been released CodePush bundle update using version of CodePush CLI that is not support code signing.\n" +
                                "2. You've been released CodePush bundle update without providing --privateKeyPath option."
                        );
                    }
                } else {
                    if (isSignatureAppearedInBundle) {
                        CodePushUtils.log(
                                "Warning! JWT signature exists in codepush update but code integrity check couldn't be performed because there is no public key configured. " +
                                "Please ensure that public key is properly configured within your application."
                        );
                        CodePushUpdateUtils.verifyFolderHash(newUpdateFolderPath, newUpdateHash);
                    } else {
                        if (isDiffUpdate) {
                            CodePushUpdateUtils.verifyFolderHash(newUpdateFolderPath, newUpdateHash);
                        }
                    }
                }

                CodePushUtils.setJSONValueForKey(updatePackage, CodePushConstants.RELATIVE_BUNDLE_PATH_KEY, relativeBundlePath);
            }
        } else {
            if (isBundlePatchingEnabled) {
                CodePushUtils.log("Patch Process: Moving single file from " + downloadFile.getAbsolutePath() + " to " + newUpdateFolderPath + " with name " + CodePushConstants.PATCH_BUNDLE_FILE_NAME);
                FileUtils.moveFile(downloadFile, newUpdateFolderPath, CodePushConstants.PATCH_BUNDLE_FILE_NAME);
                applyPatch(newUpdateFolderPath, context);
            } else {
                // File is a jsbundle, move it to a folder with the packageHash as its name
                FileUtils.moveFile(downloadFile, newUpdateFolderPath, expectedBundleFileName);
            }
        }

        // Save metadata to the folder.
        CodePushUtils.writeJsonToFile(updatePackage, newUpdateMetadataPath);
    }

    private void applyPatch(String newUpdateFolderPath, ReactApplicationContext context) throws CodePushUnknownException, CodePushInvalidUpdateException {
        CodePushUtils.log("Patch Process: Starting patch process.");

        String findPatchBundleRelativePath = checkPatchFileExistence(newUpdateFolderPath);

        File binaryBundle = copyOriginalBundle(context);

        applyPatchToBundle(newUpdateFolderPath, findPatchBundleRelativePath, binaryBundle, context);
        
        CodePushUtils.log("Patch Process: Patch application completed.");
    }

    private String checkPatchFileExistence(String newUpdateFolderPath) throws CodePushInvalidUpdateException {
        String patchBundleFileName = CodePushConstants.PATCH_BUNDLE_FILE_NAME;
        String findPatchBundleRelativePath = CodePushUpdateUtils.findJSBundleInUpdateContents(newUpdateFolderPath, patchBundleFileName);
        if (findPatchBundleRelativePath == null) {
            CodePushUtils.log("Patch Process: Update is invalid - Patch bundle file not found.");
            throw new CodePushInvalidUpdateException("Update is invalid - A patch bundle file named \"" + patchBundleFileName + "\" could not be found within the downloaded contents. Please check that you are releasing \"" + patchBundleFileName + "\" file correctly.");
        }
        CodePushUtils.log("Patch Process: Patch bundle file found at " + findPatchBundleRelativePath);
        return findPatchBundleRelativePath;
    }

    private File copyOriginalBundle(ReactApplicationContext context) throws CodePushUnknownException {
        File binaryBundleDir = new File(getCodePushPath(), CodePushConstants.BINARY_BUNDLE_DIR);
        if (!binaryBundleDir.exists()) {
            CodePushUtils.log("Patch Process: Creating binary bundle directory.");
            binaryBundleDir.mkdirs();
        }

        File binaryBundle = new File(binaryBundleDir, CodePushConstants.DEFAULT_JS_BUNDLE_NAME);
        // This is done to prevent using old binary bundle in case of new apk updates.
        if (binaryBundle.exists()) {
            CodePushUtils.log("Patch Process: Deleting existing binary bundle.");
            binaryBundle.delete();
        }
        if (!binaryBundle.exists()) {
            CodePushUtils.log("Patch Process: Copying original bundle from assets.");
            InputStream input = null;
            OutputStream output = null;
            try {
                input = context.getAssets().open(CodePushConstants.DEFAULT_JS_BUNDLE_NAME);
                output = new FileOutputStream(binaryBundle);

                byte[] buffer = new byte[1024];
                int read;
                while ((read = input.read(buffer)) != -1) {
                    output.write(buffer, 0, read);
                }
            } catch (Exception e) {
                CodePushUtils.log("Patch Process: Failed to copy original bundle with error: " + e.getMessage());
                throw new CodePushUnknownException("Failed to copy original bundle shipped within APK to " + binaryBundle.getAbsolutePath() + " with error: " + e.getMessage());
            } finally {
                try {
                    if (input != null) {
                        input.close();
                    }
                    if (output != null) {
                        output.close();
                    }
                } catch (IOException e) {
                    CodePushUtils.log("Patch Process: Failed to close streams: " + e.getMessage());
                }
            }
        }
        return binaryBundle;
    }

    private void applyPatchToBundle(String newUpdateFolderPath, String findPatchBundleRelativePath, File binaryBundle, ReactApplicationContext context) throws CodePushUnknownException {
        try {
            File patchBundleFile = new File(newUpdateFolderPath, findPatchBundleRelativePath);
            CodePushUtils.log("Patch Process: Applying patch from " + patchBundleFile.getAbsolutePath());
            String dir = patchBundleFile.getParent();
            File modifiedBundleFile = new File(dir, CodePushConstants.DEFAULT_JS_BUNDLE_NAME);
            int result = bsPatchFile(binaryBundle.getAbsolutePath(), modifiedBundleFile.getAbsolutePath(), patchBundleFile.getAbsolutePath());
            if (result == 0) {
                emitDownloadStatusEvent(context, CodePushConstants.PATCH_APPLIED_SUCCESS);
                CodePushUtils.log("Patch Process: Patching successful.");

                // Cleanup
                FileUtils.deleteFileAtPathSilently(patchBundleFile.getAbsolutePath());
                FileUtils.deleteDirectoryAtPath(binaryBundle.getParent());
            } else {
                CodePushUtils.log("Patch Process: Patching failed.");
                throw new CodePushUnknownException("Patching failed");
            }
        } catch (Exception e) {
            CodePushUtils.log("Patch Process: Failed to patch bundle with error: " + e.getMessage());
            throw new CodePushUnknownException("Failed to patch bundle with error: " + e.getMessage());
        }
    }

    public void installPackage(JSONObject updatePackage, boolean removePendingUpdate) {
        CodePushUtils.log("Installing Package ::");
        CodePushUtils.log("updatePackage  :: " + updatePackage + " removePendingUpdate :: "+ removePendingUpdate);
        String packageHash = updatePackage.optString(CodePushConstants.PACKAGE_HASH_KEY, null);
        CodePushUtils.log("packageHash  :: " + packageHash);
        JSONObject info = getCurrentPackageInfo();
        CodePushUtils.log("info  :: " + info);
        String currentPackageHash = info.optString(CodePushConstants.CURRENT_PACKAGE_KEY, null);
        CodePushUtils.log("currentPackageHash  :: " + currentPackageHash);
        if (packageHash != null && packageHash.equals(currentPackageHash)) {
            // The current package is already the one being installed, so we should no-op.
            return;
        }

        if (removePendingUpdate) {
            String currentPackageFolderPath = getCurrentPackageFolderPath();
            if (currentPackageFolderPath != null) {
                FileUtils.deleteDirectoryAtPath(currentPackageFolderPath);
            }
        } else {
            String previousPackageHash = getPreviousPackageHash();
            CodePushUtils.log("previousPackageHash  :: " + previousPackageHash);
            if (previousPackageHash != null && !previousPackageHash.equals(packageHash)) {
                FileUtils.deleteDirectoryAtPath(getPackageFolderPath(previousPackageHash));
            }

            CodePushUtils.setJSONValueForKey(info, CodePushConstants.PREVIOUS_PACKAGE_KEY, info.optString(CodePushConstants.CURRENT_PACKAGE_KEY, null));
        }

        CodePushUtils.setJSONValueForKey(info, CodePushConstants.CURRENT_PACKAGE_KEY, packageHash);
        updateCurrentPackageInfo(info);
    }

    public void rollbackPackage() {
        CodePushUtils.log("rolling back Package :: ");
        JSONObject info = getCurrentPackageInfo();
        String currentPackageFolderPath = getCurrentPackageFolderPath();
        FileUtils.deleteDirectoryAtPath(currentPackageFolderPath);
        CodePushUtils.setJSONValueForKey(info, CodePushConstants.CURRENT_PACKAGE_KEY, info.optString(CodePushConstants.PREVIOUS_PACKAGE_KEY, null));
        CodePushUtils.setJSONValueForKey(info, CodePushConstants.PREVIOUS_PACKAGE_KEY, null);
        updateCurrentPackageInfo(info);
    }

    public void downloadAndReplaceCurrentBundle(String remoteBundleUrl, String bundleFileName) throws IOException {
        URL downloadUrl;
        HttpURLConnection connection = null;
        BufferedInputStream bin = null;
        FileOutputStream fos = null;
        BufferedOutputStream bout = null;
        try {
            downloadUrl = new URL(remoteBundleUrl);
            connection = (HttpURLConnection) (downloadUrl.openConnection());
            bin = new BufferedInputStream(connection.getInputStream());
            File downloadFile = new File(getCurrentPackageBundlePath(bundleFileName));
            downloadFile.delete();
            fos = new FileOutputStream(downloadFile);
            bout = new BufferedOutputStream(fos, CodePushConstants.DOWNLOAD_BUFFER_SIZE);
            byte[] data = new byte[CodePushConstants.DOWNLOAD_BUFFER_SIZE];
            int numBytesRead = 0;
            while ((numBytesRead = bin.read(data, 0, CodePushConstants.DOWNLOAD_BUFFER_SIZE)) >= 0) {
                bout.write(data, 0, numBytesRead);
            }
        } catch (MalformedURLException e) {
            throw new CodePushMalformedDataException(remoteBundleUrl, e);
        } finally {
            try {
                if (bout != null) bout.close();
                if (fos != null) fos.close();
                if (bin != null) bin.close();
                if (connection != null) connection.disconnect();
            } catch (IOException e) {
                throw new CodePushUnknownException("Error closing IO resources.", e);
            }
        }
    }

    public void clearUpdates() {
        FileUtils.deleteDirectoryAtPath(getCodePushPath());
    }
}
