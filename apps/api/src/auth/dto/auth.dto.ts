import {
  IsEmail,
  IsIn,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@sst.local' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'brickred', enum: ['brickred', 'agyom'] })
  @IsString()
  @IsIn(['brickred', 'agyom'])
  organization!: 'brickred' | 'agyom';
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
