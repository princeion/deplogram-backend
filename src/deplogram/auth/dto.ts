import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';

export class SignInDto {
  @ApiProperty({ example: 'owner@deplogram.app' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password', minLength: 8 })
  @IsString()
  @MinLength(1)
  password: string;
}

export class SignUpDto {
  @ApiProperty({ example: 'Ada Lovelace', maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'analytical-engine', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

export class ViewerDto {
  @ApiProperty({ example: 'user_owner' })
  id: string;

  @ApiPropertyOptional({ example: 'Sam Rivera' })
  name: string | null;

  @ApiProperty({ example: 'owner@deplogram.app' })
  email: string;

  @ApiPropertyOptional({ example: null })
  image: string | null;
}
