import { Injectable } from '@nestjs/common';
import { UpdateHistory } from '../entities/up-history.entity';
import { BaseRepository, PrismaService } from '@prisma/prisma';

export interface CreateImagePatientData {
  patientId?: string;
  imageUrl?: string;
  updateHistoryId?: string;
  phothography?: boolean;
}

@Injectable()
export class UpdateHistoryRepository extends BaseRepository<UpdateHistory> {
  constructor(prisma: PrismaService) {
    super(prisma, 'updateHistory'); // Tabla del esquema de prisma
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

    return !!result;
  }

  /**
   * Registra una nueva imagen de paciente
   * @param data - Datos tipados para crear el registro de imagen
   * @returns Promise<boolean> - true si se creó correctamente, false si hubo error
   */
  async createImagePatient(data: CreateImagePatientData): Promise<boolean> {
    try {
      const result = await this.prisma.imagePatient.create({
        data: {
          patientId: data.patientId,
          imageUrl: data.imageUrl,
          updateHistoryId: data.updateHistoryId,
          phothography: data.phothography ?? true,
        },
      });

      return !!result.id;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  /**
   * Obtiene todas las imágenes asociadas a una historia médica
   * @param updateHistoryId - ID de la historia médica
   * @returns Promise<Record<string, { id: string, url: string }>> - Objeto con las imágenes
   */
  async findImagesByHistoryId(
    updateHistoryId: string,
  ): Promise<Array<{ id: string; url: string }>> {
    try {
      const images = await this.prisma.imagePatient.findMany({
        where: {
          updateHistoryId,
          isActive: true,
        },
        select: {
          id: true,
          imageUrl: true,
        },
      });

      // Transformar directamente a un array de objetos
      return images
        .map((img) => ({
          id: img.id,
          url: img.imageUrl,
        }))
        .filter((img) => img.url);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  /**
   * Actualiza la URL de una imagen existente
   * @param imageId - ID del registro de ImagePatient
   * @param newUrl - Nueva URL de la imagen
   * @returns Promise<boolean> - true si se actualizó correctamente
   */
  async updateImageUrl(imageId: string, newUrl: string): Promise<boolean> {
    try {
      const result = await this.prisma.imagePatient.update({
        where: {
          id: imageId,
          isActive: true,
        },
        data: {
          imageUrl: newUrl,
          updatedAt: new Date(),
        },
      });
      return !!result;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  /**
   * Busca una imagen por su ID
   */
  async findImageById(imageId: string) {
    try {
      return await this.prisma.imagePatient.findUnique({
        where: { id: imageId },
      });
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}
