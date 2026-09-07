/** Master list codes aligned with seeded lookups and API enums. */

export const LOOKUP_TYPE_CODES = [
  'EMPLOYMENT_STATUS',
  'WORK_LOCATION',
  'LEAVE_TYPE',
  'LEAVE_STATUS',
  'TIMESHEET_APPROVAL_STATUS',
  'CLIENT_FEEDBACK',
  'ENGAGEMENT_HEALTH',
  'YES_NO',
  'RELEASE_REASON',
] as const;

export const CLIENT_FEEDBACK_OPTIONS = [
  { code: 'GOOD', label: 'Good' },
  { code: 'AVERAGE', label: 'Average' },
  { code: 'POOR', label: 'Poor' },
] as const;

export const ENGAGEMENT_HEALTH_OPTIONS = [
  { code: 'ON_TRACK', label: 'On Track' },
  { code: 'AT_RISK', label: 'At Risk' },
  { code: 'ESCALATED', label: 'Escalated' },
] as const;

export const LEAVE_STATUS_OPTIONS = [
  { code: 'PENDING', label: 'Pending' },
  { code: 'APPROVED', label: 'Approved' },
  { code: 'REJECTED', label: 'Rejected' },
] as const;

export const TIMESHEET_APPROVAL_OPTIONS = [
  { code: 'PENDING', label: 'Pending' },
  { code: 'APPROVED', label: 'Approved' },
  { code: 'REJECTED', label: 'Rejected' },
] as const;

export const EMPLOYMENT_STATUS_OPTIONS = [
  { code: 'ACTIVE', label: 'Active' },
  { code: 'ON_LEAVE', label: 'On Leave' },
  { code: 'RELEASED', label: 'Released' },
  { code: 'BACKUP_BENCH', label: 'Backup/Bench' },
] as const;

export const YES_NO_OPTIONS = [
  { code: 'YES', label: 'Yes' },
  { code: 'NO', label: 'No' },
] as const;

export const WORK_LOCATION_OPTIONS = [
  { code: 'ONSITE', label: 'Onsite' },
  { code: 'REMOTE', label: 'Remote' },
  { code: 'HYBRID', label: 'Hybrid' },
] as const;

export const LEAVE_TYPE_FALLBACK = [
  { code: 'CASUAL', label: 'Casual' },
  { code: 'SICK', label: 'Sick' },
  { code: 'EARNED', label: 'Earned' },
  { code: 'UNPAID', label: 'Unpaid' },
  { code: 'MATERNITY', label: 'Maternity' },
  { code: 'PATERNITY', label: 'Paternity' },
] as const;

export function labelFromOptions(
  options: readonly { code: string; label: string }[],
  code?: string | null,
) {
  if (!code) return '—';
  return options.find((o) => o.code === code)?.label ?? code;
}

export function lookupLabel(
  items: { code: string; label: string }[],
  code?: string | null,
) {
  if (!code) return '—';
  return items.find((i) => i.code === code)?.label ?? code;
}
