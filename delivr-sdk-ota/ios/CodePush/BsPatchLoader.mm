#import "BsPatchLoader.h"

#ifdef __cplusplus
#import "react-native-bs-diff-patch.h"
#endif

@implementation BsPatchLoader

+ (int)applyPatchWithOldFile:(NSString *)oldFile
                     newFile:(NSString *)newFile
                   patchFile:(NSString *)patchFile {
#ifdef __cplusplus
    NSLog(@"Old file: %@", oldFile);
    NSLog(@"New file: %@", newFile);
    NSLog(@"Patch file: %@", patchFile);
    return bsdiffpatch::patchFile([oldFile UTF8String], [newFile UTF8String], [patchFile UTF8String]);
#else
    NSLog(@"C++ is not supported");
    return -1; // Return an error code if C++ is not supported
#endif
}

@end
