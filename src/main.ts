import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { generalEnvs } from './config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { SeedsService } from './modules/seeds/seeds.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar el adaptador WebSocket
  app.useWebSocketAdapter(new IoAdapter(app)); // Añadido para WebSockets
  app.enableCors({
    origin: [generalEnvs.WEB_URL, generalEnvs.FRONTEND_URL].filter(Boolean), // Filtra valores undefined
    credentials: true,
  });
  app.use(cookieParser());

  // Better Auth se maneja ahora via BetterAuthMiddleware - ya no necesitamos esto aquí
  // app.use('/api/auth', auth.handler);

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true, //
      skipMissingProperties: true, // Clave: Ignorar propiedades faltantes
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Almohada del Rey API')
    .setDescription('API for Almohada del Rey')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  document.tags = [
    {
      name: 'Admin Auth',
      description: 'Operaciones de autenticación y autorización',
    },
    {
      name: 'Admin Account',
      description: 'Gestión de cuentas de administrador y configuraciones',
    },
    { name: 'Admin Users', description: 'Gestión de usuarios administradores' },
    { name: 'Admin Audit', description: 'Gestión de auditoría' },
    { name: 'Admin Customers', description: 'Gestión de clientes' },
    {
      name: 'Admin Reservations',
      description: 'Gestión de reservaciones de habitaciones',
    },
    { name: 'Admin Products', description: 'Gestión de productos' },
    {
      name: 'Admin Room Types',
      description: 'Gestión de tipos de habitaciones',
    },
    { name: 'Admin Rooms', description: 'Gestión de habitaciones' },

    { name: 'Admin Room Cleaning', description: 'Gestión de limpiezas' },

    { name: 'Admin Services', description: 'Gestión de servicios' },
    { name: 'Admin Payments', description: 'Gestión de pagos' },
    { name: 'Admin Movements', description: 'Gestión de movimientos' },
    { name: 'Admin Warehouse', description: 'Gestión de almacenes' },

    {
      name: 'Landing Room Types',
      description:
        'Devuelve tipos de habitaciones activas con imagen principal',
    },
    {
      name: 'Landing Reservations',
      description: 'Gestión de reservaciones de habitaciones',
    },
    {
      name: 'Admin Expenses',
      description: 'Todos los Gastos',
    },
  ];

  SwaggerModule.setup('api', app, document);
  Logger.log(`System's environment: ${generalEnvs.NODE_ENV}`);
  Logger.log(
    `System local uri: http://localhost:${generalEnvs.PORT ?? 4000}/api`,
  );

  // Ejecutar seeds automáticamente al iniciar la aplicación
  try {
    const seedsService = app.get(SeedsService);
    await seedsService.generateInit();
    Logger.log('✅ Seeds ejecutados automáticamente al iniciar la aplicación');
  } catch (error) {
    Logger.error('❌ Error ejecutando seeds automáticamente:', error.message);
  }

  await app.listen(parseInt(generalEnvs.PORT));
}
bootstrap();
