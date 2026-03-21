# HelpDesk Pro — Claude Code Prompt (OpenShift CI/CD Demo)


## CONTEXT


This is a demo app for a presentation to a basic technical audience about
OpenShift CI/CD. The app itself should be simple and self-explanatory.
Prioritize clarity over sophistication. This is a teaching tool, not
production software.

The target platform is the **Red Hat Developer Sandbox** (free 30-day
OpenShift namespace). The namespace is pre-assigned (e.g., `<username>-dev`).
Do not create namespaces.


---


## ANGULAR FRONTEND REQUIREMENTS


### Architecture
- Use standalone components throughout (Angular 17+ standard, no NgModules)
- Use Angular Signals for state management (not NgRx, not BehaviorSubject)
- Use the new @if, @for, @switch control flow syntax (not *ngIf, *ngFor)
- Use inject() function instead of constructor injection
- Use Angular's HttpClient with typed responses
- Use `keycloak-js` and `keycloak-angular` libraries for OIDC integration
- Initialize Keycloak via `APP_INITIALIZER` with `onLoad: 'login-required'`


### Runtime Configuration
- Use a runtime config pattern: load config from `/assets/config.json`
  at startup before Keycloak initializes
- `config.json` must contain `keycloakUrl`, `keycloakRealm`,
  `keycloakClientId`, and `apiUrl` properties
- docker-compose mounts a local config with `http://localhost:8180` and
  `http://localhost:8080`
- The Dockerfile should bake in a **placeholder** `config.json` with
  `apiUrl: "/api"` and `keycloakUrl: "KEYCLOAK_URL_PLACEHOLDER"`
- On OpenShift, a Helm ConfigMap (`frontend-configmap.yaml`) must
  inject the real `config.json` at deploy time, mounted over
  `/usr/share/nginx/html/assets/config.json` in the frontend Deployment.
  The Keycloak URL value must be derived from the Helm values
  (e.g., `.Values.keycloakRoute.host`)
- For local `ng serve` development, include a `proxy.conf.json` that
  proxies `/api` requests to `http://localhost:8080`


### UI Design
Apply Angular Material 3 (MDC-based components). The UI must look
professional and modern:


**Shared Layout:**
- Top navigation toolbar with the app logo/name "HelpDesk Pro" on the left
- On the right side of the toolbar: the logged-in user's display name and
  a "Logout" button (mat-icon-button with a power icon)
- A colored chip/badge next to the username showing their role
  (blue for "Employee", red for "Admin")


**Employee View — Submit Ticket Page:**
- A centered mat-card (max-width 600px) with a clean form:
  - mat-form-field for "Title" (required, max 200 chars)
  - mat-form-field textarea for "Description" (required, max 4000 chars)
  - mat-select for "Priority": Low, Medium, High, Critical
  - A full-width "Submit Ticket" mat-raised-button (primary color)
- Below the form: a second mat-card titled "My Tickets" showing only
  the logged-in user's submitted tickets in a mat-table with columns:
  Title, Priority, Status, Created Date
- Status must render as a color-coded mat-chip:
  Open=blue, In Progress=orange, Resolved=green, Closed=grey


**Admin View — Dashboard Page:**
- A summary stats row at the top: four mat-cards in a responsive CSS grid
  showing total counts for Open, In Progress, Resolved, and total tickets
- A full-width mat-table below showing ALL tickets with columns:
  ID, Title, Submitter, Priority, Status, Created Date, Actions
- The Actions column has two icon buttons:
  "Assign to me" (mat-icon-button, person-add icon) visible when
  unassigned, and "Resolve" (mat-icon-button, check-circle icon, green)
  visible when status is not Resolved/Closed
- mat-paginator below the table (10 rows per page default)
- mat-sort on all relevant columns
- A mat-form-field search/filter input above the table that filters
  the ticket list client-side in real time
- A mat-select filter for Status above the table


### Routing
- /login — public route, triggers Keycloak redirect
- /employee/submit — protected, requires employee or helpdesk-admin role
- /admin/dashboard — protected, requires helpdesk-admin role only
- Redirect unknown routes to /login
- Use a KeycloakAuthGuard on protected routes


---


## C# BACKEND REQUIREMENTS


### Architecture
- ASP.NET Core 8 Web API
- Clean layered structure: Controllers → Services → Repositories → DbContext
- Use Repository Pattern with interfaces (ITicketRepository, etc.)
- Use AutoMapper for DTO mapping
- Use FluentValidation for request validation
- Global exception handling middleware returning RFC 7807 ProblemDetails


### Configuration
- Read database connection string from environment variable `CONNECTION_STRING`
- Enable CORS in development for `http://localhost:4200`
- In production (behind nginx proxy), CORS is unnecessary
- Use `ASPNETCORE_ENVIRONMENT=Development` in docker-compose to enable
  CORS; omit it in the Helm deployment (defaults to Production)


