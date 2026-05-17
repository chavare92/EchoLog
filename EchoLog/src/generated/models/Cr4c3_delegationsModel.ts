export interface Cr4c3_delegationsBase {
  cr4c3_delegationid?: string;
  createdon?: string;
  modifiedon?: string;
  overriddencreatedon?: string;
  importsequencenumber?: number;
  statuscode?: number;
  statecode?: number;
  timezoneruleversionnumber?: number;
  utcconversiontimezonecode?: number;
  versionnumber?: number;

  /** Start date of the delegation window (ISO string) */
  cr4c3_startdate?: string;
  /** End date of the delegation window (ISO string) */
  cr4c3_enddate?: string;
  /** Optional note / reason for delegation */
  cr4c3_note?: string;

  /** FK → cr4c3_userprofiles (the manager delegating their role) */
  _cr4c3_delegator_value?: string;
  /** FK → cr4c3_userprofiles (the deputy receiving the role) */
  _cr4c3_delegate_value?: string;

  _ownerid_value?: string;
  _owningbusinessunit_value?: string;
  _createdby_value?: string;
  _modifiedby_value?: string;
}
