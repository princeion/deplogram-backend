import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // OpenAPI documentation — served at /api/docs (Swagger UI) with the spec at /api/docs-json.
  const config = new DocumentBuilder()
    .setTitle('Deplogram API')
    .setDescription('Backend API for the Deplogram deployment platform. Contract defined by deplogram-web.')
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
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
  app.use('/api/docs-json', (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
