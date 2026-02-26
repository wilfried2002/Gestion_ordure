import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const BASE = 'http://localhost:5000/api';

@Injectable({ providedIn: 'root' })
export class ZoneService {
  constructor(private http: HttpClient) {}

  getAll()                       { return this.http.get<any>(`${BASE}/zones`); }
  getById(id: string)            { return this.http.get<any>(`${BASE}/zones/${id}`); }
  create(data: any)              { return this.http.post<any>(`${BASE}/zones`, data); }
  update(id: string, data: any)  { return this.http.put<any>(`${BASE}/zones/${id}`, data); }
  delete(id: string)             { return this.http.delete<any>(`${BASE}/zones/${id}`); }

  /** Retourne les arrondissements de la ville de l'admin connecté */
  getArrondissements()           { return this.http.get<any>(`${BASE}/zones/arrondissements`); }
  /** Crée toutes les zones manquantes pour la ville de l'admin */
  bulkCreate()                   { return this.http.post<any>(`${BASE}/zones/bulk`, {}); }

  getQuartiers()                       { return this.http.get<any>(`${BASE}/quartiers`); }
  createQuartier(data: any)            { return this.http.post<any>(`${BASE}/quartiers`, data); }
  updateQuartier(id: string, data: any){ return this.http.put<any>(`${BASE}/quartiers/${id}`, data); }
  deleteQuartier(id: string)           { return this.http.delete<any>(`${BASE}/quartiers/${id}`); }
}
