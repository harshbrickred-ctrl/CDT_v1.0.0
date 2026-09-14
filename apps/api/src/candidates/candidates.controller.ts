import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CandidateStatus, Role } from '@prisma/client';
import { CandidatesService } from './candidates.service';
import {
  CreateCandidateDto,
  ReleaseCandidateDto,
  UpdateCandidateDto,
} from './dto/candidates.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('candidates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidates: CandidatesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: CandidateStatus,
    @Query('statuses') statuses?: string,
    @Query('q') q?: string,
  ) {
    const statusList = statuses
      ? (statuses
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean) as CandidateStatus[])
      : undefined;
    return this.candidates.findAll({
      user,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      clientId,
      status,
      statuses: statusList,
      q,
    });
  }

  @Get(':id/timeline')
  timeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.candidates.timeline(user, id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.candidates.findOne(user, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.DELIVERY_OWNER)
  create(@Body() dto: CreateCandidateDto, @CurrentUser() user: AuthUser) {
    return this.candidates.create(user, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.DELIVERY_OWNER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.candidates.update(user, id, dto);
  }

  @Post(':id/release')
  @Roles(Role.ADMIN, Role.DELIVERY_OWNER)
  release(
    @Param('id') id: string,
    @Body() dto: ReleaseCandidateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.candidates.release(user, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.DELIVERY_OWNER)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.candidates.softDelete(user, id);
  }
}
