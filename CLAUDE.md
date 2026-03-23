# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HelpDesk Pro** is a full-stack support ticket demo application built to demonstrate CI/CD pipelines with OpenShift. It is intentionally scoped as a teaching tool, not production software.

**Stack:** Angular 17 (frontend) + .NET 8 Web API (backend) + PostgreSQL 16 + Keycloak 25 (OIDC/PKCE auth) + Jenkins (CI/E2E runner)

## Commands

### Local Development

```bash
make up       # Start all services via docker-compose (postgres, keycloak, backend, frontend, jenkins)
make down     # Stop and remove all services
make logs     # Tail logs from all services
```

Service URLs after `make up`:
- Frontend: http://localhost:4200
- Backend Swagger: http://localhost:8080/swagger
- Keycloak admin: http://localhost:8180 (admin/admin)
- Jenkins: http://localhost:9090

### Frontend

```bash
cd frontend
npm install
npm start        # ng serve with proxy to backend
npm run build    # Production build
npm test         # Unit tests via Karma
```

### Backend

```bash
cd backend
dotnet restore
dotnet build
dotnet run --project src/HelpDeskApi   # Requires running postgres + keycloak
```

### OpenShift Deployment

```bash
make deploy NAMESPACE=your-ns   # Helm deploy to OpenShift
make status                      # Check pods/services/routes
make routes                      # List route hostnames
make test-e2e                    # Run Playwright E2E tests (headless)
make test-e2e-headed             # Run Playwright in UI mode
make test-e2e-report             # Show Playwright HTML report
```

The GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and pushes three images (backend, frontend, jenkins) to GHCR on every push to `main`, then deploys via Helm.

**Required GitHub Secrets:** `OPENSHIFT_TOKEN`, `OPENSHIFT_SERVER`, `OPENSHIFT_NAMESPACE`, `KEYCLOAK_HOST`, `FRONTEND_HOST`, `JENKINS_HOST`, `GHCR_DOCKERCONFIGJSON`

## Architecture

### Request Flow

```
Browser → Angular (nginx:8080) → /api proxy → .NET API (8080) → PostgreSQL
                ↕
          Keycloak (OIDC/PKCE) — issues JWTs validated by backend

Jenkins (9090) — CI/E2E runner, authenticated via Keycloak OIDC
  └─ Runs Playwright tests against the frontend
```

The frontend nginx config proxies `/api` to the backend, avoiding CORS issues in production. In development, Angular's proxy config (`proxy.conf.json`) handles this instead.

### Frontend (`frontend/src/app/`)

Standalone Angular 17 (no NgModules). Bootstrap chain in `app.config.ts`:
1. `ConfigService` fetches `/assets/config.json` (runtime config: keycloakUrl, keycloakRealm, keycloakClientId, apiUrl)
2. Keycloak initializes with the fetched config
3. App renders

Key files:
- `app.config.ts` — APP_INITIALIZER chain (config → Keycloak → ready)
- `app.routes.ts` — Routes with `AuthGuard` / `RoleGuard`
- `services/auth.service.ts` — Wraps KeycloakService, exposes username/roles
- `interceptors/auth.interceptor.ts` — Attaches Bearer token to all API requests

Two routes: `/employee/submit` (own tickets) and `/admin/dashboard` (all tickets, requires `helpdesk-admin` role).

### Backend (`backend/src/HelpDeskApi/`)

Layered architecture: Controller → Service → Repository → EF Core → PostgreSQL.

- `Program.cs` — Registers everything; runs `Migrate()` for auto-migration on startup
- `Controllers/TicketsController.cs` — REST endpoints (`GET/POST/PUT/DELETE /api/tickets`, stats, assign, resolve)
- Health checks: `GET /healthz` (liveness, always 200), `GET /readyz` (DB connectivity)
- Exception handling: `ExceptionHandlingMiddleware` returns RFC 7807 ProblemDetails
- Authorization: Keycloak JWT validation via `Keycloak.AuthServices.Authentication`; admin endpoints require `helpdesk-admin` realm role

### Helm Charts (`helm/`)

Deploys all five components (frontend, backend, PostgreSQL, Keycloak, Jenkins). No subchart dependencies — all components are defined as direct templates.

Key files:
- `values.yaml` — All defaults (images, resources, routes, auth credentials)
- `values.openshift.yaml` — Placeholder for OpenShift overrides (currently comments only; security contexts in base templates are already OpenShift-compatible)
- `Chart.yaml` — No `dependencies` block

Templates generate: Deployments/StatefulSets, Services, Routes (OpenShift), ConfigMaps (frontend runtime config, nginx proxy, Keycloak realm, Jenkins CasC), Secrets (DB credentials, Jenkins OIDC, GHCR pull secret), and PVCs (PostgreSQL, Jenkins).

### Jenkins (`jenkins/`)

CI/E2E runner deployed alongside the app. Configured entirely via Jenkins Configuration as Code (JCasC).

- `Dockerfile` — Custom Jenkins image with pre-installed plugins
- `casc/jenkins.yaml` — JCasC config: Keycloak OIDC auth, role-based authorization, NodeJS-20 tool, `Run-Playwright-Tests` job
- `jobs/playwright-tests.groovy` — Reference Groovy for the Playwright pipeline

Authentication: Keycloak OIDC via `helpdesk-jenkins` client. Role mapping: `helpdesk-admin` → full admin, `helpdesk-tester` → build/read, `authenticated` → read-only.

The Playwright job clones the repo, runs `e2e/scripts/ci-entrypoint.sh`, and publishes the HTML report.

### E2E Tests (`e2e/`)

Playwright-based end-to-end test suite. Covers auth flows, ticket submission, admin dashboard, navigation.

- Run locally: `make test-e2e` (headless) or `make test-e2e-headed` (UI mode)
- Run via Jenkins: `Run-Playwright-Tests` job (parameterized: browser, retries, base URL)
- Reports: `make test-e2e-report` or Jenkins archived artifacts

### Keycloak (`keycloak/realm-export.json`)

Realm `helpdesk` with three clients:
- `helpdesk-frontend` — Public, PKCE enabled
- `helpdesk-backend` — Confidential, bearer-only (secret: `backend-secret`)
- `helpdesk-jenkins` — Confidential, standard flow (secret: `jenkins-secret`)

Demo users (all password: `password123`):
- `employee1` through `employee5` — Role: `employee`
- `admin1`, `admin2` — Roles: `employee` + `helpdesk-admin`
- `tester1` — Role: `helpdesk-tester`

Roles: `employee`, `helpdesk-admin`, `helpdesk-tester`.

The realm config is imported automatically by the Keycloak container at startup (mounted via ConfigMap in Helm, volume mount in docker-compose).

## Deployment History

See `docs/Deployment_troubleshooting.md` for a full log of resolved deployment issues, root causes, recovery procedures, and diagnostic commands.
