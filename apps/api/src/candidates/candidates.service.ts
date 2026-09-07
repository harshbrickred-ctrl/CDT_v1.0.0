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
import { isUuid } from '../common/dates';
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

  private serialize<
    T extends {
      hourlyRate?: Prisma.Decimal | number | null;
      hoursPerDay?: Prisma.Decimal | number | null;
      monthlyFixedAmount?: Prisma.Decimal | number | null;
      maxBillableHours?: Prisma.Decimal | number | null;
    },
  >(row: T) {
    return {
      ...row,
      hourlyRate: toNumber(row.hourlyRate ?? null),
      hoursPerDay: toNumber(row.hoursPerDay ?? null),
      monthlyFixedAmount: toNumber(row.monthlyFixedAmount ?? null),
      maxBillableHours: toNumber(row.maxBillableHours ?? null),
    };
  }

  private resolveWhere(idOrPublicId: string): Prisma.CandidateWhereInput {
    if (isUuid(idOrPublicId)) {
      return { id: idOrPublicId, deletedAt: null };
    }
    if (idOrPublicId.toUpperCase().startsWith('CD-')) {
      return { publicId: idOrPublicId.toUpperCase(), deletedAt: null };
    }
    return { publicId: idOrPublicId, deletedAt: null };
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    clientId?: string;
    status?: CandidateStatus;
    q?: string;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const where: Prisma.CandidateWhereInput = {
      deletedAt: null,
      ...(params.clientId ? { clientId: params.clientId } : {}),
      ...(params.status ? { status: params.status } : {}),
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

  async findOne(idOrPublicId: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: this.resolveWhere(idOrPublicId),
      include: candidateInclude,
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    return this.serialize(candidate);
  }

  async create(dto: CreateCandidateDto, actorUserId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found');

    const publicId = await this.ids.allocateNext('CD');
    const candidate = await this.prisma.candidate.create({
      data: {
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
        accountManagerUserId: dto.accountManagerUserId ?? null,
        billingType: dto.billingType ?? 'HOURLY',
        hourlyRate: dto.hourlyRate ?? null,
        monthlyFixedAmount: dto.monthlyFixedAmount ?? null,
        maxBillableHours: dto.maxBillableHours ?? null,
        hoursPerDay: dto.hoursPerDay ?? 8,
        currency: dto.currency?.trim() || 'INR',
        status: CandidateStatus.ACTIVE,
      },
      include: candidateInclude,
    });
    await this.audit.record({
      actorUserId,
      action: 'CREATE',
      entityType: 'Candidate',
      entityId: candidate.id,
      entityPublicId: candidate.publicId,
      after: candidate,
    });
    return this.serialize(candidate);
  }

  async update(
    idOrPublicId: string,
    dto: UpdateCandidateDto,
    actorUserId: string,
  ) {
    const before = await this.findOne(idOrPublicId);
    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, deletedAt: null },
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
    if (dto.accountManagerUserId !== undefined) {
      data.accountManager = dto.accountManagerUserId
        ? { connect: { id: dto.accountManagerUserId } }
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
      actorUserId,
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
    idOrPublicId: string,
    dto: ReleaseCandidateDto,
    actorUserId: string,
  ) {
    const before = await this.findOne(idOrPublicId);
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
        releasedById: actorUserId,
        releaseReason: dto.releaseReason?.trim() || null,
      },
      include: candidateInclude,
    });
    await this.audit.record({
      actorUserId,
      action: 'RELEASE',
      entityType: 'Candidate',
      entityId: candidate.id,
      entityPublicId: candidate.publicId,
      before,
      after: candidate,
    });
    return this.serialize(candidate);
  }

  async timeline(idOrPublicId: string) {
    const candidate = await this.findOne(idOrPublicId);
    const [leaves, timesheets, reviews] = await Promise.all([
      this.prisma.leave.findMany({
        where: { candidateId: candidate.id, deletedAt: null },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.timesheet.findMany({
        where: { candidateId: candidate.id, deletedAt: null },
        orderBy: { yearMonth: 'desc' },
      }),
      this.prisma.deliveryReview.findMany({
        where: { candidateId: candidate.id, deletedAt: null },
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
