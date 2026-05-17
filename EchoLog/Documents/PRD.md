# EchoLog — Product Requirements Document

**Version:** 1.0  
**Date:** May 17, 2026  
**Type:** Power Apps Code App (React + Microsoft Dataverse)

---

## 1. Product Overview

EchoLog is an **enterprise operational incident management and escalation workflow system** deployed inside Microsoft Power Apps. It manages the complete lifecycle of an operational incident — from first log, through root-cause investigation and manager review, to corrective action closure — while maintaining an immutable audit trail of every state change.

### 1.1 Problem Statement

Operations teams in large organisations lack a structured, role-gated tool that:
- Captures incidents with standardised metadata and SLA timers.
- Enforces a documented RCA process with multi-level review.
- Links preventive actions back to approved RCAs with evidence.
- Provides managers with a real-time, hierarchy-scoped review queue.

### 1.2 Goals

| Goal | Metric |
|---|---|
| Every incident is assigned a unique ticket ref and an SLA due date within minutes of logging | Ticket ref generated at log time |
| No RCA is approved without at least one L1 review | System-enforced status machine |
| All state changes are permanently recorded | Immutable `cr4c3_auditlogs` entries |
| Role-appropriate access so users only act within their scope | Role guard on every action button |

---

## 2. Users & Roles

| Role | Scope | Permitted Actions |
|---|---|---|
| **Logger** | Own department | Log incidents, view own incidents |
| **Assignee** | Assigned incidents | Update incident status, submit RCA |
| **L1Manager** | Department / team | Review & approve/reject RCA at L1 |
| **L2Manager** | Organisation-wide | Final RCA approval at L2 |
| **PAOwner** | Assigned PAs | Create, update, and complete preventive actions; attach evidence |
| **Admin** | System-wide | Full CRUD on all records; configure hierarchy and SLA rules |
| **Member** | Read-only | View incidents, RCAs, PAs |

Authentication is custom email/password against `cr4c3_userprofiles` (SHA-256 hashed passwords). The app runs inside the Power Apps player and communicates with the host via `window.parent.postMessage`.

---

## 3. Incident Lifecycle

```
Open → InvestigationPending → RCASubmitted → RCAInReview
     → RCAApproved  → PAClosed
     → RCARejected  (loops back for resubmission)
```

### 3.1 SLA Timers

| Severity | Turn-Around Time (TAT) |
|---|---|
| Critical | 4 hours |
| High | 24 hours |
| Medium | 72 hours |

An incident becomes **overdue** when `now > createdOn + TAT`. TAT values are configurable per environment via Admin → SLA Rules.

---

## 4. RCA Workflow

```
Draft → Submitted → UnderReview → PendingL1Review → PendingL2Review
                                → Approved (terminal)
                                → Rejected (resubmittable)
```

Escalation triggers when:
- The L1 review window (`calculateL1Window(createdOn, severity)`) expires, OR
- The RCA has been rejected and resubmitted ≥ 2 times (tracked via audit log entries with `action = "Rejected"`).

---

## 5. Preventive Action Lifecycle

```
NotStarted → InProgress → Completed
```

PAs are created only after the linked RCA reaches **Approved** status. Evidence files (PDF, Office docs, images) are attached and stored as `cr4c3_paevidences` records.

---

## 6. Module Requirements

### 6.1 Dashboard

**Purpose:** Real-time executive summary for the logged-in user's scope.

| Requirement | Detail |
|---|---|
| Time-of-day greeting | "Good morning/afternoon/evening, [name]" based on `getHours()` |
| Metrics grid (4 cards) | Active Incidents, Critical, Overdue, Resolved This Week — all derived from a single `useIncidents()` query |
| Needs Attention list | Incidents where severity = Critical OR `isOverdue()` = true; shows SeverityBadge + TicketRef + department + StatusBadge + TATCountdown |
| Recent Incidents list | Latest 5 by `createdOn` desc; same column format |
| PA Progress ring | SVG circular progress: Completed PAs / total PAs |
| By Department bar chart | Top 4 departments by active incident count; CSS-only horizontal bars |
| Quick Actions | Log Incident, Review RCAs, Preventive Actions, Audit Trail |
| Review Queue badge | Count of pending RCA submissions shown on "Review Queue" button |

