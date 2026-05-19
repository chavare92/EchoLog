# EchoLog Canvas App — Screen Build Prompts with Power Fx Formulas

This document provides a build prompt and complete Power Fx formula reference for every screen in the EchoLog Canvas App. Each section can be used directly as an AI-assisted build prompt inside Power Apps Copilot or as a specification for a developer.

All table names, field names, and option-set values are sourced from the Dataverse schema defined in [SharePoint_Data_Model.md](SharePoint_Data_Model.md) and the EchoLog React codebase.

---

## Quick Reference — Option-Set Values

```
Severity:         Critical = 564060000 | High = 564060001 | Medium = 564060002
TAT Hours:        Critical = 4h        | High = 24h       | Medium = 72h

Incident Status:  Open = 564060000             | InvestigationPending = 564060001
                  RCASubmitted = 564060002      | RCAInReview = 564060003
                  RCAApproved = 564060004       | RCARejected = 564060005
                  PAClosed = 564060006          | Cancelled = 564060007

RCA Status:       Draft = 564060000             | Submitted = 564060001
                  UnderReview = 564060002        | Approved = 564060003
                  Rejected = 564060004           | PendingL1Review = 564060005
                  PendingL2Review = 564060006    | Escalated = 564060007

PA Status:        NotStarted = 564060000 | InProgress = 564060001 | Completed = 564060002

User Role:        Logger = 564060000     | Assignee = 564060001   | L1Manager = 564060002
                  L2Manager = 564060003  | PAOwner = 564060004    | Admin = 564060005
                  Member = 564060006

Fishbone Category: People = 564060000   | Process = 564060001    | Technology = 564060002
                   Material = 564060003  | Environment = 564060004 | Management = 564060005

Team Shift:       Morning = 564060000 | Evening = 564060001 | Night = 564060002

Notification Type: Info = 564060000 | Warning = 564060001 | Success = 564060002 | Error = 564060003

Audit Action:     Created = 1   | Approved = 2  | Rejected = 3  | Updated = 4  | Submitted = 5
                  Escalated = 6 | Closed = 7    | Assigned = 8  | Reopened = 9 | Cancelled = 10
```

---

## Required Power Automate Flows

The following flows must exist before building the Canvas App. Reference them in formulas using their connector names shown here.

| Connector Name            | Purpose                                                                 |
|---------------------------|-------------------------------------------------------------------------|
| `EchoHashFlow`            | Accepts plain-text password, returns `hashresult` (SHA-256 hex string) |
| `EchoAuditFlow`           | Creates an audit log row with checksum for a given entity mutation      |
| `EchoNotifyFlow`          | Creates a notification row for a target user                            |
| `EchoNotifyL2Flow`        | Notifies all L2 Managers about an escalation on a given incident        |
| `EchoVerifyChecksumFlow`  | Re-computes checksum for an audit log row, returns `hashresult`         |
| `EchoTicketRefFlow`       | Generates the next `ECHO-YYYY-NNNN` ticket reference, returns `ticketref` |

---

## Screen 1 — App OnStart (Global Bootstrap)

### Build Prompt

> Create the App.OnStart formula for EchoLog Canvas App. On startup the app must:
> 1. Resolve the current user by matching `User().Email` against the `cr4c3_userprofiles` Dataverse table.
> 2. Store the user record in a global variable `gblCurrentUser` and derive boolean role flags.
> 3. Preload small, slow-changing reference collections into named collections.
> 4. Navigate to the Login screen if no user record is found, or to the Dashboard if already resolved.

### Power Fx — App.OnStart

```powerfx
// ── 1. Resolve current user ──────────────────────────────────────────────
Set(
    gblCurrentUser,
    LookUp(cr4c3_userprofiles, cr4c3_email = Lower(User().Email))
);

// ── 2. Role flags ────────────────────────────────────────────────────────
Set(gblIsAdmin,    gblCurrentUser.cr4c3_role = 564060005);
Set(gblIsL1,       gblCurrentUser.cr4c3_role = 564060002);
Set(gblIsL2,       gblCurrentUser.cr4c3_role = 564060003);
Set(gblIsLogger,   gblCurrentUser.cr4c3_role = 564060000);
Set(gblIsAssignee, gblCurrentUser.cr4c3_role = 564060001);
Set(gblIsPAOwner,  gblCurrentUser.cr4c3_role = 564060004);

// ── 3. Preload reference data ─────────────────────────────────────────────
ClearCollect(colDepartments,  cr4c3_departments);
ClearCollect(colSubdepts,     cr4c3_subdepartments);
ClearCollect(colProcesses,    cr4c3_processes);
ClearCollect(colTeams,        cr4c3_teams);
ClearCollect(colSlaRules,     Filter(cr4c3_slarules, cr4c3_isactive = true));

// ── 4. Route ──────────────────────────────────────────────────────────────
If(
    IsBlank(gblCurrentUser),
    Navigate(scrLogin,     ScreenTransition.None),
    Navigate(scrDashboard, ScreenTransition.Fade)
)
```

---

## Screen 2 — Login Screen (`scrLogin`)

### Build Prompt

> Create a Login screen for EchoLog. The screen must have:
> - An email text input (`txtLoginEmail`) and a password text input with `Mode = Password` (`txtLoginPassword`).
> - A Sign In button that hashes the entered password via the `EchoHashFlow` Power Automate flow, then looks up the user by email + hashed password in `cr4c3_userprofiles`.
> - An error label that shows "Invalid email or password" on failed login.
> - On success, store the user in `gblCurrentUser`, set role flags, and navigate to the Dashboard.
> - No password is stored in plain text anywhere in the app.
>
> Note: The preferred long-term approach is to replace this with Entra ID / Office 365 Users authentication and remove the custom password field entirely.

### Power Fx — btnSignIn.OnSelect

```powerfx
// Hash password via flow (never store plain text)
Set(
    gblHashedPassword,
    EchoHashFlow.Run(txtLoginPassword.Text).hashresult
);

// Lookup user
Set(
    gblLoginResult,
    LookUp(
        cr4c3_userprofiles,
        cr4c3_email    = Lower(txtLoginEmail.Text) &&
        cr4c3_password = gblHashedPassword
    )
);

If(
    IsBlank(gblLoginResult),
    // Failed
    Set(gblLoginError, "Invalid email or password"),

    // Success
    Set(gblCurrentUser, gblLoginResult);
    Set(gblIsAdmin,    gblCurrentUser.cr4c3_role = 564060005);
    Set(gblIsL1,       gblCurrentUser.cr4c3_role = 564060002);
    Set(gblIsL2,       gblCurrentUser.cr4c3_role = 564060003);
    Set(gblIsLogger,   gblCurrentUser.cr4c3_role = 564060000);
    Set(gblIsAssignee, gblCurrentUser.cr4c3_role = 564060001);
    Set(gblIsPAOwner,  gblCurrentUser.cr4c3_role = 564060004);
    Set(gblLoginError, "");
    Navigate(scrDashboard, ScreenTransition.Fade)
)
```

### Power Fx — lblLoginError.Visible

```powerfx
gblLoginError <> ""
```

---

## Screen 3 — Dashboard (`scrDashboard`)

### Build Prompt

> Create a Dashboard screen for EchoLog with the following sections:
> 1. **Metric tiles row** — four KPI cards: Active Incidents, Critical Incidents, Overdue Incidents, Resolved This Week.
> 2. **Recent incidents gallery** — last 10 incidents sorted by created date descending, with ticket reference, title, severity badge, status badge, and a TAT countdown label.
> 3. **PA summary pills** — To Do / In Progress / Done counts.
> Load all data in `scrDashboard.OnVisible`. Use global variables for counts to avoid gallery formula complexity.

### Power Fx — scrDashboard.OnVisible

```powerfx
// Active incidents (exclude terminal statuses)
ClearCollect(
    colActiveIncidents,
    Filter(
        cr4c3_incidents,
        cr4c3_status <> 564060006 &&   // PAClosed
        cr4c3_status <> 564060007      // Cancelled
    )
);

// KPI counts
Set(gblActiveCount,   CountRows(colActiveIncidents));
Set(gblCriticalCount, CountIf(colActiveIncidents, cr4c3_severity = 564060000));
Set(gblOverdueCount,  CountIf(colActiveIncidents, cr4c3_duedate < Now()));
Set(gblResolvedThisWeek,
    CountIf(
        cr4c3_incidents,
        cr4c3_status = 564060006 &&
        DateDiff(cr4c3_updatedat, Now(), TimeUnit.Days) <= 7
    )
);

// Recent incidents for gallery
ClearCollect(
    colRecentIncidents,
    FirstN(
        SortByColumns(cr4c3_incidents, "cr4c3_createdat", SortOrder.Descending),
        10
    )
);

// PA stats
Set(gblPANotStarted, CountIf(cr4c3_preventiveactions, cr4c3_status = 564060000));
Set(gblPAInProgress, CountIf(cr4c3_preventiveactions, cr4c3_status = 564060001));
Set(gblPACompleted,  CountIf(cr4c3_preventiveactions, cr4c3_status = 564060002))
```

