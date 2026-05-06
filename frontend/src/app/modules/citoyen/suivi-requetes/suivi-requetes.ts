import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { Router } from '@angular/router';
import { CitoyenService } from '../../../core/services/citoyen.service';

@Component({
  selector: 'app-suivi-requetes',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './suivi-requetes.html',
  styleUrl: './suivi-requetes.scss',
})
export class SuiviRequetes implements OnInit {

  plaintes: any[] = [];
  filtered: any[] = [];
  loading         = true;
  filterStatut    = '';
  selectedPlainte: any = {};

  get stats() {
    return {
      total:     this.plaintes.length,
      enAttente: this.plaintes.filter(p => p.statut === 'En attente').length,
      enCours:   this.plaintes.filter(p => p.statut === 'En cours').length,
      resolues:  this.plaintes.filter(p => p.statut === 'Résolue').length,
    };
  }

  constructor(private svc: CitoyenService, private router: Router) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.svc.getMesPlaintes().subscribe({
      next: r => {
        this.plaintes = r.data ?? [];
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  setFilter(s: string) {
    this.filterStatut = s;
    this.applyFilter();
  }

  applyFilter() {
    this.filtered = this.filterStatut
      ? this.plaintes.filter(p => p.statut === this.filterStatut)
      : [...this.plaintes];
  }

  openDetail(p: any) { this.selectedPlainte = p; }
  closeDetail()      { this.selectedPlainte = null; }

  statutClass(s: string) {
    if (s === 'Résolue')    return 'badge badge-success';
    if (s === 'En cours')   return 'badge badge-info';
    if (s === 'En attente') return 'badge badge-warning';
    return 'badge badge-neutral';
  }

  stepActive(plainte: any, step: number) {
    const steps: Record<string, number> = { 'En attente': 1, 'En cours': 2, 'Résolue': 3 };
    return (steps[plainte.statut] ?? 0) >= step;
  }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  formatDateShort(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  goNouveau() { this.router.navigate(['/citoyen/nouveau']); }
}
