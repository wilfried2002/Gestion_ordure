import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const BASE = '/api';

@Injectable({ providedIn: 'root' })
export class CitoyenService {
  constructor(private http: HttpClient) {}

  getMesPlaintes()              { return this.http.get<any>(`${BASE}/plaintes/mes-plaintes`); }
  /** Accepte FormData (multipart) pour inclure les photos */
  createPlainte(data: FormData) { return this.http.post<any>(`${BASE}/plaintes`, data); }

  getZones()                 { return this.http.get<any>(`${BASE}/zones`); }
  getTournees()              { return this.http.get<any>(`${BASE}/tournees`); }
}
