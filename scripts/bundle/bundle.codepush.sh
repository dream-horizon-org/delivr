#!/bin/bash

export MAKE_SOURCEMAP=0 # Always make sourcemap for codepush
export BUNDLE_PATH=.codepush
export ASSETS_PATH=.codepush
export PLATFORM=$1
export SOURCE_MAP_PATH="${BUNDLE_PATH}"

rm -rf $BUNDLE_PATH $ASSETS_PATH
rm -rf $SOURCE_MAP_PATH
mkdir -p $BUNDLE_PATH $ASSETS_PATH
mkdir -p $SOURCE_MAP_PATH

./packages/scripts/bundle/bundle.sh --dev false

