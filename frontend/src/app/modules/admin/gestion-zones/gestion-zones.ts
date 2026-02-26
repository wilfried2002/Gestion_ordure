import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { finalize }     from 'rxjs';
import { ZoneService }   from '../../../core/services/zone.service';
import { AuthService }   from '../../../core/services/auth';
import { ToastService }  from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-gestion-zones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-zones.html',
  styleUrl: './gestion-zones.scss',
})
export class GestionZones implements OnInit {

  zones:    any[] = [];
  filtered: any[] = [];
  loading = true;
  search  = '';

  showModal = false;
  isEdit    = false;
  saving    = false;

  form: any = { nom: '', description: '', arrondissement: '' };
  editId: string | null = null;

  // Arrondissements chargés depuis l'API selon la ville de l'admin
  arrondissements: any[] = [];
  ville = '';
  generating = false;

  constructor(
    private zoneSvc:    ZoneService,
    private authSvc:    AuthService,
    private toast:      ToastService,
    private confirmSvc: ConfirmService,
  ) {}

  ngOnInit() {
    const user = this.authSvc.getCurrentUser();
    this.ville = user?.ville ?? 'Douala';
    this.load();
    this.loadArrondissements();
  }

  /* ── Chargement des zones existantes ─────────────────────────────────── */
  load() {
    this.loading = true;
    this.zoneSvc.getAll().pipe(finalize(() => this.loading = false)).subscribe({
      next:  r  => { this.zones = r?.data ?? (Array.isArray(r) ? r : []); this.applyFilter(); },
      error: () => {}
    });
  }

  /* ── Chargement des arrondissements depuis l'API ─────────────────────── */
  loadArrondissements() {
    this.zoneSvc.getArrondissements().subscribe({
      next:  r => { this.arrondissements = r?.data ?? []; this.ville = r?.ville ?? this.ville; },
      error: () => {}
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.zones.filter(z =>
      z.nom?.toLowerCase().includes(q) || z.arrondissement?.toLowerCase().includes(q)
    );
  }

  /* ── Sélection d'un arrondissement → auto-remplissage du nom ────────── */
  onArrondissementChange(nom: string) {
    if (nom && !this.isEdit) {
      this.form.nom = nom;
      const arr = this.arrondissements.find(a => a.nom === nom);
      if (arr && !this.form.description) {
        this.form.description = `Zone de collecte – ${arr.nom}, quartier ${arr.quartier}`;
      }
    }
  }

  /* ── Génération automatique de toutes les zones manquantes ──────────── */
  async generateAllZones() {
    const missing = this.arrondissements.filter(a => !a.exists).length;
    if (missing === 0) {
      this.toast.info('Déjà complet', `Toutes les zones de ${this.ville} existent déjà.`);
      return;
    }
    const ok = await this.confirmSvc.open({
      title:        `Générer les zones de ${this.ville}`,
      message:      `Créer automatiquement ${missing} zone(s) manquante(s) pour ${this.ville} ?`,
      confirmLabel: 'Générer',
      danger:       false,
    });
    if (!ok) return;

    this.generating = true;
    this.zoneSvc.bulkCreate().pipe(finalize(() => this.generating = false)).subscribe({
      next: r => {
        this.toast.success('Zones générées', r?.message ?? `${r?.created} zone(s) créée(s).`);
        this.load();
        this.loadArrondissements();
      },
      error: (e: any) => { this.toast.error('Erreur', e?.error?.message ?? 'Génération échouée.'); }
    });
  }

  openCreate() {
    this.isEdit = false; this.editId = null;
    this.form = { nom: '', description: '', arrondissement: '' };
    this.showModal = true;
  }

  openEdit(z: any) {
    this.isEdit = true; this.editId = z._id;
    this.form = {
      nom:            z.nom,
      description:    z.description ?? '',
      arrondissement: z.arrondissement ?? '',
    };
    this.showModal = true;
  }

  save() {
    if (!this.form.nom?.trim()) { this.toast.error('Champ requis', 'Le nom est obligatoire.'); return; }
    this.saving = true;
    const obs = this.isEdit
      ? this.zoneSvc.update(this.editId!, this.form)
      : this.zoneSvc.create(this.form);
    obs.subscribe({
      next: () => {
        this.saving = false; this.showModal = false;
        this.toast.success(
          this.isEdit ? 'Zone modifiée' : 'Zone créée',
          `La zone "${this.form.nom}" a été ${this.isEdit ? 'mise à jour' : 'créée'}.`
        );
        this.load();
        this.loadArrondissements();
      },
      error: (e: any) => { this.saving = false; this.toast.error('Erreur', e?.error?.message ?? 'Erreur.'); }
    });
  }

  async delete(z: any) {
    const ok = await this.confirmSvc.open({
      title:        'Supprimer la zone',
      message:      `Supprimer définitivement la zone "${z.nom}" ?`,
      confirmLabel: 'Supprimer',
      danger:       true,
    });
    if (!ok) return;
    this.zoneSvc.delete(z._id).subscribe({
      next: () => {
        this.toast.success('Supprimée', `La zone "${z.nom}" a été supprimée.`);
        this.load();
        this.loadArrondissements();
      },
      error: () => { this.toast.error('Erreur', 'La suppression a échoué.'); }
    });
  }

  closeModal() { this.showModal = false; }

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  get missingCount() { return this.arrondissements.filter(a => !a.exists).length; }
  get totalCount()   { return this.arrondissements.length; }
  get coveredCount() { return this.arrondissements.filter(a => a.exists).length; }
}
