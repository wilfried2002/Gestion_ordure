import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const BASE = '/api';

@Injectable({ providedIn: 'root' })
export class StatsService {
  constructor(private http: HttpClient) {}
  getDashboard()  { return this.http.get<any>(`${BASE}/stats/dashboard`); }
  getAnalytics()  { return this.http.get<any>(`${BASE}/stats/analytics`); }
}
