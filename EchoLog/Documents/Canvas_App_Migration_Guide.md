# EchoLog to Power Platform Canvas App Migration Guide

This document describes how to migrate EchoLog into a Microsoft Power Platform Canvas App while preserving business workflows, role controls, SLA behavior, and auditability.

## 1. Scope and target

Current state:

- EchoLog is implemented as a React code app with generated data services and custom UI logic.

Target state:

- EchoLog is implemented as a Canvas App in Power Apps.
- Data layer uses either Dataverse tables or SharePoint lists already defined in:
  - [Documents/SharePoint_Data_Model.md](Documents/SharePoint_Data_Model.md)
  - [Documents/SharePoint_Implementation_Guide.md](Documents/SharePoint_Implementation_Guide.md)

Recommended target:

- Use Dataverse for production-grade relational behavior, security, and scalability.
- Use SharePoint only if licensing or tenant policy requires it.

## 2. Migration strategy

Use a phased migration with side-by-side validation.

Phase 1: Foundation

1. Finalize data model in Dataverse or SharePoint.
2. Configure environments: Dev, UAT, Prod.
3. Create solution, connection references, and environment variables.

Phase 2: Core app shell

1. Build navigation shell and role-aware menus.
2. Implement authentication context and current user profile resolution.
3. Build reusable components and app-wide constants.

Phase 3: Functional screens

1. Dashboard
2. Log Incident
3. Incidents List and Incident Detail
4. RCA Builder and Review Queue
5. Preventive Actions List and Detail
6. Notifications
7. Admin modules

Phase 4: Automations and hardening

1. Power Automate flows for audit, notifications, SLA timers, and escalation.
2. Security role testing.
3. Performance and delegation tuning.

Phase 5: Cutover

1. Data reconciliation.
2. User acceptance sign-off.
3. Production deployment and hypercare.

## 3. Architecture blueprint for Canvas App

## 3.1 App type and layout

- Canvas App type: Tablet (responsive enabled).
- Global layout:
  - Left navigation component
  - Top bar component
  - Screen-level content containers
- Use component library for common controls:
  - Severity badge
  - Status badge
  - TAT countdown label
  - Confirmation dialog
  - Empty/loading states

## 3.2 Data source selection

Option A (preferred): Dataverse

- Strongest relational support.
- Better row-level security and role model.
- Better support for large datasets and complex filters.

Option B: SharePoint lists

- Faster to bootstrap.
- More delegation limitations and lookup complexity.
- Requires careful indexing and query design.

## 3.3 Solution structure

Create one managed solution containing:

1. Canvas App
2. Tables or SharePoint connectors
3. Cloud flows
4. Connection references
5. Environment variables
6. Security roles and app sharing settings

## 4. Data model mapping

Entities to migrate as-is:

1. cr4c3_userprofiles
2. cr4c3_departments
3. cr4c3_subdepartments
4. cr4c3_processes
5. cr4c3_teams
6. cr4c3_incidents
7. cr4c3_rcasubmissions
8. cr4c3_fishbonecauses
9. cr4c3_preventiveactions
10. cr4c3_paevidences
11. cr4c3_slarules
12. cr4c3_notifications
13. cr4c3_auditlogs
14. cr4c3_delegations

Reference model and relationships:

- [Documents/SharePoint_Data_Model.md](Documents/SharePoint_Data_Model.md)

## 4.1 Choice and code parity

Keep existing business values exactly:

- Severity
- Incident status
- RCA status
- PA status
- User role
- Notification type
- Audit action

If Dataverse is used:

- Implement as Choice columns with fixed option values.

If SharePoint is used:

- Implement as Choice text fields.
- Add optional Number code columns if strict numeric parity is required by external integrations.

## 5. Screen-by-screen migration map

## 5.1 App shell and startup

OnStart responsibilities:

1. Load constants into global variables.
2. Resolve current user by email from user profiles.
3. Cache role and org path.
4. Preload small reference sets (departments, SLA rules).

Suggested startup collections:

- colCurrentUser
- colSlaRules
- colDepartments
- colSubdepartments
- colProcesses
- colTeams

## 5.2 Login

If custom login is retained:

1. Input email and password.
2. Hash input password via custom connector or Power Automate flow.
3. Compare hash with stored password field.

Preferred alternative:

- Use Entra ID identity with Office 365 Users and remove custom password management.

## 5.3 Dashboard

Build tiles and lists from incident and PA queries:

- Active incidents
- Critical incidents
- Overdue incidents
- Resolved this week

Formula patterns:

- Active: incidents where status is not terminal.
- Overdue: Now() greater than due date and status not closed.

## 5.4 Log Incident

Implement cascading controls:

1. Department dropdown
2. Subdepartment dropdown filtered by department
3. Process dropdown filtered by subdepartment
4. Team dropdown filtered by process

On submit:

1. Create incident row
2. Set ticket reference and due date from SLA
3. Create audit log row
4. Navigate to Incident Detail screen

## 5.5 Incidents List

Features to rebuild:

1. Search by ticket/title/description
2. Severity and status filters
3. Sort controls
4. Action menu (view, assign)

