import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const BASE = '/api';

@Injectable({ providedIn: 'root' })
export class TourneeService {
  constructor(private http: HttpClient) {}

  getAll()                       { return this.http.get<any>(`${BASE}/tournees`); }
  getById(id: string)            { return this.http.get<any>(`${BASE}/tournees/${id}`); }
  create(data: any)              { return this.http.post<any>(`${BASE}/tournees`, data); }
  update(id: string, data: any)  { return this.http.put<any>(`${BASE}/tournees/${id}`, data); }
  delete(id: string)             { return this.http.delete<any>(`${BASE}/tournees/${id}`); }
}
