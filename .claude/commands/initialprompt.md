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
- `config.json` must contain `keycloakUrl` and `apiUrl` properties
- docker-compose mounts a local config with `http://localhost:8180` and
  `http://localhost:8080`
- The Dockerfile should bake in a **placeholder** `config.json` with
  `apiUrl: "/api"` and `keycloakUrl: "KEYCLOAK_URL_PLACEHOLDER"`
- On OpenShift, a Helm ConfigMap (`frontend-configmap.yaml`) must
  inject the real `config.json` at deploy time, mounted over
  `/usr/share/nginx/html/assets/config.json` in the frontend Deployment.
  The Keycloak URL value must be derived from the Helm values
  (e.g., `.Values.keycloak.routeHost`)
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
  - mat-form-field for "Title" (required, max 100 chars)
  - mat-form-field textarea for "Description" (required, max 500 chars)
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
- `Keycloak__auth-server-url` — Keycloak base URL (e.g.,
  `http://keycloak:8080` in docker-compose, the Keycloak Route URL
  on OpenShift)
- `Keycloak__realm` — `helpdesk`
- `Keycloak__resource` — `helpdesk-backend`


The Helm `backend-deployment.yaml` must set all of these via env vars,
deriving the Keycloak URL from the Helm values.


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
Generate `keycloak/realm-export.json` with the following:


- **Realm name:** `helpdesk`
- **Angular client:** `helpdesk-frontend`
  - Public client (no client secret), PKCE enabled
  - Valid redirect URIs: `http://localhost:4200/*`, `https://*.openshiftapps.com/*`
  - Web origins: `+`
- **Backend client:** `helpdesk-backend`
  - Confidential client, service account disabled
- **Realm roles:** `employee`, `helpdesk-admin`
- **Demo users (pre-configured in the realm export):**
  - `employee1` / `password123` → assigned role: `employee`
  - `admin1` / `password123` → assigned roles: `helpdesk-admin`, `employee`


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


### Docker Compose (local development)
Create a `docker-compose.yml` at the repo root that stands up:
- **PostgreSQL 15** on port 5432 (with `POSTGRES_DB=helpdesk`,
  `POSTGRES_USER=helpdesk`, `POSTGRES_PASSWORD=helpdesk`)
- **Keycloak 25** on port 8180 importing `keycloak/realm-export.json`
  on first boot via the `--import-realm` flag
- **Backend** on port 8080 (depends on PostgreSQL and Keycloak with
  health checks)
- **Frontend** on port 4200 (depends on backend)


Use a shared Docker network and health checks so services start in the
correct order.


---


## HELM CHART REQUIREMENTS


Create a Helm chart in the `/helm` directory with the following structure:


```
helm/
  Chart.yaml
  values.yaml
  values.openshift.yaml        ← OpenShift-specific overrides
  templates/
    frontend-deployment.yaml
    frontend-service.yaml
    frontend-route.yaml        ← OpenShift Route (not Ingress)
    frontend-configmap.yaml    ← Runtime config.json (keycloakUrl, apiUrl)
    backend-deployment.yaml
    backend-service.yaml
    backend-route.yaml         ← OpenShift Route (not Ingress)
    keycloak-route.yaml        ← OpenShift Route for Keycloak admin UI
    keycloak-realm-configmap.yaml ← realm-export.json mounted into Keycloak
    ghcr-pull-secret.yaml      ← ImagePullSecret for private GHCR images
    db-credentials-secret.yaml
```


`Chart.yaml` must declare dependencies on:
- `bitnami/postgresql` (use chart version ~16.x, appVersion 15)
- `bitnami/keycloak` (use chart version ~24.x, appVersion 25)


Use the latest stable Bitnami chart versions available as of early 2026.


Both Bitnami dependencies must have OpenShift compatibility enabled in
`values.openshift.yaml`:
```yaml
global:
  compatibility:
    openshift:
      adaptSecurityContext: auto
```


Mount `keycloak/realm-export.json` as a ConfigMap and configure the
Bitnami Keycloak chart's `keycloakConfigCli` to import it on first boot.


