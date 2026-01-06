#!/bin/sh
set -e

# Support PUID/PGID
if [ "$(id -u)" = "0" ]; then
    PUID=${PUID:-1001}
    PGID=${PGID:-1001}

    if [ "$PUID" != "1001" ] || [ "$PGID" != "1001" ]; then
        echo "Setting UID to $PUID and GID to $PGID"
        
        # Modify group nodejs gid
        sed -i "s/^nodejs:x:[0-9]\+:/nodejs:x:$PGID:/" /etc/group
        # Modify user nextjs uid and gid
        sed -i "s/^nextjs:x:[0-9]\+:[0-9]\+:/nextjs:x:$PUID:$PGID:/" /etc/passwd
    fi

    # Fix permissions for the data directory
    # We check ownership of /app/data and if it's not owned by nextjs, we chown it.
    # This is necessary because when mounting volumes, the directory might be owned by root.
    chown -R nextjs:nodejs /app/data

    # Handle custom base path at runtime
    if [ -n "$URL_BASE_PATH" ]; then
        echo "Configuring custom base path: $URL_BASE_PATH"
        # Ensure it starts with / and remove trailing slash
        BASE_PATH=$(echo "/$URL_BASE_PATH" | sed 's/\/\//\//g' | sed 's/\/$//')
        
        # Update Next.js manifests
        if [ -f ".next/required-server-files.json" ]; then
            sed -i "s|\"basePath\":\"\"|\"basePath\":\"$BASE_PATH\"|g" .next/required-server-files.json
        fi
        if [ -f ".next/routes-manifest.json" ]; then
            sed -i "s|\"basePath\":\"\"|\"basePath\":\"$BASE_PATH\"|g" .next/routes-manifest.json
        fi
    fi
    
    exec su-exec nextjs "$@"
fi

exec "$@"
