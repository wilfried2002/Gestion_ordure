import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const router     = inject(Router);
  const isBrowser  = isPlatformBrowser(platformId);

  // ── Injection du token ──────────────────────────────────────────
  const token = isBrowser ? localStorage.getItem('token') : null;
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  // ── Gestion des erreurs HTTP ────────────────────────────────────
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && isBrowser) {
        // Token absent, expiré ou invalide → déconnexion propre
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirige vers /login en mémorisant la page cible
        const returnUrl = router.url;
        router.navigate(['/login'], {
          queryParams: returnUrl !== '/login' ? { returnUrl } : {},
        });
      }
      return throwError(() => err);
    })
  );
};