### Power Fx — TAT Countdown Label (in gallery, `lblTATCountdown.Text`)

```powerfx
With(
    { hoursLeft: DateDiff(Now(), ThisItem.cr4c3_duedate, TimeUnit.Hours) },
    If(
        hoursLeft < 0,
        "OVERDUE by " & Text(Abs(hoursLeft), "0") & "h",
        If(
            hoursLeft < 1,
            Text(DateDiff(Now(), ThisItem.cr4c3_duedate, TimeUnit.Minutes), "0") & "m left",
            Text(hoursLeft, "0") & "h left"
        )
    )
)
```

### Power Fx — Severity Badge Color (`lblSeverityBadge.Fill`)

```powerfx
Switch(
    ThisItem.cr4c3_severity,
    564060000, RGBA(239, 68,  68,  1),   // Critical → red
    564060001, RGBA(249, 115, 22,  1),   // High → orange
              RGBA(234, 179, 8,   1)     // Medium → yellow
)
```

### Power Fx — Severity Badge Text (`lblSeverityBadge.Text`)

```powerfx
Switch(ThisItem.cr4c3_severity,
    564060000, "Critical",
    564060001, "High",
    "Medium")
```

### Power Fx — Navigate to Incident Detail (gallery row OnSelect)

```powerfx
Set(gblNavIncidentId, ThisItem.cr4c3_incidentid);
Navigate(scrIncidentDetail, ScreenTransition.None)
```

---

## Screen 4 — Log Incident (`scrLogIncident`)

### Build Prompt

> Create a Log Incident screen for EchoLog. The screen must include:
> 1. **Cascading dropdowns**: Department → Subdepartment (filtered by department) → Process (filtered by subdepartment) → Team (filtered by process).
> 2. **Severity selector**: Three toggle buttons (Critical / High / Medium) with TAT preview label showing the computed due date/time.
> 3. **Title and Description** text inputs.
> 4. **Assignee dropdown** filtered to users in the selected team with role Assignee (564060001) or PAOwner (564060004).
> 5. **Duplicate detection**: On title blur, search for existing open incidents with a matching title prefix and show a warning dialog.
> 6. **Submit button**: Calls `EchoTicketRefFlow` to get the ticket reference, calculates due date from SLA rule, patches `cr4c3_incidents`, then calls `EchoAuditFlow` to log the creation.
> 7. **Validation**: All fields required before submit is enabled.

### Power Fx — Cascading Dropdown Items

```powerfx
// ddSubdept.Items
Filter(colSubdepts, 'cr4c3_department_value' = ddDept.Selected.cr4c3_departmentid)

// ddProcess.Items
Filter(colProcesses, 'cr4c3_subdepartment_value' = ddSubdept.Selected.cr4c3_subdepartmentid)

// ddTeam.Items
Filter(colTeams, 'cr4c3_process_value' = ddProcess.Selected.cr4c3_processid)

// ddAssignee.Items
Filter(
    cr4c3_userprofiles,
    'cr4c3_team_value' = ddTeam.Selected.cr4c3_teamid &&
    cr4c3_role In [564060001, 564060004]    // Assignee or PAOwner
)
```

### Power Fx — TAT Preview Label (`lblTATPreview.Text`)

```powerfx
"Due: " & Text(
    DateAdd(
        Now(),
        LookUp(
            colSlaRules,
            cr4c3_severity = gblSelectedSeverity
        ).cr4c3_tathours,
        TimeUnit.Hours
    ),
    "dd mmm yyyy hh:mm"
)
```

### Power Fx — Duplicate Warning (txtTitle.OnChange)

```powerfx
If(
    Len(txtTitle.Text) >= 10,
    Set(
        gblDupWarning,
        CountRows(
            Filter(
                cr4c3_incidents,
                StartsWith(cr4c3_title, Left(txtTitle.Text, 10)) &&
                cr4c3_status <> 564060007    // not Cancelled
            )
        ) > 0
    )
)
```

### Power Fx — Submit Button (btnLogIncident.OnSelect)

```powerfx
// Validate required fields
If(
    IsBlank(txtTitle.Text) ||
    IsBlank(ddDept.Selected)     ||
    IsBlank(ddSubdept.Selected)  ||
    IsBlank(ddProcess.Selected)  ||
    IsBlank(ddTeam.Selected)     ||
    IsBlank(ddAssignee.Selected),
    Notify("Please fill in all required fields", NotificationType.Error),

    // All valid — proceed
    // 1. Get ticket reference from flow
    Set(gblNewTicketRef, EchoTicketRefFlow.Run().ticketref);

    // 2. Calculate due date from active SLA rule
    Set(
        gblNewDueDate,
        DateAdd(
            Now(),
            LookUp(colSlaRules, cr4c3_severity = gblSelectedSeverity).cr4c3_tathours,
            TimeUnit.Hours
        )
    );

    // 3. Create incident record
    Set(
        gblNewIncident,
        Patch(
            cr4c3_incidents,
            Defaults(cr4c3_incidents),
            {
                cr4c3_title:            txtTitle.Text,
                cr4c3_description:      txtDescription.Text,
                cr4c3_severity:         gblSelectedSeverity,
                cr4c3_status:           564060000,         // Open
                cr4c3_duedate:          gblNewDueDate,
                cr4c3_ticketreference:  gblNewTicketRef,
                cr4c3_rejectioncount:   0,
                cr4c3_createdat:        Now(),
                cr4c3_updatedat:        Now(),
                'cr4c3_loggedby_value':      gblCurrentUser,
                'cr4c3_assignee_value':      ddAssignee.Selected,
                'cr4c3_department_value':    ddDept.Selected,
                'cr4c3_subdepartment_value': ddSubdept.Selected,
                'cr4c3_process_value':       ddProcess.Selected,
                'cr4c3_team_value':          ddTeam.Selected
            }
        )
    );

    // 4. Audit log — action 1 = Created
    EchoAuditFlow.Run(
        gblNewIncident.cr4c3_incidentid,
        "Incident",
        1,
        "",
        "",
        gblCurrentUser.cr4c3_userprofileid
    );

    // 5. Navigate to detail
    Set(gblNavIncidentId, gblNewIncident.cr4c3_incidentid);
    Navigate(scrIncidentDetail, ScreenTransition.None)
)
```

### Power Fx — Submit Button Enabled State (`btnLogIncident.DisplayMode`)

```powerfx
If(
    IsBlank(txtTitle.Text)       ||
    IsBlank(ddDept.Selected)     ||
    IsBlank(ddSubdept.Selected)  ||
    IsBlank(ddProcess.Selected)  ||
    IsBlank(ddTeam.Selected)     ||
    IsBlank(ddAssignee.Selected),
    DisplayMode.Disabled,
    DisplayMode.Edit
)
```

---

## Screen 5 — Incidents List (`scrIncidentsList`)

### Build Prompt

> Create an Incidents List screen for EchoLog with:
> 1. **Search bar** — filters by title or ticket reference.
> 2. **Filter controls** — Status dropdown, Severity dropdown, "Overdue only" toggle.
> 3. **Gallery** — columns: Ticket Ref, Title, Department name, Severity badge, Status badge, Due Date, Overdue indicator.
> 4. **Role-scoped data**: Loggers see only their own incidents; Assignees see incidents where they are assignee or logger; L1/L2 Managers and Admins see all.
> 5. Clicking a row navigates to the Incident Detail screen.

### Power Fx — scrIncidentsList.OnVisible

```powerfx
// Build role-scoped base collection
If(
    gblIsAdmin || gblIsL1 || gblIsL2,
    ClearCollect(colMyIncidents, cr4c3_incidents),

    gblCurrentUser.cr4c3_role = 564060001,   // Assignee
    ClearCollect(
        colMyIncidents,
        Filter(
            cr4c3_incidents,
            'cr4c3_assignee_value' = gblCurrentUser.cr4c3_userprofileid ||
            'cr4c3_loggedby_value' = gblCurrentUser.cr4c3_userprofileid
        )
    ),

    // Logger (default)
    ClearCollect(
        colMyIncidents,
        Filter(
            cr4c3_incidents,
            'cr4c3_loggedby_value' = gblCurrentUser.cr4c3_userprofileid
        )
    )
)
```

### Power Fx — Gallery Items (galIncidents.Items)

