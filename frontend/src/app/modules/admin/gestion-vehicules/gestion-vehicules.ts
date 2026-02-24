import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehiculeService } from '../../../core/services/vehicule';

@Component({
  selector: 'app-gestion-vehicules',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-vehicules.html',
  styleUrl: './gestion-vehicules.scss',
})
export class GestionVehicules implements OnInit {

  vehicules: any[] = [];
  filtered: any[] = [];
  loading = true;
  search = '';

  showModal = false;
  isEdit = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  form: any = {
    immatriculation: '', type: 'Camion-benne', capacite: '',
    statut: 'Disponible', marque: '', annee: ''
  };
  editId: string | null = null;

  types   = ['Camion-benne', 'Compacteur', 'Benne basculante', 'Motocycle', 'Autre'];
  statuts = ['Disponible', 'En service', 'En maintenance', 'Hors service'];

  constructor(private vehiculeSvc: VehiculeService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.vehiculeSvc.getAll().subscribe({
      next: r => {
        this.vehicules = r.data ?? r ?? [];
        this.applyFilter();
        this.loading = false;
      },
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
    this.isEdit = false;
    this.editId = null;
    this.form = { immatriculation: '', type: 'Camion-benne', capacite: '', statut: 'Disponible', marque: '', annee: '' };
    this.errorMsg = '';
    this.showModal = true;
  }

  openEdit(v: any) {
    this.isEdit = true;
    this.editId = v._id;
    this.form = {
      immatriculation: v.immatriculation, type: v.type,
      capacite: v.capacite, statut: v.statut,
      marque: v.marque ?? '', annee: v.annee ?? ''
    };
    this.errorMsg = '';
    this.showModal = true;
  }

  save() {
    this.saving = true;
    this.errorMsg = '';
    const obs = this.isEdit
      ? this.vehiculeSvc.update(this.editId!, this.form)
      : this.vehiculeSvc.create(this.form);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.successMsg = this.isEdit ? 'Véhicule modifié.' : 'Véhicule créé.';
        this.load();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (e: any) => {
        this.saving = false;
        this.errorMsg = e?.error?.message ?? 'Une erreur est survenue.';
      }
    });
  }

  delete(v: any) {
    if (!confirm(`Supprimer le véhicule ${v.immatriculation} ?`)) return;
    this.vehiculeSvc.delete(v._id).subscribe({
      next: () => {
        this.successMsg = 'Véhicule supprimé.';
        this.load();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: () => { this.errorMsg = 'Suppression échouée.'; }
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
