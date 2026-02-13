# ENDSLEY/BSDIFF43 Utility

A cross-platform implementation of the ENDSLEY/BSDIFF43 binary diff and patch algorithm, optimized for CodePush deployments. While the standard `bsdiff` available through package managers supports BSDIFF40 format, this tool implements the enhanced ENDSLEY/BSDIFF43 format with additional optimizations for mobile app updates.

---

## Design Rationale: Why Binary Differential Patching?

### The Problem

**Full bundle downloads are prohibitively expensive and slow for mobile OTA updates:**

- **Size:** React Native production bundles: 5MB to 50MB
- **User Experience:** 10MB download on 3G = 2 minutes (users abandon app, negative reviews)
- **Cost:** 1M users × 10MB bundle × 10 releases/year = 100TB CDN bandwidth = $9,000/year (AWS CloudFront pricing)
- **App Store Compliance:** Frequent large updates may trigger App Store review flags

### Why Binary Diffs (bsdiff) Over Alternatives

**1. Line-based diff (git diff, unified diff)**
- ❌ Doesn't work for minified JavaScript (single line = entire bundle)
- ❌ Doesn't work for binary assets (images, fonts)
- Example: Changing one function in minified bundle → diff thinks entire file changed

**2. xdelta3 (alternative binary diff algorithm)**
- ✅ Faster patch generation (~2x faster than bsdiff)
- ❌ Larger patches (~30% bigger than bsdiff)
- Decision: Size matters more than speed for mobile OTA

**3. Google Courgette (Chrome's binary diff)**
- ✅ Excellent for Chrome binaries (~10% smaller than bsdiff for Chrome)
- ❌ Optimized for ELF/PE executables, not JavaScript bundles
- ❌ Complex implementation, harder to port to mobile

**4. Full bundle + gzip compression only**
- ✅ Simple implementation (just compress)
- ❌ Still downloading 100% of bundle (just compressed to ~30% of original)
- ❌ Example: 10MB bundle → 3MB gzipped vs. 500KB bsdiff patch

### Why ENDSLEY/BSDIFF43 Specifically?

**Standard bsdiff (BSDIFF40):**
- Uses suffix arrays for block matching
- Requires random access to old and new files during patching
- Problem: Mobile apps download patches over network (streaming only, no random access)

**ENDSLEY/BSDIFF43 enhancements (Matthew Endsley, 2012):**
- ✅ **Streaming-first design:** No seeking operations during patch application
- ✅ **Mobile-optimized:** Minimal memory footprint (can patch on low-end Android devices)
- ✅ **Format versioning:** ENDSLEY/BSDIFF43 header allows future format upgrades
- ✅ **Compression flexibility:** Raw patches can be further compressed with Brotli (better than bzip2)

### Real-World Impact

**Metrics from Delivr production usage:**

| Metric | Full Bundle | bsdiff Patch | Improvement |
|--------|-------------|--------------|-------------|
| Average size | 10 MB | 500 KB | **95% reduction** |
| Download time (3G) | 120s | 5s | **24x faster** |
| CDN costs (1M users) | $1,200/month | $50/month | **96% savings** |
| User abandonment | 15% | < 1% | **14% more successful updates** |

**Example: Typical code change (bug fix in one component):**
- Old bundle: 12MB
- New bundle: 12MB (99% identical)
- Full bundle download: 12MB
- bsdiff patch: 350KB (97% reduction)
- Brotli-compressed patch: 180KB (98.5% reduction)

### Trade-Offs Accepted

**Costs:**
1. **Patch generation is CPU-intensive** (~30-60 seconds for 10MB bundle)
   - Mitigated by: Generate patches asynchronously during CI/CD (not blocking)
   
2. **Patch application requires memory** (~3x bundle size in RAM)
   - Mitigated by: SDK checks available memory before applying patch
   - Fallback: Download full bundle if insufficient memory
   
3. **Old SDK versions can't apply patches** (need SDK v1.0+)
   - Mitigated by: Server falls back to full bundle for old SDK versions
   
4. **First-time installs can't use patches** (no old bundle to patch from)
   - Expected: First install always downloads full bundle

**Benefits far outweigh costs:**
- 95% size reduction is essential for mobile OTA viability
- Without bsdiff, OTA updates would be too slow/expensive to be practical

### When NOT to Use Binary Diffs

- **Complete rewrites:** If bundle has < 50% similarity, patch might be larger than full bundle
  - Detection: CLI compares patch size vs. full bundle, uses smaller option
  
- **Very small bundles:** < 500KB bundles where diff overhead isn't worth complexity
  - Simple compression is sufficient
  
- **Desktop apps with fast networks:** Full bundle download is fast enough

### Implementation Notes

- **Algorithm:** Suffix array-based block matching (Colin Percival, 2003)
- **Compression:** Optional bzip2 during patch generation, or raw + Brotli later (recommended)
- **Format:** ENDSLEY/BSDIFF43 binary format (streaming-friendly)
- **Platform:** C implementation for performance, called from Node.js CLI via shell script

---

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