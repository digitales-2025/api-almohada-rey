import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BETTER_AUTH_COOKIE_NAME } from 'src/utils/constants';
import { AuthSession, AuthUser, auth } from './better-auth.config';
import { Response, CookieOptions } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

// Constantes para mensajes de error consistentes
const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  AUTHENTICATION_FAILED: 'Autenticación fallida',
  INVALID_EMAIL: 'Formato de email inválido',
  INVALID_INPUT: 'Parámetros de entrada inválidos',
} as const;

// Interfaces para tipar respuestas de Better Auth
interface BetterAuthSessionResponse {
  user: AuthUser;
  session?: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface SignInResult {
  session: AuthSession | null;
  user: AuthUser | null;
  error?: string;
}

export interface SessionValidationResult {
  session: AuthSession | null;
  user: AuthUser | null;
}

export interface SignUpResult {
  user: AuthUser | null;
  error?: string;
}

@Injectable()
export class BetterAuthAdapter {
  private readonly logger = new Logger(BetterAuthAdapter.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async validateSession(
    sessionToken: string,
  ): Promise<SessionValidationResult> {
    if (!sessionToken?.trim()) {
      this.logger.debug('No session token provided');
      return { session: null, user: null };
    }

    try {
      this.logger.debug(
        `Validating session with token: ${sessionToken.substring(0, 10)}...`,
      );

      // Usar Better Auth API directamente para validar la sesión
      const result = await auth.api.getSession({
        headers: new Headers({
          cookie: `${BETTER_AUTH_COOKIE_NAME}=${sessionToken}`,
        }),
      });

      if (result && result.user) {
        this.logger.debug(
          `Session validated successfully for user: ${this.maskEmail(result.user.email)}`,
        );
        return {
          user: result.user as AuthUser,
          session: result as AuthSession,
        };
      }

      this.logger.debug('No valid session found');
      return { session: null, user: null };
    } catch (error) {
      this.logger.error('Error validating session:', error);
      return { session: null, user: null };
    }
  }

  /**
   * Type guard para validar respuesta de sesión
   */
  private isValidSessionResponse(
    response: unknown,
  ): response is BetterAuthSessionResponse {
    if (!response || typeof response !== 'object') {
      return false;
    }

    const obj = response as Record<string, unknown>;

    return (
      obj.user !== undefined &&
      typeof obj.user === 'object' &&
      obj.user !== null &&
      'id' in obj.user &&
      'email' in obj.user &&
      typeof (obj.user as Record<string, unknown>).id === 'string' &&
      typeof (obj.user as Record<string, unknown>).email === 'string'
    );
  }

  async signIn(email: string, password: string): Promise<SignInResult> {
    // Validación básica de entrada
    if (!this.isValidEmail(email) || !password?.trim()) {
      this.logger.warn(
        `Invalid input provided for sign in: ${this.maskEmail(email)}`,
      );
      return {
        session: null,
        user: null,
        error: ERROR_MESSAGES.INVALID_INPUT,
      };
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();
      this.logger.debug(
        `Attempting sign in for: ${this.maskEmail(normalizedEmail)}`,
      );

      const result = await auth.api.signInEmail({
        body: {
          email: normalizedEmail,
          password: password.trim(),
        },
      });

      if (!result.user) {
        this.logger.warn(
          `Sign in failed for email: ${this.maskEmail(normalizedEmail)} - No user returned`,
        );
        return {
          session: null,
          user: null,
          error: ERROR_MESSAGES.INVALID_CREDENTIALS,
        };
      }

      this.logger.log(
        `User signed in successfully: ${this.maskEmail(normalizedEmail)}`,
      );
      return {
        session: null, // Better Auth maneja las sesiones automáticamente via cookies
        user: result.user,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error signing in for ${this.maskEmail(email)}:`,
        error,
      );

      return {
        session: null,
        user: null,
        error: ERROR_MESSAGES.INVALID_CREDENTIALS,
      };
    }
  }

  /**
   * Sign in con manejo completo de cookies usando Better Auth handler
   */
  async signInWithCookies(
    email: string,
    password: string,
    request: any,
    response: any,
  ): Promise<SignInResult> {
    // Validación básica de entrada
    if (!this.isValidEmail(email) || !password?.trim()) {
      this.logger.warn(
        `Invalid input provided for sign in: ${this.maskEmail(email)}`,
      );
      return {
        session: null,
        user: null,
        error: ERROR_MESSAGES.INVALID_INPUT,
      };
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();
      this.logger.debug(
        `Attempting sign in with cookies for: ${this.maskEmail(normalizedEmail)}`,
      );

      // Crear URL para el endpoint de sign-in de Better Auth
      const url = new URL(
        '/api/auth/sign-in/email',
        `${request.protocol}://${request.get('host')}`,
      );

      // Crear un Request compatible con Better Auth
      const betterAuthRequest = new Request(url.toString(), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': request.get('user-agent') || '',
          host: request.get('host') || '',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password: password.trim(),
        }),
      });

