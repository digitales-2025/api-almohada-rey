import { applyDecorators, UseGuards } from '@nestjs/common';
import { BetterAuthGuard } from '../guards/better-auth.guard';

export function BetterAuth() {
  return applyDecorators(UseGuards(BetterAuthGuard));
}
