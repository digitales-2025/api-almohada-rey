import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { superAdminSeed } from './data/superadmin.seed';
import { handleException } from 'src/utils';
import { HttpResponse, UserData } from 'src/interfaces';
import { service, serviceSeedComercial } from './data/services.seed';
import { landingDefaultUserSeed } from './data/landinguser.seed';
import { warehouseSeedData, warehousesSeed } from './data/warehouse.seed';
import { BetterAuthAdapter } from '../admin/auth/better-auth.adapter';

export interface InitResult {
  admin?: UserData;
  services?: service[];
  landingUser?: UserData;
  warehouses?: warehouseSeedData[];
}

@Injectable()
export class SeedsService {
  private readonly logger = new Logger(SeedsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly betterAuthAdapter: BetterAuthAdapter,
  ) {}

  /**
   * Función principal que inicializa todos los datos semilla
   * @returns Resultado de la inicialización
   */
  async generateInit(): Promise<HttpResponse<InitResult>> {
    try {
      const initResults: InitResult = {};

      // Generar usuario administrador
      const adminResult = await this.generateUserAdmin();
      if (adminResult) {
        initResults.admin = adminResult.data;
      }

      // Generar servicios iniciales
      const servicesResult = await this.generateServices();
      if (servicesResult) {
        initResults.services = servicesResult.data;
      }

      const landingUserResult = await this.generateLandingDefaultUser();
      if (landingUserResult) {
        initResults.landingUser = landingUserResult.data;
      }

      // Generar almacenes iniciales
      const warehousesResult = await this.generateWarehouses();
      if (warehousesResult) {
        initResults.warehouses = warehousesResult.data;
      }

      return {
        message: 'System initialized successfully',
        statusCode: HttpStatus.CREATED,
        data: initResults,
      };
    } catch (error) {
      this.logger.error('Error initializing system data', error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error initializing system data');
    }
  }

  async onlyGenerateLandingUser(): Promise<HttpResponse<UserData>> {
    try {
      const landingUserResult = await this.generateLandingDefaultUser();

      return {
        message: 'System initialized successfully',
        statusCode: HttpStatus.CREATED,
        data: landingUserResult.data,
      };
    } catch (error) {
      this.logger.error('Error initializing system data', error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error initializing system data');
    }
  }

  /**
   * Genera el usuario super admin con su rol
   * @returns Super admin creado
   */
  async generateUserAdmin(): Promise<HttpResponse<UserData>> {
    try {
      // Iniciar una transacción
      const result = await this.prisma.$transaction(async (prisma) => {
        // Verificar si el usuario ya existe
        const existingUser = await prisma.user.findFirst({
          where: {
            email: superAdminSeed.email,
            isActive: true,
          },
        });

        let superadminUser;

        if (existingUser) {
          // Si el usuario existe, solo actualizamos los datos básicos
          superadminUser = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: superAdminSeed.name,
              phone: superAdminSeed.phone,
              isSuperAdmin: true,
              userRol: superAdminSeed.userRol,
              mustChangePassword: superAdminSeed.mustChangePassword,
            },
          });
        } else {
          // Usar Better Auth nativo para crear usuario básico
          this.logger.debug('Creating super admin user with Better Auth...');

          const signUpResult = await this.betterAuthAdapter.signUp(
            superAdminSeed.email,
            superAdminSeed.password,
            superAdminSeed.name,
          );

          if (!signUpResult.user) {
            this.logger.error('Failed to create user in Better Auth');
            throw new BadRequestException(
              `Failed to create user in Better Auth: ${signUpResult.error}`,
            );
          }

          this.logger.debug('Better Auth user created successfully');

          // Actualizar usuario con campos personalizados
          superadminUser = await prisma.user.update({
            where: { id: signUpResult.user.id },
            data: {
              phone: superAdminSeed.phone,
              isSuperAdmin: true,
              userRol: superAdminSeed.userRol,
              mustChangePassword: superAdminSeed.mustChangePassword,
              isActive: true,
            },
          });

          this.logger.debug('User profile created successfully');
        }

        return {
          message: 'Admin created successfully',
          statusCode: HttpStatus.CREATED,
          data: {
            id: superadminUser.id,
            name: superadminUser.name,
            email: superadminUser.email,
            phone: superadminUser.profile?.phone,
            isSuperAdmin: superadminUser.profile?.isSuperAdmin,
            userRol: superadminUser.profile?.userRol,
          },
        };
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Error generating super admin ${superAdminSeed.email}`,
        error.stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error generating super admin');
    }
  }

  async generateLandingDefaultUser(): Promise<HttpResponse<UserData>> {
    try {
      // Iniciar una transacción
      const result = await this.prisma.$transaction(async (prisma) => {
        // Verificar si el usuario ya existe
        const existingUser = await prisma.user.findFirst({
          where: {
            email: landingDefaultUserSeed.email,
            isActive: true,
          },
        });

        let landingUser;

        if (existingUser) {
          // Si el usuario existe, solo actualizamos los datos básicos
          landingUser = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: landingDefaultUserSeed.name,
              phone: landingDefaultUserSeed.phone,
              isLandingUser: true,
              isSuperAdmin: false,
              userRol: landingDefaultUserSeed.userRol,
              mustChangePassword: landingDefaultUserSeed.mustChangePassword,
            },
          });
        } else {
          // Usar Better Auth nativo para crear usuario básico
          this.logger.debug('Creating landing user with Better Auth...');

          const signUpResult = await this.betterAuthAdapter.signUp(
            landingDefaultUserSeed.email,
            landingDefaultUserSeed.password,
            landingDefaultUserSeed.name,
          );

          if (!signUpResult.user) {
            this.logger.error('Failed to create landing user in Better Auth');
            throw new BadRequestException(
              `Failed to create landing user in Better Auth: ${signUpResult.error}`,
            );
          }

          this.logger.debug('Better Auth landing user created successfully');

          // Actualizar usuario con campos personalizados
          landingUser = await prisma.user.update({
            where: { id: signUpResult.user.id },
            data: {
              phone: landingDefaultUserSeed.phone,
              isLandingUser: true,
              isSuperAdmin: false,
              userRol: landingDefaultUserSeed.userRol,
              mustChangePassword: landingDefaultUserSeed.mustChangePassword,
              isActive: true,
            },
          });

          this.logger.debug('Landing user profile created successfully');
        }

        return {
          message: 'Landing User created successfully',
          statusCode: HttpStatus.CREATED,
          data: {
            id: landingUser.id,
            name: landingUser.name,
            email: landingUser.email,
            phone: landingUser.profile?.phone,
            isSuperAdmin: landingUser.profile?.isSuperAdmin,
            userRol: landingUser.profile?.userRol,
          },
        };
      });
      return result;
    } catch (error) {
      this.logger.error(
        `Error generating landing default user ${landingDefaultUserSeed.email}`,
        error.stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error generating landing default user');
    }
  }

  /**
   * Genera servicios iniciales del sistema
   * @returns Servicios creados
   */
  async generateServices(): Promise<HttpResponse<service[]>> {
    try {
      // Iniciar una transacción
      const result = await this.prisma.$transaction(async (prisma) => {
        const createdServices: service[] = [];

        // Crear servicio comercial
        const commercialCode = await this.generateCodeForService('COMMERCIAL');
        const commercialService = await prisma.service.upsert({
          where: {
            name: serviceSeedComercial.name,
          },
          update: {},
          create: {
            ...serviceSeedComercial,
            code: commercialCode,
          },
        });
        createdServices.push(commercialService as service);

        return {
          message: 'Services created successfully',
          statusCode: HttpStatus.CREATED,
          data: createdServices,
        };
      });

      return result;
    } catch (error) {
      this.logger.error('Error generating services', error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error generating services');
    }
  }

  /**
   * Genera un código único para servicios según su tipo
   * @param type Tipo de servicio (COMMERCIAL o INTERNAL)
   * @returns Código único generado
   */
  private async generateCodeForService(
    type: string = 'COMMERCIAL',
  ): Promise<string> {
    // Definir prefijo según el tipo de servicio
    let prefix: string;

    switch (type) {
      case 'COMMERCIAL':
        prefix = 'SRV-DYN';
        break;
      case 'INTERNAL':
        prefix = 'SRV-INT';
        break;
      default:
        prefix = 'SRV-GEN'; // Prefijo genérico para otros tipos
    }

    // Buscar el último servicio del tipo específico
    const lastService = await this.prisma.service.findFirst({
      where: {
        code: { startsWith: `${prefix}-` },
      },
      orderBy: { code: 'desc' },
    });

    // Extraer el número secuencial
    const lastIncrement = lastService
      ? parseInt(lastService.code.split('-')[2], 10)
      : 0;

    // Generar el nuevo código con formato SRV-TYPE-000
    return `${prefix}-${String(lastIncrement + 1).padStart(3, '0')}`;
  }

  /**
   * Genera almacenes iniciales para productos comerciales e internos
   * @returns Almacenes creados
   */
  async generateWarehouses(): Promise<HttpResponse<any[]>> {
    try {
      // Iniciar una transacción
      const result = await this.prisma.$transaction(async (prisma) => {
        const createdWarehouses = [];

        // Crear almacenes para cada tipo de producto
        for (const warehouseSeed of warehousesSeed) {
          // Verificar si ya existe un almacén del mismo tipo
          const existingWarehouse = await prisma.warehouse.findFirst({
            where: { type: warehouseSeed.type },
          });

          if (!existingWarehouse) {
            const warehouse = await prisma.warehouse.create({
              data: warehouseSeed,
            });
            createdWarehouses.push(warehouse);
          } else {
            // Si ya existe, lo incluimos en la lista de resultados
            createdWarehouses.push(existingWarehouse);
          }
        }

        return {
          message: 'Warehouses created successfully',
          statusCode: HttpStatus.CREATED,
          data: createdWarehouses,
        };
      });

      return result;
    } catch (error) {
      this.logger.error('Error generating warehouses', error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error generating warehouses');
    }
  }
}
