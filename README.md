# API Almohada Rey

API backend para el sistema de gestión hotelera Almohada Rey.

## 🚀 Inicio Rápido

### Instalación

```bash
# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Ejecutar migraciones de base de datos
npx prisma migrate deploy

# Iniciar en modo desarrollo
pnpm run start:dev
```

## 🌱 Seeds Automáticos

**¡Nuevo!** Los datos iniciales (seeds) ahora se ejecutan automáticamente al iniciar la aplicación. No necesitas ejecutar `pnpm run seed` manualmente.

### ¿Cómo funciona?

- Al iniciar la aplicación, se verifica si ya existen datos básicos en la base de datos
- Si la base de datos está vacía, se ejecutan automáticamente los seeds
- Si ya existen datos, se omite la ejecución de seeds

### Comandos de Seeds

```bash
# Los seeds se ejecutan automáticamente al iniciar la aplicación
pnpm run start:dev

# Para casos especiales, puedes ejecutar seeds manualmente
pnpm run seed:manual
```

### Datos que se crean automáticamente

- **Usuario Super Admin**: Usuario administrador principal del sistema
- **Usuario Landing**: Usuario por defecto para el sitio web público
- **Servicios**: Servicios comerciales e internos básicos
- **Almacenes**: Almacenes para productos comerciales e internos

## 📝 Scripts Disponibles

```bash
# Desarrollo
pnpm run start:dev          # Inicia en modo desarrollo con hot reload
pnpm run start:debug        # Inicia en modo debug

# Producción
pnpm run build              # Compila la aplicación
pnpm run start:prod         # Inicia en modo producción

# Testing
pnpm run test               # Ejecuta tests unitarios
pnpm run test:e2e           # Ejecuta tests end-to-end
pnpm run test:cov           # Ejecuta tests con cobertura

# Calidad de código
pnpm run lint               # Ejecuta ESLint
pnpm run format             # Formatea código con Prettier

# Base de datos
npx prisma studio           # Abre Prisma Studio
npx prisma migrate dev      # Ejecuta migraciones en desarrollo
npx prisma migrate deploy   # Ejecuta migraciones en producción

# Seeds (automáticos)
pnpm run seed:manual        # Ejecuta seeds manualmente (solo casos especiales)
```

## 🏗️ Arquitectura

- **Framework**: NestJS
- **Base de datos**: PostgreSQL con Prisma ORM
- **Autenticación**: Better Auth
- **Validación**: Class Validator
- **Documentación**: Swagger/OpenAPI
- **Testing**: Jest

## 🔧 Configuración

### Variables de Entorno

Asegúrate de configurar las siguientes variables en tu archivo `.env`:

```env
# Base de datos
DATABASE_URL="postgresql://..."

# Better Auth
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# Email
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_USER="your-email@gmail.com"
MAIL_PASS="your-password"

# Otros
NODE_ENV="development"
PORT=3000
```

## 📚 Documentación API

Una vez iniciada la aplicación, puedes acceder a la documentación Swagger en:
- **Desarrollo**: http://localhost:3000/api
- **Producción**: https://your-domain.com/api