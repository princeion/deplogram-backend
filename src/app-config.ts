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
  app.use('/api/docs-json', (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  });
  // Serve Swagger UI from CDN so it works in serverless environments.
  app.use('/api/docs', (req: any, res: any) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Deplogram API — Swagger UI</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.1/swagger-ui.css" />
  <style>html { box-sizing: border-box; overflow-y: scroll; } *, *:before, *:after { box-sizing: inherit; } body { margin: 0; background: #fafafa; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.1/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.1/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api/docs-json',
        dom_id: '#swagger-ui',
        domNode: document.getElementById('swagger-ui'),
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
      });
      window.ui = ui;
    };
  </script>
</body>
</html>`);
  });
}
