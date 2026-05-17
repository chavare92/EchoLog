// ─── Severity ────────────────────────────────────────────────────────────────
export const SEVERITY = {
  Critical: 564060000,
  High: 564060001,
  Medium: 564060002,
} as const;

export type SeverityKey = keyof typeof SEVERITY;

export const SEVERITY_TAT_HOURS: Record<SeverityKey, number> = {
  Critical: 4,
  High: 24,
  Medium: 72,
};

// ─── Incident Status ──────────────────────────────────────────────────────────
export const INCIDENT_STATUS = {
  Open: 564060000,
  InvestigationPending: 564060001,
  RCASubmitted: 564060002,
  RCAInReview: 564060003,
  RCAApproved: 564060004,
  RCARejected: 564060005,
  PAClosed: 564060006,
  Cancelled: 564060007,
} as const;

export type IncidentStatusKey = keyof typeof INCIDENT_STATUS;

// ─── RCA Status ───────────────────────────────────────────────────────────────
export const RCA_STATUS = {
  Draft: 564060000,
  Submitted: 564060001,
  UnderReview: 564060002,
  Approved: 564060003,
  Rejected: 564060004,
  PendingL1Review: 564060005,
  PendingL2Review: 564060006,
  Escalated: 564060007,
} as const;

export type RCAStatusKey = keyof typeof RCA_STATUS;

// ─── Preventive Action Status ─────────────────────────────────────────────────
export const PA_STATUS = {
  NotStarted: 564060000,
  InProgress: 564060001,
  Completed: 564060002,
} as const;

export type PAStatusKey = keyof typeof PA_STATUS;

// ─── Fishbone Categories ──────────────────────────────────────────────────────
export const FISHBONE_CATEGORY = {
  People: 564060000,
  Process: 564060001,
  Technology: 564060002,
  Data: 564060003,
  Environment: 564060004,
  Governance: 564060005,
} as const;

export type FishboneCategoryKey = keyof typeof FISHBONE_CATEGORY;

// ─── Team Shift ───────────────────────────────────────────────────────────────
export const TEAM_SHIFT = {
  Morning: 564060000,
  Evening: 564060001,
  Night: 564060002,
} as const;

// ─── User Role ────────────────────────────────────────────────────────────────
export const USER_ROLE = {
  Logger: 564060000,
  Assignee: 564060001,
  L1Manager: 564060002,
  L2Manager: 564060003,
  PAOwner: 564060004,
  Admin: 564060005,
  Member: 564060006,
} as const;

export type UserRoleKey = keyof typeof USER_ROLE;

// ─── Notification Type ────────────────────────────────────────────────────────
export const NOTIFICATION_TYPE = {
  Info: 564060000,
  Warning: 564060001,
  Success: 564060002,
  Error: 564060003,
} as const;

// ─── Audit Action ─────────────────────────────────────────────────────────────
export const AUDIT_ACTION = {
  Created: 1,
  Approved: 2,
  Rejected: 3,
  Updated: 4,
  Submitted: 5,
  Escalated: 6,
  Closed: 7,
  Assigned: 8,
  Reopened: 9,
  Cancelled: 10,
} as const;

export type AuditActionKey = keyof typeof AUDIT_ACTION;
