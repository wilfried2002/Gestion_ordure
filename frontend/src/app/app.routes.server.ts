import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  /**
   * Pages publiques : rendues côté serveur (pas d'auth, données statiques)
   */
  { path: 'login',    renderMode: RenderMode.Server },
  { path: 'register', renderMode: RenderMode.Server },

  /**
   * Routes protégées → rendu côté CLIENT uniquement (RenderMode.Client)
   *
   * Pourquoi ? Les guards utilisent localStorage (indisponible en SSR).
   * isPlatformBrowser() retourne false → guard retourne false →
   * Angular annule la navigation → Angular SSR renvoie null →
   * Express répond "Cannot GET /route" = l'erreur de refresh.
   *
   * Avec RenderMode.Client : le serveur renvoie directement index.html,
   * le navigateur gère le routing Angular côté client (comportement SPA).
   */
  { path: 'admin/**',   renderMode: RenderMode.Client },
  { path: 'agent/**',   renderMode: RenderMode.Client },
  { path: 'citoyen/**', renderMode: RenderMode.Client },

  // Fallback : toute route non listée → CSR
  { path: '**', renderMode: RenderMode.Client },
];
