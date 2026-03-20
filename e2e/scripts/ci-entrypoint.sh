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
HEALTH_URL="${BASE_URL}/api/healthz"
echo "--- Step 2: Health check against $HEALTH_URL ---"

MAX_RETRIES=30
RETRY_INTERVAL=1
for i in $(seq 1 $MAX_RETRIES); do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
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
export TEST_REPORTER="html"
export TEST_RETRIES="${TEST_RETRIES:-1}"
export BROWSER_PROJECT="${BROWSER_PROJECT:-all}"
set +e
bash "$SCRIPT_DIR/run-tests.sh"
TEST_EXIT_CODE=$?
set -e

echo "=== Tests finished with exit code: ${TEST_EXIT_CODE} ==="
exit "${TEST_EXIT_CODE}"
