# EchoLog — Enhanced Product Requirements Document

**Version:** 2.1
**Date:** May 17, 2026
**Previous Version:** 2.0
**Status:** Draft for Review
**Type:** Power Apps Code App (React + Microsoft Dataverse)

---

## Changelog: v1.0 → v2.0

| Area | Gap in v1.0 | Enhancement in v2.0 |
|---|---|---|
| Incident Lifecycle | Missing transition guards and re-open path | Full state machine with guard conditions, forbidden transitions, and re-open flow |
| RCA Workflow | No escalation SLA definition or L2 bypass path | Defined L1/L2 windows, auto-escalation daemon, L2-bypass for Critical |
| PA Lifecycle | No overdue logic or bulk actions | PA TAT per severity, bulk status update, evidence version history |
| Roles | Static role assignments; no dynamic assignment logic or deputy model | Dynamic role assignment driven by user activity (Logger on incident creation, Assignee on ticket assignment, L1 Manager auto-designated from hierarchy); acting/delegation model with time-bounded scope; corrected Member definition |
| Notifications | No trigger table or routing logic | Full notification trigger matrix per event + routing rules |
| Audit Trail | No tamper-proof guarantee spec | Immutability constraints, checksum field, export to PDF |
| Duplicate Detection | "warns" — no algorithm defined | Levenshtein similarity threshold + same org-path + Open status rule |
| Data Model | Missing FK constraints and index guidance | Column-level detail, required vs optional, index recommendations |
| Security | SHA-256 only | Session management, token expiry, failed login throttling |
| Error States | Not specified | Global error boundary, offline detection, optimistic rollback |
| Testing | Not specified | Unit, integration, and E2E test strategy |
| Accessibility | Generic ARIA mention | WCAG 2.1 AA targets per component |

---

## 1. Product Overview

EchoLog is an **enterprise operational incident management and escalation workflow system** deployed inside Microsoft Power Apps as a Code App (React + TypeScript). It manages the complete lifecycle of an operational incident — from first log, through structured root-cause investigation and multi-level manager review, to corrective action closure — while maintaining an immutable, cryptographically verifiable audit trail of every state change.

### 1.1 Problem Statement

Operations teams in large organisations lack a structured, role-gated tool that:

- Captures incidents with standardised metadata and SLA timers enforced client-side from Dataverse timestamps.
- Enforces a documented RCA process with configurable multi-level review and automatic escalation.
- Links preventive actions back to approved RCAs with evidence, due dates, and overdue alerts.
- Provides managers with a real-time, hierarchy-scoped review queue differentiated by urgency.
- Produces an immutable audit trail suitable for internal or external compliance review.

### 1.2 Goals

| Goal | Success Metric |
|---|---|
| Every incident assigned a unique ticket ref and SLA due date within minutes of logging | Ticket ref generated at save time, before server round-trip |
| No RCA approved without at least one L1 review (or L2 bypass for Critical) | System-enforced status machine; UI and service layer both validate |
| All state changes permanently recorded | Immutable `cr4c3_auditlogs` entries; delete prohibited at service layer |
| Role-appropriate access so users only act within their scope | `useRoleGuard()` on every action; verified server-side via Dataverse column security |
| RCA escalation triggers within defined windows | Escalation daemon runs on page load and on a 5-min polling interval |

### 1.3 Design Principles

1. **State machine first** — every status transition is an explicit, guarded operation. The UI derives permitted actions entirely from current status + user role; it never conditionally shows buttons based on ad-hoc logic.
2. **Single source of truth** — each Dataverse table is owned by one TanStack Query hook. No component fetches data directly.
3. **Audit by default** — every `useMutation` that changes a record also writes an `auditlogs` entry in the same logical operation (two Dataverse creates/updates in sequence; the second is fire-and-forget but errors are logged to console).
4. **Progressive disclosure** — forms, detail panels, and review dialogs reveal complexity only as needed.

---

## 2. Users & Roles

### 2.1 Role Assignment Model

Roles in EchoLog are **dynamically assigned** based on a user's activity and responsibilities within the system, not pre-configured on the user account. A single user may simultaneously hold multiple functional roles across different incidents (e.g., Logger on one incident, Assignee on another). Two roles — **Admin** and **Member** — are static system-access roles assigned by an Admin at account level and govern platform-wide privileges.

#### Dynamic Role Assignment Rules

| Role | Assigned When | Assigned To |
|---|---|---|
| **Logger** | A user creates (logs) an incident | The user who submitted the incident form |
| **Assignee** | An incident is created or reassigned | The user selected in the Assignee field on the incident |
| **L1 Manager** | An RCA is submitted for review | The Assignee's direct L1 Manager as resolved from the org hierarchy (`cr4c3_teams` → `cr4c3_processes` → L1 Manager lookup) |
| **PA Owner** | A preventive action is created | The user selected in the PA Assignee field |

> **Key implication:** A user does not have a single fixed role in the system. `useRoleGuard()` evaluates role permissions **in the context of a specific incident, RCA, or PA** — not globally. For example, a user who is an Assignee on Incident A has no Assignee privileges on Incident B unless they are also assigned there.

#### Static System Roles

| Role | Assigned By | Scope |
|---|---|---|
| **Admin** | Another Admin (or initial setup) | Organisation-wide; elevated privileges for all records and configuration |
| **Member** | Admin | System access only; user gains functional roles (Logger, Assignee, etc.) through activity |

A freshly created account starts as **Member** by default until Admin elevates it or activity grants dynamic roles.

### 2.2 Role Definitions and Permissions

| Role | Scope | Permitted Actions |
|---|---|---|
| **Admin** | Organisation-wide | Full CRUD on all records; configure hierarchy and SLA rules; manage user accounts and role assignments; view all audit logs |
| **Member** | System access only | Basic login and system access; gains functional role permissions (Logger, Assignee, L1 Manager, PA Owner) through activity on specific records |
| **Logger** | Own incidents (created by this user) | Log incidents; view incidents created by them and their linked RCA/PA records in read-only mode |
| **Assignee** | Assigned incidents only | Update incident status (e.g., Open → Investigation Pending); submit and resubmit RCA; view linked preventive actions |
| **L1 Manager** | Department / Team (as defined in hierarchy) | Review submitted RCAs; approve or reject at Level 1; view all incidents within assigned scope |
| **L2 Manager** | Organisation-wide | Final RCA approval at Level 2; approve Critical incidents if the L1 approval window has expired; reject RCA at any stage |
| **PA Owner** | Assigned preventive actions only | Create, update, and complete preventive actions; attach or remove evidence; view linked incident and RCA details |

