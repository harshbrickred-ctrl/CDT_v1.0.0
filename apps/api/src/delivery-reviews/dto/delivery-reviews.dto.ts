import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientFeedback, EngagementHealth } from '@prisma/client';

export class UpsertDeliveryReviewDto {
  @ApiProperty()
  @IsUUID()
  candidateId!: string;

  @ApiProperty({ example: '2025-07' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  yearMonth!: string;

  @ApiProperty()
  @IsDateString()
  reviewDate!: string;

  @ApiProperty({ enum: ClientFeedback })
  @IsEnum(ClientFeedback)
  clientFeedback!: ClientFeedback;

  @ApiProperty({ enum: EngagementHealth })
  @IsEnum(EngagementHealth)
  engagementHealth!: EngagementHealth;

  @ApiPropertyOptional()
  @ValidateIf(
    (o: UpsertDeliveryReviewDto) =>
      o.engagementHealth === EngagementHealth.AT_RISK ||
      o.engagementHealth === EngagementHealth.ESCALATED,
  )
  @IsString()
  @MinLength(1)
  escalationNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
