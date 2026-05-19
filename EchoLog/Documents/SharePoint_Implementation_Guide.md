# EchoLog SharePoint Implementation Guide (UI Steps)

This guide is the execution companion for the model spec in [Documents/SharePoint_Data_Model.md](Documents/SharePoint_Data_Model.md).

Goal: create SharePoint lists and columns that match EchoLog data contracts used by the app.

## 1. Prerequisites

1. You are Site Owner (or have permission to create lists/columns/lookups).
2. You have a dedicated SharePoint site for EchoLog.
3. You will create lists in this order to satisfy lookup dependencies.

List creation order:

1. cr4c3_departments
2. cr4c3_subdepartments
3. cr4c3_processes
4. cr4c3_teams
5. cr4c3_userprofiles
6. cr4c3_slarules
7. cr4c3_incidents
8. cr4c3_rcasubmissions
9. cr4c3_fishbonecauses
10. cr4c3_preventiveactions
11. cr4c3_paevidences
12. cr4c3_notifications
13. cr4c3_auditlogs
14. cr4c3_delegations

## 2. Reusable setup pattern

Use this pattern for each list:

1. Site contents -> New -> List -> Blank list.
2. Name list exactly as specified (example: cr4c3_incidents).
3. Open list -> Settings (gear) -> List settings.
4. Keep default Title column only if you need it; otherwise rename Title to a neutral label (example: RecordTitle) and do not use it in app mapping.
5. Create custom columns from the table in section 4.
6. For lookups, select target list and target field (usually ID or Name).
7. Enable indexing for filter-heavy columns.

## 3. Choice values to configure

Create these Choice value sets exactly.

Severity:

- Critical
- High
- Medium

Incident Status:

- Open
- InvestigationPending
- RCASubmitted
- RCAInReview
- RCAApproved
- RCARejected
- PAClosed
- Cancelled

RCA Status:

- Draft
- Submitted
- UnderReview
- Approved
- Rejected
- PendingL1Review
- PendingL2Review
- Escalated

Preventive Action Status:

- NotStarted
- InProgress
- Completed

Fishbone Category:

- People
- Process
- Technology
- Material
- Environment
- Management

Team Shift:

- Morning
- Evening
- Night

User Role:

- Logger
- Assignee
- L1Manager
- L2Manager
- PAOwner
- Admin
- Member

Notification Type:

- Info
- Warning
- Success
- Error

Audit Action:

- Created
- Approved
- Rejected
- Updated
- Submitted
- Escalated
- Closed
- Assigned
- Reopened
- Cancelled

Upload Location (recommended):

- OneDrive
- SharePoint
- LocalUpload

File Type (recommended):

- pdf
- doc
- docx
- xls
- xlsx
- jpg
- png
- other

## 4. Per-list column setup (click-by-click)

Notes:

- Type abbreviations used below:
  - Text = Single line of text
  - Note = Multiple lines of text
  - DateTime = Date and Time
  - Number = Number
  - YesNo = Yes/No
  - Choice = Choice
  - Lookup(List) = Lookup column to List
- Recommended: make all GUID-like ID columns required and indexed.

### 4.1 cr4c3_departments

Create columns:

1. cr4c3_departmentid (Text, required, indexed)
2. cr4c3_name (Text, required, indexed)
3. cr4c3_description (Note)
4. statuscode (Choice: Active, Inactive)
5. statecode (Choice: Active, Inactive)

### 4.2 cr4c3_subdepartments

Create columns:

1. cr4c3_subdepartmentid (Text, required, indexed)
2. cr4c3_name (Text, required, indexed)
3. cr4c3_description (Note)
4. _cr4c3_department_value (Lookup(cr4c3_departments), required, indexed)
5. statuscode (Choice: Active, Inactive)
6. statecode (Choice: Active, Inactive)

### 4.3 cr4c3_processes

Create columns:

1. cr4c3_processid (Text, required, indexed)
2. cr4c3_name (Text, required, indexed)
3. cr4c3_description (Note)
4. _cr4c3_subdepartment_value (Lookup(cr4c3_subdepartments), required, indexed)
5. _cr4c3_l1manager_value (Lookup(cr4c3_userprofiles), optional initially, indexed)
6. statuscode (Choice: Active, Inactive)
7. statecode (Choice: Active, Inactive)

Important: if cr4c3_userprofiles does not exist yet, create _cr4c3_l1manager_value later.

### 4.4 cr4c3_teams

Create columns:

1. cr4c3_teamid (Text, required, indexed)
2. cr4c3_name (Text, required, indexed)
3. cr4c3_shift (Choice: Team Shift values)
4. _cr4c3_process_value (Lookup(cr4c3_processes), required, indexed)
5. statuscode (Choice: Active, Inactive)
6. statecode (Choice: Active, Inactive)

