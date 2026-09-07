import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ImportService } from './import.service';
import { ImportBodyDto } from './dto/import.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('import')
export class ImportController {
  constructor(private readonly imports: ImportService) {}

  @Post('dry-run')
  dryRun(@Body() dto: ImportBodyDto, @CurrentUser() user: AuthUser) {
    return this.imports.dryRun(user.organizationId, dto);
  }

  @Post('commit')
  commit(@Body() dto: ImportBodyDto, @CurrentUser() user: AuthUser) {
    return this.imports.commit(user.organizationId, dto, user.id);
  }
}