### 2.3 Role Resolution at Runtime

`useRoleGuard(allowedRoles, entityContext?)` resolves the current user's effective roles by:

1. **Checking static role** — reads `cr4c3_userprofiles.cr4c3_role` (Admin or Member).
2. **Resolving dynamic roles from entity context** — given an `incidentId`, `rcaId`, or `paId`:
   - Logger: `incident.cr4c3_reporterid === currentUserId`
   - Assignee: `incident.cr4c3_assigneeid === currentUserId`
   - L1 Manager: `resolveL1Manager(incident.cr4c3_teamid) === currentUserId`
   - PA Owner: `pa.cr4c3_assigneeid === currentUserId`
3. **Checking active delegations** — queries `cr4c3_delegations` for records where `delegateid = currentUserId AND startdate ≤ today ≤ enddate`; inherits delegator's resolved roles for the same entity context.
4. **Returning the union** of all resolved roles for the permission check.

The L1 Manager for any incident is resolved via `resolveL1Manager(teamId)`:
```
team → process → subdepartment → department → L1 Manager user lookup
```
This lookup path is configured in the Admin → Hierarchy panel and stored as `cr4c3_l1managerid` on the `cr4c3_processes` table.

### 2.4 Delegation Model

An **L1 Manager** or **L2 Manager** may designate an acting deputy for a bounded period (start date → end date) via Admin → Users → Delegation. During this window, the deputy inherits the delegator's dynamic role resolution in addition to their own.

Rules:
- Only an Admin may create or delete delegation records.
- Delegation does not transfer Admin or Member static role privileges.
- A Member acting as delegate for an L1 Manager gains only L1 Manager scope on the specific incidents where `resolveL1Manager()` would return the delegator.
- The acting deputy sees an `"Acting as [Delegator Name] until [Date]"` banner in the sidebar.
- Delegation records are stored in `cr4c3_delegations` and evaluated in step 3 of `useRoleGuard()`.

### 2.5 Authentication

Authentication is custom email/password against `cr4c3_userprofiles` (SHA-256 hashed passwords). The app runs inside the Power Apps player and communicates with the host via `window.parent.postMessage`.

Additional security controls (v2.0):
- Failed login attempts are tracked in `cr4c3_loginattempts`. After 5 consecutive failures, the account is soft-locked for 15 minutes (evaluated client-side; Admin can manually unlock via Users admin panel).
- Session tokens are stored in Jotai `authAtom` only (in-memory). On page refresh/reload, the user must re-authenticate. There is no `localStorage` persistence of credentials.
- Password fields never appear in audit log `oldValue`/`newValue` columns; the audit entry records the action `"PasswordChanged"` only.

---

## 3. Incident Lifecycle

### 3.1 State Machine

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
  [Logger]          │  [Assignee]       [L1/L2Manager]        │
     │              │      │                  │               │
     ▼              │      ▼                  ▼               │
   Open ──────────────► InvestigationPending                  │
     │                      │                                 │
     │              RCASubmitted ◄──── RCARejected ───────────┤
     │                      │              ▲                  │
     │                      ▼              │                  │
     │                RCAInReview ─────────┘                  │
     │                      │                                 │
     │                PendingL1Review                         │
     │                      │                                 │
     │              PendingL2Review                           │
     │                      │                                 │
     │                 RCAApproved                            │
     │                      │                                 │
     │                   PAClosed ◄──────────────────────────┘
     │
     └──► Cancelled  (Admin only; terminal; cannot be reopened)
```

### 3.2 Transition Guards

| From | To | Guard Conditions |
|---|---|---|
| Open | InvestigationPending | `resolveRole(incident) includes Assignee` AND `currentUser = incident.assigneeId` |
| InvestigationPending | RCASubmitted | RCA record exists in Draft status for this incident; `currentUser = incident.assigneeId` |
| RCASubmitted | RCAInReview | `resolveL1Manager(incident.teamId) = currentUserId` OR static role = L2 Manager OR Admin |
| RCAInReview | PendingL1Review | Same as above |
| PendingL1Review | PendingL2Review | `resolveL1Manager(incident.teamId) = currentUserId`; L1 review comment recorded |
| PendingL2Review | RCAApproved | Static role = L2 Manager OR Admin |
| PendingL2Review | RCARejected | Static role = L2 Manager OR Admin |
| PendingL1Review | RCARejected | `resolveL1Manager(incident.teamId) = currentUserId` OR static role = L2 Manager OR Admin |
| RCARejected | RCASubmitted | `currentUser = incident.assigneeId` (Assignee resubmits) |
| RCAApproved | PAClosed | All linked PAs have `status = Completed` |
| Any (except Cancelled, PAClosed) | Cancelled | Static role = Admin only |

**Forbidden transitions** — the service layer returns a `400 Bad Request`-equivalent Dataverse error if attempted:
- Any state backwards (e.g., RCAApproved → RCASubmitted) except via explicit Rejection.
- Open → RCASubmitted (must go through InvestigationPending).

### 3.3 Re-open Flow (New in v2.0)

A `PAClosed` incident may be re-opened to `InvestigationPending` by an Admin or L2Manager if a new related occurrence is detected. Re-opening:
- Creates an audit entry `action = "Reopened"`.
- Does **not** delete the existing approved RCA.
- Generates a new linked RCA with `parentRcaId` pointing to the original.
- Resets SLA timer (`cr4c3_slaresetat = now()`).

### 3.4 SLA Timers

| Severity | TAT |
|---|---|
| Critical | 4 hours |
| High | 24 hours |
| Medium | 72 hours |

SLA is calculated as: `dueAt = (cr4c3_slaresetat ?? cr4c3_createdon) + TAT`.
`isOverdue()` evaluates `now() > dueAt` using the client clock; timestamps are stored in UTC.
TAT values are configurable per environment via Admin → SLA Rules.

A **warning state** triggers at 75% of elapsed TAT (e.g., 3 hours for a Critical incident), rendering the TATCountdown in amber rather than grey.

---

## 4. RCA Workflow

### 4.1 State Machine

```
  [Assignee]         [L1Manager]          [L2Manager]
      │                   │                    │
      ▼                   │                    │
   Draft                  │                    │
      │                   │                    │
      ▼                   │                    │
  Submitted ─────────────►│                    │
      │                   ▼                    │
      │              UnderReview               │
      │                   │                    │
      │            PendingL1Review             │
      │                   │                    │
      │                   ├──── Rejected ──────┤──► (Assignee resubmits)
      │                   │                    │
      │            PendingL2Review ────────────►
      │                                        │
      │                                  ┌─────┴──────┐
      │                                  ▼            ▼
      │                               Approved     Rejected
      │                             (terminal)   (resubmittable)
      │
      └── [L2 Bypass for Critical when L1 window expired]
              PendingL1Review ───────────────────► PendingL2Review
