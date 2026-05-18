# EchoLog — Enterprise Escalation Workflow System

A **Power Apps Code App** built with React, TypeScript, and Vite, backed by Microsoft Dataverse. EchoLog manages the full lifecycle of operational incidents: logging, investigation, root-cause analysis (RCA), fishbone diagramming, preventive actions, SLA tracking, and audit trails.

---

## Features

| Module | Description |
|---|---|
| **Dashboard** | Live incident counts, SLA status, and team metrics |
| **Incidents** | Log, triage, assign, and track incidents through their full lifecycle |
| **RCA Builder** | Structured root-cause analysis form with fishbone (Ishikawa) cause management (add/delete by category), preview mode, and submit/update flow |
| **Preventive Actions** | Create, assign, and track corrective actions linked to incidents; list and board (Kanban) views; inline file evidence attachment |
| **Review Queue** | L1 / L2 manager review and approval workflow for RCA submissions, with escalation and critical tabs |
| **Notifications** | Real-time in-app notifications with mark-read / mark-all-read and type labels |
| **Audit Log** | Immutable audit trail for all record changes, grouped by date with field-diff pills |
| **Admin — Hierarchy** | Full CRUD for Department → Sub-department → Process → Team hierarchy with accordion drill-down |
| **Admin — SLA Rules** | Inline configure SLA TAT hours per severity level |
| **Admin — Users** | Manage user profiles and role assignments |

### User Roles

| Role | Permissions |
|---|---|
| `Logger` | Log and view incidents |
| `Assignee` | Update assigned incidents, submit RCA |
| `L1Manager` | Review and approve/reject RCA (L1) |
| `L2Manager` | Final RCA approval (L2) |
| `PAOwner` | Manage preventive actions |
| `Admin` | Full access including hierarchy and SLA configuration |
| `Member` | Read-only access |

### Severity SLAs

| Severity | TAT |
|---|---|
| Critical | 4 hours |
| High | 24 hours |
| Medium | 72 hours |

---

## Tech Stack

- **Runtime**: Power Apps Code App (hosted in Power Apps player)
- **Frontend**: React 19.2, TypeScript 5, Vite 6
- **State**: Jotai 2.20 (global) + TanStack Query v5 (server state)
- **UI**: Tailwind CSS 4.3 (`@import "tailwindcss"` — no config file), shadcn/ui, Lucide icons, Sonner 2.0.7 toasts, Framer Motion 12.38 animations
- **Router**: React Router v7 (lazy-loaded pages)
- **Data**: Microsoft Dataverse via `@microsoft/power-apps` SDK
- **Auth**: Custom email/password auth against `cr4c3_userprofiles` (SHA-256 hashed passwords)
- **Tooling**: Power Platform CLI (`pac`)

---

## Dataverse Tables

All tables use the `cr4c3_` publisher prefix:

| Table | Purpose |
|---|---|
| `cr4c3_userprofiles` | User accounts and roles |
| `cr4c3_departments` | Top-level org units |
| `cr4c3_subdepartments` | Sub-units within departments |
| `cr4c3_processes` | Processes within sub-departments |
| `cr4c3_teams` | Shift-based teams within processes |
| `cr4c3_incidents` | Incident records |
| `cr4c3_rcasubmissions` | RCA documents linked to incidents |
| `cr4c3_fishbonecauses` | Fishbone cause items on an RCA |
| `cr4c3_preventiveactions` | Corrective / preventive actions |
| `cr4c3_paevidences` | Evidence files attached to PAs |
| `cr4c3_slarules` | SLA TAT configuration per severity |
| `cr4c3_notifications` | In-app notifications per user |
| `cr4c3_auditlogs` | Audit trail entries |
| `cr4c3_delegations` | Bounded role delegations (acting roles) |

---

## Local Development

### Prerequisites

- Node.js 20+
- [Power Platform CLI](https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction) (`pac`)
- Access to the target Power Apps environment

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Authenticate with Power Platform
pac auth create --environment <environmentId>

