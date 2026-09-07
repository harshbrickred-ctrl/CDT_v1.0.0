import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CandidateStatus,
  LeaveStatus,
  Prisma,
} from '@prisma/client';
import { inclusiveCalendarDays } from '@cdt/shared-utils';
import { paginationMeta, paginationSkip } from '@cdt/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { IdSequenceService } from '../common/id-sequence.service';
import { AuditService } from '../audit/audit.service';
import { toNumber } from '../common/prisma-error';
import {
  CreateLeaveDto,
  RejectLeaveDto,
  UpdateLeaveDto,
} from './dto/leaves.dto';

const leaveInclude = {
  candidate: {
    select: {
      id: true,
      publicId: true,
      fullName: true,
      status: true,
      clientId: true,
      client: { select: { id: true, name: true } },
    },
  },
  requestedBy: {
    select: { id: true, fullName: true, email: true },
  },
  approver: {
    select: { id: true, fullName: true, email: true },
  },
} as const;

@Injectable()
export class LeavesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdSequenceService,
    private readonly audit: AuditService,
  ) {}

  private serialize(leave: {
    days: Prisma.Decimal | number;
    [key: string]: unknown;
  }) {
    return { ...leave, days: toNumber(leave.days) };
  }

  private assertDateOrder(start: Date, end: Date) {
    if (start.getTime() > end.getTime()) {
      throw new BadRequestException('startDate must be on or before endDate');
    }
  }

  private async assertActiveCandidate(candidateId: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, deletedAt: null },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    if (candidate.status !== CandidateStatus.ACTIVE) {
      throw new BadRequestException(
        'Leaves can only be created/updated for ACTIVE candidates (BR-01/BR-24)',
      );
    }
    return candidate;
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    candidateId?: string;
    status?: LeaveStatus;
    clientId?: string;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const where: Prisma.LeaveWhereInput = {
      deletedAt: null,
      ...(params.candidateId ? { candidateId: params.candidateId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.clientId
        ? { candidate: { clientId: params.clientId, deletedAt: null } }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.leave.count({ where }),
      this.prisma.leave.findMany({
        where,
        include: leaveInclude,
        orderBy: { createdAt: 'desc' },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
      }),
    ]);
    return {
      items: items.map((l) => this.serialize(l)),
      meta: paginationMeta(total, page, pageSize),
    };
  }

  async findOne(id: string) {
    const leave = await this.prisma.leave.findFirst({
      where: { id, deletedAt: null },
      include: leaveInclude,
    });
    if (!leave) throw new NotFoundException('Leave not found');
    return this.serialize(leave);
  }

  async create(dto: CreateLeaveDto, actorUserId: string) {
    await this.assertActiveCandidate(dto.candidateId);
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    this.assertDateOrder(startDate, endDate);
    const days = inclusiveCalendarDays(startDate, endDate);
    const publicId = await this.ids.allocateNext('LV');

    const leave = await this.prisma.leave.create({
      data: {
        publicId,
        candidateId: dto.candidateId,
        leaveTypeCode: dto.leaveTypeCode.trim().toUpperCase(),
        startDate,
        endDate,
        days,
        status: LeaveStatus.PENDING,
        reason: dto.reason?.trim() || null,
        requestedById: actorUserId,
      },
      include: leaveInclude,
    });
    await this.audit.record({
      actorUserId,
      action: 'CREATE',
      entityType: 'Leave',
      entityId: leave.id,
      entityPublicId: leave.publicId,
      after: this.serialize(leave),
    });
    return this.serialize(leave);
  }

  async update(id: string, dto: UpdateLeaveDto, actorUserId: string) {
    const before = await this.prisma.leave.findFirst({
      where: { id, deletedAt: null },
      include: leaveInclude,
    });
    if (!before) throw new NotFoundException('Leave not found');
    if (before.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only PENDING leaves can be updated');
    }
    await this.assertActiveCandidate(before.candidateId);

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : before.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : before.endDate;
    this.assertDateOrder(startDate, endDate);
    const days = inclusiveCalendarDays(startDate, endDate);

    const leave = await this.prisma.leave.update({
      where: { id },
      data: {
        ...(dto.leaveTypeCode !== undefined
          ? { leaveTypeCode: dto.leaveTypeCode.trim().toUpperCase() }
          : {}),
        startDate,
        endDate,
        days,
        ...(dto.reason !== undefined
          ? { reason: dto.reason?.trim() || null }
          : {}),
      },
      include: leaveInclude,
    });
    await this.audit.record({
      actorUserId,
      action: 'UPDATE',
      entityType: 'Leave',
      entityId: leave.id,
      entityPublicId: leave.publicId,
      before: this.serialize(before),
      after: this.serialize(leave),
    });
    return this.serialize(leave);
  }

  async approve(id: string, actorUserId: string) {
    const before = await this.prisma.leave.findFirst({
      where: { id, deletedAt: null },
      include: leaveInclude,
    });
    if (!before) throw new NotFoundException('Leave not found');
    if (before.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only PENDING leaves can be approved');
    }
    const leave = await this.prisma.leave.update({
      where: { id },
      data: {
        status: LeaveStatus.APPROVED,
        approverId: actorUserId,
        approvedAt: new Date(),
        rejectedAt: null,
        rejectionReason: null,
      },
      include: leaveInclude,
    });
    await this.audit.record({
      actorUserId,
      action: 'APPROVE',
      entityType: 'Leave',
      entityId: leave.id,
      entityPublicId: leave.publicId,
      before: this.serialize(before),
      after: this.serialize(leave),
    });
    return this.serialize(leave);
  }

  async reject(id: string, dto: RejectLeaveDto, actorUserId: string) {
    const before = await this.prisma.leave.findFirst({
      where: { id, deletedAt: null },
      include: leaveInclude,
    });
    if (!before) throw new NotFoundException('Leave not found');
    if (before.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only PENDING leaves can be rejected');
    }
    const leave = await this.prisma.leave.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        approverId: actorUserId,
        rejectedAt: new Date(),
        approvedAt: null,
        rejectionReason: dto.rejectionReason?.trim() || null,
      },
      include: leaveInclude,
    });
    await this.audit.record({
      actorUserId,
      action: 'REJECT',
      entityType: 'Leave',
      entityId: leave.id,
      entityPublicId: leave.publicId,
      before: this.serialize(before),
      after: this.serialize(leave),
    });
    return this.serialize(leave);
  }
}
