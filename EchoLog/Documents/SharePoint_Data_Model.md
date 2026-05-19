# EchoLog SharePoint Data Model Blueprint

This document maps the current EchoLog Dataverse-style model to a SharePoint implementation with equivalent schemas and relationships.

## 1. Source of truth used

- Generated entity models under `src/generated/models/*Model.ts`
- Option-set constants under `src/lib/constants.ts`
- Role/manager/delegation usage in `src/auth/*`, `src/hooks/*`, `src/lib/roleUtils.ts`

## 2. SharePoint implementation strategy

- Create one SharePoint List per entity (`cr4c3_*`).
- Keep original GUID IDs in dedicated text columns (for interoperability): `cr4c3_*id`.
- Also keep SharePoint native `ID` column for list item identity.
- For each Dataverse lookup (`_..._value`), create:
  - A SharePoint Lookup column to parent list (preferred for relational navigation), and
  - A parallel text GUID column (optional but recommended) for API parity/migration safety.
- For option-set numeric fields (status, severity, role, etc.), create a Choice column and optionally an integer code column if you must preserve exact numeric codes.
- For auditing fields (`createdon`, `modifiedon`, `versionnumber`, etc.), use standard SP system fields where possible and add custom columns only when required by app logic.

## 3. Option sets (choices) and codes

Use these for SharePoint Choice columns. If preserving numeric values matters, add a sibling Number column `*_code`.

### 3.1 Severity (`cr4c3_severity`)

- Critical = 564060000
- High = 564060001
- Medium = 564060002

### 3.2 Incident Status (`cr4c3_status` on incidents)

- Open = 564060000
- InvestigationPending = 564060001
- RCASubmitted = 564060002
- RCAInReview = 564060003
- RCAApproved = 564060004
- RCARejected = 564060005
- PAClosed = 564060006
- Cancelled = 564060007

### 3.3 RCA Status (`cr4c3_status` on rcasubmissions)

- Draft = 564060000
- Submitted = 564060001
- UnderReview = 564060002
- Approved = 564060003
- Rejected = 564060004
- PendingL1Review = 564060005
- PendingL2Review = 564060006
- Escalated = 564060007

### 3.4 Preventive Action Status (`cr4c3_status` on preventiveactions)

- NotStarted = 564060000
- InProgress = 564060001
- Completed = 564060002

### 3.5 Fishbone Category (`cr4c3_category`)

- People = 564060000
- Process = 564060001
- Technology = 564060002
- Material = 564060003
- Environment = 564060004
- Management = 564060005

### 3.6 Team Shift (`cr4c3_shift`)

- Morning = 564060000
- Evening = 564060001
- Night = 564060002

### 3.7 User Role (`cr4c3_role`)

- Logger = 564060000
- Assignee = 564060001
- L1Manager = 564060002
- L2Manager = 564060003
- PAOwner = 564060004
- Admin = 564060005
- Member = 564060006

### 3.8 Notification Type (`cr4c3_type`)

- Info = 564060000
- Warning = 564060001
- Success = 564060002
- Error = 564060003

### 3.9 Audit Action (`cr4c3_action`)

- Created = 1
- Approved = 2
- Rejected = 3
- Updated = 4
- Submitted = 5
- Escalated = 6
- Closed = 7
- Assigned = 8
- Reopened = 9
- Cancelled = 10

## 4. Relationship map (cardinality)

- `departments (1) -> (N) subdepartments`
- `subdepartments (1) -> (N) processes`
- `processes (1) -> (N) teams`
- `departments/subdepartments/processes/teams (1) -> (N) userprofiles`
- `userprofiles (1) -> (N) userprofiles` via manager links:
  - `_cr4c3_manager_value`
  - `_cr4c3_l2manager_value`
- `departments/subdepartments/processes/teams (1) -> (N) incidents`
- `userprofiles (1) -> (N) incidents` via:
  - `_cr4c3_loggedby_value`
  - `_cr4c3_assignee_value`
- `incidents (1) -> (N) rcasubmissions`
- `userprofiles (1) -> (N) rcasubmissions` via:
  - `_cr4c3_submittedby_value`
  - `_cr4c3_reviewer_value`
- `rcasubmissions (1) -> (N) fishbonecauses`
- `incidents (1) -> (N) preventiveactions`
- `userprofiles (1) -> (N) preventiveactions` via `_cr4c3_paowner_value` and `_cr4c3_createdby_value`
- `preventiveactions (1) -> (N) paevidences`
- `userprofiles (1) -> (N) paevidences` via `_cr4c3_uploadedby_value`
- `incidents (1) -> (N) notifications`
- `userprofiles (1) -> (N) notifications` via `_cr4c3_user_value`
- `userprofiles (1) -> (N) delegations` via `_cr4c3_delegator_value`
- `userprofiles (1) -> (N) delegations` via `_cr4c3_delegate_value`
- `userprofiles (1) -> (N) auditlogs` via `_cr4c3_actor_value`

