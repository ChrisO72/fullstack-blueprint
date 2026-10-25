#!/bin/sh
set -eu
telemetry_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
case "${1:-}" in
  setup|up|down) "$telemetry_dir/sentry/stack.sh" "$1" ;;
  *) echo "Usage: telemetry/stack.sh setup|up|down" >&2; exit 1 ;;
esac
