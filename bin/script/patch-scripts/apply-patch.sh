#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Print detailed usage
print_usage() {
    echo "Usage: $0 <old_bundle> <patch_file> <output_bundle> <is_patch_compressed>"
    echo "Example: $0 originalBundle/index.android.bundle patch/bundle.patch patchedBundle/index.android.bundle false"
    echo ""
    echo "Arguments:"
    echo "  old_bundle    - Path to the original bundle file"
    echo "  patch_file    - Path to the patch file"
    echo "  output_bundle - Path where the new bundle will be created"
    echo ""
    echo "Current directory: $(pwd)"
}

# Check number of arguments
if [ "$#" -ne 4 ]; then
    echo "Error: Incorrect number of arguments"
    print_usage
    exit 1
fi

# Convert to absolute paths, handling non-existent directories
OLD_BUNDLE="$1"
PATCH_FILE="$2"
OUTPUT_BUNDLE="$3"
IS_PATCH_COMPRESSED="$4"

# If paths are relative, make them absolute from current directory
if [[ ! "$OLD_BUNDLE" = /* ]]; then
    OLD_BUNDLE="$(pwd)/$OLD_BUNDLE"
fi

if [[ ! "$PATCH_FILE" = /* ]]; then
    PATCH_FILE="$(pwd)/$PATCH_FILE"
fi

if [[ ! "$OUTPUT_BUNDLE" = /* ]]; then
    OUTPUT_BUNDLE="$(pwd)/$OUTPUT_BUNDLE"
fi

echo "Using paths:"
echo "Old bundle: $OLD_BUNDLE"
echo "Patch file: $PATCH_FILE"
echo "Output bundle: $OUTPUT_BUNDLE"
echo ""

# Check if input files exist with detailed error messages
if [ ! -e "$OLD_BUNDLE" ]; then
    echo "Error: Old bundle file not found"
    echo "Path: $OLD_BUNDLE"
    echo "Directory contents of $(dirname "$OLD_BUNDLE"):"
    ls -la "$(dirname "$OLD_BUNDLE")" 2>/dev/null || echo "Directory does not exist"
    exit 1
fi

if [ ! -f "$OLD_BUNDLE" ]; then
    echo "Error: Old bundle exists but is not a regular file"
    echo "Path: $OLD_BUNDLE"
    ls -la "$OLD_BUNDLE"
    exit 1
fi

if [ ! -e "$PATCH_FILE" ]; then
    echo "Error: Patch file not found"
    echo "Path: $PATCH_FILE"
    echo "Directory contents of $(dirname "$PATCH_FILE"):"
    ls -la "$(dirname "$PATCH_FILE")" 2>/dev/null || echo "Directory does not exist"
    exit 1
fi

if [ ! -f "$PATCH_FILE" ]; then
    echo "Error: Patch file exists but is not a regular file"
    echo "Path: $PATCH_FILE"
    ls -la "$PATCH_FILE"
    exit 1
fi

# Create output directory if it doesn't exist
OUTPUT_DIR="$(dirname "$OUTPUT_BUNDLE")"
if ! mkdir -p "$OUTPUT_DIR"; then
    echo "Error: Failed to create output directory"
    echo "Path: $OUTPUT_DIR"
    exit 1
fi

# Verify patch format
if ! head -c 16 "$PATCH_FILE" 2>/dev/null | grep -q "ENDSLEY/BSDIFF43"; then
    echo "Warning: Patch is not in ENDSLEY/BSDIFF43 format"
    echo "First 16 bytes of patch file:"
    head -c 16 "$PATCH_FILE" | xxd
fi

# Apply the patch using bsdiff43
echo "Applying patch..."
"$SCRIPT_DIR/../../../bsdiff/bsdiff43" patch "$OLD_BUNDLE" "$OUTPUT_BUNDLE" "$PATCH_FILE" "$IS_PATCH_COMPRESSED"

if [ $? -eq 0 ]; then
    echo "Successfully applied patch:"
    echo "Old bundle: $(wc -c < "$OLD_BUNDLE") bytes"
    echo "Patch size: $(wc -c < "$PATCH_FILE") bytes"
    echo "New bundle: $(wc -c < "$OUTPUT_BUNDLE") bytes"
    echo "Output file: $OUTPUT_BUNDLE"
else
    echo "Failed to apply patch"
    echo "Command: $SCRIPT_DIR/../../bsdiff/bsdiff43 patch $OLD_BUNDLE $OUTPUT_BUNDLE $PATCH_FILE"
    exit 1
fi
