import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { TimesheetsController } from './timesheets.controller';
import { TimesheetsService } from './timesheets.service';

@Module({
  imports: [InvoicesModule],
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
  exports: [TimesheetsService],
})
export class TimesheetsModule {}
