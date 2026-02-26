import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpResponse } from '@angular/common/http';

interface CacheEntry {
  response: HttpResponse<any>;
  cachedAt:  number;
}

@Injectable({ providedIn: 'root' })
export class HttpCacheService {

  private readonly store = new Map<string, CacheEntry>();

  /** Durée (ms) pendant laquelle la donnée est fraîche — pas de revalidation */
  readonly FRESH_TTL = 60_000;    // 60 s

  /** Durée (ms) maximale — au-delà la donnée est supprimée du cache */
  readonly MAX_TTL   = 300_000;   // 5 min

  private readonly platformId = inject(PLATFORM_ID);

  /** Retourne l'ID de l'utilisateur connecté pour isoler le cache entre admins */
  getUserId(): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    try   { return JSON.parse(localStorage.getItem('user') ?? '{}')._id ?? ''; }
    catch { return ''; }
  }

  get(key: string): HttpResponse<any> | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > this.MAX_TTL) {
      this.store.delete(key);
      return null;
    }
    return entry.response;
  }

  /** Vrai si la donnée est présente mais dépasse FRESH_TTL → stale-while-revalidate */
  isStale(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return true;
    return Date.now() - entry.cachedAt > this.FRESH_TTL;
  }

  set(key: string, response: HttpResponse<any>): void {
    this.store.set(key, { response, cachedAt: Date.now() });
  }

  /** Invalide toutes les entrées dont la clé contient le préfixe donné */
  invalidate(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.includes(prefix)) this.store.delete(key);
    }
  }

  clear(): void { this.store.clear(); }
}
