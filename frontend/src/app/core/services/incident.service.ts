import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const BASE = '/api';

@Injectable({ providedIn: 'root' })
export class IncidentService {
  constructor(private http: HttpClient) {}

  getAll()                      { return this.http.get<any>(`${BASE}/incidents`); }
  update(id: string, data: any) { return this.http.put<any>(`${BASE}/incidents/${id}`, data); }
  delete(id: string)            { return this.http.delete<any>(`${BASE}/incidents/${id}`); }
}
