import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { UserService }    from '../../../core/services/user';
import { EquipeService }  from '../../../core/services/equipe.service';
import { ToastService }   from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-gestion-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-users.html',
  styleUrl: './gestion-users.scss',
})
export class GestionUsers implements OnInit {

  users:    any[] = [];
  filtered: any[] = [];
  equipes:  any[] = [];
  loading = true;
  search  = '';

  showModal = false;
  isEdit    = false;
  saving    = false;

  // Le backend attend "name" (pas "nom")
  form: any = { name: '', email: '', telephone: '', ville: 'Douala', role: 'CITOYEN', password: '', equipeId: '' };
  editId: string | null = null;

  roles  = ['ADMIN', 'AGENT', 'CITOYEN'];
  villes = ['Douala', 'Yaoundé', 'Bafoussam', 'Garoua', 'Maroua', 'Bamenda', 'Ngaoundéré', 'Bertoua', 'Ebolowa', 'Kumba'];

  constructor(
    private userSvc:    UserService,
    private equipeSvc:  EquipeService,
    private toast:      ToastService,
    private confirmSvc: ConfirmService,
  ) {}

  ngOnInit() { this.load(); this.loadEquipes(); }

  load() {
    this.loading = true;
    this.userSvc.getAll().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: r  => { this.users = r?.data ?? (Array.isArray(r) ? r : []); this.applyFilter(); },
      error: () => {}
    });
  }

  loadEquipes() {
    this.equipeSvc.getAll().subscribe({ next: r => { this.equipes = r.data ?? r ?? []; } });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }

  getEquipeAgent(userId: string): any {
    return this.equipes.find(e =>
      (e.membres ?? []).some((m: any) => (m._id ?? m) === userId)
    ) ?? null;
  }

  openCreate() {
    this.isEdit = false; this.editId = null;
    this.form   = { name: '', email: '', telephone: '', ville: 'Douala', role: 'CITOYEN', password: '', equipeId: '' };
    this.showModal = true;
  }

  openEdit(u: any) {
    this.isEdit = true; this.editId = u._id;
    const equipe = this.getEquipeAgent(u._id);
    this.form = { name: u.name, email: u.email, telephone: u.telephone ?? '',
                  ville: u.ville ?? 'Douala',
                  role: u.role, password: '', equipeId: equipe?._id ?? '' };
    this.showModal = true;
  }

  save() {
    if (!this.form.name?.trim())  { this.toast.error('Champ requis', 'Le nom est obligatoire.'); return; }
    if (!this.form.email?.trim()) { this.toast.error('Champ requis', "L'email est obligatoire."); return; }
    if (!this.isEdit && !this.form.password) { this.toast.error('Champ requis', 'Le mot de passe est obligatoire.'); return; }

    this.saving = true;
    const payload: any = { name: this.form.name, email: this.form.email,
                           telephone: this.form.telephone, ville: this.form.ville, role: this.form.role };
    if (this.form.password) payload.password = this.form.password;

    const obs = this.isEdit
      ? this.userSvc.update(this.editId!, payload)
      : this.userSvc.create(payload);

    obs.subscribe({
      next: (res: any) => {
        const userId = this.isEdit
          ? this.editId!
          : (res?.data?._id ?? res?._id ?? res?.user?._id ?? '');
        this.handleEquipeAssignment(userId, () => {
          this.saving = false; this.showModal = false;
          this.toast.success(
            this.isEdit ? 'Utilisateur modifié' : 'Utilisateur créé',
            this.isEdit ? `${this.form.name} a été mis à jour.` : `${this.form.name} a été ajouté.`
          );
          this.load(); this.loadEquipes();
        });
      },
      error: (e: any) => {
        this.saving = false;
        this.toast.error('Erreur', e?.error?.message ?? 'Une erreur est survenue.');
      },
    });
  }

  private handleEquipeAssignment(userId: string, onDone: () => void) {
    if (this.form.role !== 'AGENT' || !userId) { onDone(); return; }
    const oldEquipe   = this.getEquipeAgent(userId);
    const newEquipeId = this.form.equipeId;
    const oldEquipeId = oldEquipe?._id ?? '';
    if (oldEquipeId === newEquipeId) { onDone(); return; }
    const doAdd = () => {
      if (newEquipeId) {
        this.equipeSvc.addMembre(newEquipeId, userId).subscribe({ next: onDone, error: onDone });
      } else { onDone(); }
    };
    if (oldEquipeId) {
      this.equipeSvc.removeMembre(oldEquipeId, userId).subscribe({ next: doAdd, error: doAdd });
    } else { doAdd(); }
  }

  async delete(u: any) {
    const ok = await this.confirmSvc.open({
      title:        'Supprimer l\'utilisateur',
      message:      `Voulez-vous supprimer définitivement le compte de ${u.name} ?`,
      confirmLabel: 'Supprimer',
      danger:       true,
    });
    if (!ok) return;
    this.userSvc.delete(u._id).subscribe({
      next: () => { this.toast.success('Supprimé', `${u.name} a été supprimé.`); this.load(); },
      error: () => { this.toast.error('Erreur', 'La suppression a échoué.'); }
    });
  }

  closeModal() { this.showModal = false; }

  roleClass(r: string) {
    if (r === 'ADMIN') return 'badge badge-danger';
    if (r === 'AGENT') return 'badge badge-info';
    return 'badge badge-neutral';
  }

  initials(name: string) {
    return (name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  }
}
