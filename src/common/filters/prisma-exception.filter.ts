import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    switch (exception.code) {
      case 'P2002': {
        // Unique constraint violation
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[]) || [];
        const fields = target.join(', ');
        message = fields
          ? `A record with this ${fields} already exists`
          : 'This record already exists';
        break;
      }

      case 'P2003': {
        // Foreign key constraint violation
        status = HttpStatus.BAD_REQUEST;
        const field = exception.meta?.field_name as string;
        message = field
          ? `Invalid reference: ${field} does not exist`
          : 'Invalid reference to related record';
        break;
      }

      case 'P2025': {
        // Record not found
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        break;
      }

      case 'P2014': {
        // Required relation violation
        status = HttpStatus.BAD_REQUEST;
        message = 'Cannot perform operation due to required relationships';
        break;
      }

      case 'P2016': {
        // Query interpretation error
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid query parameters';
        break;
      }

      default: {
        // Generic Prisma error
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Database operation failed';
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.code,
      timestamp: new Date().toISOString(),
    });
  }
}
