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
}
