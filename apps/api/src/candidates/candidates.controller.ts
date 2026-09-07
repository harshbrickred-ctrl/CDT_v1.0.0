import {
  Body,
  Controller,
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
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: CandidateStatus,
    @Query('q') q?: string,
  ) {
    return this.candidates.findAll({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      clientId,
      status,
      q,
    });
  }

  @Get(':id/timeline')
  timeline(@Param('id') id: string) {
    return this.candidates.timeline(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.candidates.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.DELIVERY_MANAGER)
  create(@Body() dto: CreateCandidateDto, @CurrentUser() user: AuthUser) {
    return this.candidates.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.DELIVERY_MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.candidates.update(id, dto, user.id);
  }

  @Post(':id/release')
  @Roles(Role.ADMIN, Role.DELIVERY_MANAGER)
  release(
    @Param('id') id: string,
    @Body() dto: ReleaseCandidateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.candidates.release(id, dto, user.id);
  }
}
