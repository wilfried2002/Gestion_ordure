import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TourneeService }  from '../../../core/services/tournee';
import { ZoneService }     from '../../../core/services/zone.service';
import { EquipeService }   from '../../../core/services/equipe.service';
import { VehiculeService } from '../../../core/services/vehicule';
import { ToastService }    from '../../../core/services/toast.service';
import { ConfirmService }  from '../../../core/services/confirm.service';

@Component({
  selector: 'app-gestion-tournees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-tournees.html',
  styleUrl: './gestion-tournees.scss',
})
export class GestionTournees implements OnInit {

  tournees:  any[] = [];
  filtered:  any[] = [];
  loading = true;
  search  = '';
  filterStatut = '';

  zones:     any[] = [];
  equipes:   any[] = [];
  vehicules: any[] = [];

  showModal = false;
  isEdit    = false;
  saving    = false;

  form: any = { date: '', zoneId: '', equipeId: '', vehiculeId: '', statut: 'Planifiée', heureDebut: '', heureFin: '', notes: '' };
  editId: string | null = null;

  statuts = ['Planifiée', 'En cours', 'Terminée', 'Annulée'];

  constructor(
    private tourneeSvc:  TourneeService,
    private zoneSvc:     ZoneService,
    private equipeSvc:   EquipeService,
    private vehiculeSvc: VehiculeService,
    private toast:       ToastService,
    private confirmSvc:  ConfirmService,
  ) {}

  ngOnInit() {
    this.load();
    this.zoneSvc.getAll().subscribe({ next: r => this.zones = r.data ?? r ?? [], error: () => {} });
    this.equipeSvc.getAll().subscribe({ next: r => this.equipes = r.data ?? r ?? [], error: () => {} });
    this.vehiculeSvc.getAll().subscribe({ next: r => this.vehicules = r.data ?? r ?? [], error: () => {} });
  }

  load() {
    this.loading = true;
    this.tourneeSvc.getAll().subscribe({
      next: r  => { this.tournees = r.data ?? r ?? []; this.applyFilter(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.tournees.filter(t => {
      const matchQ = !q ||
        t.zoneId?.nom?.toLowerCase().includes(q) ||
        t.equipeId?.nom?.toLowerCase().includes(q) ||
        t.statut?.toLowerCase().includes(q);
      const matchS = !this.filterStatut || t.statut === this.filterStatut;
      return matchQ && matchS;
    });
  }

  openCreate() {
    this.isEdit = false; this.editId = null;
    const today = new Date().toISOString().split('T')[0];
    this.form = { date: today, zoneId: '', equipeId: '', vehiculeId: '', statut: 'Planifiée', heureDebut: '', heureFin: '', notes: '' };
    this.showModal = true;
  }

  openEdit(t: any) {
    this.isEdit = true; this.editId = t._id;
    this.form = {
      date: t.date?.split('T')[0] ?? '',
      zoneId: t.zoneId?._id ?? t.zoneId ?? '',
      equipeId: t.equipeId?._id ?? t.equipeId ?? '',
      vehiculeId: t.vehiculeId?._id ?? t.vehiculeId ?? '',
      statut: t.statut, heureDebut: t.heureDebut ?? '', heureFin: t.heureFin ?? '', notes: t.notes ?? ''
    };
    this.showModal = true;
  }

  save() {
    if (!this.form.date) { this.toast.error('Champ requis', 'La date est obligatoire.'); return; }
    if (!this.form.equipeId) { this.toast.error('Champ requis', "L'équipe est obligatoire."); return; }
    this.saving = true;
    const obs = this.isEdit ? this.tourneeSvc.update(this.editId!, this.form) : this.tourneeSvc.create(this.form);
    obs.subscribe({
      next: () => {
        this.saving = false; this.showModal = false;
        this.toast.success(
          this.isEdit ? 'Tournée modifiée' : 'Tournée créée',
          `La tournée du ${this.formatDate(this.form.date)} a été ${this.isEdit ? 'mise à jour' : 'planifiée'}.`
        );
        this.load();
      },
      error: (e: any) => { this.saving = false; this.toast.error('Erreur', e?.error?.message ?? 'Erreur.'); }
    });
  }

  async delete(t: any) {
    const ok = await this.confirmSvc.open({
      title:        'Supprimer la tournée',
      message:      `Supprimer la tournée du ${this.formatDate(t.date)} ?`,
      confirmLabel: 'Supprimer',
      danger:       true,
    });
    if (!ok) return;
    this.tourneeSvc.delete(t._id).subscribe({
      next: () => { this.toast.success('Supprimée', 'La tournée a été supprimée.'); this.load(); },
      error: () => { this.toast.error('Erreur', 'La suppression a échoué.'); }
    });
  }

  closeModal() { this.showModal = false; }

  statutClass(s: string) {
    if (s === 'Terminée')  return 'badge badge-success';
    if (s === 'En cours')  return 'badge badge-info';
    if (s === 'Planifiée') return 'badge badge-warning';
    if (s === 'Annulée')   return 'badge badge-danger';
    return 'badge badge-neutral';
  }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
