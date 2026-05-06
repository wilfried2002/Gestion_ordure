import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentTourneeService } from '../../../core/services/agent-tournee.service';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './incidents.html',
  styleUrl: './incidents.scss',
})
export class Incidents implements OnInit {

  incidents: any[] = [];
  tournees: any[]  = [];
  loading      = true;
  actionLoading = false;
  showForm      = false;
  successMsg    = '';
  errorMsg      = '';

  form = { description: '', gravite: 'Faible', tourneeId: '' };

  constructor(private svc: AgentTourneeService) {}

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true;
    this.svc.getMesIncidents().subscribe({
      next: r => { this.incidents = r.data ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
    this.svc.getMesTournees().subscribe({
      next: r => { this.tournees = r.data ?? []; }
    });
  }

  soumettre() {
    if (!this.form.description.trim()) {
      this.errorMsg = 'La description est requise (minimum 10 caractères).';
      return;
    }
    if (this.form.description.trim().length < 10) {
      this.errorMsg = 'La description doit contenir au moins 10 caractères.';
      return;
    }
    this.actionLoading = true;
    this.errorMsg = '';
    const payload: any = { description: this.form.description, gravite: this.form.gravite };
    if (this.form.tourneeId) payload.tourneeId = this.form.tourneeId;

    this.svc.signalerIncident(payload).subscribe({
      next: (r: any) => {
        // Mise à jour optimiste : affiche l'incident immédiatement sans attendre loadAll()
        const nouvelIncident = r.data ?? {
          _id: Date.now().toString(),
          description: payload.description,
          gravite: payload.gravite,
          statut: 'Ouvert',
          createdAt: new Date().toISOString(),
        };
        this.incidents = [nouvelIncident, ...this.incidents];
        this.successMsg    = 'Incident signalé avec succès.';
        this.form          = { description: '', gravite: 'Faible', tourneeId: '' };
        this.showForm      = false;
        this.actionLoading = false;
        setTimeout(() => this.successMsg = '', 4000);
        // Rafraîchissement silencieux en arrière-plan pour récupérer les données peuplées
        this.svc.getMesIncidents().subscribe({ next: rr => { this.incidents = rr.data ?? []; } });
      },
      error: err => {
        this.errorMsg    = err?.error?.message || 'Erreur lors du signalement.';
        this.actionLoading = false;
      }
    });
  }

  graviteClass(g: string) {
    if (g === 'Élevée')  return 'badge badge-danger';
    if (g === 'Modérée') return 'badge badge-warning';
    return 'badge badge-neutral';
  }

  statutClass(s: string) {
    if (s === 'Résolu')   return 'badge badge-success';
    if (s === 'En cours') return 'badge badge-info';
    return 'badge badge-warning';
  }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
