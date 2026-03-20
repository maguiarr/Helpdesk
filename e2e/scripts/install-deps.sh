#!/usr/bin/env bash
set -euo pipefail

echo "=== Installing npm dependencies ==="
npm ci

echo "=== Installing Playwright browsers (Chromium + Firefox) ==="
if [ -d "${PLAYWRIGHT_BROWSERS_PATH:-}" ] && ls "${PLAYWRIGHT_BROWSERS_PATH}"/chromium-* &>/dev/null; then
  echo "Browsers already installed at $PLAYWRIGHT_BROWSERS_PATH — skipping download"
else
  npx playwright install chromium firefox
fi

echo "=== Dependencies installed successfully ==="
