import { Injectable } from '@nestjs/common';
import {
  CleaningChecklist,
  CleaningChecklistWithRoom,
  DetailedCleaningChecklist,
} from '../entities/room-clean.entity';
import { BaseRepository, PrismaService } from 'src/prisma/src';
import { RoomStatus } from '@prisma/client';

@Injectable()
export class CleaningChecklistRepository extends BaseRepository<CleaningChecklist> {
  constructor(prisma: PrismaService) {
    super(prisma, 'cleaningChecklist'); // Tabla del esquema de prisma
  }

  /**
   * Busca registros de limpieza por ID de habitación con paginación y filtros
   * @param roomId ID de la habitación
   * @param options Opciones de filtrado y paginación
   * @returns Objeto con registros de limpieza y metadatos de paginación
   */
  async findByRoom(
    roomId: string,
    options?: {
      page?: number;
      month?: string;
      year?: string;
    },
  ): Promise<{
    data: CleaningChecklistWithRoom;
    pagination?: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
    };
  }> {
    const page = options?.page || 1;
    const limit = 10; // Número de elementos por página
    const skip = (page - 1) * limit;

    // Preparar el objeto de condiciones de filtrado
    const whereCondition: {
      roomId: string;
      date?: {
        startsWith?: string;
        contains?: string;
      };
    } = { roomId };

    // Añadir filtro por año y mes si están presentes
    if (options?.year || options?.month) {
      const monthsMap: Record<string, string> = {
        enero: '01',
        febrero: '02',
        marzo: '03',
        abril: '04',
        mayo: '05',
        junio: '06',
        julio: '07',
        agosto: '08',
        septiembre: '09',
        octubre: '10',
        noviembre: '11',
        diciembre: '12',
      };

      // Si hay año, añadir filtro
      if (options?.year) {
        // Si también hay mes, filtramos por año y mes específicos
        if (options?.month) {
          let monthNumber = options.month;

          // Si el mes es un nombre en español, convertirlo a número
          if (
            isNaN(Number(options.month)) &&
            monthsMap[options.month.toLowerCase()]
          ) {
            monthNumber = monthsMap[options.month.toLowerCase()];
          }
          // Si es un número pero tiene un solo dígito, añadir cero al inicio
          else if (
            !isNaN(Number(options.month)) &&
            options.month.length === 1
          ) {
            monthNumber = `0${options.month}`;
          }

          whereCondition.date = {
            startsWith: `${options.year}-${monthNumber}`,
          };
        } else {
          // Solo filtrar por año
          whereCondition.date = {
            startsWith: options.year,
          };
        }
      } else if (options?.month) {
        // Si solo hay mes pero no año, filtramos por cualquier año con ese mes
        let monthNumber = options.month;

        // Si el mes es un nombre en español, convertirlo a número
        if (
          isNaN(Number(options.month)) &&
          monthsMap[options.month.toLowerCase()]
        ) {
          monthNumber = monthsMap[options.month.toLowerCase()];
        }
        // Si es un número pero tiene un solo dígito, añadir cero al inicio
        else if (!isNaN(Number(options.month)) && options.month.length === 1) {
          monthNumber = `0${options.month}`;
        }

        // Buscar patrones como "YYYY-MM" donde MM es el mes
        whereCondition.date = {
          contains: `-${monthNumber}-`,
        };
      }
    }

    // Primero obtenemos los datos de la habitación
    const roomData = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: {
        number: true,
        RoomTypes: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Consulta para obtener los datos paginados de limpieza
    const cleaningChecklists = await this.findMany<DetailedCleaningChecklist>({
      where: whereCondition,
      include: {
        Room: {
          select: {
            number: true,
            RoomTypes: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        userCheck: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        date: 'desc', // Ordenar por fecha descendente (más reciente primero)
      },
    });

    // Creamos el objeto con la estructura correcta según los tipos
    const formattedData: CleaningChecklistWithRoom = {
      Room: roomData,
      cleaningChecklist: cleaningChecklists,
    };

    // Si se solicitó una página específica, obtener información de paginación
    if (options?.page) {
      // Contar el total de elementos que coinciden con los filtros
      const totalItems = await this.prisma.cleaningChecklist.count({
        where: whereCondition,
      });

      // Calcular el total de páginas
      const totalPages = Math.ceil(totalItems / limit);

      return {
        data: formattedData,
        pagination: {
          totalItems,
          totalPages,
          currentPage: page,
        },
      };
    }

    // Si no se solicitó paginación, solo devolver los datos
    return { data: formattedData };
  }

  /**
   * Busca registros de limpieza por fecha
   * @param date Fecha en formato YYYY-MM-DD
   * @returns Array de registros de limpieza
   */
  async findByDate(date: string): Promise<CleaningChecklist[]> {
    return this.findMany({
      where: {
        date,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Busca un registro de limpieza específico por habitación y fecha
   * @param roomId ID de la habitación
   * @param date Fecha en formato YYYY-MM-DD
   * @returns Registro de limpieza si existe, null en caso contrario
   */
  async findByRoomAndDate(
    roomId: string,
    date: string,
  ): Promise<CleaningChecklist | null> {
    return this.findOne({
      where: {
        roomId,
        date,
      },
    });
  }

  /**
   * Obtiene estadísticas de limpieza por fecha
   * @param startDate Fecha inicial en formato YYYY-MM-DD
   * @param endDate Fecha final en formato YYYY-MM-DD
   * @returns Número de limpiezas en el rango de fechas
   */
  async getCleaningCountByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const cleanings = await this.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return cleanings.length;
  }

  /**
   * Obtiene la información detallada de una habitación para validaciones
   * @param roomId ID de la habitación
   * @returns Datos completos de la habitación o null si no existe
   */
  async getRoomDetails(roomId: string): Promise<any | null> {
    return this.prisma.room.findUnique({
      where: {
        id: roomId,
      },
    });
  }

  /**
   * Actualiza el estado de una habitación a disponible
   * @param roomId ID de la habitación
   * @returns Habitación actualizada
   */
  async updateRoomStatus(roomId: string, status: RoomStatus): Promise<any> {
    return this.prisma.room.update({
      where: { id: roomId },
      data: {
        status: status,
        updatedAt: new Date(),
      },
    });
  }
}
