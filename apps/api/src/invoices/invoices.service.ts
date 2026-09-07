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
  Prisma,
} from '@prisma/client';
import { computeInvoiceBilling } from '@cdt/shared-utils';
import { paginationMeta, paginationSkip } from '@cdt/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { IdSequenceService } from '../common/id-sequence.service';
import { AuditService } from '../audit/audit.service';
import { toNumber } from '../common/prisma-error';
import { GenerateInvoiceDto, RejectInvoiceDto } from './dto/invoices.dto';

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
    organizationId: string;
    page?: number;
    pageSize?: number;
    status?: InvoiceStatus;
    yearMonth?: string;
    candidateId?: string;
    clientId?: string;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const where: Prisma.InvoiceWhereInput = {
      organizationId: params.organizationId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.yearMonth ? { yearMonth: params.yearMonth } : {}),
      ...(params.candidateId ? { candidateId: params.candidateId } : {}),
      ...(params.clientId
        ? { candidate: { clientId: params.clientId } }
        : {}),
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

  async findOne(organizationId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
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
    const lopDays = toNumber(timesheet.lopDays) ?? 0;

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

  async approve(organizationId: string, id: string, actorUserId: string) {
    const before = await this.findOne(organizationId, id);
    if (before.status !== InvoiceStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending invoices can be approved');
    }
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.APPROVED,
        reviewedById: actorUserId,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
      include: invoiceInclude,
    });
    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'APPROVE',
      entityType: 'Invoice',
      entityId: invoice.id,
      entityPublicId: invoice.publicId,
      before,
      after: invoice,
    });
    return this.serialize(invoice);
  }

  async send(organizationId: string, id: string, actorUserId: string) {
    const before = await this.findOne(organizationId, id);
    if (before.status !== InvoiceStatus.APPROVED) {
      throw new BadRequestException('Only approved invoices can be sent');
    }
    const now = new Date();
    const dueDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 30),
    );
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.SENT,
        sentAt: now,
        dueDate,
      },
      include: invoiceInclude,
    });
    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'SEND',
      entityType: 'Invoice',
      entityId: invoice.id,
      entityPublicId: invoice.publicId,
      before,
      after: invoice,
    });
    return this.serialize(invoice);
  }

  async markPaid(organizationId: string, id: string, actorUserId: string) {
    const before = await this.findOne(organizationId, id);
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
      organizationId,
      actorUserId,
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
    organizationId: string,
    id: string,
    dto: RejectInvoiceDto,
    actorUserId: string,
  ) {
    const before = await this.findOne(organizationId, id);
    if (before.status !== InvoiceStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending invoices can be rejected');
    }
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.REJECTED,
        reviewedById: actorUserId,
        reviewedAt: new Date(),
        rejectionReason: dto.rejectionReason?.trim() || null,
      },
      include: invoiceInclude,
    });
    await this.audit.record({
      organizationId,
      actorUserId,
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
