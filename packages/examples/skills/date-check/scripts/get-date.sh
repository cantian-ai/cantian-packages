#!/usr/bin/env bash
set -euo pipefail

mode="date"
tz=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --date)
      mode="date"
      shift
      ;;
    --time)
      mode="time"
      shift
      ;;
    --iso)
      mode="iso"
      shift
      ;;
    --timestamp)
      mode="timestamp"
      shift
      ;;
    --tz)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --tz" >&2
        exit 1
      fi
      tz="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -n "$tz" ]]; then
  export TZ="$tz"
fi

case "$mode" in
  date)
    date '+%Y-%m-%d'
    ;;
  time)
    date '+%H:%M:%S'
    ;;
  iso)
    date '+%Y-%m-%dT%H:%M:%S%z'
    ;;
  timestamp)
    date '+%s'
    ;;
esac
