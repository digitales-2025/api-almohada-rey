import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      const user = request.user;
      if (!user) {
        throw new BadRequestException('User not found in request');
      }

      if (user.mustChangePassword) {
        throw new BadRequestException('You must change your password');
      }
      return true;
    } catch (error) {
      throw new BadRequestException('Session invalid', error);
    }
  }
}
