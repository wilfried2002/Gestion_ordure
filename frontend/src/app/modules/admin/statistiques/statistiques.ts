import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CollecteService } from '../../../core/services/collecte.service';
import { TourneeService } from '../../../core/services/tournee';

@Component({
  selector: 'app-statistiques',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistiques.html',
  styleUrl: './statistiques.scss',
})
export class Statistiques implements OnInit {

  plaintes: any[]  = [];
  incidents: any[] = [];
  tournees: any[]  = [];
  loading = true;

  stats = {
    totalPlaintes: 0, plaintesResolues: 0, plaintesEnCours: 0, plaintesEnAttente: 0,
    totalIncidents: 0, incidentsGraves: 0,
    totalTournees: 0, tourneesTerminees: 0, tourneesEnCours: 0
  };

  constructor(
    private collecteSvc: CollecteService,
    private tourneeSvc: TourneeService,
  ) {}

  ngOnInit() {
    this.collecteSvc.getPlaintes().subscribe({
      next: r => {
        this.plaintes = r.data ?? r ?? [];
        this.stats.totalPlaintes    = this.plaintes.length;
        this.stats.plaintesResolues = this.plaintes.filter((p: any) => p.statut === 'Résolue').length;
        this.stats.plaintesEnCours  = this.plaintes.filter((p: any) => p.statut === 'En cours').length;
        this.stats.plaintesEnAttente = this.plaintes.filter((p: any) => p.statut === 'En attente').length;
      }, error: () => {}
    });

    this.collecteSvc.getIncidents().subscribe({
      next: r => {
        this.incidents = r.data ?? r ?? [];
        this.stats.totalIncidents  = this.incidents.length;
        this.stats.incidentsGraves = this.incidents.filter((i: any) => i.gravite === 'Grave' || i.gravite === 'Critique').length;
      }, error: () => {}
    });

    this.tourneeSvc.getAll().subscribe({
      next: r => {
        this.tournees = r.data ?? r ?? [];
        this.stats.totalTournees     = this.tournees.length;
        this.stats.tourneesTerminees = this.tournees.filter((t: any) => t.statut === 'Terminée').length;
        this.stats.tourneesEnCours   = this.tournees.filter((t: any) => t.statut === 'En cours').length;
        this.loading = false;
      }, error: () => { this.loading = false; }
    });
  }

  pct(val: number, total: number) {
    if (!total) return 0;
    return Math.round((val / total) * 100);
  }

  plainteClass(s: string) {
    if (s === 'Résolue')    return 'badge badge-success';
    if (s === 'En cours')   return 'badge badge-info';
    if (s === 'En attente') return 'badge badge-warning';
    return 'badge badge-neutral';
  }

  graviteClass(g: string) {
    if (g === 'Critique') return 'badge badge-danger';
    if (g === 'Grave')    return 'badge badge-warning';
    if (g === 'Modéré')   return 'badge badge-info';
    return 'badge badge-neutral';
  }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
