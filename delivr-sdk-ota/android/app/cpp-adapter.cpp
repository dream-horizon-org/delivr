#include <jni.h>
#include "react-native-bs-diff-patch.h"

extern "C"
JNIEXPORT jint JNICALL
Java_com_microsoft_codepush_react_BsDiffPatchLoader_bsDiffFile(JNIEnv *env,
                                                                            jobject type, jstring oldFile_,
                                                  jstring newFile_, jstring patchFile_) {
    const char *oldFile = env->GetStringUTFChars(oldFile_, 0);
    const char *newFile = env->GetStringUTFChars(newFile_, 0);
    const char *patchFile = env->GetStringUTFChars(patchFile_, 0);

    int result = bsdiffpatch::diffFile(oldFile, newFile, patchFile);

    env->ReleaseStringUTFChars(oldFile_, oldFile);
    env->ReleaseStringUTFChars(newFile_, newFile);
    env->ReleaseStringUTFChars(patchFile_, patchFile);

    return result;
}

extern "C"
JNIEXPORT jint JNICALL
Java_com_microsoft_codepush_react_BsDiffPatchLoader_bsPatchFile(JNIEnv *env, jclass clazz,
                                                                jstring old_file, jstring new_file,
                                                                jstring patch_file) {
    const char *oldFile = env->GetStringUTFChars(old_file, 0);
    const char *newFile = env->GetStringUTFChars(new_file, 0);
    const char *patchFile = env->GetStringUTFChars(patch_file, 0);

    int result = bsdiffpatch::patchFile(oldFile, newFile, patchFile);

    env->ReleaseStringUTFChars(old_file, oldFile);
    env->ReleaseStringUTFChars(new_file, newFile);
    env->ReleaseStringUTFChars(patch_file, patchFile);

    return result;
}