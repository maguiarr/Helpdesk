# HelpDesk Pro — OpenShift Deployment Troubleshooting

**Cluster:** OpenShift on AWS
**Namespace:** your OpenShift namespace
**Helm release:** `helpdesk-pro`

---

## Resolved Issues

### 1. Bitnami Subchart Image Pulls (RESOLVED)

Replaced Bitnami PostgreSQL and Keycloak subcharts with custom Helm templates that use standard container images (`postgres:16`, `quay.io/keycloak/keycloak:25.0`). This eliminated all image pull issues (403 Forbidden from GHCR, manifest unknown from Docker Hub, Bitnami security verification failures).

### 2. PostgreSQL Resource Name Collision (RESOLVED)

Both the top-level PostgreSQL subchart and Keycloak's bundled PostgreSQL dependency created resources named `helpdesk-pro-postgresql`. Fixed by disabling Keycloak's bundled PostgreSQL (`keycloak.postgresql.enabled: false`) and pointing Keycloak at the top-level PostgreSQL via `externalDatabase`.

### 3. Destructive CI/CD Cleanup (RESOLVED)

The `deploy.yml` workflow had a "Clean up stale resources" step that unconditionally deleted ALL deployments, statefulsets, and PVCs on every push — wiping the PostgreSQL database. Fixed by moving resource deletion inside the failed release check, so it only runs when the Helm release is in `failed` or `pending-install` state.

### 4. Keycloak CORS / webOrigins (RESOLVED)

`webOrigins: "+"` in `realm-export.json` doesn't work with wildcard `redirectUris: "https://*"` — Keycloak can't derive concrete origins from a wildcard. Fixed by setting `webOrigins: "*"` in the realm export.

### 5. Keycloak `--override=true` Flag (RESOLVED)

`--override=true` is not a valid Keycloak 25 CLI argument. Removed it along with `KC_SPI_IMPORT_DIR` and `KC_SPI_IMPORT_STRATEGY` env vars (also non-functional in Keycloak 25). The default `--import-realm` behavior (`IGNORE_EXISTING`) is correct: the realm imports once on first boot, and subsequent changes persist in the database via PVC.

### 6. Jenkins OIDC Scope Overload (RESOLVED)

The Jenkins OIC plugin's `wellKnown` auto-discovery reads `scopes_supported` from Keycloak's well-known endpoint and requests ALL of them (`openid roles web-origins acr address microprofile-jwt offline_access phone basic profile email`). Keycloak returns "something went wrong" because the Jenkins client isn't authorized for all those scopes.

**Root cause:** `wellKnown` auto-discovery has no way to limit requested scopes.

**Fix:** Switched from `wellKnown` to `manual` server configuration in JCasC (`jenkins/casc/jenkins.yaml` and `helm/templates/jenkins-casc-configmap.yaml`), specifying each endpoint URL explicitly and setting `scopes: "openid email profile"`.

Key details discovered during implementation:
- The `manual` config requires a mandatory `issuer` field (not documented in the plan)
- The correct field name is `scopes` (on `OicServerManualConfiguration`), not `scopesOverride` — confirmed by decompiling the plugin JAR
- Browser-facing URLs (`authorizationServerUrl`, `endSessionUrl`) use `KEYCLOAK_BROWSER_URL` (localhost:8180 locally), while server-to-server URLs (`tokenServerUrl`, `jwksServerUrl`, `userInfoServerUrl`) use `KEYCLOAK_URL` (keycloak:8180 on the Docker network)
- Plugin version pinned to `oic-auth:4.668.v653c6b_c6cb_f5` in `jenkins/plugins.txt`

### 7. Keycloak Realm Import Broken by Invalid `defaultClientScopes` (RESOLVED)

Adding `defaultClientScopes: ["openid", "email", "profile", "roles"]` to the `helpdesk-jenkins` client in `realm-export.json` caused realm import failures. Keycloak's `defaultClientScopes` references **client scope objects** that must be explicitly defined in the realm export — the names don't auto-resolve to built-in scopes.

**Symptoms:**
- Keycloak log: `Referenced client scope 'openid' doesn't exist. Ignoring`
- All clients broken — `helpdesk-frontend` returned 400 `invalid_redirect_uri`
- The frontend appeared to fail even though only the Jenkins client had the bad field

**Fix:** Removed `defaultClientScopes` and `optionalClientScopes` from the Jenkins client in both `keycloak/realm-export.json` (local) and `helm/realm-export.json` (OpenShift). The scope restriction is handled client-side by Jenkins's `scopes` field in the manual config instead.

