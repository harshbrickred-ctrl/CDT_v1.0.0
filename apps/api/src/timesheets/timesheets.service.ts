import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  CandidateStatus,
  LeaveStatus,
  Prisma,
} from '@prisma/client';
import {
  attendancePct,
  computeLeaveAndLopDays,
} from '@cdt/shared-utils';
import { paginationMeta, paginationSkip } from '@cdt/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { IdSequenceService } from '../common/id-sequence.service';
import { AuditService } from '../audit/audit.service';
import { InvoicesService } from '../invoices/invoices.service';
import {
  emptyIfNoAccess,
  resolveOwnedClientIds,
  withCandidateClientScope,
} from '../common/client-scope';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { periodFromYearMonth, isCandidateEmployedInPeriod } from '../common/dates';
import { throwConflictIfUnique, toNumber } from '../common/prisma-error';
import {
  RejectTimesheetDto,
  UpsertTimesheetDto,
} from './dto/timesheets.dto';

const timesheetInclude = {
  candidate: {
    select: {
      id: true,
      publicId: true,
      fullName: true,
      clientId: true,
      client: { select: { id: true, name: true } },
    },
  },
  approvedBy: {
    select: { id: true, fullName: true, email: true },
  },
} as const;

@Injectable()
export class TimesheetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdSequenceService,
    private readonly audit: AuditService,
    private readonly invoices: InvoicesService,
  ) {}

  private serialize(row: {
    workingDays: Prisma.Decimal | number;
    leaveDays: Prisma.Decimal | number;
    lopDays: Prisma.Decimal | number;
    daysWorked: Prisma.Decimal | number;
    attendancePct: Prisma.Decimal | number | null;
    [key: string]: unknown;
  }) {
    return {
      ...row,
      workingDays: toNumber(row.workingDays),
      leaveDays: toNumber(row.leaveDays),
      lopDays: toNumber(row.lopDays),
      daysWorked: toNumber(row.daysWorked),
      attendancePct: toNumber(row.attendancePct),
    };
  }

  private async computeLeaveDays(
    organizationId: string,
    candidateId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ leaveDays: number; lopDays: number }> {
    const leaves = await this.prisma.leave.findMany({
      where: {
        organizationId,
        candidateId,
        deletedAt: null,
        status: {
          in: [
            LeaveStatus.APPROVED,
            LeaveStatus.PENDING,
            LeaveStatus.REJECTED,
          ],
        },
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
      },
      select: {
        status: true,
        startDate: true,
        endDate: true,
        leaveTypeCode: true,
      },
    });
    const mapped = leaves.map((l) => ({
      status: l.status,
      from: l.startDate,
      to: l.endDate,
      leaveTypeCode: l.leaveTypeCode,
    }));
    return computeLeaveAndLopDays(mapped, periodStart, periodEnd);
  }

  async findAll(params: {
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>;
    page?: number;
    pageSize?: number;
    candidateId?: string;
    yearMonth?: string;
    clientId?: string;
    approvalStatus?: ApprovalStatus;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, params.user);
    if (emptyIfNoAccess(ownedClientIds)) {
      return { items: [], meta: paginationMeta(0, page, pageSize) };
    }
    const candidateScope = withCandidateClientScope(
      ownedClientIds,
      params.clientId,
    );
    const where: Prisma.TimesheetWhereInput = {
      organizationId: params.user.organizationId,
      deletedAt: null,
      ...(params.candidateId ? { candidateId: params.candidateId } : {}),
      ...(params.yearMonth ? { yearMonth: params.yearMonth } : {}),
      ...(params.approvalStatus
        ? { approvalStatus: params.approvalStatus }
        : {}),
      ...(candidateScope
        ? { candidate: { deletedAt: null, ...candidateScope } }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.timesheet.count({ where }),
      this.prisma.timesheet.findMany({
        where,
        include: timesheetInclude,
        orderBy: [{ yearMonth: 'desc' }, { createdAt: 'desc' }],
        skip: paginationSkip(page, pageSize),
        take: pageSize,
      }),
    ]);
    return {
      items: items.map((t) => this.serialize(t)),
      meta: paginationMeta(total, page, pageSize),
    };
  }

  async findOne(
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    id: string,
  ) {
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, user);
    if (emptyIfNoAccess(ownedClientIds)) {
      throw new NotFoundException('Timesheet not found');
    }
    const candidateScope = withCandidateClientScope(ownedClientIds);
    const row = await this.prisma.timesheet.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        deletedAt: null,
        ...(candidateScope ? { candidate: candidateScope } : {}),
      },
      include: timesheetInclude,
    });
    if (!row) throw new NotFoundException('Timesheet not found');
    return this.serialize(row);
  }

  async upsert(
    organizationId: string,
    dto: UpsertTimesheetDto,
    actorUserId: string,
  ) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: dto.candidateId, organizationId, deletedAt: null },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');

    if (
      candidate.status !== CandidateStatus.ACTIVE &&
      candidate.status !== CandidateStatus.RELEASED
    ) {
      throw new BadRequestException(
        'Timesheets can only be filled for active or released candidates',
      );
    }

    let periodStart: Date;
    let periodEnd: Date;
    try {
      ({ periodStart, periodEnd } = periodFromYearMonth(dto.yearMonth));
    } catch {
      throw new BadRequestException('Invalid yearMonth; expected YYYY-MM');
    }

    if (
      !isCandidateEmployedInPeriod(
        candidate,
        periodStart,
        periodEnd,
      )
    ) {
      throw new BadRequestException(
        'Timesheet month is outside the candidate employment period',
      );
    }

    const { leaveDays, lopDays } = await this.computeLeaveDays(
      organizationId,
      dto.candidateId,
      periodStart,
      periodEnd,
    );
    const pct = attendancePct(dto.daysWorked, dto.workingDays);

    const existing = await this.prisma.timesheet.findUnique({
      where: {
        candidateId_yearMonth: {
          candidateId: dto.candidateId,
          yearMonth: dto.yearMonth,
        },
      },
    });

    try {
      if (existing && !existing.deletedAt) {
        if (existing.organizationId !== organizationId) {
          throw new NotFoundException('Candidate not found');
        }
        const before = existing;
        const row = await this.prisma.timesheet.update({
          where: { id: existing.id },
          data: {
            periodStart,
            periodEnd,
            workingDays: dto.workingDays,
            leaveDays,
            lopDays,
            daysWorked: dto.daysWorked,
            attendancePct: pct,
            remarks: dto.remarks ?? existing.remarks,
            approvalStatus: ApprovalStatus.PENDING,
            approvedById: null,
          },
          include: timesheetInclude,
        });
        await this.audit.record({
          organizationId,
          actorUserId,
          action: 'UPDATE',
          entityType: 'Timesheet',
          entityId: row.id,
          entityPublicId: row.publicId,
          before: this.serialize(before),
          after: this.serialize(row),
        });
        return this.serialize(row);
      }

      if (existing?.deletedAt) {
        if (existing.organizationId !== organizationId) {
          throw new NotFoundException('Candidate not found');
        }
        const row = await this.prisma.timesheet.update({
          where: { id: existing.id },
          data: {
            periodStart,
            periodEnd,
            workingDays: dto.workingDays,
            leaveDays,
            lopDays,
            daysWorked: dto.daysWorked,
            attendancePct: pct,
            remarks: dto.remarks ?? null,
            approvalStatus: ApprovalStatus.PENDING,
            approvedById: null,
            deletedAt: null,
          },
          include: timesheetInclude,
        });
        await this.audit.record({
          organizationId,
          actorUserId,
          action: 'CREATE',
          entityType: 'Timesheet',
          entityId: row.id,
          entityPublicId: row.publicId,
          after: this.serialize(row),
        });
        return this.serialize(row);
      }

      const publicId = await this.ids.allocateNext(organizationId, 'TSH');
      const row = await this.prisma.timesheet.create({
        data: {
          organizationId,
          publicId,
          candidateId: dto.candidateId,
          yearMonth: dto.yearMonth,
          periodStart,
          periodEnd,
          workingDays: dto.workingDays,
          leaveDays,
          lopDays,
          daysWorked: dto.daysWorked,
          attendancePct: pct,
          remarks: dto.remarks ?? null,
          approvalStatus: ApprovalStatus.PENDING,
        },
        include: timesheetInclude,
      });
      await this.audit.record({
        organizationId,
        actorUserId,
        action: 'CREATE',
        entityType: 'Timesheet',
        entityId: row.id,
        entityPublicId: row.publicId,
        after: this.serialize(row),
      });
      return this.serialize(row);
    } catch (e) {
      throwConflictIfUnique(
        e,
        'Timesheet already exists for candidate and yearMonth',
      );
    }
  }

  async recalculate(
    organizationId: string,
    id: string,
    actorUserId: string,
  ) {
    const before = await this.prisma.timesheet.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: timesheetInclude,
    });
    if (!before) throw new NotFoundException('Timesheet not found');

    const { leaveDays, lopDays } = await this.computeLeaveDays(
      organizationId,
      before.candidateId,
      before.periodStart,
      before.periodEnd,
    );
    const workingDays = Number(before.workingDays);
    const daysWorked = Number(before.daysWorked);
    const pct = attendancePct(daysWorked, workingDays);

    const row = await this.prisma.timesheet.update({
      where: { id },
      data: {
        leaveDays,
        lopDays,
        attendancePct: pct,
      },
      include: timesheetInclude,
    });
    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'RECALCULATE',
      entityType: 'Timesheet',
      entityId: row.id,
      entityPublicId: row.publicId,
      before: this.serialize(before),
      after: this.serialize(row),
    });
    return this.serialize(row);
  }

  async approve(organizationId: string, id: string, actorUserId: string) {
    const before = await this.prisma.timesheet.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: timesheetInclude,
    });
    if (!before) throw new NotFoundException('Timesheet not found');
    if (before.approvalStatus !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Only PENDING timesheets can be approved');
    }
    const row = await this.prisma.timesheet.update({
      where: { id },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        approvedById: actorUserId,
      },
      include: timesheetInclude,
    });
    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'APPROVE',
      entityType: 'Timesheet',
      entityId: row.id,
      entityPublicId: row.publicId,
      before: this.serialize(before),
      after: this.serialize(row),
    });

    try {
      await this.invoices.generate(
        organizationId,
        { timesheetId: id },
        actorUserId,
      );
    } catch (err) {
      await this.prisma.timesheet.update({
        where: { id },
        data: {
          approvalStatus: ApprovalStatus.PENDING,
          approvedById: null,
        },
      });
      throw err;
    }

    return this.serialize(row);
  }

  async reject(
    organizationId: string,
    id: string,
    dto: RejectTimesheetDto,
    actorUserId: string,
  ) {
    const before = await this.prisma.timesheet.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: timesheetInclude,
    });
    if (!before) throw new NotFoundException('Timesheet not found');
    if (before.approvalStatus !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Only PENDING timesheets can be rejected');
    }
    const row = await this.prisma.timesheet.update({
      where: { id },
      data: {
        approvalStatus: ApprovalStatus.REJECTED,
        approvedById: actorUserId,
        ...(dto.remarks !== undefined ? { remarks: dto.remarks } : {}),
      },
      include: timesheetInclude,
    });
    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'REJECT',
      entityType: 'Timesheet',
      entityId: row.id,
      entityPublicId: row.publicId,
      before: this.serialize(before),
      after: this.serialize(row),
    });
    return this.serialize(row);
  }
}