### 4.5 cr4c3_userprofiles

Create columns:

1. cr4c3_userprofileid (Text, required, indexed)
2. cr4c3_fullname (Text, required)
3. cr4c3_email (Text, required, indexed)
4. cr4c3_password (Text, required)
5. cr4c3_role (Choice: User Role values, required, indexed)
6. _cr4c3_department_value (Lookup(cr4c3_departments), indexed)
7. _cr4c3_subdepartment_value (Lookup(cr4c3_subdepartments), indexed)
8. _cr4c3_process_value (Lookup(cr4c3_processes), indexed)
9. _cr4c3_team_value (Lookup(cr4c3_teams), indexed)
10. _cr4c3_manager_value (Lookup(cr4c3_userprofiles), indexed)
11. _cr4c3_l2manager_value (Lookup(cr4c3_userprofiles), indexed)
12. statuscode (Choice: Active, Inactive)
13. statecode (Choice: Active, Inactive)

### 4.6 cr4c3_slarules

Create columns:

1. cr4c3_slaruleid (Text, required, indexed)
2. cr4c3_slaname (Text, required)
3. cr4c3_severity (Choice: Severity values, required, indexed)
4. cr4c3_tathours (Number, required)
5. cr4c3_l1reviewpercent (Number)
6. cr4c3_isactive (YesNo, required)
7. statuscode (Choice: Active, Inactive)
8. statecode (Choice: Active, Inactive)

### 4.7 cr4c3_incidents

Create columns:

1. cr4c3_incidentid (Text, required, indexed)
2. cr4c3_ticketreference (Text, required, indexed)
3. cr4c3_title (Text, required)
4. cr4c3_description (Note, required)
5. cr4c3_severity (Choice: Severity values, required, indexed)
6. cr4c3_status (Choice: Incident Status values, required, indexed)
7. cr4c3_rejectioncount (Number)
8. cr4c3_createdat (DateTime)
9. cr4c3_updatedat (DateTime)
10. cr4c3_duedate (DateTime, indexed)
11. _cr4c3_department_value (Lookup(cr4c3_departments), indexed)
12. _cr4c3_subdepartment_value (Lookup(cr4c3_subdepartments), indexed)
13. _cr4c3_process_value (Lookup(cr4c3_processes), indexed)
14. _cr4c3_team_value (Lookup(cr4c3_teams), indexed)
15. _cr4c3_loggedby_value (Lookup(cr4c3_userprofiles), indexed)
16. _cr4c3_assignee_value (Lookup(cr4c3_userprofiles), indexed)
17. statuscode (Choice: Active, Inactive)
18. statecode (Choice: Active, Inactive)

### 4.8 cr4c3_rcasubmissions

Create columns:

1. cr4c3_rcasubmissionid (Text, required, indexed)
2. cr4c3_rcatitle (Text, required)
3. cr4c3_effectstatement (Note)
4. cr4c3_status (Choice: RCA Status values, required, indexed)
5. cr4c3_submittedat (DateTime, indexed)
6. cr4c3_reviewedat (DateTime)
7. cr4c3_reviewcomments (Note)
8. _cr4c3_incident_value (Lookup(cr4c3_incidents), required, indexed)
9. _cr4c3_submittedby_value (Lookup(cr4c3_userprofiles), indexed)
10. _cr4c3_reviewer_value (Lookup(cr4c3_userprofiles), indexed)
11. statuscode (Choice: Active, Inactive)
12. statecode (Choice: Active, Inactive)

### 4.9 cr4c3_fishbonecauses

Create columns:

1. cr4c3_fishbonecauseid (Text, required, indexed)
2. cr4c3_category (Choice: Fishbone Category values, required, indexed)
3. cr4c3_causetext (Note, required)
4. cr4c3_positionx (Number)
5. cr4c3_positiony (Number)
6. _cr4c3_rcasubmission_value (Lookup(cr4c3_rcasubmissions), required, indexed)
7. _cr4c3_createdby_value (Lookup(cr4c3_userprofiles), indexed)
8. statuscode (Choice: Active, Inactive)
9. statecode (Choice: Active, Inactive)

### 4.10 cr4c3_preventiveactions

Create columns:

1. cr4c3_preventiveactionid (Text, required, indexed)
2. cr4c3_title (Text, required)
3. cr4c3_description (Note)
4. cr4c3_status (Choice: Preventive Action Status values, required, indexed)
5. cr4c3_createdat (DateTime)
6. cr4c3_duedate (DateTime, indexed)
7. cr4c3_completedat (DateTime)
8. _cr4c3_incident_value (Lookup(cr4c3_incidents), required, indexed)
9. _cr4c3_paowner_value (Lookup(cr4c3_userprofiles), required, indexed)
10. _cr4c3_createdby_value (Lookup(cr4c3_userprofiles), indexed)
11. statuscode (Choice: Active, Inactive)
12. statecode (Choice: Active, Inactive)

