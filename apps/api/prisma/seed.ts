import {
  ApprovalStatus,
  BenchFeedbackKind,
  BillingType,
  CandidateStatus,
  ClientFeedback,
  ClientOwnershipRole,
  EmployeeCategory,
  EmployeeTeam,
  EngagementHealth,
  InvoiceStatus,
  LeaveStatus,
  PrismaClient,
  Role,
} from '@prisma/client';
import { computeInvoiceBilling, formatPublicId } from '@cdt/shared-utils';
import { seedFoundation, upsertUser } from './seed-foundation';

const prisma = new PrismaClient();

function yearMonthFrom(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function periodBounds(yearMonth: string) {
  const [y, m] = yearMonth.split('-').map(Number);
  return {
    periodStart: new Date(Date.UTC(y, m - 1, 1)),
    periodEnd: new Date(Date.UTC(y, m, 0)),
  };
}

function previousYearMonth(yearMonth: string) {
  const { periodStart } = periodBounds(yearMonth);
  const prev = new Date(
    Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() - 1, 1),
  );
  return yearMonthFrom(prev);
}

function utcToday() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function addDays(d: Date, days: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days));
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function bumpIdSequence(
  organizationId: string,
  prefix: 'CD' | 'LV' | 'TSH' | 'DEL' | 'INV',
  atLeast: number,
) {
  const current = await prisma.idSequence.findUnique({
    where: { organizationId_prefix: { organizationId, prefix } },
  });
  if (!current) {
    await prisma.idSequence.create({
      data: { organizationId, prefix, nextValue: atLeast },
    });
    return;
  }
  if (current.nextValue < atLeast) {
    await prisma.idSequence.update({
      where: { organizationId_prefix: { organizationId, prefix } },
      data: { nextValue: atLeast },
    });
  }
}

type DemoCandidateSpec = {
  publicId: string;
  /** Required for BILLABLE; omit for NON_BILLABLE / BENCH. */
  clientCode?: string;
  fullName: string;
  roleTitle?: string;
  status: CandidateStatus;
  category?: EmployeeCategory;
  team?: EmployeeTeam;
  supportFunction?: string;
  benchStartDateOffsetDays?: number;
  interviewsScheduledCount?: number;
  interviewsClearedCount?: number;
  workLocation?: 'ONSITE' | 'REMOTE' | 'HYBRID';
  costCenter?: 'BRICKRED' | 'AGYOM';
  salesOwner?: 'am' | 'dm' | 'admin';
  contractEndsInDays?: number;
  releasedThisMonth?: boolean;
  releaseReason?: string;
  onLeaveToday?: boolean;
  pendingLeave?: boolean;
  rejectedLeave?: boolean;
  unpaidLeave?: boolean;
  leaveTypeCode?: string;
  billingType?: BillingType;
  monthlyFixedAmount?: number;
  maxBillableHours?: number;
  timesheet?: 'approved' | 'pending' | 'rejected' | 'none';
  utilization?: number;
  review?: {
    health: EngagementHealth;
    feedback: ClientFeedback;
  } | null;
  /** Skip previous-month review to surface overdue KPI. */
  skipPrevReview?: boolean;
  /** Seed DM + AO bench feedback rows. */
  benchFeedback?: boolean;
};

