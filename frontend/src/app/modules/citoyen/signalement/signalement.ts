import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CitoyenService } from '../../../core/services/citoyen.service';

@Component({
  selector: 'app-signalement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signalement.html',
  styleUrl: './signalement.scss',
})
export class Signalement implements OnInit {

  zones: any[] = [];
  loading     = false;
  successMsg  = '';
  errorMsg    = '';

  typeOptions = [
    { value: 'Ordures non collectées',    icon: 'trash',   label: 'Ordures non collectées'    },
    { value: 'Dépôt sauvage',             icon: 'alert',   label: 'Dépôt sauvage'             },
    { value: 'Bac plein ou débordant',    icon: 'package', label: 'Bac plein ou débordant'    },
    { value: 'Bac cassé ou manquant',     icon: 'tool',    label: 'Bac cassé ou manquant'     },
    { value: 'Mauvaise odeur persistante',icon: 'wind',    label: 'Mauvaise odeur persistante'},
    { value: 'Autre problème',            icon: 'more',    label: 'Autre problème'            },
  ];

  form = {
    type:        '',
    zoneId:      '',
    quartier:    '',
    description: '',
  };

  constructor(private svc: CitoyenService, private router: Router) {}

  ngOnInit() {
    this.svc.getZones().subscribe({ next: r => { this.zones = r.data ?? []; } });
  }

  selectType(v: string) { this.form.type = v; }

  soumettre() {
    if (!this.form.type) {
      this.errorMsg = 'Veuillez sélectionner un type de problème.';
      return;
    }
    if (!this.form.description.trim()) {
      this.errorMsg = 'La description est requise.';
      return;
    }
    this.loading  = true;
    this.errorMsg = '';
    const payload: any = {
      type:        this.form.type,
      description: this.form.description,
    };
    if (this.form.zoneId)   payload.zoneId   = this.form.zoneId;
    if (this.form.quartier) payload.quartier = this.form.quartier;

    this.svc.createPlainte(payload).subscribe({
      next: () => {
        this.loading     = false;
        this.successMsg  = 'Votre signalement a bien été envoyé ! Vous pouvez suivre son évolution dans l\'onglet "Mes signalements".';
        this.form        = { type: '', zoneId: '', quartier: '', description: '' };
        setTimeout(() => { this.successMsg = ''; this.router.navigate(['/citoyen/signalements']); }, 3000);
      },
      error: err => {
        this.loading  = false;
        this.errorMsg = err?.error?.message || 'Erreur lors de l\'envoi du signalement.';
      }
    });
  }
}