### Backend Environment Variables (all required)
The backend must read these from environment variables (not appsettings):
- `CONNECTION_STRING` — PostgreSQL connection string
- `ASPNETCORE_ENVIRONMENT` — set to `Development` in docker-compose only
- `Keycloak__Authority` — Full Keycloak issuer URL
  (e.g., `http://localhost:8180/realms/helpdesk` locally,
  `https://<keycloak-route>/realms/helpdesk` on OpenShift)
- `Keycloak__MetadataAddress` — OIDC discovery endpoint
  (e.g., `http://keycloak:8180/realms/helpdesk/.well-known/openid-configuration`)
- `Keycloak__AuthorizationUrl` — Authorization endpoint
  (e.g., `http://localhost:8180/realms/helpdesk/protocol/openid-connect/auth`)
- `Keycloak__ClientId` — `helpdesk-backend`
- `Keycloak__ClientSecret` — `backend-secret`


The Helm `backend-deployment.yaml` must set all of these via env vars,
deriving the Keycloak URL from `.Values.keycloakRoute.host`.


### Health Checks
- Expose `GET /healthz` (liveness probe) — returns 200 if the process
  is running
- Expose `GET /readyz` (readiness probe) — returns 200 only if the
  database connection is healthy


### API Endpoints
Implement these RESTful endpoints:


```
POST   /api/tickets             [Authorize]                          → Submit new ticket
GET    /api/tickets/my          [Authorize]                          → Get own tickets
GET    /api/tickets             [Authorize(Roles="helpdesk-admin")]  → Get all tickets
PATCH  /api/tickets/{id}/assign [Authorize(Roles="helpdesk-admin")]  → Assign to me (extract admin's preferred_username from JWT, set as AssignedTo, change status to In Progress)
PATCH  /api/tickets/{id}/resolve [Authorize(Roles="helpdesk-admin")] → Resolve ticket (set status to Resolved)
GET    /api/tickets/stats       [Authorize(Roles="helpdesk-admin")]  → Dashboard stats (counts by status)
```


### Database
- Use **Npgsql.EntityFrameworkCore.PostgreSQL** as the EF Core database
  provider (not SQL Server — the database is PostgreSQL)
- Use EF Core 8 Code First migrations
- Ticket entity: TicketId (Guid), Title, Description, Priority (enum),
  Status (enum), SubmitterId (string — Keycloak sub claim),
  SubmitterName (string), AssignedTo (string nullable),
  CreatedAt (DateTimeOffset), UpdatedAt (DateTimeOffset)
- Configure all entities using `IEntityTypeConfiguration<T>` (not data
  annotations on the model)
- Seed two demo Keycloak users in documentation/README only
  (not in code — Keycloak realm export handles this)


### Keycloak Integration
- Use `Keycloak.AuthServices.Authentication` NuGet package
  (handles claim mapping automatically)
- Configure in `Program.cs` using `builder.Services.AddKeycloakWebApiAuthentication()`
- Extract the user's `sub` claim as SubmitterId and `preferred_username`
  as SubmitterName when creating tickets


---


## KEYCLOAK REQUIREMENTS


### Realm Configuration
Generate two realm files:
- `keycloak/realm-export.json` — for local development (localhost URIs)
- `helm/realm-export.json` — for OpenShift (wildcard `openshiftapps.com` URIs)

Both must share the same structure with the following:

- **Realm name:** `helpdesk`
- **Angular client:** `helpdesk-frontend`
  - Public client (no client secret), PKCE enabled (S256)
  - Valid redirect URIs:
    - Local: `http://localhost:4200/*`, `https://*`
    - Helm: `http://localhost:4200/*`, `https://*.apps.*.openshiftapps.com/*`
  - Web origins: `*` (local) / `https://*.apps.*.openshiftapps.com` (Helm)
- **Backend client:** `helpdesk-backend`
  - Confidential client, bearer-only, secret: `backend-secret`
- **Jenkins client:** `helpdesk-jenkins`
  - Confidential client, standard flow enabled, secret: `jenkins-secret`
  - Valid redirect URIs:
    - Local: `http://localhost:9090/*`
    - Helm: add `https://jenkins-helpdesk-pro.apps.*.openshiftapps.com/securityRealm/finishLogin`
  - **Protocol mapper:** `realm_roles` — OIDC User Realm Role mapper
    that flattens `realm_access.roles` into a top-level `realm_roles`
    claim (required for Jenkins RBAC to read Keycloak roles)
