import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

const BASE = '/api/performances';

@Injectable({ providedIn: 'root' })
export class PerformanceService {

  constructor(private http: HttpClient) {}

  /** Performances mensuelles de toutes les équipes */
  getPerformances(mois?: number, annee?: number): Observable<any> {
    let params = new HttpParams();
    if (mois)  params = params.set('mois',  mois.toString());
    if (annee) params = params.set('annee', annee.toString());
    return this.http.get<any>(BASE, { params });
  }

  /** Configuration des taux de primes */
  getConfig(): Observable<any> {
    return this.http.get<any>(`${BASE}/config`);
  }

  /** Mise à jour des taux de primes */
  updateConfig(data: { primeParTournee: number; primeParCollecte: number }): Observable<any> {
    return this.http.put<any>(`${BASE}/config`, data);
  }
}
