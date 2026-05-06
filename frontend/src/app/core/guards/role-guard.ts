import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router     = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // SSR : les routes protégées ont RenderMode.Client → jamais atteint côté serveur.
  if (!isPlatformBrowser(platformId)) return true;

  const userStr = localStorage.getItem('user');
  if (!userStr) { router.navigate(['/login']); return false; }

  const user = JSON.parse(userStr);
  const allowedRoles: string[] = route.data['roles'] ?? [];
  if (allowedRoles.length === 0 || allowedRoles.includes(user.role)) return true;

  router.navigate(['/login']);
  return false;
};
