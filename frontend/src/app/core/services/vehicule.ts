import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const BASE = 'http://localhost:5000/api';

@Injectable({ providedIn: 'root' })
export class VehiculeService {
  constructor(private http: HttpClient) {}

  getAll()                       { return this.http.get<any>(`${BASE}/vehicules`); }
  getById(id: string)            { return this.http.get<any>(`${BASE}/vehicules/${id}`); }
  create(data: any)              { return this.http.post<any>(`${BASE}/vehicules`, data); }
  update(id: string, data: any)  { return this.http.put<any>(`${BASE}/vehicules/${id}`, data); }
  delete(id: string)             { return this.http.delete<any>(`${BASE}/vehicules/${id}`); }
}
