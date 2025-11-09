import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body, query, params } = request;
    const now = Date.now();

    this.logger.log(
      `➡️  Incoming Request: ${method} ${url} | Query: ${JSON.stringify(query)} | Params: ${JSON.stringify(params)}`,
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - now;
          this.logger.log(
            `⬅️  Response: ${method} ${url} | Duration: ${duration}ms | Status: 200`,
          );
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `❌ Error Response: ${method} ${url} | Duration: ${duration}ms | Error: ${error.message}`,
          );
        },
      }),
    );
  }
}
