import { Component, OnInit, OnDestroy, ViewChild, ElementRef, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { BacService }    from '../../../core/services/bac.service';
import { ZoneService }   from '../../../core/services/zone.service';
import { ToastService }  from '../../../core/services/toast.service';
import { ConfirmService }from '../../../core/services/confirm.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { environment }   from '../../../../environments/environment';

declare var google: any;

@Component({
  selector: 'app-gestion-bacs',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './gestion-bacs.html',
  styleUrl: './gestion-bacs.scss',
})
export class GestionBacs implements OnInit, OnDestroy {

  @ViewChild('miniMap') miniMapEl?: ElementRef<HTMLDivElement>;
  private platformId   = inject(PLATFORM_ID);
  private miniMapInst: any = null;
  private miniMarker:  any = null;

  bacs:     any[] = [];
  filtered: any[] = [];
  zones:    any[] = [];
  loading   = true;
  saving    = false;
  search    = '';

  showModal = false;
  isEdit    = false;
  editId: string | null = null;

  form: any = {
    codeBac:           '',
    latitude:          '',
    longitude:         '',
    zoneId:            '',
    capacite:          1000,
    niveauRemplissage: 0,
  };

  // Modal mise à jour du niveau
  showNiveauModal    = false;
  bacSelectionne: any = null;
  nouveauNiveau       = 0;
  niveauLoading       = false;

  constructor(
    private bacSvc:     BacService,
    private zoneSvc:    ZoneService,
    private toast:      ToastService,
    private confirmSvc: ConfirmService,
  ) {}

  ngOnInit() {
    this.zoneSvc.getAll().subscribe({ next: r => { this.zones = r.data ?? []; } });
    this.load();
  }

  ngOnDestroy() {
    this.destroyMiniMap();
  }

  load() {
    this.loading = true;
    this.bacSvc.getAll().pipe(finalize(() => this.loading = false)).subscribe({
      next: r => { this.bacs = r.data ?? []; this.applyFilter(); },
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.bacs.filter(b =>
      b.codeBac?.toLowerCase().includes(q) ||
      b.zoneId?.nom?.toLowerCase().includes(q)
    );
  }

  openCreate() {
    this.isEdit = false; this.editId = null;
    this.form = { codeBac: '', latitude: '', longitude: '', zoneId: '', capacite: 1000, niveauRemplissage: 0 };
    this.showModal = true;
    // Douala comme centre par défaut — pas de marker initial
    setTimeout(() => this.initMiniMap(4.0511, 9.7679, null, null), 80);
  }

  openEdit(b: any) {
    this.isEdit = true; this.editId = b._id;
    this.form = {
      codeBac:           b.codeBac,
      latitude:          b.latitude,
      longitude:         b.longitude,
      zoneId:            b.zoneId?._id ?? b.zoneId ?? '',
      capacite:          b.capacite,
      niveauRemplissage: b.niveauRemplissage,
    };
    this.showModal = true;
    // Centrer sur la position existante du bac
    const lat = b.latitude  || 4.0511;
    const lng = b.longitude || 9.7679;
    setTimeout(() => this.initMiniMap(lat, lng, b.latitude || null, b.longitude || null), 80);
  }

  closeModal() {
    this.showModal = false;
    this.destroyMiniMap();
  }

  private async initMiniMap(centerLat: number, centerLng: number, markerLat: number | null, markerLng: number | null) {
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
      this.form.latitude  = +(lat.toFixed(6));
      this.form.longitude = +(lng.toFixed(6));
    };

    const addDragListener = (marker: any) => {
      google.maps.event.addListener(marker, 'dragend', () => {
        const p = marker.getPosition();
        updateForm(p.lat(), p.lng());
      });
    };

    // Placer marker si position existante (mode édition)
    if (markerLat !== null && markerLng !== null) {
      this.miniMarker = new google.maps.Marker({
        position: { lat: markerLat, lng: markerLng },
        map, draggable: true,
      });
      addDragListener(this.miniMarker);
    }

    // Clic → place ou déplace le marker
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
      const cbName = '__gmBacsInit';
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
    if (!this.form.codeBac?.trim()) {
      this.toast.error('Champ requis', 'Le code du bac est obligatoire.');
      return;
    }
    if (!this.form.latitude || !this.form.longitude) {
      this.toast.error('Coordonnées requises', 'Latitude et longitude sont obligatoires.');
      return;
    }
    this.saving = true;
    const obs = this.isEdit
      ? this.bacSvc.update(this.editId!, this.form)
      : this.bacSvc.create(this.form);

    obs.subscribe({
      next: () => {
        this.saving = false; this.showModal = false;
        this.toast.success(
          this.isEdit ? 'Bac modifié' : 'Bac créé',
          `Le bac "${this.form.codeBac}" a été ${this.isEdit ? 'mis à jour' : 'ajouté'}.`
        );
        this.load();
      },
      error: (e: any) => {
        this.saving = false;
        this.toast.error('Erreur', e?.error?.message ?? 'Une erreur est survenue.');
      }
    });
  }

  async delete(b: any) {
    const ok = await this.confirmSvc.open({
      title:        'Supprimer le bac',
      message:      `Supprimer le bac "${b.codeBac}" ?`,
      confirmLabel: 'Supprimer',
      danger:       true,
    });
    if (!ok) return;
    this.bacSvc.delete(b._id).subscribe({
      next: () => { this.toast.success('Supprimé', `Bac "${b.codeBac}" supprimé.`); this.load(); },
      error: () => { this.toast.error('Erreur', 'La suppression a échoué.'); }
    });
  }

  openNiveau(b: any) {
    this.bacSelectionne = b;
    this.nouveauNiveau  = b.niveauRemplissage;
    this.showNiveauModal = true;
  }

  saveNiveau() {
    if (!this.bacSelectionne) return;
    this.niveauLoading = true;
    this.bacSvc.updateNiveau(this.bacSelectionne._id, this.nouveauNiveau).subscribe({
      next: () => {
        this.niveauLoading   = false;
        this.showNiveauModal = false;
        this.toast.success('Niveau mis à jour', `Bac ${this.bacSelectionne.codeBac} : ${this.nouveauNiveau}%`);
        this.load();
      },
      error: (e: any) => {
        this.niveauLoading = false;
        this.toast.error('Erreur', e?.error?.message ?? 'Erreur.');
      }
    });
  }

  statutClass(statut: string) {
    if (statut === 'Plein')  return 'badge badge-danger';
    if (statut === 'Moyen')  return 'badge badge-warning';
    return 'badge badge-success';
  }

  niveauBarColor(n: number) {
    if (n >= 80) return '#ef4444';
    if (n >= 40) return '#f59e0b';
    return '#22c55e';
  }
}
