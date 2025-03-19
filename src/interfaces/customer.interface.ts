import { Customer } from '@prisma/client';

export type CustomerData = Pick<
  Customer,
  | 'id'
  | 'name'
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
  city?: string;
  companyName?: string;
  ruc?: string;
  companyAddress?: string;
};