```powerfx
SortByColumns(
    Filter(
        colMyIncidents,
        // Search
        (txtIncidentSearch.Text = "" ||
            StartsWith(cr4c3_title,           txtIncidentSearch.Text) ||
            StartsWith(cr4c3_ticketreference, txtIncidentSearch.Text)) &&
        // Status filter
        (ddStatusFilter.Selected.Value = "All" ||
            cr4c3_status = Value(ddStatusFilter.Selected.Value)) &&
        // Severity filter
        (ddSevFilter.Selected.Value = "All" ||
            cr4c3_severity = Value(ddSevFilter.Selected.Value)) &&
        // Overdue toggle
        (!tglOverdueOnly.Value || cr4c3_duedate < Now())
    ),
    "cr4c3_createdat", SortOrder.Descending
)
```

### Power Fx — Overdue Indicator Visible (`lblOverdue.Visible`)

```powerfx
ThisItem.cr4c3_duedate < Now() &&
ThisItem.cr4c3_status <> 564060006 &&    // not PAClosed
ThisItem.cr4c3_status <> 564060007       // not Cancelled
```

### Power Fx — Status Label (`lblStatus.Text`)

```powerfx
Switch(
    ThisItem.cr4c3_status,
    564060000, "Open",
    564060001, "Investigation Pending",
    564060002, "RCA Submitted",
    564060003, "RCA In Review",
    564060004, "RCA Approved",
    564060005, "RCA Rejected",
    564060006, "PA Closed",
    564060007, "Cancelled",
    "Unknown"
)
```

### Power Fx — Row OnSelect

```powerfx
Set(gblNavIncidentId, ThisItem.cr4c3_incidentid);
Navigate(scrIncidentDetail, ScreenTransition.None)
```

---

## Screen 6 — Incident Detail (`scrIncidentDetail`)

### Build Prompt

> Create an Incident Detail screen with a 4-tab layout: **Overview**, **RCA**, **Preventive Actions**, **Audit Trail**.
>
> **Overview tab**: Show all incident fields, a status progress stepper (Open → Investigation Pending → RCA Submitted → RCA In Review → RCA Approved → PA Closed), and action buttons to edit title/description/severity (Logger or Admin) and to reassign (Assignee or Admin).
>
> **RCA tab**: Show the linked RCA record (if any). Button to create or open the RCA Builder screen.
>
> **Preventive Actions tab**: Gallery of PAs linked to this incident with status badges and a "Create PA" button.
>
> **Audit Trail tab**: Timeline gallery of audit log rows for this incident.

### Power Fx — scrIncidentDetail.OnVisible

```powerfx
// Load incident
Set(
    gblSelectedIncident,
    LookUp(cr4c3_incidents, cr4c3_incidentid = gblNavIncidentId)
);

// Load linked RCA (latest)
Set(
    gblSelectedRCA,
    LookUp(
        cr4c3_rcasubmissions,
        'cr4c3_incident_value' = gblNavIncidentId
    )
);

// Load PAs for this incident
ClearCollect(
    colIncidentPAs,
    Filter(cr4c3_preventiveactions, 'cr4c3_incident_value' = gblNavIncidentId)
);

// Load audit log for this incident
ClearCollect(
    colIncidentAudit,
    SortByColumns(
        Filter(cr4c3_auditlogs, cr4c3_entityid = gblNavIncidentId),
        "cr4c3_timestamp", SortOrder.Descending
    )
);

// Load fishbone causes if RCA exists
If(
    !IsBlank(gblSelectedRCA),
    ClearCollect(
        colFishboneCauses,
        Filter(
            cr4c3_fishbonecauses,
            'cr4c3_rcasubmission_value' = gblSelectedRCA.cr4c3_rcasubmissionid
        )
    )
)
```

### Power Fx — Status Stepper Active Step (`lblStepN.Font` / highlight condition)

```powerfx
// Step is "active" when incident status >= this step's value
// Step 1 = Open (564060000), Step 2 = InvestigationPending (564060001), etc.
// Example for Step 3 (RCA Submitted):
gblSelectedIncident.cr4c3_status >= 564060002
```

### Power Fx — Edit Title (btnSaveTitle.OnSelect)

```powerfx
// Permission: Logger of this incident or Admin
If(
    gblCurrentUser.cr4c3_userprofileid = gblSelectedIncident.'cr4c3_loggedby_value'.cr4c3_userprofileid ||
    gblIsAdmin,
    Patch(
        cr4c3_incidents,
        gblSelectedIncident,
        {
            cr4c3_title:     txtEditTitle.Text,
            cr4c3_updatedat: Now()
        }
    );
    EchoAuditFlow.Run(
        gblNavIncidentId, "Incident", 4,
        "cr4c3_title",
        gblSelectedIncident.cr4c3_title,
        gblCurrentUser.cr4c3_userprofileid
    );
    Set(
        gblSelectedIncident,
        LookUp(cr4c3_incidents, cr4c3_incidentid = gblNavIncidentId)
    );
    Set(gblShowEditTitle, false)
)
```

### Power Fx — Reassign (btnSaveReassign.OnSelect)

```powerfx
If(
    gblCurrentUser.cr4c3_userprofileid = gblSelectedIncident.'cr4c3_assignee_value'.cr4c3_userprofileid ||
    gblIsAdmin,
    Patch(
        cr4c3_incidents,
        gblSelectedIncident,
        {
            'cr4c3_assignee_value': ddReassignee.Selected,
            cr4c3_updatedat:        Now()
        }
    );
    EchoAuditFlow.Run(
        gblNavIncidentId, "Incident", 8,
        "cr4c3_assignee_value",
        gblSelectedIncident.'cr4c3_assignee_value'.cr4c3_fullname,
        gblCurrentUser.cr4c3_userprofileid
    );
    EchoNotifyFlow.Run(
        ddReassignee.Selected.cr4c3_userprofileid,
        "You have been assigned to incident " & gblSelectedIncident.cr4c3_ticketreference,
        564060000   // Info
    );
    Set(gblSelectedIncident,
        LookUp(cr4c3_incidents, cr4c3_incidentid = gblNavIncidentId));
    Set(gblShowReassign, false)
)
```

### Power Fx — Cancel Incident (Admin only)

```powerfx
If(
    gblIsAdmin,
    Patch(
        cr4c3_incidents,
        gblSelectedIncident,
        {
            cr4c3_status:    564060007,    // Cancelled
            cr4c3_updatedat: Now()
        }
    );
    EchoAuditFlow.Run(
        gblNavIncidentId, "Incident", 10, "", "",
        gblCurrentUser.cr4c3_userprofileid
    );
    Set(gblSelectedIncident,
        LookUp(cr4c3_incidents, cr4c3_incidentid = gblNavIncidentId))
)
```

### Power Fx — Status Badge Color (`lblDetailStatus.Fill`)

```powerfx
Switch(
    gblSelectedIncident.cr4c3_status,
    564060000, RGBA(234, 179, 8,   1),   // Open → yellow
    564060001, RGBA(59,  130, 246, 1),   // Investigation Pending → blue
    564060002, RGBA(168, 85,  247, 1),   // RCA Submitted → purple
    564060003, RGBA(249, 115, 22,  1),   // RCA In Review → orange
    564060004, RGBA(34,  197, 94,  1),   // RCA Approved → green
    564060005, RGBA(239, 68,  68,  1),   // RCA Rejected → red
    564060006, RGBA(107, 114, 128, 1),   // PA Closed → gray
               RGBA(75,  85,  99,  1)    // Cancelled → dark gray
)
```

---

## Screen 7 — RCA Builder (`scrRCABuilder`)

### Build Prompt

> Create an RCA Builder screen for EchoLog. The screen must include:
> 1. **Header fields**: RCA Title (text input) and Effect Statement (multi-line text input).
> 2. **Fishbone grid**: Six horizontal lanes, one per category (People, Process, Technology, Material, Environment, Management). Each lane shows cause cards with a delete button and an "Add Cause" text input.
> 3. **Read-only lock**: When RCA status is Approved (564060003), or when status is Escalated (564060007) and the user is not L2 Manager, all inputs are disabled.
> 4. **Resubmission handling**: If the current RCA status is Rejected (564060004), a banner informs the user and a "Prepare Resubmission" button resets the RCA to Draft with an incremented suffix in the title.
> 5. **Submit button**: Disabled until at least one cause exists. On submit, patches RCA to Submitted, patches incident to RCASubmitted, creates audit log.

### Power Fx — scrRCABuilder.OnVisible

