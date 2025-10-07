#!/bin/bash
set -e

BUNDLE_NAME="main"
DEST="$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"
BUNDLE_FILE="$DEST/$BUNDLE_NAME.jsbundle"

echo "Dota - BUNDLE_FILE: $BUNDLE_FILE"
echo "Dota - CONFIGURATION: $CONFIGURATION"

if [[ "$CONFIGURATION" != "Release" ]]; then
    echo "Skipping CodePush bundle copy for ${CONFIGURATION} build"
    exit 0
fi


if [[ ! -f "$BUNDLE_FILE" ]]; then
    echo "Warning: Bundle not found at $BUNDLE_FILE"
    exit 0
fi

APP_ROOT="$SRCROOT/.."
DOTA_DIR="$APP_ROOT/.dota"
CODEPUSH_DIR="$DOTA_DIR/ios"

# Create .dota and ios directories if they don't exist
echo "Dota - Creating directory structure at $CODEPUSH_DIR"
mkdir -p "$CODEPUSH_DIR"

echo "Dota - Copying bundle to CodePush directory"
cp "$BUNDLE_FILE" "$CODEPUSH_DIR/$BUNDLE_NAME.jsbundle"

if [[ -d "$DEST/assets" ]]; then
    echo "Dota - Copying assets to CodePush directory"
    cp -R "$DEST/assets" "$CODEPUSH_DIR/"
fi