- **Realm roles:** `employee`, `helpdesk-admin`, `helpdesk-tester`
- **Scope mappings:**
  - `helpdesk-frontend` → `[employee, helpdesk-admin]`
  - `helpdesk-jenkins` → `[employee, helpdesk-admin, helpdesk-tester]`
- **Demo users (pre-configured in the realm export):**
  - `employee1` / `password123` → assigned role: `employee`
  - `admin1` / `password123` → assigned roles: `helpdesk-admin`, `employee`
  - `tester1` / `password123` → assigned role: `helpdesk-tester`


---


## JENKINS CI SERVER REQUIREMENTS


### Overview
Jenkins is included as a fully configured CI server with Keycloak SSO
authentication. It comes with a pre-configured **Run-Playwright-Tests**
job that runs the Playwright E2E suite against the deployed application.


### Jenkins Dockerfile
Build a custom image based on `jenkins/jenkins:lts-jdk17`:
- Install **Node.js 20.x** (required for Playwright)
- Pre-install **Playwright browsers** (Chromium + Firefox) into
  `/ms-playwright` at build time to avoid ~400 MB download on each build
- Install plugins from `plugins.txt` via `jenkins-plugin-cli`
- Set `JAVA_OPTS` to:
  - Disable setup wizard (`-Djenkins.install.runSetupWizard=false`)
  - Relax Content Security Policy to allow Playwright HTML reports to
    render (`-Dhudson.model.DirectoryBrowserSupport.CSP=...`)
- Set `CASC_JENKINS_CONFIG=/var/jenkins_home/casc_configs/`
- Make `/.npm` directory world-writable (OpenShift runs as arbitrary UID)


### Jenkins Plugins (`jenkins/plugins.txt`)
Install these plugins:
- `oic-auth` — OpenID Connect authentication (Keycloak integration)
- `role-strategy` — Role-based access control
- `configuration-as-code` — JCasC framework
- `git` — Git SCM support
- `workflow-aggregator` — Jenkins Pipeline engine
- `htmlpublisher` — Publishes Playwright HTML reports
- `nodejs` — NodeJS tool integration
- `job-dsl` — Programmatic job creation
- `credentials` — Credential storage
- `credentials-binding` — Inject credentials into builds


### Jenkins Configuration as Code (`jenkins/casc/jenkins.yaml`)
Configure Jenkins entirely via JCasC:

**Security Realm — OpenID Connect via Keycloak:**
- Client ID: `helpdesk-jenkins`
- Client secret: `${JENKINS_OIDC_CLIENT_SECRET}` (injected env var)
- Issuer: `${KEYCLOAK_BROWSER_URL}/realms/helpdesk`
- Scopes: `openid email profile`
- Username field: `preferred_username`
- Groups/roles field: `realm_roles`

**Authorization — Role-Based Access Control:**
- `admin` role → `helpdesk-admin` group → `Overall/Administer`
- `tester` role → `helpdesk-tester` group → `Overall/Read`, `Job/Build`,
  `Job/Read`, `Job/Workspace`, `Job/Cancel`
- `readonly` role → `authenticated` group → `Overall/Read`

**System Credentials:** 4 string credentials for E2E test users:
- `employee-username` / `employee-password` (defaults: `employee1` / `password123`)
- `admin-username` / `admin-password` (defaults: `admin1` / `password123`)

**NodeJS Tool:** Named `NodeJS-20`, installed at `/usr/bin`

**Job DSL:** Inline `Run-Playwright-Tests` job definition (see below)

Note: The Helm deployment uses a separate JCasC ConfigMap
(`jenkins-casc-configmap.yaml`) with Helm-templated URLs replacing
the `${ENV_VAR}` placeholders for Keycloak and frontend URLs.


### Run-Playwright-Tests Job
A parameterized freestyle job:
- **Parameters:**
  - `BASE_URL` (string) — Application URL (default:
    `http://frontend:8080` locally, templated to frontend route on OpenShift)
  - `BROWSER_PROJECT` (choice) — `all`, `employee-chromium`,
    `employee-firefox`, `admin-chromium`, `admin-firefox`
  - `TEST_RETRIES` (string) — Number of retries (default: `1`)
- **SCM:** Git, repo URL `https://github.com/<owner>/Helpdesk.git`,
  branch `main`
- **Credential Bindings:** `EMPLOYEE_USERNAME`, `EMPLOYEE_PASSWORD`,
  `ADMIN_USERNAME`, `ADMIN_PASSWORD` from system credentials
- **Build Step:** Shell script: `cd e2e && chmod +x scripts/*.sh && ./scripts/ci-entrypoint.sh`
- **Post-Build:**
  - Publish Playwright HTML report from `e2e/playwright-report`
  - Archive `e2e/test-results/**` artifacts


---


## E2E TESTING (PLAYWRIGHT) REQUIREMENTS


