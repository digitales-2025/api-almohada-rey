import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { superAdminSeed } from './data/superadmin.seed';
import { handleException } from 'src/utils';
import * as bcrypt from 'bcrypt';
import { HttpResponse, UserData } from 'src/interfaces';
import {
  service,
  serviceSeedComercial,
  /*   serviceSeedInternal, */
} from './data/services.seed';
import { landingDefaultUserSeed } from './data/landinguser.seed';

export interface InitResult {
  admin?: UserData;
  services?: service[];
  landingUser?: UserData;
}

@Injectable()
export class SeedsService {
  private readonly logger = new Logger(SeedsService.name);

  constructor(private readonly prisma: PrismaService) {}

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
        // Crear usuario superadmin y asignarle el rol si no existe
        const superadminUser = await prisma.user.upsert({
          where: {
            email_isActive: { email: superAdminSeed.email, isActive: true },
          },
          update: {},
          create: {
            ...superAdminSeed,
            password: await bcrypt.hash(superAdminSeed.password, 10),
            isSuperAdmin: true,
          },
        });

        return {
          message: 'Admin created successfully',
          statusCode: HttpStatus.CREATED,
          data: {
            id: superadminUser.id,
            name: superadminUser.name,
            email: superadminUser.email,
            phone: superadminUser.phone,
            isSuperAdmin: superadminUser.isSuperAdmin,
            userRol: superadminUser.userRol,
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
        // Crear usuario landing y asignarle el rol si no existe
        const landingUser = await prisma.user.upsert({
          where: {
            email_isActive: {
              email: landingDefaultUserSeed.email,
              isActive: true,
            },
          },
          update: {},
          create: {
            ...landingDefaultUserSeed,
            isLandingUser: true, //only use with this flag
            password: await bcrypt.hash(landingDefaultUserSeed.password, 10),
            isSuperAdmin: false,
          },
        });
        return {
          message: 'Landing User created successfully',
          statusCode: HttpStatus.CREATED,
          data: {
            id: landingUser.id,
            name: landingUser.name,
            email: landingUser.email,
            phone: landingUser.phone,
            isSuperAdmin: landingUser.isSuperAdmin,
            userRol: landingUser.userRol,
          },
        };
      });
      return result;
    } catch (error) {
      this.logger.error(
        `Error generating landing default user ${superAdminSeed.email}`,
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

        //Temporalmente comentado: Servicio interno
        // Crear servicio interno
        /*    const internalCode = await this.generateCodeForService('INTERNAL');
        const internalService = await prisma.service.upsert({
          where: {
            name: serviceSeedInternal.name,
          },
          update: {},
          create: {
            ...serviceSeedInternal,
            code: internalCode,
          },
        });
        createdServices.push(internalService as service); */
        //fin
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
}
