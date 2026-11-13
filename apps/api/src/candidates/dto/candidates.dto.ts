import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BenchFeedbackKind,
  BillingType,
  CandidateStatus,
  EmployeeCategory,
} from '@prisma/client';
import { SUPPORT_FUNCTIONS } from '../employee-category';

export const CANDIDATE_CURRENCIES = ['INR', 'DOLLAR'] as const;
export type CandidateCurrency = (typeof CANDIDATE_CURRENCIES)[number];

export class CreateCandidateDto {
  @ApiProperty({ enum: EmployeeCategory })
  @IsEnum(EmployeeCategory)
  category!: EmployeeCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string | null;

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

  @ApiProperty({ example: 'BRICKRED' })
  @IsString()
  @MinLength(1)
  costCenter!: string;

  @ApiPropertyOptional({
    description:
      'Required for BILLABLE. Must be a Delivery Owner assigned to the selected client.',
  })
  @IsOptional()
  @IsUUID()
  deliveryOwnerUserId?: string | null;

  @ApiPropertyOptional({
    description:
      'Required for BILLABLE. Must be an Account Owner assigned to the selected client.',
  })
  @IsOptional()
  @IsUUID()
  accountManagerUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salesOwnerUserId?: string | null;

  @ApiPropertyOptional({
    description: 'EMPLOYEE_TEAM lookup code (e.g. SUPPORT, LEADERSHIP, DELIVERY)',
  })
  @IsOptional()
  @IsString()
  team?: string | null;

  @ApiPropertyOptional({ enum: SUPPORT_FUNCTIONS })
  @IsOptional()
  @IsString()
  @IsIn(SUPPORT_FUNCTIONS)
  supportFunction?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  benchStartDate?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  interviewsScheduledCount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  interviewsClearedCount?: number;

  @ApiPropertyOptional({
    description: 'Remark for bench interview responses',
  })
  @IsOptional()
  @IsString()
  interviewRemark?: string | null;

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

  @ApiPropertyOptional({ enum: CANDIDATE_CURRENCIES, default: 'INR' })
  @IsOptional()
  @IsIn(CANDIDATE_CURRENCIES)
  currency?: CandidateCurrency;
}

export class UpdateCandidateDto {
  @ApiPropertyOptional({ enum: EmployeeCategory })
  @IsOptional()
  @IsEnum(EmployeeCategory)
  category?: EmployeeCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string | null;

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
  @MinLength(1)
  costCenter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deliveryOwnerUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  accountManagerUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salesOwnerUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  team?: string | null;

  @ApiPropertyOptional({ enum: SUPPORT_FUNCTIONS })
  @IsOptional()
  @IsIn(SUPPORT_FUNCTIONS)
  supportFunction?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  benchStartDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  interviewsScheduledCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  interviewsClearedCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interviewRemark?: string | null;

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

  @ApiPropertyOptional({ enum: CANDIDATE_CURRENCIES })
  @IsOptional()
  @IsIn(CANDIDATE_CURRENCIES)
  currency?: CandidateCurrency;

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

export class CreateBenchFeedbackDto {
  @ApiProperty({ enum: BenchFeedbackKind })
  @IsEnum(BenchFeedbackKind)
  kind!: BenchFeedbackKind;

  @ApiProperty()
  @IsDateString()
  feedbackDate!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  body!: string;
}
