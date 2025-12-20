import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    // Log the response when it finishes
    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;

      // Format: [Method] Path - Status Duration
      console.log(
        `[${method}] ${originalUrl} - ${statusCode} ${duration}ms`,
      );
    });

    next();
  }
}