```

### 4.2 Escalation Triggers

Escalation is evaluated by `evaluateEscalation(rca, auditLogs, slaRules)` on component mount and every 5 minutes via `useEffect` + `setInterval`.

| Trigger | Condition | Action |
|---|---|---|
| L1 window expired | `now() > calculateL1Window(incident.createdOn, incident.severity)` | Status set to `Escalated`; notification sent to L2Manager; audit entry `action = "Escalated"` |
| Repeated rejection | Count of `auditLogs` entries where `action = "Rejected"` for this RCA ≥ 2 | Same as above |
| L2 Critical bypass | Incident severity = Critical AND L1 window expired | L2Manager may approve directly from `PendingL1Review` without L1 sign-off |

**L1 Window Definition:**
```
L1Window = {
  Critical: 2 hours,
  High:     8 hours,
  Medium:  24 hours
}
calculateL1Window(createdOn, severity) = createdOn + L1Window[severity]
```
L1 window values are stored in `cr4c3_slarules` alongside TAT and are configurable by Admin.

### 4.3 Fishbone Cause Categories

| Category | Description |
|---|---|
| People | Human error, training gaps, staffing |
| Process | Procedure failures, missing controls |
| Technology | System, infrastructure, software |
| Data | Data quality, migration, integrity |
| Environment | Physical, regulatory, external dependencies |
| Governance | Policy, compliance, decision authority |

Each cause item: `{ id, category, description, contributingFactor: boolean }`.
Minimum 1 cause item required across any category before submission.

### 4.4 RCA Content Requirements

| Field | Required | Validation |
|---|---|---|
| Title | Yes | 10–200 characters |
| Effect Statement | Yes | 50–1000 characters; what was the business impact? |
| Timeline of Events | Yes | Min. 2 timestamped entries |
| Fishbone Causes | Yes | Min. 1 cause item |
| Immediate Containment Actions | Yes | Free text, 50–500 chars |
| Systemic Root Cause | Yes | Free text, 50–1000 chars |
| Reviewer Comment (L1/L2) | Required on Rejection | Min. 20 characters |

---

## 5. Preventive Action Lifecycle

### 5.1 State Machine

```
NotStarted ──► InProgress ──► Completed
                   │
                   └──► (overdue if now() > dueDate and status ≠ Completed)
