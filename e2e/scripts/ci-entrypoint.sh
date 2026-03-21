#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"

cd "$E2E_DIR"

# Use pre-installed browsers from Docker image if available
export PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH:-/ms-playwright}

echo "=== CI Entrypoint ==="

# Step 1: Install dependencies
echo "--- Step 1: Installing dependencies ---"
bash "$SCRIPT_DIR/install-deps.sh"

# Step 2: Health check
BASE_URL="${BASE_URL:-http://localhost:4200}"
HEALTH_URL="${HEALTH_CHECK_URL:-${BASE_URL}/api/healthz}"
echo "--- Step 2: Health check against $HEALTH_URL ---"

MAX_RETRIES=30
RETRY_INTERVAL=1
for i in $(seq 1 $MAX_RETRIES); do
  if curl -skf "$HEALTH_URL" > /dev/null 2>&1; then
    echo "Backend is healthy!"
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "ERROR: Backend health check failed after ${MAX_RETRIES}s. Is the app running at $BASE_URL?"
    exit 1
  fi
  echo "Waiting for backend... ($i/$MAX_RETRIES)"
  sleep $RETRY_INTERVAL
done

# Step 3: Export credentials from environment
echo "--- Step 3: Exporting test credentials ---"
export EMPLOYEE_USERNAME="${EMPLOYEE_USERNAME:-employee1}"
export EMPLOYEE_PASSWORD="${EMPLOYEE_PASSWORD:-password123}"
export ADMIN_USERNAME="${ADMIN_USERNAME:-admin1}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-password123}"
export BASE_URL

# Step 4: Run tests
echo "--- Step 4: Running Playwright tests ---"
# Firefox on OpenShift: disable all sandbox layers (clone(CLONE_NEWUSER) blocked by drop:ALL + seccomp)
export MOZ_DISABLE_CONTENT_SANDBOX=1
export MOZ_DISABLE_GMP_SANDBOX=1
export MOZ_DISABLE_SOCKET_PROCESS_SANDBOX=1
export MOZ_DISABLE_RDD_SANDBOX=1
# Firefox needs writable HOME and fontconfig cache (OpenShift arbitrary UID has HOME=/)
export HOME=/tmp/firefox-home
mkdir -p "$HOME/.cache/fontconfig" "$HOME/.mozilla"
export XDG_CACHE_HOME="$HOME/.cache"
export XDG_CONFIG_HOME="$HOME/.config"
export FONTCONFIG_CACHE="$HOME/.cache/fontconfig"
export TEST_REPORTER="list,html"
export TEST_WORKERS=1  # Serialize browser launches to stay within 1Gi pod memory limit
export NODE_OPTIONS="--max-old-space-size=256"  # Cap Node.js heap for Playwright
export TEST_RETRIES="${TEST_RETRIES:-1}"
export BROWSER_PROJECT="${BROWSER_PROJECT:-all}"
set +e
bash "$SCRIPT_DIR/run-tests.sh"
TEST_EXIT_CODE=$?
set -e

echo "=== Tests finished with exit code: ${TEST_EXIT_CODE} ==="
exit "${TEST_EXIT_CODE}"
