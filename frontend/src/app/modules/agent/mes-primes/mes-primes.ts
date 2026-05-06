import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { DecaissementService } from '../../../core/services/decaissement.service';
import { PerformanceService }  from '../../../core/services/performance.service';
import { AuthService }         from '../../../core/services/auth';

@Component({
  selector: 'app-mes-primes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mes-primes.html',
  styleUrl: './mes-primes.scss',
})
export class MesPrimes implements OnInit {

  loading          = false;
  loadingPerf      = false;
  decaissements:   any[] = [];
  monEquipe:       any   = null;
  maPerformance:   any   = null;
  currentUser:     any   = null;

  mois  = new Date().getMonth() + 1;
  annee = new Date().getFullYear();

  moisNoms = ['', 'Janvier','Février','Mars','Avril','Mai','Juin',
               'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  constructor(
    private decSvc:  DecaissementService,
    private perfSvc: PerformanceService,
    private authSvc: AuthService,
  ) {}

  ngOnInit() {
    this.currentUser = this.authSvc.getCurrentUser();
    this.loadAll();
  }

  loadAll() {
    this.loadDecaissements();
    this.loadPerformance();
  }

  loadDecaissements() {
    this.loading = true;
    this.decSvc.getMesPrimes().pipe(finalize(() => this.loading = false)).subscribe({
      next: r => { this.decaissements = r?.data ?? []; },
      error: () => {}
    });
  }

  loadPerformance() {
    this.loadingPerf = true;
    this.perfSvc.getPerformances(this.mois, this.annee).pipe(
      finalize(() => this.loadingPerf = false)
    ).subscribe({
      next: r => {
        const perfs: any[] = r?.data?.performances ?? [];
        // Trouver la performance de l'équipe dont l'agent fait partie
        // On compare les membres de chaque équipe
        const userId = this.currentUser?._id ?? this.currentUser?.id;
        this.maPerformance = perfs.find((p: any) =>
          p.equipe?.membres?.some((m: any) => (m._id ?? m) === userId)
        ) ?? null;
        this.monEquipe = this.maPerformance?.equipe ?? null;
      },
      error: () => {}
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  get totalGagne(): number {
    return this.decaissements
      .filter(d => d.statut === 'Décaissé')
      .reduce((s, d) => s + d.montant, 0);
  }

  get totalEnAttente(): number {
    return this.decaissements
      .filter(d => d.statut === 'En attente')
      .reduce((s, d) => s + d.montant, 0);
  }

  statutClass(s: string): string {
    if (s === 'Décaissé')   return 'badge-success';
    if (s === 'En attente') return 'badge-warning';
    if (s === 'Annulé')     return 'badge-danger';
    return '';
  }

  statutIcon(s: string): string {
    if (s === 'Décaissé')   return '✅';
    if (s === 'En attente') return '⏳';
    if (s === 'Annulé')     return '❌';
    return '—';
  }

  formatMontant(n: number): string {
    return n.toLocaleString('fr-FR') + ' FCFA';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
