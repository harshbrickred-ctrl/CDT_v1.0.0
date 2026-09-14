import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CandidateStatus, Prisma } from '@prisma/client';
import { paginationMeta, paginationSkip } from '@cdt/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { IdSequenceService } from '../common/id-sequence.service';
import { AuditService } from '../audit/audit.service';
import {
  assertClientAccess,
  emptyIfNoAccess,
  resolveOwnedClientIds,
  withClientIdScope,
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
  CreateCandidateDto,
  ReleaseCandidateDto,
  UpdateCandidateDto,
} from './dto/candidates.dto';

const candidateInclude = {
  client: {
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
    },
  },
  accountManager: {
    select: { id: true, fullName: true, email: true },
  },
} as const;

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
    joinedOn: Date | null;
    contractEndDate: Date | null;
    releasedAt: Date | null;
  }): Promise<string[]> {
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
    },
  >(row: T, extra?: Record<string, unknown>) {
    return {
      ...row,
      hourlyRate: toNumber(row.hourlyRate ?? null),
      hoursPerDay: toNumber(row.hoursPerDay ?? null),
      monthlyFixedAmount: toNumber(row.monthlyFixedAmount ?? null),
      maxBillableHours: toNumber(row.maxBillableHours ?? null),
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

  async findAll(params: {
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>;
    page?: number;
    pageSize?: number;
    clientId?: string;
    status?: CandidateStatus;
    statuses?: CandidateStatus[];
    q?: string;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, params.user);
    if (emptyIfNoAccess(ownedClientIds)) {
      return { items: [], meta: paginationMeta(0, page, pageSize) };
    }
    const clientFilter = withClientIdScope(ownedClientIds, params.clientId);
    const where: Prisma.CandidateWhereInput = {
      organizationId: params.user.organizationId,
      deletedAt: null,
      ...(clientFilter ? { clientId: clientFilter } : {}),
      ...(params.statuses?.length
        ? { status: { in: params.statuses } }
        : params.status
          ? { status: params.status }
          : {}),
      ...(params.q
        ? {
            OR: [
              { fullName: { contains: params.q, mode: 'insensitive' } },
              { publicId: { contains: params.q, mode: 'insensitive' } },
              { email: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
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

  async findOne(
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    idOrPublicId: string,
  ) {
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, user);
    if (emptyIfNoAccess(ownedClientIds)) {
      throw new NotFoundException('Candidate not found');
    }
    const clientFilter = withClientIdScope(ownedClientIds);
    const candidate = await this.prisma.candidate.findFirst({
      where: {
        ...this.resolveWhere(user.organizationId, idOrPublicId),
        ...(clientFilter ? { clientId: clientFilter } : {}),
      },
      include: candidateInclude,
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    const missingTimesheetMonths =
      await this.missingTimesheetMonthsForCandidate(candidate);
    return this.serialize(candidate, { missingTimesheetMonths });
  }

  private async resolveAccountManagerUserId(
    organizationId: string,
    clientId: string,
    requestedId?: string | null,
  ): Promise<string | null> {
    const owners = await this.prisma.clientOwnership.findMany({
      where: {
        organizationId,
        clientId,
        ownershipRole: 'ACCOUNT_OWNER',
      },
      select: { userId: true },
      orderBy: { createdAt: 'asc' },
    });
    const ownerIds = owners.map((o) => o.userId);
    if (!ownerIds.length) return null;
    if (requestedId && ownerIds.includes(requestedId)) return requestedId;
    return ownerIds[0] ?? null;
  }

  async create(
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    dto: CreateCandidateDto,
  ) {
    const organizationId = user.organizationId;
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, user);
    assertClientAccess(ownedClientIds, dto.clientId);
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, organizationId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found');

    const accountManagerUserId = await this.resolveAccountManagerUserId(
      organizationId,
      dto.clientId,
      dto.accountManagerUserId,
    );

    const publicId = await this.ids.allocateNext(organizationId, 'CD');
    const candidate = await this.prisma.candidate.create({
      data: {
        organizationId,
        publicId,
        clientId: dto.clientId,
        fullName: dto.fullName.trim(),
        email: dto.email?.trim() || null,
        mobile: dto.mobile?.trim() || null,
        roleTitle: dto.roleTitle?.trim() || null,
        sstReference: dto.sstReference?.trim() || null,
        joinedOn: dto.joinedOn ? new Date(dto.joinedOn) : null,
        contractEndDate: dto.contractEndDate
          ? new Date(dto.contractEndDate)
          : null,
        projectAccount: dto.projectAccount?.trim() || null,
        workLocation: dto.workLocation?.trim() || null,
        clientReportingManager: dto.clientReportingManager?.trim() || null,
        accountManagerUserId,
        billingType: dto.billingType ?? 'HOURLY',
        hourlyRate: dto.hourlyRate ?? null,
        monthlyFixedAmount: dto.monthlyFixedAmount ?? null,
        maxBillableHours: dto.maxBillableHours ?? null,
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
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    idOrPublicId: string,
    dto: UpdateCandidateDto,
  ) {
    const organizationId = user.organizationId;
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, user);
    const before = await this.findOne(user, idOrPublicId);
    if (dto.clientId) {
      assertClientAccess(ownedClientIds, dto.clientId);
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, organizationId, deletedAt: null },
      });
      if (!client) throw new NotFoundException('Client not found');
    }
    const data: Prisma.CandidateUpdateInput = {};
    if (dto.clientId !== undefined) {
      data.client = { connect: { id: dto.clientId } };
    }
    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.mobile !== undefined) data.mobile = dto.mobile?.trim() || null;
    if (dto.roleTitle !== undefined)
      data.roleTitle = dto.roleTitle?.trim() || null;
    if (dto.sstReference !== undefined)
      data.sstReference = dto.sstReference?.trim() || null;
    if (dto.joinedOn !== undefined)
      data.joinedOn = dto.joinedOn ? new Date(dto.joinedOn) : null;
    if (dto.contractEndDate !== undefined)
      data.contractEndDate = dto.contractEndDate
        ? new Date(dto.contractEndDate)
        : null;
    if (dto.projectAccount !== undefined)
      data.projectAccount = dto.projectAccount?.trim() || null;
    if (dto.workLocation !== undefined)
      data.workLocation = dto.workLocation?.trim() || null;
    if (dto.clientReportingManager !== undefined)
      data.clientReportingManager =
        dto.clientReportingManager?.trim() || null;

    const nextClientId = dto.clientId ?? before.clientId;
    if (
      dto.accountManagerUserId !== undefined ||
      dto.clientId !== undefined
    ) {
      const resolvedAm = await this.resolveAccountManagerUserId(
        organizationId,
        nextClientId,
        dto.accountManagerUserId !== undefined
          ? dto.accountManagerUserId
          : before.accountManagerUserId,
      );
      data.accountManager = resolvedAm
        ? { connect: { id: resolvedAm } }
        : { disconnect: true };
    }
    if (dto.hourlyRate !== undefined) {
      data.hourlyRate = dto.hourlyRate;
    }
    if (dto.billingType !== undefined) {
      data.billingType = dto.billingType;
    }
    if (dto.monthlyFixedAmount !== undefined) {
      data.monthlyFixedAmount = dto.monthlyFixedAmount;
    }
    if (dto.maxBillableHours !== undefined) {
      data.maxBillableHours = dto.maxBillableHours;
    }
    if (dto.hoursPerDay !== undefined) {
      data.hoursPerDay = dto.hoursPerDay;
    }
    if (dto.currency !== undefined) {
      data.currency = dto.currency.trim() || 'INR';
    }
    if (dto.status !== undefined) data.status = dto.status;

    const candidate = await this.prisma.candidate.update({
      where: { id: before.id },
      data,
      include: candidateInclude,
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
    return this.serialize(candidate);
  }

  async release(
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    idOrPublicId: string,
    dto: ReleaseCandidateDto,
  ) {
    const organizationId = user.organizationId;
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
      include: candidateInclude,
    });
    await this.audit.record({
      organizationId,
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

  async softDelete(
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    idOrPublicId: string,
  ) {
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

  async timeline(
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    idOrPublicId: string,
  ) {
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
