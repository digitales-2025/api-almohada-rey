import { ExpenseDocumentType, Movements, ProductType } from '@prisma/client';

export type MovementsData = Pick<
  Movements,
  'id' | 'codeUnique' | 'dateMovement' | 'type' | 'description'
> & {
  warehouse: { id: string; type: ProductType };
  typePurchaseOrder?: ExpenseDocumentType;
  documentNumber?: string;
  movementsDetail: MovementsDetailData[];
};

export type MovementsDetailData = {
  id: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  product: { id: string; name: string };
};

export type SummaryMovementsData = Pick<
  Movements,
  'id' | 'codeUnique' | 'dateMovement' | 'type' | 'description'
> & {
  typeProduct?: ProductType;
  warehouse: { id: string; type: ProductType };
  typePurchaseOrder?: ExpenseDocumentType;
  documentNumber?: string;
};
