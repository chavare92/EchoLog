# EchoLog — Migration & Deployment Guide

This guide covers **promoting EchoLog across environments** (DEV → UAT → PROD) and deploying to a brand-new Power Apps / Dataverse environment.

---

## Environment Pipeline Overview

```
┌─────────────────────┐     Solution export     ┌─────────────────────┐     Solution export     ┌─────────────────────┐
│   DEV environment   │ ──────────────────────► │   UAT environment   │ ──────────────────────► │  PROD environment   │
│  (unmanaged soln)   │       pac code push      │  (unmanaged soln)   │       pac code push      │  (managed soln)     │
│                     │                          │  smoke test here    │                          │  change-managed     │
└─────────────────────┘                          └─────────────────────┘                          └─────────────────────┘
```

| Environment | Solution type | Who deploys | Approval gate |
|---|---|---|---|
| DEV | Unmanaged | Developer | None |
| UAT | Unmanaged | Developer / Release manager | UAT sign-off required |
| PROD | Managed | Release manager only | Change-management ticket |

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS+ | `node --version` |
| npm | 9+ | bundled with Node |
| Power Platform CLI | latest | `pac install latest` |
| Power Apps environment | — | Must be Dataverse-enabled (not Teams-only) |
| Publisher prefix | `cr4c3` | Must match everywhere — changing it requires regenerating all tables and code |
| Git | any | To check out the correct release tag/commit |

---

## Pre-Deployment Checklist

Complete before every promotion:

- [ ] `npm run build` passes with zero errors
- [ ] `git status` is clean — no uncommitted changes
- [ ] Source environment solution export is current
- [ ] Target environment is Dataverse-enabled
- [ ] All 14 Dataverse tables exist in target (see Step 1)
- [ ] Connection reference is authorised in target (see Step 7)
- [ ] At least one Admin user exists in `cr4c3_userprofiles` in target
- [ ] SLA rules seeded in target (see Step 2)
- [ ] UAT smoke test passed (for PROD promotions)

---

## Step 1 — Provision Dataverse Tables in the Target Environment

All **14 custom tables** must exist in the target environment. Use Option A (recommended).

### Option A — Export / Import a Dataverse Solution (recommended)

