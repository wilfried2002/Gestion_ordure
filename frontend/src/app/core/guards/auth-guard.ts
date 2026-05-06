import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

export const authGuard: CanActivateFn = (_route, state: RouterStateSnapshot) => {
  const router     = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // SSR : les routes protégées ont RenderMode.Client → ce guard ne s'exécute
  // jamais côté serveur pour ces routes. Retourner true ici est un filet de
  // sécurité uniquement (jamais atteint en usage normal).
  if (!isPlatformBrowser(platformId)) return true;

  const token = localStorage.getItem('token');
  if (token) return true;

  // Mémorise la page demandée pour y revenir après la connexion
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
