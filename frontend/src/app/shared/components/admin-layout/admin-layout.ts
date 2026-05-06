import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService }   from '../../../core/services/auth';
import { SocketService } from '../../../core/services/socket.service';
import { ToastService }  from '../../../core/services/toast.service';

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
export class AdminLayout implements OnInit, OnDestroy {

  sidebarOpen       = signal(true);
  /** Nombre de nouvelles plaintes reçues depuis la dernière visite sur /admin/plaintes */
  plainteBadge      = signal(0);

  private sub: Subscription | null = null;

  navItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'grid',     route: '/admin/dashboard'    },
    { label: 'Utilisateurs',    icon: 'users',    route: '/admin/users'        },
    { label: 'Véhicules',       icon: 'truck',    route: '/admin/vehicules'    },
    { label: 'Zones',           icon: 'map',      route: '/admin/zones'        },
    { label: 'Équipes',         icon: 'team',     route: '/admin/equipes'      },
    { label: 'Tournées',        icon: 'calendar',  route: '/admin/tournees'     },
    { label: 'Plaintes',        icon: 'clipboard', route: '/admin/plaintes'     },
    { label: 'Incidents',       icon: 'bell',      route: '/admin/incidents'    },
    { label: 'Statistiques',      icon: 'chart',     route: '/admin/statistiques' },
    { label: 'Bacs à ordures',    icon: 'trash-bin', route: '/admin/bacs'         },
    { label: 'Carte de la ville', icon: 'city-map',  route: '/admin/carte'        },
    { label: 'Primes & Perf.',    icon: 'trophy',    route: '/admin/primes'       },
  ];

  get currentUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : { name: 'Admin', role: 'ADMIN' };
  }

  constructor(
    private auth:   AuthService,
    private router: Router,
    private socket: SocketService,
    private toast:  ToastService,
  ) {}

  ngOnInit() {
    // Connexion Socket.io et écoute des nouvelles plaintes
    this.socket.connect();
    this.sub = this.socket.nouvellePlainte$.subscribe(plainte => {
      this.plainteBadge.update(n => n + 1);
      this.toast.show('info', 'Nouveau signalement', `Type : ${plainte.type}`, 6000);
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.socket.disconnect();
  }

  clearPlainteBadge() { this.plainteBadge.set(0); }

  toggleSidebar() { this.sidebarOpen.update(v => !v); }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