1. In the **source** environment, open [make.powerapps.com](https://make.powerapps.com).
2. Go to **Solutions** → create a solution (or open the existing one) containing all `cr4c3_*` tables.
3. Ensure all 14 tables, their columns, relationships, and choice columns are added.
4. **Export** the solution:
   - **Unmanaged** for DEV/UAT (allows further editing in target)
   - **Managed** for PROD (prevents accidental edits; must uninstall to change)
5. In the **target** environment, go to **Solutions → Import** and upload the `.zip` file.
6. Verify all 14 tables appear under **Dataverse → Tables**.

### Option B — Manual recreation

Recreate each table with the same columns and publisher prefix `cr4c3`. Error-prone; not recommended for production.

**14 tables required:**

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
cr4c3_delegations          ← NEW — added in v2.1 for role delegation
```

#### `cr4c3_delegations` columns (if creating manually)

| Column logical name | Type | Notes |
|---|---|---|
| `cr4c3_delegationid` | Unique Identifier (PK) | Auto-created |
| `cr4c3_name` | Single line of text | Display name |
| `_cr4c3_delegator_value` | Lookup → `cr4c3_userprofiles` | The user delegating their role |
| `_cr4c3_delegate_value` | Lookup → `cr4c3_userprofiles` | The user receiving the delegation |
| `cr4c3_startdate` | Date Only | Delegation start (inclusive) |
| `cr4c3_enddate` | Date Only | Delegation end (inclusive) |
| `cr4c3_isactive` | Yes/No | `true` while delegation is in effect |
| `cr4c3_note` | Multiline text | Optional admin note |

---

## Step 2 — Seed Reference Data

Once tables exist, seed the minimum required data in the target environment:

1. **Departments / Sub-departments / Processes / Teams** — use **Admin → Hierarchy** after deployment, or import via Excel (Data → Import data in make.powerapps.com).
2. **SLA Rules** — use **Admin → SLA Rules**, or configure defaults:
   - Critical: **4 hours**
   - High: **24 hours**
   - Medium: **72 hours**
3. **User Profiles** — create at least one Admin user in `cr4c3_userprofiles`:
   - Set `cr4c3_role` = `564060005` (Admin)
   - Set `cr4c3_password` = SHA-256 hash of the initial password
   - Set `cr4c3_email`, `cr4c3_fullname`, `cr4c3_isactive` = `true`
4. **Delegations** — no seed data required. Delegations are created by Admins via **Admin → Users → Delegations** tab after deployment.

---

## Step 3 — Authenticate the CLI to the Target Environment

```bash
# List all available environments
pac env list

# Create an auth profile for the target environment
pac auth create --environment <target-environmentId>

# Set it as active (if you have multiple profiles)
pac auth select --index <N>

# Verify active profile
pac auth list
```

> Tip: use `pac env who` to confirm which environment the CLI is currently targeting before every push.

---

## Step 4 — Update `power.config.json`

Update the following fields to point at the **target** environment:

```json
{
  "appId": "<target-app-id-or-remove-to-create-new>",
  "environmentId": "<target-environmentId>",
  "region": "prod"
}
```

| Field | Rule |
|---|---|
| `environmentId` | **Always** replace with the target environment's ID |
| `appId` | **Remove** entirely for a first push to a new environment (`pac code push` writes the new ID back). **Set** to the existing app ID if updating an already-deployed app. |
| `region` | `"prod"` for commercial M365 tenants. `"usgov"` / `"usgovhigh"` / `"dod"` for government tenants. |
| `localAppUrl` | Leave as `http://localhost:5173` — used only during local dev, not deployed. |

> **Never commit `power.config.json` with a PROD `appId` / `environmentId` on a shared branch.** Use a `.env`-style override or a separate `power.config.prod.json` kept out of source control.

---

## Step 5 — Regenerate Generated Files (if schema changed)

If the Dataverse schema in the target environment differs from the source (e.g. new columns, new tables):

```bash
pac code sync
```

This rewrites files under `src/generated/` and `.power/`. **Do not edit these files manually.** Commit the regenerated files before building.

If `cr4c3_delegations` was added to the solution after the last sync, `pac code sync` will add:
- `src/generated/models/Cr4c3_delegationsModel.ts`
- `src/generated/services/Cr4c3_delegationsService.ts`
- An export in `src/generated/index.ts`

---

## Step 6 — Build and Push

```bash
# Ensure you are on the correct release commit / tag
git log --oneline -5

# Install dependencies (first time or after package changes)
npm ci

# Build the production bundle
npm run build

# Push to the target environment
pac code push
```

`pac code push` outputs a play URL on success:

```
https://apps.powerapps.com/play/e/<envId>/app/<appId>?...
```

Share this URL with testers / end-users. The app is available immediately after push — no additional publish step is required.

---

## Step 7 — Authorise the Connection Reference

After the first push to a new environment, Power Apps creates a Dataverse connection reference that must be authorised before the app can read or write data:

1. Open [make.powerapps.com](https://make.powerapps.com) in the **target** environment.
2. Go to **Solutions** → open the solution containing the app (or **Default solution**).
3. Navigate to **Connection References** → find `Microsoft Dataverse`.
4. Click the connection reference → **Select a connection** (or **New connection**) using credentials that have access to all 14 `cr4c3_*` tables.
5. **Save**. The connection reference ID (in `power.config.json` → `connectionReferences`) is updated automatically.

> Each environment has its own connection reference ID. Do not copy connection reference IDs between environments.

---

## Step 8 — Post-Deployment Smoke Test

| # | Check | Expected result |
|---|---|---|
| 1 | Login with an Admin `cr4c3_userprofiles` account | Redirect to Dashboard; no error toasts |
| 2 | Dashboard loads | Incident counts and stats visible |
| 3 | Create an Incident | Appears in Incidents list with `Open` status |
| 4 | Assign an Incident | Status changes to `InvestigationPending` |
| 5 | Submit an RCA | Status changes to `Submitted`; appears in Review Queue |
| 6 | Review Queue — approve an RCA | Status advances to `Approved` |
| 7 | Create a Preventive Action | Appears in PA list |
| 8 | Bulk-mark PAs In Progress | Status updates reflected immediately |
| 9 | Admin → Hierarchy | Departments list, drag reorder works, add/edit/delete work |
| 10 | Admin → Users → Delegations tab | Can add and revoke delegations |
| 11 | Admin → SLA Rules | Rules editable |
| 12 | Audit Trail | Log entries visible; no integrity warnings on fresh records |
| 13 | Notifications | Items filtered to last 30 days |
| 14 | Print / export RCA | `@media print` layout renders correctly |
| 15 | Go offline (disable network) | Amber "You are offline" banner appears |

---

## Environment-Specific Configuration Reference

| Setting | Current DEV value (`power.config.json`) | Action for target |
|---|---|---|
| `environmentId` | `87ff51b0-ae51-e1b3-9c45-e3178a566b10` | **Replace** with target env ID |
| `appId` | `9d9d524c-1f53-4ca1-bc9c-831911c38b4e` | **Remove** (first push) or set target app ID |
| `region` | `prod` | Update if tenant type differs |
| `localAppUrl` | `http://localhost:5173` | Leave unchanged |
| Connection reference ID | `1a411424-f68a-42f2-84d3-4e8b484ef5ca` | Auto-generated by Power Apps on first push |

---

## Rollback

To revert to the previous deployed version:

```bash
# Identify the previous good commit
git log --oneline -10

# Check out that commit
git checkout <previous-commit>

# Rebuild and re-push
npm ci && npm run build && pac code push
```

Power Apps also retains app version history — accessible via **Solutions → Apps → [EchoLog] → ... → See all versions** if version tracking is enabled on the solution.

---

## UAT → PROD Promotion Checklist

- [ ] UAT smoke test (all 15 checks above) signed off by QA
- [ ] Change-management ticket raised and approved
- [ ] PROD `power.config.json` prepared (separate file, not committed)
- [ ] PROD environment Dataverse solution imported (managed)
- [ ] PROD connection reference authorised
- [ ] PROD release tagged in Git: `git tag v<x.y.z> && git push origin v<x.y.z>`
- [ ] PROD push executed from release tag, not from a feature branch
- [ ] Post-deploy smoke test on PROD completed
- [ ] Stakeholders notified of go-live

---

## Troubleshooting

| Error | Likely cause | Fix |
|---|---|---|
| `Connection reference not found: cr4c3_*` | `dataSources` keys in `power.config.json` don't match `dataSourcesInfo.ts` | Ensure keys use the full table name (`cr4c3_departments`, not `departments`) |
| `Operation failed` toast on every query | Connection reference not authorised in target | Complete Step 7 |
| `pac code push` fails with auth error | CLI not authenticated to target environment | Run `pac auth create --environment <envId>` |
| Tables missing in target | Solution not imported | Complete Step 1 |
| `cr4c3_delegations` table not found | Table missing from solution export | Add `cr4c3_delegations` to the solution and re-export/import |
| `')' or ',' expected at position 4` | Invalid GUID in OData filter (e.g. dev bypass GUID) | Use a real `cr4c3_userprofiles` account |
| `pac code sync` shows no `cr4c3_delegations` | Table not yet added to target | Add the table in Dataverse then re-run `pac code sync` |
| Login loop / redirect to login on every page | No `cr4c3_userprofiles` record with `cr4c3_isactive = true` | Seed at least one active Admin user (Step 2) |
| Audit integrity warnings on new records | `cr4c3_checksum` column missing from `cr4c3_auditlogs` | Add `cr4c3_checksum` (Single line of text, 64 chars) to the table |
