param(
  [Parameter(Mandatory = $true)]
  [string]$SiteUrl
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-PnPModule {
  $module = Get-Module -ListAvailable -Name "PnP.PowerShell"
  if (-not $module) {
    Write-Host "PnP.PowerShell module not found. Installing for current user..." -ForegroundColor Yellow
    Install-Module -Name "PnP.PowerShell" -Scope CurrentUser -Force -AllowClobber
  }
}

function Ensure-List {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ListTitle
  )

  $list = Get-PnPList -Identity $ListTitle -ErrorAction SilentlyContinue
  if (-not $list) {
    Write-Host "Creating list: $ListTitle" -ForegroundColor Cyan
    New-PnPList -Title $ListTitle -Template GenericList -OnQuickLaunch:$false | Out-Null
    $list = Get-PnPList -Identity $ListTitle
  } else {
    Write-Host "List already exists: $ListTitle" -ForegroundColor DarkGray
  }

  return $list
}

function Ensure-Field {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ListTitle,
    [Parameter(Mandatory = $true)]
    [string]$InternalName,
    [Parameter(Mandatory = $true)]
    [string]$DisplayName,
    [Parameter(Mandatory = $true)]
    [ValidateSet("Text", "Note", "Number", "DateTime", "Boolean", "Choice")]
    [string]$Type,
    [bool]$Required = $false,
    [bool]$Indexed = $false,
    [bool]$Unique = $false,
    [string[]]$Choices = @()
  )

  $existing = Get-PnPField -List $ListTitle -Identity $InternalName -ErrorAction SilentlyContinue
  if (-not $existing) {
    Write-Host "Adding field $InternalName to $ListTitle" -ForegroundColor Green

    switch ($Type) {
      "Text" {
        Add-PnPField -List $ListTitle -DisplayName $DisplayName -InternalName $InternalName -Type Text -AddToDefaultView:$false | Out-Null
      }
      "Note" {
        Add-PnPField -List $ListTitle -DisplayName $DisplayName -InternalName $InternalName -Type Note -AddToDefaultView:$false | Out-Null
      }
      "Number" {
        Add-PnPField -List $ListTitle -DisplayName $DisplayName -InternalName $InternalName -Type Number -AddToDefaultView:$false | Out-Null
      }
      "DateTime" {
        Add-PnPField -List $ListTitle -DisplayName $DisplayName -InternalName $InternalName -Type DateTime -AddToDefaultView:$false | Out-Null
      }
      "Boolean" {
        Add-PnPField -List $ListTitle -DisplayName $DisplayName -InternalName $InternalName -Type Boolean -AddToDefaultView:$false | Out-Null
      }
      "Choice" {
        if (-not $Choices -or $Choices.Count -eq 0) {
          throw "Choice field $InternalName requires at least one choice value."
        }
        Add-PnPField -List $ListTitle -DisplayName $DisplayName -InternalName $InternalName -Type Choice -Choices $Choices -AddToDefaultView:$false | Out-Null
      }
    }
  }

  $values = @{
    Required = $Required
    Indexed  = $Indexed
  }

  if ($Unique) {
    $values["Indexed"] = $true
    $values["EnforceUniqueValues"] = $true
  }

  Set-PnPField -List $ListTitle -Identity $InternalName -Values $values | Out-Null
}

function Ensure-LookupField {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ListTitle,
    [Parameter(Mandatory = $true)]
    [string]$InternalName,
    [Parameter(Mandatory = $true)]
    [string]$DisplayName,
    [Parameter(Mandatory = $true)]
    [string]$TargetList,
    [bool]$Required = $false,
    [bool]$Indexed = $false
  )

  $existing = Get-PnPField -List $ListTitle -Identity $InternalName -ErrorAction SilentlyContinue
  if (-not $existing) {
    $target = Get-PnPList -Identity $TargetList -ErrorAction SilentlyContinue
    if (-not $target) {
      throw "Cannot create lookup field $InternalName in $ListTitle because target list $TargetList does not exist."
    }

    Write-Host "Adding lookup $InternalName to $ListTitle -> $TargetList" -ForegroundColor Green
    Add-PnPField -List $ListTitle -DisplayName $DisplayName -InternalName $InternalName -Type Lookup -Values @{
      LookupList  = $target.Id.ToString()
      LookupField = "ID"
    } -AddToDefaultView:$false | Out-Null
  }

  Set-PnPField -List $ListTitle -Identity $InternalName -Values @{
    Required = $Required
    Indexed  = $Indexed
  } | Out-Null
}

