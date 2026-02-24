import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-agent-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './agent-layout.html',
  styleUrl: './agent-layout.scss',
})
export class AgentLayout {
  sidebarOpen = signal(true);

  navItems = [
    { label: 'Mon planning',  icon: 'calendar', route: '/agent/dashboard'  },
    { label: 'Ma tournée',    icon: 'truck',    route: '/agent/tournee'    },
    { label: 'Incidents',     icon: 'alert',    route: '/agent/incidents'  },
  ];

  get currentUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : { name: 'Agent', role: 'AGENT' };
  }

  constructor(private auth: AuthService, private router: Router) {}

  toggleSidebar() { this.sidebarOpen.update(v => !v); }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  initials(name: string) {
    return (name ?? 'A').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  }
}