async function seedDemoPortfolio(
  organizationId: string,
  users: {
    admin: { id: string };
    dm: { id: string };
    am: { id: string };
  },
) {
  const today = utcToday();
  const month = yearMonthFrom(today);
  const prevMonth = previousYearMonth(month);
  const { periodStart, periodEnd } = periodBounds(month);
  const prevBounds = periodBounds(prevMonth);

  const clients = [
    { name: 'Acme Corporation', code: 'ACME', costCenter: 'BRICKRED' },
    { name: 'Globex Industries', code: 'GLOBEX', costCenter: 'BRICKRED' },
    { name: 'Initech Solutions', code: 'INITECH', costCenter: 'BRICKRED' },
    { name: 'Umbrella Health', code: 'UMBRELLA', costCenter: 'AGYOM' },
    { name: 'Stark Systems', code: 'STARK', costCenter: 'AGYOM' },
    { name: 'Wayne Logistics', code: 'WAYNE', costCenter: 'AGYOM' },
  ] as const;

  const clientByCode = new Map<string, { id: string; name: string; costCenter: string }>();
  for (const c of clients) {
    const nameNormalized = normalizeName(c.name);
    const row = await prisma.client.upsert({
      where: {
        organizationId_nameNormalized: { organizationId, nameNormalized },
      },
      update: {
        name: c.name,
        code: c.code,
        costCenter: c.costCenter,
        isActive: true,
        deletedAt: null,
      },
      create: {
        organizationId,
        name: c.name,
        nameNormalized,
        code: c.code,
        costCenter: c.costCenter,
      },
    });
    clientByCode.set(c.code, row);
  }

  // Delivery Owner and Account Owner on all demo clients (required for billable employees).
  for (const row of clientByCode.values()) {
    await prisma.clientOwnership.upsert({
      where: {
        clientId_userId_ownershipRole: {
          clientId: row.id,
          userId: users.dm.id,
          ownershipRole: ClientOwnershipRole.DELIVERY_OWNER,
        },
      },
      update: {},
      create: {
        organizationId,
        clientId: row.id,
        userId: users.dm.id,
        ownershipRole: ClientOwnershipRole.DELIVERY_OWNER,
      },
    });
    await prisma.clientOwnership.upsert({
      where: {
        clientId_userId_ownershipRole: {
          clientId: row.id,
          userId: users.am.id,
          ownershipRole: ClientOwnershipRole.ACCOUNT_OWNER,
        },
      },
      update: {},
      create: {
        organizationId,
        clientId: row.id,
        userId: users.am.id,
        ownershipRole: ClientOwnershipRole.ACCOUNT_OWNER,
      },
    });
  }

  const specs: DemoCandidateSpec[] = [
    // Acme — largest headcount
    {
      publicId: formatPublicId('CD', 1),
      clientCode: 'ACME',
      fullName: 'Aisha Rahman',
      roleTitle: 'Senior React Developer',
      status: CandidateStatus.ACTIVE,
      timesheet: 'approved',
      utilization: 96.5,
      billingType: BillingType.FIXED,
      monthlyFixedAmount: 176000,
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.GOOD },
    },
    {
      publicId: formatPublicId('CD', 2),
      clientCode: 'ACME',
      fullName: 'Ben Carter',
      roleTitle: 'Backend Engineer',
      status: CandidateStatus.ACTIVE,
      timesheet: 'approved',
      utilization: 91.0,
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.GOOD },
      onLeaveToday: true,
      unpaidLeave: true,
      billingType: BillingType.FIXED,
      monthlyFixedAmount: 160000,
      maxBillableHours: 150,
    },
    {
      publicId: formatPublicId('CD', 3),
      clientCode: 'ACME',
      fullName: 'Chloe Nguyen',
      roleTitle: 'QA Lead',
      status: CandidateStatus.ACTIVE,
      timesheet: 'pending',
      utilization: 88.0,
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.AVERAGE },
      pendingLeave: true,
    },
    {
      publicId: formatPublicId('CD', 4),
      clientCode: 'ACME',
      fullName: 'Daniel Okonkwo',
      roleTitle: 'DevOps Engineer',
      status: CandidateStatus.ACTIVE,
      timesheet: 'approved',
      utilization: 84.5,
      review: { health: EngagementHealth.AT_RISK, feedback: ClientFeedback.AVERAGE },
    },
    {
      publicId: formatPublicId('CD', 5),
      clientCode: 'ACME',
      fullName: 'Elena Petrov',
      roleTitle: 'Product Analyst',
      status: CandidateStatus.ACTIVE,
      timesheet: 'none',
      review: { health: EngagementHealth.AT_RISK, feedback: ClientFeedback.POOR },
      skipPrevReview: true,
    },
    {
      publicId: formatPublicId('CD', 6),
      clientCode: 'ACME',
      fullName: 'Farhan Ali',
      roleTitle: 'Full Stack Developer',
      status: CandidateStatus.RELEASED,
      releasedThisMonth: true,
      releaseReason: 'PROJECT_END',
      workLocation: 'ONSITE',
      timesheet: 'none',
      review: null,
    },

    // Globex
    {
      publicId: formatPublicId('CD', 7),
      clientCode: 'GLOBEX',
      fullName: 'Grace Miller',
      roleTitle: 'Java Developer',
      status: CandidateStatus.ACTIVE,
      timesheet: 'approved',
      utilization: 94.0,
      maxBillableHours: 150,
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.GOOD },
    },
    {
      publicId: formatPublicId('CD', 8),
      clientCode: 'GLOBEX',
      fullName: 'Hiro Tanaka',
      roleTitle: 'Data Engineer',
      status: CandidateStatus.ACTIVE,
      timesheet: 'approved',
      utilization: 89.5,
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.GOOD },
      onLeaveToday: true,
    },
    {
      publicId: formatPublicId('CD', 9),
      clientCode: 'GLOBEX',
      fullName: 'Isla Fernandez',
      roleTitle: 'Business Analyst',
      status: CandidateStatus.ACTIVE,
      timesheet: 'pending',
      utilization: 78.0,
      review: { health: EngagementHealth.AT_RISK, feedback: ClientFeedback.AVERAGE },
      pendingLeave: true,
    },
    {
      publicId: formatPublicId('CD', 10),
      clientCode: 'GLOBEX',
      fullName: 'Jamal Hassan',
      roleTitle: 'Solution Architect',
      status: CandidateStatus.ACTIVE,
      timesheet: 'none',
      review: null,
      skipPrevReview: true,
    },

    // Initech
    {
      publicId: formatPublicId('CD', 11),
      clientCode: 'INITECH',
      fullName: 'Kara Singh',
      roleTitle: 'Angular Developer',
      status: CandidateStatus.ACTIVE,
      timesheet: 'approved',
      utilization: 92.0,
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.GOOD },
    },
    {
      publicId: formatPublicId('CD', 12),
      clientCode: 'INITECH',
      fullName: 'Leo Martins',
      roleTitle: 'Scrum Master',
      status: CandidateStatus.ACTIVE,
      timesheet: 'approved',
      utilization: 87.5,
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.GOOD },
    },
    {
      publicId: formatPublicId('CD', 13),
      clientCode: 'INITECH',
      fullName: 'Maya Chen',
      roleTitle: 'UX Designer',
      status: CandidateStatus.ACTIVE,
      timesheet: 'pending',
      utilization: 72.0,
      review: { health: EngagementHealth.ESCALATED, feedback: ClientFeedback.POOR },
      pendingLeave: true,
    },
    {
      publicId: formatPublicId('CD', 14),
      clientCode: 'INITECH',
      fullName: 'Noah Brooks',
      roleTitle: 'Support Engineer',
      status: CandidateStatus.RELEASED,
      releasedThisMonth: true,
      releaseReason: 'CLIENT_REQUEST',
      workLocation: 'HYBRID',
      timesheet: 'none',
      review: null,
    },

    // Umbrella
    {
      publicId: formatPublicId('CD', 15),
      clientCode: 'UMBRELLA',
      fullName: 'Olivia Grant',
      roleTitle: 'Clinical Systems Analyst',
      status: CandidateStatus.ACTIVE,
      timesheet: 'approved',
      utilization: 95.0,
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.GOOD },
    },
    {
      publicId: formatPublicId('CD', 16),
      clientCode: 'UMBRELLA',
      fullName: 'Priya Desai',
      roleTitle: 'Integration Specialist',
      status: CandidateStatus.ACTIVE,
      timesheet: 'approved',
      utilization: 90.0,
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.GOOD },
      onLeaveToday: true,
    },
    {
      publicId: formatPublicId('CD', 17),
      clientCode: 'UMBRELLA',
      fullName: 'Quinn Adler',
      roleTitle: 'HL7 Developer',
      status: CandidateStatus.ACTIVE,
      timesheet: 'none',
      review: { health: EngagementHealth.AT_RISK, feedback: ClientFeedback.AVERAGE },
      skipPrevReview: true,
    },

    // Stark
    {
      publicId: formatPublicId('CD', 18),
      clientCode: 'STARK',
      fullName: 'Riley Kwon',
      roleTitle: 'Platform Engineer',
      status: CandidateStatus.ACTIVE,
      timesheet: 'approved',
      utilization: 93.5,
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.GOOD },
    },
    {
      publicId: formatPublicId('CD', 19),
      clientCode: 'STARK',
      fullName: 'Sofia Alvarez',
      roleTitle: 'Security Engineer',
      status: CandidateStatus.ACTIVE,
      timesheet: 'pending',
      utilization: 81.0,
      review: { health: EngagementHealth.ESCALATED, feedback: ClientFeedback.POOR },
      pendingLeave: true,
    },
    {
      publicId: formatPublicId('CD', 20),
      clientCode: 'STARK',
      fullName: 'Tom Hughes',
      roleTitle: 'SRE',
      status: CandidateStatus.ACTIVE,
      timesheet: 'approved',
      utilization: 86.0,
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.AVERAGE },
    },

    // Wayne
    {
      publicId: formatPublicId('CD', 21),
      clientCode: 'WAYNE',
      fullName: 'Uma Sharma',
      roleTitle: 'Logistics Analyst',
      status: CandidateStatus.ACTIVE,
      timesheet: 'approved',
      utilization: 88.5,
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.GOOD },
    },
    {
      publicId: formatPublicId('CD', 22),
      clientCode: 'WAYNE',
      fullName: 'Victor Lopez',
      roleTitle: 'Warehouse Systems Dev',
      status: CandidateStatus.ACTIVE,
      timesheet: 'pending',
      utilization: 76.5,
      review: { health: EngagementHealth.AT_RISK, feedback: ClientFeedback.AVERAGE },
    },
    {
      publicId: formatPublicId('CD', 23),
      clientCode: 'WAYNE',
      fullName: 'Wendy Park',
      roleTitle: 'Fleet Ops Lead',
      status: CandidateStatus.ACTIVE,
      timesheet: 'none',
      review: null,
      skipPrevReview: true,
      pendingLeave: true,
    },
    {
      publicId: formatPublicId('CD', 24),
      clientCode: 'WAYNE',
      fullName: 'Xavier Diaz',
      roleTitle: 'SQL Developer',
      status: CandidateStatus.RELEASED,
      releasedThisMonth: true,
      releaseReason: 'OTHER',
      workLocation: 'REMOTE',
      timesheet: 'none',
      review: null,
    },
    {
      publicId: formatPublicId('CD', 25),
      clientCode: 'ACME',
      fullName: 'Yara Haddad',
      roleTitle: 'Mobile Developer',
      status: CandidateStatus.ACTIVE,
      workLocation: 'HYBRID',
      salesOwner: 'am',
      contractEndsInDays: 45,
      timesheet: 'approved',
      utilization: 97.0,
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.GOOD },
    },

    // Coverage — rejected timesheet + rejected leave + EARNED leave type
    {
      publicId: formatPublicId('CD', 26),
      clientCode: 'ACME',
      fullName: 'Zane Ortiz',
      roleTitle: 'API Engineer',
      status: CandidateStatus.ACTIVE,
      workLocation: 'ONSITE',
      timesheet: 'rejected',
      utilization: 70.0,
      rejectedLeave: true,
      leaveTypeCode: 'EARNED',
      review: { health: EngagementHealth.AT_RISK, feedback: ClientFeedback.AVERAGE },
    },

    // Coverage — remaining leave types on active billables
    {
      publicId: formatPublicId('CD', 27),
      clientCode: 'GLOBEX',
      fullName: 'Ava Patel',
      roleTitle: 'Cloud Engineer',
      status: CandidateStatus.ACTIVE,
      workLocation: 'REMOTE',
      timesheet: 'approved',
      utilization: 85.0,
      pendingLeave: true,
      leaveTypeCode: 'LOP',
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.GOOD },
    },
    {
      publicId: formatPublicId('CD', 28),
      clientCode: 'STARK',
      fullName: 'Blake Morgan',
      roleTitle: 'iOS Developer',
      status: CandidateStatus.ACTIVE,
      workLocation: 'HYBRID',
      timesheet: 'pending',
      utilization: 80.0,
      pendingLeave: true,
      leaveTypeCode: 'PATERNITY',
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.AVERAGE },
    },
    {
      publicId: formatPublicId('CD', 29),
      clientCode: 'UMBRELLA',
      fullName: 'Clara Jensen',
      roleTitle: 'Nurse Systems Analyst',
      status: CandidateStatus.ACTIVE,
      workLocation: 'ONSITE',
      timesheet: 'approved',
      utilization: 82.0,
      pendingLeave: true,
      leaveTypeCode: 'MATERNITY',
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.GOOD },
    },

    // Non-billable — SUPPORT functions + Leadership + Delivery
    {
      publicId: formatPublicId('CD', 30),
      fullName: 'Deepti Nair',
      category: EmployeeCategory.NON_BILLABLE,
      team: EmployeeTeam.SUPPORT,
      supportFunction: 'HR',
      costCenter: 'BRICKRED',
      workLocation: 'HYBRID',
      status: CandidateStatus.ACTIVE,
      timesheet: 'none',
      review: null,
    },
    {
      publicId: formatPublicId('CD', 31),
      fullName: 'Ethan Cole',
      category: EmployeeCategory.NON_BILLABLE,
      team: EmployeeTeam.SUPPORT,
      supportFunction: 'TA',
      costCenter: 'BRICKRED',
      workLocation: 'REMOTE',
      status: CandidateStatus.ACTIVE,
      timesheet: 'none',
      review: null,
    },
    {
      publicId: formatPublicId('CD', 32),
      fullName: 'Fatima Noor',
      category: EmployeeCategory.NON_BILLABLE,
      team: EmployeeTeam.SUPPORT,
      supportFunction: 'ACCOUNTS',
      costCenter: 'AGYOM',
      workLocation: 'ONSITE',
      status: CandidateStatus.ACTIVE,
      timesheet: 'none',
      review: null,
    },
    {
      publicId: formatPublicId('CD', 33),
      fullName: 'Gavin Reed',
      category: EmployeeCategory.NON_BILLABLE,
      team: EmployeeTeam.SUPPORT,
      supportFunction: 'ADMIN',
      costCenter: 'BRICKRED',
      workLocation: 'ONSITE',
      status: CandidateStatus.ACTIVE,
      timesheet: 'none',
      review: null,
    },
    {
      publicId: formatPublicId('CD', 34),
      fullName: 'Helena Vu',
      category: EmployeeCategory.NON_BILLABLE,
      team: EmployeeTeam.SUPPORT,
      supportFunction: 'FINANCE',
      costCenter: 'AGYOM',
      workLocation: 'HYBRID',
      status: CandidateStatus.ACTIVE,
      timesheet: 'none',
      review: null,
    },
    {
      publicId: formatPublicId('CD', 35),
      fullName: 'Ian Brooks',
      category: EmployeeCategory.NON_BILLABLE,
      team: EmployeeTeam.LEADERSHIP,
      costCenter: 'BRICKRED',
      workLocation: 'REMOTE',
      status: CandidateStatus.ACTIVE,
      timesheet: 'none',
      review: null,
    },
    {
      publicId: formatPublicId('CD', 36),
      fullName: 'Jade Kim',
      category: EmployeeCategory.NON_BILLABLE,
      team: EmployeeTeam.DELIVERY,
      costCenter: 'AGYOM',
      workLocation: 'HYBRID',
      status: CandidateStatus.ACTIVE,
      timesheet: 'none',
      review: null,
    },

    // Bench — with / without interviews + feedback
    {
      publicId: formatPublicId('CD', 37),
      fullName: 'Kenji Sato',
      category: EmployeeCategory.BENCH,
      team: EmployeeTeam.DELIVERY,
      costCenter: 'BRICKRED',
      workLocation: 'REMOTE',
      benchStartDateOffsetDays: -40,
      interviewsScheduledCount: 3,
      interviewsClearedCount: 2,
      benchFeedback: true,
      status: CandidateStatus.ACTIVE,
      timesheet: 'none',
      review: null,
    },
    {
      publicId: formatPublicId('CD', 38),
      fullName: 'Lila Costa',
      category: EmployeeCategory.BENCH,
      team: EmployeeTeam.SUPPORT,
      supportFunction: 'TA',
      costCenter: 'AGYOM',
      workLocation: 'ONSITE',
      benchStartDateOffsetDays: -12,
      interviewsScheduledCount: 1,
      interviewsClearedCount: 1,
      benchFeedback: true,
      status: CandidateStatus.ACTIVE,
      timesheet: 'none',
      review: null,
    },
    {
      publicId: formatPublicId('CD', 39),
      fullName: 'Marco Rossi',
      category: EmployeeCategory.BENCH,
      team: EmployeeTeam.LEADERSHIP,
      costCenter: 'BRICKRED',
      workLocation: 'HYBRID',
      benchStartDateOffsetDays: -5,
      interviewsScheduledCount: 0,
      interviewsClearedCount: 0,
      status: CandidateStatus.ACTIVE,
      timesheet: 'none',
      review: null,
    },
  ];

  // Inactive client so Clients UI can show both active/inactive.
  await prisma.client.upsert({
    where: {
      organizationId_nameNormalized: {
        organizationId,
        nameNormalized: normalizeName('Archived Cobalt Corp'),
      },
    },
    update: {
      name: 'Archived Cobalt Corp',
      code: 'COBALT',
      costCenter: 'BRICKRED',
      isActive: false,
      deletedAt: null,
    },
    create: {
      organizationId,
      name: 'Archived Cobalt Corp',
      nameNormalized: normalizeName('Archived Cobalt Corp'),
      code: 'COBALT',
      costCenter: 'BRICKRED',
      isActive: false,
    },
  });

  // Inactive demo user for Users list coverage.
  const inactiveUser = await upsertUser(prisma, {
    organizationId,
    email: 'inactive.do@brickred.local',
    fullName: 'Inactive Delivery Owner',
    role: Role.DELIVERY_OWNER,
    password: process.env.SEED_DEMO_PASSWORD || process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
  });
  await prisma.user.update({
    where: { id: inactiveUser.id },
    data: { isActive: false },
  });

  let leaveSeq = 1;
  let tsSeq = 1;
  let delSeq = 1;

  for (const spec of specs) {
    const category = spec.category ?? EmployeeCategory.BILLABLE;
    const client = spec.clientCode ? clientByCode.get(spec.clientCode) : null;
    if (category === EmployeeCategory.BILLABLE && !client) {
      throw new Error(`Missing client ${spec.clientCode} for ${spec.publicId}`);
    }

    const releasedAt =
      spec.status === CandidateStatus.RELEASED && spec.releasedThisMonth
        ? addDays(periodStart, 10)
        : null;

    const salesOwnerUserId =
      spec.salesOwner === 'admin'
        ? users.admin.id
        : spec.salesOwner === 'dm'
          ? users.dm.id
          : spec.salesOwner === 'am'
            ? users.am.id
            : category === EmployeeCategory.BILLABLE
              ? users.dm.id
              : null;

    const costCenter =
      spec.costCenter ?? client?.costCenter ?? 'BRICKRED';
    const benchStartDate =
      category === EmployeeCategory.BENCH
        ? addDays(today, spec.benchStartDateOffsetDays ?? -14)
        : null;

    const candidateFields = {
      category,
      clientId: client?.id ?? null,
      fullName: spec.fullName,
      roleTitle: category === EmployeeCategory.BILLABLE ? (spec.roleTitle ?? null) : null,
      email: `${spec.fullName.toLowerCase().replace(/\s+/g, '.')}@demo.local`,
      mobile: `+9198${String(Number(spec.publicId.replace(/\D/g, ''))).padStart(8, '0')}`,
      status: spec.status,
      accountManagerUserId:
        category === EmployeeCategory.BILLABLE ? users.am.id : null,
      deliveryOwnerUserId:
        category === EmployeeCategory.BILLABLE ? users.dm.id : null,
      salesOwnerUserId,
      team: spec.team ?? null,
      supportFunction: spec.supportFunction ?? null,
      benchStartDate,
      interviewsScheduledCount:
        category === EmployeeCategory.BENCH
          ? (spec.interviewsScheduledCount ?? 0)
          : 0,
      interviewsClearedCount:
        category === EmployeeCategory.BENCH
          ? (spec.interviewsClearedCount ?? 0)
          : 0,
      billingType:
        category === EmployeeCategory.BILLABLE
          ? (spec.billingType ?? BillingType.HOURLY)
          : BillingType.HOURLY,
      hourlyRate: category === EmployeeCategory.BILLABLE ? 1000 : null,
      monthlyFixedAmount:
        category === EmployeeCategory.BILLABLE
          ? (spec.monthlyFixedAmount ?? null)
          : null,
      maxBillableHours:
        category === EmployeeCategory.BILLABLE
          ? (spec.maxBillableHours ?? null)
          : null,
      hoursPerDay: 8,
      currency: 'INR',
      costCenter,
      joinedOn: addDays(periodStart, -120),
      contractEndDate:
        spec.contractEndsInDays != null
          ? addDays(today, spec.contractEndsInDays)
          : null,
      clientReportingManager: null,
      workLocation: spec.workLocation ?? 'REMOTE',
      projectAccount: client?.name ?? null,
      releasedAt,
      releasedById: releasedAt ? users.dm.id : null,
      releaseReason: releasedAt
        ? (spec.releaseReason ?? 'PROJECT_END')
        : null,
      deletedAt: null,
    };

    const candidate = await prisma.candidate.upsert({
      where: {
        organizationId_publicId: {
          organizationId,
          publicId: spec.publicId,
        },
      },
      update: candidateFields,
      create: {
        organizationId,
        publicId: spec.publicId,
        ...candidateFields,
      },
    });

    if (spec.benchFeedback && category === EmployeeCategory.BENCH) {
      await prisma.candidateBenchFeedback.deleteMany({
        where: { candidateId: candidate.id },
      });
      await prisma.candidateBenchFeedback.createMany({
        data: [
          {
            organizationId,
            candidateId: candidate.id,
            kind: BenchFeedbackKind.DELIVERY_MANAGER,
            authorUserId: users.dm.id,
            feedbackDate: addDays(today, -7),
            body: 'Strong delivery profile; targeting mid-size React engagements.',
          },
          {
            organizationId,
            candidateId: candidate.id,
            kind: BenchFeedbackKind.ACCOUNT_OWNER,
            authorUserId: users.am.id,
            feedbackDate: addDays(today, -3),
            body: 'Client intros scheduled; keep interview pipeline warm.',
          },
        ],
      });
    }

    if (spec.onLeaveToday && spec.status === CandidateStatus.ACTIVE) {
      const publicId = formatPublicId('LV', leaveSeq++);
      const leaveTypeCode = spec.unpaidLeave
        ? 'UNPAID'
        : (spec.leaveTypeCode ?? 'CASUAL');
      await prisma.leave.upsert({
        where: { organizationId_publicId: { organizationId, publicId } },
        update: {
          candidateId: candidate.id,
          leaveTypeCode,
          startDate: addDays(today, -1),
          endDate: addDays(today, 2),
          days: 4,
          status: LeaveStatus.APPROVED,
          reason: leaveTypeCode === 'UNPAID' ? 'Unpaid personal leave' : 'Family travel',
          requestedById: users.dm.id,
          approverId: users.dm.id,
          approvedAt: addDays(today, -3),
          rejectedAt: null,
          rejectionReason: null,
          deletedAt: null,
        },
        create: {
          organizationId,
          publicId,
          candidateId: candidate.id,
          leaveTypeCode,
          startDate: addDays(today, -1),
          endDate: addDays(today, 2),
          days: 4,
          status: LeaveStatus.APPROVED,
          reason: leaveTypeCode === 'UNPAID' ? 'Unpaid personal leave' : 'Family travel',
          requestedById: users.dm.id,
          approverId: users.dm.id,
          approvedAt: addDays(today, -3),
        },
      });
    }

    if (spec.pendingLeave && spec.status === CandidateStatus.ACTIVE) {
      const publicId = formatPublicId('LV', leaveSeq++);
      const leaveTypeCode = spec.leaveTypeCode ?? 'SICK';
      await prisma.leave.upsert({
        where: { organizationId_publicId: { organizationId, publicId } },
        update: {
          candidateId: candidate.id,
          leaveTypeCode,
          startDate: addDays(today, 3),
          endDate: addDays(today, 4),
          days: 2,
          status: LeaveStatus.PENDING,
          reason: `Pending ${leaveTypeCode.toLowerCase()} leave request`,
          requestedById: users.dm.id,
          approverId: null,
          approvedAt: null,
          rejectedAt: null,
          rejectionReason: null,
          deletedAt: null,
        },
        create: {
          organizationId,
          publicId,
          candidateId: candidate.id,
          leaveTypeCode,
          startDate: addDays(today, 3),
          endDate: addDays(today, 4),
          days: 2,
          status: LeaveStatus.PENDING,
          reason: `Pending ${leaveTypeCode.toLowerCase()} leave request`,
          requestedById: users.dm.id,
        },
      });
    }

    if (spec.rejectedLeave && spec.status === CandidateStatus.ACTIVE) {
      const publicId = formatPublicId('LV', leaveSeq++);
      const leaveTypeCode = spec.leaveTypeCode ?? 'EARNED';
      await prisma.leave.upsert({
        where: { organizationId_publicId: { organizationId, publicId } },
        update: {
          candidateId: candidate.id,
          leaveTypeCode,
          startDate: addDays(today, 10),
          endDate: addDays(today, 12),
          days: 3,
          status: LeaveStatus.REJECTED,
          reason: 'Peak delivery week conflict',
          requestedById: users.dm.id,
          approverId: users.am.id,
          approvedAt: null,
          rejectedAt: addDays(today, -1),
          rejectionReason: 'Client sprint in progress; defer leave',
          deletedAt: null,
        },
        create: {
          organizationId,
          publicId,
          candidateId: candidate.id,
          leaveTypeCode,
          startDate: addDays(today, 10),
          endDate: addDays(today, 12),
          days: 3,
          status: LeaveStatus.REJECTED,
          reason: 'Peak delivery week conflict',
          requestedById: users.dm.id,
          approverId: users.am.id,
          rejectedAt: addDays(today, -1),
          rejectionReason: 'Client sprint in progress; defer leave',
        },
      });
    }

    if (
      spec.timesheet &&
      spec.timesheet !== 'none' &&
      spec.status === CandidateStatus.ACTIVE &&
      category === EmployeeCategory.BILLABLE
    ) {
      const publicId = formatPublicId('TSH', tsSeq++);
      const workingDays = 22;
      const leaveDays = spec.onLeaveToday ? 2 : 0;
      const lopDays = spec.unpaidLeave || spec.leaveTypeCode === 'LOP' ? leaveDays || 1 : 0;
      const daysWorked = workingDays - leaveDays;
      const attendancePct =
        spec.utilization ?? Math.round((daysWorked / workingDays) * 1000) / 10;
      const approvalStatus =
        spec.timesheet === 'approved'
          ? ApprovalStatus.APPROVED
          : spec.timesheet === 'rejected'
            ? ApprovalStatus.REJECTED
            : ApprovalStatus.PENDING;

      const data = {
        organizationId,
        candidateId: candidate.id,
        yearMonth: month,
        periodStart,
        periodEnd,
        workingDays,
        leaveDays,
        lopDays,
        daysWorked,
        attendancePct,
        approvalStatus,
        approvedById:
          approvalStatus === ApprovalStatus.PENDING ? null : users.dm.id,
        remarks:
          approvalStatus === ApprovalStatus.APPROVED
            ? 'Looks good'
            : approvalStatus === ApprovalStatus.REJECTED
              ? 'Hours do not match client attendance log'
              : 'Awaiting manager sign-off',
        deletedAt: null,
      };

      const byPair = await prisma.timesheet.findUnique({
        where: {
          candidateId_yearMonth: {
            candidateId: candidate.id,
            yearMonth: month,
          },
        },
      });
      const byPublicId = await prisma.timesheet.findUnique({
        where: { organizationId_publicId: { organizationId, publicId } },
      });

      if (byPair) {
        await prisma.timesheet.update({ where: { id: byPair.id }, data });
      } else if (byPublicId) {
        await prisma.timesheet.update({
          where: { id: byPublicId.id },
          data: { ...data, publicId },
        });
      } else {
        await prisma.timesheet.create({ data: { ...data, publicId } });
      }
    }

    if (
      spec.review &&
      spec.status === CandidateStatus.ACTIVE &&
      category === EmployeeCategory.BILLABLE
    ) {
      const publicId = formatPublicId('DEL', delSeq++);
      const data = {
        organizationId,
        candidateId: candidate.id,
        yearMonth: month,
        reviewDate: addDays(periodStart, 20),
        utilizationPct: spec.utilization ?? null,
        timesheetMissing: spec.timesheet === 'none',
        clientFeedback: spec.review.feedback,
        engagementHealth: spec.review.health,
        escalationNotes:
          spec.review.health === EngagementHealth.ESCALATED
            ? 'Client raised quality concerns; weekly check-ins scheduled.'
            : null,
        reviewerId: users.dm.id,
        deletedAt: null,
      };

      const byPair = await prisma.deliveryReview.findUnique({
        where: {
          candidateId_yearMonth: {
            candidateId: candidate.id,
            yearMonth: month,
          },
        },
      });
      const byPublicId = await prisma.deliveryReview.findUnique({
        where: { organizationId_publicId: { organizationId, publicId } },
      });

      if (byPair) {
        await prisma.deliveryReview.update({ where: { id: byPair.id }, data });
      } else if (byPublicId) {
        await prisma.deliveryReview.update({
          where: { id: byPublicId.id },
          data: { ...data, publicId },
        });
      } else {
        await prisma.deliveryReview.create({ data: { ...data, publicId } });
      }
    }

    // Previous-month review for most actives (so overdue alert only fires for skipPrevReview)
    if (
      spec.status === CandidateStatus.ACTIVE &&
      !spec.skipPrevReview &&
      category === EmployeeCategory.BILLABLE
    ) {
      const publicId = formatPublicId('DEL', delSeq++);
      const data = {
        organizationId,
        candidateId: candidate.id,
        yearMonth: prevMonth,
        reviewDate: addDays(prevBounds.periodStart, 18),
        utilizationPct: spec.utilization ?? 90,
        timesheetMissing: false,
        clientFeedback: ClientFeedback.GOOD,
        engagementHealth: EngagementHealth.ON_TRACK,
        reviewerId: users.dm.id,
        deletedAt: null,
      };

      const byPair = await prisma.deliveryReview.findUnique({
        where: {
          candidateId_yearMonth: {
            candidateId: candidate.id,
            yearMonth: prevMonth,
          },
        },
      });
      const byPublicId = await prisma.deliveryReview.findUnique({
        where: { organizationId_publicId: { organizationId, publicId } },
      });

      if (byPair) {
        await prisma.deliveryReview.update({ where: { id: byPair.id }, data });
      } else if (byPublicId) {
        await prisma.deliveryReview.update({
          where: { id: byPublicId.id },
          data: { ...data, publicId },
        });
      } else {
        await prisma.deliveryReview.create({ data: { ...data, publicId } });
      }
    }
  }

  await bumpIdSequence(organizationId, 'CD', specs.length + 1);
  await bumpIdSequence(organizationId, 'LV', leaveSeq);
  await bumpIdSequence(organizationId, 'TSH', tsSeq);
  await bumpIdSequence(organizationId, 'DEL', delSeq);

  // Sample audit trail so Audit page is non-empty.
  const sampleCandidate = await prisma.candidate.findFirst({
    where: { organizationId, publicId: formatPublicId('CD', 1) },
  });
  if (sampleCandidate) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        entityType: 'Candidate',
        entityId: sampleCandidate.id,
        entityPublicId: sampleCandidate.publicId,
        action: 'SEED_UPSERT',
        actorUserId: users.admin.id,
        afterJson: {
          fullName: sampleCandidate.fullName,
          status: sampleCandidate.status,
          category: sampleCandidate.category,
        },
        ip: '127.0.0.1',
        userAgent: 'cdt-seed/coverage',
      },
    });
  }

  return {
    month,
    clients: clients.length + 1,
    candidates: specs.length,
    billable: specs.filter(
      (s) => (s.category ?? EmployeeCategory.BILLABLE) === EmployeeCategory.BILLABLE,
    ).length,
    nonBillable: specs.filter((s) => s.category === EmployeeCategory.NON_BILLABLE)
      .length,
    bench: specs.filter((s) => s.category === EmployeeCategory.BENCH).length,
    active: specs.filter((s) => s.status === CandidateStatus.ACTIVE).length,
    onLeaveToday: specs.filter((s) => s.onLeaveToday).length,
    pendingLeave: specs.filter((s) => s.pendingLeave).length,
    rejectedLeave: specs.filter((s) => s.rejectedLeave).length,
    rejectedTimesheets: specs.filter((s) => s.timesheet === 'rejected').length,
    released: specs.filter((s) => s.releasedThisMonth).length,
    missingTs: specs.filter(
      (s) =>
        s.status === CandidateStatus.ACTIVE &&
        (s.category ?? EmployeeCategory.BILLABLE) === EmployeeCategory.BILLABLE &&
        s.timesheet === 'none',
    ).length,
    overdueReviews: specs.filter((s) => s.skipPrevReview).length,
  };
}

