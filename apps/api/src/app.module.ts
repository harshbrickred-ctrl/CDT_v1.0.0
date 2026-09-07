import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { IdSequenceModule } from './common/id-sequence.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { ClientsModule } from './clients/clients.module';
import { LookupsModule } from './lookups/lookups.module';
import { CandidatesModule } from './candidates/candidates.module';
import { LeavesModule } from './leaves/leaves.module';
import { TimesheetsModule } from './timesheets/timesheets.module';
import { DeliveryReviewsModule } from './delivery-reviews/delivery-reviews.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ImportModule } from './import/import.module';
import { SearchModule } from './search/search.module';
import { InvoicesModule } from './invoices/invoices.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    IdSequenceModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AuditModule,
    ClientsModule,
    LookupsModule,
    CandidatesModule,
    LeavesModule,
    TimesheetsModule,
    DeliveryReviewsModule,
    DashboardModule,
    ImportModule,
    SearchModule,
    InvoicesModule,
  ],
})
export class AppModule {}