      // Llamar al handler de Better Auth
      const betterAuthResponse = await auth.handler(betterAuthRequest);

      // Copiar las cookies de la respuesta de Better Auth
      const setCookies = betterAuthResponse.headers.getSetCookie();

      if (setCookies.length > 0) {
        for (const cookie of setCookies) {
          response.append('Set-Cookie', cookie);
        }
        this.logger.debug('Cookies configured successfully');
      }

      if (betterAuthResponse.ok) {
        const result = (await betterAuthResponse.json()) as {
          user?: any;
          session?: any;
        };

        if (result.user) {
          this.logger.log(
            `User signed in successfully with cookies: ${this.maskEmail(normalizedEmail)}`,
          );
          return {
            session: result.session || null,
            user: result.user,
          };
        }
      }

      this.logger.warn(
        `Sign in failed for email: ${this.maskEmail(normalizedEmail)}`,
      );
      return {
        session: null,
        user: null,
        error: ERROR_MESSAGES.INVALID_CREDENTIALS,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error signing in with cookies for ${this.maskEmail(email)}:`,
        error,
      );

      return {
        session: null,
        user: null,
        error: ERROR_MESSAGES.INVALID_CREDENTIALS,
      };
    }
  }

  async signUp(
    email: string,
    password: string,
    name?: string,
  ): Promise<SignUpResult> {
    // Validación básica de entrada
    if (!this.isValidEmail(email) || !password?.trim()) {
      this.logger.warn(
        `Invalid input provided for sign up: ${this.maskEmail(email)}`,
      );
      return {
        user: null,
        error: ERROR_MESSAGES.INVALID_INPUT,
      };
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();
      this.logger.debug(
        `Attempting sign up for: ${this.maskEmail(normalizedEmail)}`,
      );

      const result = await auth.api.signUpEmail({
        body: {
          email: normalizedEmail,
          password: password.trim(),
          name: name?.trim() || 'User',
        },
      });

      if (!result.user) {
        this.logger.warn(
          `Sign up failed for email: ${this.maskEmail(normalizedEmail)} - No user returned`,
        );
        return {
          user: null,
          error: 'Error en el registro del usuario',
        };
      }

      this.logger.log(
        `User signed up successfully: ${this.maskEmail(normalizedEmail)}`,
      );
      return {
        user: result.user,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error signing up for ${this.maskEmail(email)}:`,
        error,
      );

