import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const BASE = 'http://localhost:5000/api';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) {}

  getAll()                       { return this.http.get<any>(`${BASE}/users`); }
  getById(id: string)            { return this.http.get<any>(`${BASE}/users/${id}`); }
  create(data: any)              { return this.http.post<any>(`${BASE}/users`, data); }
  update(id: string, data: any)  { return this.http.put<any>(`${BASE}/users/${id}`, data); }
  delete(id: string)             { return this.http.delete<any>(`${BASE}/users/${id}`); }
}
