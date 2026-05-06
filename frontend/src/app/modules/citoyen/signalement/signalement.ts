import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CitoyenService } from '../../../core/services/citoyen.service';
import { ToastService } from '../../../core/services/toast.service';

interface CapturedPhoto {
  dataUrl:    string;
  blob:       Blob;
  capturedAt: string; // ISO timestamp de la prise de vue
}

@Component({
  selector: 'app-signalement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signalement.html',
  styleUrl: './signalement.scss',
})
export class Signalement implements OnInit, OnDestroy {

  zones: any[] = [];
  loading     = false;
  successMsg  = '';
  errorMsg    = '';

  // Photos capturées en temps réel
  capturedPhotos: CapturedPhoto[] = [];
  readonly MAX_PHOTOS = 3;

  // État de la caméra
  cameraOpen   = false;
  cameraError  = '';
  capturing    = false;   // flash visuel lors de la capture
  private stream: MediaStream | null = null;

  @ViewChild('videoEl')  videoEl!:  ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;

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

  constructor(private svc: CitoyenService, private router: Router, private toast: ToastService) {}

  ngOnInit() {
    this.svc.getZones().subscribe({ next: r => { this.zones = r.data ?? []; } });
  }

  ngOnDestroy() { this.stopCamera(); }

  selectType(v: string) { this.form.type = v; }

  // ── Caméra ────────────────────────────────────────────────────────────────

  async openCamera() {
    if (this.capturedPhotos.length >= this.MAX_PHOTOS) return;
    this.cameraError = '';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      this.cameraOpen = true;
      // Attendre que la vue se mette à jour, puis injecter le flux dans le <video>
      setTimeout(() => {
        const vid = this.videoEl?.nativeElement;
        if (vid) { vid.srcObject = this.stream; vid.play(); }
      }, 80);
    } catch {
      this.cameraError = 'Impossible d\'accéder à la caméra. Vérifiez les permissions du navigateur.';
    }
  }

  capturePhoto() {
    const video  = this.videoEl?.nativeElement;
    const canvas = this.canvasEl?.nativeElement;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // ── Filigrane horodatage ──────────────────────────────────────────────
    const now = new Date();
    const ts  = now.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });
    const fs  = Math.max(13, Math.floor(canvas.width / 50));
    ctx.font = `bold ${fs}px Arial`;
    const tw = ctx.measureText(ts).width;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(6, canvas.height - fs * 2 - 6, tw + 16, fs * 2 + 4);
    ctx.fillStyle = '#fff';
    ctx.fillText(ts, 14, canvas.height - fs / 2 - 4);
    // ─────────────────────────────────────────────────────────────────────

    const capturedAt = now.toISOString();

    // Flash visuel
    this.capturing = true;
    setTimeout(() => { this.capturing = false; }, 150);

    canvas.toBlob(blob => {
      if (!blob) return;
      this.capturedPhotos.push({
        dataUrl: canvas.toDataURL('image/jpeg', 0.88),
        blob,
        capturedAt,
      });
      this.stopCamera();
    }, 'image/jpeg', 0.88);
  }

  stopCamera() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream     = null;
    this.cameraOpen = false;
  }

  removePhoto(index: number) {
    this.capturedPhotos.splice(index, 1);
  }

  // ── Soumission ────────────────────────────────────────────────────────────

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

    const fd = new FormData();
    fd.append('type',        this.form.type);
    fd.append('description', this.form.description);
    if (this.form.zoneId)   fd.append('zoneId',   this.form.zoneId);
    if (this.form.quartier) fd.append('quartier', this.form.quartier);

    // Photos temps-réel + horodatage de capture (référence = photo la plus ancienne)
    if (this.capturedPhotos.length > 0) {
      fd.append('capturedAt', this.capturedPhotos[0].capturedAt);
      this.capturedPhotos.forEach((p, i) =>
        fd.append('photos', p.blob, `photo-${i + 1}.jpg`)
      );
    }

    this.svc.createPlainte(fd).subscribe({
      next: () => {
        this.loading        = false;
        this.successMsg     = 'Votre signalement a bien été envoyé !';
        this.capturedPhotos = [];
        this.toast.success(
          'Signalement envoyé',
          'Suivez son évolution dans l\'onglet "Mes signalements".'
        );
        this.form = { type: '', zoneId: '', quartier: '', description: '' };
        setTimeout(() => { this.successMsg = ''; this.router.navigate(['/citoyen/signalements']); }, 2500);
      },
      error: err => {
        this.loading  = false;
        this.errorMsg = err?.error?.message || 'Erreur lors de l\'envoi du signalement.';
        this.toast.error('Échec de l\'envoi', this.errorMsg);
      }
    });
  }
}
