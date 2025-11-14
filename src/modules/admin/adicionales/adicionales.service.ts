import {
  Injectable,
  Logger,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleException } from 'src/utils';
import { HttpResponse } from 'src/interfaces';

@Injectable()
export class AdicionalesService {
  private readonly logger = new Logger(AdicionalesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea el servicio "Adicionales" si no existe
   * @returns Servicio creado
   */
  async createAdicionalesService(): Promise<HttpResponse<any>> {
    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // Generar código único para el servicio
        const code = await this.generateCodeForService('ADDITIONAL');

        // Crear o actualizar el servicio "Adicionales"
        const adicionalesService = await prisma.service.upsert({
          where: {
            name: 'Adicionales',
          },
          update: {},
          create: {
            name: 'Adicionales',
            description:
              'Servicio adicional para pagos adicionales a la reserva',
            code: code,
            price: 10.0,
          },
        });

        return {
          message: 'Servicio Adicionales creado exitosamente',
          statusCode: HttpStatus.CREATED,
          data: adicionalesService,
        };
      });

      return result;
    } catch (error) {
      this.logger.error('Error creando servicio Adicionales', error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error creando servicio Adicionales');
    }
  }

  /**
   * Genera un código único para servicios según su tipo
   * @param type Tipo de servicio (COMMERCIAL, INTERNAL o ADDITIONAL)
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
      case 'ADDITIONAL':
        prefix = 'SRV-ADD';
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