Delegation-safe filtering approach:

- Filter with delegable expressions first.
- Apply non-delegable logic after narrowing dataset.

## 5.6 Incident Detail

Tabs to implement:

1. Details
2. RCA
3. Preventive Actions
4. Audit Trail

Actions:

1. Submit RCA
2. Update incident status
3. Create notification events

## 5.7 RCA Builder and Review Queue

RCA Builder:

1. Header fields (title, effect statement)
2. Fishbone grid tied to fishbone causes table
3. Submit or save draft

Review Queue:

1. Tabs: Review, Escalated, Critical
2. Manager-only actions: approve, reject with comment
3. Status transitions and audit row creation

## 5.8 Preventive Actions

List screen:

1. To do, in progress, completed counts
2. List and board toggles

Detail screen:

1. Edit title and description
2. Status update
3. Owner reassignment
4. Evidence upload metadata

## 5.9 Notifications and Admin

Notifications screen:

1. User-specific feed
2. Mark read/unread
3. Type filters

Admin screens:

1. Users and role assignments
2. Hierarchy management
3. Delegations
4. SLA rules

## 6. Power Fx design patterns

Use named formulas or reusable functions where possible.

## 6.1 Current user resolution

- Resolve by User().Email against user profiles.
- Store user row in global variable gblCurrentUser.

## 6.2 Role guard helper

- Build utility expression IsInRole(roleName).
- Include active delegation checks from cr4c3_delegations with date window.

## 6.3 SLA due date calculation

- Get selected severity.
- Lookup active SLA rule for severity.
- DueDate = DateAdd(createdAt, TATHours, TimeUnit.Hours).

## 6.4 Audit logging wrapper

- Create helper procedure using Power Automate flow or centralized formula block:
  - Entity type
  - Entity ID
  - Action
  - Old value
  - New value
  - Actor
  - Timestamp

## 7. Automation with Power Automate

Create these flows:

1. Incident created -> create initial audit row and notification.
2. RCA submitted/reviewed -> update incident status and notify assignee/managers.
3. Preventive action updated/completed -> notify stakeholders and audit.
4. Scheduled escalation (every 15 or 30 minutes):
   - Find RCAs breaching L1 window.
   - Mark escalated and notify L2 manager.
5. Daily digest flow for pending critical items.

Recommended pattern:

- Keep business-critical transitions in flow for traceability.
- Keep UI-level only operations in Canvas formulas.

## 8. Security model

If Dataverse:

1. Create roles matching EchoLog roles.
2. Apply row-level permissions by business unit/team as needed.
3. Restrict admin tables to Admin only.

If SharePoint:

1. Use list-level permissions cautiously.
2. Use app-level guards for UX restrictions.
3. For strict row security, use flow-mediated operations instead of direct write.

## 9. Performance and delegation checklist

1. Avoid loading full lists into memory.
2. Use indexed columns in filter predicates.
3. Keep Filter and LookUp expressions delegable.
4. Use pagination-friendly galleries.
5. Cache only static or slow-changing reference data.
6. Move heavy joins to flows when source is SharePoint.

## 10. Data migration plan

## 10.1 Prepare migration extracts

1. Export current records by entity to CSV.
2. Preserve GUID keys and foreign key references.
3. Normalize choice values to target format.

## 10.2 Load order

Load in dependency order:

1. departments
2. subdepartments
3. processes
4. teams
5. userprofiles
6. slarules
7. incidents
8. rcasubmissions
9. fishbonecauses
10. preventiveactions
11. paevidences
12. notifications
13. auditlogs
14. delegations

## 10.3 Validation

1. Row counts by table match source.
2. Foreign key orphan check returns zero rows.
3. Choice values match expected domain.
4. Random record spot-check by business users.

## 11. Test plan for parity

Must-pass scenarios:

1. Incident lifecycle transitions from open to closure.
2. RCA submit, approve, reject, resubmit cycle.
3. Review queue escalation behavior.
4. Preventive action creation and completion.
5. Evidence metadata capture and retrieval.
6. Role restrictions and delegation behavior.
7. Audit trail completeness for every mutation.
8. Notification creation and read state updates.

## 12. Release and cutover

1. Freeze writes in legacy app at cutover window.
2. Run final delta migration.
3. Execute smoke tests in production.
4. Switch users to Canvas App URL.
5. Keep legacy app read-only for rollback window.

## 13. Risks and mitigation

Risk: SharePoint query delegation limits

- Mitigation: indexed filters, flow-backed queries, Dataverse preference.

Risk: custom password hashing in Canvas

- Mitigation: shift to Entra ID sign-in, or use secure flow/service for hash operations.

Risk: role leakage due to app-only checks

- Mitigation: enforce server-side permissions and flow validation.

Risk: audit gaps during transition

- Mitigation: centralize write operations through audited flow actions.

## 14. Deliverables checklist

1. Canvas App solution package
2. Data model deployed
3. Flows deployed and connected
4. Security roles configured
5. Test evidence and UAT sign-off
6. Runbook and support handover
