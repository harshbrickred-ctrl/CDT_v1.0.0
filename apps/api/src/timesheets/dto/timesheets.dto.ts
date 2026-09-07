import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpsertTimesheetDto {
  @ApiProperty()
  @IsUUID()
  candidateId!: string;

  @ApiProperty({ example: '2025-07' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  yearMonth!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  workingDays!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  daysWorked!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string | null;
}

export class RejectTimesheetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  remarks?: string;
}
