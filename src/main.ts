import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { generalEnvs } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [generalEnvs.WEB_URL],
    credentials: true,
  });
  app.use(cookieParser());

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

    { name: 'Room Cleaning', description: 'Gestión de limpiezas' },

    { name: 'Admin Services', description: 'Gestión de servicios' },
    { name: 'Admin Payments', description: 'Gestión de pagos' },

    {
      name: 'Landing Room Types',
      description:
        'Devuelve tipos de habitaciones activas con imagen principal',
    },
    {
      name: 'Landing Reservations',
      description: 'Gestión de reservaciones de habitaciones',
    },
  ];

  SwaggerModule.setup('api', app, document);
  Logger.log(`System's environment: ${generalEnvs.NODE_ENV}`);
  Logger.log(
    `System local uri: http://localhost:${generalEnvs.PORT ?? 4000}/api`,
  );

  await app.listen(parseInt(generalEnvs.PORT));
}
bootstrap();
