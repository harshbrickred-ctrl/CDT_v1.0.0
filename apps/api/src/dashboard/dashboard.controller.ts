import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EngagementHealth } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(
    @CurrentUser() user: AuthUser,
    @Query('clientId') clientId?: string,
    @Query('health') health?: EngagementHealth,
    @Query('month') month?: string,
  ) {
    return this.dashboard.summary({
      organizationId: user.organizationId,
      clientId,
      health,
      month,
    });
  }

  @Get('overdue-reviews')
  overdueReviews(
    @CurrentUser() user: AuthUser,
    @Query('month') month?: string,
  ) {
    return this.dashboard.overdueReviews(user.organizationId, month);
  }

  @Get('kpi-detail')
  kpiDetail(
    @CurrentUser() user: AuthUser,
    @Query('kpi') kpi: string,
    @Query('clientId') clientId?: string,
    @Query('health') health?: EngagementHealth,
    @Query('month') month?: string,
  ) {
    return this.dashboard.kpiDetail({
      organizationId: user.organizationId,
      kpi,
      clientId,
      health,
      month,
    });
  }
}
