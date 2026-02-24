import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitoyenService } from '../../../core/services/citoyen.service';

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './planning.html',
  styleUrl: './planning.scss',
})
export class Planning implements OnInit {

  tournees: any[] = [];
  zones: any[]    = [];
  loading         = true;
  filterZone      = '';

  get today() { return new Date().toISOString().split('T')[0]; }

  get filtered() {
    return this.filterZone
      ? this.tournees.filter(t => t.zoneId?._id === this.filterZone)
      : this.tournees;
  }

  get upcoming() {
    return this.filtered
      .filter(t => t.date?.split('T')[0] >= this.today && t.statut !== 'Annulée')
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  get inProgress() {
    return this.filtered.filter(t => t.statut === 'En cours');
  }

  get past() {
    return this.filtered
      .filter(t => t.date?.split('T')[0] < this.today)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8);
  }

  constructor(private svc: CitoyenService) {}

  ngOnInit() {
    this.svc.getTournees().subscribe({
      next: r => { this.tournees = r.data ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
    this.svc.getZones().subscribe({ next: r => { this.zones = r.data ?? []; } });
  }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  formatDateShort(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short',
    });
  }

  isToday(d: string) {
    return d?.split('T')[0] === this.today;
  }

  isTomorrow(d: string) {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    return d?.split('T')[0] === tom.toISOString().split('T')[0];
  }

  dayLabel(d: string) {
    if (this.isToday(d))    return 'Aujourd\'hui';
    if (this.isTomorrow(d)) return 'Demain';
    return this.formatDate(d);
  }

  statutClass(s: string) {
    if (s === 'Terminée')  return 'badge badge-success';
    if (s === 'En cours')  return 'badge badge-info';
    if (s === 'Planifiée') return 'badge badge-warning';
    if (s === 'Annulée')   return 'badge badge-danger';
    return 'badge badge-neutral';
  }
}
