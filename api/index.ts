/**
 * Vercel serverless entry point for the Deplogram NestJS backend.
 *
 * Bootstraps the Nest application once (cached across cold starts) and
 * forwards every incoming request to it. OpenAPI / Swagger UI is served at
 * /api/docs and the raw OpenAPI spec at /api/docs-json.
 */
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app-config.js';

let cachedServer: express.Express | null = null;
let initPromise: Promise<void> | null = null;

async function bootstrap(): Promise<express.Express> {
  if (cachedServer) return cachedServer;

  if (!initPromise) {
    initPromise = (async () => {
      const server = express();
      const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
      configureApp(app);
      await app.init();
      cachedServer = server;
    })();
  }
  await initPromise;
  return cachedServer!;
}

export default async function handler(req: any, res: any): Promise<void> {
  const server = await bootstrap();
  server(req, res);
}