async function seedDemoInvoices(
  organizationId: string,
  users: {
    dm: { id: string };
    am: { id: string };
  },
  month: string,
) {
  const today = utcToday();

  // Drop prior demo invoices for this month so billing snapshots stay fresh.
  await prisma.invoice.deleteMany({ where: { organizationId, yearMonth: month } });

  const approvedTimesheets = await prisma.timesheet.findMany({
    where: {
      organizationId,
      deletedAt: null,
      yearMonth: month,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    include: { candidate: true, invoice: true },
    orderBy: { publicId: 'asc' },
  });

  if (approvedTimesheets.length < 6) {
    console.warn('Not enough approved timesheets to seed demo invoices');
    return { invoices: 0 };
  }

  type InvoiceSeedStatus =
    | 'PENDING_REVIEW'
    | 'APPROVED'
    | 'SENT'
    | 'SENT_OVERDUE'
    | 'PAID'
    | 'REJECTED';

  const statusPlan: InvoiceSeedStatus[] = [
    'PENDING_REVIEW',
    'PENDING_REVIEW',
    'APPROVED',
    'SENT',
    'SENT',
    'SENT_OVERDUE',
    'PAID',
    'PAID',
    'REJECTED',
  ];

  const existingInvoices = await prisma.invoice.findMany({
    where: { organizationId },
    select: { publicId: true },
  });
  let invSeq =
    existingInvoices.reduce((max, inv) => {
      const n = Number(inv.publicId.replace(/^INV-0*/, '') || 0);
      return Math.max(max, n);
    }, 0) + 1;

  let upserted = 0;

  for (let i = 0; i < Math.min(statusPlan.length, approvedTimesheets.length); i++) {
    const ts = approvedTimesheets[i];
    const plan = statusPlan[i];
    const billingType = ts.candidate.billingType ?? BillingType.HOURLY;
    const hourlyRate = Number(ts.candidate.hourlyRate) || 0;
    const hoursPerDay = Number(ts.candidate.hoursPerDay) || 8;
    const monthlyFixedAmount =
      ts.candidate.monthlyFixedAmount != null
        ? Number(ts.candidate.monthlyFixedAmount)
        : null;
    const maxBillableHours =
      ts.candidate.maxBillableHours != null
        ? Number(ts.candidate.maxBillableHours)
        : null;
    const daysWorked = Number(ts.daysWorked);
    const workingDays = Number(ts.workingDays);
    const lopDays = Number(ts.lopDays) || 0;
    const billing = computeInvoiceBilling({
      billingType,
      hourlyRate,
      hoursPerDay,
      monthlyFixedAmount,
      maxBillableHours,
      workingDays,
      lopDays,
    });
    const publicId = ts.invoice?.publicId ?? formatPublicId('INV', invSeq++);

    const sentAt =
      plan === 'SENT' || plan === 'SENT_OVERDUE' || plan === 'PAID'
        ? addDays(today, plan === 'PAID' ? -20 : plan === 'SENT_OVERDUE' ? -45 : -10)
        : null;
    const dueDate =
      plan === 'SENT'
        ? addDays(today, 15)
        : plan === 'SENT_OVERDUE'
          ? addDays(today, -10)
          : plan === 'PAID'
            ? addDays(today, -5)
            : null;
    const paidAt = plan === 'PAID' ? addDays(today, -5) : null;

    let status: InvoiceStatus;
    switch (plan) {
      case 'PENDING_REVIEW':
        status = InvoiceStatus.PENDING_REVIEW;
        break;
      case 'APPROVED':
        status = InvoiceStatus.APPROVED;
        break;
      case 'SENT':
      case 'SENT_OVERDUE':
        status = InvoiceStatus.SENT;
        break;
      case 'PAID':
        status = InvoiceStatus.PAID;
        break;
      case 'REJECTED':
        status = InvoiceStatus.REJECTED;
        break;
    }

    const reviewed =
      status !== InvoiceStatus.PENDING_REVIEW
        ? {
            reviewedById: users.am.id,
            reviewedAt: addDays(today, -25),
            rejectionReason:
              status === InvoiceStatus.REJECTED
                ? 'Rate mismatch with client PO'
                : null,
          }
        : {};

    const data = {
      organizationId,
      candidateId: ts.candidateId,
      yearMonth: month,
      billingType,
      hourlyRate,
      hoursPerDay,
      monthlyFixedAmount,
      maxBillableHours,
      daysWorked,
      workingDays,
      lopDays,
      billableDays: billing.billableDays,
      rawHours: billing.rawHours,
      billableHours: billing.billableHours,
      amount: billing.amount,
      currency: ts.candidate.currency || 'INR',
      status,
      generatedById: users.dm.id,
      sentAt,
      dueDate,
      paidAt,
      ...reviewed,
    };

    if (ts.invoice) {
      await prisma.invoice.update({
        where: { id: ts.invoice.id },
        data,
      });
    } else {
      await prisma.invoice.create({
        data: {
          publicId,
          timesheetId: ts.id,
          ...data,
        },
      });
    }
    upserted++;
  }

  // Prior-month paid invoice for revenue-trend charts.
  const prevMonth = previousYearMonth(month);
  const prevBounds = periodBounds(prevMonth);
  const prevCandidate = approvedTimesheets[0]?.candidate;
  if (prevCandidate) {
    const prevTsPublicId = formatPublicId('TSH', 900);
    const prevTsData = {
      organizationId,
      candidateId: prevCandidate.id,
      yearMonth: prevMonth,
      periodStart: prevBounds.periodStart,
      periodEnd: prevBounds.periodEnd,
      workingDays: 22,
      leaveDays: 0,
      lopDays: 0,
      daysWorked: 22,
      attendancePct: 100,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedById: users.dm.id,
      remarks: 'Prior month seed',
      deletedAt: null,
    };
    let prevTs = await prisma.timesheet.findUnique({
      where: {
        candidateId_yearMonth: {
          candidateId: prevCandidate.id,
          yearMonth: prevMonth,
        },
      },
      include: { invoice: true },
    });
    if (!prevTs) {
      prevTs = await prisma.timesheet.create({
        data: { ...prevTsData, publicId: prevTsPublicId },
        include: { invoice: true },
      });
    } else {
      prevTs = await prisma.timesheet.update({
        where: { id: prevTs.id },
        data: prevTsData,
        include: { invoice: true },
      });
    }

    const billingType = prevCandidate.billingType ?? BillingType.HOURLY;
    const hourlyRate = Number(prevCandidate.hourlyRate) || 1000;
    const hoursPerDay = Number(prevCandidate.hoursPerDay) || 8;
    const monthlyFixedAmount =
      prevCandidate.monthlyFixedAmount != null
        ? Number(prevCandidate.monthlyFixedAmount)
        : null;
    const maxBillableHours =
      prevCandidate.maxBillableHours != null
        ? Number(prevCandidate.maxBillableHours)
        : null;
    const billing = computeInvoiceBilling({
      billingType,
      hourlyRate,
      hoursPerDay,
      monthlyFixedAmount,
      maxBillableHours,
      workingDays: 22,
      lopDays: 0,
    });
    const prevInvPublicId = prevTs.invoice?.publicId ?? formatPublicId('INV', invSeq++);
    const prevInvData = {
      organizationId,
      candidateId: prevCandidate.id,
      yearMonth: prevMonth,
      billingType,
      hourlyRate,
      hoursPerDay,
      monthlyFixedAmount,
      maxBillableHours,
      daysWorked: 22,
      workingDays: 22,
      lopDays: 0,
      billableDays: billing.billableDays,
      rawHours: billing.rawHours,
      billableHours: billing.billableHours,
      amount: billing.amount,
      currency: prevCandidate.currency || 'INR',
      status: InvoiceStatus.PAID,
      generatedById: users.dm.id,
      reviewedById: users.am.id,
      reviewedAt: addDays(prevBounds.periodEnd, 2),
      sentAt: addDays(prevBounds.periodEnd, 3),
      dueDate: addDays(prevBounds.periodEnd, 18),
      paidAt: addDays(prevBounds.periodEnd, 10),
      rejectionReason: null,
    };
    if (prevTs.invoice) {
      await prisma.invoice.update({
        where: { id: prevTs.invoice.id },
        data: prevInvData,
      });
    } else {
      await prisma.invoice.create({
        data: {
          publicId: prevInvPublicId,
          timesheetId: prevTs.id,
          ...prevInvData,
        },
      });
    }
    upserted++;
  }

  await bumpIdSequence(organizationId, 'INV', invSeq);
  return { invoices: upserted };
}

async function main() {
  const { admin, dm, am, adminEmail, demoUsers } = await seedFoundation(prisma);

  const brickred = await prisma.organization.findUnique({
    where: { slug: 'brickred' },
  });
  if (!brickred) throw new Error('Missing brickred organization after seedFoundation');

  const demo = await seedDemoPortfolio(brickred.id, { admin, dm, am });
  const invoices = await seedDemoInvoices(brickred.id, { dm, am }, demo.month);

  console.log('Seed complete:', {
    admin: adminEmail,
    demoUsers,
    organization: brickred.slug,
    demo,
    invoices,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