      return {
        user: null,
        error: 'Error en el registro del usuario',
      };
    }
  }

  async signOut(sessionToken: string): Promise<boolean> {
    if (!sessionToken?.trim()) {
      this.logger.debug('No session token provided for sign out');
      return false;
    }

    try {
      this.logger.debug(
        `Signing out session: ${sessionToken.substring(0, 10)}...`,
      );

      await auth.api.signOut({
        headers: new Headers({
          cookie: `${BETTER_AUTH_COOKIE_NAME}=${sessionToken}`,
        }),
      });

      this.logger.log('User signed out successfully');
      return true;
    } catch (error) {
      this.logger.error('Error signing out:', error);
      return false;
    }
  }

  /**
   * Cierra sesión y elimina las cookies asociadas
   */
  async signOutWithCookies(
    response: Response,
    sessionToken?: string,
  ): Promise<boolean> {
    try {
      this.logger.debug('Attempting to sign out and clear cookies');

      // Si hay un token de sesión, cerramos sesión en el servidor
      if (sessionToken?.trim()) {
        this.logger.debug(
          `Signing out session: ${sessionToken.substring(0, 10)}...`,
        );
        await auth.api.signOut({
          headers: new Headers({
            cookie: `${BETTER_AUTH_COOKIE_NAME}=${sessionToken}`,
          }),
        });
      }

      // SEGÚN DOCUMENTACIÓN BETTER AUTH: usar mismos atributos para borrar cookie cross-domain
      const isProduction = process.env.NODE_ENV === 'production';
      const sameSite: 'none' | 'lax' | 'strict' = isProduction ? 'none' : 'lax';
      const cookieOptions: CookieOptions = {
        httpOnly: true,
        path: '/',
        sameSite,
        secure: isProduction,
        ...(process.env.BETTER_AUTH_DOMAIN && {
          domain: process.env.BETTER_AUTH_DOMAIN,
        }),
      };

      response.clearCookie(BETTER_AUTH_COOKIE_NAME, cookieOptions);

      this.logger.debug(
        `Auth cookies cleared successfully with options: ${JSON.stringify(cookieOptions)}`,
      );
      this.logger.log('User signed out successfully with cookies cleared');
      return true;
    } catch (error: unknown) {
      this.logger.error('Error signing out with cookies:', error);

      // Fallback: intentar con múltiples configuraciones según docs Better Auth
      try {
        const isProduction = process.env.NODE_ENV === 'production';
        const sameSite: 'none' | 'lax' | 'strict' = isProduction
          ? 'none'
          : 'lax';

        // Intentar con configuración cross-domain completa
        const fullOptions: CookieOptions = {
          httpOnly: true,
          path: '/',
          sameSite,
          secure: isProduction,
          ...(process.env.BETTER_AUTH_DOMAIN && {
            domain: process.env.BETTER_AUTH_DOMAIN,
          }),
        };
        response.clearCookie(BETTER_AUTH_COOKIE_NAME, fullOptions);

        // Fallback básico sin domain
        const basicOptions: CookieOptions = {
          httpOnly: true,
          path: '/',
        };
        response.clearCookie(BETTER_AUTH_COOKIE_NAME, basicOptions);

        this.logger.debug('Auth cookies cleared with fallback method');
      } catch (e) {
        this.logger.error('Failed to clear cookies even with fallback', e);
      }

      return false;
    }
  }

  /**
   * Sincroniza un usuario con Better Auth
   * Crea o actualiza el usuario en Better Auth con la contraseña actual
   */
  async syncUserWithBetterAuth(
    email: string,
    password: string,
    name: string,
  ): Promise<boolean> {
    if (!this.isValidEmail(email) || !password?.trim()) {
      this.logger.warn(
        `Invalid input provided for user sync: ${this.maskEmail(email)}`,
      );
      return false;
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Intentar hacer sign up primero (en caso de que el usuario no exista en Better Auth)
      const signUpResult = await this.signUp(normalizedEmail, password, name);

      if (signUpResult.user) {
        this.logger.debug(
          `User synced to Better Auth: ${this.maskEmail(normalizedEmail)}`,
        );
        return true;
      }

      this.logger.debug(
        `User already exists in Better Auth: ${this.maskEmail(normalizedEmail)}`,
      );
      return true;
    } catch {
      this.logger.debug(`User sync failed for ${this.maskEmail(email)}`);
      return false;
    }
  }

  /**
   * Actualiza la contraseña del usuario usando Better Auth
   */
  async updatePassword(
    sessionToken: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (
      !sessionToken?.trim() ||
      !currentPassword?.trim() ||
      !newPassword?.trim()
    ) {
      this.logger.warn('Invalid input provided for password update');
      throw new Error('Parámetros de entrada inválidos');
    }

    try {
      this.logger.debug('Updating password for authenticated user');

      // Usar el API de Better Auth para cambiar la contraseña
      await auth.api.changePassword({
        body: {
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
          revokeOtherSessions: true,
        },
        headers: new Headers({
          'content-type': 'application/json',
          cookie: `${BETTER_AUTH_COOKIE_NAME}=${sessionToken}`,
        }),
      });

      this.logger.log('Password updated successfully');
    } catch (error: unknown) {
      this.logger.error('Error updating password:', error);
      throw new Error('Error al actualizar la contraseña');
    }
  }

  /**
   * Verifica la contraseña actual del usuario
   */
  async verifyPassword(email: string, password: string): Promise<boolean> {
    if (!this.isValidEmail(email) || !password?.trim()) {
      this.logger.warn(
        `Invalid input provided for password verification: ${this.maskEmail(email)}`,
      );
      return false;
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();
      this.logger.debug(
        `Verifying password for: ${this.maskEmail(normalizedEmail)}`,
      );

      // Intentar hacer sign in para verificar la contraseña
      const result = await auth.api.signInEmail({
        body: {
          email: normalizedEmail,
          password: password.trim(),
        },
      });

      return !!result.user;
    } catch {
      this.logger.debug(
        `Password verification failed for ${this.maskEmail(email)}`,
      );
      return false;
    }
  }

  /**
   * Hash la contraseña del usuario
   */
  async hashPassword(password: string): Promise<string> {
    if (!password?.trim()) {
      this.logger.warn('Invalid input provided for password hashing');
      throw new Error('Parámetros de entrada inválidos');
    }
    try {
      this.logger.debug('Hashing password');

      const ctx = await auth.$context;

      const hashedPassword = await ctx.password.hash(password.trim());
      return hashedPassword;
    } catch (error: unknown) {
      this.logger.error('Error hashing password:', error);
      throw new Error('Error al hashear la contraseña');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !!(email?.trim() && emailRegex.test(email.trim()));
  }

  private maskEmail(email: string): string {
    if (!email?.includes('@')) return '***';

    const [local, domain] = email.split('@');
    const maskedLocal =
      local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : '***';
    return `${maskedLocal}@${domain}`;
  }
}
