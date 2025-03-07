import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UsersService } from '../../users/users.service';
import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { UserData } from 'src/interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userService: UsersService,
    configService: ConfigService,
  ) {
    super({
      secretOrKey: configService.get('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtStrategy.extractJWTFromCookie,
      ]),
    });
  }

  private static extractJWTFromCookie(req: Request): string | null {
    if (req.cookies && req.cookies.access_token) {
      return req.cookies.access_token;
    }
    return null;
  }

  async validate(payload: JwtPayload): Promise<UserData> {
    const { id: idPayload } = payload;

    const user = await this.userService.findById(idPayload);

    if (!user.isActive)
      throw new UnauthorizedException(
        'User is not active, talk to the administrator',
      );

    const { id, name, email, phone, isSuperAdmin, userRol } = user;

    return {
      id,
      name,
      email,
      phone,
      isSuperAdmin,
      userRol,
    };
  }
}
