#import "BrotliDecompressor.h"
#import "CodePush.h"
#import <compression.h>

@implementation BrotliDecompressor

+ (BOOL)decompressFile:(NSString *)inputPath toFile:(NSString *)outputPath error:(NSError **)error {
    NSData *inputData = [NSData dataWithContentsOfFile:inputPath options:NSDataReadingMappedIfSafe error:error];
    if (!inputData) {
        return NO;
    }
    
    // Create a buffer for decompressed data
    size_t bufferSize = 65536;  // 64KB buffer
    NSMutableData *outputData = [NSMutableData dataWithLength:bufferSize];
    
    // Setup compression stream
    compression_stream stream;
    compression_status status = compression_stream_init(&stream, COMPRESSION_STREAM_DECODE, COMPRESSION_BROTLI);
    if (status != COMPRESSION_STATUS_OK) {
        if (error) {
            *error = [NSError errorWithDomain:@"CodePush" code:0 userInfo:@{NSLocalizedDescriptionKey: @"Failed to initialize Brotli decompression"}];
        }
        return NO;
    }
    
    // Setup input buffer
    stream.src_ptr = inputData.bytes;
    stream.src_size = inputData.length;
    
    NSMutableData *decompressedData = [NSMutableData data];
    
    do {
        // Setup output buffer
        stream.dst_ptr = outputData.mutableBytes;
        stream.dst_size = bufferSize;
        
        // Perform decompression
        status = compression_stream_process(&stream, 0);
        
        if (status == COMPRESSION_STATUS_ERROR) {
            compression_stream_destroy(&stream);
            if (error) {
                *error = [NSError errorWithDomain:@"CodePush" code:0 userInfo:@{NSLocalizedDescriptionKey: @"Brotli decompression failed"}];
            }
            return NO;
        }
        
        // Calculate how many bytes were written
        size_t bytesWritten = bufferSize - stream.dst_size;
        if (bytesWritten > 0) {
            [decompressedData appendBytes:outputData.bytes length:bytesWritten];
        }
        
    } while (status == COMPRESSION_STATUS_OK);
    
    compression_stream_destroy(&stream);
    
    // Write the decompressed data to file
    BOOL writeSuccess = [decompressedData writeToFile:outputPath options:NSDataWritingAtomic error:error];
    if (!writeSuccess) {
        return NO;
    }
    
    return YES;
}

+ (BOOL)decompressFiles:(NSString *)sourcePath toPath:(NSString *)destinationPath error:(NSError **)error {
    BOOL isDirectory;
    if (![[NSFileManager defaultManager] fileExistsAtPath:sourcePath isDirectory:&isDirectory] || !isDirectory) {
        if (error) {
            *error = [NSError errorWithDomain:@"CodePush" code:0 userInfo:@{NSLocalizedDescriptionKey: @"Source path does not exist or is not a directory"}];
        }
        return NO;
    }
    
    if (![[NSFileManager defaultManager] createDirectoryAtPath:destinationPath withIntermediateDirectories:YES attributes:nil error:error]) {
        return NO;
    }
    
    NSArray *contents = [[NSFileManager defaultManager] contentsOfDirectoryAtPath:sourcePath error:error];
    if (!contents) {
        return NO;
    }
    
    for (NSString *item in contents) {
        NSString *itemPath = [sourcePath stringByAppendingPathComponent:item];
        NSString *destItemPath = [destinationPath stringByAppendingPathComponent:item];
        
        BOOL isDirectory;
        if ([[NSFileManager defaultManager] fileExistsAtPath:itemPath isDirectory:&isDirectory]) {
            if (isDirectory) {
                if (![self decompressFiles:itemPath toPath:destItemPath error:error]) {
                    return NO;
                }
            } else {
                if ([item hasSuffix:@".br"]) {
                    NSString *decompressedPath = [destItemPath substringToIndex:destItemPath.length - 3];
                    if (![self decompressFile:itemPath toFile:decompressedPath error:error]) {
                        return NO;
                    }
                } else {
                    if (![[NSFileManager defaultManager] copyItemAtPath:itemPath toPath:destItemPath error:error]) {
                        return NO;
                    }
                }
            }
        }
    }
    
    return YES;
}

@end
