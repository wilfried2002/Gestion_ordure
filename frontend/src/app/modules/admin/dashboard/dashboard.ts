import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { StatsService }       from '../../../core/services/stats.service';
import { AuthService }        from '../../../core/services/auth';
import { PerformanceService } from '../../../core/services/performance.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {

  loading = true;
  stats: any = {
    users:     { total: 0, ADMIN: 0, AGENT: 0, CITOYEN: 0 },
    vehicules: { total: 0, Disponible: 0, 'En service': 0, 'En maintenance': 0, 'Hors service': 0 },
    zones:     0,
    tournees:  { total: 0, Planifiée: 0, 'En cours': 0, Terminée: 0, Annulée: 0 },
    plaintesPendantes: 0,
    tourneesRecentes:  [],
    plaintesRecentes:  [],
  };

  currentUser: any = null;
  today = new Date();

  // ── Performances du mois ─────────────────────────────────────────────────
  perfLoading    = false;
  topEquipes:    any[]  = [];   // top 3 pour le widget dashboard
  meilleureEquipe: any  = null;
  montantTotalPrimes    = 0;

  constructor(
    private statsSvc: StatsService,
    private authSvc:  AuthService,
    private perfSvc:  PerformanceService,
  ) {}

  ngOnInit() {
    this.currentUser = this.authSvc.getCurrentUser();
    this.load();
    this.loadPerformances();
  }

  load() {
    this.loading = true;
    this.statsSvc.getDashboard().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: r => { if (r?.data) this.stats = r.data; },
      error: () => {}
    });
  }

  loadPerformances() {
    this.perfLoading = true;
    this.perfSvc.getPerformances().pipe(
      finalize(() => this.perfLoading = false)
    ).subscribe({
      next: r => {
        const d = r?.data ?? {};
        const perfs: any[] = d.performances ?? [];
        this.topEquipes        = perfs.slice(0, 3);
        this.meilleureEquipe   = perfs.find((p: any) => p.rang === 1 && p.score > 0) ?? null;
        this.montantTotalPrimes = d.totaux?.montantTotal ?? 0;
      },
      error: () => {}
    });
  }

  get ville(): string { return this.currentUser?.ville ?? 'Douala'; }

  get vehiculeDispoPercent(): number {
    if (!this.stats.vehicules.total) return 0;
    return Math.round((this.stats.vehicules.Disponible / this.stats.vehicules.total) * 100);
  }

  get tourneesActives(): number {
    return (this.stats.tournees['En cours'] ?? 0) + (this.stats.tournees.Planifiée ?? 0);
  }

  statutClass(s: string) {
    if (s === 'Terminée')  return 'badge badge-success';
    if (s === 'En cours')  return 'badge badge-info';
    if (s === 'Planifiée') return 'badge badge-warning';
    if (s === 'Annulée')   return 'badge badge-danger';
    return 'badge badge-neutral';
  }

  plainteClass(s: string) {
    if (s === 'Résolue')    return 'badge badge-success';
    if (s === 'En cours')   return 'badge badge-info';
    if (s === 'En attente') return 'badge badge-warning';
    return 'badge badge-neutral';
  }

  plainteIcon(type: string): string {
    const icons: Record<string, string> = {
      'Ordures non collectées':     '🗑️',
      'Dépôt sauvage':              '⚠️',
      'Bac plein ou débordant':     '📦',
      'Bac cassé ou manquant':      '🔧',
      'Mauvaise odeur persistante': '💨',
      'Autre problème':             '❓',
    };
    return icons[type] ?? '📋';
  }

  formatDate(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