## 5. Entity schemas (SharePoint list design)

Type legend:

- `Text` = Single line of text
- `Note` = Multiple lines of text
- `Number` = Number
- `Yes/No` = Boolean
- `DateTime` = Date and Time
- `Choice` = Choice field
- `Lookup(List)` = SharePoint Lookup to another list

### 5.1 `cr4c3_departments`

Primary/business fields:

- `cr4c3_departmentid` : Text (GUID, unique)
- `cr4c3_name` : Text
- `cr4c3_description` : Note

Operational/system fields used in model:

- `createdon` : DateTime
- `modifiedon` : DateTime
- `statuscode` : Choice or Number
- `statecode` : Choice or Number
- `importsequencenumber` : Number
- `overriddencreatedon` : DateTime
- `timezoneruleversionnumber` : Number
- `utcconversiontimezonecode` : Number
- `versionnumber` : Number

### 5.2 `cr4c3_subdepartments`

Primary/business fields:

- `cr4c3_subdepartmentid` : Text (GUID, unique)
- `cr4c3_name` : Text
- `cr4c3_description` : Note
- `_cr4c3_department_value` : Lookup(`cr4c3_departments`) + optional GUID Text mirror

Operational/system fields:

- `createdon`, `modifiedon`, `statuscode`, `statecode`, `importsequencenumber`, `overriddencreatedon`, `timezoneruleversionnumber`, `utcconversiontimezonecode`, `versionnumber`

### 5.3 `cr4c3_processes`

Primary/business fields:

- `cr4c3_processid` : Text (GUID, unique)
- `cr4c3_name` : Text
- `cr4c3_description` : Note
- `_cr4c3_subdepartment_value` : Lookup(`cr4c3_subdepartments`) + optional GUID Text mirror

Referenced by app logic (recommended extension):

- `_cr4c3_l1manager_value` : Lookup(`cr4c3_userprofiles`) + optional GUID Text mirror

Operational/system fields:

- `createdon`, `modifiedon`, `statuscode`, `statecode`, `importsequencenumber`, `overriddencreatedon`, `timezoneruleversionnumber`, `utcconversiontimezonecode`, `versionnumber`

### 5.4 `cr4c3_teams`

Primary/business fields:

- `cr4c3_teamid` : Text (GUID, unique)
- `cr4c3_name` : Text
- `cr4c3_shift` : Choice (Morning/Evening/Night)
- `_cr4c3_process_value` : Lookup(`cr4c3_processes`) + optional GUID Text mirror

Operational/system fields:

- `createdon`, `modifiedon`, `statuscode`, `statecode`, `importsequencenumber`, `overriddencreatedon`, `timezoneruleversionnumber`, `utcconversiontimezonecode`, `versionnumber`

### 5.5 `cr4c3_userprofiles`

Primary/business fields:

- `cr4c3_userprofileid` : Text (GUID, unique)
- `cr4c3_fullname` : Text
- `cr4c3_email` : Text (enforce unique)
- `cr4c3_password` : Text (stores SHA-256 hash)
- `cr4c3_role` : Choice (Logger, Assignee, L1Manager, L2Manager, PAOwner, Admin, Member)
- `_cr4c3_department_value` : Lookup(`cr4c3_departments`)
- `_cr4c3_subdepartment_value` : Lookup(`cr4c3_subdepartments`)
- `_cr4c3_process_value` : Lookup(`cr4c3_processes`)
- `_cr4c3_team_value` : Lookup(`cr4c3_teams`)
- `_cr4c3_manager_value` : Lookup(`cr4c3_userprofiles`) (L1 manager)
- `_cr4c3_l2manager_value` : Lookup(`cr4c3_userprofiles`) (L2 manager)

Operational/system fields:

- `createdon`, `modifiedon`, `statuscode`, `statecode`, `importsequencenumber`, `overriddencreatedon`, `timezoneruleversionnumber`, `utcconversiontimezonecode`, `versionnumber`

### 5.6 `cr4c3_incidents`

Primary/business fields:

