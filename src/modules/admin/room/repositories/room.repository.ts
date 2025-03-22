import { Injectable, Logger } from '@nestjs/common';
import {
  Prescription,
  PrescriptionItemResponse,
  PrescriptionWithPatient,
} from '../entities/room.entity';
import { BaseRepository, PrismaService } from '@prisma/prisma';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class PrescriptionRepository extends BaseRepository<Prescription> {
  constructor(prisma: PrismaService) {
    super(prisma, 'prescription'); // Tabla del esquema de prisma
  }

  /**
   * Valida si existe un registro en una tabla específica por ID
   * @param table - Nombre de la tabla donde buscar
   * @param id - ID a buscar
   * @returns true si existe el registro, false si no
   */
  async findByIdValidate(table: string, id: string): Promise<boolean> {
    const result = await this.prisma.measureQuery(`findBy${table}Id`, () =>
      (this.prisma[table] as any).findUnique({
        where: { id },
      }),
    );

    return !!result; // Convierte el resultado en booleano
  }

  async updatePrescriptionInHistory(
    updateHistoryId: string,
    prescriptionId: string,
  ): Promise<boolean> {
    try {
      await this.prisma.updateHistory.update({
        where: { id: updateHistoryId },
        data: { prescriptionId },
      });
      return true;
    } catch (error) {
      throw error;
    }
  }

  async findPrescriptionsWithPatient(
    limit: number = 10,
    offset: number = 0,
  ): Promise<PrescriptionWithPatient[]> {
    const prescriptions = await this.prisma.prescription.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            lastName: true,
            dni: true,
            birthDate: true,
            gender: true,
            address: true,
            phone: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    return prescriptions.map((prescription) => {
      // Convertir los JSON a arrays tipados
      const medicaments = this.parseJsonToType<PrescriptionItemResponse[]>(
        prescription.prescriptionMedicaments,
        [],
      );

      const services = this.parseJsonToType<PrescriptionItemResponse[]>(
        prescription.prescriptionServices,
        [],
      );

      // Crear una instancia de PrescriptionWithPatient con los datos transformados
      return plainToInstance(PrescriptionWithPatient, {
        ...prescription,
        prescriptionMedicaments: medicaments.map((med) =>
          plainToInstance(PrescriptionItemResponse, med),
        ),
        prescriptionServices: services.map((svc) =>
          plainToInstance(PrescriptionItemResponse, svc),
        ),
      });
    });
  }

  // Función auxiliar para parsear JSON a tipos específicos
  private parseJsonToType<T>(jsonValue: any, defaultValue: T): T {
    if (!jsonValue) return defaultValue;
    try {
      if (typeof jsonValue === 'string') {
        return JSON.parse(jsonValue);
      }
      return jsonValue as T;
    } catch (error) {
      Logger.error('Error parsing JSON:', error);
      return defaultValue;
    }
  }
}
