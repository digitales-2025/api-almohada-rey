import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { BETTER_AUTH_COOKIE_PREFIX } from 'src/utils/constants';
import { PrismaService } from 'src/prisma/prisma.service';

// Usar la misma instancia de Prisma que la aplicación
const prisma = new PrismaService();

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 6,
    maxPasswordLength: 128,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días
    updateAge: 60 * 60 * 24 * 7, // Refresh cada semana
  },

  trustedOrigins: [
    process.env.WEB_URL || 'http://localhost:3000',
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:4000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4000',
  ],

  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  },

  baseURL: process.env.BACKEND_URL,
  advanced: {
    database: {
      generateId: false,
    },
    crossSubDomainCookies: {
      enabled: true,
      domain: process.env.BETTER_AUTH_DOMAIN,
    },
    useSecureCookies: process.env.NODE_ENV === 'production',
    cookiePrefix: BETTER_AUTH_COOKIE_PREFIX,
    defaultCookieAttributes: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 días
    },
  },
});

// Tipos exportados usando Better Auth con Prisma
export type AuthUser = typeof auth.$Infer.Session.user;
export type AuthSession = typeof auth.$Infer.Session;
