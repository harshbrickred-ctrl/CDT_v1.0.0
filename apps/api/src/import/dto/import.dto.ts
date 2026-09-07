import { ArrayMinSize, IsArray, IsIn, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const IMPORT_ENTITIES = [
  'clients',
  'candidates',
  'leaves',
  'timesheets',
  'delivery-reviews',
] as const;

export type ImportEntity = (typeof IMPORT_ENTITIES)[number];

export class ImportBodyDto {
  @ApiProperty({ enum: IMPORT_ENTITIES })
  @IsIn(IMPORT_ENTITIES)
  entity!: ImportEntity;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  @ArrayMinSize(1)
  @IsObject({ each: true })
  rows!: Record<string, unknown>[];
}

export type ImportRowError = {
  row: number;
  field?: string;
  message: string;
};

export type ImportResult = {
  entity: ImportEntity;
  mode: 'dry-run' | 'commit';
  total: number;
  valid: number;
  invalid: number;
  created: number;
  errors: ImportRowError[];
};
