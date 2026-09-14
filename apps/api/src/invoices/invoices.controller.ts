import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoiceStatus, Role } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { GenerateInvoiceDto, RejectInvoiceDto } from './dto/invoices.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: InvoiceStatus,
    @Query('yearMonth') yearMonth?: string,
    @Query('candidateId') candidateId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.invoices.findAll({
      user,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      status,
      yearMonth,
      candidateId,
      clientId,
    });
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoices.findOne(user, id);
  }

  @Post('generate')
  @Roles(Role.ADMIN, Role.DELIVERY_OWNER, Role.ACCOUNT_OWNER)
  generate(@Body() dto: GenerateInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.invoices.generate(user.organizationId, dto, user.id);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN, Role.ACCOUNT_OWNER)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoices.approve(user, id);
  }

  @Post(':id/send')
  @Roles(Role.ADMIN, Role.ACCOUNT_OWNER)
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoices.send(user, id);
  }

  @Post(':id/mark-paid')
  @Roles(Role.ADMIN, Role.ACCOUNT_OWNER)
  markPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoices.markPaid(user, id);
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN, Role.ACCOUNT_OWNER)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoices.reject(user, id, dto);
  }
}
