import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CandidateStatus,
  ClientFeedback,
  EngagementHealth,
  LeaveStatus,
} from '@prisma/client';
import {
  attendancePct,
  inclusiveCalendarDays,
  normalizeClientName,
  sumApprovedLeaveDays,
} from '@cdt/shared-utils';
import { PrismaService } from '../prisma/prisma.service';
import { IdSequenceService } from '../common/id-sequence.service';
import { AuditService } from '../audit/audit.service';
import { periodFromYearMonth } from '../common/dates';
import { isUniqueConflict } from '../common/prisma-error';
import {
  ImportBodyDto,
  ImportEntity,
  ImportResult,
  ImportRowError,
} from './dto/import.dto';

function str(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdSequenceService,
    private readonly audit: AuditService,
  ) {}

  async dryRun(dto: ImportBodyDto): Promise<ImportResult> {
    return this.run(dto, false, null);
  }

  async commit(dto: ImportBodyDto, actorUserId: string): Promise<ImportResult> {
    return this.run(dto, true, actorUserId);
  }

  private async run(
    dto: ImportBodyDto,
    commit: boolean,
    actorUserId: string | null,
  ): Promise<ImportResult> {
    const errors: ImportRowError[] = [];
    let created = 0;

    switch (dto.entity) {
      case 'clients':
        created = await this.importClients(dto.rows, commit, actorUserId, errors);
        break;
      case 'candidates':
        created = await this.importCandidates(
          dto.rows,
          commit,
          actorUserId,
          errors,
        );
        break;
      case 'leaves':
        created = await this.importLeaves(dto.rows, commit, actorUserId, errors);
        break;
      case 'timesheets':
        created = await this.importTimesheets(
          dto.rows,
          commit,
          actorUserId,
          errors,
        );
        break;
      case 'delivery-reviews':
        created = await this.importReviews(
          dto.rows,
          commit,
          actorUserId,
          errors,
        );
        break;
      default:
        throw new BadRequestException(`Unsupported entity: ${dto.entity as string}`);
    }

    const invalid = new Set(errors.map((e) => e.row)).size;
    const total = dto.rows.length;
    return {
      entity: dto.entity as ImportEntity,
      mode: commit ? 'commit' : 'dry-run',
      total,
      valid: total - invalid,
      invalid,
      created: commit ? created : 0,
      errors,
    };
  }

  private async importClients(
    rows: Record<string, unknown>[],
    commit: boolean,
    actorUserId: string | null,
    errors: ImportRowError[],
  ): Promise<number> {
    let created = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = str(row.name);
      if (!name) {
        errors.push({ row: i, field: 'name', message: 'name is required' });
        continue;
      }
      const nameNormalized = normalizeClientName(name);
      const existing = await this.prisma.client.findUnique({
        where: { nameNormalized },
      });
      if (existing && !existing.deletedAt) {
        errors.push({
          row: i,
          field: 'name',
          message: 'Client name already exists',
        });
        continue;
      }
      if (!commit) continue;
      try {
        const client = existing?.deletedAt
          ? await this.prisma.client.update({
              where: { id: existing.id },
              data: {
                name,
                nameNormalized,
                code: str(row.code) ?? null,
                isActive: true,
                deletedAt: null,
              },
            })
          : await this.prisma.client.create({
              data: {
                name,
                nameNormalized,
                code: str(row.code) ?? null,
              },
            });
        if (actorUserId) {
          await this.audit.record({
            actorUserId,
            action: 'IMPORT',
            entityType: 'Client',
            entityId: client.id,
            after: client,
          });
        }
        created += 1;
      } catch (e) {
        if (isUniqueConflict(e)) {
          errors.push({
            row: i,
            field: 'name',
            message: 'Client name or code already exists',
          });
        } else {
          throw e;
        }
      }
    }
    return created;
  }

  private async importCandidates(
    rows: Record<string, unknown>[],
    commit: boolean,
    actorUserId: string | null,
    errors: ImportRowError[],
  ): Promise<number> {
    let created = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const fullName = str(row.fullName);
      const clientId = str(row.clientId);
      const clientName = str(row.clientName);
      if (!fullName) {
        errors.push({
          row: i,
          field: 'fullName',
          message: 'fullName is required',
        });
        continue;
      }
      let resolvedClientId = clientId;
      if (!resolvedClientId && clientName) {
        const client = await this.prisma.client.findFirst({
          where: {
            deletedAt: null,
            nameNormalized: normalizeClientName(clientName),
          },
        });
        if (!client) {
          errors.push({
            row: i,
            field: 'clientName',
            message: 'Client not found',
          });
          continue;
        }
        resolvedClientId = client.id;
      }
      if (!resolvedClientId) {
        errors.push({
          row: i,
          field: 'clientId',
          message: 'clientId or clientName is required',
        });
        continue;
      }
      const client = await this.prisma.client.findFirst({
        where: { id: resolvedClientId, deletedAt: null },
      });
      if (!client) {
        errors.push({ row: i, field: 'clientId', message: 'Client not found' });
        continue;
      }
      if (!commit) continue;
      const publicId = await this.ids.allocateNext('CD');
      const candidate = await this.prisma.candidate.create({
        data: {
          publicId,
          clientId: resolvedClientId,
          fullName,
          email: str(row.email) ?? null,
          mobile: str(row.mobile) ?? null,
          roleTitle: str(row.roleTitle) ?? null,
          sstReference: str(row.sstReference) ?? null,
          joinedOn: str(row.joinedOn) ? new Date(str(row.joinedOn)!) : null,
          contractEndDate: str(row.contractEndDate)
            ? new Date(str(row.contractEndDate)!)
            : null,
          projectAccount: str(row.projectAccount) ?? null,
          workLocation: str(row.workLocation) ?? null,
          clientReportingManager: str(row.clientReportingManager) ?? null,
          status: CandidateStatus.ACTIVE,
        },
      });
      if (actorUserId) {
        await this.audit.record({
          actorUserId,
          action: 'IMPORT',
          entityType: 'Candidate',
          entityId: candidate.id,
          entityPublicId: candidate.publicId,
          after: candidate,
        });
      }
      created += 1;
    }
    return created;
  }

  private async importLeaves(
    rows: Record<string, unknown>[],
    commit: boolean,
    actorUserId: string | null,
    errors: ImportRowError[],
  ): Promise<number> {
    let created = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const candidateId = str(row.candidateId);
      const candidatePublicId = str(row.candidatePublicId);
      const leaveTypeCode = str(row.leaveTypeCode);
      const startDate = str(row.startDate);
      const endDate = str(row.endDate);
      if (!leaveTypeCode || !startDate || !endDate) {
        errors.push({
          row: i,
          message: 'leaveTypeCode, startDate, endDate are required',
        });
        continue;
      }
      const candidate = await this.prisma.candidate.findFirst({
        where: {
          deletedAt: null,
          ...(candidateId
            ? { id: candidateId }
            : candidatePublicId
              ? { publicId: candidatePublicId.toUpperCase() }
              : { id: '00000000-0000-0000-0000-000000000000' }),
        },
      });
      if (!candidateId && !candidatePublicId) {
        errors.push({
          row: i,
          field: 'candidateId',
          message: 'candidateId or candidatePublicId is required',
        });
        continue;
      }
      if (!candidate) {
        errors.push({ row: i, field: 'candidateId', message: 'Candidate not found' });
        continue;
      }
      if (candidate.status !== CandidateStatus.ACTIVE) {
        errors.push({
          row: i,
          field: 'candidateId',
          message: 'Candidate must be ACTIVE',
        });
        continue;
      }
      const from = new Date(startDate);
      const to = new Date(endDate);
      if (from.getTime() > to.getTime()) {
        errors.push({
          row: i,
          field: 'startDate',
          message: 'startDate must be on or before endDate',
        });
        continue;
      }
      if (!commit || !actorUserId) continue;
      const days = inclusiveCalendarDays(from, to);
      const publicId = await this.ids.allocateNext('LV');
      const leave = await this.prisma.leave.create({
        data: {
          publicId,
          candidateId: candidate.id,
          leaveTypeCode: leaveTypeCode.toUpperCase(),
          startDate: from,
          endDate: to,
          days,
          status: LeaveStatus.PENDING,
          reason: str(row.reason) ?? null,
          requestedById: actorUserId,
        },
      });
      await this.audit.record({
        actorUserId,
        action: 'IMPORT',
        entityType: 'Leave',
        entityId: leave.id,
        entityPublicId: leave.publicId,
        after: leave,
      });
      created += 1;
    }
    return created;
  }

  private async importTimesheets(
    rows: Record<string, unknown>[],
    commit: boolean,
    actorUserId: string | null,
    errors: ImportRowError[],
  ): Promise<number> {
    let created = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const candidateId = str(row.candidateId);
      const candidatePublicId = str(row.candidatePublicId);
      const yearMonth = str(row.yearMonth);
      const workingDays = num(row.workingDays);
      const daysWorked = num(row.daysWorked);
      if (!yearMonth || workingDays === undefined || daysWorked === undefined) {
        errors.push({
          row: i,
          message: 'yearMonth, workingDays, daysWorked are required',
        });
        continue;
      }
      if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
        errors.push({
          row: i,
          field: 'yearMonth',
          message: 'yearMonth must be YYYY-MM',
        });
        continue;
      }
      if (!candidateId && !candidatePublicId) {
        errors.push({
          row: i,
          field: 'candidateId',
          message: 'candidateId or candidatePublicId is required',
        });
        continue;
      }
      const candidate = await this.prisma.candidate.findFirst({
        where: {
          deletedAt: null,
          ...(candidateId
            ? { id: candidateId }
            : { publicId: candidatePublicId!.toUpperCase() }),
        },
      });
      if (!candidate) {
        errors.push({ row: i, field: 'candidateId', message: 'Candidate not found' });
        continue;
      }
      const existing = await this.prisma.timesheet.findUnique({
        where: {
          candidateId_yearMonth: {
            candidateId: candidate.id,
            yearMonth,
          },
        },
      });
      if (existing && !existing.deletedAt) {
        errors.push({
          row: i,
          field: 'yearMonth',
          message: 'Timesheet already exists for candidate and yearMonth',
        });
        continue;
      }
      if (!commit) continue;
      const { periodStart, periodEnd } = periodFromYearMonth(yearMonth);
      const leaves = await this.prisma.leave.findMany({
        where: {
          candidateId: candidate.id,
          deletedAt: null,
          status: LeaveStatus.APPROVED,
          startDate: { lte: periodEnd },
          endDate: { gte: periodStart },
        },
        select: { status: true, startDate: true, endDate: true },
      });
      const leaveDays = sumApprovedLeaveDays(
        leaves.map((l) => ({
          status: l.status,
          from: l.startDate,
          to: l.endDate,
        })),
        periodStart,
        periodEnd,
      );
      const pct = attendancePct(daysWorked, workingDays);
      const publicId = await this.ids.allocateNext('TSH');
      try {
        const timesheet = await this.prisma.timesheet.create({
          data: {
            publicId,
            candidateId: candidate.id,
            yearMonth,
            periodStart,
            periodEnd,
            workingDays,
            leaveDays,
            daysWorked,
            attendancePct: pct,
            remarks: str(row.remarks) ?? null,
          },
        });
        if (actorUserId) {
          await this.audit.record({
            actorUserId,
            action: 'IMPORT',
            entityType: 'Timesheet',
            entityId: timesheet.id,
            entityPublicId: timesheet.publicId,
            after: timesheet,
          });
        }
        created += 1;
      } catch (e) {
        if (isUniqueConflict(e)) {
          errors.push({
            row: i,
            field: 'yearMonth',
            message: 'Timesheet already exists for candidate and yearMonth',
          });
        } else {
          throw e;
        }
      }
    }
    return created;
  }

  private async importReviews(
    rows: Record<string, unknown>[],
    commit: boolean,
    actorUserId: string | null,
    errors: ImportRowError[],
  ): Promise<number> {
    let created = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const candidateId = str(row.candidateId);
      const candidatePublicId = str(row.candidatePublicId);
      const yearMonth = str(row.yearMonth);
      const reviewDate = str(row.reviewDate);
      const clientFeedback = str(row.clientFeedback)?.toUpperCase();
      const engagementHealth = str(row.engagementHealth)?.toUpperCase();
      const escalationNotes = str(row.escalationNotes);

      if (
        !yearMonth ||
        !reviewDate ||
        !clientFeedback ||
        !engagementHealth
      ) {
        errors.push({
          row: i,
          message:
            'yearMonth, reviewDate, clientFeedback, engagementHealth are required',
        });
        continue;
      }
      if (
        !Object.values(ClientFeedback).includes(
          clientFeedback as ClientFeedback,
        )
      ) {
        errors.push({
          row: i,
          field: 'clientFeedback',
          message: 'Invalid clientFeedback',
        });
        continue;
      }
      if (
        !Object.values(EngagementHealth).includes(
          engagementHealth as EngagementHealth,
        )
      ) {
        errors.push({
          row: i,
          field: 'engagementHealth',
          message: 'Invalid engagementHealth',
        });
        continue;
      }
      if (
        (engagementHealth === EngagementHealth.AT_RISK ||
          engagementHealth === EngagementHealth.ESCALATED) &&
        !escalationNotes
      ) {
        errors.push({
          row: i,
          field: 'escalationNotes',
          message: 'escalationNotes required for AT_RISK/ESCALATED',
        });
        continue;
      }
      if (!candidateId && !candidatePublicId) {
        errors.push({
          row: i,
          field: 'candidateId',
          message: 'candidateId or candidatePublicId is required',
        });
        continue;
      }
      const candidate = await this.prisma.candidate.findFirst({
        where: {
          deletedAt: null,
          ...(candidateId
            ? { id: candidateId }
            : { publicId: candidatePublicId!.toUpperCase() }),
        },
      });
      if (!candidate) {
        errors.push({ row: i, field: 'candidateId', message: 'Candidate not found' });
        continue;
      }
      const existing = await this.prisma.deliveryReview.findUnique({
        where: {
          candidateId_yearMonth: {
            candidateId: candidate.id,
            yearMonth,
          },
        },
      });
      if (existing && !existing.deletedAt) {
        errors.push({
          row: i,
          field: 'yearMonth',
          message: 'Delivery review already exists for candidate and yearMonth',
        });
        continue;
      }
      if (!commit || !actorUserId) continue;

      const timesheet = await this.prisma.timesheet.findFirst({
        where: {
          candidateId: candidate.id,
          yearMonth,
          deletedAt: null,
        },
      });
      const publicId = await this.ids.allocateNext('DEL');
      try {
        const review = await this.prisma.deliveryReview.create({
          data: {
            publicId,
            candidateId: candidate.id,
            yearMonth,
            reviewDate: new Date(reviewDate),
            utilizationPct: timesheet ? timesheet.attendancePct : null,
            timesheetMissing: !timesheet,
            clientFeedback: clientFeedback as ClientFeedback,
            engagementHealth: engagementHealth as EngagementHealth,
            escalationNotes: escalationNotes ?? null,
            reviewerId: actorUserId,
          },
        });
        await this.audit.record({
          actorUserId,
          action: 'IMPORT',
          entityType: 'DeliveryReview',
          entityId: review.id,
          entityPublicId: review.publicId,
          after: review,
        });
        created += 1;
      } catch (e) {
        if (isUniqueConflict(e)) {
          errors.push({
            row: i,
            field: 'yearMonth',
            message:
              'Delivery review already exists for candidate and yearMonth',
          });
        } else {
          throw e;
        }
      }
    }
    return created;
  }
}
