import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  find(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.search.search(
      user,
      q ?? '',
      limit ? Number(limit) : 20,
    );
  }
}
