import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const BASE = 'http://localhost:5000/api';

@Injectable({ providedIn: 'root' })
export class EquipeService {
  constructor(private http: HttpClient) {}

  getAll()                                 { return this.http.get<any>(`${BASE}/equipes`); }
  getById(id: string)                      { return this.http.get<any>(`${BASE}/equipes/${id}`); }
  create(data: any)                        { return this.http.post<any>(`${BASE}/equipes`, data); }
  update(id: string, data: any)            { return this.http.put<any>(`${BASE}/equipes/${id}`, data); }
  delete(id: string)                       { return this.http.delete<any>(`${BASE}/equipes/${id}`); }
  addMembre(id: string, userId: string)    { return this.http.post<any>(`${BASE}/equipes/${id}/membres`, { userId }); }
  removeMembre(id: string, userId: string) { return this.http.delete<any>(`${BASE}/equipes/${id}/membres/${userId}`); }
}