- `cr4c3_incidentid` : Text (GUID, unique)
- `cr4c3_ticketreference` : Text (unique, indexed)
- `cr4c3_title` : Text
- `cr4c3_description` : Note
- `cr4c3_severity` : Choice (Critical, High, Medium)
- `cr4c3_status` : Choice (Incident status list)
- `cr4c3_rejectioncount` : Number
- `cr4c3_createdat` : DateTime
- `cr4c3_updatedat` : DateTime
- `cr4c3_duedate` : DateTime
- `_cr4c3_department_value` : Lookup(`cr4c3_departments`)
- `_cr4c3_subdepartment_value` : Lookup(`cr4c3_subdepartments`)
- `_cr4c3_process_value` : Lookup(`cr4c3_processes`)
- `_cr4c3_team_value` : Lookup(`cr4c3_teams`)
- `_cr4c3_loggedby_value` : Lookup(`cr4c3_userprofiles`)
- `_cr4c3_assignee_value` : Lookup(`cr4c3_userprofiles`)

Operational/system fields:

- `createdon`, `modifiedon`, `statuscode`, `statecode`, `importsequencenumber`, `overriddencreatedon`, `timezoneruleversionnumber`, `utcconversiontimezonecode`, `versionnumber`

### 5.7 `cr4c3_rcasubmissions`

Primary/business fields:

- `cr4c3_rcasubmissionid` : Text (GUID, unique)
- `cr4c3_rcatitle` : Text
- `cr4c3_effectstatement` : Note
- `cr4c3_status` : Choice (RCA status list)
- `cr4c3_submittedat` : DateTime
- `cr4c3_reviewedat` : DateTime
- `cr4c3_reviewcomments` : Note
- `_cr4c3_incident_value` : Lookup(`cr4c3_incidents`)
- `_cr4c3_submittedby_value` : Lookup(`cr4c3_userprofiles`)
- `_cr4c3_reviewer_value` : Lookup(`cr4c3_userprofiles`)

Operational/system fields:

- `createdon`, `modifiedon`, `statuscode`, `statecode`, `importsequencenumber`, `overriddencreatedon`, `timezoneruleversionnumber`, `utcconversiontimezonecode`, `versionnumber`

### 5.8 `cr4c3_fishbonecauses`

Primary/business fields:

- `cr4c3_fishbonecauseid` : Text (GUID, unique)
- `cr4c3_category` : Choice (Fishbone categories)
- `cr4c3_causetext` : Note
- `cr4c3_positionx` : Number
- `cr4c3_positiony` : Number
- `_cr4c3_rcasubmission_value` : Lookup(`cr4c3_rcasubmissions`)
- `_cr4c3_createdby_value` : Lookup(`cr4c3_userprofiles`)

Operational/system fields:

- `createdon`, `modifiedon`, `statuscode`, `statecode`, `importsequencenumber`, `overriddencreatedon`, `timezoneruleversionnumber`, `utcconversiontimezonecode`, `versionnumber`

### 5.9 `cr4c3_preventiveactions`

Primary/business fields:

- `cr4c3_preventiveactionid` : Text (GUID, unique)
- `cr4c3_title` : Text
- `cr4c3_description` : Note
- `cr4c3_status` : Choice (NotStarted, InProgress, Completed)
- `cr4c3_createdat` : DateTime
- `cr4c3_duedate` : DateTime
- `cr4c3_completedat` : DateTime
- `_cr4c3_incident_value` : Lookup(`cr4c3_incidents`)
- `_cr4c3_paowner_value` : Lookup(`cr4c3_userprofiles`)
- `_cr4c3_createdby_value` : Lookup(`cr4c3_userprofiles`)

Operational/system fields:

- `createdon`, `modifiedon`, `statuscode`, `statecode`, `importsequencenumber`, `overriddencreatedon`, `timezoneruleversionnumber`, `utcconversiontimezonecode`, `versionnumber`

### 5.10 `cr4c3_paevidences`

Primary/business fields:

- `cr4c3_paevidenceid` : Text (GUID, unique)
- `cr4c3_filename` : Text
- `cr4c3_fileurl` : Hyperlink or Text
- `cr4c3_filetype` : Choice (define from your accepted extensions)
- `cr4c3_uploadlocation` : Choice (OneDrive, SharePoint, etc.)
- `cr4c3_uploadedat` : DateTime
- `_cr4c3_preventiveaction_value` : Lookup(`cr4c3_preventiveactions`)
- `_cr4c3_uploadedby_value` : Lookup(`cr4c3_userprofiles`)

Operational/system fields:

- `createdon`, `modifiedon`, `statuscode`, `statecode`, `importsequencenumber`, `overriddencreatedon`, `timezoneruleversionnumber`, `utcconversiontimezonecode`, `versionnumber`

### 5.11 `cr4c3_notifications`

Primary/business fields:

- `cr4c3_notificationid` : Text (GUID, unique)
- `cr4c3_message` : Note
- `cr4c3_type` : Choice (Info, Warning, Success, Error)
- `cr4c3_isread` : Yes/No
- `cr4c3_createdat` : DateTime
- `_cr4c3_incident_value` : Lookup(`cr4c3_incidents`)
- `_cr4c3_user_value` : Lookup(`cr4c3_userprofiles`)

Operational/system fields:

- `createdon`, `modifiedon`, `statuscode`, `statecode`, `importsequencenumber`, `overriddencreatedon`, `timezoneruleversionnumber`, `utcconversiontimezonecode`, `versionnumber`

### 5.12 `cr4c3_auditlogs`

Primary/business fields:

- `cr4c3_auditlogid` : Text (GUID, unique)
- `cr4c3_action` : Choice (Created/Approved/Rejected/...)
- `cr4c3_actorrole` : Text
- `cr4c3_timestamp` : DateTime
- `cr4c3_entitytype` : Text
- `cr4c3_entityid` : Text (target entity GUID)
- `cr4c3_fieldchanged` : Text
- `cr4c3_oldvalue` : Note
- `cr4c3_newvalue` : Note
- `cr4c3_description` : Note
- `_cr4c3_actor_value` : Lookup(`cr4c3_userprofiles`)

Operational/system fields:

- `createdon`, `modifiedon`, `statuscode`, `statecode`, `importsequencenumber`, `overriddencreatedon`, `timezoneruleversionnumber`, `utcconversiontimezonecode`, `versionnumber`

### 5.13 `cr4c3_slarules`

Primary/business fields:

- `cr4c3_slaruleid` : Text (GUID, unique)
- `cr4c3_slaname` : Text
- `cr4c3_severity` : Choice (Critical, High, Medium)
- `cr4c3_tathours` : Number
- `cr4c3_l1reviewpercent` : Number
- `cr4c3_isactive` : Yes/No

Operational/system fields:

- `createdon`, `modifiedon`, `statuscode`, `statecode`, `importsequencenumber`, `overriddencreatedon`, `timezoneruleversionnumber`, `utcconversiontimezonecode`, `versionnumber`

### 5.14 `cr4c3_delegations`

Primary/business fields:

- `cr4c3_delegationid` : Text (GUID, unique)
- `cr4c3_startdate` : DateTime
- `cr4c3_enddate` : DateTime
- `cr4c3_note` : Note
- `_cr4c3_delegator_value` : Lookup(`cr4c3_userprofiles`)
- `_cr4c3_delegate_value` : Lookup(`cr4c3_userprofiles`)

Operational/system fields:

- `createdon`, `modifiedon`, `statuscode`, `statecode`, `importsequencenumber`, `overriddencreatedon`, `timezoneruleversionnumber`, `utcconversiontimezonecode`, `versionnumber`

## 6. Recommended indexes and uniqueness

Create indexed columns in SharePoint for query performance:

- `cr4c3_incidents.cr4c3_ticketreference` (unique)
- `cr4c3_incidents.cr4c3_status`
- `cr4c3_incidents.cr4c3_severity`
- `cr4c3_incidents.cr4c3_duedate`
- `cr4c3_userprofiles.cr4c3_email` (unique)
- `cr4c3_rcasubmissions._cr4c3_incident_value`
- `cr4c3_preventiveactions._cr4c3_incident_value`
- `cr4c3_preventiveactions._cr4c3_paowner_value`
- `cr4c3_notifications._cr4c3_user_value`
- `cr4c3_delegations._cr4c3_delegate_value`
- `cr4c3_delegations.cr4c3_startdate`
- `cr4c3_delegations.cr4c3_enddate`

## 7. List creation order (to satisfy lookups)

1. `cr4c3_departments`
2. `cr4c3_subdepartments`
3. `cr4c3_processes`
4. `cr4c3_teams`
5. `cr4c3_userprofiles`
6. `cr4c3_slarules`
7. `cr4c3_incidents`
8. `cr4c3_rcasubmissions`
9. `cr4c3_fishbonecauses`
10. `cr4c3_preventiveactions`
11. `cr4c3_paevidences`
12. `cr4c3_notifications`
13. `cr4c3_auditlogs`
14. `cr4c3_delegations`

## 8. Notes for parity with current app

- The app expects GUID-like IDs in `cr4c3_*id` columns; keep them populated.
- The app uses hashed passwords (`SHA-256`) in `cr4c3_password`; never store plaintext.
- `_cr4c3_l1manager_value` is referenced in runtime logic for process-based manager resolution and should exist in SharePoint schema even if missing in generated model interface.
- Attachments are modeled in generated types (`"{Attachments}"`), but app-specific evidence metadata is tracked explicitly in `cr4c3_paevidences`.