### 4.11 cr4c3_paevidences

Create columns:

1. cr4c3_paevidenceid (Text, required, indexed)
2. cr4c3_filename (Text, required)
3. cr4c3_fileurl (Hyperlink)
4. cr4c3_filetype (Choice: File Type values)
5. cr4c3_uploadlocation (Choice: Upload Location values)
6. cr4c3_uploadedat (DateTime, indexed)
7. _cr4c3_preventiveaction_value (Lookup(cr4c3_preventiveactions), required, indexed)
8. _cr4c3_uploadedby_value (Lookup(cr4c3_userprofiles), indexed)
9. statuscode (Choice: Active, Inactive)
10. statecode (Choice: Active, Inactive)

### 4.12 cr4c3_notifications

Create columns:

1. cr4c3_notificationid (Text, required, indexed)
2. cr4c3_message (Note, required)
3. cr4c3_type (Choice: Notification Type values, required, indexed)
4. cr4c3_isread (YesNo, required)
5. cr4c3_createdat (DateTime, indexed)
6. _cr4c3_incident_value (Lookup(cr4c3_incidents), indexed)
7. _cr4c3_user_value (Lookup(cr4c3_userprofiles), required, indexed)
8. statuscode (Choice: Active, Inactive)
9. statecode (Choice: Active, Inactive)

### 4.13 cr4c3_auditlogs

Create columns:

1. cr4c3_auditlogid (Text, required, indexed)
2. cr4c3_action (Choice: Audit Action values, required, indexed)
3. cr4c3_actorrole (Text)
4. cr4c3_timestamp (DateTime, required, indexed)
5. cr4c3_entitytype (Text, required, indexed)
6. cr4c3_entityid (Text, required, indexed)
7. cr4c3_fieldchanged (Text)
8. cr4c3_oldvalue (Note)
9. cr4c3_newvalue (Note)
10. cr4c3_description (Note)
11. _cr4c3_actor_value (Lookup(cr4c3_userprofiles), indexed)
12. statuscode (Choice: Active, Inactive)
13. statecode (Choice: Active, Inactive)

### 4.14 cr4c3_delegations

Create columns:

1. cr4c3_delegationid (Text, required, indexed)
2. cr4c3_startdate (DateTime, required, indexed)
3. cr4c3_enddate (DateTime, required, indexed)
4. cr4c3_note (Note)
5. _cr4c3_delegator_value (Lookup(cr4c3_userprofiles), required, indexed)
6. _cr4c3_delegate_value (Lookup(cr4c3_userprofiles), required, indexed)
7. statuscode (Choice: Active, Inactive)
8. statecode (Choice: Active, Inactive)

## 5. Indexing and list threshold guidance

1. In each list: List settings -> Indexed columns -> Create new index.
2. Index all columns used in filters and joins from section 4.
3. Keep views filtered on indexed columns to avoid threshold issues.
4. For very large lists, partition with date filters (example: createdat current year).

## 6. Data validation and governance

1. Enforce email uniqueness manually or with Power Automate check on create/update.
2. Enforce ticket reference uniqueness on incidents with a pre-create flow.
3. Prevent plaintext passwords: only SHA-256 hash should be written to cr4c3_password.
4. Add retention policy for audit list and incident-related artifacts per compliance rules.

## 7. Post-build verification checklist

1. All 14 lists created with exact names.
2. All lookup columns resolve and show values from target list.
3. Choice columns contain exact option values.
4. Required columns are enforced.
5. Indexes created for high-usage filter columns.
6. Test data can be inserted along dependency chain:
   departments -> subdepartments -> processes -> teams -> users -> incidents -> rca -> pa -> evidence.
7. App can read/write each list via configured connectors.

## 8. Optional next step: automation

After manual creation is validated, automate provisioning via PnP PowerShell template so environments (Dev/UAT/Prod) stay aligned.

## 9. Run the provisioning script

An automated script is available at [Documents/SharePoint_Provisioning_PnP.ps1](Documents/SharePoint_Provisioning_PnP.ps1).

Run from terminal:

```powershell
pwsh -File ./Documents/SharePoint_Provisioning_PnP.ps1 -SiteUrl "https://yourtenant.sharepoint.com/sites/EchoLog"
```

What it does:

1. Connects with interactive sign-in.
2. Creates all 14 lists in dependency order.
3. Creates standard fields, choice fields, and lookup fields.
4. Applies required/indexed settings and unique constraints for key fields.
