import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EngagementHealth } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(
    @Query('clientId') clientId?: string,
    @Query('health') health?: EngagementHealth,
    @Query('month') month?: string,
  ) {
    return this.dashboard.summary({ clientId, health, month });
  }

  @Get('overdue-reviews')
  overdueReviews(@Query('month') month?: string) {
    return this.dashboard.overdueReviews(month);
  }

  @Get('kpi-detail')
  kpiDetail(
    @Query('kpi') kpi: string,
    @Query('clientId') clientId?: string,
    @Query('health') health?: EngagementHealth,
    @Query('month') month?: string,
  ) {
    return this.dashboard.kpiDetail({ kpi, clientId, health, month });
  }
}
