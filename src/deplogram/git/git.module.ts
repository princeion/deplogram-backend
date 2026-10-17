import { Global, Module } from '@nestjs/common';

import { GitController } from './git.controller.js';

@Global()
@Module({
  controllers: [GitController],
})
export class GitModule {}
