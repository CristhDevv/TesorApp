import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ocurrió un error interno en el servidor. Por favor intente nuevamente.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message || (res as any).error || message;
        if (Array.isArray(message)) {
          message = message.join(', ');
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'Ya existe un registro con información duplicada en este campo único.';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'No es posible completar la operación porque existen otros datos vinculados a este registro.';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'El registro solicitado no fue encontrado en la base de datos.';
          break;
        case 'P2024':
        case 'P2028':
          status = HttpStatus.SERVICE_UNAVAILABLE;
          message = 'El servidor de base de datos está experimentando alta demanda. Por favor reintente en unos segundos.';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = `Error en base de datos (${exception.code}): ${exception.message.split('\n').pop()}`;
      }
      this.logger.warn(`Prisma error [${exception.code}] on ${request.method} ${request.url}: ${exception.message}`);
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'No se pudo establecer conexión con la base de datos. Verifique la conexión a internet o el servicio Supabase.';
      this.logger.error(`Prisma init error on ${request.method} ${request.url}`, exception);
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error on ${request.method} ${request.url}`, exception.stack);
      if (exception.message.includes('Timed out') || exception.message.includes('timeout')) {
        status = HttpStatus.GATEWAY_TIMEOUT;
        message = 'La operación tardó demasiado en responder. Los cambios pueden haberse guardado parcialmente; por favor actualice la vista.';
      }
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    });
  }
}
