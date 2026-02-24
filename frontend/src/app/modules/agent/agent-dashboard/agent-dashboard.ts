import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AgentTourneeService } from '../../../core/services/agent-tournee.service';

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agent-dashboard.html',
  styleUrl: './agent-dashboard.scss',
})
export class AgentDashboard implements OnInit {

  tournees: any[] = [];
  loading = true;

  get currentUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : { name: 'Agent' };
  }

  get today() {
    return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  get tourneeDuJour() {
    const today = new Date().toISOString().split('T')[0];
    return this.tournees.find(t => t.date?.split('T')[0] === today);
  }

  get tourneesAVenir() {
    const today = new Date().toISOString().split('T')[0];
    return this.tournees.filter(t => t.date?.split('T')[0] > today && t.statut === 'Planifiée');
  }

  get tourneesTerminees() {
    return this.tournees.filter(t => t.statut === 'Terminée').length;
  }

  constructor(private svc: AgentTourneeService, private router: Router) {}

  ngOnInit() {
    this.svc.getMesTournees().subscribe({
      next: r => { this.tournees = r.data ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  goToTournee(id: string) {
    this.router.navigate(['/agent/tournee', id]);
  }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  statutClass(s: string) {
    if (s === 'En cours')  return 'badge badge-info';
    if (s === 'Planifiée') return 'badge badge-warning';
    if (s === 'Terminée')  return 'badge badge-success';
    if (s === 'Annulée')   return 'badge badge-danger';
    return 'badge badge-neutral';
  }
}
