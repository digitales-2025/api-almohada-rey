import { WarehouseType } from '@prisma/client';

export type warehouseSeedData = {
  type: WarehouseType;
  code: string;
};

export const warehousesSeed = [
  {
    type: WarehouseType.COMMERCIAL,
    code: 'ALM-COM-001',
  },
  {
    type: WarehouseType.INTERNAL_USE,
    code: 'ALM-INT-001',
  },
  {
    type: WarehouseType.DEPOSIT,
    code: 'ALM-DEP-001',
  },
];