**Recovery procedure** (when realm is already corrupted in the DB):
1. Scale Keycloak to 0: `oc scale deploy/helpdesk-pro-keycloak --replicas=0`
2. Drop Keycloak tables (preserving app data):
   ```bash
   oc exec sts/helpdesk-pro-postgresql -n <namespace> -- psql -U helpdesk -c "
   DO \$\$ DECLARE r RECORD;
   BEGIN
     FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public'
               AND tablename NOT IN ('Tickets','__EFMigrationsHistory')) LOOP
       EXECUTE 'DROP TABLE IF EXISTS public.\"' || r.tablename || '\" CASCADE';
     END LOOP;
   END \$\$;"
   ```
3. Scale Keycloak back to 1: `oc scale deploy/helpdesk-pro-keycloak --replicas=1`
4. Keycloak reimports the realm from the ConfigMap on startup

**Also caught:** Removing the `defaultClientScopes` field left a trailing comma in the JSON, causing a parse error (`Unexpected character '}'`). Always validate JSON after edits: `python3 -c "import json; json.load(open('helm/realm-export.json'))"`.

### 8. Jenkins Integration — Realm Changes Require Database Reset (RESOLVED)

When integrating Jenkins (OIDC-authenticated via Keycloak) into the project, updating the Keycloak realm ConfigMap (adding the `helpdesk-jenkins` client, `helpdesk-tester` role, and `tester1` user) is **not enough** — Keycloak must also reimport the realm from scratch.

**Why a database reset is needed:**

Keycloak stores its entire realm configuration (clients, roles, users, scopes) in PostgreSQL, not in config files. The `--import-realm` flag only imports from the JSON file **once** — on the very first startup when the realm doesn't exist in the database yet. On every subsequent restart, Keycloak sees the `helpdesk` realm already exists in PostgreSQL and **skips the import entirely** (`IGNORE_EXISTING` strategy). This means:

- You update the ConfigMap with a new client like `helpdesk-jenkins` — Helm deploys it successfully
- Keycloak restarts, sees the realm in the DB, ignores the updated JSON file
- The `helpdesk-jenkins` client never gets created in Keycloak
- Jenkins redirects to Keycloak for login, Keycloak returns `400 Invalid parameter: redirect_uri` because it has no record of that client

The only way to force Keycloak to reimport is to **delete the realm from the database** so that on next startup, Keycloak sees no realm and imports the full JSON again.

**Recovery procedure — full database reset:**

```bash
# 1. Scale down Keycloak and backend (backend holds a DB connection)
oc scale deployment helpdesk-pro-keycloak -n maguiarr-dev --replicas=0
oc scale deployment helpdesk-pro-backend -n maguiarr-dev --replicas=0

# 2. Wait a few seconds for pods to terminate, then drop and recreate the database
oc exec -n maguiarr-dev $(oc get pod -n maguiarr-dev -l app.kubernetes.io/name=postgresql -o name) -- psql -U helpdesk -d postgres -c "DROP DATABASE helpdesk;"
oc exec -n maguiarr-dev $(oc get pod -n maguiarr-dev -l app.kubernetes.io/name=postgresql -o name) -- psql -U helpdesk -d postgres -c "CREATE DATABASE helpdesk;"

# 3. Scale everything back up — Keycloak reimports the realm, backend re-runs migrations
oc scale deployment helpdesk-pro-keycloak -n maguiarr-dev --replicas=1
oc scale deployment helpdesk-pro-backend -n maguiarr-dev --replicas=1
```

**Important notes:**
- The DROP and CREATE must be separate commands (`psql -c` wraps multi-statement strings in a transaction, and `DROP DATABASE` cannot run inside a transaction)
- The backend must be scaled down first — PostgreSQL refuses to drop a database that has active connections
- This wipes **all** application data (tickets, etc.) since it drops the entire database. The backend's EF Core `Migrate()` recreates the schema on startup
- For a less destructive approach, use the selective Keycloak table drop from issue #7 above, which preserves the `Tickets` and `__EFMigrationsHistory` tables

**When you need this procedure:**
- Any time you add, remove, or modify clients, roles, or users in the Keycloak realm ConfigMap
- After the first deploy of a new Keycloak client (like Jenkins) — the first deploy creates the ConfigMap but Keycloak already imported the old realm
- This is a **two-deploy pattern**: first deploy updates the ConfigMap, then you reset the DB so Keycloak reimports, bringing the database in sync with the new ConfigMap