### Directory Structure
```
e2e/
├── playwright.config.ts       ← Test configuration
├── package.json               ← Dependencies (@playwright/test, typescript, dotenv)
├── tsconfig.json
├── fixtures/
│   └── test-data.ts           ← Centralized test data (ticket factories,
│                                 validation messages, enums, test users)
├── pages/
│   ├── login.page.ts          ← Keycloak login form page object
│   ├── submit-ticket.page.ts  ← Employee ticket form page object
│   ├── admin-dashboard.page.ts ← Admin dashboard page object
│   └── navigation.page.ts    ← Toolbar navigation page object
├── scripts/
│   ├── ci-entrypoint.sh       ← CI entry: health check → install → run
│   ├── install-deps.sh        ← npm ci + Playwright browser install
│   └── run-tests.sh           ← Flexible test runner wrapper
└── tests/
    ├── auth.setup.ts          ← Pre-authenticate both users, save sessions
    ├── admin/                  ← Admin dashboard tests
    │   ├── assign-ticket.spec.ts
    │   ├── dashboard-stats.spec.ts
    │   ├── filter-sort.spec.ts
    │   ├── tickets-table.spec.ts
    │   └── update-status.spec.ts
    ├── auth/                   ← Login/logout tests
    │   ├── login.admin.spec.ts
    │   ├── login.employee.spec.ts
    │   ├── logout.admin.spec.ts
    │   └── logout.employee.spec.ts
    ├── employee/               ← Employee ticket tests
    │   ├── my-tickets.spec.ts
    │   ├── submit-ticket-form.spec.ts
    │   └── submit-ticket-validation.spec.ts
    └── navigation/             ← Navigation tests
        ├── navigation-links.admin.spec.ts
        └── navigation-links.employee.spec.ts
```


### Playwright Configuration
- **Base URL:** Configurable via `BASE_URL` env var (default: `http://localhost:4200`)
- **Parallelization:** Disabled (`fullyParallel: false`) for deterministic
  test ordering
- **CI mode:** Single worker, 1 retry, HTML report; headless
- **Local mode:** Multiple workers, no retries, list reporter
- **Screenshots/Traces:** Captured only on first retry failure

**5 Projects:**
1. `setup` — Runs `auth.setup.ts` to pre-authenticate both demo users
   and save session state to `.auth/employee.json` and `.auth/admin.json`
2. `employee-chromium` — Chromium, employee auth state, depends on setup
3. `employee-firefox` — Firefox, employee auth state, depends on setup
4. `admin-chromium` — Chromium, admin auth state, depends on setup
5. `admin-firefox` — Firefox, admin auth state, depends on setup

**Test routing by path pattern:**
- Employee projects run: `/employee/*.spec.ts`, `/auth/*employee.spec.ts`,
  `/navigation/*employee.spec.ts`
- Admin projects run: `/admin/*.spec.ts`, `/auth/*admin.spec.ts`,
  `/navigation/*admin.spec.ts`


### Page Object Models
- **LoginPage** — Keycloak login form (`#username`, `#password`, `#kc-login`)
- **SubmitTicketPage** — Employee form (title, description, priority), My
  Tickets table, validation error accessors
- **AdminDashboardPage** — Stat cards, search filter, tickets table,
  paginator, assign/resolve/status actions
- **NavigationPage** — Toolbar links (Submit Ticket, Dashboard), username
  display, role chip, logout button


### Auth Setup
Pre-authenticate both users before test suites:
1. Log in as `employee1` via Keycloak form, wait for redirect to
   `/employee/submit`, save session to `.auth/employee.json`
2. Log in as `admin1`, save session to `.auth/admin.json`

All test projects reuse these saved sessions via `storageState`, avoiding
repeated Keycloak login flows during test runs.


### CI Scripts
- **`ci-entrypoint.sh`** — Main CI entry point: calls `install-deps.sh`,
  health-checks the app (polls `/api/healthz` with 30 retries), exports
  credentials from env vars, calls `run-tests.sh`
- **`install-deps.sh`** — Runs `npm ci`, downloads Playwright browsers
  (Chromium + Firefox), skips download if browsers already present at
  `$PLAYWRIGHT_BROWSERS_PATH`
- **`run-tests.sh`** — Flexible wrapper accepting env vars or named args:
  `BASE_URL`, `BROWSER_PROJECT` (default: `all`), `TEST_RETRIES`,
  `TEST_WORKERS`, `TEST_REPORTER`


---


## DOCKER REQUIREMENTS


### Angular Dockerfile (multi-stage)
- Stage 1: `node:20-alpine` — run `npm ci` and `ng build --configuration production`
- Stage 2: `nginx:alpine` — copy the dist output, add a custom `nginx.conf`
  that handles Angular routing (`try_files $uri $uri/ /index.html`)
