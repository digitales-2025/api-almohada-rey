import { UserRolType } from '@prisma/client';

export const superAdminSeed = {
  name: 'Super Admin',
  email: 'admin@almohadarey.com',
  password: 'admin123',
  phone: '1234567890',
  mustChangePassword: false,
  userRol: UserRolType.ADMIN,
};