Ensure-PnPModule
Connect-PnPOnline -Url $SiteUrl -Interactive

$statusChoices = @("Active", "Inactive")

$severityChoices = @("Critical", "High", "Medium")
$incidentStatusChoices = @("Open", "InvestigationPending", "RCASubmitted", "RCAInReview", "RCAApproved", "RCARejected", "PAClosed", "Cancelled")
$rcaStatusChoices = @("Draft", "Submitted", "UnderReview", "Approved", "Rejected", "PendingL1Review", "PendingL2Review", "Escalated")
$paStatusChoices = @("NotStarted", "InProgress", "Completed")
$fishboneChoices = @("People", "Process", "Technology", "Material", "Environment", "Management")
$teamShiftChoices = @("Morning", "Evening", "Night")
$userRoleChoices = @("Logger", "Assignee", "L1Manager", "L2Manager", "PAOwner", "Admin", "Member")
$notificationChoices = @("Info", "Warning", "Success", "Error")
$auditActionChoices = @("Created", "Approved", "Rejected", "Updated", "Submitted", "Escalated", "Closed", "Assigned", "Reopened", "Cancelled")
$uploadLocationChoices = @("OneDrive", "SharePoint", "LocalUpload")
$fileTypeChoices = @("pdf", "doc", "docx", "xls", "xlsx", "jpg", "png", "other")

# Creation order keeps lookup dependencies sane.
$listOrder = @(
  "cr4c3_departments",
  "cr4c3_subdepartments",
  "cr4c3_processes",
  "cr4c3_teams",
  "cr4c3_userprofiles",
  "cr4c3_slarules",
  "cr4c3_incidents",
  "cr4c3_rcasubmissions",
  "cr4c3_fishbonecauses",
  "cr4c3_preventiveactions",
  "cr4c3_paevidences",
  "cr4c3_notifications",
  "cr4c3_auditlogs",
  "cr4c3_delegations"
)

foreach ($listName in $listOrder) {
  Ensure-List -ListTitle $listName | Out-Null
}

