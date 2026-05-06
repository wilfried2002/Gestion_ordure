import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const BASE = '/api';

@Injectable({ providedIn: 'root' })
export class PlainteService {
  constructor(private http: HttpClient) {}

  getAll()                      { return this.http.get<any>(`${BASE}/plaintes`); }
  getById(id: string)           { return this.http.get<any>(`${BASE}/plaintes/${id}`); }
  update(id: string, data: any) { return this.http.put<any>(`${BASE}/plaintes/${id}`, data); }
  delete(id: string)            { return this.http.delete<any>(`${BASE}/plaintes/${id}`); }
}
