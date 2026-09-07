import {
  ApprovalStatus,
  BillingType,
  CandidateStatus,
  ClientFeedback,
  EngagementHealth,
  InvoiceStatus,
  LeaveStatus,
  PrismaClient,
} from '@prisma/client';
import { computeInvoiceBilling, formatPublicId } from '@cdt/shared-utils';
import { seedFoundation } from './seed-foundation';

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
  clientCode: string;
  fullName: string;
  roleTitle: string;
  status: CandidateStatus;
  releasedThisMonth?: boolean;
  onLeaveToday?: boolean;
  pendingLeave?: boolean;
  unpaidLeave?: boolean;
  billingType?: BillingType;
  monthlyFixedAmount?: number;
  maxBillableHours?: number;
  timesheet?: 'approved' | 'pending' | 'none';
  utilization?: number;
  review?: {
    health: EngagementHealth;
    feedback: ClientFeedback;
  } | null;
  /** Skip previous-month review to surface overdue KPI. */
  skipPrevReview?: boolean;
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
    { name: 'Acme Corporation', code: 'ACME' },
    { name: 'Globex Industries', code: 'GLOBEX' },
    { name: 'Initech Solutions', code: 'INITECH' },
    { name: 'Umbrella Health', code: 'UMBRELLA' },
    { name: 'Stark Systems', code: 'STARK' },
    { name: 'Wayne Logistics', code: 'WAYNE' },
  ] as const;

  const clientByCode = new Map<string, { id: string; name: string }>();
  for (const c of clients) {
    const nameNormalized = normalizeName(c.name);
    const row = await prisma.client.upsert({
      where: {
        organizationId_nameNormalized: { organizationId, nameNormalized },
      },
      update: {
        name: c.name,
        code: c.code,
        isActive: true,
        deletedAt: null,
      },
      create: {
        organizationId,
        name: c.name,
        nameNormalized,
        code: c.code,
      },
    });
    clientByCode.set(c.code, row);
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
      timesheet: 'none',
      review: null,
    },
    {
      publicId: formatPublicId('CD', 25),
      clientCode: 'ACME',
      fullName: 'Yara Haddad',
      roleTitle: 'Mobile Developer',
      status: CandidateStatus.ACTIVE,
      timesheet: 'approved',
      utilization: 97.0,
      review: { health: EngagementHealth.ON_TRACK, feedback: ClientFeedback.GOOD },
    },
  ];

  let leaveSeq = 1;
  let tsSeq = 1;
  let delSeq = 1;

  for (const spec of specs) {
    const client = clientByCode.get(spec.clientCode);
    if (!client) throw new Error(`Missing client ${spec.clientCode}`);

    const releasedAt =
      spec.status === CandidateStatus.RELEASED && spec.releasedThisMonth
        ? addDays(periodStart, 10)
        : null;

    const candidate = await prisma.candidate.upsert({
      where: {
        organizationId_publicId: {
          organizationId,
          publicId: spec.publicId,
        },
      },
      update: {
        clientId: client.id,
        fullName: spec.fullName,
        roleTitle: spec.roleTitle,
        email: `${spec.fullName.toLowerCase().replace(/\s+/g, '.')}@demo.local`,
        status: spec.status,
        accountManagerUserId: users.am.id,
        billingType: spec.billingType ?? BillingType.HOURLY,
        hourlyRate: 1000,
        monthlyFixedAmount: spec.monthlyFixedAmount ?? null,
        maxBillableHours: spec.maxBillableHours ?? null,
        hoursPerDay: 8,
        currency: 'INR',
        joinedOn: addDays(periodStart, -120),
        releasedAt,
        releasedById: releasedAt ? users.dm.id : null,
        releaseReason: releasedAt ? 'PROJECT_END' : null,
        deletedAt: null,
      },
      create: {
        organizationId,
        publicId: spec.publicId,
        clientId: client.id,
        fullName: spec.fullName,
        roleTitle: spec.roleTitle,
        email: `${spec.fullName.toLowerCase().replace(/\s+/g, '.')}@demo.local`,
        status: spec.status,
        accountManagerUserId: users.am.id,
        billingType: spec.billingType ?? BillingType.HOURLY,
        hourlyRate: 1000,
        monthlyFixedAmount: spec.monthlyFixedAmount ?? null,
        maxBillableHours: spec.maxBillableHours ?? null,
        hoursPerDay: 8,
        currency: 'INR',
        joinedOn: addDays(periodStart, -120),
        releasedAt,
        releasedById: releasedAt ? users.dm.id : null,
        releaseReason: releasedAt ? 'PROJECT_END' : null,
        workLocation: 'REMOTE',
        projectAccount: client.name,
      },
    });

    if (spec.onLeaveToday && spec.status === CandidateStatus.ACTIVE) {
      const publicId = formatPublicId('LV', leaveSeq++);
      const leaveTypeCode = spec.unpaidLeave ? 'UNPAID' : 'CASUAL';
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
      await prisma.leave.upsert({
        where: { organizationId_publicId: { organizationId, publicId } },
        update: {
          candidateId: candidate.id,
          leaveTypeCode: 'SICK',
          startDate: addDays(today, 3),
          endDate: addDays(today, 4),
          days: 2,
          status: LeaveStatus.PENDING,
          reason: 'Medical appointment',
          requestedById: users.dm.id,
          approverId: null,
          approvedAt: null,
          deletedAt: null,
        },
        create: {
          organizationId,
          publicId,
          candidateId: candidate.id,
          leaveTypeCode: 'SICK',
          startDate: addDays(today, 3),
          endDate: addDays(today, 4),
          days: 2,
          status: LeaveStatus.PENDING,
          reason: 'Medical appointment',
          requestedById: users.dm.id,
        },
      });
    }

    if (spec.timesheet && spec.timesheet !== 'none' && spec.status === CandidateStatus.ACTIVE) {
      const publicId = formatPublicId('TSH', tsSeq++);
      const workingDays = 22;
      const leaveDays = spec.onLeaveToday ? 2 : 0;
      const lopDays = spec.unpaidLeave ? leaveDays : 0;
      const daysWorked = workingDays - leaveDays;
      const attendancePct =
        spec.utilization ?? Math.round((daysWorked / workingDays) * 1000) / 10;
      const approved = spec.timesheet === 'approved';

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
        approvalStatus: approved
          ? ApprovalStatus.APPROVED
          : ApprovalStatus.PENDING,
        approvedById: approved ? users.dm.id : null,
        remarks: approved ? 'Looks good' : 'Awaiting manager sign-off',
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

    if (spec.review && spec.status === CandidateStatus.ACTIVE) {
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
    if (spec.status === CandidateStatus.ACTIVE && !spec.skipPrevReview) {
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

  await bumpIdSequence(organizationId, 'CD', 26);
  await bumpIdSequence(organizationId, 'LV', leaveSeq);
  await bumpIdSequence(organizationId, 'TSH', tsSeq);
  await bumpIdSequence(organizationId, 'DEL', delSeq);

  return {
    month,
    clients: clients.length,
    candidates: specs.length,
    active: specs.filter((s) => s.status === CandidateStatus.ACTIVE).length,
    onLeaveToday: specs.filter((s) => s.onLeaveToday).length,
    pendingLeave: specs.filter((s) => s.pendingLeave).length,
    released: specs.filter((s) => s.releasedThisMonth).length,
    missingTs: specs.filter(
      (s) => s.status === CandidateStatus.ACTIVE && s.timesheet === 'none',
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
