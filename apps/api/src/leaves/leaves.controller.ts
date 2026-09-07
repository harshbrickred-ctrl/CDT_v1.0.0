import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LeaveStatus, Role } from '@prisma/client';
import { LeavesService } from './leaves.service';
import {
  CreateLeaveDto,
  RejectLeaveDto,
  UpdateLeaveDto,
} from './dto/leaves.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leaves')
export class LeavesController {
  constructor(private readonly leaves: LeavesService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('candidateId') candidateId?: string,
    @Query('status') status?: LeaveStatus,
    @Query('clientId') clientId?: string,
  ) {
    return this.leaves.findAll({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      candidateId,
      status,
      clientId,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.leaves.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateLeaveDto, @CurrentUser() user: AuthUser) {
    return this.leaves.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leaves.update(id, dto, user.id);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN, Role.ACCOUNT_MANAGER)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leaves.approve(id, user.id);
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN, Role.ACCOUNT_MANAGER)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectLeaveDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leaves.reject(id, dto, user.id);
  }
}
