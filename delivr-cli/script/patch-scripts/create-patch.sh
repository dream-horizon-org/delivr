#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ "$#" -ne 4 ]; then
    echo "Usage: $0 <old_bundle> <new_bundle> <patch_file> <compression>"
    echo "Example: $0 path/to/old.bundle path/to/new.bundle directory/to/bundle.patch false"
    exit 1
fi

# Convert to absolute paths
OLD_BUNDLE="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
NEW_BUNDLE="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
COMPRESSION="$4"

# Check if third argument is a file path
if [[ -f "$3" ]]; then
    echo "Error: Third argument must be a directory path, not a file path"
    exit 1
fi

PATCH_DIR="$3"
PATCH_FILE="$PATCH_DIR/bundle.patch"

echo "==Using Paths=="
echo "Old bundle: $OLD_BUNDLE"
echo "New bundle: $NEW_BUNDLE"
echo "Patch file: $PATCH_FILE"

# Create the patch using bsdiff43
echo "Creating patch using bsdiff43..."
"$SCRIPT_DIR/../../../bsdiff/bsdiff43" diff "$OLD_BUNDLE" "$NEW_BUNDLE" "$PATCH_FILE" "$COMPRESSION"

if [ $? -eq 0 ]; then
    echo "===Successfully created patch==="
    echo "Old bundle Size: $(wc -c < "$OLD_BUNDLE") bytes"
    echo "New bundle Size: $(wc -c < "$NEW_BUNDLE") bytes"
    echo "Patch Size: $(wc -c < "$PATCH_FILE") bytes"
    echo "Patch file created at: $PATCH_FILE"
    
    # Verify patch format
    echo "==Verifying patch format==="
    if head -c 16 "$PATCH_FILE" | grep -q "ENDSLEY/BSDIFF43"; then
        echo "Verified: Patch is in ENDSLEY/BSDIFF43 format"
    else
        echo "Patch is not in ENDSLEY/BSDIFF43 format"
        exit 1
    fi
else
    echo "Failed to create patch"
    exit 1
fi
