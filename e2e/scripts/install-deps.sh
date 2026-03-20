#!/usr/bin/env bash
set -euo pipefail

echo "=== Installing npm dependencies ==="
npm ci

echo "=== Installing Playwright browsers (Chromium + Firefox) ==="
npx playwright install chromium firefox

echo "=== Dependencies installed successfully ==="
