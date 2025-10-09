import { applyDecorators, UseGuards } from '@nestjs/common';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { MustChangePasswordGuard } from '../guards/must-change-password-guards.guard';

export function Auth() {
  return applyDecorators(
    UseGuards(BetterAuthGuard),
    UseGuards(MustChangePasswordGuard),
  );
}
