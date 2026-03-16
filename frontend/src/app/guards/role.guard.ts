import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export function roleGuard(...requiredRoles: string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const userRoles = authService.roles();
    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (hasRole) {
      return true;
    }

    router.navigate(['/employee/submit']);
    return false;
  };
}
