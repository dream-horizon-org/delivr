package com.microsoft.codepush.react;

/**
 * Utility class to handle native library loading for BsDiffPatch
 */
public class BsDiffPatchLoader {
    private static volatile BsDiffPatchLoader instance;
    private static final String LIBRARY_NAME = "react-native-bs-diff-patch";


    private BsDiffPatchLoader() {
        System.loadLibrary(LIBRARY_NAME);
    }

    private static BsDiffPatchLoader getInstance() {
        if (instance == null) {
            synchronized (BsDiffPatchLoader.class) {
                if (instance == null) {
                    instance = new BsDiffPatchLoader();
                }
            }
        }
        return instance;
    }

    public static int nativeBsPatchFile(String oldFile, String newFile, String patchFile) {
       return getInstance().bsPatchFile(oldFile, newFile, patchFile);
    }

    private native int bsPatchFile(String oldFile, String newFile, String patchFile);
}