import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && 'error' in body) {
        return response.status(status).json(body);
      }
      const message = typeof body === 'string' ? body : (body as { message?: string }).message ?? 'Error';
      const code = status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'ERROR';
      return response.status(status).json({ error: { code, message, details: {} } });
    }

    this.logger.error(exception);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} },
    });
  }
}
