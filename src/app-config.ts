import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';

/**
 * Configures a NestJS application instance with CORS, validation pipes, and
 * OpenAPI / Swagger documentation. Used by both `src/main.ts` (local/dev) and
 * `api/index.ts` (Vercel serverless).
 */
export function configureApp(app: INestApplication): void {
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Deplogram API')
    .setDescription(
      'Backend API for the Deplogram deployment platform. Contract defined by deplogram-web.',
    )
    .setVersion('1.0.0')
    .addTag('auth', 'Sign-in / sign-out and current viewer')
    .addTag('me', 'Account settings and deletion')
    .addTag('workspace', 'Workspace and plan')
    .addTag('traffic', 'Live workspace traffic')
    .addTag('usage', 'Plan usage and limits')
    .addTag('projects', 'Projects, environment variables, logs and metrics')
    .addTag('deployments', 'Deployment list, detail, build logs, redeploy and rollback')
    .addTag('git', 'Git connection, repositories, branches and runtime detection')
    .addTag('activity', 'Audit / activity feed')
    .addServer('http://localhost:3000', 'Local development')
    .addServer(
      'https://deplogram-backend.vercel.app',
      'Production',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
  app.use('/api/docs-json', (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  });
}
