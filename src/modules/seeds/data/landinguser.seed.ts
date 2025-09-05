import { UserRolType } from '@prisma/client';
import { generalEnvs } from 'src/config';

export const landingDefaultUserSeed = {
  name: 'Landing',
  email: 'landing@almohadarey.com',
  password: generalEnvs.SEED_LANDING_PASSWORD,
  phone: '+51958959958',
  mustChangePassword: false,
  userRol: UserRolType.ADMIN,
};
