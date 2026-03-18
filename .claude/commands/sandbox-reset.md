---
description: Automates the post-sandbox-reset redeployment procedure — updates GitHub secrets, runs a double-deploy cycle, and verifies pod health.
allowed-tools: Bash, AskUserQuestion
---

## Sandbox Reset Recovery

You are helping the user recover from a Red Hat Developer Sandbox reset. Walk through each step in order, executing the bash commands and pausing where indicated.

### Step 1 — Print checklist

Tell the user what is about to happen:

```
Sandbox Reset Recovery — steps:
  1. You log in to OpenShift (manual — requires browser)
  2. Capture new token + server from live oc session
  3. Update OPENSHIFT_TOKEN and OPENSHIFT_SERVER GitHub secrets
  4. Trigger first deploy (creates routes)
  5. Wait for first workflow to finish
  6. Discover Keycloak route hostname
  7. Update KEYCLOAK_HOST GitHub secret
  8. Trigger second deploy (wires Keycloak URL)
  9. Wait for second workflow to finish
 10. Verify pod health and print app URL
```

### Step 2 — Pause for manual login

Use AskUserQuestion to ask:

> Please log in to OpenShift:
> 1. Go to https://developers.redhat.com/developer-sandbox and start your sandbox
> 2. Open the web console → click your username (top-right) → "Copy login command" → "Display Token"
> 3. Run the `oc login --token=<token> --server=<server>` command in your terminal
>
> Reply "done" when you are logged in.

### Step 3 — Capture credentials

```bash
TOKEN=$(oc whoami -t)
SERVER=$(oc whoami --show-server)
NAMESPACE=$(oc project -q)
echo "Token: ${TOKEN:0:20}... (truncated)"
echo "Server: $SERVER"
echo "Namespace: $NAMESPACE"
```

Confirm the values look correct before proceeding.

### Step 4 — Update GitHub secrets

```bash
gh secret set OPENSHIFT_TOKEN --body "$TOKEN"
gh secret set OPENSHIFT_SERVER --body "$SERVER"
```

### Step 5 — Trigger first deploy

```bash
git commit --allow-empty -m "chore: trigger redeploy after sandbox reset"
git push origin main
```

### Step 6 — Wait for first workflow

```bash
sleep 5
RUN_ID=$(gh run list --workflow=deploy.yml --limit=1 --json databaseId --jq '.[0].databaseId')
echo "Watching run $RUN_ID..."
gh run watch "$RUN_ID" --exit-status
```

### Step 7 — Discover Keycloak route hostname

```bash
KEYCLOAK_HOST=$(oc get route -n "$NAMESPACE" --no-headers | grep keycloak | awk '{print $2}')
echo "Keycloak host: $KEYCLOAK_HOST"
```

### Step 8 — Update KEYCLOAK_HOST secret

```bash
gh secret set KEYCLOAK_HOST --body "$KEYCLOAK_HOST"
```

### Step 9 — Trigger second deploy

```bash
gh workflow run deploy.yml --ref main
```

### Step 10 — Wait for second workflow

```bash
sleep 5
RUN_ID=$(gh run list --workflow=deploy.yml --limit=1 --json databaseId --jq '.[0].databaseId')
echo "Watching run $RUN_ID..."
gh run watch "$RUN_ID" --exit-status
```

### Step 11 — Verify pod health

```bash
oc get pods -n "$NAMESPACE"
oc get routes -n "$NAMESPACE" -o custom-columns=NAME:.metadata.name,HOST:.spec.host
```

### Step 12 — Print summary

Print a summary like:

```
Sandbox reset complete!

App URL:    https://<frontend-route-host>
Admin:      admin1 / password123
Employee:   employee1 / password123
```

Extract the frontend route host from the `oc get routes` output (the route named `helpdesk-frontend` or similar).