```powerfx
Set(
    gblSelectedIncident,
    LookUp(cr4c3_incidents, cr4c3_incidentid = gblNavIncidentId)
);
Set(
    gblSelectedRCA,
    LookUp(
        cr4c3_rcasubmissions,
        'cr4c3_incident_value' = gblNavIncidentId
    )
);

// If no RCA yet, create a Draft
If(
    IsBlank(gblSelectedRCA),
    Set(
        gblSelectedRCA,
        Patch(
            cr4c3_rcasubmissions,
            Defaults(cr4c3_rcasubmissions),
            {
                cr4c3_rcatitle:       "RCA for " & gblSelectedIncident.cr4c3_ticketreference,
                cr4c3_status:         564060000,    // Draft
                'cr4c3_incident_value': gblSelectedIncident,
                'cr4c3_submittedby_value': gblCurrentUser
            }
        )
    )
);

ClearCollect(
    colFishboneCauses,
    Filter(
        cr4c3_fishbonecauses,
        'cr4c3_rcasubmission_value' = gblSelectedRCA.cr4c3_rcasubmissionid
    )
);

// Lock state
Set(
    gblRCALocked,
    gblSelectedRCA.cr4c3_status = 564060003 ||          // Approved
    (gblSelectedRCA.cr4c3_status = 564060007 && !gblIsL2)  // Escalated, non-L2
)
```

### Power Fx — Fishbone Lane Items (example for People lane)

```powerfx
Filter(colFishboneCauses, cr4c3_category = 564060000)   // People = 564060000
// Repeat for each category code 564060001 through 564060005
```

### Power Fx — Add Cause Button (per lane)

```powerfx
// btnAddCause_People.OnSelect  (replace gblCatPeople = 564060000 per lane)
If(
    !IsBlank(txtNewCause_People.Text) && !gblRCALocked,
    Patch(
        cr4c3_fishbonecauses,
        Defaults(cr4c3_fishbonecauses),
        {
            cr4c3_causetext:             txtNewCause_People.Text,
            cr4c3_category:              564060000,    // People
            'cr4c3_rcasubmission_value':  gblSelectedRCA
        }
    );
    ClearCollect(
        colFishboneCauses,
        Filter(
            cr4c3_fishbonecauses,
            'cr4c3_rcasubmission_value' = gblSelectedRCA.cr4c3_rcasubmissionid
        )
    );
    Reset(txtNewCause_People)
)
```

### Power Fx — Delete Cause Button (in cause gallery)

```powerfx
If(
    !gblRCALocked,
    Remove(cr4c3_fishbonecauses, ThisItem);
    ClearCollect(
        colFishboneCauses,
        Filter(
            cr4c3_fishbonecauses,
            'cr4c3_rcasubmission_value' = gblSelectedRCA.cr4c3_rcasubmissionid
        )
    )
)
```

### Power Fx — Prepare Resubmission Button

```powerfx
// Visible only when RCA is Rejected
gblSelectedRCA.cr4c3_status = 564060004

// OnSelect
Patch(
    cr4c3_rcasubmissions,
    gblSelectedRCA,
    {
        cr4c3_rcatitle: gblSelectedRCA.cr4c3_rcatitle &
                        " (Resubmission " &
                        Text(gblSelectedIncident.cr4c3_rejectioncount) & ")",
        cr4c3_status:   564060000    // Reset to Draft
    }
);
Set(
    gblSelectedRCA,
    LookUp(
        cr4c3_rcasubmissions,
        cr4c3_rcasubmissionid = gblSelectedRCA.cr4c3_rcasubmissionid
    )
);
Set(gblRCALocked, false)
```

### Power Fx — Submit RCA Button

```powerfx
// DisplayMode
If(
    CountRows(colFishboneCauses) = 0 || gblRCALocked,
    DisplayMode.Disabled,
    DisplayMode.Edit
)

// OnSelect
// 1. Save title and effect statement
Patch(
    cr4c3_rcasubmissions,
    gblSelectedRCA,
    {
        cr4c3_rcatitle:       txtRCATitle.Text,
        cr4c3_effectstatement: txtEffectStatement.Text,
        cr4c3_status:         564060001,    // Submitted
        cr4c3_submittedat:    Now()
    }
);

// 2. Advance incident status to RCASubmitted
Patch(
    cr4c3_incidents,
    gblSelectedIncident,
    {
        cr4c3_status:    564060002,    // RCASubmitted
        cr4c3_updatedat: Now()
    }
);

// 3. Audit log — action 5 = Submitted
EchoAuditFlow.Run(
    gblNavIncidentId, "RCASubmission", 5, "", "",
    gblCurrentUser.cr4c3_userprofileid
);

// 4. Refresh and navigate
Set(gblSelectedIncident,
    LookUp(cr4c3_incidents, cr4c3_incidentid = gblNavIncidentId));
Navigate(scrIncidentDetail, ScreenTransition.Back)
```

---

## Screen 8 — Review Queue (`scrReviewQueue`)

### Build Prompt

> Create a Review Queue screen for EchoLog accessible to L1 Manager, L2 Manager, and Admin. The screen has three tabs:
> 1. **Review Queue** — RCAs with status UnderReview (564060002), PendingL1Review (564060005), or PendingL2Review (564060006).
> 2. **Escalated** — RCAs with status Escalated (564060007).
> 3. **Critical** — All non-Approved RCAs where the linked incident severity is Critical (564060000).
>
> Each card shows: incident ticket reference, RCA title, submitter, submitted date, and a colored urgency indicator.
> Action buttons: Approve and Reject (with mandatory comment for Reject).
> An auto-escalation Timer runs every 5 minutes to escalate RCAs that have breached the L1 review window or accumulated ≥ 2 rejections.

### Power Fx — Role Guard (scrReviewQueue.Visible)

```powerfx
gblIsAdmin || gblIsL1 || gblIsL2
```

### Power Fx — Tab Gallery Items

```powerfx
// Review Queue tab
Filter(
    cr4c3_rcasubmissions,
    cr4c3_status In [564060002, 564060005, 564060006]
)

// Escalated tab
Filter(cr4c3_rcasubmissions, cr4c3_status = 564060007)

// Critical tab
Filter(
    cr4c3_rcasubmissions,
    cr4c3_status <> 564060003 &&   // not Approved
    'cr4c3_incident_value'.cr4c3_severity = 564060000   // Critical
)
```

### Power Fx — Approve Button (btnApprove.OnSelect)

```powerfx
// Determine correct next status based on reviewer role and current RCA status
Set(
    gblApproveNextStatus,
    If(
        gblIsL2 || gblIsAdmin, 564060003,   // L2/Admin → Approved directly
        564060003                             // L1 → Approved (adjust if L2 step needed)
    )
);

Patch(
    cr4c3_rcasubmissions,
    gblReviewRCA,
    {
        cr4c3_status:          gblApproveNextStatus,
        cr4c3_reviewcomments:  txtReviewComment.Text,
        cr4c3_reviewedat:      Now(),
        'cr4c3_reviewer_value': gblCurrentUser
    }
);

Patch(
    cr4c3_incidents,
    gblReviewIncident,
    {
        cr4c3_status:    564060004,    // RCAApproved
        cr4c3_updatedat: Now()
    }
);

EchoAuditFlow.Run(
    gblReviewIncident.cr4c3_incidentid, "RCASubmission", 2,
    "cr4c3_status", Text(gblReviewRCA.cr4c3_status),
    gblCurrentUser.cr4c3_userprofileid
);

EchoNotifyFlow.Run(
    gblReviewRCA.'cr4c3_submittedby_value'.cr4c3_userprofileid,
    "Your RCA for " & gblReviewIncident.cr4c3_ticketreference & " has been approved.",
    564060002    // Success
);

Reset(txtReviewComment);
Set(gblShowReviewPanel, false)
```

### Power Fx — Reject Button (btnReject.OnSelect)

```powerfx
If(
    IsBlank(txtReviewComment.Text),
    Notify("A rejection comment is required", NotificationType.Error),

    Patch(
        cr4c3_rcasubmissions,
        gblReviewRCA,
        {
            cr4c3_status:          564060004,    // Rejected
            cr4c3_reviewcomments:  txtReviewComment.Text,
            cr4c3_reviewedat:      Now(),
            'cr4c3_reviewer_value': gblCurrentUser
        }
    );

    Patch(
        cr4c3_incidents,
        gblReviewIncident,
        {
            cr4c3_status:          564060005,    // RCARejected
            cr4c3_rejectioncount:  gblReviewIncident.cr4c3_rejectioncount + 1,
            cr4c3_updatedat:       Now()
        }
    );

    EchoAuditFlow.Run(
        gblReviewIncident.cr4c3_incidentid, "RCASubmission", 3,
        "cr4c3_status", Text(gblReviewRCA.cr4c3_status),
        gblCurrentUser.cr4c3_userprofileid
    );

    EchoNotifyFlow.Run(
        gblReviewRCA.'cr4c3_submittedby_value'.cr4c3_userprofileid,
        "Your RCA for " & gblReviewIncident.cr4c3_ticketreference & " has been rejected. Comments: " & txtReviewComment.Text,
        564060003    // Error
    );

    Reset(txtReviewComment);
    Set(gblShowReviewPanel, false)
)
```

