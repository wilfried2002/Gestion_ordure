import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { EquipeService }  from '../../../core/services/equipe.service';
import { UserService }    from '../../../core/services/user';
import { VehiculeService } from '../../../core/services/vehicule';
import { ToastService }   from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';

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
  agents:    any[] = [];
  vehicules: any[] = [];
  loading  = true;
  search   = '';

  showModal = false;
  isEdit    = false;
  saving    = false;
  form: any = { nom: '', vehiculeId: '' };
  editId: string | null = null;

  showMembresModal    = false;
  equipeSelectionnee: any = null;
  membreLoading       = false;
  membreError         = '';
  newMembreId         = '';

  constructor(
    private equipeSvc:   EquipeService,
    private userSvc:     UserService,
    private vehiculeSvc: VehiculeService,
    private toast:       ToastService,
    private confirmSvc:  ConfirmService,
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
    this.equipeSvc.getAll().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: r => { this.equipes = r?.data ?? (Array.isArray(r) ? r : []); this.applyFilter(); },
      error: () => {}
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.equipes.filter(e => e.nom?.toLowerCase().includes(q));
  }

  openCreate() {
    this.isEdit = false; this.editId = null;
    this.form = { nom: '', vehiculeId: '' };
    this.showModal = true;
  }

  openEdit(e: any) {
    this.isEdit = true; this.editId = e._id;
    this.form = { nom: e.nom, vehiculeId: e.vehiculeId?._id ?? e.vehiculeId ?? '' };
    this.showModal = true;
  }

  save() {
    if (!this.form.nom?.trim()) { this.toast.error('Champ requis', 'Le nom est obligatoire.'); return; }
    this.saving = true;
    const payload: any = { nom: this.form.nom };
    if (this.form.vehiculeId) payload.vehiculeId = this.form.vehiculeId;

    const obs = this.isEdit
      ? this.equipeSvc.update(this.editId!, payload)
      : this.equipeSvc.create(payload);

    obs.subscribe({
      next: () => {
        this.saving = false; this.showModal = false;
        this.toast.success(
          this.isEdit ? 'Équipe modifiée' : 'Équipe créée',
          `L'équipe "${this.form.nom}" a été ${this.isEdit ? 'mise à jour' : 'créée'}.`
        );
        this.load();
      },
      error: (e: any) => { this.saving = false; this.toast.error('Erreur', e?.error?.message ?? 'Une erreur est survenue.'); }
    });
  }

  async delete(e: any) {
    const ok = await this.confirmSvc.open({
      title:        'Supprimer l\'équipe',
      message:      `Voulez-vous supprimer l'équipe "${e.nom}" ? Les agents ne seront pas supprimés.`,
      confirmLabel: 'Supprimer',
      danger:       true,
    });
    if (!ok) return;
    this.equipeSvc.delete(e._id).subscribe({
      next: () => { this.toast.success('Supprimée', `L'équipe "${e.nom}" a été supprimée.`); this.load(); },
      error: () => { this.toast.error('Erreur', 'La suppression a échoué.'); }
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
    if (!this.newMembreId) { this.toast.warning('Sélection requise', 'Choisissez un agent à ajouter.'); return; }
    this.membreLoading = true; this.membreError = '';
    this.equipeSvc.addMembre(this.equipeSelectionnee._id, this.newMembreId).subscribe({
      next: r => {
        this.equipeSelectionnee = r.data;
        this.newMembreId = '';
        this.membreLoading = false;
        this.toast.success('Agent ajouté', 'L\'agent a été ajouté à l\'équipe.');
        this.load();
      },
      error: (e: any) => {
        this.membreError = e?.error?.message ?? 'Erreur.';
        this.membreLoading = false;
        this.toast.error('Erreur', this.membreError);
      }
    });
  }

  async removeMembre(userId: string, memberName: string) {
    const ok = await this.confirmSvc.open({
      title:        'Retirer l\'agent',
      message:      `Retirer ${memberName} de cette équipe ?`,
      confirmLabel: 'Retirer',
      danger:       true,
    });
    if (!ok) return;
    this.membreLoading = true;
    this.equipeSvc.removeMembre(this.equipeSelectionnee._id, userId).subscribe({
      next: r => {
        this.equipeSelectionnee = r.data;
        this.membreLoading = false;
        this.toast.success('Agent retiré', `${memberName} a été retiré de l'équipe.`);
        this.load();
      },
      error: (e: any) => {
        this.membreError = e?.error?.message ?? 'Erreur.';
        this.membreLoading = false;
        this.toast.error('Erreur', this.membreError);
      }
    });
  }

  get agentsDisponibles() {
    if (!this.equipeSelectionnee) return this.agents;
    const ids = (this.equipeSelectionnee.membres ?? []).map((m: any) => m._id ?? m);
    return this.agents.filter(a => !ids.includes(a._id));
  }

  initials(name: string) {
    return (name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  }
}
