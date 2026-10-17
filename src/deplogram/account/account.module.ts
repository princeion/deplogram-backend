import { Global, Module } from '@nestjs/common';

import { AccountController } from './account.controller.js';

@Global()
@Module({
  controllers: [AccountController],
})
export class AccountModule {}