### Power Fx — Escalation Timer (tmrEscalation.OnTimerEnd)

```powerfx
// Duration: 300000 (5 minutes). Repeat: true.
ForAll(
    Filter(
        cr4c3_rcasubmissions,
        cr4c3_status In [564060005, 564060006] &&   // PendingL1 or PendingL2
        cr4c3_status <> 564060003                   // not Approved
    ),
    With(
        {
            incRecord: LookUp(
                cr4c3_incidents,
                cr4c3_incidentid = ThisRecord.'cr4c3_incident_value'.cr4c3_incidentid
            ),
            slaRecord: LookUp(
                colSlaRules,
                cr4c3_severity = ThisRecord.'cr4c3_incident_value'.cr4c3_severity
            )
        },
        With(
            {
                l1WindowHours: RoundDown(
                    slaRecord.cr4c3_tathours * slaRecord.cr4c3_l1reviewpercent / 100,
                    0
                ),
                l1Deadline: DateAdd(
                    incRecord.cr4c3_createdat,
                    RoundDown(
                        slaRecord.cr4c3_tathours * slaRecord.cr4c3_l1reviewpercent / 100, 0
                    ),
                    TimeUnit.Hours
                )
            },
            If(
                Now() > l1Deadline,
                // Trigger 1: L1 window expired
                Patch(
                    cr4c3_rcasubmissions,
                    ThisRecord,
                    { cr4c3_status: 564060007 }   // Escalated
                );
                EchoAuditFlow.Run(
                    incRecord.cr4c3_incidentid, "RCASubmission", 6, "", "",
                    gblCurrentUser.cr4c3_userprofileid
                );
                EchoNotifyL2Flow.Run(incRecord.cr4c3_incidentid)
            )
        )
    )
);

// Trigger 2: Rejection count >= 2
ForAll(
    Filter(
        cr4c3_incidents,
        cr4c3_rejectioncount >= 2 &&
        cr4c3_status <> 564060006 &&
        cr4c3_status <> 564060007
    ),
    With(
        {
            pendingRCA: LookUp(
                cr4c3_rcasubmissions,
                'cr4c3_incident_value' = ThisRecord.cr4c3_incidentid &&
                cr4c3_status <> 564060003 &&
                cr4c3_status <> 564060007
            )
        },
        If(
            !IsBlank(pendingRCA),
            Patch(
                cr4c3_rcasubmissions,
                pendingRCA,
                { cr4c3_status: 564060007 }   // Escalated
            );
            EchoNotifyL2Flow.Run(ThisRecord.cr4c3_incidentid)
        )
    )
)
```

---

## Screen 9 — Preventive Actions List (`scrPAList`)

### Build Prompt

> Create a Preventive Actions List screen for EchoLog with:
> 1. **Stats pills** at the top: To Do count, In Progress count, Done count.
> 2. **Search bar** filtering by PA title.
> 3. **Incident filter** dropdown.
> 4. **Board / List toggle** — Board shows three columns by status; List shows a single gallery.
> 5. **Multi-select** — checkboxes per row, bulk "Mark In Progress" button.
> 6. **Overdue highlight** — red text/border when past due and not completed.

### Power Fx — scrPAList.OnVisible

```powerfx
ClearCollect(colAllPAs,
    SortByColumns(cr4c3_preventiveactions, "cr4c3_createdat", SortOrder.Descending));
Set(gblPANotStarted, CountIf(colAllPAs, cr4c3_status = 564060000));
Set(gblPAInProgress, CountIf(colAllPAs, cr4c3_status = 564060001));
Set(gblPACompleted,  CountIf(colAllPAs, cr4c3_status = 564060002));
ClearCollect(colSelectedPAs, [])
```

### Power Fx — Gallery Items

```powerfx
Filter(
    colAllPAs,
    (txtPASearch.Text = "" ||
        StartsWith(cr4c3_title, txtPASearch.Text)) &&
    (ddPAIncFilter.Selected.Value = "All" ||
        'cr4c3_incident_value' = ddPAIncFilter.Selected.Value)
)
```

### Power Fx — Overdue Badge Visible (`lblPAOverdue.Visible`)

```powerfx
ThisItem.cr4c3_duedate < Now() &&
ThisItem.cr4c3_status <> 564060002    // not Completed
```

### Power Fx — Multi-select Toggle (chkSelectPA.OnCheck)

```powerfx
Collect(colSelectedPAs, ThisItem)

// OnUncheck
Remove(colSelectedPAs, ThisItem)
```

### Power Fx — Bulk Mark In Progress (btnBulkInProgress.OnSelect)

```powerfx
If(
    CountRows(colSelectedPAs) = 0,
    Notify("Select at least one PA", NotificationType.Warning),
    ForAll(
        colSelectedPAs,
        Patch(
            cr4c3_preventiveactions,
            ThisRecord,
            { cr4c3_status: 564060001, cr4c3_updatedat: Now() }   // InProgress
        )
    );
    ClearCollect(colSelectedPAs, []);
    ClearCollect(colAllPAs,
        SortByColumns(cr4c3_preventiveactions, "cr4c3_createdat", SortOrder.Descending));
    Set(gblPAInProgress, CountIf(colAllPAs, cr4c3_status = 564060001));
    Notify("Updated to In Progress", NotificationType.Success)
)
```

---

## Screen 10 — Create PA (`scrCreatePA`)

### Build Prompt

> Create a "New Preventive Action" screen for EchoLog with:
> - Title and description inputs.
> - Linked incident dropdown (optional — PA can be standalone).
> - PA Owner dropdown filtered to users with role PAOwner (564060004) or Assignee (564060001).
> - Due date picker — must be a future date.
> - Submit creates the PA with status NotStarted and navigates back.

### Power Fx — ddPAOwner.Items

```powerfx
Filter(
    cr4c3_userprofiles,
    cr4c3_role In [564060001, 564060004]    // Assignee or PAOwner
)
```

### Power Fx — btnCreatePA.OnSelect

```powerfx
If(
    IsBlank(txtPATitle.Text),
    Notify("Title is required", NotificationType.Error),

    dtpPADueDate.SelectedDate <= Today(),
    Notify("Due date must be in the future", NotificationType.Error),

    // Create PA
    Set(
        gblNewPA,
        Patch(
            cr4c3_preventiveactions,
            Defaults(cr4c3_preventiveactions),
            {
                cr4c3_title:           txtPATitle.Text,
                cr4c3_description:     txtPADesc.Text,
                cr4c3_status:          564060000,    // NotStarted
                cr4c3_duedate:         dtpPADueDate.SelectedDate,
                cr4c3_createdat:       Now(),
                'cr4c3_incident_value': If(
                    IsBlank(ddLinkedIncident.Selected.cr4c3_incidentid),
                    Blank(),
                    ddLinkedIncident.Selected
                ),
                'cr4c3_paowner_value':  ddPAOwner.Selected,
                'cr4c3_createdby_value': gblCurrentUser
            }
        )
    );

    EchoAuditFlow.Run(
        gblNewPA.cr4c3_preventiveactionid, "PreventiveAction", 1, "", "",
        gblCurrentUser.cr4c3_userprofileid
    );

    EchoNotifyFlow.Run(
        ddPAOwner.Selected.cr4c3_userprofileid,
        "A new preventive action has been assigned to you: " & txtPATitle.Text,
        564060000    // Info
    );

    Navigate(scrPAList, ScreenTransition.Back)
)
```

---

## Screen 11 — PA Detail (`scrPADetail`)

### Build Prompt

> Create a PA Detail screen for EchoLog. The screen must:
> 1. Show and allow editing of PA title, description, status, due date, and PA owner (Assignee or Admin only).
> 2. Provide a "Mark Complete" button that sets status to Completed and records `cr4c3_completedat`.
> 3. Show an evidence list gallery (file name, type label, upload location, uploaded date) with an "Add Evidence" form (file name, type, URL, location).
> 4. Show a PA-specific audit trail timeline.

### Power Fx — scrPADetail.OnVisible

```powerfx
Set(
    gblSelectedPA,
    LookUp(cr4c3_preventiveactions, cr4c3_preventiveactionid = gblNavPAId)
);

ClearCollect(
    colPAEvidences,
    Filter(cr4c3_paevidences,
        'cr4c3_preventiveaction_value' = gblNavPAId)
);

ClearCollect(
    colPAAudit,
    SortByColumns(
        Filter(cr4c3_auditlogs, cr4c3_entityid = gblNavPAId),
        "cr4c3_timestamp", SortOrder.Descending
    )
)
```

