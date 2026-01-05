#!/bin/sh
set -e

# Fix permissions for the data directory
# We check ownership of /app/data and if it's not owned by nextjs (uid 1001), we chown it.
# This is necessary because when mounting volumes, the directory might be owned by root.
if [ "$(id -u)" = "0" ]; then
    chown -R nextjs:nodejs /app/data
    exec su-exec nextjs "$@"
fi

exec "$@"