```

PAs are created **only** after the linked RCA reaches `Approved` status. A PA cannot be created directly against an incident without an approved RCA.

### 5.2 PA TAT (New in v2.0)

PA due dates are not auto-calculated; they are set manually by the PAOwner or Admin at creation time. However, the system enforces:
- Due date must be ≥ today's date at creation.
- A PA without a due date is flagged as `"No Due Date"` in the PA list (amber badge).
- A PA is `isOverdue()` when `status ≠ Completed AND dueDate < now()`.

### 5.3 Bulk Actions (New in v2.0)

In the Preventive Actions List (6.6), multi-select checkboxes enable:
- **Bulk Reassign** — reassign selected PAs to another PAOwner (Admin only).
- **Bulk Mark In Progress** — transitions all selected `NotStarted` PAs to `InProgress`.
- **Bulk Export** — exports selected PA metadata to CSV via `window.URL.createObjectURL`.

### 5.4 Evidence Version History (New in v2.0)

When a PAOwner replaces an existing evidence file (same filename), the previous evidence record is soft-deleted (`cr4c3_isdeleted = true`) rather than physically removed. The PA Detail evidence grid shows only active records by default, with a "Show History" toggle that reveals superseded versions with a `Superseded` badge.

---

## 6. Module Requirements

### 6.1 Dashboard

**Purpose:** Real-time executive summary scoped to the logged-in user's organisational scope.

| Requirement | Detail |
|---|---|
| Time-of-day greeting | `"Good morning/afternoon/evening, [firstName]"` derived from `getHours()`: 0–11 = morning, 12–17 = afternoon, 18–23 = evening |
| Metrics grid (4 cards) | Active Incidents, Critical (red pulse if > 0), Overdue (amber pulse if > 0), Resolved This Week — all derived from a single `useIncidents()` call; no second query |
| Needs Attention list | Incidents where `severity = Critical OR isOverdue() = true`; sorted by overdue first, then by severity; columns: SeverityBadge + TicketRef (link) + Department + StatusBadge + TATCountdown |
| Recent Incidents list | Latest 5 by `createdOn` DESC; same column format as Needs Attention |
| PA Progress ring | SVG `<circle>` with `stroke-dashoffset`: `(1 - completedPAs/totalPAs) * circumference`; shows `"N/A"` when totalPAs = 0 |
| By Department bar chart | Top 4 departments by active incident count; CSS-only: `width: calc(count/max * 100%)`; no chart library |
| Quick Actions | Log Incident, Review RCAs (with unread badge), Preventive Actions, Audit Trail |
| Review Queue badge | Count of RCA submissions in status `Submitted` or `UnderReview` visible to the user's role/scope; red badge if > 0 |
| Delegation banner | If user has an active acting delegation, display: `"Acting as [Delegator Name] until [Date]"` in amber banner below greeting |

### 6.2 Log Incident

**Purpose:** Capture a new incident with full org-path context, duplicate detection, and immediate ticket reference.

| Requirement | Detail |
|---|---|
| Ticket reference preview | `ECHO-{YYYY}-{count+1}` (5-digit zero-padded count, e.g. `ECHO-2026-00042`); count derived from `useIncidents().data.length + 1`; shown in read-only chip before submission |
| 4-step visual stepper | Step 1: Department → Step 2: Subdepartment → Step 3: Process → Step 4: Team (optional, skip available); active step highlighted; completed steps show green check |
| Cascading dropdowns | Each dropdown `disabled` until parent step is complete; options fetched from hierarchy hooks (`useDepartments`, `useSubdepartments(deptId)`, `useProcesses(subdeptId)`, `useTeams(processId)`) |
| Severity dropdown | Renders colour dot + label + TAT hint: `● Critical  (SLA: 4h)` |
| Assignee filtering | `useUserProfiles({ departmentId, subdepartmentId })` — filtered to users whose org-path intersects selection; shows avatar initial + name + role badge |
| Duplicate detection | On blur of the summary field: compute Levenshtein distance against summaries of Open incidents in the same department. If `similarity ≥ 0.75` → show yellow warning banner: `"Possible duplicate: [TicketRef] — [Summary]"` (non-blocking; user may proceed) |
| Required fields | Summary (10–300 chars), Severity, Department, Subdepartment, Process, Assignee; Description optional (0–2000 chars) |
| On submit | 1. `useCreateIncident()` mutation → creates `cr4c3_incidents` record; 2. `useCreateAuditLog()` → `action = "Created"`; 3. `useCreateNotification()` → notifies assigned user; 4. Navigate to `/incidents/{newId}` |

### 6.3 Incidents List

**Purpose:** Browse, filter, sort, and triage all incidents within the user's role scope.

| Requirement | Detail |
|---|---|
| Stats pills | Total (slate), Open/Active (blue), Critical (red + pulse when > 0), Overdue (amber + pulse when > 0) — computed client-side from `useIncidents()` cache |
| Filters | Free-text search (debounced 300ms, matches TicketRef + Summary + Department), Severity dropdown, Status dropdown; filters are AND-combined; persisted to URL query params |
| Sortable columns | Ticket, Summary, Process, Severity, Status, Due, Assignee — tri-state: ASC → DESC → unsorted; sort state persisted in URL params |
| Due column | `TATCountdown` component: green (> 50% time remaining), amber (25–50%), red (< 25% or overdue); `"—"` for Cancelled or PAClosed |
| Staggered row animation | `framer-motion` `motion.tr` with `variants = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }` and `transition={{ delay: index * 0.04 }}` |
| Row kebab menu | View Details (`/incidents/{id}`), Assign to Me (Assignee role only; updates `cr4c3_assigneeid`), Copy Link (copies `window.location.origin + /incidents/{id}` to clipboard) |
| Empty / loading | Skeleton table (5 rows, 7 columns) during loading; custom empty-state SVG illustration + CTA "Log your first incident" when no results |
| Pagination | Client-side: 25 rows per page with Previous / Next; page state in URL param `?page=N` |

### 6.4 Incident Detail

**Purpose:** Full lifecycle view and action hub for a single incident.

| Requirement | Detail |
|---|---|
| Header | Back button (`useNavigate(-1)`) + TicketRef chip + SeverityBadge + StatusBadge + incident title (truncated at 80 chars with tooltip) |
| Time status panel | Urgency-coloured ring (red/amber/green per TATCountdown rules) + `TATCountdown` component + formatted due date; hidden when `status ∈ {Cancelled, PAClosed}` |
| Tab interface (4 tabs) | Details / RCA / Preventive Actions / Audit Trail; tab selection persisted in URL hash |
| Details tab — left column | Description (markdown-safe plain text render); "Submit RCA" CTA button visible only when `status ∈ {Open, InvestigationPending}` AND actor = Assignee |
| Details tab — right column | Org path breadcrumb (Dept > Subdept > Process > Team), Assignee avatar+name, Reporter, Created date, Updated date, SLA due date |
| RCA tab | List of RCA submissions ordered by `createdOn` DESC; each card: title, StatusBadge, submitter avatar+name, relative timestamp; "Export RCA" button (Approved RCAs only) triggers `window.print()` |
| PA tab | "Create Preventive Action" CTA (green gradient) visible only when linked RCA status = `Approved`; list of linked PAs with status, assignee, due date, overdue indicator |
| Audit Trail tab | Scoped to `entityId = incident.id`; same component as global Audit Trail (6.10) but pre-filtered |
| Transition action buttons | Contextual — role + status determine which buttons render: `[Assignee] Start Investigation`, `[Assignee] Submit RCA`, `[L1Manager] Begin Review`, `[L1Manager] Approve L1 / Reject`, `[L2Manager] Final Approve / Reject`, `[Admin] Cancel Incident`, `[Admin/L2Manager] Reopen` |

### 6.5 RCA Builder

**Purpose:** Structured root-cause analysis form with preview, validation, and submission.

| Requirement | Detail |
|---|---|
| Form library | React Hook Form + Zod schema validation |
| Sections | 1. Basic Info (title, effect statement) → 2. Timeline of Events → 3. Fishbone Causes → 4. Immediate Actions → 5. Systemic Root Cause → 6. Preview & Submit |
| Timeline of Events | Dynamic list: `{ timestamp: datetime-local input, description: text }`; min. 2 entries enforced by Zod; entries sortable by timestamp |
| Fishbone causes | Grouped by 6 categories (People, Process, Technology, Data, Environment, Governance); `+ Add Cause` button per category; each cause: `description` (required) + `contributingFactor` toggle; delete icon on each cause |
| Preview mode | Read-only render of all sections before final submit; "Edit" button returns to form with all values intact |
| Autosave | `useEffect` on `formValues` change → debounced 2s → calls `useUpdateRCA({ status: "Draft" })` if RCA record already exists |
| Submit | Validates full Zod schema; calls `useSubmitRCA()` → status `Draft → Submitted`; updates linked incident status to `RCASubmitted`; creates audit log + notification to scoped L1Manager |
| Resubmit | Same flow; appends resubmission number to title: `"[Title] (Resubmission 2)"`; audit log `action = "Resubmitted"` |

### 6.6 Preventive Actions List

**Purpose:** Manage and monitor all corrective actions within scope.

| Requirement | Detail |
|---|---|
| List / Board toggle | `useState` (session only, not persisted) |
| Stats pills | To Do (NotStarted count), In Progress, Done (Completed), Overdue (computed) |
| List view | Sortable table; multi-select checkboxes (col 0); overdue rows: `bg-red-50 dark:bg-red-950`; columns: Title, Linked Incident (TicketRef link), Assignee, Due Date, Status, Actions |
| Board view | 3 Kanban columns: To Do / In Progress / Done; cards show: title, TicketRef chip, assignee avatar, due date; overdue cards: `border-l-4 border-red-500`; drag-and-drop is **out of scope** (cards are not draggable in v2.0) |
| Filters | Free-text search (matches title + linked TicketRef), Status dropdown, Assignee dropdown (Admin/Manager roles only) |
| Bulk actions | Multi-select enables: Bulk Mark In Progress, Bulk Reassign (Admin), Bulk Export CSV |

### 6.7 PA Detail

**Purpose:** Manage a single preventive action end-to-end with inline editing and evidence management.

| Requirement | Detail |
|---|---|
| Inline title edit | Click pencil icon → `<input>` replaces title text; `Enter` or blur saves via `useUpdatePA()`; `Escape` cancels; disabled when `status = Completed` |
| Inline description edit | "Edit" toggle button → expandable `<textarea>` (min 3 rows, max 10); auto-grows with content; Save/Cancel buttons appear below |
| File evidence | Hidden `<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png">`; max file size: 10 MB (enforced client-side with `file.size`); triggers Location Picker dialog |
| Location Picker dialog | Radio: OneDrive / SharePoint; URL text field; stores metadata in `cr4c3_paevidences`: `{ filename, mimeType, locationUrl, uploadedBy, uploadedAt, isDeleted }` |
| Evidence grid | Cards from `usePAEvidences(paId, { includeDeleted: false })`; "Show History" toggle fetches with `includeDeleted: true`; superseded cards show `Superseded` badge (slate) |
| Activity timeline | `useAuditLogs(undefined, paId)` — identical presentation to Incident Detail Audit Trail tab |
| Status sidebar | Status dropdown (only forward transitions: NotStarted → InProgress → Completed); Assignee (searchable user select); Due Date (`<input type="date">`); Parent Issue (TicketRef link); Created date; Completed date (auto-set when status transitions to Completed) |
| Mark as Done | Green gradient CTA button; visible when `status ≠ Completed`; triggers confirmation dialog: `"Marking this PA as Done is final once all evidence is saved. Continue?"` |

