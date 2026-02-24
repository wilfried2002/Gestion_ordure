import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user';

@Component({
  selector: 'app-gestion-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-users.html',
  styleUrl: './gestion-users.scss',
})
export class GestionUsers implements OnInit {

  users: any[] = [];
  filtered: any[] = [];
  loading = true;
  search = '';

  showModal = false;
  isEdit = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  form: any = { nom: '', email: '', telephone: '', role: 'CITOYEN', password: '' };
  editId: string | null = null;

  roles = ['ADMIN', 'AGENT', 'CITOYEN'];

  constructor(private userSvc: UserService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.userSvc.getAll().subscribe({
      next: r => {
        this.users = r.data ?? r ?? [];
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.users.filter(u =>
      u.nom?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }

  openCreate() {
    this.isEdit = false;
    this.editId = null;
    this.form = { nom: '', email: '', telephone: '', role: 'CITOYEN', password: '' };
    this.errorMsg = '';
    this.showModal = true;
  }

  openEdit(u: any) {
    this.isEdit = true;
    this.editId = u._id;
    this.form = { nom: u.nom, email: u.email, telephone: u.telephone ?? '', role: u.role, password: '' };
    this.errorMsg = '';
    this.showModal = true;
  }

  save() {
    this.saving = true;
    this.errorMsg = '';
    const payload = { ...this.form };
    if (this.isEdit && !payload.password) delete payload.password;

    const obs = this.isEdit
      ? this.userSvc.update(this.editId!, payload)
      : this.userSvc.register(payload);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.successMsg = this.isEdit ? 'Utilisateur modifié.' : 'Utilisateur créé.';
        this.load();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (e: any) => {
        this.saving = false;
        this.errorMsg = e?.error?.message ?? 'Une erreur est survenue.';
      }
    });
  }

  delete(u: any) {
    if (!confirm(`Supprimer ${u.nom} ?`)) return;
    this.userSvc.delete(u._id).subscribe({
      next: () => {
        this.successMsg = 'Utilisateur supprimé.';
        this.load();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: () => { this.errorMsg = 'Suppression échouée.'; }
    });
  }

  closeModal() { this.showModal = false; }

  roleClass(r: string) {
    if (r === 'ADMIN')   return 'badge badge-danger';
    if (r === 'AGENT')   return 'badge badge-info';
    return 'badge badge-neutral';
  }

  initials(nom: string) {
    return (nom ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  }
}
