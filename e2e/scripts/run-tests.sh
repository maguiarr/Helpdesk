#!/usr/bin/env bash
set -euo pipefail

# Defaults (all from env vars, overridable via named args)
BASE_URL="${BASE_URL:-http://localhost:4200}"
BROWSER_PROJECT="${BROWSER_PROJECT:-all}"
RETRIES="${TEST_RETRIES:-0}"
WORKERS="${TEST_WORKERS:-}"
REPORTER="${TEST_REPORTER:-list}"

# Parse named args
while [[ $# -gt 0 ]]; do
  case $1 in
    --base-url) BASE_URL="$2"; shift 2 ;;
    --project) BROWSER_PROJECT="$2"; shift 2 ;;
    --retries) RETRIES="$2"; shift 2 ;;
    --workers) WORKERS="$2"; shift 2 ;;
    --reporter) REPORTER="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; shift ;;
  esac
done

CMD=(npx playwright test)

if [[ "$BROWSER_PROJECT" == "all" ]]; then
  CMD+=(--project=employee-chromium --project=employee-firefox --project=admin-chromium --project=admin-firefox)
else
  CMD+=(--project="$BROWSER_PROJECT")
fi

CMD+=(--retries="$RETRIES" --reporter="$REPORTER")

if [[ -n "$WORKERS" ]]; then
  CMD+=(--workers="$WORKERS")
fi

echo "=== Running Playwright tests ==="
echo "BASE_URL=$BASE_URL"
echo "Command: ${CMD[*]}"
echo ""

export BASE_URL
"${CMD[@]}"