### 6.2 Log Incident

**Purpose:** Capture a new incident with full org-path context.

| Requirement | Detail |
|---|---|
| Ticket reference preview | `ECHO-{year}-{count+1}` (zero-padded), displayed before submission |
| 4-step visual stepper | Department → Subdepartment → Process → Team (optional); step advances when dropdown has a valid value |
| Cascading dropdowns | Each dropdown disabled until parent is selected |
| Severity dropdown | Shows colour dot + TAT label (e.g. "4h / Critical") |
| Assignee filtering | Filtered to users in the selected org path |
| Duplicate detection | Warns when a near-identical open incident already exists |
| On submit | Creates incident record + audit log entry; navigates to `/incidents/:id` |

### 6.3 Incidents List

**Purpose:** Browse, filter, and triage all incidents in scope.

| Requirement | Detail |
|---|---|
| Stats pills | Total (slate), Open/Active (blue), Critical (red + pulse when > 0), Overdue (amber + pulse when > 0) |
| Filters | Free-text search, Severity dropdown, Status dropdown |
| Sortable columns | Ticket, Summary, Process, Severity, Status, Due, Actions — client-side tri-state sort |
| Due column | TATCountdown with red/amber/grey colouring; shows "—" for closed incidents |
| Staggered row animation | Framer Motion `variants` on `<motion.tr>` |
| Row kebab actions | View Details, Assign to Me, Copy Link |
| Empty / loading | Skeleton table during loading; empty state illustration when no results |

### 6.4 Incident Detail

**Purpose:** Full lifecycle view and action hub for a single incident.

| Requirement | Detail |
|---|---|
| Header | Back button + TicketRef + SeverityBadge + StatusBadge + title |
| Time status panel | Urgency-coloured ring + TATCountdown; hidden when status = Closed |
| 4-tab interface | Details / RCA / Preventive Actions / Audit Trail |
| Details tab | 2-col: description + Submit RCA CTA (only for Open/InvestigationPending) vs. org path + people + timeline dates |
| RCA tab | List of submissions (title, status, submitter, timestamp, effect statement); Export RCA via `window.print()` for Approved RCAs |
| PA tab | Create PA CTA (green gradient, only when RCA = Approved) + list of linked PAs |
| Audit Trail tab | Activity timeline with colour-coded event nodes, actor info, field-diff pills |

### 6.5 RCA Builder

**Purpose:** Structured root-cause analysis form.

| Requirement | Detail |
|---|---|
| Form validation | Zod schema + React Hook Form |
| Fishbone causes | Add/delete cause items per category: People, Process, Technology, Data, Environment, Governance |
| Preview mode | Read-only view before submission |
| Submit / Update | Calls RCA service; updates linked incident status; creates audit log |

### 6.6 Preventive Actions List

**Purpose:** Manage and monitor all corrective actions.

| Requirement | Detail |
|---|---|
| List / Board toggle | Persisted in local state for session |
| Stats pills | To Do, In Progress, Done, Overdue |
| List view | Sortable table with multi-select checkboxes; overdue rows highlight `bg-red-50` |
| Board view | 3-column Kanban grouped by status (`NotStarted / InProgress / Completed`); overdue cards get red left border |
| Filters | Free-text search + Status dropdown |

### 6.7 PA Detail

**Purpose:** Manage a single preventive action end-to-end.

