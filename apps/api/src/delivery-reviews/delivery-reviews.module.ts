import { Module } from '@nestjs/common';
import { DeliveryReviewsController } from './delivery-reviews.controller';
import { DeliveryReviewsService } from './delivery-reviews.service';

@Module({
  controllers: [DeliveryReviewsController],
  providers: [DeliveryReviewsService],
  exports: [DeliveryReviewsService],
})
export class DeliveryReviewsModule {}