### Power Fx — Mark Complete (btnMarkComplete.OnSelect)

```powerfx
Patch(
    cr4c3_preventiveactions,
    gblSelectedPA,
    {
        cr4c3_status:      564060002,    // Completed
        cr4c3_completedat: Now(),
        cr4c3_updatedat:   Now()
    }
);
EchoAuditFlow.Run(
    gblNavPAId, "PreventiveAction", 7, "cr4c3_status",
    "InProgress", gblCurrentUser.cr4c3_userprofileid
);
Set(
    gblSelectedPA,
    LookUp(cr4c3_preventiveactions, cr4c3_preventiveactionid = gblNavPAId)
)
```

### Power Fx — Mark Complete Visible

```powerfx
gblSelectedPA.cr4c3_status <> 564060002 &&    // not already Completed
(
    gblCurrentUser.cr4c3_userprofileid = gblSelectedPA.'cr4c3_paowner_value'.cr4c3_userprofileid ||
    gblIsAdmin
)
```

### Power Fx — Add Evidence (btnAddEvidence.OnSelect)

```powerfx
If(
    IsBlank(txtEvidenceFileName.Text) || IsBlank(txtEvidenceURL.Text),
    Notify("File name and URL are required", NotificationType.Error),

    Patch(
        cr4c3_paevidences,
        Defaults(cr4c3_paevidences),
        {
            cr4c3_filename:                  txtEvidenceFileName.Text,
            cr4c3_filetype:                  gblSelectedFileType,          // 564060000–564060004
            cr4c3_fileurl:                   txtEvidenceURL.Text,
            cr4c3_uploadlocation:            gblSelectedUploadLocation,    // 564060000–564060002
            cr4c3_uploadedat:                Now(),
            'cr4c3_preventiveaction_value':   gblSelectedPA,
            'cr4c3_uploadedby_value':         gblCurrentUser
        }
    );

    ClearCollect(
        colPAEvidences,
        Filter(cr4c3_paevidences, 'cr4c3_preventiveaction_value' = gblNavPAId)
    );

    Reset(txtEvidenceFileName);
    Reset(txtEvidenceURL)
)
```

### Power Fx — Evidence File Type Label (`lblFileType.Text`)

```powerfx
Switch(
    ThisItem.cr4c3_filetype,
    564060000, "PDF",
    564060001, "Word",
    564060002, "Excel",
    564060003, "Image",
    "Other"
)
```

### Power Fx — Evidence Upload Location Label (`lblUploadLocation.Text`)

```powerfx
Switch(
    ThisItem.cr4c3_uploadlocation,
    564060000, "OneDrive",
    564060001, "SharePoint",
    "Other"
)
```

---

## Screen 12 — Notifications (`scrNotifications`)

### Build Prompt

> Create a Notifications screen for EchoLog. The screen must:
> 1. Show all notifications for the current user created within the last 30 days.
> 2. Provide a read/unread toggle filter and a notification type filter dropdown.
> 3. Show an unread count badge in the screen header.
> 4. Support "Mark All Read" button.
> 5. Auto-refresh every 30 seconds via a Timer control.
> 6. Each row: type badge, message, timestamp, read indicator.

### Power Fx — scrNotifications.OnVisible

```powerfx
ClearCollect(
    colNotifications,
    SortByColumns(
        Filter(
            cr4c3_notifications,
            'cr4c3_user_value' = gblCurrentUser.cr4c3_userprofileid &&
            DateDiff(cr4c3_createdat, Now(), TimeUnit.Days) <= 30
        ),
        "cr4c3_createdat", SortOrder.Descending
    )
);
Set(gblUnreadCount, CountIf(colNotifications, cr4c3_isread = false))
```

### Power Fx — Gallery Items

```powerfx
Filter(
    colNotifications,
    (!tglUnreadOnly.Value || cr4c3_isread = false) &&
    (ddNotifType.Selected.Value = "All" ||
        cr4c3_type = Value(ddNotifType.Selected.Value))
)
```

### Power Fx — Mark Single Read (row OnSelect)

```powerfx
If(
    !ThisItem.cr4c3_isread,
    Patch(cr4c3_notifications, ThisItem, { cr4c3_isread: true });
    Set(gblUnreadCount, gblUnreadCount - 1)
)
```

### Power Fx — Mark All Read (btnMarkAllRead.OnSelect)

```powerfx
ForAll(
    Filter(colNotifications, cr4c3_isread = false),
    Patch(cr4c3_notifications, ThisRecord, { cr4c3_isread: true })
);
ClearCollect(
    colNotifications,
    SortByColumns(
        Filter(
            cr4c3_notifications,
            'cr4c3_user_value' = gblCurrentUser.cr4c3_userprofileid &&
            DateDiff(cr4c3_createdat, Now(), TimeUnit.Days) <= 30
        ),
        "cr4c3_createdat", SortOrder.Descending
    )
);
Set(gblUnreadCount, 0)
```

### Power Fx — 30-Second Refresh Timer (tmrNotifRefresh.OnTimerEnd)

```powerfx
// Duration: 30000ms, Repeat: true
ClearCollect(
    colNotifications,
    SortByColumns(
        Filter(
            cr4c3_notifications,
            'cr4c3_user_value' = gblCurrentUser.cr4c3_userprofileid &&
            DateDiff(cr4c3_createdat, Now(), TimeUnit.Days) <= 30
        ),
        "cr4c3_createdat", SortOrder.Descending
    )
);
Set(gblUnreadCount, CountIf(colNotifications, cr4c3_isread = false))
```

### Power Fx — Type Badge Color (`lblNotifType.Fill`)

```powerfx
Switch(
    ThisItem.cr4c3_type,
    564060000, RGBA(59,  130, 246, 1),   // Info → blue
    564060001, RGBA(234, 179, 8,   1),   // Warning → yellow
    564060002, RGBA(34,  197, 94,  1),   // Success → green
               RGBA(239, 68,  68,  1)    // Error → red
)
```

---

## Screen 13 — Audit Trail (`scrAuditTrail`)

### Build Prompt

> Create an Audit Trail screen for EchoLog. The screen must:
> 1. Show all audit log entries in a timeline gallery sorted by timestamp descending.
> 2. Provide search by description or entity type, filter by entity type and action, and date range pickers.
> 3. Show an integrity warning icon for any row where the stored checksum does not match the re-computed hash (via `EchoVerifyChecksumFlow`).
> 4. This screen is read-only — no writes are permitted.
> 5. Admin-only access.

### Power Fx — Role Guard

```powerfx
gblIsAdmin
```

### Power Fx — scrAuditTrail.OnVisible

```powerfx
ClearCollect(
    colAuditLogs,
    SortByColumns(cr4c3_auditlogs, "cr4c3_timestamp", SortOrder.Descending)
)
```

### Power Fx — Gallery Items

```powerfx
Filter(
    colAuditLogs,
    // Search
    (txtAuditSearch.Text = "" ||
        StartsWith(cr4c3_description, txtAuditSearch.Text) ||
        StartsWith(cr4c3_entitytype,  txtAuditSearch.Text)) &&
    // Entity type filter
    (ddEntityTypeFilter.Selected.Value = "All" ||
        cr4c3_entitytype = ddEntityTypeFilter.Selected.Value) &&
    // Action filter
    (ddAuditActionFilter.Selected.Value = "All" ||
        cr4c3_action = Value(ddAuditActionFilter.Selected.Value)) &&
    // Date range
    (IsBlank(dtpAuditFrom.SelectedDate) ||
        DateValue(Text(cr4c3_timestamp)) >= dtpAuditFrom.SelectedDate) &&
    (IsBlank(dtpAuditTo.SelectedDate) ||
        DateValue(Text(cr4c3_timestamp)) <= dtpAuditTo.SelectedDate)
)
```

### Power Fx — Action Label (`lblAuditAction.Text`)

```powerfx
Switch(
    ThisItem.cr4c3_action,
    1,  "Created",
    2,  "Approved",
    3,  "Rejected",
    4,  "Updated",
    5,  "Submitted",
    6,  "Escalated",
    7,  "Closed",
    8,  "Assigned",
    9,  "Reopened",
    10, "Cancelled",
    "Unknown"
)
```

### Power Fx — Action Badge Color (`lblAuditAction.Fill`)

