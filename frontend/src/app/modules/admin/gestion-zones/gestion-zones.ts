import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZoneService } from '../../../core/services/zone.service';

@Component({
  selector: 'app-gestion-zones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-zones.html',
  styleUrl: './gestion-zones.scss',
})
export class GestionZones implements OnInit {

  zones: any[] = [];
  filtered: any[] = [];
  loading = true;
  search = '';

  showModal = false;
  isEdit = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  form: any = { nom: '', description: '', arrondissement: '', superficie: '' };
  editId: string | null = null;

  arrondissements = ['Douala 1', 'Douala 2', 'Douala 3', 'Douala 4', 'Douala 5'];

  constructor(private zoneSvc: ZoneService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.zoneSvc.getAll().subscribe({
      next: r => { this.zones = r.data ?? r ?? []; this.applyFilter(); this.loading = false; },
      error: () => { this.loading = false; }
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
    this.errorMsg = ''; this.showModal = true;
  }

  openEdit(z: any) {
    this.isEdit = true; this.editId = z._id;
    this.form = { nom: z.nom, description: z.description ?? '', arrondissement: z.arrondissement ?? '', superficie: z.superficie ?? '' };
    this.errorMsg = ''; this.showModal = true;
  }

  save() {
    this.saving = true; this.errorMsg = '';
    const obs = this.isEdit ? this.zoneSvc.update(this.editId!, this.form) : this.zoneSvc.create(this.form);
    obs.subscribe({
      next: () => { this.saving = false; this.showModal = false; this.successMsg = this.isEdit ? 'Zone modifiée.' : 'Zone créée.'; this.load(); setTimeout(() => this.successMsg = '', 3000); },
      error: (e: any) => { this.saving = false; this.errorMsg = e?.error?.message ?? 'Erreur.'; }
    });
  }

  delete(z: any) {
    if (!confirm(`Supprimer "${z.nom}" ?`)) return;
    this.zoneSvc.delete(z._id).subscribe({
      next: () => { this.successMsg = 'Zone supprimée.'; this.load(); setTimeout(() => this.successMsg = '', 3000); },
      error: () => { this.errorMsg = 'Suppression échouée.'; }
    });
  }

  closeModal() { this.showModal = false; }
}
