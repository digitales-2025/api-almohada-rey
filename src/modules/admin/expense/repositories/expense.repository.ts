import { Injectable } from '@nestjs/common';
import { HotelExpenseEntity } from '../entities/expense.entity';
import { BaseRepository, PrismaService } from 'src/prisma/src';

@Injectable()
export class ExpenseRepository extends BaseRepository<HotelExpenseEntity> {
  constructor(prisma: PrismaService) {
    super(prisma, 'hotelExpense'); // Tabla del esquema de prisma
  }

  /**
   * Busca gastos por fecha
   * @param date Fecha del gasto (formato YYYY-MM-DD)
   * @returns Promise con array de gastos
   */
  async findByDate(date: string): Promise<HotelExpenseEntity[]> {
    // Busca gastos cuyo campo date comience con la fecha proporcionada
    const expenses = await this.prisma.hotelExpense.findMany({
      where: {
        date: {
          startsWith: date,
        },
      },
      orderBy: { createdAt: 'desc' }, // Ordenados por fecha de creación descendente
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
