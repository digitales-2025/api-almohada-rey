import { UserRolType } from '@prisma/client';

export const superAdminSeed = {
  name: 'Super Admin',
  email: 'admin@almohadarey.com',
  password: 'Almohada2025!1',
  phone: '+51958959958',
  mustChangePassword: false,
  userRol: UserRolType.ADMIN,
};
