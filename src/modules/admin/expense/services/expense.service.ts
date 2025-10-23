import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ExpenseRepository } from '../repositories/expense.repository';
import { HotelExpenseEntity } from '../entities/expense.entity';
import {
  CreateHotelExpenseDto,
  UpdateHotelExpenseDto,
  DeleteHotelExpenseDto,
} from '../dto';
import { UserData } from 'src/interfaces';
import { validateArray, validateChanges } from 'src/prisma/src/utils';
import { BaseErrorHandler } from 'src/utils/error-handlers/service-error.handler';
import { expenseErrorMessages } from '../errors/errors-expense';
import {
  CreateExpenseUseCase,
  UpdateExpenseUseCase,
  DeleteExpensesUseCase,
  ReactivateExpensesUseCase,
} from '../use-cases';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { PaginationParams } from 'src/utils/paginated-response/pagination.types';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';
import {
  FilterOptions,
  SortOptions,
} from 'src/prisma/src/interfaces/base.repository.interfaces';

import { AuditService } from '../../audit/audit.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);
  private readonly errorHandler: BaseErrorHandler;

  constructor(
    private readonly expenseRepository: ExpenseRepository,
    private readonly createExpenseUseCase: CreateExpenseUseCase,
    private readonly updateExpenseUseCase: UpdateExpenseUseCase,
    private readonly deleteExpensesUseCase: DeleteExpensesUseCase,
    private readonly reactivateExpensesUseCase: ReactivateExpensesUseCase,
    private readonly auditService: AuditService,
  ) {
    this.errorHandler = new BaseErrorHandler(
      this.logger,
      'Expense',
      expenseErrorMessages,
    );
  }

  /**
   * Crea un nuevo gasto
   */
  async create(
    createHotelExpenseDto: CreateHotelExpenseDto,
    user: UserData,
  ): Promise<BaseApiResponse<HotelExpenseEntity>> {
    try {
      // Validación adicional del monto si es necesario
      if (Number(createHotelExpenseDto.amount) <= 0) {
        throw new BadRequestException(expenseErrorMessages.invalidAmount);
      }

      // Validación de la fecha
      try {
        new Date(createHotelExpenseDto.date);
      } catch (error) {
        throw new BadRequestException(expenseErrorMessages.invalidDateFormat);
        throw error;
      }

      // Si hay un tipo de documento, validar que el número sea obligatorio
      if (
        createHotelExpenseDto.documentType &&
        !createHotelExpenseDto.documentNumber
      ) {
        throw new BadRequestException(
          expenseErrorMessages.documentNumberRequired,
        );
      }

      // Crear el gasto
      return await this.createExpenseUseCase.execute(
        createHotelExpenseDto,
        user,
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'creating');
      throw error;
    }
  }

  /**
   * Obtiene todos los gastos
   */
  async findAll(): Promise<HotelExpenseEntity[]> {
    try {
      return this.expenseRepository.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Busca un gasto por su ID
   */
  async findOne(id: string): Promise<HotelExpenseEntity> {
    try {
      return this.findById(id);
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  async findByDatePaginated(
    pagination: PaginationParams,
    filters: {
      month?: string;
      year?: string;
      search?: string;
      category?: string;
      paymentMethod?: string;
      documentType?: string;
    },
    sortOptions?: SortOptions<any>,
  ): Promise<PaginatedResponse<HotelExpenseEntity>> {
    try {
      // Construir filtros base para fechas
      const baseWhere: Prisma.HotelExpenseWhereInput = {};

      // Manejo de filtros separados por mes y año (mantener lógica existente)
      if (filters.year && filters.month) {
        // Si tenemos ambos, año y mes
        baseWhere.date = { startsWith: `${filters.year}-${filters.month}` };
      } else if (filters.year && !filters.month) {
        // Solo año
        baseWhere.date = { startsWith: `${filters.year}-` };
      } else if (!filters.year && filters.month) {
        // Solo mes
        // Busca fechas que tengan -MM- en la posición correcta (YYYY-MM-DD)
        baseWhere.date = { contains: `-${filters.month}-` };
      }

      // Construir filtros avanzados
      const filterOptions: FilterOptions<any> = {};

      // Filtro por categoría (array)
      if (filters.category) {
        const categoryArray = filters.category.split(',').map((c) => c.trim());
        filterOptions.arrayByField = {
          ...filterOptions.arrayByField,
          category: categoryArray,
        };
      }

      // Filtro por método de pago (array)
      if (filters.paymentMethod) {
        const paymentMethodArray = filters.paymentMethod
          .split(',')
          .map((p) => p.trim());
        filterOptions.arrayByField = {
          ...filterOptions.arrayByField,
          paymentMethod: paymentMethodArray,
        };
      }

      // Filtro por tipo de documento (array)
      if (filters.documentType) {
        const documentTypeArray = filters.documentType
          .split(',')
          .map((d) => d.trim());
        filterOptions.arrayByField = {
          ...filterOptions.arrayByField,
          documentType: documentTypeArray,
        };
      }

      // Búsqueda simple en campos del gasto
      if (filters.search) {
        filterOptions.searchByField = {
          ...filterOptions.searchByField,
          description: filters.search,
          documentNumber: filters.search,
        };
      }

      // Usar el BaseRepository con filtros avanzados
      return await this.expenseRepository.findManyPaginated<HotelExpenseEntity>(
        pagination,
        {
          where: baseWhere, // Filtros de fecha existentes
          filterOptions, // Nuevos filtros avanzados
          sortOptions, // Opciones de ordenamiento
          enumFields: ['category', 'paymentMethod', 'documentType'],
          dateFields: ['date', 'createdAt', 'updatedAt'],
          orderBy: { createdAt: 'desc' },
        },
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }
  /**
   * Busca un gasto por su ID (método auxiliar)
   */
  async findById(id: string): Promise<HotelExpenseEntity> {
    const expense = await this.expenseRepository.findById(id);
    if (!expense) {
      throw new BadRequestException(expenseErrorMessages.notFound);
    }
    return expense;
  }

  /**
   * Actualiza un gasto existente
   */
  async update(
    id: string,
    updateHotelExpenseDto: UpdateHotelExpenseDto,
    user: UserData,
  ): Promise<BaseApiResponse<HotelExpenseEntity>> {
    try {
      const currentExpense = await this.findById(id);

      // Si dataDocument es true, consideramos que hay cambios directamente
      // ya que vamos a limpiar los campos documentType y documentNumber
      if (updateHotelExpenseDto.dataDocument === false) {
        // Continuar con las validaciones
      }
      // Si no está presente dataDocument, verificar cambios normalmente
      else {
        // Verificar si hay cambios en los demás campos
        const updateDto: Partial<HotelExpenseEntity> = updateHotelExpenseDto;

        if (!validateChanges(updateDto, currentExpense)) {
          return {
            success: true,
            message: 'No se detectaron cambios en el gasto',
            data: currentExpense,
          };
        }
      }

      // Validar monto positivo si se está actualizando
      if (
        updateHotelExpenseDto.amount !== undefined &&
        Number(updateHotelExpenseDto.amount) <= 0
      ) {
        throw new BadRequestException(expenseErrorMessages.invalidAmount);
      }

      // Validar fecha si se está actualizando
      if (updateHotelExpenseDto.date) {
        try {
          new Date(updateHotelExpenseDto.date);
        } catch (error) {
          throw error;
          throw new BadRequestException(expenseErrorMessages.invalidDateFormat);
        }
      }

      // Si dataDocument es true, no realizamos validaciones de documento
      // ya que vamos a limpiar esos campos
      if (updateHotelExpenseDto.dataDocument) {
        // Validación condicional para documentType y documentNumber
        if (
          (updateHotelExpenseDto.documentType &&
            !currentExpense.documentNumber &&
            !updateHotelExpenseDto.documentNumber) ||
          (currentExpense.documentType &&
            !currentExpense.documentNumber &&
            updateHotelExpenseDto.documentNumber === '')
        ) {
          throw new BadRequestException(
            expenseErrorMessages.documentNumberRequired,
          );
        }
      }

      // Realizar la actualización
      return await this.updateExpenseUseCase.execute(
        id,
        updateHotelExpenseDto,
        user,
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'updating');
      throw error;
    }
  }

  /**
   * Elimina múltiples gastos
   */
  async deleteMany(
    deleteHotelExpenseDto: DeleteHotelExpenseDto,
    user: UserData,
  ): Promise<BaseApiResponse<HotelExpenseEntity[]>> {
    try {
      validateArray(deleteHotelExpenseDto.ids, 'IDs de gastos');
      return await this.deleteExpensesUseCase.execute(
        deleteHotelExpenseDto,
        user,
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'deleting');
      throw error;
    }
  }

  /**
   * Reactiva múltiples gastos (si implementas soft delete o isActive)
   */
  async reactivateMany(
    ids: string[],
    user: UserData,
  ): Promise<BaseApiResponse<HotelExpenseEntity[]>> {
    try {
      validateArray(ids, 'IDs de gastos');
      return await this.reactivateExpensesUseCase.execute(ids, user);
    } catch (error) {
      this.errorHandler.handleError(error, 'reactivating');
      throw error;
    }
  }

  /**
   * Genera gastos automáticos para todo un año basado en datos históricos reales
   */
  async generateExpensesForYear(
    year: number,
    user: UserData,
  ): Promise<BaseApiResponse<any>> {
    try {
      // Validar que el año sea válido
      if (!year || year < 2020 || year > 2030) {
        throw new BadRequestException(
          'Año inválido. Debe estar entre 2020 y 2030',
        );
      }

      // Determinar hasta qué mes generar
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // getMonth() retorna 0-11

      let maxMonth = 12; // Por defecto generar todo el año

      // Si el año solicitado es el año actual, solo generar hasta el mes anterior
      if (year === currentYear) {
        maxMonth = currentMonth - 1;

        // Si estamos en enero, no hay meses anteriores para generar
        if (maxMonth < 1) {
          throw new BadRequestException(
            'No se pueden generar gastos para el año actual en enero. Espere al siguiente mes.',
          );
        }
      }

      // Si el año es futuro, no permitir
      if (year > currentYear) {
        throw new BadRequestException(
          'No se pueden generar gastos para años futuros',
        );
      }

      // Plantilla de gastos basada en datos reales de enero
      const expenseTemplates = [
        // FACTURAS - Imagen 1 (Gastos fijos mayores)
        {
          description: 'B & W RENISSE SAC',
          baseAmount: 280,
          variance: 30,
          documentPrefix: '1296',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'Star Market SAC',
          baseAmount: 100,
          variance: 20,
          documentPrefix: '1297',
          category: 'VARIABLE',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'AUREN SA',
          baseAmount: 270,
          variance: 25,
          documentPrefix: '1298',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'Ingenieria y Servicios DIFFERENT SC RL',
          baseAmount: 160,
          variance: 30,
          documentPrefix: '1299',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'Ingenieria y Servicios DIFFERENT SC RL',
          baseAmount: 80,
          variance: 15,
          documentPrefix: '1300',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'CHEMTRADE SAC',
          baseAmount: 70,
          variance: 15,
          documentPrefix: '1301',
          category: 'VARIABLE',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'INST TECNICO PROFESIONAL STEP SAC',
          baseAmount: 70,
          variance: 10,
          documentPrefix: '1302',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'Quimica Ingenieria y Proyectos Sac',
          baseAmount: 888,
          variance: 100,
          documentPrefix: '1303',
          category: 'VARIABLE',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'Interlinks Consulting Group Sac',
          baseAmount: 75,
          variance: 10,
          documentPrefix: '1304',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'Quimica Ingenieria y Proyectos Sac',
          baseAmount: 888,
          variance: 120,
          documentPrefix: '1305',
          category: 'VARIABLE',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'CICB Latin America S.A.',
          baseAmount: 210,
          variance: 30,
          documentPrefix: '1306',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'Tech Storage Company SAC',
          baseAmount: 358,
          variance: 50,
          documentPrefix: '1307',
          category: 'VARIABLE',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'Alerta Peru Proyectos Sac',
          baseAmount: 690,
          variance: 80,
          documentPrefix: '1308',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'VMWARE SIST INTEGRAL DE SEG SAC',
          baseAmount: 350,
          variance: 40,
          documentPrefix: '1309',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'Interlinks Consulting Group Sac',
          baseAmount: 75,
          variance: 10,
          documentPrefix: '1310',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'CICB Latin America SA',
          baseAmount: 140,
          variance: 20,
          documentPrefix: '1311',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },

        // FACTURAS - Imagen 2 (Gastos variables menores - alimentos, productos)
        {
          description: 'Compañia Food Retail SAC',
          baseAmount: 110.88,
          variance: 20,
          documentPrefix: 'BF-2204197',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'INVOICE',
        },
        {
          description: 'Distrib. Arianita & Analy E.I.R.L',
          baseAmount: 40.5,
          variance: 10,
          documentPrefix: 'M1-82B',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'INVOICE',
        },
        {
          description: 'Corporación RICO Sac',
          baseAmount: 34.4,
          variance: 10,
          documentPrefix: 'F94L-0820',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'INVOICE',
        },
        {
          description: 'Mas Ventas EIRL',
          baseAmount: 24.7,
          variance: 8,
          documentPrefix: 'F001-28794',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'INVOICE',
        },
        {
          description: 'Compañia Food Retail SAC',
          baseAmount: 64.76,
          variance: 15,
          documentPrefix: '25-2201092',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'INVOICE',
        },
        {
          description: 'Mas Ventas EIRL',
          baseAmount: 27.7,
          variance: 8,
          documentPrefix: 'B1-28848',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'INVOICE',
        },
        {
          description: 'Corporación RICO Sac',
          baseAmount: 19.0,
          variance: 6,
          documentPrefix: 'F94L-60589',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'INVOICE',
        },
        {
          description: 'Jolas y Gas Sac',
          baseAmount: 50.0,
          variance: 10,
          documentPrefix: '1-29922',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'INVOICE',
        },
        {
          description: 'Makro Supermayorista SA',
          baseAmount: 216.46,
          variance: 50,
          documentPrefix: '20-1708478',
          category: 'VARIABLE',
          paymentMethod: 'CARD',
          documentType: 'INVOICE',
        },
        {
          description: 'Corporación RICO Sac',
          baseAmount: 13.4,
          variance: 5,
          documentPrefix: 'F94L-61038',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'INVOICE',
        },
        {
          description: 'Distribuciones Arequipa Sac',
          baseAmount: 110.01,
          variance: 25,
          documentPrefix: '1-16587',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'INVOICE',
        },
        {
          description: 'Corporación RICO Sac',
          baseAmount: 78.3,
          variance: 20,
          documentPrefix: 'F94L-61167',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'INVOICE',
        },
        {
          description: 'CVC Progreso Representaciones EIRL',
          baseAmount: 450.0,
          variance: 50,
          documentPrefix: 'E001-1334',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'INVOICE',
        },
        {
          description: 'La Yema Dorada EIRL',
          baseAmount: 148.0,
          variance: 30,
          documentPrefix: 'F001-8686',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'INVOICE',
        },
        {
          description: 'Sanitas Perú S.A. EPS',
          baseAmount: 858.0,
          variance: 50,
          documentPrefix: 'F002-1829187',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'Jgipay SAC',
          baseAmount: 1.0,
          variance: 0.5,
          documentPrefix: 'F001-1479676',
          category: 'OTHER',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },
        {
          description: 'Jgipay SAC',
          baseAmount: 100.87,
          variance: 20,
          documentPrefix: 'F001-14656269',
          category: 'OTHER',
          paymentMethod: 'TRANSFER',
          documentType: 'INVOICE',
        },

        // BOLETAS - Imagen 1 (Servicios varios)
        {
          description: 'Servicio de Limpieza',
          baseAmount: 350,
          variance: 50,
          documentPrefix: '120',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },
        {
          description: 'Mantenimiento General',
          baseAmount: 115,
          variance: 30,
          documentPrefix: '120',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },
        {
          description: 'Servicio Técnico',
          baseAmount: 210,
          variance: 40,
          documentPrefix: '120',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },
        {
          description: 'Reparaciones Varias',
          baseAmount: 60,
          variance: 20,
          documentPrefix: '120',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },
        {
          description: 'Servicio de Lavandería',
          baseAmount: 330,
          variance: 50,
          documentPrefix: '120',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },
        {
          description: 'Mantenimiento Equipos',
          baseAmount: 465,
          variance: 60,
          documentPrefix: '121',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },
        {
          description: 'Servicio de Jardinería',
          baseAmount: 150,
          variance: 30,
          documentPrefix: '121',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },
        {
          description: 'Reparación de Instalaciones',
          baseAmount: 80,
          variance: 20,
          documentPrefix: '121',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },
        {
          description: 'Servicio de Fumigación',
          baseAmount: 120,
          variance: 25,
          documentPrefix: '121',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },
        {
          description: 'Mantenimiento Preventivo',
          baseAmount: 80,
          variance: 20,
          documentPrefix: '121',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },
        {
          description: 'Servicio de Pintura',
          baseAmount: 235,
          variance: 40,
          documentPrefix: '121',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },
        {
          description: 'Reparación Eléctrica',
          baseAmount: 70,
          variance: 20,
          documentPrefix: '121',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },
        {
          description: 'Mantenimiento de Aires',
          baseAmount: 110,
          variance: 25,
          documentPrefix: '121',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },
        {
          description: 'Servicio de Plomería',
          baseAmount: 80,
          variance: 20,
          documentPrefix: '121',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },
        {
          description: 'Reparación de Mobiliario',
          baseAmount: 320,
          variance: 50,
          documentPrefix: '121',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },
        {
          description: 'Servicio de Carpintería',
          baseAmount: 120,
          variance: 30,
          documentPrefix: '122',
          category: 'VARIABLE',
          paymentMethod: 'CASH',
          documentType: 'RECEIPT',
        },

        // BOLETAS - Imagen 2 (Servicios públicos y alquileres - gastos fijos mensuales)
        {
          description: 'SEDAPAR - Agua',
          baseAmount: 270.2,
          variance: 30,
          documentPrefix: 'N/A',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'RECEIPT',
        },
        {
          description: 'MOVISTAR - Internet/Teléfono',
          baseAmount: 73.38,
          variance: 5,
          documentPrefix: 'N/A',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'RECEIPT',
        },
        {
          description: 'SEAL - Energía Eléctrica',
          baseAmount: 333.7,
          variance: 50,
          documentPrefix: 'N/A',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'RECEIPT',
        },
        {
          description: 'Claro - Telefonía Móvil',
          baseAmount: 48.99,
          variance: 5,
          documentPrefix: 'N/A',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'RECEIPT',
        },
        {
          description: 'Claro - Plan Adicional',
          baseAmount: 85.0,
          variance: 10,
          documentPrefix: 'N/A',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'RECEIPT',
        },
        {
          description: 'Alquiler Hotel',
          baseAmount: 2000.0,
          variance: 0,
          documentPrefix: 'N/A',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'RECEIPT',
        },
        {
          description: 'Alquiler Carro',
          baseAmount: 400.0,
          variance: 0,
          documentPrefix: 'N/A',
          category: 'FIXED',
          paymentMethod: 'TRANSFER',
          documentType: 'RECEIPT',
        },
      ];

      const generatedExpenses = [];
      let totalAmount = 0;

      // Generar gastos para cada mes del año (hasta maxMonth)
      for (let month = 1; month <= maxMonth; month++) {
        let documentCounter = 1000 + month * 100; // Para hacer números de documento únicos por mes

        for (const template of expenseTemplates) {
          // Calcular monto con variación aleatoria
          const variance = template.variance * (Math.random() * 2 - 1); // Entre -variance y +variance
          const amount =
            Math.round((template.baseAmount + variance) * 100) / 100;

          // Generar una fecha aleatoria dentro del mes
          const daysInMonth = new Date(year, month, 0).getDate();
          const randomDay = Math.floor(Math.random() * daysInMonth) + 1;
          const date = `${year}-${month.toString().padStart(2, '0')}-${randomDay.toString().padStart(2, '0')}`;

          // Generar número de documento único
          let documentNumber;
          if (template.documentPrefix === 'N/A') {
            documentNumber = template.documentPrefix;
          } else if (template.documentPrefix.includes('-')) {
            // Para documentos como "BF-2204197", mantener el formato pero cambiar el número
            const prefix = template.documentPrefix.split('-')[0];
            documentNumber = `${prefix}-${documentCounter}`;
          } else if (template.documentPrefix.includes('.')) {
            // Para boletas como "120.05"
            const baseNumber = parseInt(template.documentPrefix) + month;
            const decimal = Math.floor(Math.random() * 99);
            documentNumber = `${baseNumber}.${decimal.toString().padStart(2, '0')}`;
          } else {
            // Para números simples como "1296"
            documentNumber = (
              parseInt(template.documentPrefix) + documentCounter
            ).toString();
          }

          documentCounter++;

          const expenseData: CreateHotelExpenseDto = {
            description: template.description,
            category: template.category as any,
            paymentMethod: template.paymentMethod as any,
            amount,
            date,
            documentType: template.documentType as any,
            documentNumber: documentNumber,
          };

          const result = await this.create(expenseData, user);
          if (result.success && result.data) {
            generatedExpenses.push(result.data);
            totalAmount += amount;
          }
        }
      }

      this.logger.log(
        `Generated ${generatedExpenses.length} expenses for year ${year} (months 1-${maxMonth}). Total amount: ${totalAmount}`,
      );

      return {
        success: true,
        message: `Se generaron ${generatedExpenses.length} gastos para el año ${year} (enero - ${this.getMonthName(maxMonth)})`,
        data: {
          year,
          monthsGenerated: maxMonth,
          totalExpenses: generatedExpenses.length,
          totalAmount: Math.round(totalAmount * 100) / 100,
        },
      };
    } catch (error) {
      this.errorHandler.handleError(error, 'creating');
      throw error;
    }
  }

  /**
   * Obtiene el nombre del mes en español
   */
  private getMonthName(month: number): string {
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return months[month - 1];
  }
}