- The `nginx.conf` must also proxy `/api` requests to the C# backend service
- Run as non-root user in the final stage (OpenShift compatibility)


### C# Dockerfile (multi-stage)
- Stage 1: `mcr.microsoft.com/dotnet/sdk:8.0` — restore and publish
- Stage 2: `mcr.microsoft.com/dotnet/aspnet:8.0` — copy published output
- Run as non-root user (user 1001) in the final stage (OpenShift
  compatibility)
- Expose port 8080 (not 443 or 80, as OpenShift non-root cannot bind
  to ports below 1024)


### Jenkins Dockerfile
- Base: `jenkins/jenkins:lts-jdk17`
- Install Node.js 20.x, Playwright browser dependencies (Chromium + Firefox)
- Pre-cache Playwright browsers at `/ms-playwright` during build
- Install plugins from `jenkins/plugins.txt`
- Disable setup wizard, relax CSP for HTML reports
- Make `/.npm` world-writable for OpenShift arbitrary UID compatibility


### Docker Compose (local development)
Create a `docker-compose.yml` at the repo root that stands up:
- **PostgreSQL 16** on port 5432 (with `POSTGRES_DB=helpdesk`,
  `POSTGRES_USER=helpdesk`, `POSTGRES_PASSWORD=helpdesk123`)
- **Keycloak 25** on port 8180 importing `keycloak/realm-export.json`
  on first boot via the `--import-realm` flag, with
  `KC_HOSTNAME_BACKCHANNEL_DYNAMIC=true` for split internal/external URLs
- **Backend** on port 8080 (depends on PostgreSQL and Keycloak with
  health checks)
- **Frontend** on port 4200 (depends on backend)
- **Jenkins** on port 9090 (depends on Keycloak with health check),
  with a `jenkins_home` named volume and JCasC config mounted from
  `./jenkins/casc/jenkins.yaml`. Health check has `start_period: 120s`
  to allow time for plugin loading. Environment:
  - `KEYCLOAK_URL` — internal Keycloak URL (`http://keycloak:8180`)
  - `KEYCLOAK_BROWSER_URL` — browser Keycloak URL (`http://localhost:8180`)
  - `JENKINS_OIDC_CLIENT_SECRET` — `jenkins-secret`
  - `DEFAULT_BASE_URL` — `http://frontend:8080`
  - `JENKINS_ADMIN_PASSWORD` — `admin`

Use a shared Docker network and health checks so services start in the
correct order. Declare two named volumes: `pgdata` and `jenkins_home`.


---


## HELM CHART REQUIREMENTS


Create a Helm chart in the `/helm` directory. **Do not use Bitnami
subcharts** — all components (PostgreSQL, Keycloak, Jenkins) use custom
templates for simplicity and OpenShift compatibility.


### Chart.yaml
```yaml
apiVersion: v2
name: helpdesk-pro
description: HelpDesk Pro - Full-stack support ticket system
type: application
version: 1.0.0
appVersion: "1.0.0"
```

**No dependencies.** All four components use custom templates.


### Template Files
```
helm/
  Chart.yaml
  values.yaml
  values.openshift.yaml        ← Comment-only; security contexts are
                                  in templates directly
  realm-export.json            ← OpenShift-specific realm export
  templates/
    # Frontend (4 files)
    frontend-deployment.yaml
    frontend-service.yaml
    frontend-route.yaml        ← OpenShift Route (not Ingress)
    frontend-configmap.yaml    ← Runtime config.json (keycloakUrl, apiUrl)
    frontend-nginx-configmap.yaml ← nginx.conf for frontend proxy

    # Backend (3 files)
    backend-deployment.yaml
    backend-service.yaml
    backend-route.yaml         ← OpenShift Route (not Ingress)

    # PostgreSQL (2 files)
    postgresql-statefulset.yaml ← StatefulSet with PVC
    postgresql-service.yaml

    # Keycloak (4 files)
    keycloak-deployment.yaml
    keycloak-service.yaml
    keycloak-route.yaml        ← OpenShift Route for Keycloak
    keycloak-realm-configmap.yaml ← realm-export.json mounted into Keycloak

    # Jenkins (6 files)
    jenkins-deployment.yaml    ← Recreate strategy (RWO PVC requires it)
    jenkins-service.yaml
    jenkins-route.yaml         ← OpenShift Route for Jenkins UI
    jenkins-pvc.yaml           ← 5Gi PersistentVolumeClaim (RWO)
    jenkins-secret.yaml        ← OIDC client secret + admin password
    jenkins-casc-configmap.yaml ← JCasC config with Helm-templated URLs

    # Shared (2 files)
    ghcr-pull-secret.yaml      ← ImagePullSecret for private GHCR images
    db-credentials-secret.yaml
```


