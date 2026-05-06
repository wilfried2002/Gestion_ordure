import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { IncidentService } from '../../../core/services/incident.service';
import { ToastService }    from '../../../core/services/toast.service';
import { ConfirmService }  from '../../../core/services/confirm.service';
import { ModalComponent }  from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-gestion-incidents',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './gestion-incidents.html',
  styleUrl: './gestion-incidents.scss',
})
export class GestionIncidents implements OnInit {

  incidents: any[] = [];
  filtered:  any[] = [];
  loading       = true;
  search        = '';
  filterStatut  = '';
  filterGravite = '';

  showModal     = false;
  saving        = false;
  incident: any = null;
  nouveauStatut = '';

  statuts  = ['Ouvert', 'En cours', 'Résolu'];
  gravites = ['Faible', 'Modérée', 'Élevée'];

  constructor(
    private incidentSvc: IncidentService,
    private toast:       ToastService,
    private confirmSvc:  ConfirmService,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.incidentSvc.getAll().pipe(finalize(() => this.loading = false)).subscribe({
      next: r => { this.incidents = r.data ?? []; this.applyFilter(); },
      error: () => {}
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.incidents.filter(i => {
      const matchQ = !q ||
        i.agentId?.name?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q);
      const matchS = !this.filterStatut  || i.statut  === this.filterStatut;
      const matchG = !this.filterGravite || i.gravite === this.filterGravite;
      return matchQ && matchS && matchG;
    });
  }

  openPrendreEnCharge(i: any) {
    this.incident = i;
    this.nouveauStatut = i.statut === 'Ouvert' ? 'En cours' : i.statut;
    this.showModal = true;
  }

  changerStatut() {
    this.saving = true;
    this.incidentSvc.update(this.incident._id, { statut: this.nouveauStatut }).subscribe({
      next: () => {
        this.saving = false; this.showModal = false;
        this.toast.success('Incident mis à jour', `Statut changé en "${this.nouveauStatut}".`);
        this.load();
      },
      error: (e: any) => { this.saving = false; this.toast.error('Erreur', e?.error?.message ?? 'Erreur.'); }
    });
  }

  async supprimer(i: any) {
    const ok = await this.confirmSvc.open({
      title:        'Supprimer l\'incident',
      message:      `Supprimer l'incident de ${i.agentId?.name ?? 'cet agent'} ?`,
      confirmLabel: 'Supprimer',
      danger:       true,
    });
    if (!ok) return;
    this.incidentSvc.delete(i._id).subscribe({
      next: () => { this.toast.success('Supprimé', 'L\'incident a été supprimé.'); this.load(); },
      error: () => { this.toast.error('Erreur', 'La suppression a échoué.'); }
    });
  }

  closeModal() { this.showModal = false; }

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

  get nbOuverts() { return this.incidents.filter(i => i.statut === 'Ouvert').length; }
  get nbEnCours() { return this.incidents.filter(i => i.statut === 'En cours').length; }
}
