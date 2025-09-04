import { User } from '@prisma/client';

export type UserPayload = Pick<
  User,
  | 'id'
  | 'name'
  | 'email'
  | 'isActive'
  | 'phone'
  | 'mustChangePassword'
  | 'lastLogin'
  | 'isSuperAdmin'
  | 'userRol'
>;

export type UserData = Omit<
  UserPayload,
  'isActive' | 'mustChangePassword' | 'lastLogin'
>;

export type UserDataWithPassword = Omit<UserPayload, 'isActive' | 'lastLogin'>;

export type UserDataLogin = Pick<
  UserPayload,
  'id' | 'name' | 'email' | 'phone' | 'userRol'
> & {
  token: string;
};
