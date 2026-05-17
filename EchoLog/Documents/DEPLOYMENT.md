# EchoLog — Deployment Guide

This guide covers deploying EchoLog to a **new** Power Apps / Dataverse environment (e.g. moving from DEV → UAT or UAT → PROD).

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | |
| Power Platform CLI | latest | `pac install latest` |
| Power Apps environment | — | Must be Dataverse-enabled (not Teams-only) |
| Publisher prefix | `cr4c3` | Must match — re-generating with a different prefix requires regenerating all tables and code |

---

## Step 1 — Provision Dataverse Tables in the Target Environment

All 13 custom tables must exist in the target environment. There are two options:

### Option A — Export / Import a Dataverse Solution (recommended)

1. In the **source** environment, open [make.powerapps.com](https://make.powerapps.com).
2. Go to **Solutions** → create a new solution (or use an existing one that contains all `cr4c3_*` tables).
3. Add all 13 tables and their columns, relationships, and choice columns to the solution.
4. **Export** the solution as a **managed** solution for PROD, or **unmanaged** for UAT/DEV.
5. In the **target** environment, go to **Solutions → Import** and import the `.zip` file.
6. Verify all 13 tables appear under **Dataverse → Tables**.

### Option B — Manual recreation

Recreate each table listed below with the same columns and publisher prefix `cr4c3`. This is error-prone and not recommended for production.

**Tables required:**

```
cr4c3_userprofiles
cr4c3_departments
cr4c3_subdepartments
cr4c3_processes
cr4c3_teams
cr4c3_incidents
cr4c3_rcasubmissions
cr4c3_fishbonecauses
cr4c3_preventiveactions
cr4c3_paevidences
cr4c3_slarules
cr4c3_notifications
cr4c3_auditlogs
```

---

## Step 2 — Seed Reference Data

Once tables exist, seed the minimum required data in the target environment:

1. **Departments / Sub-departments / Processes / Teams** — use the Admin → Hierarchy page after deployment, or import via Excel.
2. **SLA Rules** — use Admin → SLA Rules page, or set defaults:
   - Critical: 4 hours
   - High: 24 hours
   - Medium: 72 hours
3. **User Profiles** — create at least one Admin user in `cr4c3_userprofiles` with a SHA-256 hashed password stored in `cr4c3_password`.

---

## Step 3 — Authenticate the CLI to the Target Environment

```bash
# List available environments
pac env list

# Create an auth profile for the target environment
pac auth create --environment <target-environmentId>

# Verify the active profile
pac auth list
```

---

## Step 4 — Update `power.config.json`

Update the following fields to point at the target environment:

```json
{
  "appId": "<new-app-id-or-remove-to-create-new>",
  "environmentId": "<target-environmentId>",
  "region": "prod"
}
```

> **`appId`**: If deploying to a brand-new environment (no existing app), **remove** the `appId` field entirely. `pac code push` will create a new app and write the new ID back into `power.config.json`. If pushing an update to an app that already exists in the target environment, set `appId` to that app's ID.

> **`region`**: Use `"prod"` for production / commercial tenants. For GCC, GCC-High, or DoD tenants use `"usgov"`, `"usgovhigh"`, or `"dod"` respectively.

---

## Step 5 — Regenerate `dataSourcesInfo.ts` (if schema changed)

If the Dataverse schema in the target environment differs (e.g. new columns were added), regenerate the auto-generated files:

```bash
pac code sync
```

This rewrites files under `src/generated/` and `.power/`. **Do not edit these files manually.**

---

## Step 6 — Build and Push

```bash
# Build the app
npm run build

# Push to the target environment
pac code push
```

`pac code push` will output a play URL:

```
https://apps.powerapps.com/play/e/<envId>/app/<appId>?...
```

Share this URL with testers / end users.

---

## Step 7 — Verify the Connection Reference

After the first push, Power Apps creates a connection reference for the Microsoft Dataverse connector. You must **authorise** it:

1. Open [make.powerapps.com](https://make.powerapps.com) in the target environment.
2. Go to **Solutions** → open the solution containing the app (or Default solution).
3. Find **Connection References** → `Microsoft Dataverse`.
4. Click the connection reference and select or create a Dataverse connection using the target environment credentials.
5. Save. The app will now be able to read/write data.

---

## Step 8 — Smoke Test

| Check | Expected |
|---|---|
| Login with a real `cr4c3_userprofiles` account | Redirect to Dashboard |
| Dashboard loads | No error toasts; incident counts visible |
| Create an incident | Appears in Incidents list |
| Assign an incident | Status changes to `InvestigationPending` |
| Submit an RCA | Status changes to `Submitted`; appears in Review Queue |
| Admin → Hierarchy | Departments, sub-departments, processes, teams list and create |
| Admin → SLA Rules | Rules list and can be edited |

---

## Environment-Specific Configuration Summary

| Setting | Source (`power.config.json`) | Action for new env |
|---|---|---|
| `environmentId` | `87ff51b0-ae51-e1b3-9c45-e3178a566b10` | Replace with target env ID |
| `appId` | `9d9d524c-1f53-4ca1-bc9c-831911c38b4e` | Remove (new app) or set target app ID |
| `region` | `prod` | Update if tenant type differs |
| `localAppUrl` | `http://localhost:5173` | Leave as-is (dev only, not deployed) |
| Connection reference ID | `1a411424-f68a-42f2-84d3-4e8b484ef5ca` | Auto-generated by Power Apps on first push |

---

## Rollback

To roll back to a previous version:

```bash
git checkout <previous-commit>
npm run build
pac code push
```

Power Apps keeps previous app versions accessible via **Solutions → Apps → See all versions** if version history is enabled.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Connection reference not found: cr4c3_*` | Data source names in `power.config.json` don't match `dataSourcesInfo.ts` keys | Ensure all `dataSources` keys use full table names (`cr4c3_departments`, not `departments`) |
| `')' or ',' expected at position 4` | An invalid GUID (e.g. `dev-` prefix) is used in an OData filter | Use a real user account; the dev bypass login uses a dummy GUID |
| `Operation failed` toast on every query | Connection reference not authorised in the target environment | Complete Step 7 (authorise the connection reference) |
| `pac code push` fails with auth error | CLI not authenticated to the target environment | Run `pac auth create --environment <envId>` |
| Tables missing in target environment | Solution not imported | Complete Step 1 |
