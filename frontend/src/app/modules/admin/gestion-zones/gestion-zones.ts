import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ZoneService }   from '../../../core/services/zone.service';
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

  form: any = { nom: '', description: '', arrondissement: '', superficie: '' };
  editId: string | null = null;

  arrondissements = ['Douala 1', 'Douala 2', 'Douala 3', 'Douala 4', 'Douala 5'];

  constructor(
    private zoneSvc:    ZoneService,
    private toast:      ToastService,
    private confirmSvc: ConfirmService,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.zoneSvc.getAll().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: r  => { this.zones = r?.data ?? (Array.isArray(r) ? r : []); this.applyFilter(); },
      error: () => {}
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.zones.filter(z =>
      z.nom?.toLowerCase().includes(q) || z.arrondissement?.toLowerCase().includes(q)
    );
  }

  openCreate() {
    this.isEdit = false; this.editId = null;
    this.form = { nom: '', description: '', arrondissement: '', superficie: '' };
    this.showModal = true;
  }

  openEdit(z: any) {
    this.isEdit = true; this.editId = z._id;
    this.form = { nom: z.nom, description: z.description ?? '',
                  arrondissement: z.arrondissement ?? '', superficie: z.superficie ?? '' };
    this.showModal = true;
  }

  save() {
    if (!this.form.nom?.trim()) { this.toast.error('Champ requis', 'Le nom est obligatoire.'); return; }
    this.saving = true;
    const obs = this.isEdit ? this.zoneSvc.update(this.editId!, this.form) : this.zoneSvc.create(this.form);
    obs.subscribe({
      next: () => {
        this.saving = false; this.showModal = false;
        this.toast.success(
          this.isEdit ? 'Zone modifiée' : 'Zone créée',
          `La zone "${this.form.nom}" a été ${this.isEdit ? 'mise à jour' : 'créée'}.`
        );
        this.load();
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
      next: () => { this.toast.success('Supprimée', `La zone "${z.nom}" a été supprimée.`); this.load(); },
      error: () => { this.toast.error('Erreur', 'La suppression a échoué.'); }
    });
  }

  closeModal() { this.showModal = false; }
}
