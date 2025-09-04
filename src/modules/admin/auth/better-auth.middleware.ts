import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { auth } from './better-auth.config';

@Injectable()
export class BetterAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BetterAuthMiddleware.name);

  async use(req: Request, res: Response, next: NextFunction) {
    // Solo procesar rutas que empiecen con /api/auth
    if (!req.path.startsWith('/api/auth')) {
      return next();
    }

    this.logger.log(
      `🔄 BetterAuth Middleware processing: ${req.method} ${req.path}`,
    );

    try {
      // Crear un objeto Request compatible con Better Auth
      const url = new URL(req.url, `${req.protocol}://${req.get('host')}`);

      const betterAuthRequest = new Request(url.toString(), {
        method: req.method,
        headers: req.headers as HeadersInit,
        body:
          req.method !== 'GET' && req.method !== 'HEAD'
            ? JSON.stringify(req.body)
            : undefined,
      });

      // Llamar al handler de Better Auth
      const betterAuthResponse = await auth.handler(betterAuthRequest);

      // Copiar el status code
      res.status(betterAuthResponse.status);

      // Copiar todas las headers (incluyendo set-cookie para sesiones)
      betterAuthResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      // Enviar el body de la respuesta
      const responseBody = await betterAuthResponse.text();
      this.logger.log(`✅ BetterAuth response: ${betterAuthResponse.status}`);
      res.send(responseBody);
    } catch (error) {
      this.logger.error('❌ Better Auth middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