### 9. OpenShift Sandbox Route Host Restriction (RESOLVED)

OpenShift Developer Sandbox does not allow setting `spec.host` on Route resources — you get: `you do not have permission to set the host field of the route`. Routes must let OpenShift auto-assign the hostname.

**Fix:** Removed the conditional `host:` field from `helm/templates/jenkins-route.yaml`. The `jenkins.route.host` Helm value is still used by the Keycloak realm ConfigMap (for the OIDC redirect URI) but no longer sets the route's host.

**Gotcha with `JENKINS_HOST` secret:** The secret value must be the **bare hostname only** — no `https://` prefix. The Helm template already prepends `https://` in the redirect URI, so including the protocol in the secret produces `https://https://...` which Keycloak rejects as an invalid redirect URI.

Correct: `helpdesk-pro-jenkins-maguiarr-dev.apps.rm1.0a51.p1.openshiftapps.com`
Wrong: `https://helpdesk-pro-jenkins-maguiarr-dev.apps.rm1.0a51.p1.openshiftapps.com`

### 10. Jenkins RBAC — Missing `realm_roles` Token Claim (RESOLVED)

After deploying Jenkins with Keycloak OIDC authentication, users could log in but had no permissions — "Manage Jenkins" was missing from the sidebar, and the auto-created "Run-Playwright-Tests" job was invisible even to `admin1`.

**Root cause:** The Jenkins CasC sets `groupsFieldName: "realm_roles"`, expecting a **top-level** `realm_roles` claim in the ID token. However, Keycloak by default puts realm roles in a **nested** structure at `realm_access.roles`. The `helpdesk-jenkins` client had no protocol mapper to flatten this into a top-level claim. Jenkins OIC plugin logged: `idToken and userInfo did not contain group field name: realm_roles`.

**Fix:** Added a **User Realm Role** protocol mapper to the `helpdesk-jenkins` client in Keycloak:
- **Name:** `realm_roles`
- **Token Claim Name:** `realm_roles`
- **Type:** `oidc-usermodel-realm-role-mapper`
- **Add to ID token / access token / userinfo:** all ON
- **Multivalued:** ON

Also added `scopeMappings` for the `helpdesk-jenkins` client in the realm export, granting access to `employee`, `helpdesk-admin`, and `helpdesk-tester` roles.

**Files changed:**
- `keycloak/realm-export.json` — Added `protocolMappers` and `scopeMappings` for `helpdesk-jenkins`
- `helm/templates/keycloak-realm-configmap.yaml` — Same changes for Helm-deployed realm

**Important:** After making this change in the Admin UI, you must **log out of Jenkins and Keycloak completely** to get a fresh token with the new claim. The Keycloak logout URL is: `https://<keycloak-route>/realms/helpdesk/protocol/openid-connect/logout`

### 11. Jenkins CSRF 403 "No valid crumb" Behind Reverse Proxy (RESOLVED)

Clicking "Build with Parameters" → "Build" returned `HTTP 403 No valid crumb was included in the request`. This is a classic Jenkins-behind-reverse-proxy issue.

**Root cause:** Jenkins CSRF crumb validation includes the client IP by default. OpenShift's HAProxy router changes the client IP between the initial page load and the form submission, causing a crumb mismatch.

**Fix:** Added `crumbIssuer` configuration to JCasC:

```yaml
jenkins:
  crumbIssuer:
    standard:
      excludeClientIPFromCrumb: true
```

**Files changed:**
- `jenkins/casc/jenkins.yaml` — Added `crumbIssuer` block
- `helm/templates/jenkins-casc-configmap.yaml` — Same change for Helm-deployed config

