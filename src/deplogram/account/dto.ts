import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';

export class AccountPreferencesDto {
  @ApiProperty({ example: 'nextjs' })
  @IsString()
  defaultRuntime: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  deploymentEmails: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  productUpdates: boolean;
}

export class AccountSettingsDto {
  @ApiProperty({ example: 'Sam Rivera' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'sam@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ type: AccountPreferencesDto })
  preferences: AccountPreferencesDto;
}
