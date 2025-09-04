import {
  Module,
  NestModule,
  MiddlewareConsumer,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './modules/admin/admin.module';
import { EmailModule } from './modules/email/email.module';
import { TypedEventEmitterModule } from './event-emitter/typed-event-emitter.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SeedsModule } from './modules/seeds/seeds.module';
import { SeedsService } from './modules/seeds/seeds.service';
import { CustomersModule } from './modules/admin/customers/customers.module';
import { CloudflareModule } from './cloudflare/cloudflare.module';
import { RoomTypeModule } from './modules/admin/room-type/room-type.module';
import { ReservationModule } from './modules/admin/reservation/reservation.module';
import { RoomModule } from './modules/admin/room/room.module';
import { RoomCleanModule } from './modules/admin/room-clean/room-clean.module';
import { ServiceModule } from './modules/admin/service/service.module';
import { LandRoomTypeModule } from './modules/landing/room-type/land-room-type.module';
import { ReservationModule as LandingReservationModule } from './modules/landing/reservation/reservation.module';
import { ExpenseModule } from './modules/admin/expense/expense.module';
import { WarehouseModule } from './modules/admin/warehouse/warehouse.module';
import { ReportsModule } from './modules/admin/reports/reports.module';
import { BetterAuthMiddleware } from './modules/admin/auth/better-auth.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AdminModule,
    EmailModule,
    SeedsModule,
    EventEmitterModule.forRoot(),
    TypedEventEmitterModule,
    CustomersModule,
    CloudflareModule,
    RoomTypeModule,
    ReservationModule,
    RoomModule,
    RoomCleanModule,
    ServiceModule,
    LandRoomTypeModule,
    LandingReservationModule,
    ExpenseModule,
    WarehouseModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService, BetterAuthMiddleware],
})
export class AppModule implements NestModule, OnApplicationBootstrap {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly seedsService: SeedsService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BetterAuthMiddleware).forRoutes('api/auth/*'); // Solo aplicar a rutas de auth
  }

  async onApplicationBootstrap() {
    try {
      this.logger.log('🌱 Iniciando auto-seed al arrancar la aplicación...');

      // Verificar si ya existen datos en la base de datos
      const hasExistingData = await this.checkExistingData();

      if (!hasExistingData) {
        this.logger.log(
          '📊 No se encontraron datos existentes, ejecutando seeds...',
        );
        const result = await this.seedsService.generateInit();
        this.logger.log('✅ Auto-seed completado exitosamente');
        this.logger.log('📋 Resultado:', JSON.stringify(result.data, null, 2));
      } else {
        this.logger.log(
          '✅ Datos ya existen en la base de datos, saltando auto-seed',
        );
      }
    } catch (error) {
      this.logger.error('❌ Error durante auto-seed:', error.message);
      this.logger.error('Stack trace:', error.stack);
      // No lanzamos el error para que la aplicación pueda continuar funcionando
      // Los seeds son importantes pero no críticos para el funcionamiento básico
    }
  }

  /**
   * Verifica si ya existen datos básicos en la base de datos
   * @returns true si existen datos, false si está vacía
   */
  private async checkExistingData(): Promise<boolean> {
    try {
      // Verificar si existe al menos un usuario super admin
      const superAdminCount = await this.seedsService['prisma'].user.count({
        where: { isSuperAdmin: true, isActive: true },
      });

      // Verificar si existe al menos un servicio
      const serviceCount = await this.seedsService['prisma'].service.count();

      // Verificar si existe al menos un almacén
      const warehouseCount =
        await this.seedsService['prisma'].warehouse.count();

      return superAdminCount > 0 || serviceCount > 0 || warehouseCount > 0;
    } catch (error) {
      this.logger.warn('Error verificando datos existentes:', error.message);
      return false; // Si hay error, asumimos que no hay datos y ejecutamos seeds
    }
  }
}
