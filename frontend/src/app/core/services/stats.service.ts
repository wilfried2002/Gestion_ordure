import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const BASE = 'http://localhost:5000/api';

@Injectable({ providedIn: 'root' })
export class StatsService {
  constructor(private http: HttpClient) {}
  getDashboard() { return this.http.get<any>(`${BASE}/stats/dashboard`); }
}
