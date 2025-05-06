import { ProductType } from '@prisma/client';

export type warehouseSeedData = {
  type: ProductType;
};

export const warehousesSeed = [
  {
    type: ProductType.COMMERCIAL,
  },
  {
    type: ProductType.INTERNAL_USE,
  },
];
