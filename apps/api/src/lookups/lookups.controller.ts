import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { LookupsService } from './lookups.service';
import {
  CreateLookupValueDto,
  UpdateLookupValueDto,
} from './dto/lookups.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('lookups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lookups')
export class LookupsController {
  constructor(private readonly lookups: LookupsService) {}

  @Get()
  findAll() {
    return this.lookups.findAll();
  }

  @Post('values')
  @Roles(Role.ADMIN)
  createValue(@Body() dto: CreateLookupValueDto) {
    return this.lookups.createValue(dto);
  }

  @Patch('values/:id')
  @Roles(Role.ADMIN)
  updateValue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLookupValueDto,
  ) {
    return this.lookups.updateValue(id, dto);
  }

  @Get(':typeCode')
  findByTypeCode(@Param('typeCode') typeCode: string) {
    return this.lookups.findByTypeCode(typeCode);
  }
}
