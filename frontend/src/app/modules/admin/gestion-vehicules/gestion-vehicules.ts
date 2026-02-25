import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehiculeService } from '../../../core/services/vehicule';
import { ToastService }    from '../../../core/services/toast.service';
import { ConfirmService }  from '../../../core/services/confirm.service';

@Component({
  selector: 'app-gestion-vehicules',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-vehicules.html',
  styleUrl: './gestion-vehicules.scss',
})
export class GestionVehicules implements OnInit {

  vehicules: any[] = [];
  filtered:  any[] = [];
  loading = true;
  search  = '';

  showModal = false;
  isEdit    = false;
  saving    = false;

  form: any = { immatriculation: '', type: 'Camion-benne', capacite: '', statut: 'Disponible', marque: '', annee: '' };
  editId: string | null = null;

  types   = ['Camion-benne', 'Compacteur', 'Benne basculante', 'Motocycle', 'Autre'];
  statuts = ['Disponible', 'En service', 'En maintenance', 'Hors service'];

  constructor(
    private vehiculeSvc: VehiculeService,
    private toast:       ToastService,
    private confirmSvc:  ConfirmService,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.vehiculeSvc.getAll().subscribe({
      next: r  => { this.vehicules = r.data ?? r ?? []; this.applyFilter(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.vehicules.filter(v =>
      v.immatriculation?.toLowerCase().includes(q) ||
      v.type?.toLowerCase().includes(q) ||
      v.statut?.toLowerCase().includes(q) ||
      v.marque?.toLowerCase().includes(q)
    );
  }

  openCreate() {
    this.isEdit = false; this.editId = null;
    this.form = { immatriculation: '', type: 'Camion-benne', capacite: '', statut: 'Disponible', marque: '', annee: '' };
    this.showModal = true;
  }

  openEdit(v: any) {
    this.isEdit = true; this.editId = v._id;
    this.form = { immatriculation: v.immatriculation, type: v.type,
                  capacite: v.capacite, statut: v.statut, marque: v.marque ?? '', annee: v.annee ?? '' };
    this.showModal = true;
  }

  save() {
    if (!this.form.immatriculation?.trim()) { this.toast.error('Champ requis', "L'immatriculation est obligatoire."); return; }
    this.saving = true;
    const obs = this.isEdit
      ? this.vehiculeSvc.update(this.editId!, this.form)
      : this.vehiculeSvc.create(this.form);

    obs.subscribe({
      next: () => {
        this.saving = false; this.showModal = false;
        this.toast.success(
          this.isEdit ? 'Véhicule modifié' : 'Véhicule ajouté',
          `${this.form.immatriculation} a été ${this.isEdit ? 'mis à jour' : 'ajouté'}.`
        );
        this.load();
      },
      error: (e: any) => { this.saving = false; this.toast.error('Erreur', e?.error?.message ?? 'Une erreur est survenue.'); }
    });
  }

  async delete(v: any) {
    const ok = await this.confirmSvc.open({
      title:        'Supprimer le véhicule',
      message:      `Supprimer définitivement ${v.immatriculation} ?`,
      confirmLabel: 'Supprimer',
      danger:       true,
    });
    if (!ok) return;
    this.vehiculeSvc.delete(v._id).subscribe({
      next: () => { this.toast.success('Supprimé', `${v.immatriculation} a été supprimé.`); this.load(); },
      error: () => { this.toast.error('Erreur', 'La suppression a échoué.'); }
    });
  }

  closeModal() { this.showModal = false; }

  statutClass(s: string) {
    if (s === 'Disponible')     return 'badge badge-success';
    if (s === 'En service')     return 'badge badge-info';
    if (s === 'En maintenance') return 'badge badge-warning';
    return 'badge badge-neutral';
  }
}