| Requirement | Detail |
|---|---|
| Inline title edit | Click-to-edit when PA is not Completed; saves via `useUpdatePA()` |
| Inline description edit | Toggle edit button; expandable textarea |
| File evidence | Hidden `<input type="file">` accept `.pdf,.doc,.docx,.xls,.xlsx,.jpg,.png`; Location Picker dialog (OneDrive / SharePoint); stores metadata in `cr4c3_paevidences` |
| Evidence grid | Files from `usePAEvidences(paId)` |
| Activity timeline | `useAuditLogs(undefined, paId)` — same pattern as Incident Detail |
| Status sidebar | Status dropdown, Assignee, Due Date picker, Parent Issue link, Created/Completed dates |
| Mark as Done | Green CTA button, only visible when status ≠ Completed |

### 6.8 Review Queue

**Purpose:** Hierarchy-scoped manager review of RCA submissions.

| Requirement | Detail |
|---|---|
| 3-column tab grid | Review (count badge) / Escalated (count badge) / Critical (destructive red badge) |
| Review tab | Submissions with status Submitted or UnderReview within user's org scope |
| Escalated tab | RCAs where L1 window expired OR rejection count ≥ 2 |
| Critical tab | RCAs linked to incidents with severity = Critical |
| RCA Review Cards | Severity-coded left border; shows TicketRef link + effect statement + submitter + timestamp |
| Review Dialog | Dynamic title (Approve/Reject), required textarea for comment; submit calls `useUpdateRCA()` + creates audit log + notification |
| Role enforcement | `useRoleGuard()` + `useUserProfiles()` to scope accessible incident IDs |

### 6.9 Notifications

**Purpose:** In-app notification centre.

| Requirement | Detail |
|---|---|
| Notification list | Shows all notifications for current user |
| Mark read / mark all read | Updates `cr4c3_notifications` records |
| Type labels | Badge per notification type |
| Unread count badge | Shown in Sidebar nav icon |

### 6.10 Audit Trail

**Purpose:** Immutable, filterable chronological log of all system events.

| Requirement | Detail |
|---|---|
| Hero header | Gradient bg + event count badge |
| Date-grouped timeline | Grouped by calendar date using `Intl.DateTimeFormat`; sticky date headers |
| Vertical gradient line | `border-l-2` primary-to-muted gradient |
| Event node | Colour dot + icon keyed to action type |
| Action types | Created (blue), Updated (amber), Status Changed (purple), Approved (green), Rejected (red), Escalated (orange), Assigned (cyan), Completed (green) |
| Field diff pills | When `cr4c3_oldvalue` and `cr4c3_newvalue` exist: red pill (old) + arrow + green pill (new) in monospace |
| Filters | Free-text search + Entity type dropdown + Action type dropdown |
| Actor info | Avatar initial + full name + role badge + entity type badge |

### 6.11 Admin — Hierarchy

**Purpose:** Configure the organisational tree that drives all cascading dropdowns.

| Requirement | Detail |
|---|---|
| 4-level tree | Department → Sub-department → Process → Team |
| Accordion drill-down | Expand any level to manage children |
| Full CRUD | Create, rename, delete at each level |
| Team shift | Morning / Evening / Night per team |

### 6.12 Admin — SLA Rules

**Purpose:** Configure TAT hours per severity.

| Requirement | Detail |
|---|---|
| Inline edit/save | Click cell to edit; save updates `cr4c3_slarules` |
| Per-severity rows | Critical, High, Medium |

### 6.13 Admin — Users

**Purpose:** Manage user accounts and role assignments.

| Requirement | Detail |
|---|---|
| User list | Name, email, role, department |
| Role assignment | Dropdown per user; saves to `cr4c3_userprofiles` |
| Profile details | Expandable detail panel |

---

## 7. Data Model

All tables use the `cr4c3_` publisher prefix in Microsoft Dataverse.