### values.yaml Key Sections
- **frontend:** image, resources (requests: 64Mi/100m, limits: 128Mi/200m),
  replicas, keycloak config (realm, clientId), route host
- **backend:** image, resources (requests: 128Mi/200m, limits: 256Mi/500m),
  replicas, keycloak config (authority, clientId, clientSecret), route host
- **postgresql:** image (`postgres:16-alpine`), auth credentials
  (user: helpdesk, password: helpdesk123, database: helpdesk),
  resources (requests: 256Mi/200m, limits: 512Mi/500m), persistence (1Gi)
- **keycloak:** image (`quay.io/keycloak/keycloak:25.0`), admin credentials
  (admin/admin), resources (requests: 512Mi/500m, limits: 1Gi/1000m),
  external database config pointing to `helpdesk-pro-postgresql`
- **jenkins:** enabled flag, image, resources (requests: 512Mi/500m,
  limits: 1Gi/1), persistence (5Gi), route host, keycloak OIDC config
  (clientId: `helpdesk-jenkins`, clientSecret: `jenkins-secret`),
  admin password escape hatch
- **keycloakRoute:** host (set by CI/CD)
- **ghcrSecret:** dockerconfigjson (set by CI/CD)
- **global:** imagePullSecrets referencing `helpdesk-pro-ghcr-pull-secret`


### values.openshift.yaml
This file is currently comment-only. Security contexts are configured
directly in the Deployment/StatefulSet templates with
`runAsNonRoot: true` and no hardcoded UIDs (compatible with OpenShift's
restricted SCC that assigns arbitrary UIDs).


### OpenShift Routes
All routes use TLS edge termination with redirect. Route hosts are left
empty in `values.yaml` (OpenShift auto-assigns hostnames). On CI/CD
deploy, hosts are set via `--set` flags from GitHub secrets.


### Probes
- Frontend: HTTP GET `/` port 8080 (liveness + readiness)
- Backend: HTTP GET `/healthz` (liveness), `/readyz` (readiness) port 8080
- Jenkins: HTTP GET `/login` port 8080 (120s initialDelaySeconds liveness,
  90s readiness)
- PostgreSQL and Keycloak: TCP socket checks or exec commands in templates


---


## GITHUB ACTIONS CI/CD REQUIREMENTS


Create `.github/workflows/deploy.yml` triggered on:
- Push to `main` branch
- `workflow_dispatch` (manual trigger)


### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `OPENSHIFT_TOKEN` | `oc whoami -t` |
| `OPENSHIFT_SERVER` | `oc whoami --show-server` |
| `OPENSHIFT_NAMESPACE` | Your OpenShift namespace (e.g., `myuser-dev`) |
| `KEYCLOAK_HOST` | Route hostname for Keycloak (bare hostname, no `https://`) |
| `FRONTEND_HOST` | Route hostname for the frontend (bare hostname, no `https://`) |
| `JENKINS_HOST` | Route hostname for Jenkins (bare hostname, no `https://`) |
| `CR_PAT` | GitHub Personal Access Token with `read:packages` scope |
| `GHCR_DOCKERCONFIGJSON` | Base64-encoded Docker config for GHCR pull secret |


### Job 1: build-and-push
- Checkout code
- Log in to GHCR using `secrets.GITHUB_TOKEN`
- Use a **matrix strategy** to build and push **three** images in parallel:
  - `helpdesk-backend` (context: `./backend`)
  - `helpdesk-frontend` (context: `./frontend`)
  - `helpdesk-jenkins` (context: `.`, dockerfile: `jenkins/Dockerfile`)
- Tag each image with both `<git-sha>` and `latest`
- Push to `ghcr.io/<owner>/<image>`


### Job 2: deploy (depends on build-and-push)
- Install `oc` CLI and `helm` CLI
- Log in to OpenShift using `secrets.OPENSHIFT_SERVER` and
  `secrets.OPENSHIFT_TOKEN`
- **Clean up failed Helm releases:** Check if a release exists in
  `failed` or `pending-install` state; if so, delete associated resources
  and uninstall before upgrading (prevents stuck deployments without
  destroying running deployments)
