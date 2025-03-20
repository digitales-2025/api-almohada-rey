import { Customer } from '@prisma/client';

export type CustomerData = Pick<
  Customer,
  | 'id'
  | 'name'
  | 'address'
  | 'birthPlace'
  | 'country'
  | 'phone'
  | 'occupation'
  | 'documentType'
  | 'documentNumber'
  | 'email'
  | 'maritalStatus'
  | 'isActive'
> & {
  department?: string;
  province?: string;
  companyName?: string;
  ruc?: string;
  companyAddress?: string;
};
