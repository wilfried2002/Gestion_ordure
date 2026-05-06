import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { finalize } from 'rxjs';
import { PlainteService } from '../../../core/services/plainte';
import { ToastService }   from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-gestion-plaintes',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './gestion-plaintes.html',
  styleUrl: './gestion-plaintes.scss',
})
export class GestionPlaintes implements OnInit {

  plaintes:  any[] = [];
  filtered:  any[] = [];
  loading   = true;
  search    = '';
  filterStatut = '';

  showModal = false;
  saving    = false;
  plainte:  any = {};
  reponse       = '';
  nouveauStatut = '';

  /** Lightbox — chemin de la photo actuellement affichée en plein écran */
  lightboxSrc: string | null = null;

  statuts = ['En attente', 'En cours', 'Résolue'];

  /** Emoji ou label selon le type de problème du citoyen */
  readonly typeIcons: Record<string, string> = {
    'Ordures non collectées':     '🗑️',
    'Dépôt sauvage':              '⚠️',
    'Bac plein ou débordant':     '📦',
    'Bac cassé ou manquant':      '🔧',
    'Mauvaise odeur persistante': '💨',
    'Autre problème':             '❓',
  };

  constructor(
    private plainteSvc: PlainteService,
    private toast:      ToastService,
    private confirmSvc: ConfirmService,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.plainteSvc.getAll().pipe(finalize(() => this.loading = false)).subscribe({
      next: r => { this.plaintes = r.data ?? []; this.applyFilter(); },
      error: () => {}
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.plaintes.filter(p => {
      const matchQ = !q ||
        p.citoyenId?.name?.toLowerCase().includes(q) ||
        p.type?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.quartier?.toLowerCase().includes(q);
      const matchS = !this.filterStatut || p.statut === this.filterStatut;
      return matchQ && matchS;
    });
  }

  openTraiter(p: any) {
    this.plainte = p;
    this.reponse = p.reponseAdmin ?? '';
    // Passer automatiquement à "En cours" si encore en attente
    this.nouveauStatut = p.statut === 'En attente' ? 'En cours' : p.statut;
    this.showModal = true;
  }

  traiter() {
    if (!this.nouveauStatut) return;
    this.saving = true;
    const payload: any = { statut: this.nouveauStatut };
    if (this.reponse.trim()) payload.reponseAdmin = this.reponse.trim();

    this.plainteSvc.update(this.plainte._id, payload).subscribe({
      next: () => {
        this.saving = false; this.showModal = false;
        this.toast.success('Plainte mise à jour', `Statut : "${this.nouveauStatut}".`);
        this.load();
      },
      error: (e: any) => { this.saving = false; this.toast.error('Erreur', e?.error?.message ?? 'Erreur.'); }
    });
  }

  async supprimer(p: any) {
    const ok = await this.confirmSvc.open({
      title:        'Supprimer la plainte',
      message:      `Supprimer le signalement "${p.type}" de ${p.citoyenId?.name ?? 'ce citoyen'} ?`,
      confirmLabel: 'Supprimer',
      danger:       true,
    });
    if (!ok) return;
    this.plainteSvc.delete(p._id).subscribe({
      next: () => { this.toast.success('Supprimée', 'La plainte a été supprimée.'); this.load(); },
      error: () => { this.toast.error('Erreur', 'La suppression a échoué.'); }
    });
  }

  closeModal() { this.showModal = false; this.lightboxSrc = null; }

  openLightbox(src: string) { this.lightboxSrc = src; }
  closeLightbox()            { this.lightboxSrc = null; }

  typeIcon(type: string) { return this.typeIcons[type] ?? '📋'; }

  statutClass(s: string) {
    if (s === 'Résolue')    return 'badge badge-success';
    if (s === 'En cours')   return 'badge badge-info';
    if (s === 'En attente') return 'badge badge-warning';
    return 'badge badge-neutral';
  }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  get nbEnAttente()  { return this.plaintes.filter(p => p.statut === 'En attente').length; }
  get nbEnCours()    { return this.plaintes.filter(p => p.statut === 'En cours').length; }
}
