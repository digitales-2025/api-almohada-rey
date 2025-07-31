import { Reflector } from '@nestjs/core';
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserRolType } from '@prisma/client'; // Importamos el enum desde Prisma

@Injectable()
export class UserRolGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const validRols: UserRolType[] = this.reflector.get<UserRolType[]>(
      'roles',
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!validRols) return true;
    if (validRols.length === 0) return true;
    if (!user) throw new BadRequestException('User not found');

    if (user.isSuperAdmin) return true; // Los superadmin siempre tienen acceso

    // Verificamos si el rol del usuario está en los roles permitidos
    if (validRols.includes(user.userRol)) return true;

    throw new ForbiddenException(
      'You do not have permission to access this resource',
    );
  }
}