```powerfx
Switch(
    ThisItem.cr4c3_action,
    1,  RGBA(59,  130, 246, 1),   // Created → blue
    2,  RGBA(34,  197, 94,  1),   // Approved → green
    3,  RGBA(239, 68,  68,  1),   // Rejected → red
    4,  RGBA(168, 85,  247, 1),   // Updated → purple
    5,  RGBA(249, 115, 22,  1),   // Submitted → orange
    6,  RGBA(234, 179, 8,   1),   // Escalated → yellow
    7,  RGBA(107, 114, 128, 1),   // Closed → gray
    8,  RGBA(14,  165, 233, 1),   // Assigned → sky blue
        RGBA(75,  85,  99,  1)    // default
)
```

### Power Fx — Checksum Warning Icon Visible

```powerfx
// icnTamper.Visible — per gallery row
// Note: calling a flow per row is expensive on large datasets.
// Recommended: batch verify via a scheduled flow and store a boolean flag on the row.
// For an on-demand check on a selected row:
gblSelectedAuditRow.cr4c3_checksum <>
    EchoVerifyChecksumFlow.Run(gblSelectedAuditRow.cr4c3_auditlogid).hashresult
```

---

## Screen 14 — Admin: SLA Rules (`scrAdminSLA`)

### Build Prompt

> Create an Admin-only SLA Rules management screen for EchoLog. The screen must:
> 1. Show a gallery of all SLA rules with columns: Rule Name, Severity, TAT Hours, L1 Review %, L1 Window (computed), Active status, Edit/Delete actions.
> 2. An "Add Rule" button opens a dialog with inputs for rule name, severity, TAT hours, L1 review %, and active toggle.
> 3. Editing a row pre-populates the dialog.
> 4. Deleting a rule requires confirmation.
> 5. After any change, reload `colSlaRules` (used app-wide).

### Power Fx — L1 Window Preview (`lblL1Window.Text`)

```powerfx
"L1 window: " & Text(
    RoundDown(
        ThisItem.cr4c3_tathours * ThisItem.cr4c3_l1reviewpercent / 100,
        1
    ),
    "[$-en-US]0.0"
) & "h"
```

### Power Fx — Save SLA Rule (btnSaveSLA.OnSelect — handles both create and edit)

```powerfx
If(
    IsBlank(txtSLAName.Text) ||
    IsBlank(txtTATHours.Text) ||
    IsBlank(txtL1Pct.Text),
    Notify("All fields are required", NotificationType.Error),

    If(
        IsBlank(gblEditSLARule),
        // Create new rule
        Patch(
            cr4c3_slarules,
            Defaults(cr4c3_slarules),
            {
                cr4c3_slaname:         txtSLAName.Text,
                cr4c3_severity:        gblSLASeverityCode,
                cr4c3_tathours:        Value(txtTATHours.Text),
                cr4c3_l1reviewpercent: Value(txtL1Pct.Text),
                cr4c3_isactive:        tglSLAActive.Value
            }
        ),
        // Edit existing rule
        Patch(
            cr4c3_slarules,
            gblEditSLARule,
            {
                cr4c3_slaname:         txtSLAName.Text,
                cr4c3_severity:        gblSLASeverityCode,
                cr4c3_tathours:        Value(txtTATHours.Text),
                cr4c3_l1reviewpercent: Value(txtL1Pct.Text),
                cr4c3_isactive:        tglSLAActive.Value
            }
        )
    );

    // Reload global SLA collection
    ClearCollect(colSlaRules, Filter(cr4c3_slarules, cr4c3_isactive = true));
    Set(gblEditSLARule, Blank());
    Set(gblShowSLADialog, false)
)
```

### Power Fx — Toggle Active (tglRowActive.OnChange — inline in gallery)

```powerfx
Patch(
    cr4c3_slarules,
    ThisItem,
    { cr4c3_isactive: tglRowActive.Value }
);
ClearCollect(colSlaRules, Filter(cr4c3_slarules, cr4c3_isactive = true))
```

### Power Fx — Delete SLA Rule (after confirmation)

```powerfx
Remove(cr4c3_slarules, gblDeleteSLARule);
ClearCollect(colSlaRules, Filter(cr4c3_slarules, cr4c3_isactive = true));
Set(gblShowDeleteSLAConfirm, false);
Notify("SLA Rule deleted", NotificationType.Success)
```

---

## Screen 15 — Admin: Hierarchy (`scrAdminHierarchy`)

### Build Prompt

> Create an Admin-only Hierarchy management screen for EchoLog with four tabs: Departments, Subdepartments, Processes, Teams.
>
> Each tab shows a gallery of that entity with Name, Description (or parent name), and Edit/Delete action buttons.
> An "Add" button opens a dialog. For Subdepartments, the dialog has a parent Department dropdown. For Processes, parent Subdepartment dropdown and L1 Manager dropdown. For Teams, parent Process dropdown and Shift selector.

### Power Fx — Create Department

```powerfx
Patch(
    cr4c3_departments,
    Defaults(cr4c3_departments),
    {
        cr4c3_name:        txtDeptName.Text,
        cr4c3_description: txtDeptDesc.Text
    }
);
ClearCollect(colDepartments, cr4c3_departments);
Set(gblShowDeptDialog, false);
Reset(txtDeptName); Reset(txtDeptDesc)
```

### Power Fx — Create Subdepartment

```powerfx
// ddParentDept.Items = colDepartments

Patch(
    cr4c3_subdepartments,
    Defaults(cr4c3_subdepartments),
    {
        cr4c3_name:              txtSubdeptName.Text,
        cr4c3_description:       txtSubdeptDesc.Text,
        'cr4c3_department_value': ddParentDept.Selected
    }
);
ClearCollect(colSubdepts, cr4c3_subdepartments);
Set(gblShowSubdeptDialog, false)
```

### Power Fx — Create Process

```powerfx
// ddParentSubdept.Items = Filter(colSubdepts, 'cr4c3_department_value' = ddProcessParentDept.Selected.cr4c3_departmentid)

Patch(
    cr4c3_processes,
    Defaults(cr4c3_processes),
    {
        cr4c3_name:                  txtProcessName.Text,
        cr4c3_description:           txtProcessDesc.Text,
        'cr4c3_subdepartment_value':  ddParentSubdept.Selected,
        'cr4c3_l1manager_value':      ddProcessL1Manager.Selected
    }
);
ClearCollect(colProcesses, cr4c3_processes);
Set(gblShowProcessDialog, false)
```

### Power Fx — Create Team

```powerfx
// ddParentProcess.Items = Filter(colProcesses, 'cr4c3_subdepartment_value' = ddTeamParentSubdept.Selected.cr4c3_subdepartmentid)

Patch(
    cr4c3_teams,
    Defaults(cr4c3_teams),
    {
        cr4c3_name:            txtTeamName.Text,
        cr4c3_shift:           gblSelectedShift,     // 564060000 / 564060001 / 564060002
        'cr4c3_process_value':  ddParentProcess.Selected
    }
);
ClearCollect(colTeams, cr4c3_teams);
Set(gblShowTeamDialog, false)
```

### Power Fx — Shift Label (in gallery)

```powerfx
Switch(
    ThisItem.cr4c3_shift,
    564060000, "Morning",
    564060001, "Evening",
    "Night"
)
```

### Power Fx — Delete with Confirm

```powerfx
// Generic pattern used for all four entity types
Remove(cr4c3_departments, gblDeleteDept);      // swap table per tab
ClearCollect(colDepartments, cr4c3_departments);
Set(gblShowDeleteDeptConfirm, false);
Notify("Deleted successfully", NotificationType.Success)
```

---

## Screen 16 — Admin: Users & Delegations (`scrAdminUsers`)

### Build Prompt

> Create an Admin-only Users & Delegations screen for EchoLog with two tabs: **Users** and **Delegations**.
>
> **Users tab**: Gallery of all user profiles with Name, Email, Role badge, Department, and Edit/Delete buttons. Add/Edit dialog with all profile fields including cascading org dropdowns (same as Log Incident screen) and role dropdown. Password is hashed via `EchoHashFlow` on create.
>
> **Delegations tab**: Gallery of all delegations with Delegator, Delegate, Start Date, End Date, Status (Active / Expired), Notes, and a Revoke button. Add Delegation dialog with user dropdowns and date pickers.

### Power Fx — Role Label (`lblUserRole.Text`)

```powerfx
Switch(
    ThisItem.cr4c3_role,
    564060000, "Logger",
    564060001, "Assignee",
    564060002, "L1 Manager",
    564060003, "L2 Manager",
    564060004, "PA Owner",
    564060005, "Admin",
    "Member"
)
```

### Power Fx — Role Badge Color (`lblUserRole.Fill`)

