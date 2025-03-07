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

@Injectable()
export class SeedsService {
  private readonly logger = new Logger(SeedsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generar el usuario super admin con su rol
   * @returns Super admin creado
   */
  async generateInit(): Promise<HttpResponse<UserData>> {
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
}
