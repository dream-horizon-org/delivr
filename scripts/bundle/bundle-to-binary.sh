#!/bin/bash

###############################################################################
# Generate a HBC bundle from a given JS bundle.
#
# Usage:
# ./bundle-to-binary.sh <path-to-js-bundle> <path-to-output-hbc-file>
#
# Additionally, the following environment variables can be used to modify behaviour:
# 
# 1. MAKE_SOURCEMAP: Set if a sourcemap is required. Note that this is only the bytecode 
# sourcemap and it is up to the caller to compose it with the JS sourcemap
#
###############################################################################

set -e

#####################################################################
# Validate inputs

if [[ -z "$1" || -z "$2" ]]; then
  echo "Failed to run bundle-to-binary.sh. No input file provided. Please refer to documentation in the script."
  exit 1
else
  JS_BUNDLE_FILE="$1"
  HBC_BUNDLE_FILE="$2"
fi

#####################################################################
# Compile JS

# Choose hermesc exec based on os
HERMES_OS_BIN="linux64-bin"
if [[ "${OSTYPE}" == "darwin"* ]]; then
  HERMES_OS_BIN="osx-bin"
fi
HERMESC="node_modules/react-native/sdks/hermesc/${HERMES_OS_BIN}/hermesc"

HBC_SOURCEMAP_FLAGS="-output-source-map"
EXTRA_FLAGS=""
if [[ ! -z "${BASE_BUNDLE_PATH}" ]]; then
  if [[ -f "${BASE_BUNDLE_PATH}" ]]; then
    echo "Using base bytecode flag: ${BASE_BUNDLE_PATH}"
    EXTRA_FLAGS="--base-bytecode ${BASE_BUNDLE_PATH}"
  else
    echo "Error: Base bytecode file not found: ${BASE_BUNDLE_PATH}"
  fi
fi

# create binary bundle from js bundle (-O=optmised, -w=no-warnings) 
${HERMESC} -emit-binary -out ${HBC_BUNDLE_FILE} ${JS_BUNDLE_FILE} -O -w ${HBC_SOURCEMAP_FLAGS} ${EXTRA_FLAGS}

echo "Wrote HBC output to: ${HBC_BUNDLE_FILE}"
