import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './modules/admin/admin.module';
import { EmailModule } from './modules/email/email.module';
import { TypedEventEmitterModule } from './event-emitter/typed-event-emitter.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SeedsModule } from './modules/seeds/seeds.module';
import { CustomersModule } from './modules/admin/customers/customers.module';
import { CloudflareModule } from './cloudflare/cloudflare.module';
import { RoomTypeModule } from './modules/admin/room-type/room-type.module';
import { ReservationModule } from './modules/admin/reservation/reservation.module';
import { RoomModule } from './modules/admin/room/room.module';
import { RoomCleanModule } from './modules/admin/room-clean/room-clean.module';
import { ServiceModule } from './modules/admin/service/service.module';
import { LandRoomTypeModule } from './modules/landing/room-type/land-room-type.module';
import { ReservationModule as LandingReservationModule } from './modules/landing/reservation/reservation.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
