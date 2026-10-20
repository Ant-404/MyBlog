#!/bin/sh
set -eu

# Run with sh; no executable bit or caller working directory is required.
backend_path=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
profile=${1:-prod-linux}
case "$profile" in
    prod-linux|prod-windows|default) ;;
    *) printf '%s\n' 'Usage: sh start-backend.sh [prod-linux|prod-windows|default]' >&2; exit 2 ;;
esac
cd "$backend_path"
exec java -jar target/myblog-backend-0.1.0.jar "--spring.profiles.active=$profile"