```powerfx
Switch(
    ThisItem.cr4c3_role,
    564060000, RGBA(107, 114, 128, 1),   // Logger → gray
    564060001, RGBA(59,  130, 246, 1),   // Assignee → blue
    564060002, RGBA(34,  197, 94,  1),   // L1Manager → green
    564060003, RGBA(168, 85,  247, 1),   // L2Manager → purple
    564060004, RGBA(249, 115, 22,  1),   // PAOwner → orange
    564060005, RGBA(239, 68,  68,  1),   // Admin → red
               RGBA(75,  85,  99,  1)    // Member → dark gray
)
```

### Power Fx — Create User (btnSaveUser.OnSelect)

```powerfx
If(
    IsBlank(txtUserFullName.Text) ||
    IsBlank(txtUserEmail.Text)    ||
    IsBlank(txtUserPassword.Text),
    Notify("Name, email, and password are required", NotificationType.Error),

    // Hash password — never store plain text
    Set(gblNewUserHash, EchoHashFlow.Run(txtUserPassword.Text).hashresult);

    If(
        IsBlank(gblEditUser),
        // Create
        Patch(
            cr4c3_userprofiles,
            Defaults(cr4c3_userprofiles),
            {
                cr4c3_fullname:              txtUserFullName.Text,
                cr4c3_email:                 Lower(txtUserEmail.Text),
                cr4c3_password:              gblNewUserHash,
                cr4c3_role:                  gblSelectedUserRole,
                'cr4c3_department_value':     ddUserDept.Selected,
                'cr4c3_subdepartment_value':  ddUserSubdept.Selected,
                'cr4c3_process_value':        ddUserProcess.Selected,
                'cr4c3_team_value':           ddUserTeam.Selected,
                'cr4c3_manager_value':        ddUserManager.Selected,
                'cr4c3_l2manager_value':      ddUserL2Manager.Selected
            }
        ),
        // Edit — only update password if a new one was typed
        Patch(
            cr4c3_userprofiles,
            gblEditUser,
            {
                cr4c3_fullname:              txtUserFullName.Text,
                cr4c3_email:                 Lower(txtUserEmail.Text),
                cr4c3_password:              If(
                    IsBlank(txtUserPassword.Text),
                    gblEditUser.cr4c3_password,
                    gblNewUserHash
                ),
                cr4c3_role:                  gblSelectedUserRole,
                'cr4c3_department_value':     ddUserDept.Selected,
                'cr4c3_subdepartment_value':  ddUserSubdept.Selected,
                'cr4c3_process_value':        ddUserProcess.Selected,
                'cr4c3_team_value':           ddUserTeam.Selected,
                'cr4c3_manager_value':        ddUserManager.Selected,
                'cr4c3_l2manager_value':      ddUserL2Manager.Selected
            }
        )
    );

    Set(gblEditUser, Blank());
    Set(gblShowUserDialog, false);
    ClearCollect(colAllUsers, cr4c3_userprofiles)
)
```

### Power Fx — Delegation Gallery Items

```powerfx
SortByColumns(cr4c3_delegations, "cr4c3_startdate", SortOrder.Descending)
```

### Power Fx — Delegation Status Label (`lblDelegStatus.Text`)

```powerfx
If(
    ThisItem.cr4c3_startdate <= Today() && ThisItem.cr4c3_enddate >= Today(),
    "Active",
    If(ThisItem.cr4c3_enddate < Today(), "Expired", "Upcoming")
)
```

### Power Fx — Create Delegation (btnSaveDelegation.OnSelect)

```powerfx
If(
    IsBlank(ddDelegator.Selected) ||
    IsBlank(ddDelegate.Selected)  ||
    IsBlank(dtpDelegStart.SelectedDate) ||
    IsBlank(dtpDelegEnd.SelectedDate),
    Notify("All delegation fields are required", NotificationType.Error),

    dtpDelegEnd.SelectedDate < dtpDelegStart.SelectedDate,
    Notify("End date must be on or after start date", NotificationType.Error),

    Patch(
        cr4c3_delegations,
        Defaults(cr4c3_delegations),
        {
            cr4c3_startdate:         dtpDelegStart.SelectedDate,
            cr4c3_enddate:           dtpDelegEnd.SelectedDate,
            cr4c3_note:              txtDelegNote.Text,
            'cr4c3_delegator_value':  ddDelegator.Selected,
            'cr4c3_delegate_value':   ddDelegate.Selected
        }
    );
    Set(gblShowDelegDialog, false);
    Notify("Delegation created", NotificationType.Success)
)
```

### Power Fx — Revoke Delegation (btnRevoke.OnSelect — after confirmation)

```powerfx
Remove(cr4c3_delegations, gblDeleteDelegation);
Set(gblShowRevokeDelegConfirm, false);
Notify("Delegation revoked", NotificationType.Success)
```

---

## Appendix A — Global Variable Reference

| Variable | Type | Purpose |
|---|---|---|
| `gblCurrentUser` | Record | Signed-in user profile row |
| `gblIsAdmin` | Boolean | User role = Admin (564060005) |
| `gblIsL1` | Boolean | User role = L1Manager (564060002) |
| `gblIsL2` | Boolean | User role = L2Manager (564060003) |
| `gblIsLogger` | Boolean | User role = Logger (564060000) |
| `gblIsAssignee` | Boolean | User role = Assignee (564060001) |
| `gblIsPAOwner` | Boolean | User role = PAOwner (564060004) |
| `gblNavIncidentId` | Text | Incident ID passed between screens |
| `gblNavPAId` | Text | PA ID passed between screens |
| `gblSelectedIncident` | Record | Currently viewed incident |
| `gblSelectedRCA` | Record | Currently viewed RCA |
| `gblSelectedPA` | Record | Currently viewed PA |
| `gblSelectedSeverity` | Number | Severity code for forms |
| `gblUnreadCount` | Number | Unread notifications count |
| `gblRCALocked` | Boolean | RCA is read-only (Approved or Escalated) |
| `gblLoginError` | Text | Login validation message |

## Appendix B — Named Collection Reference

| Collection | Contents |
|---|---|
| `colDepartments` | All cr4c3_departments rows (preloaded OnStart) |
| `colSubdepts` | All cr4c3_subdepartments rows (preloaded OnStart) |
| `colProcesses` | All cr4c3_processes rows (preloaded OnStart) |
| `colTeams` | All cr4c3_teams rows (preloaded OnStart) |
| `colSlaRules` | Active cr4c3_slarules rows (preloaded OnStart) |
| `colMyIncidents` | Role-scoped incidents for Incidents List screen |
| `colActiveIncidents` | Non-terminal incidents for Dashboard |
| `colRecentIncidents` | Last 10 incidents for Dashboard gallery |
| `colAllPAs` | All preventive actions for PA List screen |
| `colSelectedPAs` | Multi-select PA rows for bulk operations |
| `colFishboneCauses` | Causes for current RCA in RCA Builder |
| `colIncidentPAs` | PAs linked to current incident in Detail screen |
| `colIncidentAudit` | Audit logs for current incident |
| `colPAEvidences` | Evidence rows for current PA |
| `colPAAudit` | Audit logs for current PA |
| `colNotifications` | Notifications for current user (last 30 days) |
| `colAuditLogs` | All audit log rows for Audit Trail screen |
| `colAllUsers` | All user profiles for Admin Users screen |

## Appendix C — Power Automate Flow Specifications

### EchoHashFlow
- **Trigger**: HTTP request from Canvas App
- **Input**: `{ "plaintext": "string" }`
- **Action**: Compose SHA-256 hash using `base64(sha256(inputs('plaintext')))`
- **Output**: `{ "hashresult": "string" }`

### EchoAuditFlow
- **Trigger**: HTTP request from Canvas App
- **Inputs**: `entityId`, `entityType`, `action` (number), `fieldChanged`, `oldValue`, `actorId`
- **Actions**: Compute checksum from concatenated inputs, create `cr4c3_auditlogs` row
- **Output**: `{ "auditlogid": "string" }`

### EchoNotifyFlow
- **Trigger**: HTTP request from Canvas App
- **Inputs**: `recipientUserId`, `message`, `notificationType`
- **Action**: Create `cr4c3_notifications` row for the recipient
- **Output**: `{ "notificationid": "string" }`

### EchoNotifyL2Flow
- **Trigger**: HTTP request from Canvas App
- **Input**: `incidentId`
- **Actions**: Fetch all users with role L2Manager (564060003), create a notification row for each
- **Output**: `{ "count": number }`

### EchoVerifyChecksumFlow
- **Trigger**: HTTP request from Canvas App
- **Input**: `auditlogid`
- **Actions**: Fetch audit log row, recompute checksum from its fields
- **Output**: `{ "hashresult": "string" }`

### EchoTicketRefFlow
- **Trigger**: HTTP request from Canvas App
- **Actions**: Read and increment counter from a `cr4c3_counters` helper table, format as `ECHO-YYYY-NNNN`
- **Output**: `{ "ticketref": "string" }`
