import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './login.html',
  styleUrl:    './login.scss',
})
export class LoginComponent implements OnInit {

  email        = '';
  password     = '';
  loading      = false;
  errorMessage = '';

  private returnUrl = '';

  constructor(
    private auth:   AuthService,
    private router: Router,
    private route:  ActivatedRoute,
  ) {}

  ngOnInit() {
    // Si déjà connecté, rediriger directement sans afficher le formulaire
    const user = this.auth.getCurrentUser();
    if (user && this.auth.isLoggedIn()) {
      this.redirectByRole(user.role);
      return;
    }
    // Mémorise la page demandée avant l'arrivée sur /login
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] ?? '';
  }

  login() {
    this.loading      = true;
    this.errorMessage = '';

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (res: any) => {
        this.loading = false;
        const role   = res?.user?.role ?? '';
        // Retourner à la page protégée ou au tableau de bord par défaut
        if (this.returnUrl) {
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.redirectByRole(role);
        }
      },
      error: (err: any) => {
        this.loading      = false;
        this.errorMessage = err?.error?.message ?? 'Email ou mot de passe incorrect';
      },
    });
  }

  private redirectByRole(role: string) {
    if      (role === 'AGENT')   this.router.navigate(['/agent/dashboard']);
    else if (role === 'ADMIN')   this.router.navigate(['/admin/dashboard']);
    else if (role === 'CITOYEN') this.router.navigate(['/citoyen/signalements']);
    else                         this.router.navigate(['/login']);
  }
}
