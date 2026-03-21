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
