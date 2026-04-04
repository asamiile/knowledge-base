#!/bin/sh
set -e
cd /app
if [ ! -d node_modules/next ]; then
  npm ci
fi
exec "$@"