- Write `GHCR_DOCKERCONFIGJSON` secret to a temp values file
- Run:
  ```bash
  helm upgrade --install helpdesk-pro helm/ \
    --namespace ${{ env.NAMESPACE }} \
    --values helm/values.yaml \
    --values helm/values.openshift.yaml \
    --values /tmp/ghcr-secret.yaml \
    --set frontend.image.tag=${{ github.sha }} \
    --set backend.image.tag=${{ github.sha }} \
    --set frontend.image.repository=<owner>/helpdesk-frontend \
    --set backend.image.repository=<owner>/helpdesk-backend \
    --set backend.keycloak.authority=https://${{ secrets.KEYCLOAK_HOST }}/realms/helpdesk \
    --set keycloakRoute.host=${{ secrets.KEYCLOAK_HOST }} \
    --set frontend.route.host=${{ secrets.FRONTEND_HOST }} \
    --set jenkins.image.repository=<owner>/helpdesk-jenkins \
    --set jenkins.image.tag=${{ github.sha }} \
    --set jenkins.route.host=${{ secrets.JENKINS_HOST }} \
    --wait --timeout 10m
  ```


---


## REPOSITORY STRUCTURE


Generate this exact folder structure:

```
/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── frontend/                  ← Angular app
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── proxy.conf.json        ← Local dev proxy for ng serve
│   └── src/
│       └── assets/
│           └── config.json    ← Runtime config (Keycloak URL, API URL)
├── backend/                   ← ASP.NET Core 8 Web API
│   ├── Dockerfile
│   └── src/
│       └── HelpDeskApi/
│           ├── Program.cs
│           ├── Controllers/
│           ├── Services/
│           ├── Repositories/
│           ├── Data/
│           ├── DTOs/
│           ├── Models/
│           ├── Mapping/
│           ├── Validators/
│           └── Middleware/
├── e2e/                       ← Playwright E2E test suite
│   ├── playwright.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── tests/
│   │   ├── auth.setup.ts
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── employee/
│   │   └── navigation/
│   ├── pages/
│   │   ├── login.page.ts
│   │   ├── submit-ticket.page.ts
│   │   ├── admin-dashboard.page.ts
│   │   └── navigation.page.ts
│   ├── fixtures/
│   │   └── test-data.ts
│   └── scripts/
│       ├── ci-entrypoint.sh
│       ├── install-deps.sh
│       └── run-tests.sh
├── jenkins/                   ← Jenkins CI server
│   ├── Dockerfile
│   ├── plugins.txt
│   ├── casc/
│   │   └── jenkins.yaml       ← JCasC configuration
│   └── jobs/
│       └── playwright-tests.groovy  ← Reference job definition
├── helm/                      ← Helm chart
│   ├── Chart.yaml             ← No dependencies (no Bitnami subcharts)
│   ├── values.yaml
│   ├── values.openshift.yaml
│   ├── realm-export.json      ← OpenShift-specific realm config
│   └── templates/             ← 22 template files (see Helm section)
├── keycloak/
│   └── realm-export.json      ← Local dev realm (3 clients, 3 users,
│                                 3 roles, localhost URIs)
├── docs/
│   └── Deployment_troubleshooting.md  ← Resolved deployment issues
├── .gitignore                 ← Ignore node_modules, bin, obj, dist, .env
├── docker-compose.yml         ← Local development stack (5 services)
├── Makefile                   ← Common commands (make up, make down,
│                                 make deploy, make logs, make test-e2e)
└── README.md                  ← Full setup, deploy, and redeployment guide
```


---


## MAKEFILE REQUIREMENTS


Create a `Makefile` at the repo root with these targets for easy
demo use during the presentation:

```makefile
up             → docker compose up -d --build
down           → docker compose down -v
logs           → docker compose logs -f
deploy         → helm upgrade --install helpdesk-pro (with values.yaml & values.openshift.yaml)
status         → oc get pods, services, routes
routes         → oc get routes with hostname columns
test-e2e       → Headless Playwright tests (npm ci, install browsers, run)
test-e2e-headed → Same with --headed flag (visible browser)
test-e2e-report → npx playwright show-report
```

The `deploy` target should accept a `NAMESPACE` variable
(e.g., `make deploy NAMESPACE=yourusername-dev`).


---


## README REQUIREMENTS


The README must contain:


1. **Overview** — What the app does, tech stack (Angular 17, .NET 8,
   PostgreSQL 16, Keycloak 25, Jenkins LTS), and architecture diagram
   (Mermaid)
2. **Prerequisites** — Docker & Docker Compose (required), Node.js 20+
   (only for E2E tests), Helm 3.14+, `oc` CLI
3. **Local Development** — How to run with `make up`, service URLs
   (frontend :4200, backend :8080, Keycloak :8180, Jenkins :9090),
   note that Jenkins takes ~2 minutes on first boot
4. **Demo Users** — Table with 3 users: employee1, admin1, tester1
   with passwords, roles, and access descriptions
5. **E2E Testing (Playwright)** — Prerequisites, `make test-e2e` commands,
   test project matrix table, manual run instructions
6. **Jenkins (CI Server)** — Local access, OIDC login, Run-Playwright-Tests
   job parameters, Jenkins architecture (auth, JCasC, plugins, browsers)
