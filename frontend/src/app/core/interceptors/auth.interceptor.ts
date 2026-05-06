import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError, TimeoutError, timeout } from 'rxjs';
import { HttpCacheService } from '../services/http-cache.service';

/** Délai max par requête : 10 s pour GET, 20 s pour mutations */
const TIMEOUT_MS = { GET: 10_000, default: 20_000 };

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const router     = inject(Router);
  const cache      = inject(HttpCacheService);
  const isBrowser  = isPlatformBrowser(platformId);

  // ── Injection du token ──────────────────────────────────────────
  const token = isBrowser ? localStorage.getItem('token') : null;
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  // ── Timeout automatique ─────────────────────────────────────────
  const delay = req.method === 'GET' ? TIMEOUT_MS.GET : TIMEOUT_MS.default;

  // ── Gestion des erreurs HTTP ────────────────────────────────────
  return next(req).pipe(
    timeout(delay),
    catchError((err: HttpErrorResponse | TimeoutError | unknown) => {
      // Timeout → erreur lisible pour les composants
      if (err instanceof TimeoutError) {
        return throwError(() => ({ status: 0, message: 'Request timeout' }));
      }
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401 && isBrowser) {
          // Token absent, expiré ou invalide → déconnexion propre
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Vider le cache pour ne pas exposer les données d'un autre utilisateur
          cache.clear();
          // Redirige vers /login en mémorisant la page cible
          const returnUrl = router.url;
          router.navigate(['/login'], {
            queryParams: returnUrl !== '/login' ? { returnUrl } : {},
          });
        }
      }
      return throwError(() => err);
    })
  );
};
