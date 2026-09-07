import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CandidateStatus, BillingType } from '@prisma/client';

export class CreateCandidateDto {
  @ApiProperty()
  @IsUUID()
  clientId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  fullName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sstReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joinedOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectAccount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientReportingManager?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  accountManagerUserId?: string;

  @ApiPropertyOptional({ description: 'Hourly billing rate in candidate currency' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  hourlyRate?: number;

  @ApiPropertyOptional({ enum: ['HOURLY', 'FIXED'], default: 'HOURLY' })
  @IsOptional()
  @IsEnum(BillingType)
  billingType?: BillingType;

  @ApiPropertyOptional({ description: 'Monthly fixed amount when billingType is FIXED' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  monthlyFixedAmount?: number;

  @ApiPropertyOptional({ description: 'Optional max billable hours ceiling (Hourly only)' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  maxBillableHours?: number;

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  hoursPerDay?: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateCandidateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobile?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sstReference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joinedOn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  contractEndDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectAccount?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workLocation?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientReportingManager?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  accountManagerUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  hourlyRate?: number | null;

  @ApiPropertyOptional({ enum: BillingType })
  @IsOptional()
  @IsEnum(BillingType)
  billingType?: BillingType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  monthlyFixedAmount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  maxBillableHours?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  hoursPerDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: CandidateStatus })
  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;
}

export class ReleaseCandidateDto {
  @ApiProperty()
  @IsDateString()
  contractEndDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  releaseReason?: string;
}
