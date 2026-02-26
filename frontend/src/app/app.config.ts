import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

import { routes } from './app.routes';
import { authInterceptor }      from './core/interceptors/auth.interceptor';
import { httpCacheInterceptor } from './core/interceptors/http-cache.interceptor';

// Enregistrer la locale française pour les pipes date, number, currency…
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'fr' },
    provideRouter(routes, withPreloading(PreloadAllModules)),
    // Ordre : auth (injecte le token) → cache (lit/stocke la réponse)
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, httpCacheInterceptor])),
  ]
};
