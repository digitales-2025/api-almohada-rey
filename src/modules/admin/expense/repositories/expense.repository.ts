import { Injectable } from '@nestjs/common';
import { HotelExpenseEntity } from '../entities/expense.entity';
import { BaseRepository, PrismaService } from 'src/prisma/src';

@Injectable()
export class ExpenseRepository extends BaseRepository<HotelExpenseEntity> {
  constructor(prisma: PrismaService) {
    super(prisma, 'hotelExpense'); // Tabla del esquema de prisma
  }

  /**
   * Busca gastos por año y mes (ignorando el día)
   * @param date Fecha completa (formato YYYY-MM-DD)
   * @returns Promise con array de gastos del año y mes indicados
   */
  async findByDate(date: string): Promise<HotelExpenseEntity[]> {
    console.log('🚀 ~ ExpenseRepository ~ findByYearAndMonth ~ date:', date);
    // Extrae el año y mes: "YYYY-MM"
    const yearMonth = date.slice(0, 7);

    const expenses = await this.prisma.hotelExpense.findMany({
      where: {
        date: {
          startsWith: yearMonth, // Solo año y mes
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return expenses.map((expense) => new HotelExpenseEntity(expense));
  }

  /**
   * Elimina gastos de forma lógica (si implementas isActive) o física
   * @param ids Array de IDs de gastos a eliminar
   * @returns Promise con array de gastos eliminados
   */
  async softDeleteManyDelete(ids: string[]): Promise<HotelExpenseEntity[]> {
    // Como el modelo actual no tiene isActive, realizamos un borrado físico
    // Si agregas isActive a tu modelo, deberías actualizar este método
    const expenses = await this.prisma.hotelExpense.findMany({
      where: { id: { in: ids } },
    });

    // Borrado físico (considera reemplazar con borrado lógico si agregas isActive)
    await this.prisma.hotelExpense.deleteMany({
      where: { id: { in: ids } },
    });

    return expenses.map((expense) => new HotelExpenseEntity(expense));
  }
}
