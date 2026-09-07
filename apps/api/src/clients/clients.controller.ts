import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/clients.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
  ) {
    return this.clients.findAll(
      user.organizationId,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
      q,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clients.findOne(user.organizationId, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.DELIVERY_MANAGER)
  create(@Body() dto: CreateClientDto, @CurrentUser() user: AuthUser) {
    return this.clients.create(user.organizationId, dto, user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.DELIVERY_MANAGER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clients.update(user.organizationId, id, dto, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.DELIVERY_MANAGER)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clients.softDelete(user.organizationId, id, user.id);
  }
}