### 6.8 Review Queue

**Purpose:** Hierarchy-scoped manager review of RCA submissions, with escalation and criticality tabs.

| Requirement | Detail |
|---|---|
| Role access | `useRoleGuard(["L2Manager","Admin"])` for the queue page itself; L1 Manager access is contextual — users who are `resolveL1Manager()` for at least one incident in `Submitted` or `UnderReview` status are admitted. Members, Loggers, Assignees, and PA Owners are redirected. |
| 3-column tab grid | **Review** (count badge, neutral) / **Escalated** (count badge, amber) / **Critical** (count badge, `bg-destructive`) |
| Review tab | RCA submissions with status `Submitted` or `UnderReview` for incidents within user's org scope; ordered by `createdOn` ASC (oldest first) |
| Escalated tab | RCAs where `evaluateEscalation()` returns true (L1 window expired OR rejection count ≥ 2); L2Manager sees all; L1Manager sees only their scope |
| Critical tab | RCAs linked to incidents where `severity = Critical`; regardless of review status (except Approved/Rejected terminal states) |
| RCA Review Cards | Left border colour = severity (`border-red-500` for Critical, `border-amber-500` for High, `border-slate-400` for Medium); content: TicketRef link + incident title + effect statement (truncated 150 chars) + submitter avatar+name + relative timestamp + resubmission count badge (if > 1) |
| Review Dialog | Title: `"Approve RCA — [TicketRef]"` or `"Reject RCA — [TicketRef]"`; required `<Textarea>` for comment (min 20 chars for Rejection; optional for Approval); "Confirm" button submits `useUpdateRCA()` mutation + audit log + notification to Assignee |
| Keyboard shortcut | `A` = Approve, `R` = Reject on focused card (with confirmation dialog) |

### 6.9 Notifications

**Purpose:** In-app notification centre with unread count and type routing.

| Requirement | Detail |
|---|---|
| Trigger matrix | See Section 9 — Notification Trigger Matrix |
| Notification list | Ordered by `createdAt` DESC; unread items: `bg-blue-50 dark:bg-blue-950 font-medium`; read items: default background |
| Mark as read | Click notification row → `useUpdateNotification({ isRead: true })`; notification body text becomes a link navigating to the related entity |
| Mark all read | Button in panel header → `useBulkMarkRead()` — updates all unread records for `currentUserId` |
| Unread count badge | Derived from `useNotifications({ isRead: false }).data.length`; shown as red dot on sidebar bell icon; disappears at 0 |
| Type labels | Colour-coded badge per `cr4c3_type`: `Incident` (blue), `RCA` (purple), `PA` (green), `Escalation` (red), `Delegation` (amber), `System` (slate) |
| Auto-dismiss | Notifications older than 30 days are hidden from default view (filter `createdAt > now() - 30d`); "Show older" toggle reveals all |

### 6.10 Audit Trail

**Purpose:** Immutable, filterable, exportable chronological log of all system events.

