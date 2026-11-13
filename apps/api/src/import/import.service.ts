import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CandidateStatus,
  ClientFeedback,
  ClientOwnershipRole,
  EmployeeCategory,
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
import { isActiveCostCenterCode } from '../common/cost-center';
import { findActiveLookupValue } from '../common/lookup-codes';
import {
  normalizeEmployeeCategory,
  SUPPORT_FUNCTIONS,
} from '../candidates/employee-category';
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

  async dryRun(
    organizationId: string,
    dto: ImportBodyDto,
  ): Promise<ImportResult> {
    return this.run(organizationId, dto, false, null);
  }

  async commit(
    organizationId: string,
    dto: ImportBodyDto,
    actorUserId: string,
  ): Promise<ImportResult> {
    return this.run(organizationId, dto, true, actorUserId);
  }

  private async run(
    organizationId: string,
    dto: ImportBodyDto,
    commit: boolean,
    actorUserId: string | null,
  ): Promise<ImportResult> {
    const errors: ImportRowError[] = [];
    let created = 0;

    switch (dto.entity) {
      case 'clients':
        created = await this.importClients(
          organizationId,
          dto.rows,
          commit,
          actorUserId,
          errors,
        );
        break;
      case 'candidates':
        created = await this.importCandidates(
          organizationId,
          dto.rows,
          commit,
          actorUserId,
          errors,
        );
        break;
      case 'leaves':
        created = await this.importLeaves(
          organizationId,
          dto.rows,
          commit,
          actorUserId,
          errors,
        );
        break;
      case 'timesheets':
        created = await this.importTimesheets(
          organizationId,
          dto.rows,
          commit,
          actorUserId,
          errors,
        );
        break;
      case 'delivery-reviews':
        created = await this.importReviews(
          organizationId,
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
    organizationId: string,
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
        where: {
          organizationId_nameNormalized: { organizationId, nameNormalized },
        },
      });
      if (existing && !existing.deletedAt) {
        errors.push({
          row: i,
          field: 'name',
          message: 'Client name already exists',
        });
        continue;
      }
      const costCenter = await this.resolveImportCostCenter(row, i, errors);
      if (!costCenter) continue;
      if (!commit) continue;
      try {
        const client = existing?.deletedAt
          ? await this.prisma.client.update({
              where: { id: existing.id },
              data: {
                name,
                nameNormalized,
                code: str(row.code) ?? null,
                costCenter,
                isActive: true,
                deletedAt: null,
              },
            })
          : await this.prisma.client.create({
              data: {
                organizationId,
                name,
                nameNormalized,
                code: str(row.code) ?? null,
                costCenter,
              },
            });
        if (actorUserId) {
          await this.audit.record({
            organizationId,
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
    organizationId: string,
    rows: Record<string, unknown>[],
    commit: boolean,
    actorUserId: string | null,
    errors: ImportRowError[],
  ): Promise<number> {
    let created = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const fullName = str(row.fullName);
      if (!fullName) {
        errors.push({
          row: i,
          field: 'fullName',
          message: 'fullName is required',
        });
        continue;
      }
      const categoryRaw = str(row.category)?.toUpperCase();
      if (
        !categoryRaw ||
        !Object.values(EmployeeCategory).includes(categoryRaw as EmployeeCategory)
      ) {
        errors.push({
          row: i,
          field: 'category',
          message: 'category is required and must be BILLABLE, NON_BILLABLE, or BENCH',
        });
        continue;
      }
      const category = categoryRaw as EmployeeCategory;
      const disagreement = this.importCategoryDisagreement(category, row);
      if (disagreement) {
        errors.push({ row: i, field: disagreement.field, message: disagreement.message });
        continue;
      }

      let resolvedClientId: string | null = null;
      if (category === EmployeeCategory.BILLABLE) {
        resolvedClientId = await this.resolveImportClient(organizationId, row, i, errors);
        if (!resolvedClientId) continue;
      }

      let salesOwnerUserId: string | null = null;
      let accountManagerUserId: string | null = null;
      let deliveryOwnerUserId: string | null = null;
      if (category === EmployeeCategory.BILLABLE) {
        const sales = await this.resolveImportSalesOwner(organizationId, row, i, errors);
        if (sales === undefined) continue;
        salesOwnerUserId = sales;
        if (!resolvedClientId) continue;
        const owners = await this.resolveImportClientOwners(
          organizationId,
          resolvedClientId,
          row,
          i,
          errors,
        );
        if (!owners) continue;
        accountManagerUserId = owners.accountManagerUserId;
        deliveryOwnerUserId = owners.deliveryOwnerUserId;
      }

      const teamRaw = str(row.team)?.toUpperCase() ?? null;
      let team: string | null = null;
      if (teamRaw) {
        const teamLookup = await findActiveLookupValue(
          this.prisma,
          'EMPLOYEE_TEAM',
          teamRaw,
        );
        if (!teamLookup) {
          errors.push({
            row: i,
            field: 'team',
            message: 'team must be an active EMPLOYEE_TEAM lookup value',
          });
          continue;
        }
        team = teamLookup.code;
      }
      const supportFunction = str(row.supportFunction)?.toUpperCase() ?? null;
      if (
        supportFunction &&
        !SUPPORT_FUNCTIONS.includes(supportFunction as (typeof SUPPORT_FUNCTIONS)[number])
      ) {
        errors.push({
          row: i,
          field: 'supportFunction',
          message:
            'supportFunction must be HR, TA, ACCOUNTS, ADMIN, or FINANCE',
        });
        continue;
      }
      const interviews = num(row.interviewsScheduledCount);
      if (
        interviews !== undefined &&
        (!Number.isInteger(interviews) || interviews < 0)
      ) {
        errors.push({
          row: i,
          field: 'interviewsScheduledCount',
          message: 'interviewsScheduledCount must be a whole number of 0 or more',
        });
        continue;
      }
      const interviewsCleared = num(row.interviewsClearedCount);
      if (
        interviewsCleared !== undefined &&
        (!Number.isInteger(interviewsCleared) || interviewsCleared < 0)
      ) {
        errors.push({
          row: i,
          field: 'interviewsClearedCount',
          message: 'interviewsClearedCount must be a whole number of 0 or more',
        });
        continue;
      }

      let normalized;
      try {
        normalized = normalizeEmployeeCategory({
          category,
          clientId: resolvedClientId,
          team,
          supportFunction,
          salesOwnerUserId,
          benchStartDate: str(row.benchStartDate) ?? null,
          interviewsScheduledCount: interviews,
          interviewsClearedCount: interviewsCleared,
          interviewRemark: str(row.interviewRemark) ?? null,
        });
      } catch (e) {
        errors.push({
          row: i,
          field: 'category',
          message: e instanceof BadRequestException ? e.message : 'Invalid category fields',
        });
        continue;
      }

      const costCenter = await this.resolveImportCostCenter(row, i, errors);
      if (!costCenter) continue;
      const billable = normalized.category === EmployeeCategory.BILLABLE;
      if (!commit) continue;
      const publicId = await this.ids.allocateNext(organizationId, 'CD');
      const candidate = await this.prisma.candidate.create({
        data: {
          organizationId,
          publicId,
          category: normalized.category,
          clientId: normalized.clientId,
          fullName,
          email: str(row.email) ?? null,
          mobile: str(row.mobile) ?? null,
          roleTitle: billable ? str(row.roleTitle) ?? null : null,
          sstReference: billable ? str(row.sstReference) ?? null : null,
          joinedOn: str(row.joinedOn) ? new Date(str(row.joinedOn)!) : null,
          contractEndDate: str(row.contractEndDate)
            ? new Date(str(row.contractEndDate)!)
            : null,
          projectAccount: billable ? str(row.projectAccount) ?? null : null,
          workLocation: billable ? str(row.workLocation) ?? null : null,
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
          status: CandidateStatus.ACTIVE,
        },
      });
      if (actorUserId) {
        await this.audit.record({
          organizationId,
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

  private importCategoryDisagreement(
    category: EmployeeCategory,
    row: Record<string, unknown>,
  ): { field: string; message: string } | null {
    const has = (key: string) => {
      const value = row[key];
      if (value === null || value === undefined) return false;
      if (typeof value === 'string' && !value.trim()) return false;
      return true;
    };
    const clientFields = [
      'clientId',
      'clientName',
      'clientCode',
      'salesOwnerUserId',
      'salesOwnerEmail',
      'accountManagerUserId',
      'accountManagerEmail',
      'deliveryOwnerUserId',
      'deliveryOwnerEmail',
      'clientReportingManager',
    ];
    const benchFields = [
      'benchStartDate',
      'interviewsScheduledCount',
      'interviewsClearedCount',
      'interviewRemark',
    ];
    if (category !== EmployeeCategory.BILLABLE) {
      const field = clientFields.find((key) => has(key));
      if (field) {
        return {
          field,
          message: `${field} is only allowed when category is BILLABLE`,
        };
      }
    }
    if (category !== EmployeeCategory.BENCH) {
      const field = benchFields.find((key) => has(key));
      if (field) {
        return {
          field,
          message: `${field} is only allowed when category is BENCH`,
        };
      }
    }
    if (category === EmployeeCategory.BILLABLE && (has('team') || has('supportFunction'))) {
      return {
        field: has('team') ? 'team' : 'supportFunction',
        message: 'team and supportFunction are not allowed when category is BILLABLE',
      };
    }
    return null;
  }

  private async resolveImportClient(
    organizationId: string,
    row: Record<string, unknown>,
    rowIndex: number,
    errors: ImportRowError[],
  ): Promise<string | null> {
    let resolvedClientId = str(row.clientId);
    const clientName = str(row.clientName);
    const clientCode = str(row.clientCode);
    if (!resolvedClientId && clientName) {
      const client = await this.prisma.client.findFirst({
        where: {
          organizationId,
          deletedAt: null,
          nameNormalized: normalizeClientName(clientName),
        },
      });
      if (!client) {
        errors.push({ row: rowIndex, field: 'clientName', message: 'Client not found' });
        return null;
      }
      resolvedClientId = client.id;
    }
    if (!resolvedClientId && clientCode) {
      const client = await this.prisma.client.findFirst({
        where: { organizationId, deletedAt: null, code: clientCode },
      });
      if (!client) {
        errors.push({ row: rowIndex, field: 'clientCode', message: 'Client not found' });
        return null;
      }
      resolvedClientId = client.id;
    }
    if (!resolvedClientId) {
      errors.push({
        row: rowIndex,
        field: 'clientId',
        message: 'clientId, clientName, or clientCode is required for BILLABLE',
      });
      return null;
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        resolvedClientId,
      )
    ) {
      errors.push({
        row: rowIndex,
        field: 'clientId',
        message: 'clientId must be a client id',
      });
      return null;
    }
    const client = await this.prisma.client.findFirst({
      where: { id: resolvedClientId, organizationId, deletedAt: null },
    });
    if (!client) {
      errors.push({ row: rowIndex, field: 'clientId', message: 'Client not found' });
      return null;
    }
    return resolvedClientId;
  }

  /** undefined means the row already has an error. null means no sales owner. */
  private async resolveImportSalesOwner(
    organizationId: string,
    row: Record<string, unknown>,
    rowIndex: number,
    errors: ImportRowError[],
  ): Promise<string | null | undefined> {
    const salesOwnerUserId = str(row.salesOwnerUserId);
    if (
      salesOwnerUserId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        salesOwnerUserId,
      )
    ) {
      errors.push({
        row: rowIndex,
        field: 'salesOwnerUserId',
        message: 'salesOwnerUserId must be a user id',
      });
      return undefined;
    }
    const salesOwnerEmail = str(row.salesOwnerEmail)?.toLowerCase();
    if (!salesOwnerUserId && !salesOwnerEmail) return null;
    const byId = salesOwnerUserId
      ? await this.prisma.user.findFirst({
          where: { id: salesOwnerUserId, organizationId, deletedAt: null },
          select: { id: true, email: true },
        })
      : null;
    if (salesOwnerUserId && !byId) {
      errors.push({
        row: rowIndex,
        field: 'salesOwnerUserId',
        message: 'Sales owner was not found',
      });
      return undefined;
    }
    const byEmail = salesOwnerEmail
      ? await this.prisma.user.findFirst({
          where: { organizationId, email: salesOwnerEmail, deletedAt: null },
          select: { id: true },
        })
      : null;
    if (salesOwnerEmail && !byEmail) {
      errors.push({
        row: rowIndex,
        field: 'salesOwnerEmail',
        message: 'Sales owner was not found',
      });
      return undefined;
    }
    if (byId && byEmail && byId.id !== byEmail.id) {
      errors.push({
        row: rowIndex,
        field: 'salesOwnerEmail',
        message: 'salesOwnerUserId and salesOwnerEmail refer to different users',
      });
      return undefined;
    }
    return byId?.id ?? byEmail?.id ?? null;
  }

  /** Resolve costCenter from an import row; prefer explicit value, else BRICKRED. */
  private async resolveImportCostCenter(
    row: Record<string, unknown>,
    rowIndex: number,
    errors: ImportRowError[],
  ): Promise<string | null> {
    const raw = str(row.costCenter);
    if (!raw) {
      return 'BRICKRED';
    }
    const code = raw.toUpperCase();
    if (!(await isActiveCostCenterCode(this.prisma, code))) {
      errors.push({
        row: rowIndex,
        field: 'costCenter',
        message: 'costCenter must be an active COST_CENTER lookup value',
      });
      return null;
    }
    return code;
  }

  /** null means the row already has an error. */
  private async resolveImportClientOwners(
    organizationId: string,
    clientId: string,
    row: Record<string, unknown>,
    rowIndex: number,
    errors: ImportRowError[],
  ): Promise<{
    accountManagerUserId: string;
    deliveryOwnerUserId: string;
  } | null> {
    const resolveOne = async (
      role: ClientOwnershipRole,
      idKey: string,
      emailKey: string,
      label: string,
    ): Promise<string | null> => {
      const ownerships = await this.prisma.clientOwnership.findMany({
        where: { organizationId, clientId, ownershipRole: role },
        select: { userId: true },
        orderBy: { createdAt: 'asc' },
      });
      const ownerIds = ownerships.map((o) => o.userId);
      if (!ownerIds.length) {
        errors.push({
          row: rowIndex,
          field: idKey,
          message: `Client has no ${label.toLowerCase()} assigned`,
        });
        return null;
      }
      const requestedId = str(row[idKey]);
      const requestedEmail = str(row[emailKey])?.toLowerCase();
      if (requestedId) {
        if (!ownerIds.includes(requestedId)) {
          errors.push({
            row: rowIndex,
            field: idKey,
            message: `${label} must be assigned to the selected client`,
          });
          return null;
        }
        return requestedId;
      }
      if (requestedEmail) {
        const byEmail = await this.prisma.user.findFirst({
          where: { organizationId, email: requestedEmail, deletedAt: null },
          select: { id: true },
        });
        if (!byEmail || !ownerIds.includes(byEmail.id)) {
          errors.push({
            row: rowIndex,
            field: emailKey,
            message: `${label} must be assigned to the selected client`,
          });
          return null;
        }
        return byEmail.id;
      }
      return ownerIds[0]!;
    };

    const accountManagerUserId = await resolveOne(
      ClientOwnershipRole.ACCOUNT_OWNER,
      'accountManagerUserId',
      'accountManagerEmail',
      'Account owner',
    );
    if (!accountManagerUserId) return null;
    const deliveryOwnerUserId = await resolveOne(
      ClientOwnershipRole.DELIVERY_OWNER,
      'deliveryOwnerUserId',
      'deliveryOwnerEmail',
      'Delivery owner',
    );
    if (!deliveryOwnerUserId) return null;
    return { accountManagerUserId, deliveryOwnerUserId };
  }

  private async importLeaves(
    organizationId: string,
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
          organizationId,
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
      const publicId = await this.ids.allocateNext(organizationId, 'LV');
      const leave = await this.prisma.leave.create({
        data: {
          organizationId,
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
        organizationId,
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
    organizationId: string,
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
          organizationId,
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
      if (
        candidate.status !== CandidateStatus.ACTIVE ||
        candidate.category !== EmployeeCategory.BILLABLE
      ) {
        errors.push({
          row: i,
          field: 'candidateId',
          message: 'Timesheets can only be filled for active billable employees',
        });
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
          organizationId,
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
      const publicId = await this.ids.allocateNext(organizationId, 'TSH');
      try {
        const timesheet = await this.prisma.timesheet.create({
          data: {
            organizationId,
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
            organizationId,
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
    organizationId: string,
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
          organizationId,
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
      if (
        candidate.status !== CandidateStatus.ACTIVE ||
        candidate.category !== EmployeeCategory.BILLABLE
      ) {
        errors.push({
          row: i,
          field: 'candidateId',
          message: 'Delivery reviews can only be created for active billable employees',
        });
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
          organizationId,
          candidateId: candidate.id,
          yearMonth,
          deletedAt: null,
        },
      });
      const publicId = await this.ids.allocateNext(organizationId, 'DEL');
      try {
        const review = await this.prisma.deliveryReview.create({
          data: {
            organizationId,
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
          organizationId,
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
