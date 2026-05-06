import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

const BASE = '/api/decaissements';

@Injectable({ providedIn: 'root' })
export class DecaissementService {

  constructor(private http: HttpClient) {}

  /** Admin : créer un décaissement */
  create(data: { equipeId: string; mois: number; annee: number; montant: number; note?: string }): Observable<any> {
    return this.http.post<any>(BASE, data);
  }

  /** Admin : liste avec filtres optionnels */
  getAll(filters?: { mois?: number; annee?: number; statut?: string }): Observable<any> {
    let params = new HttpParams();
    if (filters?.mois)   params = params.set('mois',   filters.mois.toString());
    if (filters?.annee)  params = params.set('annee',  filters.annee.toString());
    if (filters?.statut) params = params.set('statut', filters.statut);
    return this.http.get<any>(BASE, { params });
  }

  /** Admin : changer le statut (En attente → Décaissé / Annulé) */
  updateStatut(id: string, statut: string, note?: string): Observable<any> {
    return this.http.put<any>(`${BASE}/${id}/statut`, { statut, note });
  }

  /** Agent : ses décaissements d'équipe */
  getMesPrimes(): Observable<any> {
    return this.http.get<any>(`${BASE}/mes-primes`);
  }
}