| Requirement | Detail |
|---|---|
| Hero header | Gradient background + total event count badge (updated every 60s via TanStack Query `refetchInterval`) |
| Date-grouped timeline | Entries grouped by calendar date (user's local timezone via `Intl.DateTimeFormat`); sticky date dividers |
| Vertical gradient line | `border-l-2` primary-to-muted gradient connecting event nodes |
| Event node | Colour dot (12×12px) + icon from Lucide keyed to `action` type |
| Action types and colours | Created (blue, `Plus`), Updated (amber, `Pencil`), Status Changed (purple, `ArrowRight`), Approved (green, `CheckCircle`), Rejected (red, `XCircle`), Escalated (orange, `AlertTriangle`), Assigned (cyan, `User`), Completed (green, `Check`), Reopened (indigo, `RotateCcw`), Delegated (amber, `UserCog`), PasswordChanged (slate, `Lock`) |
| Field diff pills | When `cr4c3_oldvalue` and `cr4c3_newvalue` present: `[old value]` (red pill) `→` `[new value]` (green pill) in `font-mono text-xs`; values are JSON-parsed if they are valid JSON (for nested objects) |
| Filters | Free-text search (actor name + entity type + action + old/new value), Entity type dropdown, Action type dropdown, Date range picker (two `<input type="date">`) |
| Actor info | Avatar initial (`bg-primary text-primary-foreground`) + full name + role badge + entity type badge |
| Export | "Export to PDF" button for Admin/Manager: `window.print()` with `@media print` styles scoped to timeline container |
| Immutability | No delete or update operation is exposed on `cr4c3_auditlogs` in any service hook. Dataverse column security should be configured to deny DELETE on this table. |
| Tamper detection (v2.0) | Each audit log entry stores `cr4c3_checksum = SHA256(entityId + action + actor + timestamp + oldValue + newValue)` computed client-side at write time. The global Audit Trail view computes and compares checksums on load; entries with checksum mismatch display a `⚠ Integrity Warning` badge. |

### 6.11 Admin — Hierarchy

**Purpose:** Configure the organisational tree that drives all cascading dropdowns.

| Requirement | Detail |
|---|---|
| 4-level tree | Department → Subdepartment → Process → Team |
| Accordion drill-down | Clicking a node expands to show children; active node highlighted |
| Full CRUD | Create (inline name field + Save), Rename (click-to-edit), Soft Delete (marks `cr4c3_isactive = false`; does not destroy records — incidents retain their org path) |
| Team shifts | Each team: Morning / Evening / Night shift selector (multi-select allowed if a team operates across shifts) |
| Drag to reorder | Within the same level, nodes can be reordered via drag handles; order stored in `cr4c3_sortorder` integer field |

### 6.12 Admin — SLA Rules

**Purpose:** Configure TAT hours per severity and L1 review window hours per severity.

| Requirement | Detail |
|---|---|
| Inline edit/save | Click cell → `<input type="number" min="1">`; Enter or blur saves via `useUpdateSLARule()` |
| Columns | Severity, TAT Hours (incident SLA), L1 Window Hours (RCA escalation threshold) |
| Rows | Critical, High, Medium |
| Validation | TAT must be ≥ 1; L1 Window must be < TAT; invalid values revert on blur with error toast |

### 6.13 Admin — Users

**Purpose:** Manage user accounts, role assignments, and delegation records.

| Requirement | Detail |
|---|---|
| User list | Name, email, role badge, department, last login (from `cr4c3_lastloginat`), account status (Active/Locked) |
| Role assignment | Dropdown per user; saves to `cr4c3_userprofiles`; role change creates audit log entry |
| Unlock account | "Unlock" button visible when user is soft-locked (`cr4c3_failedloginattempts ≥ 5`); resets counter to 0 |
| Delegation management | "Add Delegation" button: select delegator (must have L1 Manager or L2 Manager dynamic role on at least one active incident), delegate (any user with Member or above account status), start date, end date; list of active delegations with Revoke option |
| Expandable detail panel | Click row → slides in right panel showing: profile picture placeholder, full role history from audit log, active delegations |

---

## 7. Shared Components

| Component | Props | Behaviour |
|---|---|---|
| `SeverityBadge` | `severity: "Critical" \| "High" \| "Medium"` | Colour dot + label; Critical = red, High = amber, Medium = slate |
| `StatusBadge` | `status: IncidentStatus \| RCAStatus \| PAStatus` | Colour-coded pill; status display names from a `STATUS_LABELS` const map |
| `TATCountdown` | `dueAt: Date, status: IncidentStatus` | Live countdown `Xh Ym`; coloured red/amber/green; `"Overdue by Xh Ym"` when past due; hidden for closed statuses |
| `TicketRef` | `ticketRef: string` | Monospace chip, copy-on-click with tooltip `"Copied!"` |
| `AuditTimeline` | `entityId?: string, paId?: string` | Fetches and renders audit log timeline; used in Incident Detail, PA Detail, and global Audit Trail |
| `RoleGuard` | `allowedRoles: Role[], entityContext?: { incidentId?, rcaId?, paId? }` | Wrapper component; calls `useRoleGuard()` with entity context to resolve dynamic roles; renders `null` + redirect if resolved roles have no intersection with `allowedRoles` |
| `ConfirmDialog` | `title, description, onConfirm, variant` | Radix `AlertDialog`; `variant = "destructive"` colours CTA red |
| `SkeletonTable` | `rows, columns` | Animated skeleton loader for list views |

---

## 8. Data Model

All tables use the `cr4c3_` publisher prefix in Microsoft Dataverse.

### 8.1 Tables

| Table | Purpose |
|---|---|
| `cr4c3_userprofiles` | Accounts, roles, SHA-256 hashed passwords, last login, failed attempt counter |
| `cr4c3_delegations` | Bounded role delegations (delegator, delegate, start, end) |
| `cr4c3_loginattempts` | Failed login records per user (for throttle evaluation) |
| `cr4c3_departments` | Top-level org units |
| `cr4c3_subdepartments` | Sub-units within departments |
| `cr4c3_processes` | Processes within sub-departments |
| `cr4c3_teams` | Shift-based teams within processes |
| `cr4c3_incidents` | Incident records |
| `cr4c3_rcasubmissions` | RCA documents linked to incidents |
| `cr4c3_fishbonecauses` | Cause items per category on an RCA |
| `cr4c3_preventiveactions` | Corrective/preventive actions linked to incidents |
| `cr4c3_paevidences` | Evidence file metadata attached to PAs |
| `cr4c3_slarules` | Configurable TAT hours and L1 window hours per severity |
| `cr4c3_notifications` | Per-user in-app notifications |
| `cr4c3_auditlogs` | Immutable audit entries |

### 8.2 Key Column Detail

**`cr4c3_incidents`**

| Column | Type | Required | Notes |
|---|---|---|---|
| `cr4c3_ticketref` | String | Yes | `ECHO-{YYYY}-{NNNNN}` format; unique index |
| `cr4c3_title` | String(300) | Yes | |
| `cr4c3_description` | String(2000) | No | |
| `cr4c3_severity` | Choice | Yes | Critical / High / Medium |
| `cr4c3_status` | Choice | Yes | Enum of lifecycle states |
| `cr4c3_assigneeid` | Lookup → userprofiles | Yes | |
| `cr4c3_reporterid` | Lookup → userprofiles | Yes | Set to current user at creation |
| `cr4c3_departmentid` | Lookup → departments | Yes | |
| `cr4c3_subdepartmentid` | Lookup → subdepartments | Yes | |
| `cr4c3_processid` | Lookup → processes | Yes | |
| `cr4c3_teamid` | Lookup → teams | No | |
| `cr4c3_createdon` | DateTime | Auto | UTC |
| `cr4c3_slaresetat` | DateTime | No | Set on Reopen; used as SLA start if present |
| `cr4c3_duedon` | DateTime | Computed | `slaresetat ?? createdon + TAT` |

**`cr4c3_auditlogs`**

| Column | Type | Required | Notes |
|---|---|---|---|
| `cr4c3_actorid` | Lookup → userprofiles | Yes | |
| `cr4c3_action` | String(50) | Yes | See action type enum |
| `cr4c3_entitytype` | Choice | Yes | Incident / RCA / PA / User / Hierarchy / SLARule |
| `cr4c3_entityid` | String(50) | Yes | GUID of the affected record |
| `cr4c3_oldvalue` | String(4000) | No | JSON-serialised previous value |
| `cr4c3_newvalue` | String(4000) | No | JSON-serialised new value |
| `cr4c3_checksum` | String(64) | Yes | SHA-256 hex digest |
| `cr4c3_createdon` | DateTime | Auto | UTC; no update operation exposed |

### 8.3 Recommended Dataverse Indexes

| Table | Index |
|---|---|
| `cr4c3_incidents` | `cr4c3_status, cr4c3_departmentid` |
| `cr4c3_incidents` | `cr4c3_assigneeid` |
| `cr4c3_auditlogs` | `cr4c3_entityid, cr4c3_createdon DESC` |
| `cr4c3_notifications` | `cr4c3_recipientid, cr4c3_isread, cr4c3_createdon DESC` |
| `cr4c3_rcasubmissions` | `cr4c3_incidentid, cr4c3_status` |

---

## 9. Notification Trigger Matrix

| Event | Recipient | Type | Message Template |
|---|---|---|---|
| Incident created | Assignee | `Incident` | `"You've been assigned incident [TicketRef]: [Title]"` |
| Incident status changes | Reporter + Assignee | `Incident` | `"[TicketRef] status changed to [NewStatus]"` |
| RCA submitted | Scoped L1Managers | `RCA` | `"RCA submitted for [TicketRef] — review required"` |
| RCA approved (L1) | Submitter + L2Managers | `RCA` | `"RCA for [TicketRef] approved at L1 — pending L2 review"` |
| RCA approved (L2) | Submitter + Reporter + Assignee | `RCA` | `"RCA for [TicketRef] fully approved"` |
| RCA rejected | Submitter | `RCA` | `"RCA for [TicketRef] rejected — see reviewer comment"` |
| RCA escalated | L2Managers | `Escalation` | `"RCA for [TicketRef] escalated — [reason]"` |
| PA created | PAOwner | `PA` | `"You've been assigned preventive action: [PA Title]"` |
| PA overdue | PAOwner + L1Manager | `PA` | `"Preventive action '[PA Title]' is overdue"` |
| PA completed | L1Manager + Reporter | `PA` | `"Preventive action '[PA Title]' marked complete"` |
| Delegation created | Delegate | `Delegation` | `"You are now acting as [Delegator Name] until [Date]"` |
| Delegation revoked | Delegate | `Delegation` | `"Your acting role as [Delegator Name] has ended"` |
| Account locked | Affected user | `System` | `"Your account has been locked due to failed login attempts"` |

---

## 10. Technical Architecture

| Layer | Technology |
|---|---|
| Runtime | Power Apps Code App (hosted in Power Apps player) |
| Frontend framework | React 18, TypeScript 5, Vite 5 |
| Global state | Jotai atoms (`authAtom`, `themeAtom`, `uiAtoms`, `delegationAtom`) |
| Server state / caching | TanStack Query v5 (one hook file per Dataverse table) |
| UI components | Tailwind CSS v3 + shadcn/ui (Radix UI primitives) + Lucide icons |
| Toasts | Sonner |
| Forms | React Hook Form v7 + Zod v3 |
| Animations | Framer Motion v11 (stagger, presence) |
| Data access | `@microsoft/power-apps` SDK auto-generated services in `src/generated/` |
| Toolchain | Power Platform CLI (`pac`) |
| Build | `npm run build` → `pac code push` |

### 10.1 Key Frontend Patterns

- **Auth**: `AuthProvider` + `ProtectedRoute`; `useRoleGuard()` for per-action enforcement; `delegationAtom` evaluated in `useRoleGuard` for acting roles.
- **Data hooks**: One file per table (e.g. `useIncidents()`, `useRCASubmissions()`), wrapping TanStack Query `useQuery` / `useMutation`. No component fetches Dataverse data directly.
- **State machine enforcement**: Each mutation validates the permitted transition before calling the Dataverse service. Invalid transitions throw a typed `TransitionError` caught by the global error boundary.
- **Generated code**: `src/generated/` is auto-generated by `pac` and must never be edited manually.
- **No chart library**: Circular progress = SVG `stroke-dashoffset`; bar charts = CSS `div` widths.
- **RCA export**: `window.print()` with `@media print` styles — no external PDF library.
- **Date formatting**: `Intl.DateTimeFormat` only — no `date-fns` or `moment`.
- **Levenshtein similarity**: Implemented in `src/lib/utils.ts` as a pure function; no external library.
- **SHA-256**: `crypto.subtle.digest("SHA-256", ...)` (Web Crypto API) — no external library.

### 10.2 Folder Structure (Recommended)

```
src/
├── atoms/            # Jotai atoms
├── components/
│   ├── ui/           # shadcn/ui re-exports (do not edit)
│   └── shared/       # SeverityBadge, StatusBadge, TATCountdown, etc.
├── generated/        # pac-generated Dataverse service clients (do not edit)
├── hooks/            # One file per Dataverse table
│   ├── useIncidents.ts
│   ├── useRCASubmissions.ts
│   ├── usePreventiveActions.ts
│   ├── usePAEvidences.ts
│   ├── useAuditLogs.ts
│   ├── useNotifications.ts
│   ├── useUserProfiles.ts
│   ├── useDelegations.ts
│   └── useSLARules.ts
├── lib/
│   ├── utils.ts      # formatDate, formatDateTime, isOverdue, levenshtein, sha256
│   ├── stateMachine.ts  # Transition guards + TransitionError
│   └── escalation.ts    # evaluateEscalation, calculateL1Window
├── pages/            # One directory per route
└── providers/        # AuthProvider, QueryClientProvider, ThemeProvider
```

### 10.3 Error Handling

- **Global error boundary**: `<ErrorBoundary>` wraps `<App>`; catches unhandled render errors; shows full-page error UI with "Reload" button.
- **Mutation errors**: Each `useMutation`'s `onError` calls `toast.error(message)` via Sonner.
- **Network offline**: `useEffect` listens to `window.addEventListener("offline")` → sets `uiAtoms.isOffline = true` → amber banner: `"You're offline. Changes will not be saved."`.
- **Optimistic rollback**: Mutations that update incident/RCA/PA status use TanStack Query's `onMutate` optimistic update + `onError` rollback pattern.

---

## 11. Non-Functional Requirements

| Requirement | Target |
|---|---|
| TypeScript build | Zero errors (`npm run build`) |
| Linting | Zero ESLint violations (`npm run lint`) |
| Role enforcement | Every write action gated by role check in both UI and service hook |
| Audit logging | Every create/update/status-change writes an audit log entry |
| Audit integrity | Checksum validated on Audit Trail load; mismatch flagged visually |
| SLA accuracy | `isOverdue()` evaluated client-side from Dataverse UTC timestamps |
| Performance | All page data from a single TanStack Query hook call per entity type; no duplicate fetches |
| Security | Passwords stored as SHA-256 hash; no plaintext credentials in code or logs; no credentials in `localStorage` |
| Accessibility | shadcn/Radix UI components (ARIA-compliant); keyboard navigable dialogs; WCAG 2.1 AA colour contrast for all badge and status colours |
| Session | In-memory only; page refresh requires re-authentication |
| Failed login throttle | 5 consecutive failures → 15-minute soft lock |

---

## 12. Testing Strategy

| Layer | Tool | Coverage Target |
|---|---|---|
| Unit — utils & state machine | Vitest | `src/lib/` at 100%; `stateMachine.ts` all guard conditions |
| Unit — hooks | Vitest + `@testing-library/react` + MSW (mock Dataverse) | All hooks: loading, success, error states |
| Integration — key user flows | React Testing Library | Log incident → RCA submit → L1 approve → L2 approve → PA complete |
| E2E (future) | Playwright | Critical path: Login → Log → RCA → Review Queue → Approve |

State machine tests must enumerate every transition and explicitly assert that forbidden transitions throw `TransitionError`.

---

## 13. Accessibility Requirements

| Component | WCAG 2.1 AA Target |
|---|---|
| All modals/dialogs | Focus trapped inside; `Escape` closes; focus returns to trigger on close |
| Badges (SeverityBadge, StatusBadge) | Colour is supplemented by text label (not colour alone) |
| TATCountdown | `role="timer"` + `aria-label="Time remaining: Xh Ym"` |
| Notification badge | `aria-label="N unread notifications"` |
| Kebab menus | `role="menu"` + `role="menuitem"` + keyboard navigable (Arrow Up/Down, Enter, Escape) |
| Skeleton loaders | `aria-busy="true"` on container; `aria-hidden="true"` on skeleton elements |
| Audit trail event nodes | `aria-label="[Action] by [Actor] on [Date]"` |

---

## 14. Out of Scope (v2.0)

| Item | Notes |
|---|---|
| Actual file upload to OneDrive / SharePoint | PA evidence stores metadata only; MS Graph integration is a future enhancement |
| Server-side pagination for audit logs | All logs fetched at once; add `top` + `skipToken` when data volume warrants it |
| Mobile-native layout | App runs in Power Apps player; responsive but not mobile-first |
| Email / push notifications | In-app notifications only |
| Drag-and-drop Kanban | Cards are not draggable in v2.0 |
| RCA PDF generation via library | `window.print()` only; no `jsPDF` or similar |
| Dark mode per-user persistence | Theme preference is session-only via `themeAtom` |

---

## 15. Future Enhancements

1. **MS Graph file upload** — real OneDrive/SharePoint binary storage for PA evidence.
2. **Server-side pagination** — `IGetAllOptions.top` + `skipToken` for audit trail and incidents list at scale.
3. **Email notifications** — Power Automate flows triggered on status changes.
4. **PA Calendar picker** — `src/components/ui/calendar.tsx` date picker.
5. **Report export** — CSV/Excel export for incidents and audit trail.
6. **Dark mode persistence** — store `themeAtom` value in `cr4c3_userprofiles.cr4c3_theme`.
7. **RCA Rejection counter field** — denormalise rejection count onto `cr4c3_rcasubmissions` to avoid audit-log joins at runtime.
8. **Drag-and-drop Kanban** — reorder PA cards across status columns.
9. **Playwright E2E suite** — full critical-path automation.
10. **Multi-language support** — `i18next` integration for localisation.
