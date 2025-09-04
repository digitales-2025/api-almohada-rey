import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { BetterAuthAdapter } from '../better-auth.adapter';

@Injectable()
export class RefreshAuthGuard implements CanActivate {
  constructor(private readonly betterAuthAdapter: BetterAuthAdapter) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionToken = request.cookies['better-auth.session_token'];

    if (!sessionToken) {
      throw new UnauthorizedException('No session token found');
    }

    const sessionResult =
      await this.betterAuthAdapter.validateSession(sessionToken);

    if (!sessionResult.user) {
      throw new UnauthorizedException('Invalid session token');
    }

    // Agregar el usuario a la request para que esté disponible en el controlador
    request.user = sessionResult.user;

    return true;
  }
}
