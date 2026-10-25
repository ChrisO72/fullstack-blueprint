#!/bin/sh
set -eu
sentry_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
case "${1:-}" in
  setup|up|down)
    cd "$sentry_dir/../.."
    exec node --import tsx "$sentry_dir/manage.ts" "$1"
    ;;
  *) echo "Usage: telemetry/sentry/stack.sh setup|up|down" >&2; exit 1 ;;
esac
