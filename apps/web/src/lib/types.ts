export type Role = 'ADMIN' | 'DELIVERY_MANAGER' | 'ACCOUNT_MANAGER';

export type EngagementHealth = 'ON_TRACK' | 'AT_RISK' | 'ESCALATED';

export type CandidateStatus = 'ACTIVE' | 'RELEASED';

export type ApprovalStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface PaginationMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface Client {
  id: string;
  name: string;
  code?: string | null;
  isActive?: boolean;
}

export interface Candidate {
  id: string;
  publicId: string;
  fullName: string;
  email?: string | null;
  mobile?: string | null;
  roleTitle?: string | null;
  joinedOn?: string | null;
  contractEndDate?: string | null;
  projectAccount?: string | null;
  workLocation?: string | null;
  clientReportingManager?: string | null;
  accountManagerUserId?: string | null;
  accountManager?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;
  hourlyRate?: number | null;
  hoursPerDay?: number | null;
  billingType?: 'HOURLY' | 'FIXED' | string;
  monthlyFixedAmount?: number | null;
  maxBillableHours?: number | null;
  currency?: string | null;
  status: CandidateStatus | string;
  clientId: string;
  client?: Client | null;
  clientName?: string | null;
  sstReference?: string | null;
  endDate?: string | null;
  releasedOn?: string | null;
  health?: EngagementHealth | string | null;
}

export interface Leave {
  id: string;
  publicId?: string;
  candidateId: string;
  candidate?: (Candidate & {
    client?: Client | null;
  }) | null;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  days?: number;
  reason?: string | null;
  status: ApprovalStatus | string;
  approver?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;
}

export interface Timesheet {
  id: string;
  publicId?: string;
  candidateId: string;
  candidate?: (Candidate & {
    client?: Client | null;
  }) | null;
  yearMonth: string;
  periodStart?: string;
  periodEnd?: string;
  workingDays: number;
  daysWorked?: number;
  leaveDays?: number;
  lopDays?: number;
  approvedLeaveDays?: number;
  attendancePct?: number | null;
  utilizationPct?: number | null;
  remarks?: string | null;
  status?: ApprovalStatus | string;
  approvalStatus?: ApprovalStatus | string;
  approvedBy?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;
}

export interface DeliveryReview {
  id: string;
  publicId?: string;
  candidateId: string;
  candidate?: (Candidate & {
    client?: Client | null;
    roleTitle?: string | null;
  }) | null;
  yearMonth: string;
  reviewDate?: string;
  utilizationPct?: number | null;
  timesheetMissing?: boolean;
  clientFeedback?: string | null;
  engagementHealth: EngagementHealth | string;
  escalationNotes?: string | null;
  reviewer?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;
}

export interface Invoice {
  id: string;
  publicId: string;
  candidateId: string;
  timesheetId: string;
  yearMonth: string;
  billingType?: 'HOURLY' | 'FIXED' | string;
  hourlyRate: number;
  hoursPerDay: number;
  monthlyFixedAmount?: number | null;
  maxBillableHours?: number | null;
  daysWorked: number;
  workingDays: number;
  lopDays?: number;
  billableDays?: number;
  rawHours?: number;
  billableHours?: number;
  amount: number;
  currency: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'SENT' | 'PAID' | 'REJECTED' | string;
  rejectionReason?: string | null;
  sentAt?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  candidate?: (Candidate & { client?: Client | null }) | null;
  timesheet?: {
    id: string;
    publicId?: string;
    yearMonth: string;
    workingDays: number;
    daysWorked: number;
    lopDays?: number;
    approvalStatus?: string;
  } | null;
  generatedBy?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;
  reviewedBy?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;
  reviewedAt?: string | null;
  createdAt?: string;
}

export interface UserRow {
  id: string;
  email: string;
  fullName: string;
  role: Role | string;
  isActive?: boolean;
}

export interface LookupValue {
  id: string;
  code: string;
  label: string;
  sortOrder?: number;
  isActive?: boolean;
  type?: string;
}

export interface AuditLog {
  id: string;
  createdAt: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  action?: string;
  entityType?: string;
  entityId?: string;
  summary?: string | null;
  changes?: unknown;
}

export interface DashboardHealthChartItem {
  key: string;
  label: string;
  count: number;
}

export interface DashboardTopClient {
  clientId?: string;
  name: string;
  activeHeadcount: number;
  avgUtilization?: number | null;
}

