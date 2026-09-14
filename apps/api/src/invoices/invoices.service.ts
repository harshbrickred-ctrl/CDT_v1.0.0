import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  BillingType,
  InvoiceStatus,
  LeaveStatus,
  Prisma,
} from '@prisma/client';
import { computeInvoiceBilling, computeLeaveAndLopDays } from '@cdt/shared-utils';
import { paginationMeta, paginationSkip } from '@cdt/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { IdSequenceService } from '../common/id-sequence.service';
import { AuditService } from '../audit/audit.service';
import {
  emptyIfNoAccess,
  resolveOwnedClientIds,
  withCandidateClientScope,
} from '../common/client-scope';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { toNumber } from '../common/prisma-error';
import { GenerateInvoiceDto, RejectInvoiceDto } from './dto/invoices.dto';
import { periodFromYearMonth } from '../common/dates';

const invoiceInclude = {
  candidate: {
    select: {
      id: true,
      publicId: true,
      fullName: true,
      clientId: true,
      currency: true,
      client: { select: { id: true, name: true } },
    },
  },
  timesheet: {
    select: {
      id: true,
      publicId: true,
      yearMonth: true,
      workingDays: true,
      daysWorked: true,
      approvalStatus: true,
    },
  },
  generatedBy: {
    select: { id: true, fullName: true, email: true },
  },
  reviewedBy: {
    select: { id: true, fullName: true, email: true },
  },
} as const;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdSequenceService,
    private readonly audit: AuditService,
  ) {}

  private serialize<
    T extends {
      hourlyRate: Prisma.Decimal | number;
      hoursPerDay: Prisma.Decimal | number;
      daysWorked: Prisma.Decimal | number;
      workingDays: Prisma.Decimal | number;
      amount: Prisma.Decimal | number;
      monthlyFixedAmount?: Prisma.Decimal | number | null;
      maxBillableHours?: Prisma.Decimal | number | null;
      lopDays?: Prisma.Decimal | number | null;
      billableDays?: Prisma.Decimal | number | null;
      rawHours?: Prisma.Decimal | number | null;
      billableHours?: Prisma.Decimal | number | null;
      timesheet?: {
        workingDays: Prisma.Decimal | number;
        daysWorked: Prisma.Decimal | number;
        lopDays?: Prisma.Decimal | number;
        [key: string]: unknown;
      } | null;
    },
  >(row: T) {
    return {
      ...row,
      hourlyRate: toNumber(row.hourlyRate) ?? 0,
      hoursPerDay: toNumber(row.hoursPerDay) ?? 0,
      daysWorked: toNumber(row.daysWorked) ?? 0,
      workingDays: toNumber(row.workingDays) ?? 0,
      amount: toNumber(row.amount) ?? 0,
      monthlyFixedAmount: toNumber(row.monthlyFixedAmount ?? null),
      maxBillableHours: toNumber(row.maxBillableHours ?? null),
      lopDays: toNumber(row.lopDays ?? null) ?? 0,
      billableDays: toNumber(row.billableDays ?? null) ?? 0,
      rawHours: toNumber(row.rawHours ?? null) ?? 0,
      billableHours: toNumber(row.billableHours ?? null) ?? 0,
      timesheet: row.timesheet
        ? {
            ...row.timesheet,
            workingDays: toNumber(row.timesheet.workingDays) ?? 0,
            daysWorked: toNumber(row.timesheet.daysWorked) ?? 0,
            lopDays: toNumber(row.timesheet.lopDays ?? null) ?? 0,
          }
        : row.timesheet,
    };
  }

  async findAll(params: {
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>;
    page?: number;
    pageSize?: number;
    status?: InvoiceStatus;
    yearMonth?: string;
    candidateId?: string;
    clientId?: string;
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
    const where: Prisma.InvoiceWhereInput = {
      organizationId: params.user.organizationId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.yearMonth ? { yearMonth: params.yearMonth } : {}),
      ...(params.candidateId ? { candidateId: params.candidateId } : {}),
      ...(candidateScope ? { candidate: candidateScope } : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: invoiceInclude,
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
    id: string,
  ) {
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, user);
    if (emptyIfNoAccess(ownedClientIds)) {
      throw new NotFoundException('Invoice not found');
    }
    const candidateScope = withCandidateClientScope(ownedClientIds);
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        ...(candidateScope ? { candidate: candidateScope } : {}),
      },
      include: invoiceInclude,
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.serialize(invoice);
  }

  async generate(
    organizationId: string,
    dto: GenerateInvoiceDto,
    actorUserId: string,
  ) {
    const timesheet = await this.prisma.timesheet.findFirst({
      where: { id: dto.timesheetId, organizationId, deletedAt: null },
      include: {
        candidate: true,
        invoice: { select: { id: true } },
      },
    });
    if (!timesheet) throw new NotFoundException('Timesheet not found');
    if (timesheet.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new BadRequestException(
        'Invoice can only be generated from an approved timesheet',
      );
    }
    if (timesheet.invoice) {
      throw new ConflictException('An invoice already exists for this timesheet');
    }

    const billingType = timesheet.candidate.billingType ?? BillingType.HOURLY;
    const hourlyRate = toNumber(timesheet.candidate.hourlyRate);
    const monthlyFixedAmount = toNumber(
      timesheet.candidate.monthlyFixedAmount ?? null,
    );
    const maxBillableHours = toNumber(
      timesheet.candidate.maxBillableHours ?? null,
    );
    const hoursPerDay = toNumber(timesheet.candidate.hoursPerDay) ?? 8;
    const daysWorked = toNumber(timesheet.daysWorked) ?? 0;
    const workingDays = toNumber(timesheet.workingDays) ?? 0;

    // Recompute leave/LOP at generate time from current leave statuses:
    // approved leave is not LOP; pending/rejected leave is LOP.
    const periodStart = timesheet.periodStart;
    const periodEnd = timesheet.periodEnd;
    const leaves = await this.prisma.leave.findMany({
      where: {
        organizationId,
        candidateId: timesheet.candidateId,
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
      },
    });
    const { leaveDays, lopDays } = computeLeaveAndLopDays(
      leaves.map((l) => ({
        status: l.status,
        from: l.startDate,
        to: l.endDate,
      })),
      periodStart,
      periodEnd,
    );

    // Keep timesheet leave/LOP in sync with latest leave approvals.
    if (
      (toNumber(timesheet.leaveDays) ?? 0) !== leaveDays ||
      (toNumber(timesheet.lopDays) ?? 0) !== lopDays
    ) {
      await this.prisma.timesheet.update({
        where: { id: timesheet.id },
        data: { leaveDays, lopDays },
      });
    }

    if (billingType === BillingType.HOURLY) {
      if (hourlyRate == null || hourlyRate <= 0) {
        throw new BadRequestException(
          'Candidate must have an hourly rate set before generating an invoice',
        );
      }
    } else if (monthlyFixedAmount == null || monthlyFixedAmount <= 0) {
      throw new BadRequestException(
        'Candidate must have a monthly fixed amount set before generating an invoice',
      );
    }

    const billing = computeInvoiceBilling({
      billingType,
      hourlyRate,
      hoursPerDay,
      monthlyFixedAmount,
      maxBillableHours,
      workingDays,
      lopDays,
    });
    const publicId = await this.ids.allocateNext(organizationId, 'INV');

    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId,
        publicId,
        candidateId: timesheet.candidateId,
        timesheetId: timesheet.id,
        yearMonth: timesheet.yearMonth,
        billingType,
        hourlyRate: hourlyRate ?? 0,
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
        currency: timesheet.candidate.currency || 'INR',
        status: InvoiceStatus.PENDING_REVIEW,
        generatedById: actorUserId,
      },
      include: invoiceInclude,
    });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'GENERATE',
      entityType: 'Invoice',
      entityId: invoice.id,
      entityPublicId: invoice.publicId,
      after: invoice,
    });

    return this.serialize(invoice);
  }

  async approve(
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    id: string,
  ) {
    const before = await this.findOne(user, id);
    if (before.status !== InvoiceStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending invoices can be approved');
    }
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.APPROVED,
        reviewedById: user.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
      include: invoiceInclude,
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'APPROVE',
      entityType: 'Invoice',
      entityId: invoice.id,
      entityPublicId: invoice.publicId,
      before,
      after: invoice,
    });
    return this.serialize(invoice);
  }

  async send(
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    id: string,
  ) {
    const before = await this.findOne(user, id);
    if (before.status !== InvoiceStatus.APPROVED) {
      throw new BadRequestException('Only approved invoices can be sent');
    }
    const now = new Date();
    const { periodEnd } = periodFromYearMonth(before.yearMonth);
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.SENT,
        sentAt: now,
        dueDate: periodEnd,
      },
      include: invoiceInclude,
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'SEND',
      entityType: 'Invoice',
      entityId: invoice.id,
      entityPublicId: invoice.publicId,
      before,
      after: invoice,
    });
    return this.serialize(invoice);
  }

  async markPaid(
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    id: string,
  ) {
    const before = await this.findOne(user, id);
    if (before.status !== InvoiceStatus.SENT) {
      throw new BadRequestException('Only sent invoices can be marked paid');
    }
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
      },
      include: invoiceInclude,
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'MARK_PAID',
      entityType: 'Invoice',
      entityId: invoice.id,
      entityPublicId: invoice.publicId,
      before,
      after: invoice,
    });
    return this.serialize(invoice);
  }

  async reject(
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    id: string,
    dto: RejectInvoiceDto,
  ) {
    const before = await this.findOne(user, id);
    if (before.status !== InvoiceStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending invoices can be rejected');
    }
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.REJECTED,
        reviewedById: user.id,
        reviewedAt: new Date(),
        rejectionReason: dto.rejectionReason?.trim() || null,
      },
      include: invoiceInclude,
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'REJECT',
      entityType: 'Invoice',
      entityId: invoice.id,
      entityPublicId: invoice.publicId,
      before,
      after: invoice,
    });
    return this.serialize(invoice);
  }
}
