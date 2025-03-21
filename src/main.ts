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
      forbidNonWhitelisted: true,
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
    { name: 'Admin Rooms', description: 'Gestión de habitaciones' },
  ];

  SwaggerModule.setup('api', app, document);
  Logger.log(`System's environment: ${generalEnvs.NODE_ENV}`);
  Logger.log(
    `System local uri: http://localhost:${generalEnvs.PORT ?? 4000}/api`,
  );

  await app.listen(parseInt(generalEnvs.PORT));
}
bootstrap();
