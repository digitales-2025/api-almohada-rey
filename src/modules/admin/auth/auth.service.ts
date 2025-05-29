import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginAuthDto } from './dto';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleException } from 'src/utils';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Inicia la sesión del usuario, crea un token JWT y
   * lo guarda en cookies.
   *
   * El token JWT almacena Claims del usuario
   *
   * @param loginAuthDto  Datos para iniciar sesión
   * @param res  Respuesta HTTP
   */
  async login(loginAuthDto: LoginAuthDto, res: Response): Promise<void> {
    try {
      const { email, password } = loginAuthDto;

      // Buscamos el usuario por email
      const userDB = await this.userService.findByEmail(email);

      if (!userDB) {
        throw new NotFoundException('User not registered');
      }

      // Comparamos la contraseña ingresada con la contraseña encriptada
      if (!bcrypt.compareSync(password, userDB.password)) {
        throw new UnauthorizedException('Password incorrect');
      }

      // Actualizamos el ultimo login del usuario
      await this.userService.updateLastLogin(userDB.id);

      // Indicar que el usuario debe cambiar la contraseña si es la primera vez que inicia sesión
      if (userDB.mustChangePassword) {
        throw new ForbiddenException('You must change your password');
      }

      // Genera el token
      const token = this.getJwtToken({ id: userDB.id });

      // Configura la cookie HttpOnly
      res.cookie('ar_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: this.configService.get('COOKIE_EXPIRES_IN'),
        domain: process.env.WEB_DOMAIN,
        expires: new Date(
          Date.now() + this.configService.get('COOKIE_EXPIRES_IN'),
        ),
      });

      res.cookie('ar_status', true, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.WEB_DOMAIN,
        sameSite: 'strict',
        maxAge: this.configService.get('COOKIE_EXPIRES_IN'),
        expires: new Date(
          Date.now() + this.configService.get('COOKIE_EXPIRES_IN'),
        ),
      });

      // Genera el refresh token
      const refreshToken = this.getJwtRefreshToken({ id: userDB.id });

      // Configura la cookie HttpOnly para el refresh token
      res.cookie('ar_refresh', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.WEB_DOMAIN,
        sameSite: 'strict',
        path: '/',
        maxAge: this.configService.get('COOKIE_REFRESH_EXPIRES_IN'),
        expires: new Date(
          Date.now() + this.configService.get('COOKIE_REFRESH_EXPIRES_IN'),
        ),
      });

      res.json({
        id: userDB.id,
        name: userDB.name,
        email: userDB.email,
        phone: userDB.phone,
        isSuperAdmin: userDB.isSuperAdmin,
        userRol: userDB.userRol,
      });
    } catch (error) {
      this.logger.error(
        `Error logging in for email: ${loginAuthDto.email}`,
        error.stack,
      );
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      handleException(error, 'Error logging in');
    }
  }

  /**
   * Cierra la sesión del usuario
   * @param res Respuesta HTTP
   */
  async logout(res: Response): Promise<void> {
    // Borra la cookie que contiene el token JWT
    res.cookie('ar_token', '', {
      httpOnly: true,
      domain: process.env.WEB_DOMAIN,
      expires: new Date(0), // Establece la fecha de expiración a una fecha pasada para eliminar la cookie
    });

    // Borra la cookie que contiene el refresh token
    res.cookie('ar_refresh', '', {
      httpOnly: true,
      domain: process.env.WEB_DOMAIN,
      expires: new Date(0), // Establece la fecha de expiración a una fecha pasada para eliminar la cookie
    });

    // Borra la cookie que indica que el usuario está logueado
    res.cookie('ar_status', '', {
      httpOnly: false,
      domain: process.env.WEB_DOMAIN,
      expires: new Date(0), // Establece la fecha de expiración a una fecha pasada para eliminar la cookie
    });

    // Enviar una respuesta de éxito
    res.status(200).json({ message: 'Logout successful' });
  }

  /**
   * Actualiza la contraseña temporal del usuario
   * @param updatePasswordDto Datos para actualizar la contraseña
   * @returns Datos del usuario logueado
   */
  async updatePasswordTemp(
    updatePasswordDto: UpdatePasswordDto,
    res: Response,
  ): Promise<void> {
    try {
      const { email, password, newPassword, confirmPassword } =
        updatePasswordDto;

      const userDB = await this.userService.findByEmail(email);

      const isPasswordMatching = await bcrypt.compare(
        password,
        userDB.password,
      );

      if (!isPasswordMatching) {
        throw new UnauthorizedException('Password current do not match');
      }

      if (newPassword === password) {
        throw new ForbiddenException(
          'The new password must be different from the current one',
        );
      }

      if (newPassword !== confirmPassword) {
        throw new ForbiddenException('Passwords do not match');
      }

      await this.userService.updatePasswordTemp(userDB.id, updatePasswordDto);

      // Genera el token
      const token = this.getJwtToken({ id: userDB.id });

      // Configura la cookie HttpOnly
      res.cookie('ar_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.WEB_DOMAIN,
        sameSite: 'strict',
        path: '/',
        maxAge: this.configService.get('COOKIE_EXPIRES_IN'),
        expires: new Date(
          Date.now() + this.configService.get('COOKIE_EXPIRES_IN'),
        ),
      });

      // Genera el ar_refresh
      const refreshToken = this.getJwtRefreshToken({ id: userDB.id });

      // Configura la cookie HttpOnly
      res.cookie('ar_refresh', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.WEB_DOMAIN,
        sameSite: 'strict',
        path: '/',
        maxAge: this.configService.get('COOKIE_REFRESH_EXPIRES_IN'),
        expires: new Date(
          Date.now() + this.configService.get('COOKIE_REFRESH_EXPIRES_IN'),
        ),
      });

      res.json({
        id: userDB.id,
        name: userDB.name,
        email: userDB.email,
        phone: userDB.phone,
        isSuperAdmin: userDB.isSuperAdmin,
        userRol: userDB.userRol,
      });
    } catch (error) {
      this.logger.error('Error updating password', error.stack);
      handleException(error, 'Error updating password');
    }
  }

  /**
   * Genera un ar_token JWT
   * @param payload Payload para generar el token
   * @returns  Token generado
   */
  private getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN'),
    });
    return token;
  }

  /**
   * Genera un ar_refresh JWT
   * @param payload Payload para generar el token
   * @returns  Token generado
   */
  private getJwtRefreshToken(payload: any): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });
  }

  /**
   * Verifica si el token es válido
   * @param token Token a verificar
   * @returns  Datos del token
   */
  verifyToken(token: string): JwtPayload {
    return this.jwtService.verify(token);
  }

  /**
   * Verifica si el ar_refresh es válido
   * @param token Token a verificar
   * @returns  Datos del token
   */
  verifyRefreshToken(token: string): JwtPayload {
    return this.jwtService.verify(token, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
    });
  }

  /**
   * Actualizar un token JWT
   * @param res Respuesta HTTP
   * @param req Petición HTTP
   * @returns Datos del usuario logueado
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const message = 'Could not refresh access token';
      const ar_refresh = req.cookies.ar_refresh as string;
      const payload = this.verifyRefreshToken(ar_refresh);

      if (!payload) {
        throw new UnauthorizedException(message);
      }

      // Verifica si el usuario existe en la base de datos y si está activo
      const userDB = await this.userService.findById(payload.id);

      if (!userDB) {
        throw new UnauthorizedException(message);
      }

      if (!userDB.isActive) {
        throw new UnauthorizedException(message);
      }

      const newAccessToken = this.getJwtToken({
        id: payload.id,
      });

      res.cookie('ar_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.WEB_DOMAIN,
        sameSite: 'strict',
        path: '/',
        maxAge: this.configService.get<number>('COOKIE_EXPIRES_IN'), // tiempo corto para el ar_token
        expires: new Date(
          Date.now() + this.configService.get('COOKIE_EXPIRES_IN'),
        ),
      });

      const newRefreshToken = this.getJwtRefreshToken({ id: payload.id });

      res.cookie('ar_refresh', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.WEB_DOMAIN,
        sameSite: 'strict',
        path: '/',
        maxAge: this.configService.get<number>('COOKIE_REFRESH_EXPIRES_IN'), // tiempo largo para el ar_refresh
        expires: new Date(
          Date.now() + this.configService.get('COOKIE_REFRESH_EXPIRES_IN'),
        ),
      });

      res.cookie('ar_status', true, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.WEB_DOMAIN,
        sameSite: 'strict',
        maxAge: this.configService.get('COOKIE_EXPIRES_IN'),
        expires: new Date(
          Date.now() + this.configService.get('COOKIE_EXPIRES_IN'),
        ),
      });

      res.status(200).json({
        status: 'success',
        ar_token: newAccessToken,
      });
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
