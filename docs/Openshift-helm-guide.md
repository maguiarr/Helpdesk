# HelpDesk Pro — OpenShift & Helm Deep-Dive Guide

> **Audience**: developers comfortable with Docker who are new to Kubernetes and OpenShift.
>
> **OpenShift version**: 4.x — console navigation paths are based on a recent 4.x release and may vary slightly across versions.
>
> **Helm release name**: all examples assume the release is called `helpdesk-pro` (set when you run `helm install helpdesk-pro ./helm`).

---

## Table of Contents

- [HelpDesk Pro — OpenShift \& Helm Deep-Dive Guide](#helpdesk-pro--openshift--helm-deep-dive-guide)
  - [Table of Contents](#table-of-contents)
  - [Part 1 — Foundations: From Docker to OpenShift](#part-1--foundations-from-docker-to-openshift)
    - [1.1 Containers → Pods → Deployments](#11-containers--pods--deployments)
    - [1.2 What Helm Adds](#12-what-helm-adds)
      - [How templating works](#how-templating-works)
    - [1.3 What OpenShift Adds on Top of Kubernetes](#13-what-openshift-adds-on-top-of-kubernetes)
  - [Part 2 — The Big Picture](#part-2--the-big-picture)
    - [2.1 Architecture Diagram](#21-architecture-diagram)
    - [2.2 Resource Inventory](#22-resource-inventory)
    - [2.3 Request Flow](#23-request-flow)
  - [Part 3 — Component Deep Dives](#part-3--component-deep-dives)
    - [3.1 PostgreSQL (Database)](#31-postgresql-database)
      - [Why a StatefulSet Instead of a Deployment?](#why-a-statefulset-instead-of-a-deployment)
      - [Template Walkthrough: `postgresql-statefulset.yaml`](#template-walkthrough-postgresql-statefulsetyaml)
      - [Template Walkthrough: `postgresql-service.yaml`](#template-walkthrough-postgresql-serviceyaml)
      - [Where to Find This in OpenShift Console](#where-to-find-this-in-openshift-console)
    - [3.2 Keycloak (Identity Provider)](#32-keycloak-identity-provider)
      - [What Keycloak Does in This App](#what-keycloak-does-in-this-app)
      - [Template Walkthrough: `keycloak-deployment.yaml`](#template-walkthrough-keycloak-deploymentyaml)
      - [Template Walkthrough: `keycloak-realm-configmap.yaml`](#template-walkthrough-keycloak-realm-configmapyaml)
      - [Template Walkthrough: `keycloak-service.yaml`](#template-walkthrough-keycloak-serviceyaml)
      - [Template Walkthrough: `keycloak-route.yaml`](#template-walkthrough-keycloak-routeyaml)
      - [Where to Find This in OpenShift Console](#where-to-find-this-in-openshift-console-1)
    - [3.3 Backend (.NET 8 API)](#33-backend-net-8-api)
      - [Template Walkthrough: `backend-deployment.yaml`](#template-walkthrough-backend-deploymentyaml)
      - [Template Walkthrough: `backend-service.yaml`](#template-walkthrough-backend-serviceyaml)
      - [Template Walkthrough: `backend-route.yaml`](#template-walkthrough-backend-routeyaml)
      - [Where to Find This in OpenShift Console](#where-to-find-this-in-openshift-console-2)
    - [3.4 Frontend (Angular + nginx)](#34-frontend-angular--nginx)
      - [Template Walkthrough: `frontend-configmap.yaml`](#template-walkthrough-frontend-configmapyaml)
      - [Template Walkthrough: `frontend-nginx-configmap.yaml`](#template-walkthrough-frontend-nginx-configmapyaml)
      - [Template Walkthrough: `frontend-deployment.yaml`](#template-walkthrough-frontend-deploymentyaml)
      - [Where to Find This in OpenShift Console](#where-to-find-this-in-openshift-console-3)
    - [3.5 Jenkins (CI/CD)](#35-jenkins-cicd)
      - [What Jenkins Does in This App](#what-jenkins-does-in-this-app)
      - [Template Walkthrough: `jenkins-deployment.yaml`](#template-walkthrough-jenkins-deploymentyaml)
      - [Template Walkthrough: `jenkins-casc-configmap.yaml`](#template-walkthrough-jenkins-casc-configmapyaml)
      - [Template Walkthrough: `jenkins-pvc.yaml`](#template-walkthrough-jenkins-pvcyaml)
      - [Template Walkthrough: `jenkins-secret.yaml`](#template-walkthrough-jenkins-secretyaml)
      - [Template Walkthrough: `jenkins-service.yaml`](#template-walkthrough-jenkins-serviceyaml)
      - [Template Walkthrough: `jenkins-route.yaml`](#template-walkthrough-jenkins-routeyaml)
      - [Where to Find This in OpenShift Console](#where-to-find-this-in-openshift-console-4)
  - [Part 4 — Cross-Cutting Concepts](#part-4--cross-cutting-concepts)
    - [4.1 Services \& Internal DNS](#41-services--internal-dns)
    - [4.2 Routes (OpenShift-Specific)](#42-routes-openshift-specific)
      - [Route YAML explained (using frontend as an example):](#route-yaml-explained-using-frontend-as-an-example)
      - [This project's Routes:](#this-projects-routes)
    - [4.3 Secrets](#43-secrets)
      - [This project's Secrets:](#this-projects-secrets)
    - [4.4 ConfigMaps](#44-configmaps)
      - [How ConfigMaps Get Into Containers](#how-configmaps-get-into-containers)
      - [This project's ConfigMaps:](#this-projects-configmaps)
    - [4.5 Security \& SCCs](#45-security--sccs)
      - [How Our Templates Comply](#how-our-templates-comply)
    - [4.6 Health Probes (Liveness \& Readiness)](#46-health-probes-liveness--readiness)
      - [Two Types of Probes](#two-types-of-probes)
      - [Probes in This Project](#probes-in-this-project)
      - [Probe Timing Parameters](#probe-timing-parameters)
    - [4.7 Resource Requests \& Limits](#47-resource-requests--limits)
      - [This Project's Resource Allocations](#this-projects-resource-allocations)
    - [4.8 Labels \& Selectors](#48-labels--selectors)
      - [The Selector Chain](#the-selector-chain)
      - [Labels Used in This Project](#labels-used-in-this-project)
    - [4.9 Image Pull Secrets](#49-image-pull-secrets)
      - [How It Works in This Project](#how-it-works-in-this-project)
  - [Part 5 — OpenShift Console Walkthrough](#part-5--openshift-console-walkthrough)
    - [5.1 Two Perspectives: Administrator vs Developer](#51-two-perspectives-administrator-vs-developer)
    - [5.2 Console Navigation Map](#52-console-navigation-map)
      - [Workloads](#workloads)
      - [Networking](#networking)
      - [Storage](#storage)
      - [Observe (Monitoring)](#observe-monitoring)
      - [Helm (if available in your cluster)](#helm-if-available-in-your-cluster)
    - [5.3 Topology View (Developer Perspective)](#53-topology-view-developer-perspective)
    - [5.4 Inspecting a Pod](#54-inspecting-a-pod)
    - [5.5 Viewing Logs and Events](#55-viewing-logs-and-events)
    - [5.6 Quick Tips](#56-quick-tips)
  - [Part 6 — Helm Values Quick Reference](#part-6--helm-values-quick-reference)
    - [6.1 values.yaml Key Table](#61-valuesyaml-key-table)
      - [Global](#global)
      - [Frontend](#frontend)
      - [Backend](#backend)
      - [Keycloak](#keycloak)
      - [PostgreSQL](#postgresql)
      - [Jenkins](#jenkins)
      - [GHCR Pull Secret](#ghcr-pull-secret)
    - [6.2 How values.openshift.yaml Works](#62-how-valuesopenshiftyaml-works)
    - [6.3 Common Helm Commands](#63-common-helm-commands)
  - [Appendix A — Glossary](#appendix-a--glossary)

---

## Part 1 — Foundations: From Docker to OpenShift

### 1.1 Containers → Pods → Deployments

If you know Docker, you already know the hardest part. Here's how the concepts map:

| Docker Concept | Kubernetes Equivalent | What Changes |
|---|---|---|
| `docker run myimage` | **Pod** | A Pod wraps one or more containers. Most Pods run a single container, just like `docker run`. |
| `docker-compose.yml` (a service with `replicas: 3`) | **Deployment** | A Deployment ensures the right number of Pod copies are always running. If a Pod crashes, the Deployment creates a new one. |
| `docker-compose.yml` (the whole file) | **Helm Chart** | A Helm chart is a package of template files that produce all the Kubernetes resources your app needs. |
| `docker volume` | **PersistentVolumeClaim (PVC)** | A PVC requests storage from the cluster. OpenShift provisions it automatically. |
| `docker network` | **Service** | A Service gives a stable DNS name and IP to a set of Pods. Other Pods can reach it by name. |
| Port mapping (`-p 8080:8080`) | **Route** (OpenShift) or **Ingress** (plain Kubernetes) | A Route exposes a Service to the outside world with a URL. |

**Key difference from Docker**: in Kubernetes you don't run containers directly. You write a YAML manifest describing the _desired state_ ("I want 2 replicas of this image, on port 8080, with this environment variable") and Kubernetes continuously works to make reality match that description.

### 1.2 What Helm Adds

Helm is a **package manager for Kubernetes** — think of it like `npm` or `apt` but for cluster resources.

**Without Helm**, you would write plain YAML files and apply them one by one with `kubectl apply -f`. If your app has 22 resources, that's many files with hardcoded values — and if you need to change a database password, you'd hunt through multiple files.

**With Helm**, you get:

| Concept | What It Does |
|---|---|
| **Chart** (`Chart.yaml`) | Metadata — the name, version, and description of your package. Ours is called `helpdesk-pro`. |
| **Templates** (`templates/*.yaml`) | YAML files with placeholders like `{{ .Values.backend.replicas }}`. Helm fills in the placeholders at deploy time. |
| **Values** (`values.yaml`) | A single file with all the configurable knobs — image tags, passwords, resource limits, etc. |
| **Release** | A deployed instance of a chart. When you run `helm install helpdesk-pro ./helm`, you create a release named `helpdesk-pro`. |

#### How templating works

Every time you see `{{ ... }}` in a template, Helm replaces it with an actual value:

```yaml
# Template (what you write):
replicas: {{ .Values.backend.replicas }}

# Rendered (what Kubernetes receives):
replicas: 1
```

Two special variables appear everywhere in our templates:

- **`{{ .Release.Name }}`** — the release name you chose (`helpdesk-pro`). Used to prefix resource names so multiple releases don't collide.
- **`{{ .Values.xxx }}`** — a value from `values.yaml`. You can override any value at deploy time with `--set key=value` or `-f other-values.yaml`.

You can preview what Helm will produce without deploying:
```bash
helm template helpdesk-pro ./helm -f helm/values.openshift.yaml
```

### 1.3 What OpenShift Adds on Top of Kubernetes

OpenShift is **Kubernetes with enterprise batteries included**. Everything that works in Kubernetes works in OpenShift, but OpenShift adds:

| OpenShift Feature | Plain K8s Equivalent | Why It Matters |
|---|---|---|
| **Routes** | Ingress (requires an Ingress controller) | Routes are first-class. Create a Route → get a URL with TLS. No extra setup. |
| **Projects** | Namespaces | Same thing, but Projects have extra metadata and RBAC defaults. |
| **Security Context Constraints (SCCs)** | Pod Security Standards | OpenShift enforces stricter defaults. By default, containers can't run as root and get an arbitrary UID. |
| **Web Console** | Dashboard (basic) | A rich UI where you can inspect every resource, read logs, open terminals, and visualize the topology. |
| **`oc` CLI** | `kubectl` | Drop-in replacement. Every `kubectl` command works with `oc`, plus extras like `oc new-app`, `oc routes`, etc. |

> **Analogy**: if Kubernetes is Linux, OpenShift is Red Hat Enterprise Linux — same kernel, more tooling and enterprise policies on top.

---

## Part 2 — The Big Picture

### 2.1 Architecture Diagram

![Architecture Diagram](architecture.png)

### 2.2 Resource Inventory

These are the **22 Kubernetes/OpenShift resources** that Helm creates from the 21 template files:

| # | Template File | Resource Kind | Resource Name | OCP Console Location |
|---|---|---|---|---|
| 1 | `backend-deployment.yaml` | Deployment | `helpdesk-pro-backend` | Workloads → Deployments |
| 2 | `backend-service.yaml` | Service | `helpdesk-pro-backend` | Networking → Services |
| 3 | `backend-route.yaml` | Route | `helpdesk-pro-backend` | Networking → Routes |
| 4 | `frontend-deployment.yaml` | Deployment | `helpdesk-pro-frontend` | Workloads → Deployments |
| 5 | `frontend-service.yaml` | Service | `helpdesk-pro-frontend` | Networking → Services |
| 6 | `frontend-route.yaml` | Route | `helpdesk-pro-frontend` | Networking → Routes |
| 7 | `frontend-configmap.yaml` | ConfigMap | `helpdesk-pro-frontend-config` | Workloads → ConfigMaps |
| 8 | `frontend-nginx-configmap.yaml` | ConfigMap | `helpdesk-pro-frontend-nginx` | Workloads → ConfigMaps |
| 9 | `keycloak-deployment.yaml` | Deployment | `helpdesk-pro-keycloak` | Workloads → Deployments |
| 10 | `keycloak-service.yaml` | Service | `helpdesk-pro-keycloak` | Networking → Services |
| 11 | `keycloak-route.yaml` | Route | `helpdesk-pro-keycloak` | Networking → Routes |
| 12 | `keycloak-realm-configmap.yaml` | ConfigMap | `keycloak-realm` | Workloads → ConfigMaps |
| 13 | `postgresql-statefulset.yaml` | StatefulSet | `helpdesk-pro-postgresql` | Workloads → StatefulSets |
| 14 | `postgresql-service.yaml` | Service | `helpdesk-pro-postgresql` | Networking → Services |
| 15 | `db-credentials-secret.yaml` | Secret | `helpdesk-pro-db-credentials` | Workloads → Secrets |
| 16 | `ghcr-pull-secret.yaml` | Secret | `helpdesk-pro-ghcr-pull-secret` | Workloads → Secrets |
| 17 | `jenkins-deployment.yaml` | Deployment | `helpdesk-pro-jenkins` | Workloads → Deployments |
| 18 | `jenkins-service.yaml` | Service | `helpdesk-pro-jenkins` | Networking → Services |
| 19 | `jenkins-route.yaml` | Route | `helpdesk-pro-jenkins` | Networking → Routes |
| 20 | `jenkins-pvc.yaml` | PersistentVolumeClaim | `helpdesk-pro-jenkins-pvc` | Storage → PersistentVolumeClaims |
| 21 | `jenkins-secret.yaml` | Secret | `helpdesk-pro-jenkins-secret` | Workloads → Secrets |
| 22 | `jenkins-casc-configmap.yaml` | ConfigMap | `helpdesk-pro-jenkins-casc` | Workloads → ConfigMaps |

**Summary by kind**: 4 Deployments · 1 StatefulSet · 5 Services · 4 Routes · 4 ConfigMaps · 3 Secrets · 1 PVC (+ 1 PVC auto-created by the PostgreSQL StatefulSet)

### 2.3 Request Flow

Here's what happens when a user opens the app in their browser:

```
1. Browser navigates to https://frontend-host
        │
        ▼
2. OpenShift Route (helpdesk-pro-frontend)
   Terminates TLS ("edge" mode), forwards plain HTTP internally
        │
        ▼
3. Service (helpdesk-pro-frontend:8080)
   Load-balances across all frontend Pods
        │
        ▼
4. Frontend Pod (nginx serving Angular SPA)
   ├── Serves index.html, JS bundles, CSS
   ├── Serves /assets/config.json  (injected from ConfigMap at deploy time)
   └── Proxies /api/* requests → helpdesk-pro-backend:8080
                │
                ▼
5. Service (helpdesk-pro-backend:8080)
        │
        ▼
6. Backend Pod (.NET 8 API)
   ├── Validates JWT token (issued by Keycloak)
   │   └── Fetches OIDC metadata from helpdesk-pro-keycloak:8080
   ├── Reads/writes to PostgreSQL
   │   └── Connection string from Secret (helpdesk-pro-db-credentials)
   └── Returns JSON response
        │
        ▼
7. Response flows back: Backend → nginx (frontend Pod) → Route → Browser
```

The user's browser also talks directly to Keycloak (via the Keycloak Route) during login — this is the OIDC/PKCE flow. The frontend JavaScript redirects the user to Keycloak's login page, gets a JWT token back, and attaches it to every `/api/` request.

---

## Part 3 — Component Deep Dives

Each section below covers one application component. For every component, you'll find:
- What resources are created and why
- A guided walkthrough of the template YAML with explanations
- Exactly where to find and inspect these resources in the OpenShift console.

---

### 3.1 PostgreSQL (Database)

**Resources created**: 1 StatefulSet + 1 Service + 1 PersistentVolumeClaim (auto-created)

**Template files**: `postgresql-statefulset.yaml`, `postgresql-service.yaml`

#### Why a StatefulSet Instead of a Deployment?

A **Deployment** is ideal for stateless apps (like web servers) — Pods are interchangeable and can be freely created or destroyed. A **StatefulSet** is designed for stateful workloads (like databases) and guarantees:

- **Stable network identity** — the Pod always gets the same name (`helpdesk-pro-postgresql-0`), not a random suffix.
- **Stable storage** — the PersistentVolumeClaim sticks with the Pod across restarts. If the Pod gets rescheduled to a different node, the same volume reattaches.
- **Ordered startup/shutdown** — important for clustered databases (less critical here with a single replica, but good practice).

#### Template Walkthrough: `postgresql-statefulset.yaml`

```yaml
apiVersion: apps/v1
kind: StatefulSet                        # ← StatefulSet, not Deployment
metadata:
  name: {{ .Release.Name }}-postgresql   # → helpdesk-pro-postgresql
  labels:
    app.kubernetes.io/name: postgresql
    app.kubernetes.io/instance: {{ .Release.Name }}
```

**`metadata.name`**: The StatefulSet's name, prefixed with the Helm release name. This ensures that if you deploy two releases in the same namespace, they won't conflict.

**`labels`**: Standard Kubernetes labels. These are used for organizing and filtering resources in the console. More on labels in [Section 4.8](#48-labels--selectors).

```yaml
spec:
  serviceName: {{ .Release.Name }}-postgresql  # Must match the Service name
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: postgresql
      app.kubernetes.io/instance: {{ .Release.Name }}
```

**`serviceName`**: Required for StatefulSets — links it to its "headless" Service for DNS resolution. Must match the Service defined in `postgresql-service.yaml`.

**`replicas: 1`**: Only one database instance. For a production HA PostgreSQL, you'd use a specialized operator.

**`selector.matchLabels`**: Tells the StatefulSet which Pods belong to it. The StatefulSet only manages Pods whose labels match these selectors exactly.

```yaml
  template:
    metadata:
      labels:                             # These labels MUST match selector.matchLabels
        app.kubernetes.io/name: postgresql
        app.kubernetes.io/instance: {{ .Release.Name }}
    spec:
      securityContext:
        runAsNonRoot: true                # OpenShift requirement — see Section 4.5
```

**`template`**: This is the Pod template — the blueprint for every Pod the StatefulSet creates. The `metadata.labels` here *must* match the `selector.matchLabels` above, or Kubernetes will reject the StatefulSet.

**`securityContext.runAsNonRoot: true`**: Tells OpenShift "this container will not run as root." Notice there's no hardcoded UID — OpenShift's `restricted` SCC will assign an arbitrary UID automatically. More in [Section 4.5](#45-security--sccs).

```yaml
      containers:
        - name: postgresql
          image: "{{ .Values.postgresql.image.registry }}/{{ .Values.postgresql.image.repository }}:{{ .Values.postgresql.image.tag }}"
          # Renders to: docker.io/postgres:16-alpine
          imagePullPolicy: IfNotPresent
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
```

**`image`**: Assembled from three values — registry, repository, and tag. This pattern is common in Helm charts because it lets you easily switch registries (e.g., when mirroring images to an internal registry).

**`imagePullPolicy: IfNotPresent`**: Only pull the image if it's not already cached on the node. Saves bandwidth and speeds up restarts.

**`securityContext`** (container-level): Extra lockdown — no privilege escalation, drop all Linux capabilities. This is the security best practice for OpenShift.

```yaml
          ports:
            - containerPort: 5432
              protocol: TCP
          env:
            - name: POSTGRES_DB
              value: "{{ .Values.postgresql.auth.database }}"     # → helpdesk
            - name: POSTGRES_USER
              value: "{{ .Values.postgresql.auth.username }}"     # → helpdesk
            - name: POSTGRES_PASSWORD
              value: "{{ .Values.postgresql.auth.password }}"     # → helpdesk123
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
```

**`containerPort: 5432`**: Declares that PostgreSQL listens on port 5432. This is informational — it doesn't actually open the port (containers in Kubernetes can always receive traffic on any port). It helps with documentation and tooling.

**`env`**: Environment variables that configure the PostgreSQL container. The official `postgres` image reads these at startup to create the database and user. `PGDATA` tells PostgreSQL to use a subdirectory inside the mount — required because PVCs sometimes have a `lost+found` directory at the root that confuses PostgreSQL.

```yaml
          livenessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - {{ .Values.postgresql.auth.username }}   # → helpdesk
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - {{ .Values.postgresql.auth.username }}
            initialDelaySeconds: 5
            periodSeconds: 5
```

**Health probes** — these use `exec` probes (run a command inside the container) rather than HTTP probes, because PostgreSQL doesn't have an HTTP endpoint. `pg_isready` is a PostgreSQL utility that checks if the server is accepting connections. More on probes in [Section 4.6](#46-health-probes-liveness--readiness).

```yaml
          resources:
            {{- toYaml .Values.postgresql.primary.resources | nindent 12 }}
```

**`resources`**: Rendered from values.yaml. The `toYaml` function converts the YAML block as-is, and `nindent 12` adds 12 spaces of indentation to align it properly. The result:

```yaml
          resources:
            limits:
              cpu: 500m       # Max 0.5 CPU cores
              memory: 512Mi   # Max 512 MB RAM
            requests:
              cpu: 200m       # Guaranteed 0.2 CPU cores
              memory: 256Mi   # Guaranteed 256 MB RAM
```

More on requests/limits in [Section 4.7](#47-resource-requests--limits).

```yaml
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: {{ .Values.postgresql.primary.persistence.size }}  # → 1Gi
```

**`volumeMounts`**: Mounts the PVC at `/var/lib/postgresql/data` — this is where PostgreSQL stores its data files.

**`volumeClaimTemplates`**: This is unique to StatefulSets. Instead of referencing a pre-existing PVC, the StatefulSet *creates* a PVC for each replica. The PVC is named `data-helpdesk-pro-postgresql-0` (format: `{volumeName}-{statefulsetName}-{ordinal}`).

- **`ReadWriteOnce`**: The volume can be mounted read-write by a single node — standard for a database.
- **`storage: 1Gi`**: Requests 1 gigabyte of persistent storage. OpenShift's storage provisioner automatically allocates this.

> **Important**: When you delete the StatefulSet or even the whole Helm release, the PVC is **NOT** automatically deleted. This is intentional — you don't want to lose database data accidentally. You must delete PVCs manually if you want to reclaim the storage.

#### Template Walkthrough: `postgresql-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ .Release.Name }}-postgresql       # → helpdesk-pro-postgresql
  labels:
    app.kubernetes.io/name: postgresql
    app.kubernetes.io/instance: {{ .Release.Name }}
spec:
  type: ClusterIP
  ports:
    - port: 5432
      targetPort: 5432
      protocol: TCP
      name: tcp-postgresql
  selector:
    app.kubernetes.io/name: postgresql
    app.kubernetes.io/instance: {{ .Release.Name }}
```

This Service creates an **internal DNS entry**: `helpdesk-pro-postgresql`. Any Pod in the same namespace can connect to `helpdesk-pro-postgresql:5432` and reach the PostgreSQL Pod. There's no Route for PostgreSQL — the database should never be exposed to the internet.

More on Services in [Section 4.1](#41-services--internal-dns).

#### Where to Find This in OpenShift Console

| What to Inspect | Console Path (Administrator View) | What You'll See |
|---|---|---|
| StatefulSet | **Workloads → StatefulSets → helpdesk-pro-postgresql** | Desired/current replicas, Pod status, events |
| Pod | **Workloads → Pods → helpdesk-pro-postgresql-0** | Container status, resource usage, logs, terminal |
| PVC | **Storage → PersistentVolumeClaims → data-helpdesk-pro-postgresql-0** | Storage class, capacity (1Gi), access mode, bound status |
| Service | **Networking → Services → helpdesk-pro-postgresql** | ClusterIP, port mapping, linked Pods |
| Environment Variables | Pod details → **Environment** tab | POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, PGDATA |

---

### 3.2 Keycloak (Identity Provider)

**Resources created**: 1 Deployment + 1 Service + 1 Route + 1 ConfigMap

**Template files**: `keycloak-deployment.yaml`, `keycloak-service.yaml`, `keycloak-route.yaml`, `keycloak-realm-configmap.yaml`

#### What Keycloak Does in This App

Keycloak is an open-source identity provider (IdP). It handles:
- User login/logout (OIDC/PKCE flow)
- Issuing JWT tokens that the frontend attaches to API requests
- Managing roles (`employee`, `helpdesk-admin`, `helpdesk-tester`) that the backend and Jenkins check for authorization

Keycloak stores its data in the same PostgreSQL database as the app (in separate tables).

#### Template Walkthrough: `keycloak-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-keycloak       # → helpdesk-pro-keycloak
```

A Deployment (not StatefulSet) because Keycloak itself is stateless — all state lives in PostgreSQL.

```yaml
    spec:
      securityContext:
        runAsNonRoot: true
      containers:
        - name: keycloak
          image: "{{ .Values.keycloak.image.registry }}/{{ .Values.keycloak.image.repository }}:{{ .Values.keycloak.image.tag }}"
          # Renders to: quay.io/keycloak/keycloak:25.0
          imagePullPolicy: IfNotPresent
          args:
            - start-dev
            - --import-realm
            - --health-enabled=true
            - --proxy-headers=xforwarded
            {{- if .Values.keycloakRoute.host }}
            - --hostname=https://{{ .Values.keycloakRoute.host }}
            {{- else }}
            - --hostname-strict=false
            {{- end }}
```

**`args`** — command-line arguments passed to the Keycloak binary:

| Argument | Purpose |
|---|---|
| `start-dev` | Runs in development mode (no production optimizations, allows HTTP). Suitable for demos. |
| `--import-realm` | On startup, import any realm JSON files found in `/opt/keycloak/data/import/`. This auto-configures users, roles, and clients. |
| `--health-enabled=true` | Enables the `/health/live` and `/health/ready` endpoints on the management port (9000). |
| `--proxy-headers=xforwarded` | Tells Keycloak it's behind a reverse proxy (the OpenShift Route). Keycloak will trust `X-Forwarded-*` headers for correct URL generation. |
| `--hostname=https://...` | Sets the public-facing hostname. Keycloak uses this to build redirect URLs. If no host is specified, `--hostname-strict=false` allows any hostname. |

The `{{- if ... }}` / `{{- else }}` / `{{- end }}` is Helm's conditional logic — the dash (`-`) trims whitespace so the rendered YAML doesn't have blank lines.

```yaml
          ports:
            - containerPort: 8080
              protocol: TCP
              name: http
            - containerPort: 9000
              protocol: TCP
              name: management
```

**Two ports**: Keycloak 25 separates the main application port (8080) from the management/health port (9000). This is a security best practice — you can expose health checks on a different port that isn't routable from outside.

Notice the `name: http` and `name: management` — these are referenced by the Service and probes using the port name instead of a number. This makes the templates more readable and resilient to port changes.

```yaml
          env:
            - name: KC_DB
              value: postgres
            - name: KC_DB_URL
              value: "jdbc:postgresql://{{ .Values.keycloak.externalDatabase.host }}:{{ .Values.keycloak.externalDatabase.port }}/{{ .Values.keycloak.externalDatabase.database }}"
              # → jdbc:postgresql://helpdesk-pro-postgresql:5432/helpdesk
            - name: KC_DB_USERNAME
              value: "{{ .Values.keycloak.externalDatabase.user }}"
            - name: KC_DB_PASSWORD
              value: "{{ .Values.keycloak.externalDatabase.password }}"
            - name: KEYCLOAK_ADMIN
              value: "{{ .Values.keycloak.auth.adminUser }}"
            - name: KEYCLOAK_ADMIN_PASSWORD
              value: "{{ .Values.keycloak.auth.adminPassword }}"
```

**Environment variables** tell Keycloak how to connect to PostgreSQL and set up the initial admin account. Notice the DB host uses the Service DNS name (`helpdesk-pro-postgresql`) — Kubernetes DNS handles the resolution.

```yaml
          livenessProbe:
            httpGet:
              path: /health/live
              port: management            # ← Uses port name, resolves to 9000
            initialDelaySeconds: 60       # Keycloak takes a while to start
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: management
            initialDelaySeconds: 30
            periodSeconds: 5
```

**Probes** use HTTP GET requests to the management port. Note the long `initialDelaySeconds: 60` for liveness — Keycloak needs time to initialize, especially on first startup when it's running database migrations and importing the realm.

```yaml
          volumeMounts:
            - name: realm-config
              mountPath: /opt/keycloak/data/import
      volumes:
        - name: realm-config
          configMap:
            name: keycloak-realm
```

**Volume mount**: The `keycloak-realm` ConfigMap is mounted as a directory at `/opt/keycloak/data/import/`. The `--import-realm` flag tells Keycloak to read all JSON files in this directory at startup and create the realms/users/clients they describe.

#### Template Walkthrough: `keycloak-realm-configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: keycloak-realm
data:
  realm-export.json: |-
    {{ .Files.Get "realm-export.json" | nindent 4 }}
```

**`{{ .Files.Get "realm-export.json" }}`**: Helm reads the file `helm/realm-export.json` at build time and embeds its entire contents into the ConfigMap. This is how the Keycloak realm configuration (users, roles, clients) gets packaged and deployed alongside the application.

The `|-` is YAML's "literal block scalar with strip last newline" indicator — it means "include this multi-line string as-is."

> **What's in the realm?** The `helpdesk` realm contains:
> - **Clients**: `helpdesk-frontend` (public, PKCE), `helpdesk-backend` (confidential), and `helpdesk-jenkins` (confidential, OIDC login for Jenkins)
> - **Roles**: `employee`, `helpdesk-admin`, and `helpdesk-tester`
> - **Demo users** (all with password `password123`):
>   - `employee1` through `employee5` (employee role)
>   - `admin1` and `admin2` (employee + helpdesk-admin roles)
>   - `tester1` (helpdesk-tester role)

#### Template Walkthrough: `keycloak-service.yaml`

```yaml
spec:
  type: ClusterIP
  ports:
    - port: 8080
      targetPort: http         # ← Resolves to container port named "http" (8080)
      protocol: TCP
      name: http
  selector:
    app.kubernetes.io/name: keycloak
    app.kubernetes.io/instance: {{ .Release.Name }}
```

Only the `http` port (8080) is exposed via Service — the management port (9000) is only used internally by health probes. External traffic reaches Keycloak through the Route below.

#### Template Walkthrough: `keycloak-route.yaml`

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: {{ .Release.Name }}-keycloak
spec:
  {{- if .Values.keycloakRoute.host }}
  host: {{ .Values.keycloakRoute.host }}
  {{- end }}
  to:
    kind: Service
    name: {{ .Release.Name }}-keycloak
    weight: 100
  port:
    targetPort: http
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

This Route makes Keycloak accessible from outside the cluster. The browser needs to reach Keycloak for the OIDC login flow. More on Routes in [Section 4.2](#42-routes-openshift-specific).

#### Where to Find This in OpenShift Console

| What to Inspect | Console Path (Administrator View) | What You'll See |
|---|---|---|
| Deployment | **Workloads → Deployments → helpdesk-pro-keycloak** | Replica count, rolling update strategy, Pod template |
| Pod | **Workloads → Pods → helpdesk-pro-keycloak-xxxxx** | Two ports (8080, 9000), environment variables, volume mounts |
| Service | **Networking → Services → helpdesk-pro-keycloak** | Port 8080/TCP, linked Pod endpoints |
| Route | **Networking → Routes → helpdesk-pro-keycloak** | Public URL (click to open Keycloak), TLS settings |
| ConfigMap | **Workloads → ConfigMaps → keycloak-realm** | The full realm-export.json content (click to view) |
| Pod Logs | Pod details → **Logs** tab | Keycloak startup, realm import progress, SQL migration logs |

---

### 3.3 Backend (.NET 8 API)

**Resources created**: 1 Deployment + 1 Service + 1 Route

**Template files**: `backend-deployment.yaml`, `backend-service.yaml`, `backend-route.yaml`

The backend also *uses* 1 Secret (`helpdesk-pro-db-credentials`) for the database connection string.

#### Template Walkthrough: `backend-deployment.yaml`

```yaml
    spec:
      {{- if .Values.ghcrSecret.enabled }}
      imagePullSecrets:
        - name: {{ .Release.Name }}-ghcr-pull-secret
      {{- end }}
```

**`imagePullSecrets`**: The backend image is hosted on GitHub Container Registry (GHCR), which requires authentication for private repositories. This tells the node's container runtime: "use the credentials in `helpdesk-pro-ghcr-pull-secret` when pulling this image." Conditionally rendered — if you're using a public image, set `ghcrSecret.enabled: false` and this block disappears.

```yaml
      containers:
        - name: backend
          image: "{{ .Values.backend.image.registry }}/{{ .Values.backend.image.repository }}:{{ .Values.backend.image.tag }}"
          # Renders to: ghcr.io/your-github-username/helpdesk-backend:latest
          imagePullPolicy: {{ .Values.backend.image.pullPolicy }}
          ports:
            - containerPort: 8080
              protocol: TCP
```

The .NET API listens on port 8080 (configured in the Docker image).

```yaml
          env:
            - name: ASPNETCORE_ENVIRONMENT
              value: Production
            - name: CONNECTION_STRING
              valueFrom:
                secretKeyRef:
                  name: {{ .Release.Name }}-db-credentials
                  key: connectionString
```

**`ASPNETCORE_ENVIRONMENT`**: Tells .NET to use production configuration (less verbose logging, etc.).

**`CONNECTION_STRING` via `secretKeyRef`**: Instead of putting the database password directly in the Deployment, it references the `helpdesk-pro-db-credentials` Secret. This is a security best practice — the connection string is stored separately, and OpenShift can mask it in the console. The `key: connectionString` refers to a specific entry in the Secret.

```yaml
            - name: Keycloak__Authority
              value: "{{ .Values.backend.keycloak.authority }}"
            - name: Keycloak__MetadataAddress
              value: "http://{{ .Release.Name }}-keycloak:8080/realms/helpdesk/.well-known/openid-configuration"
            - name: Keycloak__ClientId
              value: "{{ .Values.backend.keycloak.clientId }}"
            - name: Keycloak__ClientSecret
              value: "{{ .Values.backend.keycloak.clientSecret }}"
```

**Keycloak integration** — the backend validates JWT tokens against Keycloak:

| Variable | Purpose |
|---|---|
| `Keycloak__Authority` | The public URL of the Keycloak realm (used for token validation). Set via values. |
| `Keycloak__MetadataAddress` | The **internal** URL for the OIDC discovery document. Uses the Service DNS name (`helpdesk-pro-keycloak:8080`) so the backend talks to Keycloak cluster-internally (faster, no TLS overhead). |
| `Keycloak__ClientId` | `helpdesk-backend` — identifies this API to Keycloak. |
| `Keycloak__ClientSecret` | `backend-secret` — used for confidential client authentication. |

> **Notice the two Keycloak URLs**: `Authority` is the external/public URL (what browsers use), while `MetadataAddress` is the internal URL (what the backend Pod uses). This is a common pattern — Pod-to-Pod communication stays inside the cluster and doesn't go through the Route.

```yaml
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 5
```

**Two health endpoints**:
- `/healthz` (liveness) — always returns 200 if the process is alive. If this fails, Kubernetes restarts the Pod.
- `/readyz` (readiness) — checks database connectivity. If this fails, the Pod is removed from the Service's endpoint list (stops receiving traffic) but is *not* restarted.

The readiness probe has a longer `initialDelaySeconds` (15s) than liveness (10s) — the backend needs time to connect to PostgreSQL before it's ready to serve.

> **How roles work in the backend**: Keycloak stores realm roles inside the JWT's `realm_access.roles` claim, but .NET's `[Authorize(Roles = "...")]` checks standard role claims. The backend bridges this gap with a custom `KeycloakRolesClaimsTransformation` (an `IClaimsTransformation` registered in `Program.cs`) that extracts roles from `realm_access` and maps them to .NET role claims on every request. Without this transformation, role-based authorization (`helpdesk-admin` checks) would silently fail.

#### Template Walkthrough: `backend-service.yaml`

```yaml
spec:
  type: ClusterIP
  ports:
    - port: 8080
      targetPort: 8080
      protocol: TCP
  selector:
    app.kubernetes.io/name: backend
    app.kubernetes.io/instance: {{ .Release.Name }}
```

Standard ClusterIP Service. The frontend's nginx uses this to proxy `/api/` requests — the nginx config references `helpdesk-pro-backend:8080`.

#### Template Walkthrough: `backend-route.yaml`

```yaml
spec:
  {{- if .Values.backend.route.host }}
  host: {{ .Values.backend.route.host }}
  {{- end }}
  to:
    kind: Service
    name: {{ .Release.Name }}-backend
    weight: 100
  port:
    targetPort: 8080
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

The backend Route provides a *public* URL for the API. In this architecture, the primary API traffic goes through the frontend's nginx proxy (frontend → backend internally), but the backend Route is useful for:
- Direct API access (e.g., from Swagger UI)
- External integrations
- Debugging

> **Swagger OAuth note**: The backend's Swagger UI is configured with OAuth2 PKCE using the `helpdesk-frontend` client ID (not `helpdesk-backend`). This is because `helpdesk-frontend` is the public PKCE client — Swagger needs to perform the same browser-based login flow as the Angular app. You can log in to Swagger as `admin1` to test admin-only endpoints.

#### Where to Find This in OpenShift Console

| What to Inspect | Console Path (Administrator View) | What You'll See |
|---|---|---|
| Deployment | **Workloads → Deployments → helpdesk-pro-backend** | Replicas, image, revision history |
| Pod | **Workloads → Pods → helpdesk-pro-backend-xxxxx** | Container status, env vars (CONNECTION_STRING shows as "from Secret") |
| Service | **Networking → Services → helpdesk-pro-backend** | ClusterIP, port 8080, endpoints |
| Route | **Networking → Routes → helpdesk-pro-backend** | Public URL to Swagger UI |
| Secret (used) | **Workloads → Secrets → helpdesk-pro-db-credentials** | Connection string (reveal values to see) |

---

### 3.4 Frontend (Angular + nginx)

**Resources created**: 1 Deployment + 1 Service + 1 Route + 2 ConfigMaps

**Template files**: `frontend-deployment.yaml`, `frontend-service.yaml`, `frontend-route.yaml`, `frontend-configmap.yaml`, `frontend-nginx-configmap.yaml`

The frontend is an Angular single-page application (SPA) built into static files and served by nginx. Two ConfigMaps inject configuration at deploy time, making the same Docker image work in any environment.

#### Template Walkthrough: `frontend-configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-frontend-config   # → helpdesk-pro-frontend-config
data:
  config.json: |
    {
      "keycloakUrl": "https://{{ .Values.keycloakRoute.host }}",
      "keycloakRealm": "{{ .Values.frontend.keycloakRealm }}",
      "keycloakClientId": "{{ .Values.frontend.keycloakClientId }}",
      "apiUrl": "/api"
    }
```

**Runtime configuration injection** — this is a common pattern for SPAs deployed to Kubernetes:

1. At build time, the Angular app is compiled into static JS/CSS/HTML files.
2. The code fetches `/assets/config.json` at startup (`ConfigService` in `app.config.ts`).
3. This ConfigMap provides a *deploy-time* version of `config.json`, mounted into the container's filesystem.
4. Result: the **same Docker image** works in any environment — just change the ConfigMap values.

The `config.json` tells the frontend:
- Where to find Keycloak (the public URL)
- Which Keycloak realm and client to use
- The API URL (`/api` — which nginx proxies internally)

#### Template Walkthrough: `frontend-nginx-configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-frontend-nginx   # → helpdesk-pro-frontend-nginx
data:
  default.conf: |
    server {
        listen 8080;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;
```

This replaces nginx's default site configuration. Key sections:

**Security headers**:
```yaml
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```
These headers protect against clickjacking, MIME sniffing, XSS, and referrer leaks.

**SPA routing**:
```yaml
        location / {
            try_files $uri $uri/ /index.html;
        }
```
The `try_files` directive is essential for SPAs: if a URL like `/admin/dashboard` doesn't match a physical file, serve `index.html` instead and let Angular's client-side router handle it.

**API reverse proxy**:
```yaml
        location /api/ {
            proxy_pass http://{{ .Release.Name }}-backend:8080/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Authorization $http_authorization;
        }
```

This is the most important piece — it proxies all `/api/` requests from the browser to the backend Service:

```
Browser → Route (frontend) → nginx Pod → proxy_pass → Service (backend) → Backend Pod
```

| Header | Purpose |
|---|---|
| `Host` | Preserves the original hostname |
| `X-Real-IP` | Passes the client's real IP to the backend |
| `X-Forwarded-For` | Appends to the proxy chain for logging |
| `X-Forwarded-Proto` | Tells the backend whether the original request was HTTP or HTTPS |
| `Authorization` | **Critical** — forwards the JWT Bearer token from the browser to the backend |

This proxy pattern avoids CORS issues entirely — the browser makes all requests to the same origin (the frontend URL), and nginx forwards `/api/` to a different service internally.

#### Template Walkthrough: `frontend-deployment.yaml`

```yaml
      containers:
        - name: frontend
          image: "{{ .Values.frontend.image.registry }}/{{ .Values.frontend.image.repository }}:{{ .Values.frontend.image.tag }}"
          # Renders to: ghcr.io/your-github-username/helpdesk-frontend:latest
          ports:
            - containerPort: 8080
              protocol: TCP
          volumeMounts:
            - name: config
              mountPath: /usr/share/nginx/html/assets/config.json
              subPath: config.json
            - name: nginx-config
              mountPath: /etc/nginx/conf.d/default.conf
              subPath: default.conf
```

**Two volume mounts with `subPath`**:

| Mount | What It Does |
|---|---|
| `config` → `/usr/share/nginx/html/assets/config.json` | Replaces the default `config.json` with the one from the ConfigMap |
| `nginx-config` → `/etc/nginx/conf.d/default.conf` | Replaces nginx's default site config with our custom one |

**`subPath`** is critical here. Without it, mounting a ConfigMap at a directory would *replace the entire directory's contents*. With `subPath: config.json`, only the single file `config.json` is replaced — everything else in the directory stays intact.

```yaml
      volumes:
        - name: config
          configMap:
            name: {{ .Release.Name }}-frontend-config
        - name: nginx-config
          configMap:
            name: {{ .Release.Name }}-frontend-nginx
```

**`volumes`** — defines the volumes available to the Pod. Each references a ConfigMap, and the `volumeMounts` above determine where in the filesystem they appear.

The volume → mount relationship:

```
ConfigMap: helpdesk-pro-frontend-config
    └─ Volume: config
        └─ VolumeMount: /usr/share/nginx/html/assets/config.json (subPath: config.json)

ConfigMap: helpdesk-pro-frontend-nginx
    └─ Volume: nginx-config
        └─ VolumeMount: /etc/nginx/conf.d/default.conf (subPath: default.conf)
```

#### Where to Find This in OpenShift Console

| What to Inspect | Console Path (Administrator View) | What You'll See |
|---|---|---|
| Deployment | **Workloads → Deployments → helpdesk-pro-frontend** | 2 volumes, 2 volume mounts in the Pod template |
| Pod | **Workloads → Pods → helpdesk-pro-frontend-xxxxx** | Volume mounts tab shows the two ConfigMaps |
| Service | **Networking → Services → helpdesk-pro-frontend** | ClusterIP, port 8080 |
| Route | **Networking → Routes → helpdesk-pro-frontend** | The app's public URL — click it to open the SPA |
| ConfigMap (app config) | **Workloads → ConfigMaps → helpdesk-pro-frontend-config** | The `config.json` content — verify Keycloak URL is correct |
| ConfigMap (nginx) | **Workloads → ConfigMaps → helpdesk-pro-frontend-nginx** | The `default.conf` — check proxy_pass target |

---

### 3.5 Jenkins (CI/CD)

**Resources created**: 1 Deployment + 1 Service + 1 Route + 1 PersistentVolumeClaim + 1 Secret + 1 ConfigMap

**Template files**: `jenkins-deployment.yaml`, `jenkins-service.yaml`, `jenkins-route.yaml`, `jenkins-pvc.yaml`, `jenkins-secret.yaml`, `jenkins-casc-configmap.yaml`

Jenkins also *uses* the `helpdesk-pro-ghcr-pull-secret` Secret (if enabled) to pull its container image, and the `helpdesk-pro-jenkins-secret` Secret for OIDC credentials and the admin password.

#### What Jenkins Does in This App

Jenkins is the CI/CD server for running Playwright end-to-end (E2E) tests against the deployed application. It provides:
- A pre-configured **"Run-Playwright-Tests"** job that runs browser tests against the frontend
- **OIDC authentication via Keycloak** — users log in with their Keycloak credentials (no separate Jenkins accounts)
- **Role-based access** mapped to Keycloak roles: `helpdesk-admin` users get full admin access, `helpdesk-tester` users can trigger builds, and all authenticated users get read-only access

The Jenkins Docker image (`jenkins/Dockerfile`) comes pre-built with Node.js 20 and Playwright browsers (Chromium and Firefox), so test jobs run without additional setup.

#### Template Walkthrough: `jenkins-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-jenkins         # → helpdesk-pro-jenkins
```

A Deployment with one key difference from the others:

```yaml
spec:
  replicas: {{ .Values.jenkins.replicas }}   # → 1
  strategy:
    type: Recreate                           # ← Not RollingUpdate
```

**`strategy: Recreate`**: Unlike the other Deployments (which use the default `RollingUpdate`), Jenkins uses `Recreate`. This means during an upgrade, the old Pod is terminated *before* the new one starts. This is necessary because Jenkins uses a PersistentVolumeClaim with `ReadWriteOnce` access — only one Pod can mount it at a time. With `RollingUpdate`, the old and new Pod would fight over the volume.

```yaml
      containers:
        - name: jenkins
          image: "{{ .Values.jenkins.image.registry }}/{{ .Values.jenkins.image.repository }}:{{ .Values.jenkins.image.tag }}"
          # Renders to: ghcr.io/maguiarr/helpdesk-jenkins:latest
          ports:
            - containerPort: 8080
              protocol: TCP
              name: http
            - containerPort: 50000
              protocol: TCP
              name: agent
```

**Two ports**: Port 8080 is the Jenkins web UI. Port 50000 is the JNLP agent port — used if you connect external Jenkins agents (not used in this demo, but the standard Jenkins image exposes it).

```yaml
          env:
            - name: JAVA_OPTS
              value: "-Xmx384m ... -Djenkins.install.runSetupWizard=false -Dhudson.model.DirectoryBrowserSupport.CSP=..."
            - name: CASC_JENKINS_CONFIG
              value: "/var/jenkins_home/casc_configs/"
            - name: JENKINS_OIDC_CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: {{ .Release.Name }}-jenkins-secret
                  key: oidc-client-secret
            - name: KEYCLOAK_URL
              value: "https://{{ .Values.keycloakRoute.host }}"
            - name: DEFAULT_BASE_URL
              value: "https://{{ .Values.frontend.route.host }}"
            - name: HEALTH_CHECK_URL
              value: "http://{{ .Release.Name }}-backend:8080/healthz"
            - name: JENKINS_ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: {{ .Release.Name }}-jenkins-secret
                  key: admin-password
```

**Environment variables**:

| Variable | Purpose |
|---|---|
| `JAVA_OPTS` | JVM memory limits (384m heap) and disables the setup wizard. Also sets a Content Security Policy for the HTML Publisher plugin (Playwright reports). |
| `CASC_JENKINS_CONFIG` | Points to where Jenkins Configuration as Code (JCasC) files are mounted. |
| `JENKINS_OIDC_CLIENT_SECRET` | From Secret — the Keycloak client secret for `helpdesk-jenkins`. |
| `KEYCLOAK_URL` | The public Keycloak URL — used by JCasC to configure OIDC endpoints. |
| `DEFAULT_BASE_URL` | The frontend URL — default target for Playwright tests. |
| `HEALTH_CHECK_URL` | Internal backend health endpoint — used as a pre-test check. |
| `JENKINS_ADMIN_PASSWORD` | From Secret — fallback admin password (used before Keycloak OIDC is available). |

```yaml
          livenessProbe:
            httpGet:
              path: /login
              port: 8080
            initialDelaySeconds: 120      # Jenkins is slow to start
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /login
              port: 8080
            initialDelaySeconds: 90
            periodSeconds: 10
```

**Probes**: Jenkins has the longest `initialDelaySeconds` of any component (120s for liveness, 90s for readiness) because it needs to load plugins, apply JCasC configuration, and initialize the Keycloak OIDC connection. The `/login` endpoint is used because Jenkins doesn't have a dedicated health API.

```yaml
          volumeMounts:
            - name: jenkins-home
              mountPath: /var/jenkins_home
            - name: casc-config
              mountPath: /var/jenkins_home/casc_configs
            - name: dshm
              mountPath: /dev/shm
      volumes:
        - name: jenkins-home
          persistentVolumeClaim:
            claimName: {{ .Release.Name }}-jenkins-pvc
        - name: casc-config
          configMap:
            name: {{ .Release.Name }}-jenkins-casc
        - name: dshm
          emptyDir:
            medium: Memory
            sizeLimit: 64Mi
```

**Three volumes**:

| Volume | Type | Mount Path | Purpose |
|---|---|---|---|
| `jenkins-home` | PVC (5Gi) | `/var/jenkins_home` | Persistent Jenkins data — job history, workspace, plugins. Survives Pod restarts. |
| `casc-config` | ConfigMap | `/var/jenkins_home/casc_configs` | Jenkins Configuration as Code YAML file (see below). |
| `dshm` | EmptyDir (Memory) | `/dev/shm` | Shared memory for Chromium — headless browsers need `/dev/shm` to be larger than the default 64KB. Without this, Chromium crashes with out-of-memory errors during tests. |

#### Template Walkthrough: `jenkins-casc-configmap.yaml`

This is the most complex ConfigMap in the project. It contains a full **Jenkins Configuration as Code (JCasC)** YAML file that declaratively configures Jenkins on startup — no manual UI clicks needed.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-jenkins-casc     # → helpdesk-pro-jenkins-casc
data:
  jenkins.yaml: |
    jenkins:
      systemMessage: "HelpDesk Pro - Jenkins CI Server (configured via JCasC)"
      numExecutors: 2
      mode: NORMAL
```

**Key JCasC sections**:

**1. Keycloak OIDC Authentication** (`securityRealm.oic`):

Jenkins authenticates users via Keycloak's OpenID Connect endpoints. The `clientId` is `helpdesk-jenkins` and the `clientSecret` is injected from the Secret via the `JENKINS_OIDC_CLIENT_SECRET` environment variable.

| OIDC Setting | Value |
|---|---|
| Issuer | `https://{keycloak-host}/realms/helpdesk` |
| User mapping | `preferred_username` → username, `email` → email, `name` → fullName |
| Group mapping | `realm_roles` → groups (maps Keycloak roles to Jenkins groups) |

**2. Role-Based Authorization** (`authorizationStrategy.roleBased`):

| Jenkins Role | Keycloak Group | Permissions |
|---|---|---|
| `admin` | `helpdesk-admin` | Full admin (Overall/Administer) |
| `tester` | `helpdesk-tester` | Run jobs, view workspaces (Job/Build, Job/Read, etc.) |
| `readonly` | `authenticated` | Read-only access for all logged-in users |

**3. Playwright Test Job** (defined via Job DSL in the same ConfigMap):

The ConfigMap includes a Job DSL script that creates the **"Run-Playwright-Tests"** job with:
- **Parameters**: `BASE_URL` (frontend URL to test), `BROWSER_PROJECT` (chromium/firefox/all), `TEST_RETRIES` (default: 1)
- **SCM**: Clones the project Git repository
- **Build step**: Runs `e2e/scripts/ci-entrypoint.sh` which installs dependencies and executes Playwright
- **Post-build**: Publishes Playwright HTML reports and archives test results

**4. Test Credentials** (stored in Jenkins, sourced from environment):

The JCasC config registers test user credentials (`employee1`/`password123` and `admin1`/`password123`) so Playwright tests can log in to the application.

#### Template Walkthrough: `jenkins-pvc.yaml`

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: {{ .Release.Name }}-jenkins-pvc      # → helpdesk-pro-jenkins-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: {{ .Values.jenkins.persistence.size }}  # → 5Gi
```

A standalone PVC (unlike PostgreSQL which uses `volumeClaimTemplates`). This stores Jenkins home directory data — job history, build logs, plugin data.

> **Important**: Like the PostgreSQL PVC, this PVC is **NOT** automatically deleted when you uninstall the Helm release. Delete it manually if you want to reclaim storage: `oc delete pvc helpdesk-pro-jenkins-pvc`.

#### Template Walkthrough: `jenkins-secret.yaml`

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: {{ .Release.Name }}-jenkins-secret    # → helpdesk-pro-jenkins-secret
type: Opaque
stringData:
  oidc-client-secret: "{{ .Values.jenkins.keycloak.clientSecret }}"
  admin-password: "{{ .Values.jenkins.adminPassword | default "admin" }}"
```

Two keys:
- **`oidc-client-secret`**: The Keycloak client secret for `helpdesk-jenkins` (default: `jenkins-secret`). Used by Jenkins to authenticate with Keycloak's token endpoint.
- **`admin-password`**: Fallback admin password (default: `admin`). Used if Keycloak is unavailable.

#### Template Walkthrough: `jenkins-service.yaml`

```yaml
spec:
  type: ClusterIP
  ports:
    - port: 8080
      targetPort: 8080
      protocol: TCP
      name: http
    - port: 50000
      targetPort: 50000
      protocol: TCP
      name: agent
  selector:
    app.kubernetes.io/name: jenkins
    app.kubernetes.io/instance: {{ .Release.Name }}
```

Two ports exposed: `http` (8080) for the web UI and `agent` (50000) for JNLP agent connections. Only the `http` port is routed externally (see Route below).

#### Template Walkthrough: `jenkins-route.yaml`

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: {{ .Release.Name }}-jenkins
spec:
  to:
    kind: Service
    name: {{ .Release.Name }}-jenkins
    weight: 100
  port:
    targetPort: 8080
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

Standard edge-terminated Route. Unlike the other Routes, there's no configurable `host` field in the current template — OpenShift auto-generates the hostname.

#### Where to Find This in OpenShift Console

| What to Inspect | Console Path (Administrator View) | What You'll See |
|---|---|---|
| Deployment | **Workloads → Deployments → helpdesk-pro-jenkins** | Recreate strategy, 3 volumes, image pull secret |
| Pod | **Workloads → Pods → helpdesk-pro-jenkins-xxxxx** | Two ports (8080, 50000), 3 volume mounts, env vars (secrets show as "from Secret") |
| Service | **Networking → Services → helpdesk-pro-jenkins** | Ports 8080 and 50000, Pod endpoints |
| Route | **Networking → Routes → helpdesk-pro-jenkins** | Public URL — click to open Jenkins UI |
| PVC | **Storage → PersistentVolumeClaims → helpdesk-pro-jenkins-pvc** | 5Gi, ReadWriteOnce, bound status |
| Secret | **Workloads → Secrets → helpdesk-pro-jenkins-secret** | oidc-client-secret and admin-password (click "Reveal values") |
| ConfigMap | **Workloads → ConfigMaps → helpdesk-pro-jenkins-casc** | Full JCasC YAML — OIDC config, roles, job definition |
| Pod Logs | Pod details → **Logs** tab | Plugin loading, JCasC application, OIDC connection status |

---

## Part 4 — Cross-Cutting Concepts

These concepts appear across multiple templates. Each section explains the concept and points you to where it's used.

---

### 4.1 Services & Internal DNS

**What is a Service?**

A Service gives a stable network address to a group of Pods. Pods come and go (they get new IPs each time), but a Service always keeps the same IP and DNS name.

**Analogy**: think of it like a load balancer that always has the same address, even though the backend servers behind it change.

```
                    ┌─────────────────────┐
                    │  Service             │
  Clients ────────► │  helpdesk-pro-backend│ ────► Pod A (10.128.0.15)
  connect to        │  ClusterIP: 172.30.x│ ────► Pod B (10.128.0.16)
  172.30.x.y:8080   │  Port: 8080         │ ────► Pod C (10.128.0.17)
                    └─────────────────────┘
```

**ClusterIP** (the type used in all our Services): only accessible from inside the cluster. No external traffic can reach a ClusterIP Service directly — that's what Routes are for.

**DNS**: Kubernetes runs an internal DNS server. Every Service gets a DNS entry:

```
{service-name}.{namespace}.svc.cluster.local
```

In practice, within the same namespace you can just use the short name:

```
helpdesk-pro-postgresql    → resolves to the PostgreSQL Service's ClusterIP
helpdesk-pro-backend       → resolves to the Backend Service's ClusterIP
helpdesk-pro-keycloak      → resolves to the Keycloak Service's ClusterIP
helpdesk-pro-jenkins       → resolves to the Jenkins Service's ClusterIP
```

This is how the nginx proxy reaches the backend (`proxy_pass http://helpdesk-pro-backend:8080/api/`) and how Keycloak reaches PostgreSQL (`jdbc:postgresql://helpdesk-pro-postgresql:5432/helpdesk`).

**Port vs targetPort**:

```yaml
ports:
  - port: 8080         # Port the Service listens on
    targetPort: 8080   # Port on the Pod to forward to
```

These can be different. For example, a Service could listen on port 80 and forward to port 8080 on the Pod. In our case, they're the same for simplicity.

**Where to find**: **Networking → Services** (Administrator view) or **Project → Services** (Developer view). Each Service page shows its ClusterIP, ports, and a list of Pod endpoints it currently routes to.

**This project's Services**:

| Service | Port | Connected To |
|---|---|---|
| `helpdesk-pro-frontend` | 8080 | Frontend Deployment Pods |
| `helpdesk-pro-backend` | 8080 | Backend Deployment Pods |
| `helpdesk-pro-keycloak` | 8080 (named `http`) | Keycloak Deployment Pods |
| `helpdesk-pro-postgresql` | 5432 (named `tcp-postgresql`) | PostgreSQL StatefulSet Pods |
| `helpdesk-pro-jenkins` | 8080 (named `http`), 50000 (named `agent`) | Jenkins Deployment Pods |

---

### 4.2 Routes (OpenShift-Specific)

**What is a Route?**

A Route is OpenShift's way of exposing a Service to the outside world. It maps an external hostname and URL to an internal Service.

**Analogy**: if a Service is a private phone extension, a Route is the public phone number that rings that extension.

**How it's different from Kubernetes Ingress**: plain Kubernetes uses Ingress resources, which require a separately installed Ingress controller (like nginx-ingress or Traefik). OpenShift has its built-in HAProxy router that processes Routes natively — zero setup needed.

#### Route YAML explained (using frontend as an example):

```yaml
apiVersion: route.openshift.io/v1          # OCP-specific API
kind: Route
metadata:
  name: helpdesk-pro-frontend
spec:
  host: frontend.apps.mycluster.example.com  # Optional — if omitted, auto-generated
  to:
    kind: Service
    name: helpdesk-pro-frontend              # Which Service to route to
    weight: 100                              # 100% of traffic to this Service
  port:
    targetPort: 8080                         # Which Service port to target
  tls:
    termination: edge                        # TLS terminates at the router
    insecureEdgeTerminationPolicy: Redirect  # HTTP → redirect to HTTPS
```

**Key fields**:

| Field | Meaning |
|---|---|
| `host` | The public hostname. If empty, OpenShift auto-generates one (usually `{name}-{namespace}.apps.{cluster-domain}`). |
| `to.name` | The internal Service to route traffic to. |
| `weight: 100` | Traffic weight — useful for blue/green deployments. `100` means all traffic goes here. |
| `tls.termination: edge` | TLS is terminated at the OpenShift router (HAProxy). Traffic inside the cluster is plain HTTP. |
| `insecureEdgeTerminationPolicy: Redirect` | If someone visits `http://`, automatically redirect them to `https://`. |

**TLS termination modes** (for reference):

| Mode | Where TLS Ends | Internal Traffic |
|---|---|---|
| **Edge** (our templates) | At the router | Plain HTTP |
| Passthrough | At the Pod | Encrypted end-to-end |
| Re-encrypt | At the router, then re-encrypted | Encrypted both hops |

We use **edge** because our containers don't handle TLS themselves — nginx and .NET listen on plain HTTP.

#### This project's Routes:

| Route | Service Target | Purpose |
|---|---|---|
| `helpdesk-pro-frontend` | `helpdesk-pro-frontend:8080` | The app's main URL — users open this |
| `helpdesk-pro-backend` | `helpdesk-pro-backend:8080` | Direct API access / Swagger UI |
| `helpdesk-pro-keycloak` | `helpdesk-pro-keycloak:8080` (port name: `http`) | Keycloak login page & OIDC endpoints |
| `helpdesk-pro-jenkins` | `helpdesk-pro-jenkins:8080` | Jenkins CI/CD UI |

**Where to find**: **Networking → Routes**. Each Route page shows:
- The public **Location** URL (clickable)
- The target Service and port
- TLS settings
- Whether the Route is *Admitted* (successfully processed by the router)

> **Tip**: In the Route list, the **Location** column shows the full URL. You can click it to open the service in your browser. This is the fastest way to find the Keycloak admin console or the app URL.

---

### 4.3 Secrets

**What is a Secret?**

A Secret stores sensitive data — passwords, tokens, certificates, Docker registry credentials. It's similar to a ConfigMap but:
- Values are base64-encoded (not encrypted by default — base64 is **not** encryption!)
- The OpenShift console hides Secret values by default (you must click "Reveal values")
- Secrets can be mounted as files or injected as environment variables

#### This project's Secrets:

**1. `helpdesk-pro-db-credentials`** (from `db-credentials-secret.yaml`):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: {{ .Release.Name }}-db-credentials
type: Opaque                                      # Generic secret
stringData:                                        # ← stringData (not data)
  connectionString: "Host={{ .Release.Name }}-postgresql;Port=5432;Database=..."
```

| Field | Meaning |
|---|---|
| `type: Opaque` | Generic secret — can contain any key/value pairs. |
| `stringData` | Lets you write values as plain text in the template. Kubernetes automatically base64-encodes them when stored. Alternative: `data` expects base64-encoded values. |

This Secret is consumed by the backend Deployment via `secretKeyRef`:

```yaml
env:
  - name: CONNECTION_STRING
    valueFrom:
      secretKeyRef:
        name: helpdesk-pro-db-credentials
        key: connectionString
```

**2. `helpdesk-pro-ghcr-pull-secret`** (from `ghcr-pull-secret.yaml`):

```yaml
{{- if .Values.ghcrSecret.enabled }}         # Only created if enabled
apiVersion: v1
kind: Secret
metadata:
  name: {{ .Release.Name }}-ghcr-pull-secret
type: kubernetes.io/dockerconfigjson         # Special type for registry auth
data:
  .dockerconfigjson: {{ .Values.ghcrSecret.dockerconfigjson | b64enc | quote }}
{{- end }}
```

| Field | Meaning |
|---|---|
| `type: kubernetes.io/dockerconfigjson` | Special Secret type — Kubernetes knows this contains Docker registry credentials. |
| `.dockerconfigjson` | The standard Docker `config.json` format, containing `{"auths":{"ghcr.io":{"auth":"..."}}}`. |
| `b64enc` | Helm function that base64-encodes the value (required for the `data` field). |
| `{{- if .Values.ghcrSecret.enabled }}` / `{{- end }}` | Conditional — the whole Secret is only created if the Helm value is true. |

This Secret is referenced by `imagePullSecrets` in the frontend, backend, and Jenkins Deployments.

**3. `helpdesk-pro-jenkins-secret`** (from `jenkins-secret.yaml`):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: {{ .Release.Name }}-jenkins-secret
type: Opaque
stringData:
  oidc-client-secret: "{{ .Values.jenkins.keycloak.clientSecret }}"
  admin-password: "{{ .Values.jenkins.adminPassword | default "admin" }}"
```

| Field | Meaning |
|---|---|
| `oidc-client-secret` | Keycloak client secret for the `helpdesk-jenkins` OIDC client — used by Jenkins to authenticate with Keycloak's token endpoint. |
| `admin-password` | Fallback admin password (defaults to `admin`) — used before Keycloak OIDC is available. |

This Secret is consumed by the Jenkins Deployment via two `secretKeyRef` entries (for `JENKINS_OIDC_CLIENT_SECRET` and `JENKINS_ADMIN_PASSWORD`).

**Where to find**: **Workloads → Secrets**. Click a Secret to see:
- The **Details** tab: type, labels, annotations
- The **Data** tab: key names and values (click "Reveal values" to see the actual content)

> **Security note**: anyone with read access to Secrets in the namespace can see the passwords. In production, use an external secrets manager (like HashiCorp Vault) with the External Secrets Operator.

---

### 4.4 ConfigMaps

**What is a ConfigMap?**

A ConfigMap stores non-sensitive configuration data as key/value pairs. The values can be simple strings or entire files (like JSON or nginx configs).

**Analogy**: ConfigMaps are like externalized config files. Instead of baking configuration into the Docker image, you mount it at deploy time.

#### How ConfigMaps Get Into Containers

There are two ways:

**1. As environment variables** (not used in this project, but common):
```yaml
env:
  - name: MY_SETTING
    valueFrom:
      configMapKeyRef:
        name: my-configmap
        key: settingKey
```

**2. As mounted files** (used by this project):
```yaml
volumes:
  - name: config
    configMap:
      name: helpdesk-pro-frontend-config    # Reference the ConfigMap
containers:
  - volumeMounts:
      - name: config
        mountPath: /usr/share/nginx/html/assets/config.json
        subPath: config.json                # Mount only this key as a file
```

**`subPath` is important**: without it, mounting at a directory replaces the *entire directory's contents* with the ConfigMap's keys. With `subPath`, only a single file is added/replaced.

```
Without subPath:                      With subPath:
/usr/share/nginx/html/assets/         /usr/share/nginx/html/assets/
└── config.json  (ONLY this file)     ├── config.json  (replaced)
                                      ├── images/      (preserved)
                                      └── icons/       (preserved)
```

#### This project's ConfigMaps:

| ConfigMap | Keys | Mounted In | Mount Path | Purpose |
|---|---|---|---|---|
| `helpdesk-pro-frontend-config` | `config.json` | Frontend Pod | `/usr/share/nginx/html/assets/config.json` | Angular runtime config (Keycloak URL, API URL) |
| `helpdesk-pro-frontend-nginx` | `default.conf` | Frontend Pod | `/etc/nginx/conf.d/default.conf` | nginx server config (SPA routing, API proxy) |
| `keycloak-realm` | `realm-export.json` | Keycloak Pod | `/opt/keycloak/data/import/` | Keycloak realm with users, roles, clients |
| `helpdesk-pro-jenkins-casc` | `jenkins.yaml` | Jenkins Pod | `/var/jenkins_home/casc_configs` | Jenkins Configuration as Code (OIDC, roles, jobs) |

**Where to find**: **Workloads → ConfigMaps**. Click a ConfigMap to see:
- The **Details** tab: metadata and labels
- The **Data** tab: all key/value pairs. For file-based data (like `config.json`), you'll see the full file content.

> **Common debugging step**: if the app isn't connecting to Keycloak correctly, check the `helpdesk-pro-frontend-config` ConfigMap — is the `keycloakUrl` correct? Is it the external HTTPS URL? This is one of the most frequent configuration issues.

---

### 4.5 Security & SCCs

**What are Security Context Constraints (SCCs)?**

SCCs are an OpenShift-specific feature that control what a Pod is allowed to do at the OS level. Think of them as a firewall for Linux kernel features.

The default `restricted` SCC (applied to all Pods unless you explicitly request a different one) enforces:

| Restriction | What It Means |
|---|---|
| Must run as non-root | Containers cannot run as UID 0 |
| Arbitrary UID assigned | OpenShift picks a random UID from a namespace-specific range |
| No privilege escalation | Container processes can't gain more privileges than their parent |
| Capabilities dropped | Linux capabilities (like `NET_RAW`, `SYS_ADMIN`) are removed |
| Read-only root filesystem | (Optional, not required by `restricted`) |

#### How Our Templates Comply

Every template in this project includes the same security pattern:

**Pod level** (applies to all containers in the Pod):
```yaml
spec:
  securityContext:
    runAsNonRoot: true        # "I promise this container doesn't need root"
```

**Container level** (extra restrictions per container):
```yaml
securityContext:
  allowPrivilegeEscalation: false    # Can't gain more privileges
  capabilities:
    drop:
      - ALL                          # Drop ALL Linux capabilities
```

**Why no hardcoded UID?** Notice we *don't* set `runAsUser: 1000`. This is intentional. OpenShift's `restricted` SCC assigns an arbitrary UID from the namespace's range (e.g., `1000680000`). If you hardcode a UID that's outside this range, the Pod will fail to start with a security context violation.

The `values.openshift.yaml` file documents this design choice:
```yaml
# Security contexts in templates already use runAsNonRoot: true
# without hardcoded UIDs, which is compatible with OpenShift's
# restricted SCC that assigns arbitrary UIDs.
```

> **Common gotcha**: some Docker images only work as root (they write to directories owned by root). These will fail on OpenShift with "CrashLoopBackOff" — check Pod events for `Error: container has runAsNonRoot and image will run as root`. The fix is to use an image that supports arbitrary UIDs (like the official nginx-unprivileged image or PostgreSQL's alpine variant).

**Where to see SCCs**: **Administration → Cluster Settings → Security Context Constraints** (requires cluster-admin role). Most users just need to know their Pods run under the `restricted` SCC.

**Where to see a Pod's security context**: **Workloads → Pods → {pod-name} → YAML** tab. Search for `securityContext`. You'll see the assigned UID in the Pod's `metadata.annotations`:

```yaml
annotations:
  openshift.io/scc: restricted-v2
```

---

### 4.6 Health Probes (Liveness & Readiness)

**Why probes matter**: Kubernetes needs to know if your application is working. Without probes, Kubernetes only knows if the *process* is running — but a process can be alive and completely broken (deadlocked, out of memory, unable to connect to the database).

#### Two Types of Probes

| Probe | Question It Answers | What Happens on Failure |
|---|---|---|
| **Liveness** | "Is the process alive and not stuck?" | Kubernetes **kills and restarts** the container |
| **Readiness** | "Is the app ready to serve traffic?" | Kubernetes **removes the Pod from the Service** (stops sending traffic) but does NOT restart it |

**Analogy**: Liveness is like asking "are you alive?" — if no answer, call 911 (restart). Readiness is like asking "are you available to take customers?" — if not, we'll redirect customers elsewhere until you're ready.

#### Probes in This Project

| Component | Liveness | Readiness | Type |
|---|---|---|---|
| **Backend** | `GET /healthz` (port 8080) — always 200 if alive | `GET /readyz` (port 8080) — checks DB connectivity | HTTP |
| **Frontend** | `GET /` (port 8080) — nginx responds | `GET /` (port 8080) — nginx responds | HTTP |
| **Keycloak** | `GET /health/live` (port 9000) | `GET /health/ready` (port 9000) | HTTP |
| **PostgreSQL** | `pg_isready -U helpdesk` | `pg_isready -U helpdesk` | Exec (runs a command) |
| **Jenkins** | `GET /login` (port 8080) — 120s initial delay | `GET /login` (port 8080) — 90s initial delay | HTTP |

#### Probe Timing Parameters

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 10    # Wait 10s after container starts before first check
  periodSeconds: 10          # Check every 10 seconds
```

| Parameter | Meaning | Default |
|---|---|---|
| `initialDelaySeconds` | Grace period before the first probe | 0 |
| `periodSeconds` | How often to probe | 10 |
| `timeoutSeconds` | How long to wait for a response | 1 |
| `failureThreshold` | How many consecutive failures before taking action | 3 |
| `successThreshold` | How many consecutive successes to be considered OK again | 1 |

> **Why different initialDelaySeconds?** PostgreSQL, Keycloak, and Jenkins are slower to start (database initialization, realm import, plugin loading). Their probes have longer delays (15–120 seconds) to avoid premature restarts.

**Where to see probe status**: **Workloads → Pods → {pod-name}**. The **Events** tab shows probe results:
```
Warning  Unhealthy  10s  kubelet  Readiness probe failed: connection refused
Normal   Started    5s   kubelet  Started container backend
```

If a Pod is stuck in `CrashLoopBackOff`, check Events — it's often a failing liveness probe causing the container to restart in a loop.

---

### 4.7 Resource Requests & Limits

**What are requests and limits?**

Every container can declare how much CPU and memory it needs:

| Setting | What It Does |
|---|---|
| **Requests** | *Minimum guaranteed* resources. The scheduler uses this to decide which node to place the Pod on. |
| **Limits** | *Maximum allowed* resources. If a container exceeds its memory limit, it's killed (OOMKilled). If it exceeds its CPU limit, it's throttled (slowed down). |

**CPU is measured in millicores**: `1000m` = 1 full CPU core. `200m` = 20% of a core.

**Memory is measured in bytes**: `128Mi` = 128 mebibytes (~134 MB). `1Gi` = 1 gibibyte (~1.07 GB).

#### This Project's Resource Allocations

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---|---|---|---|---|
| Frontend (nginx) | 100m | 200m | 64Mi | 128Mi |
| Backend (.NET) | 200m | 500m | 128Mi | 256Mi |
| Keycloak | 500m | 1000m | 512Mi | 1Gi |
| PostgreSQL | 200m | 500m | 256Mi | 512Mi |
| Jenkins | 500m | 1000m | 512Mi | 1Gi |

**Total cluster resources needed** (all requests): 1500m CPU (1.5 cores), 1472Mi memory (~1.5 GB)

> **Tip**: Keycloak and Jenkins are the most resource-hungry components. If Pods are getting `OOMKilled` or stuck in `Pending`, their limits are the first thing to check.

**Where to see**: 
- **Workloads → Pods → {pod-name} → Metrics** tab: real-time CPU and memory usage graphs
- **Workloads → Pods → {pod-name} → YAML** tab: search for `resources`
- If a Pod is `OOMKilled`, the **Events** tab will say `OOMKilled` and the **Status** will show `CrashLoopBackOff`

---

### 4.8 Labels & Selectors

**What are labels?**

Labels are key/value pairs attached to every resource. They're how Kubernetes (and you) organizes and selects resources.

#### The Selector Chain

Labels create a critical chain that connects Deployments → Pods → Services:

```
Deployment (selector):                  Service (selector):
  matchLabels:                            selector:
    app.kubernetes.io/name: backend         app.kubernetes.io/name: backend
    app.kubernetes.io/instance:             app.kubernetes.io/instance:
      helpdesk-pro                            helpdesk-pro
            │                                         │
            ▼                                         │
     Pod (labels):    ◄───────────────────────────────┘
       app.kubernetes.io/name: backend
       app.kubernetes.io/instance: helpdesk-pro
```

1. **Deployment** creates Pods with specific labels
2. **Deployment's selector** matches those labels to know which Pods it manages
3. **Service's selector** matches the same labels to know which Pods to route traffic to

If these labels don't match, the Service won't find the Pods and no traffic flows. This is a common debugging issue — always verify labels match between Deployment, Pod, and Service.

#### Labels Used in This Project

| Label | Value | Purpose |
|---|---|---|
| `app.kubernetes.io/name` | `frontend`, `backend`, `keycloak`, `postgresql`, `jenkins` | Identifies the component |
| `app.kubernetes.io/instance` | `helpdesk-pro` (from `{{ .Release.Name }}`) | Identifies the Helm release |

These follow the [Kubernetes recommended labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/) convention.

**Where labels help in the console**: in any resource list view (e.g., Workloads → Pods), you can filter by label. Click **"Label"** in the filter bar and type `app.kubernetes.io/name=backend` to see only backend Pods.

---

### 4.9 Image Pull Secrets

**What are image pull secrets?**

When your container images are stored in a private registry (like GitHub Container Registry), the cluster needs credentials to download them. An image pull secret provides these credentials.

#### How It Works in This Project

1. **The Secret is created** (conditionally):

```yaml
{{- if .Values.ghcrSecret.enabled }}
apiVersion: v1
kind: Secret
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: {{ .Values.ghcrSecret.dockerconfigjson | b64enc | quote }}
{{- end }}
```

2. **Deployments reference it**:

```yaml
spec:
  template:
    spec:
      {{- if .Values.ghcrSecret.enabled }}
      imagePullSecrets:
        - name: helpdesk-pro-ghcr-pull-secret
      {{- end }}
```

3. When the Deployment creates a Pod, the node's container runtime (CRI-O on OpenShift) uses the credentials from the Secret to authenticate with `ghcr.io` and pull the image.

**Where to see pull errors**: if credentials are wrong or missing, the Pod will be stuck in `ImagePullBackOff` status. Check **Workloads → Pods → {pod-name} → Events**:

```
Warning  Failed   10s  kubelet  Failed to pull image "ghcr.io/...": unauthorized
```

> **Tip**: In OpenShift, you can also link secrets to the `default` service account to apply them project-wide: `oc secrets link default helpdesk-pro-ghcr-pull-secret --for=pull`. This is useful if many Deployments need the same registry credentials.

---

## Part 5 — OpenShift Console Walkthrough

The OpenShift web console has two **perspectives** and many **menu sections**. Here's a systematic guide to where you'll find every resource from this project.

### 5.1 Two Perspectives: Administrator vs Developer

Switch perspectives using the dropdown at the top-left of the console.

| Perspective | Best For | Key Difference |
|---|---|---|
| **Administrator** | Viewing all resource types, managing cluster settings, RBAC | Shows every Kubernetes resource kind in separate menu items |
| **Developer** | Application-centric view, Topology, quick access to Pods/Logs | Shows resources grouped by application, with a visual Topology map |

**For this guide, we use Administrator view** because it maps more directly to Kubernetes concepts. The Developer view is better for day-to-day work once you're comfortable with the concepts.

### 5.2 Console Navigation Map

Here's every relevant console menu item and what you'll find from this project:

#### Workloads

| Menu Path | Resource Kind | Our Resources |
|---|---|---|
| **Workloads → Deployments** | Deployment | `helpdesk-pro-frontend`, `helpdesk-pro-backend`, `helpdesk-pro-keycloak`, `helpdesk-pro-jenkins` |
| **Workloads → StatefulSets** | StatefulSet | `helpdesk-pro-postgresql` |
| **Workloads → Pods** | Pod | One pod per component (named with random suffix, e.g., `helpdesk-pro-backend-7d8f4c6b9-x2k4m`) |
| **Workloads → ReplicaSets** | ReplicaSet | Auto-created by each Deployment (you rarely interact with these directly) |
| **Workloads → ConfigMaps** | ConfigMap | `helpdesk-pro-frontend-config`, `helpdesk-pro-frontend-nginx`, `keycloak-realm`, `helpdesk-pro-jenkins-casc` |
| **Workloads → Secrets** | Secret | `helpdesk-pro-db-credentials`, `helpdesk-pro-ghcr-pull-secret`, `helpdesk-pro-jenkins-secret` |

#### Networking

| Menu Path | Resource Kind | Our Resources |
|---|---|---|
| **Networking → Services** | Service | `helpdesk-pro-frontend`, `helpdesk-pro-backend`, `helpdesk-pro-keycloak`, `helpdesk-pro-postgresql`, `helpdesk-pro-jenkins` |
| **Networking → Routes** | Route | `helpdesk-pro-frontend`, `helpdesk-pro-backend`, `helpdesk-pro-keycloak`, `helpdesk-pro-jenkins` |

#### Storage

| Menu Path | Resource Kind | Our Resources |
|---|---|---|
| **Storage → PersistentVolumeClaims** | PVC | `data-helpdesk-pro-postgresql-0` (auto-created by StatefulSet), `helpdesk-pro-jenkins-pvc` |

#### Observe (Monitoring)

| Menu Path | What You'll See |
|---|---|
| **Observe → Metrics** | CPU, memory, and network usage per Pod (if cluster monitoring is enabled) |
| **Observe → Alerts** | Alerts triggered by resource exhaustion, Pod failures, etc. |

#### Helm (if available in your cluster)

| Menu Path | What You'll See |
|---|---|
| **Helm → Helm Releases** (Developer view) | The `helpdesk-pro` release, its revision history, and deployed resources |

### 5.3 Topology View (Developer Perspective)

Switch to the **Developer** perspective and click **Topology**. You'll see a visual map of all Deployments and StatefulSets:

```
    ┌──────────────┐     ┌──────────────┐
    │   frontend   │     │   backend    │
    │    (D) 1     ├────►│    (D) 1     │
    │              │     │              │
    └──────┬───────┘     └──────┬───────┘
           │                     │
           │                     ▼
           │              ┌──────────────┐
           │              │  postgresql  │
           │              │   (SS) 1     │
           │              │              │
           │              └──────────────┘
           │
           ▼
    ┌──────────────┐     ┌──────────────┐
    │   keycloak   │     │   jenkins    │
    │    (D) 1     │     │    (D) 1     │
    │              │     │              │
    └──────────────┘     └──────────────┘

  (D) = Deployment    (SS) = StatefulSet    Number = replica count
```

Each node in the Topology view shows:
- A colored ring (green = all Pods healthy, yellow = some not ready, red = errors)
- An icon indicating the resource type (Deployment or StatefulSet)
- Small badges for Route (url icon), build status, etc.

**Click a node** to:
- See Pod count and status
- Access Logs, Terminal, and Events without navigating away
- See associated Routes, Services, ConfigMaps, and Secrets in the side panel

**Right-click a node** to:
- Scale up/down
- Edit resource limits
- Delete

> **Tip**: The Topology view groups resources by label. If you don't see grouping, click the **"Group by"** dropdown and select **"Application"** or **"Label"**.

### 5.4 Inspecting a Pod

When you click on a Pod (from any view), you get a detailed page with several tabs:

| Tab | What It Shows |
|---|---|
| **Details** | Status, IP, node, labels, annotations, owner (which Deployment/StatefulSet manages it) |
| **Metrics** | CPU, memory, and filesystem usage graphs (real-time) |
| **YAML** | The full Pod YAML spec — exactly what Kubernetes sees after Helm rendered the template |
| **Environment** | All environment variables. Secret values show as "from Secret: helpdesk-pro-db-credentials" |
| **Logs** | Container stdout/stderr output. Select container if the Pod has multiple. Stream in real-time |
| **Terminal** | Open a shell inside the running container — useful for debugging (`pg_isready`, `curl`, etc.) |
| **Events** | Scheduling decisions, image pulls, probe results, restarts. **This is the first place to check when something is wrong.** |

### 5.5 Viewing Logs and Events

**Logs** (**Workloads → Pods → {pod-name} → Logs** tab):
- Shows `stdout` and `stderr` from the container
- Click **"Stream logs"** for real-time output
- Use the dropdown to switch containers (if a Pod has multiple — not the case here)
- Download logs with the download button

**Events** (**Workloads → Pods → {pod-name} → Events** tab, or **Home → Events** for all events):
- Shows scheduled, pulled, created, started, probe failures, OOM kills, etc.
- Events are ordered by time — most recent at the top
- Events expire after about 1 hour — if you need longer history, use `oc get events --sort-by=.metadata.creationTimestamp`

**Common event patterns**:

| Event Pattern | What It Means |
|---|---|
| `Scheduled` → `Pulling` → `Pulled` → `Created` → `Started` | Healthy startup sequence |
| `FailedScheduling: insufficient cpu` | Cluster doesn't have enough resources — check requests/limits |
| `Failed: ImagePullBackOff` | Can't download the image — check image URL and pull secret |
| `Unhealthy: Readiness probe failed` | Container started but isn't ready — check app logs |
| `Unhealthy: Liveness probe failed` → `Killing` → `Started` | Container is stuck and being restarted |
| `OOMKilled` | Container exceeded its memory limit — increase the limit |

### 5.6 Quick Tips

1. **Switch namespaces/projects** using the **Project** dropdown at the top. Make sure you're in the right namespace or you won't see your resources.

2. **Filter by label** in any list view: click the filter icon and enter `app.kubernetes.io/name=backend` to see only backend resources.

3. **Search across all resources**: use the search bar (magnifying glass) at the top of the Administrator view. You can search by resource name across all types.

4. **View the rendered YAML**: on any resource page, click the **YAML** tab to see the full Kubernetes manifest *after* Helm templates have been rendered. This is what Kubernetes actually stored.

5. **Terminal access**: on any Pod page, the **Terminal** tab opens a shell inside the container. Useful for:
   - `curl http://helpdesk-pro-backend:8080/healthz` (test internal connectivity)
   - `pg_isready -U helpdesk` (test database connectivity from any Pod)
   - `cat /usr/share/nginx/html/assets/config.json` (verify mounted config)

6. **Scale on the fly**: in **Workloads → Deployments → {name}**, click the up/down arrows next to the Pod count to scale without editing YAML.

---

## Part 6 — Helm Values Quick Reference

### 6.1 values.yaml Key Table

Every configurable value in `values.yaml`, what it does, and which template consumes it:

#### Global

| Key | Default | Template(s) | Purpose |
|---|---|---|---|
| `global.imagePullSecrets[0]` | `helpdesk-pro-ghcr-pull-secret` | (Referenced indirectly) | Default pull secret name |

#### Frontend

| Key | Default | Template(s) | Purpose |
|---|---|---|---|
| `frontend.image.registry` | `ghcr.io` | `frontend-deployment.yaml` | Container registry |
| `frontend.image.repository` | `your-github-username/helpdesk-frontend` | `frontend-deployment.yaml` | Image name |
| `frontend.image.tag` | `latest` | `frontend-deployment.yaml` | Image version |
| `frontend.image.pullPolicy` | `IfNotPresent` | `frontend-deployment.yaml` | When to pull image |
| `frontend.replicas` | `1` | `frontend-deployment.yaml` | Number of Pod replicas |
| `frontend.resources.limits.cpu` | `200m` | `frontend-deployment.yaml` | Max CPU |
| `frontend.resources.limits.memory` | `128Mi` | `frontend-deployment.yaml` | Max memory |
| `frontend.resources.requests.cpu` | `100m` | `frontend-deployment.yaml` | Guaranteed CPU |
| `frontend.resources.requests.memory` | `64Mi` | `frontend-deployment.yaml` | Guaranteed memory |
| `frontend.keycloakRealm` | `helpdesk` | `frontend-configmap.yaml` | Keycloak realm name in config.json |
| `frontend.keycloakClientId` | `helpdesk-frontend` | `frontend-configmap.yaml` | OIDC client ID in config.json |
| `frontend.route.host` | `""` (auto-generated) | `frontend-route.yaml` | Custom hostname for the Route |

#### Backend

| Key | Default | Template(s) | Purpose |
|---|---|---|---|
| `backend.image.registry` | `ghcr.io` | `backend-deployment.yaml` | Container registry |
| `backend.image.repository` | `your-github-username/helpdesk-backend` | `backend-deployment.yaml` | Image name |
| `backend.image.tag` | `latest` | `backend-deployment.yaml` | Image version |
| `backend.image.pullPolicy` | `IfNotPresent` | `backend-deployment.yaml` | When to pull image |
| `backend.replicas` | `1` | `backend-deployment.yaml` | Number of Pod replicas |
| `backend.resources.*` | (see table in 4.7) | `backend-deployment.yaml` | CPU and memory |
| `backend.route.host` | `""` | `backend-route.yaml` | Custom hostname |
| `backend.keycloak.authority` | `""` | `backend-deployment.yaml` | Keycloak public URL (for token validation) |
| `backend.keycloak.clientId` | `helpdesk-backend` | `backend-deployment.yaml` | OIDC client ID |
| `backend.keycloak.clientSecret` | `backend-secret` | `backend-deployment.yaml` | Confidential client secret |

#### Keycloak

| Key | Default | Template(s) | Purpose |
|---|---|---|---|
| `keycloak.image.registry` | `quay.io` | `keycloak-deployment.yaml` | Container registry |
| `keycloak.image.repository` | `keycloak/keycloak` | `keycloak-deployment.yaml` | Image name |
| `keycloak.image.tag` | `25.0` | `keycloak-deployment.yaml` | Image version |
| `keycloak.auth.adminUser` | `admin` | `keycloak-deployment.yaml` | Keycloak admin username |
| `keycloak.auth.adminPassword` | `admin` | `keycloak-deployment.yaml` | Keycloak admin password |
| `keycloak.resources.*` | (see table in 4.7) | `keycloak-deployment.yaml` | CPU and memory |
| `keycloak.externalDatabase.host` | `helpdesk-pro-postgresql` | `keycloak-deployment.yaml` | PostgreSQL Service name |
| `keycloak.externalDatabase.port` | `5432` | `keycloak-deployment.yaml` | PostgreSQL port |
| `keycloak.externalDatabase.user` | `helpdesk` | `keycloak-deployment.yaml` | DB username |
| `keycloak.externalDatabase.password` | `helpdesk123` | `keycloak-deployment.yaml` | DB password |
| `keycloak.externalDatabase.database` | `helpdesk` | `keycloak-deployment.yaml` | DB name |
| `keycloakRoute.host` | `""` | `keycloak-route.yaml`, `keycloak-deployment.yaml`, `frontend-configmap.yaml` | Keycloak public hostname — used in Route, `--hostname` arg, and frontend config.json |

#### PostgreSQL

| Key | Default | Template(s) | Purpose |
|---|---|---|---|
| `postgresql.image.registry` | `docker.io` | `postgresql-statefulset.yaml` | Container registry |
| `postgresql.image.repository` | `postgres` | `postgresql-statefulset.yaml` | Image name |
| `postgresql.image.tag` | `16-alpine` | `postgresql-statefulset.yaml` | Image version |
| `postgresql.auth.username` | `helpdesk` | `postgresql-statefulset.yaml`, `db-credentials-secret.yaml` | DB username |
| `postgresql.auth.password` | `helpdesk123` | `postgresql-statefulset.yaml`, `db-credentials-secret.yaml` | DB password |
| `postgresql.auth.database` | `helpdesk` | `postgresql-statefulset.yaml`, `db-credentials-secret.yaml` | DB name |
| `postgresql.primary.resources.*` | (see table in 4.7) | `postgresql-statefulset.yaml` | CPU and memory |
| `postgresql.primary.persistence.size` | `1Gi` | `postgresql-statefulset.yaml` | PVC storage size |

#### Jenkins

| Key | Default | Template(s) | Purpose |
|---|---|---|---|
| `jenkins.enabled` | `true` | All `jenkins-*.yaml` templates | Whether to create Jenkins resources |
| `jenkins.image.registry` | `ghcr.io` | `jenkins-deployment.yaml` | Container registry |
| `jenkins.image.repository` | `maguiarr/helpdesk-jenkins` | `jenkins-deployment.yaml` | Image name |
| `jenkins.image.tag` | `latest` | `jenkins-deployment.yaml` | Image version |
| `jenkins.replicas` | `1` | `jenkins-deployment.yaml` | Number of Pod replicas |
| `jenkins.resources.*` | (see table in 4.7) | `jenkins-deployment.yaml` | CPU and memory |
| `jenkins.persistence.size` | `5Gi` | `jenkins-pvc.yaml` | PVC storage size |
| `jenkins.route.host` | `""` | `jenkins-route.yaml` | Custom hostname for the Route |
| `jenkins.adminPassword` | `""` (defaults to `admin`) | `jenkins-secret.yaml` | Fallback admin password |
| `jenkins.keycloak.clientId` | `helpdesk-jenkins` | `jenkins-casc-configmap.yaml` | Keycloak OIDC client ID |
| `jenkins.keycloak.clientSecret` | `jenkins-secret` | `jenkins-secret.yaml` | Keycloak OIDC client secret |

#### GHCR Pull Secret

| Key | Default | Template(s) | Purpose |
|---|---|---|---|
| `ghcrSecret.enabled` | `true` | `ghcr-pull-secret.yaml`, `backend-deployment.yaml`, `frontend-deployment.yaml`, `jenkins-deployment.yaml` | Whether to create the pull secret |
| `ghcrSecret.dockerconfigjson` | `""` | `ghcr-pull-secret.yaml` | Base64-encoded Docker config JSON |

### 6.2 How values.openshift.yaml Works

Helm supports **value file layering**. When you pass multiple `-f` flags, later files override earlier ones:

```bash
helm install helpdesk-pro ./helm \
  -f helm/values.yaml \              # Base values (loaded automatically)
  -f helm/values.openshift.yaml      # OpenShift overrides (must be explicit)
```

In this project, `values.openshift.yaml` is currently a comment-only file — it documents that the security contexts in the templates are already OpenShift-compatible. In other projects, you might use it to override:

```yaml
# Example overrides (not in our file, but common patterns):
frontend:
  resources:
    limits:
      memory: 256Mi    # Override base value of 128Mi for OpenShift
backend:
  replicas: 3          # More replicas for production
```

The merge is **deep** — it only overrides the specific keys you set, leaving everything else from `values.yaml` intact.

### 6.3 Common Helm Commands

```bash
# Preview what Helm would generate (dry-run, doesn't deploy)
helm template helpdesk-pro ./helm -f helm/values.openshift.yaml

# Install the chart (first time)
helm install helpdesk-pro ./helm \
  -f helm/values.openshift.yaml \
  -n my-namespace

# Upgrade an existing release (apply changes)
helm upgrade helpdesk-pro ./helm \
  -f helm/values.openshift.yaml \
  -n my-namespace

# Override a single value at deploy time
helm upgrade helpdesk-pro ./helm \
  --set backend.replicas=3 \
  -n my-namespace

# See what's currently deployed
helm list -n my-namespace

# See the rendered YAML for a deployed release
helm get manifest helpdesk-pro -n my-namespace

# Check release history and revision changes
helm history helpdesk-pro -n my-namespace

# Roll back to a previous revision
helm rollback helpdesk-pro 1 -n my-namespace

# Uninstall (delete all resources EXCEPT PVCs)
helm uninstall helpdesk-pro -n my-namespace
```

---

## Appendix A — Glossary

Quick reference for terms used throughout this guide:

| Term | Definition |
|---|---|
| **Pod** | The smallest deployable unit in Kubernetes — one or more containers that share network and storage. |
| **Deployment** | Manages a set of identical Pods, handling scaling and rolling updates. For stateless apps. |
| **StatefulSet** | Like a Deployment, but for stateful apps. Gives Pods stable names, stable storage, and ordered startup. |
| **Service** | A stable network endpoint (DNS name + ClusterIP) that load-balances traffic to a set of Pods. |
| **Route** | OpenShift-specific resource that exposes a Service to external traffic with a public URL and TLS. |
| **ConfigMap** | Stores non-sensitive configuration data as key/value pairs. Can be mounted as files or env vars. |
| **Secret** | Stores sensitive data (passwords, tokens). Base64-encoded, access-controlled. |
| **PersistentVolumeClaim (PVC)** | A request for storage. OpenShift provisions the actual storage automatically. |
| **Namespace / Project** | A virtual cluster within the physical cluster. Isolates resources between teams/apps. OpenShift calls them Projects. |
| **Helm Chart** | A package of Kubernetes template files plus a values file. The unit of deployment. |
| **Helm Release** | A deployed instance of a chart. Named (e.g., `helpdesk-pro`), versioned, and trackable. |
| **SCC (Security Context Constraints)** | OpenShift policy that controls what a Pod can do at the OS level (run as root, use capabilities, etc.). |
| **ClusterIP** | The default Service type. Accessible only from within the cluster — no external access. |
| **Edge Termination** | TLS mode where encryption ends at the router. Traffic inside the cluster is unencrypted HTTP. |
| **`oc`** | OpenShift CLI. Drop-in replacement for `kubectl` with extra features. |
| **OIDC/PKCE** | OpenID Connect with Proof Key for Code Exchange — the authentication protocol used by Keycloak. |
| **JWT** | JSON Web Token — the token format returned by Keycloak and validated by the backend. |
| **JCasC** | Jenkins Configuration as Code — a plugin that configures Jenkins declaratively from a YAML file, eliminating manual UI setup. |
| **CrashLoopBackOff** | A Pod status indicating the container keeps crashing and Kubernetes keeps restarting it. |
| **ImagePullBackOff** | A Pod status indicating Kubernetes can't download the container image. |
| **OOMKilled** | Container was killed because it exceeded its memory limit. |
