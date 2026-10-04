import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class VerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User identity could not be verified.');
    }
    if (user.isVerified === false) {
      throw new ForbiddenException(
        'Email verification is required to access this feature. Please verify your email or request a new verification link.',
      );
    }
    return true;
  }
}
