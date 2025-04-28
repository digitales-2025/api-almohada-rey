import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  HotelExpense,
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseDocumentType,
} from '@prisma/client';

export class HotelExpenseEntity implements HotelExpense {
  @ApiProperty()
  id: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  category: ExpenseCategory;

  @ApiProperty()
  paymentMethod: ExpensePaymentMethod;

  @ApiProperty()
  amount: string; // O simplemente number si no necesitas la precisión exacta de Decimal en la entidad

  @ApiProperty()
  date: string; // Cambiado de String a Date para representar mejor la fecha/hora

  @ApiPropertyOptional()
  documentType: ExpenseDocumentType | null; // Prisma usa null para opcionales

  @ApiPropertyOptional()
  documentNumber: string | null; // Prisma usa null para opcionales

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<HotelExpenseEntity>) {
    Object.assign(this, partial);
    // Asegurarse de que amount sea un número si se pasa como Decimal
    if (
      partial.amount &&
      typeof partial.amount !== 'number' &&
      typeof partial.amount !== 'string'
    ) {
      this.amount = (partial.amount as any).toNumber(); // Convert Decimal to number
    }
  }
}
