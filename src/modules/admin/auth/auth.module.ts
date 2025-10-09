import { Module, forwardRef, Global } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BetterAuthAdapter } from './better-auth.adapter';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { BetterAuthGuard } from './guards/better-auth.guard';
import { UserRolGuard } from './guards/user-rol.guard';
import { MustChangePasswordGuard } from './guards/must-change-password-guards.guard';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    BetterAuthAdapter,
    RefreshAuthGuard,
    BetterAuthGuard,
    UserRolGuard,
    MustChangePasswordGuard,
  ],
  imports: [ConfigModule, forwardRef(() => UsersModule), PrismaModule],
  exports: [
    BetterAuthAdapter,
    BetterAuthGuard,
    UserRolGuard,
    MustChangePasswordGuard,
  ],
})
export class AuthModule {}
