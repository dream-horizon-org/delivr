#!/usr/bin/env bash

echo "Running build script..."

rsync -r --verbose \
	--exclude='target' \
	--exclude='node_modules' \
	--exclude='build' \
	--exclude='.cache' \
	--exclude='.vscode' \
	--exclude='.husky' \
	--exclude='.config' \
	--exclude='.env' \
	./ ./target/dota