import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AgentTourneeService } from '../../../core/services/agent-tournee.service';

@Component({
  selector: 'app-ma-tournee',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ma-tournee.html',
  styleUrl: './ma-tournee.scss',
})
export class MaTournee implements OnInit {

  tourneeId: string = '';
  tournee: any = null;
  points: any[] = [];
  loading = true;
  actionLoading = false;
  errorMsg = '';
  successMsg = '';

  // Modale validation point
  showValiderModal = false;
  pointEnCours: any = null;
  validerForm = { volume: 0, commentaire: '' };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: AgentTourneeService,
  ) {}

  ngOnInit() {
    this.route.params.subscribe(p => {
      this.tourneeId = p['id'];
      if (this.tourneeId) {
        this.loadTournee();
      } else {
        // Pas d'id → charger la première tournée en cours ou planifiée
        this.svc.getMesTournees().subscribe({
          next: r => {
            const data: any[] = r.data ?? [];
            const active = data.find(t => t.statut === 'En cours') ?? data.find(t => t.statut === 'Planifiée');
            if (active) {
              this.tourneeId = active._id;
              this.loadTournee();
            } else {
              this.loading = false;
            }
          },
          error: () => { this.loading = false; }
        });
      }
    });
  }

  loadTournee() {
    this.loading = true;
    this.svc.getTourneeById(this.tourneeId).subscribe({
      next: r => {
        this.tournee = r.data;
        this.loadPoints();
      },
      error: () => { this.loading = false; }
    });
  }

  loadPoints() {
    this.svc.getPoints(this.tourneeId).subscribe({
      next: r => { this.points = r.data ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  demarrer() {
    this.actionLoading = true;
    this.svc.demarrer(this.tourneeId).subscribe({
      next: r => {
        this.tournee = r.data;
        this.actionLoading = false;
        this.successMsg = 'Tournée démarrée ! Les points de collecte sont prêts.';
        this.loadPoints();
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.errorMsg = e?.error?.message ?? 'Erreur lors du démarrage.';
        setTimeout(() => this.errorMsg = '', 4000);
      }
    });
  }

  terminer() {
    const nonCollectes = this.points.filter(p => p.statut !== 'Collecté').length;
    const msg = nonCollectes > 0
      ? `${nonCollectes} point(s) non encore collecté(s). Terminer quand même ?`
      : 'Confirmer la fin de la tournée ?';
    if (!confirm(msg)) return;

    this.actionLoading = true;
    this.svc.terminer(this.tourneeId).subscribe({
      next: r => {
        this.tournee = r.data;
        this.actionLoading = false;
        this.successMsg = 'Tournée terminée avec succès !';
        setTimeout(() => { this.successMsg = ''; this.router.navigate(['/agent/dashboard']); }, 2000);
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.errorMsg = e?.error?.message ?? 'Erreur lors de la fin de tournée.';
        setTimeout(() => this.errorMsg = '', 4000);
      }
    });
  }

  openValider(point: any) {
    this.pointEnCours = point;
    this.validerForm = { volume: point.volume ?? 0, commentaire: '' };
    this.showValiderModal = true;
  }

  confirmerValider() {
    if (!this.pointEnCours) return;
    this.actionLoading = true;
    this.svc.validerPoint(this.pointEnCours._id, this.validerForm).subscribe({
      next: () => {
        this.actionLoading = false;
        this.showValiderModal = false;
        this.successMsg = `Point "${this.pointEnCours.quartierId?.nom}" validé !`;
        this.loadPoints();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.errorMsg = e?.error?.message ?? 'Erreur validation.';
        setTimeout(() => this.errorMsg = '', 3000);
      }
    });
  }

  get nbCollectes() { return this.points.filter(p => p.statut === 'Collecté').length; }
  get progression()  { return this.points.length ? Math.round((this.nbCollectes / this.points.length) * 100) : 0; }

  statutClass(s: string) {
    if (s === 'En cours')  return 'badge badge-info';
    if (s === 'Planifiée') return 'badge badge-warning';
    if (s === 'Terminée')  return 'badge badge-success';
    if (s === 'Annulée')   return 'badge badge-danger';
    return 'badge badge-neutral';
  }

  pointClass(s: string) {
    if (s === 'Collecté')  return 'badge badge-success';
    if (s === 'En cours')  return 'badge badge-info';
    return 'badge badge-warning';
  }
}
