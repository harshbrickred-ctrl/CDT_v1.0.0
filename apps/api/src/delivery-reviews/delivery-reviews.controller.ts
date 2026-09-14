import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EngagementHealth, Role } from '@prisma/client';
import { DeliveryReviewsService } from './delivery-reviews.service';
import { UpsertDeliveryReviewDto } from './dto/delivery-reviews.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('delivery-reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('delivery-reviews')
export class DeliveryReviewsController {
  constructor(private readonly reviews: DeliveryReviewsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('candidateId') candidateId?: string,
    @Query('yearMonth') yearMonth?: string,
    @Query('clientId') clientId?: string,
    @Query('health') health?: EngagementHealth,
  ) {
    return this.reviews.findAll({
      user,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      candidateId,
      yearMonth,
      clientId,
      health,
    });
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reviews.findOne(user, id);
  }

  @Put()
  @Roles(Role.ADMIN, Role.DELIVERY_OWNER)
  upsert(
    @Body() dto: UpsertDeliveryReviewDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reviews.upsert(user.organizationId, dto, user.id);
  }
}