**Quick UI fix (if CasC hasn't been redeployed):** Manage Jenkins → Security → CSRF Protection → Enable proxy compatibility → Save.

### 12. npm EACCES Error in Jenkins Builds on OpenShift (RESOLVED)

The Playwright job failed with `npm error code EACCES` trying to create `/.npm` cache directory.

**Root cause:** OpenShift runs containers as an arbitrary non-root UID (e.g., 1001940000). The `/.npm` directory was created as root during the Docker image build and wasn't writable by the runtime UID.

**Fix:** Added to `jenkins/Dockerfile`:

```dockerfile
RUN mkdir -p /.npm && chmod -R 777 /.npm
```

### 13. Playwright `--with-deps` Fails — Cannot `su` to Root (RESOLVED)

After fixing npm permissions, the Playwright browser install step failed with `su: Authentication failure`. The `npx playwright install --with-deps` flag attempts to `su` to root to install OS-level shared library dependencies, which is impossible in OpenShift's non-root container.

**Root cause:** The `--with-deps` flag is designed for fresh systems. In the Jenkins Docker image, browsers and their OS dependencies are **already pre-installed** at build time. The runtime script doesn't need `--with-deps`.

**Fix:**
- `e2e/scripts/install-deps.sh` — Changed `npx playwright install --with-deps chromium firefox` to `npx playwright install chromium firefox` (removes `--with-deps`)
- `jenkins/Dockerfile` — Added `ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` so browsers install to a known shared path during build, then `RUN chmod -R 755 /ms-playwright` makes them readable by any UID
- `e2e/scripts/ci-entrypoint.sh` — Added `export PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH:-/ms-playwright}` so the job's shell finds the pre-installed browsers instead of re-downloading them

**Note:** Without the `PLAYWRIGHT_BROWSERS_PATH` export in `ci-entrypoint.sh`, Jenkins's shell doesn't inherit Docker `ENV` values, so Playwright downloads browsers to `~/.cache/ms-playwright` instead of using the pre-installed ones at `/ms-playwright`. The job still works but wastes ~5 minutes downloading.

### 14. Jenkins PVC Multi-Attach Error on Rolling Update (RESOLVED)

After Helm deploys, the new Jenkins pod got stuck in `ContainerCreating` indefinitely.

**Root cause:** The Jenkins Deployment used the default `RollingUpdate` strategy. Both old and new pods ran simultaneously, but the Jenkins PVC is `ReadWriteOnce` (RWO). When the new pod landed on a **different node**, it couldn't attach the volume because the old pod still held it. Event: `Multi-Attach error for volume "pvc-..." Volume is already used by pod(s) helpdesk-pro-jenkins-...`

**Fix:** Changed the deployment strategy to `Recreate` in `helm/templates/jenkins-deployment.yaml`:

```yaml
spec:
  replicas: 1
  strategy:
    type: Recreate
```

This ensures the old pod is fully terminated before the new one starts, preventing PVC conflicts. The trade-off is brief downtime during deploys, which is acceptable for a CI server.

**Manual recovery (if already stuck):** Delete the old Jenkins pod from the OpenShift console. The new pod will then mount the PVC and start.

---

### 15. JCasC `${VAR}` Substitution Eats Shell Variables (RESOLVED)

The Jenkins Freestyle job shell step contained `export BASE_URL="${BASE_URL}"` and similar lines. The job ran but build parameters (BASE_URL, TEST_RETRIES, BROWSER_PROJECT) were always empty strings at runtime.

**Root cause:** Jenkins Configuration as Code (JCasC) treats **every** `${VAR}` as a JCasC variable reference and resolves it at startup — not at shell runtime. Since those env vars don't exist when Jenkins boots, they resolve to empty strings. The shell step baked into the job config literally becomes `export BASE_URL=""`.

**Fix:** Removed all redundant `export` lines from the shell step in `jenkins/casc/jenkins.yaml` and `helm/templates/jenkins-casc-configmap.yaml`. Jenkins Freestyle jobs automatically inject build parameters as environment variables — no manual export needed.

**Key lesson:** Never use `${VAR}` syntax in JCasC YAML expecting it to survive to shell runtime. If you truly need literal `${VAR}` in a JCasC-managed script, escape it as `^${VAR}` (JCasC escape syntax).

---

### 16. Health Check Fails Through Nginx Proxy / TLS Route (RESOLVED)

The CI entrypoint script checked app readiness by curling `${BASE_URL}/api/healthz`, which routes through the Angular frontend's nginx proxy and the OpenShift TLS route. This failed for two reasons: (1) the backend health endpoint is `/healthz`, not `/api/healthz`, and nginx proxies `/api/*` to the backend stripping the prefix; (2) OpenShift edge-terminated routes use TLS certs that curl doesn't trust by default.

**Fix:** Added a `HEALTH_CHECK_URL` environment variable to the Jenkins deployment (`helm/templates/jenkins-deployment.yaml`) pointing directly to the backend's internal ClusterIP service:

```yaml
- name: HEALTH_CHECK_URL
  value: "http://{{ .Release.Name }}-backend:8080/healthz"
```

The CI script (`e2e/scripts/ci-entrypoint.sh`) uses this URL for the health check with `curl -k` to bypass any certificate issues, bypassing both the frontend proxy and the external route entirely.

---

### 17. Slow Playwright Browser Install in CI (RESOLVED)

Every Jenkins build ran `npx playwright install` which downloaded ~400 MB of browsers, adding several minutes to each build — even though the browsers were already baked into the Docker image.

**Fix:** Added a pre-check in `e2e/scripts/install-deps.sh` that skips the browser download when `$PLAYWRIGHT_BROWSERS_PATH` is set and already contains browser directories:

```bash
if [ -n "$PLAYWRIGHT_BROWSERS_PATH" ] && [ -d "$PLAYWRIGHT_BROWSERS_PATH" ] && [ "$(ls -A "$PLAYWRIGHT_BROWSERS_PATH" 2>/dev/null)" ]; then
    echo "Browsers already installed at $PLAYWRIGHT_BROWSERS_PATH, skipping download"
else
    npx playwright install
fi
```

Also removed `--with-deps` from the install command since OS-level dependencies are installed at Docker build time and `--with-deps` tries to `su` root which fails under OpenShift's arbitrary UID.

---

### 18. No Real-Time Console Output with HTML Reporter (RESOLVED)

Jenkins console output showed no test progress — only final results appeared after the entire suite completed.

**Root cause:** The test reporter was set to `html` only, which buffers all output until the end to generate the HTML report file. No streaming output is sent to stdout.

**Fix:** Changed `TEST_REPORTER` in `e2e/scripts/ci-entrypoint.sh` from `"html"` to `"list,html"`:

```bash
export TEST_REPORTER="list,html"
```

Playwright supports comma-separated reporters. The `list` reporter streams pass/fail results to stdout in real time, while `html` still generates the full report artifact. Both run simultaneously.

---

### 19. Playwright HTML Report Blocked by Jenkins CSP (RESOLVED)

Clicking the "Playwright Report" link in Jenkins showed a blank page. Browser console logged:

```
Applying inline style violates the following Content Security Policy directive 'style-src 'self''
Blocked script execution in '...' because the document's frame is sandboxed and the 'allow-scripts' permission is not set
```

**Root cause:** Jenkins applies a restrictive default Content Security Policy to archived build artifacts: `sandbox; default-src 'none'; img-src 'self'; style-src 'self';`. Playwright's HTML report uses inline `<style>` tags and `<script>` blocks, which are blocked by this policy.

**Fix:** Added the `hudson.model.DirectoryBrowserSupport.CSP` system property to `JAVA_OPTS` in `jenkins/Dockerfile` (local) and `helm/templates/jenkins-deployment.yaml` (OpenShift):

```
-Dhudson.model.DirectoryBrowserSupport.CSP="sandbox allow-scripts allow-same-origin; default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
```

This is a JVM system property so it requires a Jenkins restart (pod redeploy) to take effect — it cannot be changed at runtime via CasC or the UI.

---

### 20. Firefox Playwright Tests Fail Instantly on OpenShift (RESOLVED)

Firefox-based Playwright tests fail in ~4–5ms while Chromium tests pass. The `setup-firefox` project crashes immediately when trying to launch the Firefox browser inside the Jenkins pod on OpenShift.

**Symptoms:**
- `[setup-firefox] › tests/auth.setup.ts:4:6 › authenticate as employee (5ms)` — instant failure
- All Chromium projects (`setup-chromium`, `employee-chromium`, `admin-chromium`) pass without issues
- Jenkins readiness probe intermittently fails: `Readiness probe failed: Get "http://10.128.6.48:8080/login": context deadline exceeded`
- OpenShift Sandbox environment — 2 GiB namespace memory quota, 5 pods total

**Root cause (two-part):**

1. **Seccomp + dropped capabilities block Firefox sandbox.** OpenShift's security context (`capabilities.drop: ALL`, Seccomp mode 2 BPF filter) blocks `clone(CLONE_NEWUSER)`, which Firefox's content process sandbox requires to create user namespaces. Running the Firefox binary in the pod confirmed: `Sandbox: CanCreateUserNamespace() clone() failure: EPERM`.

2. **No writable HOME directory for fontconfig cache.** OpenShift runs containers as an arbitrary non-root UID (e.g., 1001940000) that has no home directory. Disabling the content sandbox alone lets Firefox start, but the Playwright juggler pipe connection hangs because fontconfig emits 16× "No writable cache directories" warnings and stalls during font enumeration. Firefox needs a writable `HOME` with fontconfig and Mozilla cache directories.

**What was tried (5 attempts):**

**Attempt 1 — Fix Chromium-only test spec issues (commit `b2ae4f4`)**

Fixed unrelated test failures in `my-tickets.spec.ts` and `submit-ticket-validation.spec.ts` (race conditions and missing mat-error elements). These fixes helped Chromium tests pass but were not Firefox-specific.

**Attempt 2 — Browser-specific auth setup projects (commit `b48cb63`)**

Split the single `setup` project into `setup-chromium` and `setup-firefox` with browser-specific storage state files. Did not fix the issue — confirmed the problem is at browser launch level, not session/cookie reuse.

**Attempt 3 — Add `/dev/shm` tmpfs volume + fix install check (commit `a663dca`)**

Added `dshm` emptyDir volume (`medium: Memory`, `sizeLimit: 256Mi`) mounted at `/dev/shm`. Fixed browser existence check in `install-deps.sh` to verify both `chromium-*` and `firefox-*` directories. Did not fix the issue — necessary but not sufficient.

**Attempt 4 — Pod diagnostics + `MOZ_DISABLE_CONTENT_SANDBOX=1`**

Exec'd into the Jenkins pod. Confirmed Firefox binary exists, no missing shared libraries, `/dev/shm` mounted, browser version matches. Discovered the `clone() EPERM` error. Added `MOZ_DISABLE_CONTENT_SANDBOX=1` to `ci-entrypoint.sh`. **Partial fix** — Firefox launched (headless mode message appeared) but Playwright's juggler pipe connection hung for 30s then got SIGKILL'd.

**Attempt 5 — Full sandbox disable + writable HOME + fontconfig cache (THE FIX)**

Through interactive pod debugging, discovered that even with content sandbox disabled, Firefox hung during fontconfig initialization because the arbitrary UID has no writable home directory. Setting `HOME=/tmp/firefox-home` with pre-created cache directories, plus disabling all four Firefox sandbox layers, allowed Firefox to launch and connect to Playwright's juggler pipe successfully.

**Fix applied:**

`jenkins/Dockerfile` — Pre-create writable `/tmp/firefox-home` directories at image build time:
```dockerfile
RUN mkdir -p /tmp/firefox-home/.cache/fontconfig /tmp/firefox-home/.mozilla && chmod -R 777 /tmp/firefox-home
```

`e2e/scripts/ci-entrypoint.sh` — Export all sandbox and HOME environment variables before test execution:
```bash
# Disable all Firefox sandbox layers (clone(CLONE_NEWUSER) blocked by OpenShift drop:ALL + seccomp)
export MOZ_DISABLE_CONTENT_SANDBOX=1
export MOZ_DISABLE_GMP_SANDBOX=1
export MOZ_DISABLE_SOCKET_PROCESS_SANDBOX=1
export MOZ_DISABLE_RDD_SANDBOX=1
# Writable HOME with fontconfig cache (OpenShift arbitrary UID has HOME=/)
export HOME=/tmp/firefox-home
mkdir -p "$HOME/.cache/fontconfig" "$HOME/.mozilla"
export XDG_CACHE_HOME="$HOME/.cache"
export XDG_CONFIG_HOME="$HOME/.config"
export FONTCONFIG_CACHE="$HOME/.cache/fontconfig"
```

**Why all four `MOZ_DISABLE_*` vars are needed:**
- `MOZ_DISABLE_CONTENT_SANDBOX` — Disables content process sandbox (the primary blocker)
- `MOZ_DISABLE_GMP_SANDBOX` — Disables Gecko Media Plugin sandbox
- `MOZ_DISABLE_SOCKET_PROCESS_SANDBOX` — Disables socket process sandbox
- `MOZ_DISABLE_RDD_SANDBOX` — Disables Remote Data Decoder sandbox

All four use `clone(CLONE_NEWUSER)` or similar restricted syscalls. Disabling them is safe inside a container where the container runtime already provides process isolation.

**Diagnostic commands used (for future reference):**
```bash
# Exec into Jenkins pod
oc exec -it -n maguiarr-dev deploy/helpdesk-pro-jenkins -- bash

# Check Firefox binary
ls -la /ms-playwright/firefox-*/firefox/firefox

# Check for missing shared libraries
ldd /ms-playwright/firefox-*/firefox/firefox 2>&1 | grep "not found"

# Verify /dev/shm mount
df -h /dev/shm

# Run Firefox directly to see sandbox errors
/ms-playwright/firefox-*/firefox/firefox --headless --version 2>&1

# Check capabilities and seccomp mode
cat /proc/self/status | grep -E "Cap|Seccomp"

# Check memory cgroup limit
cat /sys/fs/cgroup/memory.max 2>/dev/null

# Test Firefox launch with full fix applied
HOME=/tmp/firefox-home MOZ_DISABLE_CONTENT_SANDBOX=1 MOZ_DISABLE_GMP_SANDBOX=1 \
MOZ_DISABLE_SOCKET_PROCESS_SANDBOX=1 MOZ_DISABLE_RDD_SANDBOX=1 \
FONTCONFIG_CACHE=/tmp/firefox-home/.cache/fontconfig \
node -e "const {firefox} = require('playwright'); (async () => { const b = await firefox.launch({headless:true}); console.log('OK'); await b.close(); })()"
```

**Gotcha — `HOME=/` not empty:** OpenShift sets `HOME=/` for arbitrary UIDs. Using `${HOME:-/tmp/firefox-home}` (default substitution) does NOT override it — the variable is set, just set to `/`. The `mkdir` then tries to create `/.cache` which fails with `Permission denied`. Must use unconditional `export HOME=/tmp/firefox-home`.

---

### 21. Jenkins Pod OOMKilled During Playwright Tests (RESOLVED)

After fixing Firefox's sandbox and HOME issues (issue #20), Firefox actually launches — but the Jenkins pod gets OOMKilled. Running Jenkins JVM + a browser inside a 1Gi memory limit leaves no headroom for Firefox's ~200-300Mi memory footprint.

**Symptoms:**
- 503 Service Unavailable on Jenkins route during test execution
- Build console output cuts off mid-test
- Pod restarts (visible via `oc get pods` showing `RESTARTS` count increasing)
- OpenShift namespace dashboard shows memory spiking to the 2 GiB quota ceiling

**Root cause:** Jenkins JVM consumes ~412 MiB at idle (heap + metaspace + thread stacks + native memory). Adding a single Firefox process (~200-300 MiB) pushes the 1Gi pod over its cgroup memory limit. The OOM killer terminates the entire pod. The 2 GiB namespace quota prevents increasing the pod's memory limit — the other 4 pods (PostgreSQL, Keycloak, backend, frontend) already consume ~500-600 MiB.

**What was tried:**

1. **`-Xmx384m`** — Only caps heap; JVM was still ~412 MiB at idle because metaspace, code cache, and thread stacks are unbounded
2. **`-Xmx256m -XX:MaxMetaspaceSize=128m -XX:ReservedCodeCacheSize=64m`** — Aggressively caps all JVM memory pools
3. **`/dev/shm` reduced from 256Mi to 64Mi** — Memory-backed tmpfs counts against cgroup limit even if not fully used; 64Mi is sufficient for browser IPC
4. **`NODE_OPTIONS="--max-old-space-size=256"`** — Caps Node.js (Playwright) heap
5. **`TEST_WORKERS=1`** — Serializes browser execution (one browser at a time)

**Result:** Even with all caps applied, Firefox still OOMKills the pod. The arithmetic doesn't work:
- JVM (capped): ~350-400 MiB minimum
- `/dev/shm` tmpfs: 64 MiB
- Node.js/Playwright: ~100-150 MiB
- Firefox process: ~200-300 MiB
- **Total: ~714-914 MiB** — right at the 1Gi edge, with no margin for spikes

This is a **hard infrastructure constraint** — the OpenShift Developer Sandbox's 2 GiB namespace quota cannot be increased, and the Jenkins pod cannot be allocated more than ~1Gi without starving the other pods.

**Fix — default to Chromium-only in CI:**

The Firefox sandbox/HOME fix from issue #20 is correct — Firefox **works** when launched with the proper environment variables. It's purely a memory budget problem on Sandbox. The solution is to default to Chromium-only tests and make Firefox an opt-in for environments with more resources.

**Changes:**

`e2e/scripts/ci-entrypoint.sh` — Default `BROWSER_PROJECT` to `chromium`:
```bash
export BROWSER_PROJECT="${BROWSER_PROJECT:-chromium}"
```

`e2e/scripts/run-tests.sh` — Added `chromium` and `firefox` shorthand values:
```bash
if [[ "$BROWSER_PROJECT" == "all" ]]; then
  CMD+=(--project=employee-chromium --project=employee-firefox --project=admin-chromium --project=admin-firefox)
elif [[ "$BROWSER_PROJECT" == "chromium" ]]; then
  CMD+=(--project=employee-chromium --project=admin-chromium)
elif [[ "$BROWSER_PROJECT" == "firefox" ]]; then
  CMD+=(--project=employee-firefox --project=admin-firefox)
else
  CMD+=(--project="$BROWSER_PROJECT")
fi
```

Firefox/All selections emit a warning to the Jenkins console:
```
⚠️  WARNING: Firefox requires >1Gi pod memory. On OpenShift Sandbox, this WILL OOMKill the Jenkins pod.
```

`jenkins/casc/jenkins.yaml` + `helm/templates/jenkins-casc-configmap.yaml` — Updated `BROWSER_PROJECT` choice parameter:
- `chromium` is now the first (default) option in the dropdown
- Description includes: `WARNING: Firefox/All will OOMKill the pod on Sandbox (2GiB quota)`

**JVM memory tuning (kept for Chromium stability):**

`helm/templates/jenkins-deployment.yaml` + `jenkins/Dockerfile`:
```
-Xmx384m -XX:MaxMetaspaceSize=150m -XX:ReservedCodeCacheSize=64m -XX:+UseSerialGC
```

`helm/templates/jenkins-deployment.yaml` — `/dev/shm` reduced:
```yaml
sizeLimit: 64Mi
```

`e2e/scripts/ci-entrypoint.sh`:
```bash
export TEST_WORKERS=1
export NODE_OPTIONS="--max-old-space-size=256"
```

**To run Firefox tests:** Use a cluster with ≥4 GiB namespace memory quota and set Jenkins pod limits to ≥2Gi. Select `firefox` or `all` from the Jenkins build parameter dropdown.

---

## Architecture

### Custom Templates (replaced Bitnami subcharts)

- `postgresql-deployment.yaml` / `postgresql-service.yaml` / `postgresql-pvc.yaml` — PostgreSQL 16 with persistent storage
- `keycloak-deployment.yaml` / `keycloak-service.yaml` — Keycloak 25 with realm auto-import
- `frontend-deployment.yaml` / `backend-deployment.yaml` — App images from GHCR

### Keycloak Realm Import Behavior

- `--import-realm` imports from `/opt/keycloak/data/import/` on startup
- Default strategy is `IGNORE_EXISTING` — if the realm already exists in the DB, it's skipped
- First deploy: realm imports from `realm-export.json` (mounted via ConfigMap)
- Subsequent deploys: realm persists in PostgreSQL (via PVC), import is skipped
- To apply realm changes after first import: use the Keycloak Admin API or wipe the PostgreSQL PVC

### CI/CD Flow

1. Push to `main` triggers GitHub Actions (`deploy.yml`)
2. Builds and pushes frontend/backend images to GHCR
3. Checks for failed Helm releases (cleans up only if failed/pending-install)
4. Runs `helm upgrade --install` with OpenShift values overlay

---

## Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `OPENSHIFT_TOKEN` | OpenShift service account token |
| `OPENSHIFT_SERVER` | OpenShift API server URL |
| `OPENSHIFT_NAMESPACE` | Target namespace |
| `KEYCLOAK_HOST` | Keycloak route hostname (for backend JWT validation) |
| `FRONTEND_HOST` | Frontend route hostname (for Keycloak redirect URIs) |
| `JENKINS_HOST` | Jenkins route hostname — bare hostname, no `https://` (for Keycloak OIDC redirect URI) |
| `GHCR_DOCKERCONFIGJSON` | Docker config JSON for pulling images from GHCR |

### Regenerating GHCR Pull Secret

1. Create a GitHub PAT (classic) with `read:packages` scope
2. Build the JSON:
   ```bash
   AUTH=$(echo -n "USERNAME:PAT" | base64)
   echo "{\"auths\":{\"ghcr.io\":{\"auth\":\"$AUTH\"}}}"
   ```
3. Set the JSON string as the `GHCR_DOCKERCONFIGJSON` GitHub Actions secret

---

## Manual Steps After Fresh Deploy

If Keycloak's database was wiped (PVC deleted), the realm re-imports automatically from `realm-export.json`. No manual intervention needed as long as `webOrigins: "*"` is in the export.

If the database persists from a previous deploy with `webOrigins: "+"`, fix via the Admin API:

```bash
# Get admin token
TOKEN=$(curl -s -X POST "https://KEYCLOAK_HOST/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli&grant_type=password&username=admin&password=admin" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Get client ID
CLIENT_UUID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://KEYCLOAK_HOST/admin/realms/helpdesk/clients?clientId=helpdesk-frontend" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

# Update webOrigins
curl -s -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "https://KEYCLOAK_HOST/admin/realms/helpdesk/clients/$CLIENT_UUID" \
  -d "{\"webOrigins\": [\"http://localhost:4200\", \"*\"]}"
```
