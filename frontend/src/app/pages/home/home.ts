import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent implements OnInit {

  // Connexion
  email        = '';
  password     = '';
  loading      = false;
  errorMsg     = '';
  showPassword = false;

  // Accordéon
  aboutOpen = false;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    if (this.auth.isLoggedIn()) this.redirectByRole();
  }

  onLogin() {
    if (!this.email || !this.password) { this.errorMsg = 'Veuillez remplir tous les champs.'; return; }
    this.loading  = true;
    this.errorMsg = '';
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next:  () => { this.loading = false; this.redirectByRole(); },
      error: (e: any) => { this.loading = false; this.errorMsg = e?.error?.message ?? 'Identifiants incorrects.'; },
    });
  }

  private redirectByRole() {
    const user = this.auth.getCurrentUser();
    const map: Record<string, string> = {
      ADMIN:   '/admin/dashboard',
      AGENT:   '/agent/dashboard',
      CITOYEN: '/citoyen/signalements',
    };
    this.router.navigate([map[user?.role] ?? '/login']);
  }
}
