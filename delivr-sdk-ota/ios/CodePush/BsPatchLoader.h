#import <Foundation/Foundation.h>

@interface BsPatchLoader : NSObject

+ (int)applyPatchWithOldFile:(NSString *)oldFile
                     newFile:(NSString *)newFile
                   patchFile:(NSString *)patchFile;

@end