# 3. Start dev server
npm run dev
```

> **Important**: Do **not** open `http://localhost:5173` directly. The app uses `window.parent.postMessage` to communicate with the Power Apps bridge. You must open it via the Power Apps play URL printed by the CLI:
>
> ```
> https://apps.powerapps.com/play/e/<envId>/a/local?_localAppUrl=http://localhost:5173/
> ```

### Dev Bypass Login

A quick-login shortcut is available on the login page (`test@echolog.dev` / `test`, or the **Quick Dev Login** button). This uses a dummy GUID and **will not match any Dataverse records** — use a real user account for end-to-end testing.

### Build

```bash
npm run build
```

### Push to Power Apps

```bash
pac code push
```

---

## Deployment to a New Environment

See [DEPLOYMENT.md](./Documents/DEPLOYMENT.md) for step-by-step instructions.

---

## Project Structure

```
src/
├── auth/               # AuthProvider, LoginPage, ProtectedRoute, role guard
├── components/
│   ├── layout/         # AppLayout, Sidebar, TopBar
│   ├── shared/         # ErrorBoundary, GlassCard, badges, skeletons,
│   │                   #   CircularProgress, StepIndicator, HorizontalBarList,
│   │                   #   StatsPills, TATCountdown, TicketRef, PulseIndicator
│   └── ui/             # shadcn/ui primitives
├── generated/          # Auto-generated — do not edit manually
│   ├── models/         # TypeScript interfaces per Dataverse table
│   └── services/       # CRUD service wrappers per table
├── hooks/              # TanStack Query hooks (one file per table)
│   │                   #   usePAEvidences, useIncidents, useRCASubmissions, …
├── lib/                # constants, queryClient, utils (incl. unwrapResult)
├── pages/
│   ├── admin/          # HierarchyPage, SLARulesPage, UsersPage
│   ├── audit/          # AuditTrailPage
│   ├── dashboard/      # DashboardPage
│   ├── incidents/      # IncidentsListPage, LogIncidentPage, IncidentDetailPage
│   ├── notifications/  # NotificationsPage
│   ├── preventive-actions/ # PreventiveActionsListPage, CreatePAPage, PADetailPage
│   ├── rca/            # RCABuilderPage
│   └── review/         # ReviewQueuePage
├── router/             # AppRouter with all routes
└── store/              # Jotai atoms (auth, UI, theme)
```

---

## Key Conventions

- **`unwrapResult(result)`** — all SDK calls go through this helper in `src/lib/utils.ts`. It throws if `result.success === false`, so React Query surfaces errors correctly.
- **Data source names** in `power.config.json` must match the keys in `.power/schemas/appschemas/dataSourcesInfo.ts` (full table names, e.g. `cr4c3_departments`).
- **Generated files** under `src/generated/` and `.power/` are managed by `pac code sync` — do not edit them manually.
- **Shared components** in `src/components/shared/` follow a consistent pattern: `PageWrapper` + `GlassCard` layout, Framer Motion stagger animations via `itemVariants`, and `usePageTitle()` for the browser tab title.
- **Hooks** in `src/hooks/` use TanStack Query v5; mutations call `useCreateAuditLog` after writes to maintain the audit trail.
- **Inline editing** (PA title, PA description, SLA rules) uses local `isEditing` state + React Hook Form; saves call the relevant `useUpdate*()` mutation directly.

---

## Implementation Status

All pages and components are fully implemented. The UX overhaul (Phases A–H) and additional Admin / RCA / Notifications pages are complete.

| Phase | Deliverable | Status |
|---|---|---|
| A | Shared components (CircularProgress, StepIndicator, HorizontalBarList) | ✅ Done |
| B | DashboardPage | ✅ Done |
| C | LogIncidentPage | ✅ Done |
| D | IncidentsListPage | ✅ Done |
| E | IncidentDetailPage | ✅ Done |
| F | ReviewQueuePage | ✅ Done |
| G | PreventiveActionsListPage + PADetailPage | ✅ Done |
| H | AuditTrailPage | ✅ Done |
| — | RCABuilderPage | ✅ Done |
| — | CreatePAPage | ✅ Done |
| — | NotificationsPage | ✅ Done |
| — | Admin: HierarchyPage, SLARulesPage, UsersPage | ✅ Done |
| — | `usePAEvidences` hook | ✅ Done |


