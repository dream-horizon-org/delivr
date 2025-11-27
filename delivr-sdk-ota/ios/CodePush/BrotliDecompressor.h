#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * A utility class that handles Brotli decompression using iOS's built-in Compression framework.
 * Supports decompression of Brotli files of any compression level.
 * Requires iOS 14.0 or later.
 */
@interface BrotliDecompressor : NSObject

/**
 * Decompresses a single Brotli compressed file.
 * @param inputPath Path to the compressed .br file
 * @param outputPath Path where the decompressed file should be written
 * @param error If an error occurs, upon return contains an NSError object that describes the problem
 * @return YES if successful, NO if an error occurred
 */
+ (BOOL)decompressFile:(NSString *)inputPath toFile:(NSString *)outputPath error:(NSError **)error;

/**
 * Recursively decompresses all Brotli compressed files in a directory.
 * @param sourcePath Source directory containing .br files
 * @param destinationPath Destination directory for decompressed files
 * @param error If an error occurs, upon return contains an NSError object that describes the problem
 * @return YES if successful, NO if an error occurred
 */
+ (BOOL)decompressFiles:(NSString *)sourcePath toPath:(NSString *)destinationPath error:(NSError **)error;

@end

NS_ASSUME_NONNULL_END
