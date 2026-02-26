import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
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
  /** Tous les quartiers chargés une fois */
  allQuartiers: any[] = [];
  /** Quartiers filtrés selon la zone choisie dans le formulaire */
  quartiersZone: any[] = [];

  showModal = false;
  isEdit    = false;
  saving    = false;

  form: any = {
    date: '', zoneId: '', equipeId: '', vehiculeId: '',
    statut: 'Planifiée', heureDebut: '', heureFin: '',
    notes: '', quartiers: [] as string[],
  };
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
    // Charger tous les quartiers une seule fois
    this.zoneSvc.getQuartiers().subscribe({ next: r => { this.allQuartiers = r.data ?? r ?? []; }, error: () => {} });
  }

  load() {
    this.loading = true;
    this.tourneeSvc.getAll().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: r  => { this.tournees = r?.data ?? (Array.isArray(r) ? r : []); this.applyFilter(); },
      error: () => {}
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

  /** Appelé quand l'admin change l'équipe → charge automatiquement le véhicule lié */
  onEquipeChange() {
    const equipe = this.equipes.find((e: any) => e._id === this.form.equipeId);
    if (equipe?.vehiculeId) {
      this.form.vehiculeId = equipe.vehiculeId._id ?? equipe.vehiculeId;
    } else {
      this.form.vehiculeId = '';
    }
  }

  /** Appelé quand l'admin change la zone → filtre les quartiers correspondants */
  onZoneChange() {
    const zoneId = this.form.zoneId;
    if (!zoneId) {
      this.quartiersZone = [];
      this.form.quartiers = [];
      return;
    }
    this.quartiersZone = this.allQuartiers.filter(q => {
      const qZone = q.zoneId?._id ?? q.zoneId;
      return qZone === zoneId;
    });
    // Tout sélectionner par défaut pour simplifier la saisie
    this.form.quartiers = this.quartiersZone.map((q: any) => q._id);
  }

  /** Coche / décoche un quartier dans la liste */
  toggleQuartier(id: string) {
    const idx = this.form.quartiers.indexOf(id);
    if (idx === -1) this.form.quartiers.push(id);
    else            this.form.quartiers.splice(idx, 1);
  }

  isQuartierSelected(id: string): boolean {
    return this.form.quartiers.includes(id);
  }

  openCreate() {
    this.isEdit = false; this.editId = null;
    const today = new Date().toISOString().split('T')[0];
    this.form = {
      date: today, zoneId: '', equipeId: '', vehiculeId: '',
      statut: 'Planifiée', heureDebut: '', heureFin: '',
      notes: '', quartiers: [],
    };
    this.quartiersZone = [];
    this.showModal = true;
  }

  openEdit(t: any) {
    this.isEdit = true; this.editId = t._id;
    const zoneId = t.zoneId?._id ?? t.zoneId ?? '';
    // Reconstruire la liste de quartiers de la zone
    this.quartiersZone = this.allQuartiers.filter(q => {
      const qZone = q.zoneId?._id ?? q.zoneId;
      return qZone === zoneId;
    });
    this.form = {
      date:       t.date?.split('T')[0] ?? '',
      zoneId,
      equipeId:   t.equipeId?._id  ?? t.equipeId  ?? '',
      vehiculeId: t.vehiculeId?._id ?? t.vehiculeId ?? '',
      statut:     t.statut,
      heureDebut: t.heureDebut ?? '',
      heureFin:   t.heureFin   ?? '',
      notes:      t.notes      ?? '',
      quartiers:  (t.quartiers ?? []).map((q: any) => q._id ?? q),
    };
    this.showModal = true;
  }

  save() {
    if (!this.form.date)     { this.toast.error('Champ requis', 'La date est obligatoire.'); return; }
    if (!this.form.equipeId) { this.toast.error('Champ requis', "L'équipe est obligatoire."); return; }
    this.saving = true;
    const payload = { ...this.form };
    // Envoyer un tableau vide plutôt qu'undefined si aucun quartier sélectionné
    if (!Array.isArray(payload.quartiers)) payload.quartiers = [];
    const obs = this.isEdit ? this.tourneeSvc.update(this.editId!, payload) : this.tourneeSvc.create(payload);
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
