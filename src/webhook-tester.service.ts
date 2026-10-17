import * as http from 'http';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class WebhookTesterService implements OnModuleInit {
  private readonly logger = new Logger(WebhookTesterService.name);
  private receivedRequests: Array<{
    method: string;
    url: string;
    headers: Record<string, unknown>;
    body: unknown;
  }> = [];
  private server: any;

  onModuleInit() {
    this.server = http.createServer(
      (req: http.IncomingMessage, res: http.ServerResponse) => {
        let body = '';
        req.on('data', (chunk: string | Buffer) => {
          body += typeof chunk === 'string' ? chunk : chunk.toString();
        });
        req.on('end', () => {
          try {
            const parsedBody = body ? JSON.parse(body) : null;
            this.receivedRequests.push({
              method: req.method ?? 'UNKNOWN',
              url: req.url ?? '',
              headers: req.headers as Record<string, unknown>,
              body: parsedBody,
            });
          } catch {
            this.receivedRequests.push({
              method: req.method ?? 'UNKNOWN',
              url: req.url ?? '',
              headers: req.headers as Record<string, unknown>,
              body,
            });
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        });
      },
    );

    this.server.listen(0, () => {
      const port = this.server.address().port;
      this.logger.log(`Webhook tester listening on port ${port}`);
    });
  }

  trigger(url: string, method: string = 'POST', body?: any): Observable<any> {
    return new Observable((observer) => {
      const parsedUrl = new URL(url, 'http://localhost');
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.pathname || '/',
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
      };

      const req = http.request(options, (res: http.IncomingMessage) => {
        let data = '';
        res.on('data', (chunk: string | Buffer) => {
          data += typeof chunk === 'string' ? chunk : chunk.toString();
        });
        res.on('end', () => {
          try {
            observer.next(JSON.parse(data));
          } catch {
            observer.next(data);
          }
          observer.complete();
        });
      });

      req.on('error', (error: Error) => {
        observer.error(error);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  getReceivedRequests(): Array<{
    method: string;
    url: string;
    headers: Record<string, unknown>;
    body: unknown;
  }> {
    return this.receivedRequests;
  }

  clearRequests(): void {
    this.receivedRequests = [];
  }
}
