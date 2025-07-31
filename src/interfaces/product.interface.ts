import { Product } from '@prisma/client';

export type ProductData = Pick<
  Product,
  'id' | 'code' | 'name' | 'unitCost' | 'type' | 'isActive'
>;
