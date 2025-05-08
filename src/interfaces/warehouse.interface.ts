import { ProductType, Warehouse } from '@prisma/client';

export type WarehouseData = Pick<Warehouse, 'id' | 'code' | 'type'> & {
  stock: StockData[];
};

export type SummaryWarehouseData = Pick<Warehouse, 'id' | 'code' | 'type'> & {
  quantityProducts: number;
  totalCost: number;
};

export type StockData = {
  id: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  product: {
    id: string;
    name: string;
    code?: string;
    type: ProductType;
    unitCost?: number;
  };
};
