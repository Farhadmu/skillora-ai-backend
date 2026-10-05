import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '../enums/roles.enum';

@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User identity not authenticated.');
    }

    // Admins have overarching administrative authorization
    if (user.role === Role.ADMIN) {
      return true;
    }

    const params = request.params;
    const body = request.body;

    // Check userId in route parameters or body
    const targetUserId = params.userId || params.id || body?.userId;

    if (targetUserId && targetUserId !== user.id && targetUserId !== user.userId) {
      // Allow employers/educators to view public profiles/submissions if reading
      if (request.method === 'GET') {
        return true;
      }
      throw new ForbiddenException('Access denied: You are not authorized to modify this resource.');
    }

    return true;
  }
}
