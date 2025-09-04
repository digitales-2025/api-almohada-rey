import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  LogEventType,
  LogEvent,
  PrismaTransaction,
} from 'src/prisma/src/types/prisma.types';

/**
 * Servicio principal de Prisma que maneja la conexión y operaciones con la base de datos.
 * Implementa hooks del ciclo de vida de NestJS para manejar las conexiones.
 *
 * @class
 * @extends {PrismaClient}
 * @implements {OnModuleInit}
 * @implements {OnModuleDestroy}
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private static connectionCount = 0;

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });

    this.setupLogging();
  }

  /**
   * Configura el logging de todas las operaciones de base de datos.
   * Registra queries, errores, advertencias e información.
   * @private
   */
  private setupLogging(): void {
    this.$on('query' as never, (event: Prisma.QueryEvent) => {
      const query = event.query.replace(/\s+/g, ' ').trim();
      const params = event.params ? JSON.stringify(event.params) : '';

      if (event.duration >= 500) {
        this.logger.warn(
          `Slow query detected! Duration: ${event.duration}ms\n` +
            `Query: ${query}\n` +
            `Params: ${params}`,
        );
      }
    });

    this.$on('error' as never, (event: any) => {
      this.logger.error(`Database error: ${event.message}`, event.stack);
    });

    this.$on('info' as never, (event: any) => {
      this.logger.log(`Database info: ${event.message}`);
    });

    this.$on('warn' as never, (event: any) => {
      this.logger.warn(`Database warning: ${event.message}`);
    });
  }

  /**
   * Mide el tiempo de ejecución de una query y registra métricas.
   * @param name - Nombre identificativo de la query
   * @param query - Función que ejecuta la query
   * @returns Promise con el resultado de la query
   */
  async measureQuery<T>(name: string, query: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    const logEvent: LogEvent = {
      timestamp: new Date(),
      type: 'query' as LogEventType,
    };

    try {
      const result = await query();
      const duration = Date.now() - startTime;

      logEvent.duration = duration;
      if (duration > 100) {
        this.logger.log(`Query "${name}" completed in ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logEvent.type = 'error';
      logEvent.message = error.message;

      this.logger.error(
        `Query "${name}" failed after ${duration}ms: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Ejecuta operaciones dentro de una transacción.
   * @param operation - Función que contiene las operaciones a ejecutar
   * @returns Promise con el resultado de la operación
   */
  async withTransaction<T>(
    operation: (tx: PrismaTransaction) => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await this.$transaction(async (tx) => {
        return await operation(tx as PrismaTransaction);
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Para errores esperados del negocio, solo propagar el mensaje
      if (error instanceof NotFoundException) {
        this.logger.warn(error.message);
        throw new NotFoundException(error.message);
      }

      if (error instanceof BadRequestException) {
        this.logger.warn(error.message);
        throw new BadRequestException(error.message);
      }

      // Para errores inesperados, registrar más detalles
      this.logger.error(`Unexpected transaction error after ${duration}ms`, {
        message: error.message,
        duration,
      });
      throw error;
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      PrismaService.connectionCount++;
      this.logger.log(
        `Database connection established (Connection #${PrismaService.connectionCount})`,
      );
    } catch (error) {
      this.logger.error(`Failed to connect to database: ${error.message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      PrismaService.connectionCount--;
      this.logger.log(
        `Database connection closed (Remaining connections: ${PrismaService.connectionCount})`,
      );
    } catch (error) {
      this.logger.error(`Error disconnecting from database: ${error.message}`);
      throw error;
    }
  }
}
