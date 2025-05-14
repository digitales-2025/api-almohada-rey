import { ProductType } from '@prisma/client';

export type warehouseSeedData = {
  type: ProductType;
  code: string;
};

export const warehousesSeed = [
  {
    type: ProductType.COMMERCIAL,
    code: 'ALM-COM-001',
  },
  {
    type: ProductType.INTERNAL_USE,
    code: 'ALM-INT-001',
  },
];
