import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApprovalStatus, Role } from '@prisma/client';
import { TimesheetsService } from './timesheets.service';
import {
  RejectTimesheetDto,
  UpsertTimesheetDto,
} from './dto/timesheets.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('timesheets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('timesheets')
export class TimesheetsController {
  constructor(private readonly timesheets: TimesheetsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('candidateId') candidateId?: string,
    @Query('yearMonth') yearMonth?: string,
    @Query('clientId') clientId?: string,
    @Query('approvalStatus') approvalStatus?: ApprovalStatus,
  ) {
    return this.timesheets.findAll({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      candidateId,
      yearMonth,
      clientId,
      approvalStatus,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.timesheets.findOne(id);
  }

  @Put()
  upsert(@Body() dto: UpsertTimesheetDto, @CurrentUser() user: AuthUser) {
    return this.timesheets.upsert(dto, user.id);
  }

  @Post(':id/recalculate')
  recalculate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.timesheets.recalculate(id, user.id);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN, Role.ACCOUNT_MANAGER)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.timesheets.approve(id, user.id);
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN, Role.ACCOUNT_MANAGER)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectTimesheetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.timesheets.reject(id, dto, user.id);
  }
}
