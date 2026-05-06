import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PerformanceService }   from '../../../core/services/performance.service';
import { DecaissementService }  from '../../../core/services/decaissement.service';
import { ToastService }         from '../../../core/services/toast.service';
import { ModalComponent }       from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-gestion-primes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalComponent],
  templateUrl: './gestion-primes.html',
  styleUrl: './gestion-primes.scss',
})
export class GestionPrimes implements OnInit {

  // ── Sélecteur mois/année ─────────────────────────────────────────────────
  mois  = new Date().getMonth() + 1;
  annee = new Date().getFullYear();
  moisListe = [
    { val: 1, label: 'Janvier' }, { val: 2,  label: 'Février' },
    { val: 3, label: 'Mars' },    { val: 4,  label: 'Avril' },
    { val: 5, label: 'Mai' },     { val: 6,  label: 'Juin' },
    { val: 7, label: 'Juillet' }, { val: 8,  label: 'Août' },
    { val: 9, label: 'Septembre'},{ val: 10, label: 'Octobre' },
    { val: 11,label: 'Novembre' },{ val: 12, label: 'Décembre' },
  ];
  anneeListe: number[] = [];

  // ── Données ──────────────────────────────────────────────────────────────
  loading      = false;
  performances: any[]  = [];
  totaux:       any    = {};
  meilleureEquipe: any = null;

  // ── Configuration primes ─────────────────────────────────────────────────
  config    = { primeParTournee: 5000, primeParCollecte: 500 };
  editConfig = false;
  savingConfig = false;
  configForm = { primeParTournee: 5000, primeParCollecte: 500 };

  // ── Décaissements ────────────────────────────────────────────────────────
  decaissements:    any[]  = [];
  loadingDec        = false;
  showDecModal      = false;
  savingDec         = false;
  decForm: any      = {};
  selectedPerf:     any   = null;
  markingId:        string | null = null;

  // ── Première charge (skeleton vs overlay) ────────────────────────────────
  isFirstLoad    = true;
  isFirstLoadDec = true;

  constructor(
    private perfSvc: PerformanceService,
    private decSvc:  DecaissementService,
    private toast:   ToastService,
  ) {}

  ngOnInit() {
    const cur = new Date().getFullYear();
    this.anneeListe = Array.from({ length: 5 }, (_, i) => cur - i);
    this.load();
    this.loadDecaissements();
  }

  // ── Décaissements ────────────────────────────────────────────────────────

  loadDecaissements() {
    this.loadingDec = true;
    this.decSvc.getAll({ mois: this.mois, annee: this.annee }).pipe(
      finalize(() => { this.loadingDec = false; this.isFirstLoadDec = false; })
    ).subscribe({
      next: r => { this.decaissements = r?.data ?? []; },
      error: () => {}
    });
  }

  openDecModal(p: any) {
    this.selectedPerf = p;
    this.decForm = {
      equipeId: p.equipe._id,
      mois:     this.mois,
      annee:    this.annee,
      montant:  p.montantPrime,
      note:     '',
    };
    this.showDecModal = true;
  }

  createDecaissement() {
    this.savingDec = true;
    this.decSvc.create(this.decForm).pipe(
      finalize(() => this.savingDec = false)
    ).subscribe({
      next: () => {
        this.showDecModal = false;
        this.toast.success('Décaissement créé', 'La prime a été mise en attente de paiement.');
        this.loadDecaissements();
      },
      error: () => this.toast.error('Erreur', 'Impossible de créer le décaissement.')
    });
  }

  markDecaisse(d: any) {
    this.markingId = d._id;
    this.decSvc.updateStatut(d._id, 'Décaissé').pipe(
      finalize(() => this.markingId = null)
    ).subscribe({
      next: () => {
        this.toast.success('Payé', `Prime de l'équipe ${d.equipeId?.nom} marquée comme décaissée.`);
        this.loadDecaissements();
      },
      error: () => this.toast.error('Erreur', 'Impossible de mettre à jour.')
    });
  }

  markAnnule(d: any) {
    this.markingId = d._id;
    this.decSvc.updateStatut(d._id, 'Annulé').pipe(
      finalize(() => this.markingId = null)
    ).subscribe({
      next: () => {
        this.toast.success('Annulé', 'Le décaissement a été annulé.');
        this.loadDecaissements();
      },
      error: () => {}
    });
  }

  decStatutClass(s: string): string {
    if (s === 'Décaissé')   return 'badge-dec-paid';
    if (s === 'En attente') return 'badge-dec-wait';
    if (s === 'Annulé')     return 'badge-dec-cancel';
    return '';
  }

  alreadyDecaissed(equipeId: string): boolean {
    return this.decaissements.some(
      d => d.equipeId?._id === equipeId && d.statut !== 'Annulé'
    );
  }

  load() {
    this.loading = true;
    this.perfSvc.getPerformances(this.mois, this.annee).pipe(
      finalize(() => { this.loading = false; this.isFirstLoad = false; })
    ).subscribe({
      next: r => {
        const d = r?.data ?? {};
        this.performances    = d.performances ?? [];
        this.totaux          = d.totaux ?? {};
        this.config          = d.config ?? this.config;
        this.meilleureEquipe = this.performances.find(p => p.rang === 1 && p.score > 0) ?? null;
      },
      error: () => this.toast.error('Erreur', 'Impossible de charger les performances.')
    });
  }

  openEditConfig() {
    this.configForm = { ...this.config };
    this.editConfig = true;
  }

  saveConfig() {
    this.savingConfig = true;
    this.perfSvc.updateConfig(this.configForm).pipe(
      finalize(() => this.savingConfig = false)
    ).subscribe({
      next: r => {
        this.config    = r?.data ?? this.configForm;
        this.editConfig = false;
        this.toast.success('Enregistré', 'Taux de primes mis à jour.');
        this.load();  // recalculer avec nouveaux taux
      },
      error: () => this.toast.error('Erreur', 'La sauvegarde a échoué.')
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  badgeClass(badge: string | null): string {
    if (badge === 'Meilleure équipe du mois') return 'badge-gold';
    if (badge === 'Très performante')         return 'badge-silver';
    if (badge === 'Bonne performance')        return 'badge-bronze';
    return '';
  }

  badgeIcon(badge: string | null): string {
    if (badge === 'Meilleure équipe du mois') return '🏆';
    if (badge === 'Très performante')         return '🥈';
    if (badge === 'Bonne performance')        return '🥉';
    return '';
  }

  stars(note: number): string[] {
    const full  = Math.floor(note);
    const half  = note - full >= 0.3 ? 1 : 0;
    const empty = 5 - full - half;
    return [
      ...Array(full).fill('full'),
      ...Array(half).fill('half'),
      ...Array(empty).fill('empty'),
    ];
  }

  noteClass(note: number): string {
    if (note >= 4) return 'note-excellent';
    if (note >= 3) return 'note-good';
    if (note >= 2) return 'note-average';
    if (note >  0) return 'note-low';
    return 'note-none';
  }

  formatMontant(n: number): string {
    return n.toLocaleString('fr-FR') + ' FCFA';
  }

  get moisLabel(): string {
    return this.moisListe.find(m => m.val === this.mois)?.label ?? '';
  }
}
