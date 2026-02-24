import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService }     from '../../../core/services/user';
import { VehiculeService } from '../../../core/services/vehicule';
import { ZoneService }     from '../../../core/services/zone.service';
import { TourneeService }  from '../../../core/services/tournee';
import { CollecteService } from '../../../core/services/collecte.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {

  stats = { users: 0, vehicules: 0, zones: 0, tournees: 0 };
  tourneesRecentes: any[] = [];
  plaintes: any[] = [];
  loading = true;

  constructor(
    private userSvc: UserService,
    private vehiculeSvc: VehiculeService,
    private zoneSvc: ZoneService,
    private tourneeSvc: TourneeService,
    private collecteSvc: CollecteService,
  ) {}

  ngOnInit() {
    this.userSvc.getAll().subscribe({ next: r => this.stats.users = r.count ?? 0, error: () => {} });
    this.vehiculeSvc.getAll().subscribe({ next: r => this.stats.vehicules = r.count ?? 0, error: () => {} });
    this.zoneSvc.getAll().subscribe({ next: r => this.stats.zones = r.count ?? 0, error: () => {} });
    this.tourneeSvc.getAll().subscribe({
      next: r => {
        this.stats.tournees = r.count ?? 0;
        this.tourneesRecentes = (r.data ?? []).slice(0, 5);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
    this.collecteSvc.getPlaintes().subscribe({ next: r => this.plaintes = (r.data ?? []).slice(0, 5), error: () => {} });
  }

  statutClass(s: string) {
    if (s === 'Terminée')  return 'badge badge-success';
    if (s === 'En cours')  return 'badge badge-info';
    if (s === 'Planifiée') return 'badge badge-warning';
    return 'badge badge-neutral';
  }

  plainteClass(s: string) {
    if (s === 'Résolue')    return 'badge badge-success';
    if (s === 'En cours')   return 'badge badge-info';
    if (s === 'En attente') return 'badge badge-warning';
    return 'badge badge-neutral';
  }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