export interface DashboardHeadcountByClient {
  clientId: string;
  name: string;
  headcount: number;
}

export interface DashboardPaymentStatusItem {
  key: string;
  label: string;
  amount: number;
}

export interface DashboardRevenueTrendItem {
  month: string;
  label: string;
  revenue: number;
}

export interface DashboardClientRevenueItem {
  clientId: string;
  name: string;
  revenue: number;
}

export interface DashboardAtRiskClientItem {
  clientId: string;
  name: string;
  atRiskCount: number;
  escalatedCount: number;
}

export interface DashboardCharts {
  headcountByClient: DashboardHeadcountByClient[];
  paymentStatusByAmount: DashboardPaymentStatusItem[];
  invoiceStatusBars: DashboardPaymentStatusItem[];
  revenueTrendByMonth: DashboardRevenueTrendItem[];
  topClientsByRevenue: DashboardClientRevenueItem[];
  atRiskClients: DashboardAtRiskClientItem[];
}

export type DashboardKpiId =
  | 'active'
  | 'total'
  | 'on-track'
  | 'at-risk'
  | 'escalations'
  | 'released-total'
  | 'total-invoiced'
  | 'paid'
  | 'outstanding'
  | 'rejected-inv'
  | 'draft-inv'
  | 'overdue-inv'
  | 'pending-leave'
  | 'pending-ts'
  | 'missing-ts'
  | 'approved-ts'
  | 'on-leave'
  | 'avg-util'
  | 'avg-tat'
  | 'feedback';

export interface DashboardKpiDetailColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
}

export interface DashboardKpiDetailRow {
  id: string;
  entityType?: 'candidate' | 'invoice' | 'leave' | 'timesheet' | 'review';
  entityId?: string;
  [key: string]: string | number | null | undefined;
}

export interface DashboardKpiDetail {
  kpi: DashboardKpiId;
  title: string;
  columns: DashboardKpiDetailColumn[];
  rows: DashboardKpiDetailRow[];
}

export interface DashboardSummaryRaw {
  month?: string;
  activeCandidates?: number;
  totalCandidates?: number;
  onTrackEngagements?: number;
  atRiskEngagements?: number;
  escalations?: number;
  totalReleasedCandidates?: number;
  totalInvoiced?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  rejectedInvoices?: number;
  draftInvoices?: number;
  overdueInvoices?: number;
  onLeaveToday?: number;
  pendingLeaveApprovals?: number;
  pendingTimesheetApprovals?: number;
  approvedTimesheetsCount?: number;
  avgUtilizationPct?: number | null;
  avgPaymentTatDays?: number | null;
  releasedInMonth?: number;
  goodClientFeedback?: number;
  missingTimesheetsCount?: number;
  healthBreakdown?: {
    onTrack?: number;
    atRisk?: number;
    escalated?: number;
  };
  healthChart?: DashboardHealthChartItem[];
  topClients?: DashboardTopClient[];
  charts?: DashboardCharts;
}

export interface DashboardSummary {
  month: string;
  activeCandidates: number;
  totalCandidates: number;
  onTrackEngagements: number;
  atRiskEngagements: number;
  escalations: number;
  totalReleasedCandidates: number;
  totalInvoiced: number;
  paidAmount: number;
  outstandingAmount: number;
  rejectedInvoices: number;
  draftInvoices: number;
  overdueInvoices: number;
  onLeaveToday: number;
  pendingLeaveApprovals: number;
  pendingTimesheetApprovals: number;
  approvedTimesheetsCount: number;
  avgUtilizationPct: number | null;
  avgPaymentTatDays: number | null;
  releasedInMonth: number;
  goodClientFeedback: number;
  missingTimesheetsCount: number;
  healthBreakdown: {
    onTrack: number;
    atRisk: number;
    escalated: number;
  };
  healthChart: DashboardHealthChartItem[];
  topClients: DashboardTopClient[];
  charts: DashboardCharts;
}

export interface OverdueReviewsResult {
  month: string;
  previousMonth: string;
  count: number;
  items: Array<{
    id: string;
    publicId?: string;
    fullName: string;
    clientId?: string;
    client?: { id: string; name: string };
  }>;
}

export interface SearchHit {
  type?: string;
  id: string;
  publicId?: string;
  label: string;
  subtitle?: string | null;
  href?: string;
}

export interface TimelineEvent {
  id?: string;
  type?: string;
  at?: string;
  date?: string;
  title?: string;
  summary?: string;
  publicId?: string;
}
