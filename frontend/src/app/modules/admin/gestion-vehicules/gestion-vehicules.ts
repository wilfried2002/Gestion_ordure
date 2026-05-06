import { Component, OnInit, OnDestroy, ViewChild, ElementRef, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { finalize } from 'rxjs';
import { VehiculeService } from '../../../core/services/vehicule';
import { ToastService }    from '../../../core/services/toast.service';
import { ConfirmService }  from '../../../core/services/confirm.service';
import { environment }     from '../../../../environments/environment';

declare var google: any;

@Component({
  selector: 'app-gestion-vehicules',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './gestion-vehicules.html',
  styleUrl: './gestion-vehicules.scss',
})
export class GestionVehicules implements OnInit, OnDestroy {

  @ViewChild('miniMapVehicule') miniMapEl?: ElementRef<HTMLDivElement>;
  private platformId   = inject(PLATFORM_ID);
  private miniMapInst: any = null;
  private miniMarker:  any = null;

  vehicules: any[] = [];
  filtered:  any[] = [];
  loading = true;
  search  = '';

  showModal = false;
  isEdit    = false;
  saving    = false;

  form: any = {
    immatriculation: '', type: 'Camion-benne', capacite: '', statut: 'Disponible',
    marque: '', annee: '', localisationGPS: { lat: '', lng: '' },
  };
  editId: string | null = null;

  types   = ['Camion-benne', 'Compacteur', 'Benne basculante', 'Motocycle', 'Autre'];
  statuts = ['Disponible', 'En tournée', 'En panne'];

  constructor(
    private vehiculeSvc: VehiculeService,
    private toast:       ToastService,
    private confirmSvc:  ConfirmService,
  ) {}

  ngOnInit() { this.load(); }

  ngOnDestroy() { this.destroyMiniMap(); }

  load() {
    this.loading = true;
    this.vehiculeSvc.getAll().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: r  => { this.vehicules = r?.data ?? (Array.isArray(r) ? r : []); this.applyFilter(); },
      error: () => {}
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.vehicules.filter(v =>
      v.immatriculation?.toLowerCase().includes(q) ||
      v.type?.toLowerCase().includes(q) ||
      v.statut?.toLowerCase().includes(q) ||
      v.marque?.toLowerCase().includes(q)
    );
  }

  openCreate() {
    this.isEdit = false; this.editId = null;
    this.form = {
      immatriculation: '', type: 'Camion-benne', capacite: '', statut: 'Disponible',
      marque: '', annee: '', localisationGPS: { lat: '', lng: '' },
    };
    this.showModal = true;
    setTimeout(() => this.initMiniMap(4.0511, 9.7679, null, null), 80);
  }

  openEdit(v: any) {
    this.isEdit = true; this.editId = v._id;
    const lat = v.localisationGPS?.lat || null;
    const lng = v.localisationGPS?.lng || null;
    this.form = {
      immatriculation: v.immatriculation, type: v.type,
      capacite: v.capacite, statut: v.statut, marque: v.marque ?? '', annee: v.annee ?? '',
      localisationGPS: { lat: lat ?? '', lng: lng ?? '' },
    };
    this.showModal = true;
    const centerLat = lat || 4.0511;
    const centerLng = lng || 9.7679;
    setTimeout(() => this.initMiniMap(centerLat, centerLng, lat, lng), 80);
  }

  closeModal() {
    this.showModal = false;
    this.destroyMiniMap();
  }

  private async initMiniMap(
    centerLat: number, centerLng: number,
    markerLat: number | null, markerLng: number | null,
  ) {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.miniMapEl?.nativeElement) return;

    this.destroyMiniMap();
    await this.loadGoogleMapsApi();

    const map = new google.maps.Map(this.miniMapEl.nativeElement, {
      center:            { lat: centerLat, lng: centerLng },
      zoom:              14,
      streetViewControl: false,
      mapTypeControl:    false,
      fullscreenControl: false,
    });
    this.miniMapInst = map;

    const updateForm = (lat: number, lng: number) => {
      this.form.localisationGPS.lat = +(lat.toFixed(6));
      this.form.localisationGPS.lng = +(lng.toFixed(6));
    };

    const addDragListener = (marker: any) => {
      google.maps.event.addListener(marker, 'dragend', () => {
        const p = marker.getPosition();
        updateForm(p.lat(), p.lng());
      });
    };

    if (markerLat !== null && markerLng !== null) {
      this.miniMarker = new google.maps.Marker({
        position: { lat: markerLat, lng: markerLng },
        map, draggable: true,
      });
      addDragListener(this.miniMarker);
    }

    google.maps.event.addListener(map, 'click', (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      updateForm(lat, lng);

      if (this.miniMarker) {
        this.miniMarker.setPosition({ lat, lng });
      } else {
        this.miniMarker = new google.maps.Marker({ position: { lat, lng }, map, draggable: true });
        addDragListener(this.miniMarker);
      }
    });
  }

  private loadGoogleMapsApi(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps) { resolve(); return; }
      const cbName = '__gmVehiculesInit';
      (window as any)[cbName] = () => { delete (window as any)[cbName]; resolve(); };
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&callback=${cbName}&loading=async`;
      s.async = true;
      s.onerror = () => reject(new Error('Google Maps failed to load'));
      document.head.appendChild(s);
    });
  }

  private destroyMiniMap() {
    if (this.miniMapInst) {
      google.maps?.event?.clearInstanceListeners(this.miniMapInst);
      this.miniMapInst = null;
    }
    this.miniMarker = null;
  }

  save() {
    if (!this.form.immatriculation?.trim()) {
      this.toast.error('Champ requis', "L'immatriculation est obligatoire.");
      return;
    }
    this.saving = true;

    // Ne pas envoyer localisationGPS si les champs sont vides
    const payload: any = { ...this.form };
    if (!payload.localisationGPS?.lat || !payload.localisationGPS?.lng) {
      delete payload.localisationGPS;
    }

    const obs = this.isEdit
      ? this.vehiculeSvc.update(this.editId!, payload)
      : this.vehiculeSvc.create(payload);

    obs.subscribe({
      next: () => {
        this.saving = false; this.showModal = false;
        this.toast.success(
          this.isEdit ? 'Véhicule modifié' : 'Véhicule ajouté',
          `${this.form.immatriculation} a été ${this.isEdit ? 'mis à jour' : 'ajouté'}.`
        );
        this.load();
      },
      error: (e: any) => {
        this.saving = false;
        this.toast.error('Erreur', e?.error?.message ?? 'Une erreur est survenue.');
      }
    });
  }

  async delete(v: any) {
    const ok = await this.confirmSvc.open({
      title:        'Supprimer le véhicule',
      message:      `Supprimer définitivement ${v.immatriculation} ?`,
      confirmLabel: 'Supprimer',
      danger:       true,
    });
    if (!ok) return;
    this.vehiculeSvc.delete(v._id).subscribe({
      next: () => { this.toast.success('Supprimé', `${v.immatriculation} a été supprimé.`); this.load(); },
      error: () => { this.toast.error('Erreur', 'La suppression a échoué.'); }
    });
  }

  statutClass(s: string) {
    if (s === 'Disponible') return 'badge badge-success';
    if (s === 'En tournée') return 'badge badge-warning';
    if (s === 'En panne')   return 'badge badge-danger';
    return 'badge badge-neutral';
  }
}
