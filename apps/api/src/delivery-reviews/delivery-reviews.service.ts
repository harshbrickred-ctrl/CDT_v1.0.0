import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EngagementHealth,
  Prisma,
} from '@prisma/client';
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
import { throwConflictIfUnique, toNumber } from '../common/prisma-error';
import { UpsertDeliveryReviewDto } from './dto/delivery-reviews.dto';

const reviewInclude = {
  candidate: {
    select: {
      id: true,
      publicId: true,
      fullName: true,
      roleTitle: true,
      clientId: true,
      client: { select: { id: true, name: true } },
    },
  },
  reviewer: {
    select: { id: true, fullName: true, email: true },
  },
} as const;

@Injectable()
export class DeliveryReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdSequenceService,
    private readonly audit: AuditService,
  ) {}

  private serialize(row: {
    utilizationPct: Prisma.Decimal | number | null;
    [key: string]: unknown;
  }) {
    return {
      ...row,
      utilizationPct: toNumber(row.utilizationPct),
    };
  }

  private assertEscalationNotes(dto: UpsertDeliveryReviewDto) {
    if (
      (dto.engagementHealth === EngagementHealth.AT_RISK ||
        dto.engagementHealth === EngagementHealth.ESCALATED) &&
      !dto.escalationNotes?.trim()
    ) {
      throw new BadRequestException(
        'escalationNotes is required when engagementHealth is AT_RISK or ESCALATED',
      );
    }
  }

  async findAll(params: {
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>;
    page?: number;
    pageSize?: number;
    candidateId?: string;
    yearMonth?: string;
    clientId?: string;
    health?: EngagementHealth;
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
    const where: Prisma.DeliveryReviewWhereInput = {
      organizationId: params.user.organizationId,
      deletedAt: null,
      ...(params.candidateId ? { candidateId: params.candidateId } : {}),
      ...(params.yearMonth ? { yearMonth: params.yearMonth } : {}),
      ...(params.health ? { engagementHealth: params.health } : {}),
      ...(candidateScope
        ? { candidate: { deletedAt: null, ...candidateScope } }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.deliveryReview.count({ where }),
      this.prisma.deliveryReview.findMany({
        where,
        include: reviewInclude,
        orderBy: [{ yearMonth: 'desc' }, { createdAt: 'desc' }],
        skip: paginationSkip(page, pageSize),
        take: pageSize,
      }),
    ]);
    return {
      items: items.map((r) => this.serialize(r)),
      meta: paginationMeta(total, page, pageSize),
    };
  }

  async findOne(
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    id: string,
  ) {
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, user);
    if (emptyIfNoAccess(ownedClientIds)) {
      throw new NotFoundException('Delivery review not found');
    }
    const candidateScope = withCandidateClientScope(ownedClientIds);
    const row = await this.prisma.deliveryReview.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        deletedAt: null,
        ...(candidateScope ? { candidate: candidateScope } : {}),
      },
      include: reviewInclude,
    });
    if (!row) throw new NotFoundException('Delivery review not found');
    return this.serialize(row);
  }

  async upsert(
    organizationId: string,
    dto: UpsertDeliveryReviewDto,
    actorUserId: string,
  ) {
    this.assertEscalationNotes(dto);
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: dto.candidateId, organizationId, deletedAt: null },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');

    const timesheet = await this.prisma.timesheet.findFirst({
      where: {
        organizationId,
        candidateId: dto.candidateId,
        yearMonth: dto.yearMonth,
        deletedAt: null,
      },
    });
    const timesheetMissing = !timesheet;
    const utilizationPct = timesheet
      ? toNumber(timesheet.attendancePct)
      : null;

    const existing = await this.prisma.deliveryReview.findUnique({
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
        const row = await this.prisma.deliveryReview.update({
          where: { id: existing.id },
          data: {
            reviewDate: new Date(dto.reviewDate),
            utilizationPct,
            timesheetMissing,
            clientFeedback: dto.clientFeedback,
            engagementHealth: dto.engagementHealth,
            escalationNotes: dto.escalationNotes?.trim() || null,
            reviewerId: actorUserId,
          },
          include: reviewInclude,
        });
        await this.audit.record({
          organizationId,
          actorUserId,
          action: 'UPDATE',
          entityType: 'DeliveryReview',
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
        const row = await this.prisma.deliveryReview.update({
          where: { id: existing.id },
          data: {
            reviewDate: new Date(dto.reviewDate),
            utilizationPct,
            timesheetMissing,
            clientFeedback: dto.clientFeedback,
            engagementHealth: dto.engagementHealth,
            escalationNotes: dto.escalationNotes?.trim() || null,
            reviewerId: actorUserId,
            deletedAt: null,
          },
          include: reviewInclude,
        });
        await this.audit.record({
          organizationId,
          actorUserId,
          action: 'CREATE',
          entityType: 'DeliveryReview',
          entityId: row.id,
          entityPublicId: row.publicId,
          after: this.serialize(row),
        });
        return this.serialize(row);
      }

      const publicId = await this.ids.allocateNext(organizationId, 'DEL');
      const row = await this.prisma.deliveryReview.create({
        data: {
          organizationId,
          publicId,
          candidateId: dto.candidateId,
          yearMonth: dto.yearMonth,
          reviewDate: new Date(dto.reviewDate),
          utilizationPct,
          timesheetMissing,
          clientFeedback: dto.clientFeedback,
          engagementHealth: dto.engagementHealth,
          escalationNotes: dto.escalationNotes?.trim() || null,
          reviewerId: actorUserId,
        },
        include: reviewInclude,
      });
      await this.audit.record({
        organizationId,
        actorUserId,
        action: 'CREATE',
        entityType: 'DeliveryReview',
        entityId: row.id,
        entityPublicId: row.publicId,
        after: this.serialize(row),
      });
      return this.serialize(row);
    } catch (e) {
      throwConflictIfUnique(
        e,
        'Delivery review already exists for candidate and yearMonth',
      );
    }
  }
}
