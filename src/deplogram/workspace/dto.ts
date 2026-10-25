import { ApiProperty } from '@nestjs/swagger';

export class WorkspaceDto {
  @ApiProperty({ example: 'ws_personal' })
  id: string;

  @ApiProperty({ example: 'Personal Galley' })
  name: string;

  @ApiProperty({ example: 'personal' })
  kind: 'personal' | 'team';

  @ApiProperty({ example: 'free' })
  plan: 'free' | 'plus' | 'pro' | 'enterprise';
}
