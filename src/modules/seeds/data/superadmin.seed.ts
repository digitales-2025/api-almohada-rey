import { UserRolType } from '@prisma/client';

export const superAdminSeed = {
  name: 'Super Admin',
  email: 'admin@admin.com',
  password: 'admin',
  phone: '1234567890',
  mustChangePassword: false,
  userRol: UserRolType.ADMIN,
};
