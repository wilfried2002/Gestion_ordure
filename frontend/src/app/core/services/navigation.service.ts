import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const BASE = '/api/navigation';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  constructor(private http: HttpClient) {}

  /**
   * Calcule l'itinéraire optimal (Dijkstra + nearest-neighbor multi-stops).
   */
  calculerItineraire(payload: {
    position:   { lat: number; lng: number };
    criterium:  'distance' | 'temps' | 'priorite';
    niveauMin?: number;
    zoneId?:    string;
    tourneeId?: string;
  }): Observable<any> {
    return this.http.post<any>(`${BASE}/itineraire`, payload);
  }

  /**
   * Retourne le prochain bac à collecter et le chemin Dijkstra pour l'atteindre.
   */
  getProchainBac(payload: {
    position:          { lat: number; lng: number };
    tourneeId:         string;
    bacsDejaCollectes: string[];
  }): Observable<any> {
    return this.http.post<any>(`${BASE}/prochain-bac`, payload);
  }

  /**
   * Met à jour la position GPS du camion et reçoit une éventuelle alerte
   * de proximité bac.
   */
  mettreAJourPosition(payload: {
    vehiculeId: string;
    lat:        number;
    lng:        number;
    tourneeId:  string;
  }): Observable<any> {
    return this.http.post<any>(`${BASE}/position`, payload);
  }
}
