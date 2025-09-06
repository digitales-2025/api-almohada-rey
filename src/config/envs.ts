import { z } from 'zod';
import 'dotenv';

// dotenv.config({ path: `.env` });

type NODE_ENV = 'development' | 'production' | 'test';

type GeneralEnvVars = {
  NODE_ENV: NODE_ENV;
  PORT: string;
  WEBSOCKET_PORT: string;
  DATABASE_URL: string;
  WEB_URL: string;
  MAIL_HOST: string;
  MAIL_PORT: string;
  MAIL_USER: string;
  MAIL_PASS: string;

  //sEEDS
  SEED_LANDING_PASSWORD: string;

  // API PERU
  API_PERU_TOKEN: string;
  API_PERU_BASE_URL: string;

  // BETTER AUTH
  BACKEND_URL?: string;
  BETTER_AUTH_DOMAIN?: string;
  FRONTEND_URL?: string;
};

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.string(),
    WEBSOCKET_PORT: z.string(),
    DATABASE_URL: z.string(),
    WEB_URL: z.string(),
    MAIL_HOST: z.string(),
    MAIL_PORT: z.string(),
    MAIL_USER: z.string(),
    MAIL_PASS: z.string(),
    SEED_LANDING_PASSWORD: z.string(),
    API_PERU_TOKEN: z.string(),
    API_PERU_BASE_URL: z.string(),
    BACKEND_URL: z.string().optional(),
    BETTER_AUTH_DOMAIN: z.string().optional(),
    FRONTEND_URL: z.string().optional(),
  })
  .passthrough() satisfies z.ZodType<Partial<GeneralEnvVars>>;

const result = schema.safeParse(process.env);
if (!result.success) {
  throw new Error(`Config validation error: ${result.error.message}`);
}
const envVars = result.data;

export const generalEnvs: GeneralEnvVars = {
  NODE_ENV: envVars.NODE_ENV,
  PORT: envVars.PORT,
  WEBSOCKET_PORT: envVars.WEBSOCKET_PORT,
  DATABASE_URL: envVars.DATABASE_URL,
  WEB_URL: envVars.WEB_URL,
  MAIL_HOST: envVars.MAIL_HOST,
  MAIL_PORT: envVars.MAIL_PORT,
  MAIL_USER: envVars.MAIL_USER,
  MAIL_PASS: envVars.MAIL_PASS,
  SEED_LANDING_PASSWORD: envVars.SEED_LANDING_PASSWORD,
  API_PERU_TOKEN: envVars.API_PERU_TOKEN,
  API_PERU_BASE_URL: envVars.API_PERU_BASE_URL,
  BACKEND_URL: envVars.BACKEND_URL,
  BETTER_AUTH_DOMAIN: envVars.BETTER_AUTH_DOMAIN,
  FRONTEND_URL: envVars.FRONTEND_URL,
};
