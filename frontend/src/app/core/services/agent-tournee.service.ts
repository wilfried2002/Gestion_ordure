import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const BASE = 'http://localhost:5000/api';

@Injectable({ providedIn: 'root' })
export class AgentTourneeService {
  constructor(private http: HttpClient) {}

  getMesTournees()              { return this.http.get<any>(`${BASE}/tournees/agent/mes-tournees`); }
  getTourneeById(id: string)    { return this.http.get<any>(`${BASE}/tournees/${id}`); }
  demarrer(id: string)          { return this.http.put<any>(`${BASE}/tournees/${id}/demarrer`, {}); }
  terminer(id: string)          { return this.http.put<any>(`${BASE}/tournees/${id}/terminer`, {}); }

  getPoints(tourneeId: string)  { return this.http.get<any>(`${BASE}/collectes/tournee/${tourneeId}`); }
  validerPoint(id: string, data: { volume?: number; commentaire?: string }) {
    return this.http.put<any>(`${BASE}/collectes/${id}/valider`, data);
  }

  signalerIncident(data: any)   { return this.http.post<any>(`${BASE}/incidents`, data); }
  getMesIncidents()             { return this.http.get<any>(`${BASE}/incidents/mes-incidents`); }
}
