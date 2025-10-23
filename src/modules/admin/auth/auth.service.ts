import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginAuthDto } from './dto';
import { UsersService } from '../users/users.service';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleException } from 'src/utils';
import { BetterAuthAdapter } from './better-auth.adapter';
import { BETTER_AUTH_COOKIE_NAME } from 'src/utils/constants';

// Better Auth maneja las sesiones automáticamente - no necesitamos store manual

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UsersService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly betterAuthAdapter: BetterAuthAdapter,
  ) {}

  /**
   * Inicia la sesión del usuario usando Better Auth
   * Delega completamente la autenticación a Better Auth
   *
   * @param loginAuthDto  Datos para iniciar sesión
   * @param res  Respuesta HTTP
   */
  async login(
    loginAuthDto: LoginAuthDto,
    res: Response,
    req: Request,
  ): Promise<void> {
    try {
      const { email, password } = loginAuthDto;

      // Verificar que el usuario existe en nuestra base de datos y está activo
      const userDB = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!userDB) {
        throw new NotFoundException('Usuario no registrado');
      }

      if (!userDB.isActive) {
        throw new NotFoundException('Cuenta de usuario inactiva');
      }

      // Verificar que el usuario no necesita cambiar contraseña
      if (userDB.mustChangePassword) {
        throw new ForbiddenException('Debe cambiar su contraseña');
      }

      // Usar Better Auth nativo para autenticar y setear cookies
      const signInResult = await this.betterAuthAdapter.signInWithCookies(
        email,
        password,
        req,
        res,
      );

      if (signInResult.error || !signInResult.user) {
        this.logger.warn(`Login failed for ${email}: ${signInResult.error}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log(`User authenticated with Better Auth: ${email}`);

      // Actualizar último login
      await this.prisma.user.update({
        where: { id: userDB.id },
        data: { lastLogin: new Date() },
      });

      // Configurar cookies de estado para compatibilidad con el frontend
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

      // Retornar datos del usuario (datos de nuestra BD con campos personalizados)
      res.json({
        id: userDB.id,
        name: userDB.name,
        email: userDB.email,
        phone: userDB.phone,
        isSuperAdmin: userDB.isSuperAdmin,
        userRol: userDB.userRol,
      });

      this.logger.log(`User logged in successfully: ${email}`);
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
   * Cierra la sesión del usuario usando Better Auth
   * @param res Respuesta HTTP
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const sessionToken = req.cookies[BETTER_AUTH_COOKIE_NAME];

      // Usar Better Auth para cerrar sesión nativo
      if (sessionToken) {
        await this.betterAuthAdapter.signOut(sessionToken);
      }

      // Limpiar cookies manualmente para asegurar compatibilidad
      const isProduction = process.env.NODE_ENV === 'production';
      res.clearCookie(BETTER_AUTH_COOKIE_NAME, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
        domain: process.env.BETTER_AUTH_DOMAIN || undefined,
      });

      // Borra la cookie que indica que el usuario está logueado (compatibilidad)
      res.cookie('ar_status', '', {
        httpOnly: false,
        domain: process.env.WEB_DOMAIN,
        expires: new Date(0),
      });

      // Enviar una respuesta de éxito
      res.status(200).json({ message: 'Logout successful' });
      this.logger.log('User logged out successfully');
    } catch (error) {
      this.logger.error('Error during logout:', error);
      // Aún así intentar limpiar las cookies de compatibilidad
      res.cookie('ar_status', '', {
        httpOnly: false,
        domain: process.env.WEB_DOMAIN,
        expires: new Date(0),
      });
      res.status(200).json({ message: 'Logout successful' });
    }
  }

  /**
   * Actualiza la contraseña temporal del usuario usando Better Auth
   * @param updatePasswordDto Datos para actualizar la contraseña
   * @param res Respuesta HTTP
   */
  async updatePasswordTemp(
    updatePasswordDto: UpdatePasswordDto,
    res: Response,
  ): Promise<void> {
    try {
      const { email, password, newPassword, confirmPassword } =
        updatePasswordDto;

      // Validar que las contraseñas coincidan
      if (newPassword !== confirmPassword) {
        throw new ForbiddenException('Las contraseñas no coinciden');
      }

      // Validar que la nueva contraseña sea diferente a la actual
      if (newPassword === password) {
        throw new ForbiddenException(
          'La nueva contraseña no puede ser igual a la actual',
        );
      }

      // Verificar que el usuario existe y está activo
      const userDB = await this.userService.findByEmail(email);
      if (!userDB) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Verificar la contraseña actual usando Better Auth
      const isValidPassword = await this.betterAuthAdapter.verifyPassword(
        email,
        password,
      );

      if (!isValidPassword) {
        throw new UnauthorizedException('La contraseña actual es incorrecta');
      }

      // Obtener el hash de la nueva contraseña usando Better Auth
      const hashedNewPassword =
        await this.betterAuthAdapter.hashPassword(newPassword);

      // Actualizar la contraseña en la tabla Account usando Better Auth
      const normalizedEmail = email.toLowerCase();

      // Buscar la cuenta existente
      const existingAccount = await this.prisma.account.findFirst({
        where: {
          userId: userDB.id,
          providerId: { in: ['email', 'credential'] },
        },
      });

      if (existingAccount) {
        // Actualizar contraseña en la cuenta existente
        await this.prisma.account.update({
          where: { id: existingAccount.id },
          data: { password: hashedNewPassword },
        });
      } else {
        // Crear nueva cuenta si no existe
        await this.prisma.account.create({
          data: {
            userId: userDB.id,
            providerId: 'email',
            accountId: normalizedEmail,
            password: hashedNewPassword,
          },
        });
      }

      // Configurar cookies de estado para compatibilidad
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

      res.json({
        id: userDB.id,
        name: userDB.name,
        email: userDB.email,
        phone: userDB.phone,
        isSuperAdmin: userDB.isSuperAdmin,
        userRol: userDB.userRol,
      });

      this.logger.log(`Password updated successfully for user: ${email}`);
    } catch (error) {
      this.logger.error('Error updating password', error.stack);
      handleException(error, 'Error updating password');
    }
  }

  /**
   * Refresh token usando Better Auth
   * @param req Petición HTTP
   * @param res Respuesta HTTP
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const sessionToken = req.cookies['better-auth.session_token'];

      if (!sessionToken) {
        throw new UnauthorizedException('No session token found');
      }

      // Validar sesión con Better Auth
      const sessionResult =
        await this.betterAuthAdapter.validateSession(sessionToken);

      if (!sessionResult.user) {
        throw new UnauthorizedException('Invalid session token');
      }

      // Verificar que el usuario existe y está activo en nuestra base de datos
      const userDB = await this.userService.findById(sessionResult.user.id);
      if (!userDB) {
        throw new UnauthorizedException('User not found');
      }

      // Configurar cookies de estado para compatibilidad
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
        message: 'Session refreshed successfully',
      });
    } catch (error) {
      this.logger.error('Error refreshing token:', error);
      throw new UnauthorizedException('Invalid session token');
    }
  }
}
