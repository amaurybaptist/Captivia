import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/** Run after JwtAuthGuard: its user comes freshly from the database, not JWT claims. */
@Injectable()
export class PremiumGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { isPremium?: boolean } }>();
    if (request.user?.isPremium !== true) {
      throw new ForbiddenException({
        code: 'PREMIUM_REQUIRED',
        message: 'Le concepteur d’habitat est réservé aux membres Premium.',
      });
    }
    return true;
  }
}
