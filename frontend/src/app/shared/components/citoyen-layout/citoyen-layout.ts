import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-citoyen-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './citoyen-layout.html',
  styleUrl: './citoyen-layout.scss',
})
export class CitoyenLayout {

  sidebarOpen = signal(true);

  navItems = [
    { label: 'Mes signalements', icon: 'list',     route: '/citoyen/signalements' },
    { label: 'Nouveau signalement', icon: 'plus',  route: '/citoyen/nouveau'      },
    { label: 'Planning collecte',  icon: 'calendar', route: '/citoyen/planning'   },
  ];

  get currentUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : { name: 'Citoyen', role: 'CITOYEN' };
  }

  constructor(private auth: AuthService, private router: Router) {}

  toggleSidebar() { this.sidebarOpen.update(v => !v); }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  initials(name: string) {
    return (name ?? 'C').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  }
}
