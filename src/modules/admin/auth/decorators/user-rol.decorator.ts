import { SetMetadata } from '@nestjs/common';
import { UserRolType } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const UserRol = (...roles: UserRolType[]) =>
  SetMetadata(ROLES_KEY, roles);
