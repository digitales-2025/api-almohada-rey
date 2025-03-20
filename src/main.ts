import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [process.env.WEB_URL],
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
  ];

  SwaggerModule.setup('api', app, document);

  await app.listen(parseInt(process.env.PORT));
}
bootstrap();
