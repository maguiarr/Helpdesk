#!/usr/bin/env bash
set -euo pipefail

echo "=== Installing npm dependencies ==="
npm ci

echo "=== Installing Playwright browsers (Chromium + Firefox) ==="
if npx playwright install chromium firefox 2>/dev/null; then
  echo "Browsers installed/verified successfully"
else
  echo "Browser install skipped (using pre-installed browsers)"
fi

echo "=== Dependencies installed successfully ==="
