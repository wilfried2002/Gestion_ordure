import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {

  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.loading = true;
    this.errorMessage = '';

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (res: any) => {
        this.loading = false;
        const role = res?.user?.role ?? '';
        if (role === 'AGENT')         { this.router.navigate(['/agent/dashboard']);   }
        else if (role === 'ADMIN')    { this.router.navigate(['/admin/dashboard']);   }
        else if (role === 'CITOYEN')  { this.router.navigate(['/citoyen/signalements']); }
        else                          { this.router.navigate(['/login']);              }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Email ou mot de passe incorrect';
      }
    });
  }
}