7. **OpenShift Deployment** — GitHub secrets table (8 secrets), deploy
   commands, status/routes commands
8. **Redeployment** — Push to `main` triggers CI/CD (3 images built,
   pushed to GHCR, deployed via Helm)
9. **Waking Up Scaled-Down Pods** — Ordered scale-up commands
   (PostgreSQL → Keycloak → Backend/Frontend/Jenkins)
10. **Redeployment After Sandbox Reset** — 6-step procedure with CLI
    commands to restore environment from scratch (login, update 2 secrets,
    first deploy, get 3 route hostnames, update 3 host secrets,
    second deploy)
11. **Troubleshooting** — Link to `docs/Deployment_troubleshooting.md`
12. **Project Structure** — Directory tree with descriptions


---


## CRITICAL IMPLEMENTATION NOTES

These are non-obvious gotchas discovered during deployment. Violating any
of them will cause hard-to-debug failures:

1. **Keycloak `webOrigins` must be `"*"`, not `"+"`.**
   `"+"` means "derive origins from redirectUris", but it doesn't work
   when redirectUris contain wildcards like `https://*`. Use `"*"` in
   both realm files.

2. **Jenkins OIDC must use _manual_ server configuration, not `wellKnown`.**
   The OIC plugin's `wellKnown` mode requests ALL scopes from Keycloak's
   discovery endpoint, causing "something went wrong" errors. Use `manual`
   config with explicit endpoint URLs and `scopes: "openid email profile"`.
   The `manual` config also requires a mandatory `issuer` field.

3. **Split Keycloak URLs: browser-facing vs server-to-server.**
   In JCasC, `authorizationServerUrl` and `endSessionUrl` must use
   `KEYCLOAK_BROWSER_URL` (the URL users see — `localhost:8180` locally,
   the Route URL on OpenShift). `tokenServerUrl`, `jwksServerUrl`, and
   `userInfoServerUrl` must use `KEYCLOAK_URL` (internal network URL —
   `keycloak:8180` locally, the Service URL on OpenShift).

4. **Never add `defaultClientScopes` to clients in `realm-export.json`.**
   Keycloak's `defaultClientScopes` references client scope *objects* that
   must be explicitly defined in the export. Adding `["openid", "email",
   "profile"]` breaks realm import for ALL clients, not just the one with
   the bad field. Handle scope restriction client-side (Jenkins `scopes`
   field) instead.

5. **Never use `${VAR}` in JCasC shell steps expecting runtime expansion.**
   JCasC resolves all `${VAR}` references at Jenkins startup, not at
   shell runtime. Build parameters in Freestyle jobs are automatically
   injected as environment variables — no `export` statements needed.
   If you truly need literal `${VAR}`, escape as `^${VAR}`.

6. **Jenkins must use `Recreate` deployment strategy, not `RollingUpdate`.**
   The Jenkins PVC is `ReadWriteOnce`. Rolling updates cause the new pod
   to hang in `ContainerCreating` with a multi-attach error when it lands
   on a different node.

7. **Jenkins needs `crumbIssuer.excludeClientIPFromCrumb: true` in JCasC.**
   Without this, form submissions (like "Build with Parameters") return
   403 behind OpenShift's reverse proxy because the client IP changes
   between page load and form POST.

8. **OpenShift Route templates must NOT set `spec.host`.**
   The Developer Sandbox forbids setting route hostnames. Let OpenShift
   auto-assign them. The host *values* are still used in ConfigMaps
   (e.g., Keycloak redirect URIs) but must not appear in Route specs.

9. **CI health check must use internal ClusterIP, not frontend proxy.**
   The E2E entrypoint must check `http://<backend-service>:8080/healthz`
   directly, not `${BASE_URL}/api/healthz` through the TLS route. Add a
   `HEALTH_CHECK_URL` env var to the Jenkins deployment pointing to the
   backend's internal service URL.

10. **Playwright test reporter must be `"list,html"`, not just `"html"`.**
    The `html` reporter buffers all output — Jenkins shows nothing until
    the entire suite completes. Use comma-separated `"list,html"` for
    real-time streaming to console plus the HTML artifact.

11. **CSP relaxation for HTML reports requires exact directives.**
    The `JAVA_OPTS` system property must be:
    ```
    -Dhudson.model.DirectoryBrowserSupport.CSP="sandbox allow-scripts allow-same-origin; default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
    ```
    Without `allow-scripts allow-same-origin` in the sandbox directive,
    Playwright's interactive HTML report renders as a blank page.


---


## DELIVERABLES


Generate all files completely. Do not use placeholders like
`// TODO: implement this`. Every file must be immediately runnable for a
demo. Keep it simple — this is a teaching tool, not production software.


Start with the folder structure, then generate each file in full.


---
