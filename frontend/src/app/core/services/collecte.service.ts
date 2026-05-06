import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const BASE = '/api';

@Injectable({ providedIn: 'root' })
export class CollecteService {
  constructor(private http: HttpClient) {}

  getAll()   { return this.http.get<any>(`${BASE}/collectes`); }
  getById(id: string) { return this.http.get<any>(`${BASE}/collectes/${id}`); }
  getByTournee(tourneeId: string) { return this.http.get<any>(`${BASE}/collectes/tournee/${tourneeId}`); }

  getPlaintes()  { return this.http.get<any>(`${BASE}/plaintes`); }
  getIncidents() { return this.http.get<any>(`${BASE}/incidents`); }
}