Resource limits must be set for all pods:
- Frontend (nginx): requests 64Mi/50m, limits 128Mi/100m
- Backend (C#): requests 256Mi/100m, limits 512Mi/200m
- PostgreSQL: requests 256Mi/100m, limits 512Mi/200m
- Keycloak: requests 512Mi/200m, limits 1Gi/500m


All Deployment templates must include `livenessProbe` and `readinessProbe`:
- Frontend: HTTP GET on `/` port 8080
- Backend: HTTP GET on `/healthz` (liveness), `/readyz` (readiness) port 8080
- PostgreSQL and Keycloak: handled by Bitnami chart defaults


---


## GITHUB ACTIONS CI/CD REQUIREMENTS


Create `.github/workflows/deploy.yml` triggered on push to `main` branch.


The workflow must have two jobs:


**Job 1: build-and-push**
- Checkout code
- Log in to GHCR using `secrets.CR_PAT`
- Build and push frontend image: `ghcr.io/<owner>/<repo>/frontend:latest`
  and tag with the git SHA
- Build and push backend image: `ghcr.io/<owner>/<repo>/backend:latest`
  and tag with the git SHA


**Job 2: deploy (depends on build-and-push)**
- Install `oc` CLI and `helm` CLI
- Log in to OpenShift using `secrets.OPENSHIFT_SERVER` and
  `secrets.OPENSHIFT_TOKEN`
- Run: `helm dependency update ./helm`
- Run:
  ```bash
  helm upgrade --install helpdesk ./helm \
    -f ./helm/values.yaml \
    -f ./helm/values.openshift.yaml \
    --set frontend.image.repository=ghcr.io/${{ github.repository }}/frontend \
    --set frontend.image.tag=${{ github.sha }} \
    --set backend.image.repository=ghcr.io/${{ github.repository }}/backend \
    --set backend.image.tag=${{ github.sha }} \
    --namespace ${{ secrets.OPENSHIFT_NAMESPACE }}
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
├── helm/                      ← Helm chart
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values.openshift.yaml
│   └── templates/
├── keycloak/
│   └── realm-export.json      ← Keycloak realm with roles, clients,
│                                 and two demo users pre-configured
├── .gitignore                 ← Ignore node_modules, bin, obj, dist, .env
├── docker-compose.yml         ← Local development stack
├── Makefile                   ← Common commands (make up, make down,
│                                 make deploy, make logs)
└── README.md                  ← Step-by-step setup and redeployment guide
```


---


## MAKEFILE REQUIREMENTS


Create a `Makefile` at the repo root with these targets for easy
demo use during the presentation:


```makefile
up        → docker compose up -d --build
down      → docker compose down -v
logs      → docker compose logs -f
deploy    → helm upgrade --install helpdesk ./helm -f ./helm/values.yaml -f ./helm/values.openshift.yaml --namespace $(NAMESPACE)
status    → oc get pods
routes    → oc get routes
```


The `deploy` target should accept a `NAMESPACE` variable
(e.g., `make deploy NAMESPACE=yourusername-dev`).


---


## README REQUIREMENTS


The README must contain:


1. **Overview** — What the app does and the tech stack
2. **Prerequisites** — Tools needed (Docker, node 20, .NET 8 SDK, oc CLI,
   helm)
3. **Local Development** — How to run everything with `docker compose up`
   and verify it works (include demo user credentials)
4. **OpenShift Deployment** — How to deploy using the GitHub Actions
   pipeline or manually via `helm upgrade --install`
5. **Redeployment After Sandbox Reset** — Numbered steps a developer can
   follow in under 10 minutes to fully restore the environment from scratch
   after the 30-day wipe. Include the exact CLI commands.
6. **Demo Users** — Table of usernames, passwords, and roles
7. **Architecture Diagram** — Simple ASCII or Mermaid diagram showing
   Frontend → nginx → Backend → PostgreSQL, plus Keycloak for auth


---


## DELIVERABLES


Generate all files completely. Do not use placeholders like
`// TODO: implement this`. Every file must be immediately runnable for a
demo. Keep it simple — this is a teaching tool, not production software.


Start with the folder structure, then generate each file in full.


---


## VERIFICATION (required before declaring done)


After generating all files, run these checks to confirm everything is
correct. Do not skip any. Report the result of each check.


### 1. File Structure Check
Verify all expected files exist:
```bash
echo "=== Checking file structure ==="
test -f docker-compose.yml          && echo "✅ docker-compose.yml" || echo "❌ docker-compose.yml"
test -f Makefile                     && echo "✅ Makefile" || echo "❌ Makefile"
test -f README.md                    && echo "✅ README.md" || echo "❌ README.md"
test -f frontend/Dockerfile          && echo "✅ frontend/Dockerfile" || echo "❌ frontend/Dockerfile"
test -f frontend/nginx.conf          && echo "✅ frontend/nginx.conf" || echo "❌ frontend/nginx.conf"
test -f frontend/proxy.conf.json     && echo "✅ frontend/proxy.conf.json" || echo "❌ frontend/proxy.conf.json"
test -f backend/Dockerfile           && echo "✅ backend/Dockerfile" || echo "❌ backend/Dockerfile"
test -f helm/Chart.yaml              && echo "✅ helm/Chart.yaml" || echo "❌ helm/Chart.yaml"
test -f helm/values.yaml             && echo "✅ helm/values.yaml" || echo "❌ helm/values.yaml"
test -f helm/values.openshift.yaml   && echo "✅ helm/values.openshift.yaml" || echo "❌ helm/values.openshift.yaml"
test -f keycloak/realm-export.json   && echo "✅ keycloak/realm-export.json" || echo "❌ keycloak/realm-export.json"
test -f .github/workflows/deploy.yml && echo "✅ deploy.yml" || echo "❌ deploy.yml"
```


### 2. Angular Build Check
```bash
cd frontend
npm ci --ignore-scripts
npx ng build --configuration production
# Must exit 0 with no errors
```


### 3. C# Build Check
```bash
cd backend
dotnet restore
dotnet build --no-restore
# Must exit 0 with no errors
```


### 4. Helm Lint and Template Check
```bash
cd helm
helm dependency update .
helm lint . -f values.yaml -f values.openshift.yaml
helm template helpdesk . -f values.yaml -f values.openshift.yaml
# Must exit 0 with no errors. Template output must include:
#   - frontend Deployment, Service, and Route
#   - backend Deployment, Service, and Route
#   - keycloak Route
#   - ghcr-pull-secret
#   - db-credentials-secret
```


### 5. Keycloak Realm Validation
```bash
node -e "
const r = require('./keycloak/realm-export.json');
let ok = true;
const check = (cond, msg) => { if (!cond) { console.log('❌ ' + msg); ok = false; } };
check(r.realm === 'helpdesk', 'Wrong realm name');
const clients = (r.clients || []).map(c => c.clientId);
check(clients.includes('helpdesk-frontend'), 'Missing frontend client');
check(clients.includes('helpdesk-backend'), 'Missing backend client');
const users = (r.users || []).map(u => u.username);
check(users.includes('employee1'), 'Missing employee1 user');
check(users.includes('admin1'), 'Missing admin1 user');
if (ok) console.log('✅ Realm export is valid');
else process.exit(1);
"
```


### 6. Dockerfile Syntax Check
```bash
# Verify both Dockerfiles use non-root user and expose 8080
grep -q 'USER 1001\|USER nonroot\|USER nginx' frontend/Dockerfile && echo "✅ Frontend non-root" || echo "❌ Frontend missing non-root user"
grep -q 'USER 1001' backend/Dockerfile && echo "✅ Backend non-root" || echo "❌ Backend missing non-root user"
grep -q '8080' backend/Dockerfile && echo "✅ Backend exposes 8080" || echo "❌ Backend missing port 8080"
```


### Expected Result
All 6 checks must pass with no errors. If any check fails, fix the
issue and re-run that check before declaring done.


### Summary Report
After all checks pass, print a summary:
```
══════════════════════════════════════
  HelpDesk Pro — Generation Complete
══════════════════════════════════════
  Files generated:  ✅
  Angular build:    ✅
  C# build:         ✅
  Helm lint:        ✅
  Helm template:    ✅
  Realm export:     ✅
  Dockerfiles:      ✅
══════════════════════════════════════
  Ready for: git push origin main
══════════════════════════════════════
```