| Table | Purpose |
|---|---|
| `cr4c3_userprofiles` | Accounts, roles, SHA-256 hashed passwords |
| `cr4c3_departments` | Top-level org units |
| `cr4c3_subdepartments` | Sub-units within departments |
| `cr4c3_processes` | Processes within sub-departments |
| `cr4c3_teams` | Shift-based teams within processes |
| `cr4c3_incidents` | Incident records (status, severity, dates, assignee, org path) |
| `cr4c3_rcasubmissions` | RCA documents linked to incidents |
| `cr4c3_fishbonecauses` | Cause items per category on an RCA |
| `cr4c3_preventiveactions` | Corrective/preventive actions linked to incidents |
| `cr4c3_paevidences` | Evidence file metadata attached to PAs |
| `cr4c3_slarules` | Configurable TAT hours per severity |
| `cr4c3_notifications` | Per-user in-app notifications |
| `cr4c3_auditlogs` | Immutable audit entries (actor, action, entity, old/new values) |

---

## 8. Technical Architecture

| Layer | Technology |
|---|---|
| Runtime | Power Apps Code App (hosted in Power Apps player) |
| Frontend framework | React 18, TypeScript, Vite |
| Global state | Jotai atoms (`authAtom`, `themeAtom`, `uiAtoms`) |
| Server state / caching | TanStack Query v5 (one hook file per Dataverse table) |
| UI components | Tailwind CSS + shadcn/ui (Radix UI primitives) + Lucide icons |
| Toasts | Sonner |
| Forms | React Hook Form + Zod validation |
| Animations | Framer Motion (stagger, presence) |
| Data access | `@microsoft/power-apps` SDK auto-generated services in `src/generated/` |
| Toolchain | Power Platform CLI (`pac`) |
| Build | `npm run build` → `pac code push` |

### 8.1 Key Frontend Patterns

- **Auth**: `AuthProvider` + `ProtectedRoute`; `useRoleGuard()` for per-action enforcement.
- **Data hooks**: One file per table (e.g. `useIncidents()`, `useRCASubmissions()`), wrapping TanStack Query `useQuery` / `useMutation`.
- **Generated code**: `src/generated/` is auto-generated by `pac` and must not be edited manually.
- **No chart library**: Circular progress = SVG `stroke-dashoffset`; bar charts = CSS `div` widths.
- **RCA export**: `window.print()` with `@media print` scoped styles — no external PDF library.
- **Date formatting**: `Intl.DateTimeFormat` (no `date-fns`); existing `formatDateTime` / `formatDate` from `src/lib/utils.ts`.

---

## 9. Non-Functional Requirements

| Requirement | Target |
|---|---|
| TypeScript build | Zero errors (`npm run build`) |
| Linting | Zero ESLint violations (`npm run lint`) |
| Role enforcement | Every destructive/write action gated by role check |
| Audit logging | Every create/update/status-change writes an audit log entry |
| SLA accuracy | `isOverdue()` evaluated client-side from Dataverse timestamps |
| Performance | All page data from a single hook call; no duplicate fetches per page |
| Security | Passwords stored as SHA-256 hash; no plaintext credentials in code or logs |
| Accessibility | shadcn/Radix UI components (ARIA-compliant); keyboard navigable dialogs |

---

## 10. Out of Scope (Current Version)

| Item | Notes |
|---|---|
| Actual file upload to OneDrive / SharePoint | PA evidence stores metadata only; MS Graph integration is a future enhancement |
| Server-side pagination for audit logs | All logs fetched at once; add `top` + `skipToken` when data volume warrants it |
| RCA rejection counter field on schema | Tracked via audit log query at runtime; no schema change needed currently |
| Mobile-native layout | App runs in Power Apps player; responsive but not mobile-first |
| Email / push notifications | In-app notifications only in this version |

---

## 11. Future Enhancements

1. **MS Graph file upload** — real OneDrive/SharePoint storage for PA evidence files.
2. **Server-side pagination** — `IGetAllOptions.top` + `skipToken` for audit trail and incidents list.
3. **RCA rejection counter field** — denormalise rejection count onto `cr4c3_rcasubmissions` to avoid runtime audit-log joins.
4. **Email notifications** — Power Automate flows triggered on status changes.
5. **PA Calendar picker** — `src/components/ui/calendar.tsx` (currently falls back to `<input type="date">`).
6. **Report export** — CSV/Excel export for incidents and audit trail.
