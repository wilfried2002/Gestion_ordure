import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { filter, of, take, tap } from 'rxjs';
import { HttpCacheService } from '../services/http-cache.service';

/**
 * Intercepteur de cache HTTP – Stale-While-Revalidate
 *
 * Comportement :
 *  - GET + donnée FRAÎCHE  → réponse immédiate depuis le cache (aucun spinner)
 *  - GET + donnée PÉRIMÉE  → réponse immédiate depuis le cache
 *                            + rafraîchissement silencieux en arrière-plan
 *  - GET + aucun cache     → requête HTTP normale + mise en cache de la réponse
 *  - POST / PUT / DELETE   → requête normale + invalidation du cache du même endpoint
 *
 * Résultat UX :
 *  Première visite  → "Chargement…" s'affiche brièvement (durée réseau)
 *  Visites suivantes → données affichées instantanément, spinner invisible
 */
export const httpCacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Pas de cache côté serveur (SSR)
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return next(req);

  const cache = inject(HttpCacheService);
  const url   = req.url;

  // ── Mutations : invalider le cache du même endpoint + stats ──────────────
  if (req.method !== 'GET') {
    const prefix = apiPrefix(url);
    if (prefix) {
      cache.invalidate(prefix);
      cache.invalidate('/api/stats'); // le dashboard agrège toutes les données
    }
    return next(req);
  }

  // ── Endpoints à ne jamais mettre en cache ─────────────────────────────────
  if (!url.includes('/api/') || url.includes('/auth/')) return next(req);

  // Clé de cache unique par utilisateur (isole admin A de admin B)
  const cacheKey = `${url}::${cache.getUserId()}`;
  const cached   = cache.get(cacheKey);

  if (cached) {
    // Donnée périmée → rafraîchissement silencieux en arrière-plan
    if (cache.isStale(cacheKey)) {
      next(req).pipe(
        filter((e): e is HttpResponse<any> => e instanceof HttpResponse),
        take(1),
        tap(fresh => cache.set(cacheKey, fresh)),
      ).subscribe({ error: () => {} }); // erreur réseau ignorée silencieusement
    }
    // Retourner le cache immédiatement → finalize() déclenche loading = false sans délai
    return of(cached);
  }

  // ── Aucun cache : requête réelle + mise en cache ──────────────────────────
  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse) cache.set(cacheKey, event);
    }),
  );
};

/** Extrait le préfixe API : '/api/zones/123' → '/api/zones' */
function apiPrefix(url: string): string | null {
  const m = url.match(/\/api\/[^/?]+/);
  return m ? m[0] : null;
}
