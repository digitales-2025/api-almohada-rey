import { ProductType, Warehouse } from '@prisma/client';

export type WarehouseData = Pick<Warehouse, 'id' | 'type'> & {
  stock: {
    id: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    product: {
      id: string;
      name: string;
      type: ProductType;
    };
  }[];
};

export type SummaryWarehouseData = Pick<Warehouse, 'id' | 'type'> & {
  quantityProducts: number;
  totalCost: number;
};
