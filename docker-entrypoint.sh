#!/bin/sh
# Docker entrypoint script to handle localhost -> host.docker.internal conversion

# Replace localhost/127.0.0.1 with host.docker.internal in DELIVR_BACKEND_URL
# This allows the container to reach services running on the host machine
if [ -n "$DELIVR_BACKEND_URL" ]; then
  export DELIVR_BACKEND_URL=$(echo "$DELIVR_BACKEND_URL" | \
    sed 's|http://localhost|http://host.docker.internal|g' | \
    sed 's|https://localhost|https://host.docker.internal|g' | \
    sed 's|http://127.0.0.1|http://host.docker.internal|g' | \
    sed 's|https://127.0.0.1|https://host.docker.internal|g')
  echo "DELIVR_BACKEND_URL converted to: $DELIVR_BACKEND_URL"
fi

# Execute the main command
exec "$@"

