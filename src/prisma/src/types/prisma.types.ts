import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Tipo para el contexto de transacción de Prisma.
 * Se usa cuando se pasa el contexto de transacción entre servicios.
 */
export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Tipos de eventos de registro (logging) que pueden ocurrir en Prisma.
 */
export type LogEventType = 'query' | 'info' | 'warn' | 'error';

export type PayPrismaModels = Extract<Prisma.ModelName, 'orden' | 'pago'>;

/**
 * Representa un evento de registro (log) de Prisma.
 */
export type LogEvent = {
  query?: string;
  params?: string;
  duration?: number;
  message?: string;
  timestamp: Date;
  type: LogEventType;
};