$fields = @{
  "cr4c3_departments" = @(
    @{ Name = "cr4c3_departmentid"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_name"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_description"; Type = "Note" },
    @{ Name = "statuscode"; Type = "Choice"; Choices = $statusChoices },
    @{ Name = "statecode"; Type = "Choice"; Choices = $statusChoices }
  )
  "cr4c3_subdepartments" = @(
    @{ Name = "cr4c3_subdepartmentid"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_name"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_description"; Type = "Note" },
    @{ Name = "statuscode"; Type = "Choice"; Choices = $statusChoices },
    @{ Name = "statecode"; Type = "Choice"; Choices = $statusChoices }
  )
  "cr4c3_processes" = @(
    @{ Name = "cr4c3_processid"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_name"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_description"; Type = "Note" },
    @{ Name = "statuscode"; Type = "Choice"; Choices = $statusChoices },
    @{ Name = "statecode"; Type = "Choice"; Choices = $statusChoices }
  )
  "cr4c3_teams" = @(
    @{ Name = "cr4c3_teamid"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_name"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_shift"; Type = "Choice"; Choices = $teamShiftChoices },
    @{ Name = "statuscode"; Type = "Choice"; Choices = $statusChoices },
    @{ Name = "statecode"; Type = "Choice"; Choices = $statusChoices }
  )
  "cr4c3_userprofiles" = @(
    @{ Name = "cr4c3_userprofileid"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_fullname"; Type = "Text"; Required = $true },
    @{ Name = "cr4c3_email"; Type = "Text"; Required = $true; Indexed = $true; Unique = $true },
    @{ Name = "cr4c3_password"; Type = "Text"; Required = $true },
    @{ Name = "cr4c3_role"; Type = "Choice"; Choices = $userRoleChoices; Required = $true; Indexed = $true },
    @{ Name = "statuscode"; Type = "Choice"; Choices = $statusChoices },
    @{ Name = "statecode"; Type = "Choice"; Choices = $statusChoices }
  )
  "cr4c3_slarules" = @(
    @{ Name = "cr4c3_slaruleid"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_slaname"; Type = "Text"; Required = $true },
    @{ Name = "cr4c3_severity"; Type = "Choice"; Choices = $severityChoices; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_tathours"; Type = "Number"; Required = $true },
    @{ Name = "cr4c3_l1reviewpercent"; Type = "Number" },
    @{ Name = "cr4c3_isactive"; Type = "Boolean"; Required = $true },
    @{ Name = "statuscode"; Type = "Choice"; Choices = $statusChoices },
    @{ Name = "statecode"; Type = "Choice"; Choices = $statusChoices }
  )
  "cr4c3_incidents" = @(
    @{ Name = "cr4c3_incidentid"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_ticketreference"; Type = "Text"; Required = $true; Indexed = $true; Unique = $true },
    @{ Name = "cr4c3_title"; Type = "Text"; Required = $true },
    @{ Name = "cr4c3_description"; Type = "Note"; Required = $true },
    @{ Name = "cr4c3_severity"; Type = "Choice"; Choices = $severityChoices; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_status"; Type = "Choice"; Choices = $incidentStatusChoices; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_rejectioncount"; Type = "Number" },
    @{ Name = "cr4c3_createdat"; Type = "DateTime" },
    @{ Name = "cr4c3_updatedat"; Type = "DateTime" },
    @{ Name = "cr4c3_duedate"; Type = "DateTime"; Indexed = $true },
    @{ Name = "statuscode"; Type = "Choice"; Choices = $statusChoices },
    @{ Name = "statecode"; Type = "Choice"; Choices = $statusChoices }
  )
  "cr4c3_rcasubmissions" = @(
    @{ Name = "cr4c3_rcasubmissionid"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_rcatitle"; Type = "Text"; Required = $true },
    @{ Name = "cr4c3_effectstatement"; Type = "Note" },
    @{ Name = "cr4c3_status"; Type = "Choice"; Choices = $rcaStatusChoices; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_submittedat"; Type = "DateTime"; Indexed = $true },
    @{ Name = "cr4c3_reviewedat"; Type = "DateTime" },
    @{ Name = "cr4c3_reviewcomments"; Type = "Note" },
    @{ Name = "statuscode"; Type = "Choice"; Choices = $statusChoices },
    @{ Name = "statecode"; Type = "Choice"; Choices = $statusChoices }
  )
  "cr4c3_fishbonecauses" = @(
    @{ Name = "cr4c3_fishbonecauseid"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_category"; Type = "Choice"; Choices = $fishboneChoices; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_causetext"; Type = "Note"; Required = $true },
    @{ Name = "cr4c3_positionx"; Type = "Number" },
    @{ Name = "cr4c3_positiony"; Type = "Number" },
    @{ Name = "statuscode"; Type = "Choice"; Choices = $statusChoices },
    @{ Name = "statecode"; Type = "Choice"; Choices = $statusChoices }
  )
  "cr4c3_preventiveactions" = @(
    @{ Name = "cr4c3_preventiveactionid"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_title"; Type = "Text"; Required = $true },
    @{ Name = "cr4c3_description"; Type = "Note" },
    @{ Name = "cr4c3_status"; Type = "Choice"; Choices = $paStatusChoices; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_createdat"; Type = "DateTime" },
    @{ Name = "cr4c3_duedate"; Type = "DateTime"; Indexed = $true },
    @{ Name = "cr4c3_completedat"; Type = "DateTime" },
    @{ Name = "statuscode"; Type = "Choice"; Choices = $statusChoices },
    @{ Name = "statecode"; Type = "Choice"; Choices = $statusChoices }
  )
  "cr4c3_paevidences" = @(
    @{ Name = "cr4c3_paevidenceid"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_filename"; Type = "Text"; Required = $true },
    @{ Name = "cr4c3_fileurl"; Type = "Text" },
    @{ Name = "cr4c3_filetype"; Type = "Choice"; Choices = $fileTypeChoices },
    @{ Name = "cr4c3_uploadlocation"; Type = "Choice"; Choices = $uploadLocationChoices },
    @{ Name = "cr4c3_uploadedat"; Type = "DateTime"; Indexed = $true },
    @{ Name = "statuscode"; Type = "Choice"; Choices = $statusChoices },
    @{ Name = "statecode"; Type = "Choice"; Choices = $statusChoices }
  )
  "cr4c3_notifications" = @(
    @{ Name = "cr4c3_notificationid"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_message"; Type = "Note"; Required = $true },
    @{ Name = "cr4c3_type"; Type = "Choice"; Choices = $notificationChoices; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_isread"; Type = "Boolean"; Required = $true },
    @{ Name = "cr4c3_createdat"; Type = "DateTime"; Indexed = $true },
    @{ Name = "statuscode"; Type = "Choice"; Choices = $statusChoices },
    @{ Name = "statecode"; Type = "Choice"; Choices = $statusChoices }
  )
  "cr4c3_auditlogs" = @(
    @{ Name = "cr4c3_auditlogid"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_action"; Type = "Choice"; Choices = $auditActionChoices; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_actorrole"; Type = "Text" },
    @{ Name = "cr4c3_timestamp"; Type = "DateTime"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_entitytype"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_entityid"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_fieldchanged"; Type = "Text" },
    @{ Name = "cr4c3_oldvalue"; Type = "Note" },
    @{ Name = "cr4c3_newvalue"; Type = "Note" },
    @{ Name = "cr4c3_description"; Type = "Note" },
    @{ Name = "statuscode"; Type = "Choice"; Choices = $statusChoices },
    @{ Name = "statecode"; Type = "Choice"; Choices = $statusChoices }
  )
  "cr4c3_delegations" = @(
    @{ Name = "cr4c3_delegationid"; Type = "Text"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_startdate"; Type = "DateTime"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_enddate"; Type = "DateTime"; Required = $true; Indexed = $true },
    @{ Name = "cr4c3_note"; Type = "Note" },
    @{ Name = "statuscode"; Type = "Choice"; Choices = $statusChoices },
    @{ Name = "statecode"; Type = "Choice"; Choices = $statusChoices }
  )
}

foreach ($listName in $fields.Keys) {
  foreach ($field in $fields[$listName]) {
    Ensure-Field -ListTitle $listName -InternalName $field.Name -DisplayName $field.Name -Type $field.Type `
      -Required ([bool]($field.Required -eq $true)) -Indexed ([bool]($field.Indexed -eq $true)) `
      -Unique ([bool]($field.Unique -eq $true)) -Choices ($(if ($field.ContainsKey("Choices")) { $field.Choices } else { @() }))
  }
}

$lookupFields = @(
  @{ List = "cr4c3_subdepartments"; Name = "_cr4c3_department_value"; Target = "cr4c3_departments"; Required = $true; Indexed = $true },
  @{ List = "cr4c3_processes"; Name = "_cr4c3_subdepartment_value"; Target = "cr4c3_subdepartments"; Required = $true; Indexed = $true },
  @{ List = "cr4c3_processes"; Name = "_cr4c3_l1manager_value"; Target = "cr4c3_userprofiles"; Required = $false; Indexed = $true },
  @{ List = "cr4c3_teams"; Name = "_cr4c3_process_value"; Target = "cr4c3_processes"; Required = $true; Indexed = $true },

  @{ List = "cr4c3_userprofiles"; Name = "_cr4c3_department_value"; Target = "cr4c3_departments"; Indexed = $true },
  @{ List = "cr4c3_userprofiles"; Name = "_cr4c3_subdepartment_value"; Target = "cr4c3_subdepartments"; Indexed = $true },
  @{ List = "cr4c3_userprofiles"; Name = "_cr4c3_process_value"; Target = "cr4c3_processes"; Indexed = $true },
  @{ List = "cr4c3_userprofiles"; Name = "_cr4c3_team_value"; Target = "cr4c3_teams"; Indexed = $true },
  @{ List = "cr4c3_userprofiles"; Name = "_cr4c3_manager_value"; Target = "cr4c3_userprofiles"; Indexed = $true },
  @{ List = "cr4c3_userprofiles"; Name = "_cr4c3_l2manager_value"; Target = "cr4c3_userprofiles"; Indexed = $true },

  @{ List = "cr4c3_incidents"; Name = "_cr4c3_department_value"; Target = "cr4c3_departments"; Indexed = $true },
  @{ List = "cr4c3_incidents"; Name = "_cr4c3_subdepartment_value"; Target = "cr4c3_subdepartments"; Indexed = $true },
  @{ List = "cr4c3_incidents"; Name = "_cr4c3_process_value"; Target = "cr4c3_processes"; Indexed = $true },
  @{ List = "cr4c3_incidents"; Name = "_cr4c3_team_value"; Target = "cr4c3_teams"; Indexed = $true },
  @{ List = "cr4c3_incidents"; Name = "_cr4c3_loggedby_value"; Target = "cr4c3_userprofiles"; Indexed = $true },
  @{ List = "cr4c3_incidents"; Name = "_cr4c3_assignee_value"; Target = "cr4c3_userprofiles"; Indexed = $true },

  @{ List = "cr4c3_rcasubmissions"; Name = "_cr4c3_incident_value"; Target = "cr4c3_incidents"; Required = $true; Indexed = $true },
  @{ List = "cr4c3_rcasubmissions"; Name = "_cr4c3_submittedby_value"; Target = "cr4c3_userprofiles"; Indexed = $true },
  @{ List = "cr4c3_rcasubmissions"; Name = "_cr4c3_reviewer_value"; Target = "cr4c3_userprofiles"; Indexed = $true },

  @{ List = "cr4c3_fishbonecauses"; Name = "_cr4c3_rcasubmission_value"; Target = "cr4c3_rcasubmissions"; Required = $true; Indexed = $true },
  @{ List = "cr4c3_fishbonecauses"; Name = "_cr4c3_createdby_value"; Target = "cr4c3_userprofiles"; Indexed = $true },

  @{ List = "cr4c3_preventiveactions"; Name = "_cr4c3_incident_value"; Target = "cr4c3_incidents"; Required = $true; Indexed = $true },
  @{ List = "cr4c3_preventiveactions"; Name = "_cr4c3_paowner_value"; Target = "cr4c3_userprofiles"; Required = $true; Indexed = $true },
  @{ List = "cr4c3_preventiveactions"; Name = "_cr4c3_createdby_value"; Target = "cr4c3_userprofiles"; Indexed = $true },

  @{ List = "cr4c3_paevidences"; Name = "_cr4c3_preventiveaction_value"; Target = "cr4c3_preventiveactions"; Required = $true; Indexed = $true },
  @{ List = "cr4c3_paevidences"; Name = "_cr4c3_uploadedby_value"; Target = "cr4c3_userprofiles"; Indexed = $true },

  @{ List = "cr4c3_notifications"; Name = "_cr4c3_incident_value"; Target = "cr4c3_incidents"; Indexed = $true },
  @{ List = "cr4c3_notifications"; Name = "_cr4c3_user_value"; Target = "cr4c3_userprofiles"; Required = $true; Indexed = $true },

  @{ List = "cr4c3_auditlogs"; Name = "_cr4c3_actor_value"; Target = "cr4c3_userprofiles"; Indexed = $true },

  @{ List = "cr4c3_delegations"; Name = "_cr4c3_delegator_value"; Target = "cr4c3_userprofiles"; Required = $true; Indexed = $true },
  @{ List = "cr4c3_delegations"; Name = "_cr4c3_delegate_value"; Target = "cr4c3_userprofiles"; Required = $true; Indexed = $true }
)

foreach ($lookup in $lookupFields) {
  Ensure-LookupField -ListTitle $lookup.List -InternalName $lookup.Name -DisplayName $lookup.Name -TargetList $lookup.Target `
    -Required ([bool]($lookup.Required -eq $true)) -Indexed ([bool]($lookup.Indexed -eq $true))
}

Write-Host "Provisioning complete." -ForegroundColor Cyan
Write-Host "Review list settings and any site-specific governance requirements before production use." -ForegroundColor Yellow
