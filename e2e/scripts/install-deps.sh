#!/usr/bin/env bash
set -euo pipefail

echo "=== Installing npm dependencies ==="
npm ci

echo "=== Installing Playwright browsers (Chromium + Firefox) ==="
npx playwright install --with-deps chromium firefox

echo "=== Dependencies installed successfully ==="
