import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss'
})
export class AdminLayout {

  sidebarOpen = signal(true);

  navItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'grid',     route: '/admin/dashboard'    },
    { label: 'Utilisateurs',    icon: 'users',    route: '/admin/users'        },
    { label: 'Véhicules',       icon: 'truck',    route: '/admin/vehicules'    },
    { label: 'Zones',           icon: 'map',      route: '/admin/zones'        },
    { label: 'Équipes',         icon: 'team',     route: '/admin/equipes'      },
    { label: 'Tournées',        icon: 'calendar', route: '/admin/tournees'     },
    { label: 'Statistiques',    icon: 'chart',    route: '/admin/statistiques' },
  ];

  get currentUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : { name: 'Admin', role: 'ADMIN' };
  }

  constructor(private auth: AuthService, private router: Router) {}

  toggleSidebar() { this.sidebarOpen.update(v => !v); }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
