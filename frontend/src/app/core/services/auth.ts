import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private baseUrl = 'http://localhost:5000/api/auth';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  login(data: any) {
    return this.http.post(`${this.baseUrl}/login`, data).pipe(
      tap((res: any) => {
        if (this.isBrowser) {
          localStorage.setItem('token',  res.token);
          localStorage.setItem('user',   JSON.stringify(res.user));
        }
      })
    );
  }

  register(data: any) {
    return this.http.post(`${this.baseUrl}/register`, data);
  }

  logout() {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem('token') : null;
  }

  getCurrentUser(): any {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem('user');
    try { return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
