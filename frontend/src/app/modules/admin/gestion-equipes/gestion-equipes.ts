import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EquipeService } from '../../../core/services/equipe.service';
import { UserService } from '../../../core/services/user';
import { VehiculeService } from '../../../core/services/vehicule';

@Component({
  selector: 'app-gestion-equipes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-equipes.html',
  styleUrl: './gestion-equipes.scss',
})
export class GestionEquipes implements OnInit {

  equipes:   any[] = [];
  filtered:  any[] = [];
  agents:    any[] = [];    // utilisateurs AGENT pour le dropdown
  vehicules: any[] = [];
  loading  = true;
  search   = '';

  // Modal création / édition équipe
  showModal  = false;
  isEdit     = false;
  saving     = false;
  errorMsg   = '';
  successMsg = '';
  form: any  = { nom: '', vehiculeId: '' };
  editId: string | null = null;

  // Modal gestion des membres
  showMembresModal    = false;
  equipeSelectionnee: any = null;
  membreLoading       = false;
  membreError         = '';
  newMembreId         = '';

  constructor(
    private equipeSvc:   EquipeService,
    private userSvc:     UserService,
    private vehiculeSvc: VehiculeService,
  ) {}

  ngOnInit() {
    this.load();
    this.userSvc.getAll().subscribe({
      next: r => { this.agents = (r.data ?? r ?? []).filter((u: any) => u.role === 'AGENT'); }
    });
    this.vehiculeSvc.getAll().subscribe({
      next: r => { this.vehicules = r.data ?? r ?? []; }
    });
  }

  load() {
    this.loading = true;
    this.equipeSvc.getAll().subscribe({
      next: r => { this.equipes = r.data ?? r ?? []; this.applyFilter(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.equipes.filter(e => e.nom?.toLowerCase().includes(q));
  }

  /* ─── Modal CRUD équipe ─────────────────────────────────── */
  openCreate() {
    this.isEdit = false; this.editId = null;
    this.form = { nom: '', vehiculeId: '' };
    this.errorMsg = ''; this.showModal = true;
  }

  openEdit(e: any) {
    this.isEdit = true; this.editId = e._id;
    this.form = { nom: e.nom, vehiculeId: e.vehiculeId?._id ?? e.vehiculeId ?? '' };
    this.errorMsg = ''; this.showModal = true;
  }

  save() {
    if (!this.form.nom?.trim()) { this.errorMsg = 'Le nom est requis.'; return; }
    this.saving = true; this.errorMsg = '';
    const payload: any = { nom: this.form.nom };
    if (this.form.vehiculeId) payload.vehiculeId = this.form.vehiculeId;

    const obs = this.isEdit
      ? this.equipeSvc.update(this.editId!, payload)
      : this.equipeSvc.create(payload);

    obs.subscribe({
      next: () => {
        this.saving = false; this.showModal = false;
        this.successMsg = this.isEdit ? 'Équipe modifiée.' : 'Équipe créée.';
        this.load(); setTimeout(() => this.successMsg = '', 3000);
      },
      error: (e: any) => { this.saving = false; this.errorMsg = e?.error?.message ?? 'Erreur.'; }
    });
  }

  delete(e: any) {
    if (!confirm(`Supprimer l'équipe "${e.nom}" ?`)) return;
    this.equipeSvc.delete(e._id).subscribe({
      next: () => { this.successMsg = 'Équipe supprimée.'; this.load(); setTimeout(() => this.successMsg = '', 3000); },
      error: () => { this.errorMsg = 'Suppression échouée.'; }
    });
  }

  closeModal() { this.showModal = false; }

  /* ─── Modal MEMBRES ─────────────────────────────────────── */
  openMembres(e: any) {
    this.membreError = ''; this.newMembreId = '';
    this.equipeSvc.getById(e._id).subscribe({
      next: r => { this.equipeSelectionnee = r.data; this.showMembresModal = true; }
    });
  }

  closeMembresModal() { this.showMembresModal = false; this.equipeSelectionnee = null; }

  addMembre() {
    if (!this.newMembreId) { this.membreError = 'Sélectionnez un agent.'; return; }
    this.membreLoading = true; this.membreError = '';
    this.equipeSvc.addMembre(this.equipeSelectionnee._id, this.newMembreId).subscribe({
      next: r => {
        this.equipeSelectionnee = r.data;
        this.newMembreId = '';
        this.membreLoading = false;
        this.load();
      },
      error: (e: any) => { this.membreError = e?.error?.message ?? 'Erreur.'; this.membreLoading = false; }
    });
  }

  removeMembre(userId: string) {
    if (!confirm('Retirer cet agent de l\'équipe ?')) return;
    this.membreLoading = true;
    this.equipeSvc.removeMembre(this.equipeSelectionnee._id, userId).subscribe({
      next: r => { this.equipeSelectionnee = r.data; this.membreLoading = false; this.load(); },
      error: (e: any) => { this.membreError = e?.error?.message ?? 'Erreur.'; this.membreLoading = false; }
    });
  }

  // Agents pas encore membres de l'équipe sélectionnée
  get agentsDisponibles() {
    if (!this.equipeSelectionnee) return this.agents;
    const ids = (this.equipeSelectionnee.membres ?? []).map((m: any) => m._id ?? m);
    return this.agents.filter(a => !ids.includes(a._id));
  }

  initials(name: string) {
    return (name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  }
}
