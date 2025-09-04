import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BETTER_AUTH_COOKIE_NAME } from 'src/utils/constants';
import { BetterAuthAdapter } from '../better-auth.adapter';

@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly betterAuthAdapter: BetterAuthAdapter,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const sessionToken = request.cookies?.[BETTER_AUTH_COOKIE_NAME];

    if (!sessionToken) {
      throw new UnauthorizedException('Session token not found');
    }

    try {
      // Usar Better Auth nativo para validar la sesión
      const { session, user } =
        await this.betterAuthAdapter.validateSession(sessionToken);

      if (!session || !user) {
        throw new UnauthorizedException('Sesión inválida o expirada');
      }

      // Obtener el usuario completo desde nuestra BD
      const dbUser = await this.prisma.user.findUnique({
        where: {
          id: user.id,
        },
      });

      if (!dbUser || !dbUser.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Agregar el usuario completo a la request (con campos personalizados)
      request.user = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        isSuperAdmin: dbUser.isSuperAdmin,
        userRol: dbUser.userRol,
        mustChangePassword: dbUser.mustChangePassword,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid session token');
    }
  }
}
