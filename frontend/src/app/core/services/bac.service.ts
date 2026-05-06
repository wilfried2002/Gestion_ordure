import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

const BASE = '/api/bacs';

@Injectable({ providedIn: 'root' })
export class BacService {

  constructor(private http: HttpClient) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  getAll(filters?: { zoneId?: string; statut?: string }): Observable<any> {
    let params = new HttpParams();
    if (filters?.zoneId)  params = params.set('zoneId',  filters.zoneId);
    if (filters?.statut)  params = params.set('statut',  filters.statut);
    return this.http.get<any>(BASE, { params });
  }

  getById(id: string): Observable<any> {
    return this.http.get<any>(`${BASE}/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post<any>(BASE, data);
  }

  update(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${BASE}/${id}`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${BASE}/${id}`);
  }

  updateNiveau(id: string, niveauRemplissage: number): Observable<any> {
    return this.http.patch<any>(`${BASE}/${id}/niveau`, { niveauRemplissage });
  }

  // ── Optimisation de tournée (TSP) ─────────────────────────────────────────

  optimiserTournee(options: { niveauMin?: number; zoneId?: string; bacIds?: string[] }): Observable<any> {
    return this.http.post<any>(`${BASE}/tournee-optimisee`, options);
  }

  // ── Stats pour le dashboard carte ─────────────────────────────────────────

  getStats(): Observable<any> {
    return this.http.get<any>(`${BASE}/stats`);
  }
}
