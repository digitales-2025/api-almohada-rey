import { UserRolType } from '@prisma/client';
import { generalEnvs } from 'src/config';

export const landingDefaultUserSeed = {
  name: 'Landing',
  email: 'landing@user.com',
  password: generalEnvs.SEED_LANDING_PASSWORD,
  phone: '0987654321',
  mustChangePassword: false,
  userRol: UserRolType.ADMIN,
};
