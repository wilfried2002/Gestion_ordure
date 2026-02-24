import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent {

  name      = '';
  email     = '';
  password  = '';
  confirm   = '';
  loading   = false;
  errorMsg  = '';
  successMsg = '';
  showPass  = false;

  constructor(private auth: AuthService, private router: Router) {}

  register() {
    this.errorMsg = '';
    if (!this.name.trim())                     { this.errorMsg = 'Le nom est requis.'; return; }
    if (!this.email.trim())                    { this.errorMsg = 'L\'email est requis.'; return; }
    if (this.password.length < 6)              { this.errorMsg = 'Le mot de passe doit contenir au moins 6 caractères.'; return; }
    if (this.password !== this.confirm)        { this.errorMsg = 'Les mots de passe ne correspondent pas.'; return; }

    this.loading = true;
    this.auth.register({ name: this.name, email: this.email, password: this.password, role: 'CITOYEN' })
      .subscribe({
        next: () => {
          this.loading    = false;
          this.successMsg = 'Compte créé avec succès ! Redirection vers la connexion…';
          setTimeout(() => this.router.navigate(['/login']), 2000);
        },
        error: err => {
          this.loading  = false;
          this.errorMsg = err?.error?.message || 'Erreur lors de la création du compte.';
        }
      });
  }
}
