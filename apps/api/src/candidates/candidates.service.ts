import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CandidateStatus,
  ClientOwnershipRole,
  EmployeeCategory,
  Prisma,
} from '@prisma/client';
import { assertCostCenterCode } from '../common/cost-center';
import { assertActiveLookupCode } from '../common/lookup-codes';
import { paginationMeta, paginationSkip } from '@cdt/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { IdSequenceService } from '../common/id-sequence.service';
import { AuditService } from '../audit/audit.service';
import {
  assertClientAccess,
  canAccessCandidate,
  candidateAccessWhere,
  resolveOwnedClientIds,
  withCostCenterFilter,
} from '../common/client-scope';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import {
  dueTimesheetMonths,
  isUuid,
  missingDueTimesheetMonths,
  utcToday,
} from '../common/dates';
import { toNumber } from '../common/prisma-error';
import {
  CreateBenchFeedbackDto,
  CreateCandidateDto,
  ReleaseCandidateDto,
  UpdateCandidateDto,
} from './dto/candidates.dto';
import {
  computeBenchAging,
  normalizeEmployeeCategory,
  type CategoryFieldInput,
} from './employee-category';

const userBrief = { id: true, fullName: true, email: true } as const;

const candidateInclude: Prisma.CandidateInclude = {
  client: {
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
    },
  },
  accountManager: { select: userBrief },
  deliveryOwner: { select: userBrief },
  salesOwner: { select: userBrief },
  benchFeedback: {
    orderBy: [{ feedbackDate: 'desc' }, { createdAt: 'desc' }],
    take: 20,
    include: { author: { select: userBrief } },
  },
};

const candidateDetailInclude: Prisma.CandidateInclude = {
  ...candidateInclude,
};

type CandidateReader = Pick<AuthUser, 'id' | 'role' | 'organizationId'>;

function isoDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdSequenceService,
    private readonly audit: AuditService,
  ) {}

  private async missingTimesheetMonthsForCandidate(candidate: {
    organizationId: string;
    id: string;
    status: CandidateStatus;
    category: EmployeeCategory;
    joinedOn: Date | null;
    contractEndDate: Date | null;
    releasedAt: Date | null;
  }): Promise<string[]> {
    if (candidate.category !== EmployeeCategory.BILLABLE) return [];
    const due = dueTimesheetMonths(candidate, utcToday());
    if (!due.length) return [];
    const existing = await this.prisma.timesheet.findMany({
      where: {
        organizationId: candidate.organizationId,
        candidateId: candidate.id,
        deletedAt: null,
        yearMonth: { in: due },
      },
      select: { yearMonth: true },
    });
    return missingDueTimesheetMonths(
      candidate,
      existing.map((t) => t.yearMonth),
      utcToday(),
    );
  }

  private serialize<
    T extends {
      hourlyRate?: Prisma.Decimal | number | null;
      hoursPerDay?: Prisma.Decimal | number | null;
      monthlyFixedAmount?: Prisma.Decimal | number | null;
      maxBillableHours?: Prisma.Decimal | number | null;
      category?: EmployeeCategory;
      benchStartDate?: Date | null;
    },
  >(row: T, extra?: Record<string, unknown>) {
    return {
      ...row,
      hourlyRate: toNumber(row.hourlyRate ?? null),
      hoursPerDay: toNumber(row.hoursPerDay ?? null),
      monthlyFixedAmount: toNumber(row.monthlyFixedAmount ?? null),
      maxBillableHours: toNumber(row.maxBillableHours ?? null),
      benchAging:
        row.category === EmployeeCategory.BENCH
          ? computeBenchAging(row.benchStartDate)
          : null,
      ...extra,
    };
  }

  private resolveWhere(
    organizationId: string,
    idOrPublicId: string,
  ): Prisma.CandidateWhereInput {
    if (isUuid(idOrPublicId)) {
      return { id: idOrPublicId, organizationId, deletedAt: null };
    }
    if (idOrPublicId.toUpperCase().startsWith('CD-')) {
      return {
        publicId: idOrPublicId.toUpperCase(),
        organizationId,
        deletedAt: null,
      };
    }
    return { publicId: idOrPublicId, organizationId, deletedAt: null };
  }

  private async loadVisible(
    user: CandidateReader,
    idOrPublicId: string,
    include: Prisma.CandidateInclude,
  ) {
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, user);
    const candidate = await this.prisma.candidate.findFirst({
      where: this.resolveWhere(user.organizationId, idOrPublicId),
      include,
    });
    if (
      !candidate ||
      !canAccessCandidate(user.role, ownedClientIds, candidate)
    ) {
      throw new NotFoundException('Candidate not found');
    }
    return candidate;
  }

  async findAll(params: {
    user: CandidateReader;
    page?: number;
    pageSize?: number;
    clientId?: string;
    status?: CandidateStatus;
    statuses?: CandidateStatus[];
    q?: string;
    costCenter?: string;
    category?: EmployeeCategory;
    team?: string;
    supportFunction?: string;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    if (
      params.category &&
      !Object.values(EmployeeCategory).includes(params.category)
    ) {
      throw new BadRequestException('Invalid category');
    }
    const teamFilter = params.team?.trim().toUpperCase() || undefined;
    const supportFunction = params.supportFunction?.trim().toUpperCase() || undefined;
    if (
      supportFunction &&
      !['HR', 'TA', 'ACCOUNTS', 'ADMIN', 'FINANCE'].includes(supportFunction)
    ) {
      throw new BadRequestException('Invalid role');
    }
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, params.user);
    const access = candidateAccessWhere(
      params.user.role,
      ownedClientIds,
      params.clientId,
    );
    if (access === null) {
      return { items: [], meta: paginationMeta(0, page, pageSize) };
    }
    const costCenter = withCostCenterFilter(params.costCenter);
    const where: Prisma.CandidateWhereInput = {
      organizationId: params.user.organizationId,
      deletedAt: null,
      AND: [
        access,
        ...(costCenter ? [{ costCenter }] : []),
        ...(params.category ? [{ category: params.category }] : []),
        ...(teamFilter ? [{ team: teamFilter }] : []),
        ...(supportFunction ? [{ supportFunction }] : []),
        ...(params.statuses?.length
          ? [{ status: { in: params.statuses } }]
          : params.status
            ? [{ status: params.status }]
            : []),
        ...(params.q
          ? [
              {
                OR: [
                  { fullName: { contains: params.q, mode: 'insensitive' as const } },
                  { publicId: { contains: params.q, mode: 'insensitive' as const } },
                  { email: { contains: params.q, mode: 'insensitive' as const } },
                ],
              },
            ]
          : []),
      ],
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.candidate.count({ where }),
      this.prisma.candidate.findMany({
        where,
        include: candidateInclude,
        orderBy: { createdAt: 'desc' },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
      }),
    ]);
    return {
      items: items.map((item) => this.serialize(item)),
      meta: paginationMeta(total, page, pageSize),
    };
  }

  async findOne(user: CandidateReader, idOrPublicId: string) {
    const candidate = await this.loadVisible(
      user,
      idOrPublicId,
      candidateDetailInclude,
    );
    const missingTimesheetMonths =
      await this.missingTimesheetMonthsForCandidate(candidate);
    return this.serialize(candidate, { missingTimesheetMonths });
  }

  private async resolveRequiredClientOwnerUserId(
    organizationId: string,
    clientId: string,
    ownershipRole: ClientOwnershipRole,
    requestedId?: string | null,
  ): Promise<string> {
    const owners = await this.prisma.clientOwnership.findMany({
      where: {
        organizationId,
        clientId,
        ownershipRole,
      },
      select: { userId: true },
      orderBy: { createdAt: 'asc' },
    });
    const ownerIds = owners.map((o) => o.userId);
    const label =
      ownershipRole === ClientOwnershipRole.DELIVERY_OWNER
        ? 'Delivery owner'
        : 'Account owner';
    if (!ownerIds.length) {
      throw new BadRequestException(
        `Client has no ${label.toLowerCase()} assigned`,
      );
    }
    if (requestedId) {
      if (!ownerIds.includes(requestedId)) {
        throw new BadRequestException(
          `${label} must be assigned to the selected client`,
        );
      }
      return requestedId;
    }
    return ownerIds[0]!;
  }

  private async assertSalesOwner(
    organizationId: string,
    userId: string | null,
  ) {
    if (!userId) return;
    const owner = await this.prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!owner) {
      throw new BadRequestException('Sales owner was not found');
    }
  }

  private async prepareCategory(
    user: CandidateReader,
    input: CategoryFieldInput,
  ) {
    const normalized = normalizeEmployeeCategory(input);
    if (normalized.team) {
      await assertActiveLookupCode(
        this.prisma,
        'EMPLOYEE_TEAM',
        normalized.team,
        'Team',
      );
    }
    if (normalized.category === EmployeeCategory.BILLABLE && normalized.clientId) {
      const ownedClientIds = await resolveOwnedClientIds(this.prisma, user);
      assertClientAccess(ownedClientIds, normalized.clientId);
      const client = await this.prisma.client.findFirst({
        where: {
          id: normalized.clientId,
          organizationId: user.organizationId,
          deletedAt: null,
        },
      });
      if (!client) throw new NotFoundException('Client not found');
      await this.assertSalesOwner(
        user.organizationId,
        normalized.salesOwnerUserId,
      );
    }
    return normalized;
  }

  async create(user: CandidateReader, dto: CreateCandidateDto) {
    const organizationId = user.organizationId;
    const costCenter = await assertCostCenterCode(this.prisma, dto.costCenter);
    const normalized = await this.prepareCategory(user, dto);
    const billable = normalized.category === EmployeeCategory.BILLABLE;
    const accountManagerUserId =
      billable && normalized.clientId
        ? await this.resolveRequiredClientOwnerUserId(
            organizationId,
            normalized.clientId,
            ClientOwnershipRole.ACCOUNT_OWNER,
            dto.accountManagerUserId,
          )
        : null;
    const deliveryOwnerUserId =
      billable && normalized.clientId
        ? await this.resolveRequiredClientOwnerUserId(
            organizationId,
            normalized.clientId,
            ClientOwnershipRole.DELIVERY_OWNER,
            dto.deliveryOwnerUserId,
          )
        : null;

    const publicId = await this.ids.allocateNext(organizationId, 'CD');
    const candidate = await this.prisma.candidate.create({
      data: {
        organizationId,
        publicId,
        category: normalized.category,
        clientId: normalized.clientId,
        fullName: dto.fullName.trim(),
        email: dto.email?.trim() || null,
        mobile: dto.mobile?.trim() || null,
        roleTitle: billable ? dto.roleTitle?.trim() || null : null,
        sstReference: billable ? dto.sstReference?.trim() || null : null,
        joinedOn: dto.joinedOn ? new Date(dto.joinedOn) : null,
        contractEndDate: dto.contractEndDate
          ? new Date(dto.contractEndDate)
          : null,
        projectAccount: billable ? dto.projectAccount?.trim() || null : null,
        workLocation: billable ? dto.workLocation?.trim() || null : null,
        costCenter,
        clientReportingManager: null,
        accountManagerUserId,
        deliveryOwnerUserId,
        salesOwnerUserId: normalized.salesOwnerUserId,
        team: normalized.team,
        supportFunction: normalized.supportFunction,
        benchStartDate: normalized.benchStartDate,
        interviewsScheduledCount: normalized.interviewsScheduledCount,
        interviewsClearedCount: normalized.interviewsClearedCount,
        interviewRemark: normalized.interviewRemark,
        billingType: dto.billingType ?? 'HOURLY',
        hourlyRate: billable ? dto.hourlyRate ?? null : null,
        monthlyFixedAmount: billable ? dto.monthlyFixedAmount ?? null : null,
        maxBillableHours: billable ? dto.maxBillableHours ?? null : null,
        hoursPerDay:
          dto.billingType === 'FIXED' ? 8 : (dto.hoursPerDay ?? 8),
        currency: dto.currency?.trim() || 'INR',
        status: CandidateStatus.ACTIVE,
      },
      include: candidateInclude,
    });
    await this.audit.record({
      organizationId,
      actorUserId: user.id,
      action: 'CREATE',
      entityType: 'Candidate',
      entityId: candidate.id,
      entityPublicId: candidate.publicId,
      after: candidate,
    });
    return this.serialize(candidate);
  }

  async update(
    user: CandidateReader,
    idOrPublicId: string,
    dto: UpdateCandidateDto,
  ) {
    const organizationId = user.organizationId;
    const before = await this.loadVisible(
      user,
      idOrPublicId,
      candidateDetailInclude,
    );
    const category = dto.category ?? before.category;
    const normalized = await this.prepareCategory(user, {
      category,
      clientId: dto.clientId !== undefined ? dto.clientId : before.clientId,
      team: dto.team !== undefined ? dto.team : before.team,
      supportFunction:
        dto.supportFunction !== undefined
          ? dto.supportFunction
          : dto.team !== undefined && dto.team !== 'SUPPORT'
            ? null
            : before.supportFunction,
      salesOwnerUserId:
        dto.salesOwnerUserId !== undefined
          ? dto.salesOwnerUserId
          : before.salesOwnerUserId,
      benchStartDate:
        dto.benchStartDate !== undefined
          ? dto.benchStartDate
          : isoDate(before.benchStartDate),
      interviewsScheduledCount:
        dto.interviewsScheduledCount !== undefined
          ? dto.interviewsScheduledCount
          : before.interviewsScheduledCount,
      interviewsClearedCount:
        dto.interviewsClearedCount !== undefined
          ? dto.interviewsClearedCount
          : before.interviewsClearedCount,
      interviewRemark:
        dto.interviewRemark !== undefined
          ? dto.interviewRemark
          : before.interviewRemark,
    });
    const billable = normalized.category === EmployeeCategory.BILLABLE;
    const data: Prisma.CandidateUncheckedUpdateInput = {
      category: normalized.category,
      clientId: normalized.clientId,
      team: normalized.team,
      supportFunction: normalized.supportFunction,
      salesOwnerUserId: normalized.salesOwnerUserId,
      benchStartDate: normalized.benchStartDate,
      interviewsScheduledCount: normalized.interviewsScheduledCount,
      interviewsClearedCount: normalized.interviewsClearedCount,
      interviewRemark: normalized.interviewRemark,
    };
    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.mobile !== undefined) data.mobile = dto.mobile?.trim() || null;
    if (dto.joinedOn !== undefined)
      data.joinedOn = dto.joinedOn ? new Date(dto.joinedOn) : null;
    if (dto.contractEndDate !== undefined)
      data.contractEndDate = dto.contractEndDate
        ? new Date(dto.contractEndDate)
        : null;
    if (dto.costCenter !== undefined) {
      data.costCenter = await assertCostCenterCode(this.prisma, dto.costCenter);
    }
    if (dto.status !== undefined) data.status = dto.status;

    if (billable) {
      if (dto.roleTitle !== undefined)
        data.roleTitle = dto.roleTitle?.trim() || null;
      const requestedAccountManager =
        dto.accountManagerUserId !== undefined
          ? dto.accountManagerUserId
          : before.accountManagerUserId;
      const requestedDeliveryOwner =
        dto.deliveryOwnerUserId !== undefined
          ? dto.deliveryOwnerUserId
          : before.deliveryOwnerUserId;
      if (!normalized.clientId) {
        throw new BadRequestException('A billable employee requires a client');
      }
      data.accountManagerUserId = await this.resolveRequiredClientOwnerUserId(
        organizationId,
        normalized.clientId,
        ClientOwnershipRole.ACCOUNT_OWNER,
        requestedAccountManager,
      );
      data.deliveryOwnerUserId = await this.resolveRequiredClientOwnerUserId(
        organizationId,
        normalized.clientId,
        ClientOwnershipRole.DELIVERY_OWNER,
        requestedDeliveryOwner,
      );
      data.clientReportingManager = null;
      if (dto.sstReference !== undefined)
        data.sstReference = dto.sstReference?.trim() || null;
      if (dto.projectAccount !== undefined)
        data.projectAccount = dto.projectAccount?.trim() || null;
      if (dto.workLocation !== undefined)
        data.workLocation = dto.workLocation?.trim() || null;
      if (dto.hourlyRate !== undefined) data.hourlyRate = dto.hourlyRate;
      if (dto.billingType !== undefined) data.billingType = dto.billingType;
      if (dto.monthlyFixedAmount !== undefined)
        data.monthlyFixedAmount = dto.monthlyFixedAmount;
      if (dto.maxBillableHours !== undefined)
        data.maxBillableHours = dto.maxBillableHours;
      if (dto.hoursPerDay !== undefined) data.hoursPerDay = dto.hoursPerDay;
      if (dto.currency !== undefined) data.currency = dto.currency.trim() || 'INR';
    } else {
      data.roleTitle = null;
      data.accountManagerUserId = null;
      data.deliveryOwnerUserId = null;
      data.clientReportingManager = null;
      data.projectAccount = null;
      data.workLocation = null;
      data.sstReference = null;
    }

    const candidate = await this.prisma.candidate.update({
      where: { id: before.id },
      data,
      include: candidateDetailInclude,
    });
    await this.audit.record({
      organizationId,
      actorUserId: user.id,
      action: 'UPDATE',
      entityType: 'Candidate',
      entityId: candidate.id,
      entityPublicId: candidate.publicId,
      before,
      after: candidate,
    });
    const missingTimesheetMonths =
      await this.missingTimesheetMonthsForCandidate(candidate);
    return this.serialize(candidate, { missingTimesheetMonths });
  }

  async release(
    user: CandidateReader,
    idOrPublicId: string,
    dto: ReleaseCandidateDto,
  ) {
    const before = await this.findOne(user, idOrPublicId);
    if (before.status === CandidateStatus.RELEASED) {
      throw new BadRequestException('Candidate is already released');
    }
    if (!dto.contractEndDate) {
      throw new BadRequestException('contractEndDate is required to release');
    }
    const candidate = await this.prisma.candidate.update({
      where: { id: before.id },
      data: {
        status: CandidateStatus.RELEASED,
        contractEndDate: new Date(dto.contractEndDate),
        releasedAt: new Date(),
        releasedById: user.id,
        releaseReason: dto.releaseReason?.trim() || null,
      },
      include: candidateDetailInclude,
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'RELEASE',
      entityType: 'Candidate',
      entityId: candidate.id,
      entityPublicId: candidate.publicId,
      before,
      after: candidate,
    });
    const missingTimesheetMonths =
      await this.missingTimesheetMonthsForCandidate(candidate);
    return this.serialize(candidate, { missingTimesheetMonths });
  }

  async addBenchFeedback(
    user: CandidateReader,
    idOrPublicId: string,
    dto: CreateBenchFeedbackDto,
  ) {
    const before = await this.loadVisible(
      user,
      idOrPublicId,
      candidateDetailInclude,
    );
    if (before.category !== EmployeeCategory.BENCH) {
      throw new BadRequestException(
        'Bench feedback can only be added for employees on the bench',
      );
    }
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Feedback is required');
    }
    await this.prisma.candidateBenchFeedback.create({
      data: {
        organizationId: user.organizationId,
        candidateId: before.id,
        kind: dto.kind,
        authorUserId: user.id,
        feedbackDate: new Date(dto.feedbackDate),
        body,
      },
    });
    return this.findOne(user, before.id);
  }

  async softDelete(user: CandidateReader, idOrPublicId: string) {
    const before = await this.findOne(user, idOrPublicId);
    const candidate = await this.prisma.candidate.update({
      where: { id: before.id },
      data: { deletedAt: new Date() },
      include: candidateInclude,
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'DELETE',
      entityType: 'Candidate',
      entityId: candidate.id,
      entityPublicId: candidate.publicId,
      before,
      after: candidate,
    });
    return { success: true };
  }

  async timeline(user: CandidateReader, idOrPublicId: string) {
    const organizationId = user.organizationId;
    const candidate = await this.findOne(user, idOrPublicId);
    const [leaves, timesheets, reviews] = await Promise.all([
      this.prisma.leave.findMany({
        where: {
          organizationId,
          candidateId: candidate.id,
          deletedAt: null,
        },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.timesheet.findMany({
        where: {
          organizationId,
          candidateId: candidate.id,
          deletedAt: null,
        },
        orderBy: { yearMonth: 'desc' },
      }),
      this.prisma.deliveryReview.findMany({
        where: {
          organizationId,
          candidateId: candidate.id,
          deletedAt: null,
        },
        orderBy: { yearMonth: 'desc' },
      }),
    ]);

    return {
      candidate,
      leaves: leaves.map((l) => ({
        ...l,
        days: toNumber(l.days),
      })),
      timesheets: timesheets.map((t) => ({
        ...t,
        workingDays: toNumber(t.workingDays),
        leaveDays: toNumber(t.leaveDays),
        daysWorked: toNumber(t.daysWorked),
        attendancePct: toNumber(t.attendancePct),
      })),
      reviews: reviews.map((r) => ({
        ...r,
        utilizationPct: toNumber(r.utilizationPct),
      })),
    };
  }
}
