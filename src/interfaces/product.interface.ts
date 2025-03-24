import { Product } from '@prisma/client';

export type ProductData = Pick<
  Product,
  'id' | 'name' | 'unitCost' | 'type' | 'isActive'
>;
