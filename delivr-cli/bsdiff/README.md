# ENDSLEY/BSDIFF43 Utility

A cross-platform implementation of the ENDSLEY/BSDIFF43 binary diff and patch algorithm, optimized for CodePush deployments. While the standard `bsdiff` available through package managers supports BSDIFF40 format, this tool implements the enhanced ENDSLEY/BSDIFF43 format with additional optimizations for mobile app updates.

## Why ENDSLEY/BSDIFF43?

- **Optimized for Mobile**: Specifically tuned for React Native and Cordova app updates
- **Streaming-First**: No seeking operations during patch application, perfect for mobile downloads
- **Minimal Resource Usage**: Efficient streaming with minimal disk I/O and memory footprint
- **Cross-Platform**: Works reliably on iOS, Android, and Windows platforms
- **Integration-Ready**: Designed for easy integration with build and deployment systems
- **Smaller Updates**: Generates optimized patch sizes for faster downloads
- **Compression Options**: Flexible compression support (raw, bzip2, Brotli) for different scenarios

## Credits

Built using the bsdiff/bspatch library:
- Original bsdiff algorithm by Colin Percival (2003-2005)
- Enhanced ENDSLEY/BSDIFF43 version by Matthew Endsley (2012)
- Source: https://github.com/mendsley/bsdiff

## Prerequisites

### Dependencies
- bzip2 library (for compression support)
  - **macOS**: Pre-installed
  - **Ubuntu/Debian**: `sudo apt-get install libbz2-dev`
  - **CentOS/RHEL**: `sudo yum install bzip2-devel`
  - **Windows**: Available through WSL package manager

## Usage

### Building from Source
To use bsdiff/bspatch directly without code-push-standalone, follow these steps:

```bash
cd cli/bsdiff
make clean
make
```

### Creating a Patch
```bash
./bsdiff43 diff <old_file> <new_file> <patch_file> <compression>
```

Parameters:
- `old_file`: Path to the original bundle file
- `new_file`: Path to the new bundle file
- `patch_file`: Path where the patch file will be saved
- `compression`: Boolean flag (true/false)
  - `false` (default): Creates a raw patch that can be further compressed using Brotli
  - `true`: Uses built-in bzip2 compression (Note: cannot be further compressed)

Example:
```bash
./bsdiff43 diff old.bundle new.bundle patch.diff false
```

### Applying a Patch
```bash
./bsdiff43 patch <old_file> <patch_file> <output_file> <is_patch_compressed>
```

Parameters:
- `old_file`: Path to the original bundle file
- `patch_file`: Path to the patch file
- `output_file`: Path where the reconstructed new file will be saved
- `is_patch_compressed`: Boolean flag (true/false)
  - Must match the compression setting used when creating the patch

Example:
```bash
./bsdiff43 patch old.bundle patch.diff reconstructed.bundle false
```

### Compression Notes
- When `compression=false`, the patch is created in raw format
  - This is recommended when using with code-push-standalone as it allows for Brotli compression later
  - Results in better compression ratios in most cases
- When `compression=true`, the patch is compressed using bzip2
  - Cannot be further compressed using other algorithms
  - Useful for standalone usage without code-push-standalone

## File Structure

- `bsdiff/` - Contains the binary diff/patch utility
  - `bsdiff43` - The compiled executable
  - `bsdiff.c`, `bsdiff.h` - Source for diff functionality
  - `bspatch.c`, `bspatch.h` - Source for patch functionality
  - `main.c` - Main program entry point
  - `Makefile` - Build configuration
  - `LICENSE` - BSD 2-clause license

### Error Handling

Both functions return:
- `0` on success
- Non-zero value on error

## License

Licensed under BSD 2-clause:
```
Copyright 2003-2005 Colin Percival
Copyright 2012 Matthew Endsley
All rights reserved
```

Requirements:
1. Keep the copyright notice and license text in source files
2. Include the same copyright notice and license in binary distributions

See `bsdiff/LICENSE` for complete license text.