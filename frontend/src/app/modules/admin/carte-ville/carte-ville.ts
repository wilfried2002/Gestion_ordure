import {
  Component, OnInit, OnDestroy,
  AfterViewInit, ElementRef, ViewChild,
  PLATFORM_ID, inject, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BacService }         from '../../../core/services/bac.service';
import { VehiculeService }    from '../../../core/services/vehicule';
import { ZoneService }        from '../../../core/services/zone.service';
import { TourneeService }     from '../../../core/services/tournee';
import { SocketService }      from '../../../core/services/socket.service';
import { NavigationService }  from '../../../core/services/navigation.service';
import { Subscription, finalize, firstValueFrom } from 'rxjs';
import { environment }        from '../../../../environments/environment';

declare var google: any;

@Component({
  selector: 'app-carte-ville',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './carte-ville.html',
  styleUrl: './carte-ville.scss',
})
export class CarteVille implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;
  private platformId = inject(PLATFORM_ID);

  // ── Carte Google Maps ─────────────────────────────────────────────────────
  private map:             any                   = null;
  private bacMarkers:      Map<string, any>      = new Map();
  private vehiculeMarkers: Map<string, any>      = new Map();
  private routePolyline:   any                   = null;
  private routeStepMarkers: any[]                = [];
  private infoWindow:      any                   = null;

  // ── Données ───────────────────────────────────────────────────────────────
  bacs:       any[] = [];
  vehicules:  any[] = [];
  zones:      any[] = [];
  private vehiculeIdsActifs: Set<string> = new Set();
  statsBacs: any = { total: 0, pleins: 0, moyens: 0, vides: 0 };

  // ── Filtres ───────────────────────────────────────────────────────────────
  filtreStatut  = '';
  filtreZoneId  = '';
  afficherBacs      = true;
  afficherVehicules = true;
  afficherRoute     = true;

  // ── Optimisation tournée ──────────────────────────────────────────────────
  niveauMin  = 0;
  tourneeResult: any = null;
  tourneeLoading    = false;
  noGpsCount        = 0;

  // ── Optimisation Dijkstra ─────────────────────────────────────────────────
  criterium: 'distance' | 'temps' | 'priorite' = 'distance';
  dijkstraResult: any    = null;
  dijkstraLoading        = false;
  positionCamion: { lat: number; lng: number } | null = null;
  private dijkstraPolylines: any[]  = [];
  private dijkstraMarkers:   any[]  = [];

  // ── Suivi véhicule temps-réel ─────────────────────────────────────────────
  private socketSub: Subscription | null = null;

  // ── Simulation véhicule (démo investisseurs) ──────────────────────────────
  simVehiculeActif    = false;
  simVehiculeEtape    = '';
  private simVehiculeTimers: any[] = [];

  loading  = true;
  errorMsg = '';

  constructor(
    private bacSvc:      BacService,
    private vehiculeSvc: VehiculeService,
    private zoneSvc:     ZoneService,
    private tourneeSvc:  TourneeService,
    private socket:      SocketService,
    private navSvc:      NavigationService,
    private cdr:         ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.zoneSvc.getAll().subscribe({ next: r => { this.zones = r.data ?? []; } });
    this.bacSvc.getStats().subscribe({ next: r => { this.statsBacs = r.data; } });
  }

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.initMap();
      this.loadData();
    }
  }

  ngOnDestroy() {
    this.stopperSimVehicule();
    this.socketSub?.unsubscribe();
    this.map = null;
  }

  // ── Initialisation Google Maps ────────────────────────────────────────────
  private async initMap() {
    await this.loadGoogleMapsApi();

    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center:            { lat: 4.0511, lng: 9.7679 },
      zoom:              13,
      mapTypeId:         'roadmap',
      streetViewControl: false,
      mapTypeControl:    true,
      fullscreenControl: true,
    });

    this.infoWindow = new google.maps.InfoWindow();

    this.socket.connect();
    this.socketSub = this.socket.vehiculePosition$.subscribe(data => {
      this.updateVehiculeMarker(data);
    });
  }

  private loadGoogleMapsApi(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps) { resolve(); return; }
      const cbName = '__gmCarteInit';
      (window as any)[cbName] = () => { delete (window as any)[cbName]; resolve(); };
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&callback=${cbName}&loading=async`;
      s.async = true;
      s.onerror = () => reject(new Error('Google Maps API failed to load'));
      document.head.appendChild(s);
    });
  }

  // ── Chargement des données ────────────────────────────────────────────────
  loadData() {
    this.loading = true;
    const filter: any = {};
    if (this.filtreStatut) filter.statut  = this.filtreStatut;
    if (this.filtreZoneId) filter.zoneId  = this.filtreZoneId;

    Promise.all([
      firstValueFrom(this.bacSvc.getAll(filter)),
      firstValueFrom(this.vehiculeSvc.getAll()),
      firstValueFrom(this.tourneeSvc.getAll()),
    ]).then(([bacsRes, vehuRes, tourneesRes]) => {
      this.bacs      = bacsRes?.data      ?? [];
      this.vehicules = vehuRes?.data ?? vehuRes ?? [];

      const tournees: any[] = tourneesRes?.data ?? [];
      this.vehiculeIdsActifs = new Set(
        tournees
          .filter(t => t.statut === 'Planifiée' || t.statut === 'En cours')
          .map(t => t.vehiculeId?._id ?? t.vehiculeId)
          .filter(Boolean)
      );

      this.loading = false;
      if (this.map) this.renderMarkers();
    }).catch(() => {
      this.loading  = false;
      this.errorMsg = 'Erreur lors du chargement des données.';
    });
  }

  appliquerFiltres() { this.clearRoute(); this.tourneeResult = null; this.loadData(); }
  resetFiltres() { this.filtreStatut = ''; this.filtreZoneId = ''; this.appliquerFiltres(); }

  get bacsPleins() { return this.bacs.filter(b => b.niveauRemplissage >= 80).length; }
  get bacsMoyens() { return this.bacs.filter(b => b.niveauRemplissage >= 40 && b.niveauRemplissage < 80).length; }
  get bacsVides()  { return this.bacs.filter(b => b.niveauRemplissage < 40).length; }

  // ── Rendu des marqueurs ───────────────────────────────────────────────────
  private renderMarkers() {
    this.clearAllMarkers();
    if (this.afficherBacs)      this.renderBacs();
    if (this.afficherVehicules) this.renderVehicules();
    this.fitBoundsToMarkers();
  }

  private fitBoundsToMarkers() {
    if (!google?.maps || !this.map) return;
    const bounds = new google.maps.LatLngBounds();
    let count = 0;

    this.bacs.forEach(b => { if (b.latitude && b.longitude) { bounds.extend({ lat: b.latitude, lng: b.longitude }); count++; } });
    this.vehicules.forEach(v => {
      if (v.localisationGPS?.lat && v.localisationGPS?.lng) {
        bounds.extend({ lat: v.localisationGPS.lat, lng: v.localisationGPS.lng }); count++;
      }
    });

    if (count === 0) return;
    if (count === 1) { this.map.setCenter(bounds.getCenter()); this.map.setZoom(15); return; }
    this.map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }

  private renderBacs() {
    if (!google?.maps) return;

    this.bacs.forEach(bac => {
      if (!bac.latitude || !bac.longitude) return;

      const marker = new google.maps.Marker({
        position: { lat: bac.latitude, lng: bac.longitude },
        map:      this.map,
        icon:     this.bacIcon(bac.niveauRemplissage),
        title:    bac.codeBac,
        zIndex:   100,
      });

      marker.addListener('click', () => {
        this.infoWindow.setContent(this.bacPopupHtml(bac));
        this.infoWindow.open({ anchor: marker, map: this.map });
      });

      this.bacMarkers.set(bac._id, marker);
    });
  }

  private renderVehicules() {
    if (!google?.maps) return;

    const actifs = this.vehicules.filter(
      v => this.vehiculeIdsActifs.has(v._id?.toString()) || v.statut === 'En tournée'
    );
    this.noGpsCount = actifs.filter(v => !v.localisationGPS?.lat || !v.localisationGPS?.lng).length;

    actifs.forEach(v => {
      const gps    = v.localisationGPS;
      const hasGps = !!(gps?.lat && gps?.lng);
      const lat    = hasGps ? gps.lat : 4.0511;
      const lng    = hasGps ? gps.lng : 9.7679;

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map:      this.map,
        icon:     this.vehiculeIcon(v.immatriculation, hasGps),
        title:    v.immatriculation,
        zIndex:   200,
      });

      const popupContent = hasGps
        ? this.vehiculePopupHtml(v)
        : this.vehiculePopupHtml(v) + `<div style="color:#ef4444;font-size:.75rem;margin-top:6px;font-weight:600">⚠️ Position GPS non définie</div>`;

      marker.addListener('click', () => {
        this.infoWindow.setContent(popupContent);
        this.infoWindow.open({ anchor: marker, map: this.map });
      });

      this.vehiculeMarkers.set(v._id, marker);
    });
  }

  // ── Mise à jour temps-réel position véhicule ──────────────────────────────
  private updateVehiculeMarker(data: any) {
    if (!google?.maps || !this.map) return;

    const existing = this.vehiculeMarkers.get(data.vehiculeId);
    if (existing) {
      existing.setPosition({ lat: data.lat, lng: data.lng });
    } else {
      const marker = new google.maps.Marker({
        position: { lat: data.lat, lng: data.lng },
        map:      this.map,
        icon:     this.vehiculeIcon(data.immatriculation),
        title:    data.immatriculation,
        zIndex:   200,
      });
      marker.addListener('click', () => {
        this.infoWindow.setContent(
          `<div style="font-size:.85rem;line-height:1.5"><strong>${data.immatriculation}</strong><div>Lat: ${data.lat.toFixed(5)} — Lng: ${data.lng.toFixed(5)}</div></div>`
        );
        this.infoWindow.open({ anchor: marker, map: this.map });
      });
      this.vehiculeMarkers.set(data.vehiculeId, marker);
    }
  }

  // ── SVG Icons ─────────────────────────────────────────────────────────────
  private bacIcon(niveau: number, collecte = false) {
    const c = collecte ? '#9ca3af' : niveau >= 80 ? '#ef4444' : niveau >= 40 ? '#f59e0b' : '#22c55e';
    const label = collecte ? '✓' : `${niveau}%`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="68" viewBox="0 0 52 68">
      <circle cx="26" cy="26" r="23" fill="${c}" stroke="white" stroke-width="3"/>
      <text x="26" y="31" font-family="Arial,sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${label}</text>
      <polygon points="15,47 37,47 26,65" fill="${c}"/>
    </svg>`;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(52, 68),
      anchor:     new google.maps.Point(26, 65),
    };
  }

  private vehiculeIcon(immat: string, hasGps = true) {
    const c     = hasGps ? '#f97316' : '#6b7280';
    const label = immat.substring(0, 9);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <rect x="2" y="2" width="76" height="52" rx="11" fill="${c}" stroke="white" stroke-width="3"/>
      <text x="40" y="24" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="white" text-anchor="middle">CAMION</text>
      <text x="40" y="40" font-family="Arial,sans-serif" font-size="10" fill="white" text-anchor="middle">${label}</text>
      <polygon points="28,53 52,53 40,70" fill="${c}"/>
    </svg>`;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(80, 80),
      anchor:     new google.maps.Point(40, 70),
    };
  }

  private stepIcon(num: number, color = '#ef4444') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="15" fill="${color}" stroke="white" stroke-width="2.5"/>
      <text x="17" y="22" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="white" text-anchor="middle">${num}</text>
    </svg>`;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(34, 34),
      anchor:     new google.maps.Point(17, 17),
    };
  }

  // ── Optimisation TSP ──────────────────────────────────────────────────────
  optimiserTournee() {
    this.tourneeLoading = true;
    this.clearRoute();

    const opts: any = { niveauMin: this.niveauMin };
    if (this.filtreZoneId) opts.zoneId = this.filtreZoneId;

    this.bacSvc.optimiserTournee(opts).pipe(
      finalize(() => {
        this.tourneeLoading = false;
        this.cdr.markForCheck(); // Fetch API non patché par Zone.js → forcer la détection
      })
    ).subscribe({
      next: r => {
        const data  = r?.data ?? r;
        const route: any[] = data?.route ?? [];
        this.tourneeResult = data ?? null;

        if (route.length === 0) { this.cdr.markForCheck(); return; }
        this.tracerRoute(route);

        this.vehicules
          .filter(v => v.localisationGPS?.lat && v.localisationGPS?.lng &&
                       (this.vehiculeIdsActifs.has(v._id?.toString()) || v.statut === 'En tournée'))
          .forEach(v => {
            const bac = this.findNearestBac(v.localisationGPS.lat, v.localisationGPS.lng, route);
            if (bac) this.animerVehiculeVersBac(v._id, v.localisationGPS.lat, v.localisationGPS.lng, bac.latitude, bac.longitude);
          });
        this.cdr.markForCheck();
      },
      error: () => { this.tourneeLoading = false; this.cdr.markForCheck(); }
    });
  }

  private tracerRoute(route: any[]) {
    if (!google?.maps || !this.map || route.length < 2) return;

    const path = route.map(b => ({ lat: b.latitude, lng: b.longitude }));
    this.routePolyline = new google.maps.Polyline({
      path,
      map:          this.map,
      strokeColor:  '#ef4444',
      strokeWeight: 4,
      strokeOpacity: 0.85,
      icons: [{
        icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
        offset: '0', repeat: '15px',
      }],
    });

    // Numéroter les bacs
    route.forEach((bac, idx) => {
      const m = new google.maps.Marker({
        position: { lat: bac.latitude, lng: bac.longitude },
        map:      this.map,
        icon:     this.stepIcon(idx + 1),
        title:    `${idx + 1}. ${bac.codeBac} (${bac.niveauRemplissage}%)`,
        zIndex:   300,
      });
      this.routeStepMarkers.push(m);
    });

    const bounds = new google.maps.LatLngBounds();
    path.forEach(p => bounds.extend(p));
    this.map.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });
  }

  private clearRoute() {
    if (this.routePolyline) { this.routePolyline.setMap(null); this.routePolyline = null; }
    this.routeStepMarkers.forEach(m => m.setMap(null));
    this.routeStepMarkers = [];
  }

  private clearAllMarkers() {
    this.bacMarkers.forEach(m => m.setMap(null));
    this.bacMarkers.clear();
    this.vehiculeMarkers.forEach(m => m.setMap(null));
    this.vehiculeMarkers.clear();
    this.clearRoute();
  }

  toggleCouche(couche: 'bacs' | 'vehicules' | 'route') {
    if (couche === 'bacs') {
      this.afficherBacs = !this.afficherBacs;
      this.bacMarkers.forEach(m => m.setMap(this.afficherBacs ? this.map : null));
    } else if (couche === 'vehicules') {
      this.afficherVehicules = !this.afficherVehicules;
      this.vehiculeMarkers.forEach(m => m.setMap(this.afficherVehicules ? this.map : null));
    } else {
      this.afficherRoute = !this.afficherRoute;
      if (this.routePolyline) this.routePolyline.setMap(this.afficherRoute ? this.map : null);
      this.routeStepMarkers.forEach(m => m.setMap(this.afficherRoute ? this.map : null));
    }
  }

  // ── Popup HTML (InfoWindow) ───────────────────────────────────────────────
  private bacPopupHtml(bac: any): string {
    const c = this.bacColorByNiveau(bac.niveauRemplissage);
    return `<div style="font-size:.85rem;line-height:1.55;min-width:160px;padding:4px">
      <strong style="display:block;font-size:.95rem;margin-bottom:4px">${bac.codeBac}</strong>
      <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:600;background:${c}22;color:${c};margin-bottom:6px">${bac.statut}</span>
      <div>Zone : <b>${bac.zoneId?.nom ?? '—'}</b></div>
      <div>Niveau : <b style="color:${c}">${bac.niveauRemplissage}%</b></div>
      <div>Capacité : ${bac.capacite} L</div>
      ${bac.derniereCollecte ? `<div style="color:#9ca3af;font-size:.78rem;margin-top:4px">Collecte : ${new Date(bac.derniereCollecte).toLocaleDateString('fr-FR')}</div>` : ''}
    </div>`;
  }

  private vehiculePopupHtml(v: any): string {
    const sc = v.statut === 'En tournée' ? '#f59e0b' : v.statut === 'En panne' ? '#ef4444' : '#22c55e';
    return `<div style="font-size:.85rem;line-height:1.55;min-width:160px;padding:4px">
      <strong style="display:block;font-size:.95rem;margin-bottom:4px">${v.immatriculation}</strong>
      <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:600;background:${sc}22;color:${sc};margin-bottom:6px">${v.statut}</span>
      <div>Capacité : <b>${v.capacite} m³</b></div>
      ${v.kilometrage ? `<div>Kilométrage : <b>${v.kilometrage.toLocaleString('fr-FR')} km</b></div>` : ''}
    </div>`;
  }

  private bacColorByNiveau(niveau: number): string {
    if (niveau >= 80) return '#ef4444';
    if (niveau >= 40) return '#f59e0b';
    return '#22c55e';
  }

  // ── Haversine & voisin le plus proche ────────────────────────────────────
  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private findNearestBac(lat: number, lng: number, route: any[]): any | null {
    if (!route.length) return null;
    return route.reduce((best, bac) => {
      return this.haversine(lat, lng, bac.latitude, bac.longitude) <
             this.haversine(lat, lng, best.latitude, best.longitude) ? bac : best;
    });
  }

  private animerVehiculeVersBac(id: string, fromLat: number, fromLng: number, toLat: number, toLng: number) {
    const marker = this.vehiculeMarkers.get(id);
    if (!marker) return;
    const steps = 80; const intMs = 40; let step = 0;
    const timer = setInterval(() => {
      step++;
      const t = step / steps;
      marker.setPosition({ lat: fromLat + (toLat - fromLat) * t, lng: fromLng + (toLng - fromLng) * t });
      if (step >= steps) clearInterval(timer);
    }, intMs);
  }

  // ── Dijkstra ──────────────────────────────────────────────────────────────
  getSelfPosition(): Promise<{ lat: number; lng: number }> {
    return new Promise(resolve => {
      if (!isPlatformBrowser(this.platformId)) { resolve(this.fallbackPosition()); return; }
      navigator.geolocation?.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        ()  => resolve(this.fallbackPosition()),
        { timeout: 5000 },
      );
    });
  }

  private fallbackPosition(): { lat: number; lng: number } {
    const v = this.vehicules.find(v => v.localisationGPS?.lat && v.localisationGPS?.lng);
    return v ? { lat: v.localisationGPS.lat, lng: v.localisationGPS.lng } : { lat: 4.0511, lng: 9.7679 };
  }

  async lancerDijkstra() {
    this.dijkstraLoading = true;
    this.clearDijkstraLines();
    // Toujours recalculer la position → évite d'utiliser un GPS mis en cache périmé
    this.positionCamion = await this.getSelfPosition();

    this.navSvc.calculerItineraire({
      position:  this.positionCamion,
      criterium: this.criterium,
      niveauMin: this.niveauMin,
      zoneId:    this.filtreZoneId || undefined,
    }).pipe(finalize(() => { this.dijkstraLoading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: r => {
          const data = r?.data;
          if (!data?.orderedBacs?.length) { this.dijkstraResult = data; this.cdr.markForCheck(); return; }
          this.dijkstraResult = data;
          this.tracerDijkstra(data);
          this.cdr.markForCheck();
        },
        error: () => { this.dijkstraLoading = false; this.cdr.markForCheck(); },
      });
  }

  private tracerDijkstra(data: any) {
    if (!google?.maps || !this.map) return;
    const COLOR = '#1d4ed8';

    for (const seg of (data.segments ?? [])) {
      if (!seg.chemin?.length) continue;
      const path = seg.chemin.map((p: any) => ({ lat: p.lat, lng: p.lng }));
      const line = new google.maps.Polyline({
        path,
        map:          this.map,
        strokeColor:  COLOR,
        strokeWeight: 5,
        strokeOpacity: 0.9,
      });
      this.dijkstraPolylines.push(line);
    }

    for (const bac of (data.orderedBacs ?? [])) {
      const m = new google.maps.Marker({
        position: { lat: bac.latitude, lng: bac.longitude },
        map:      this.map,
        icon:     this.stepIcon(bac.ordre, COLOR),
        title:    `${bac.ordre}. ${bac.codeBac} (${bac.niveauRemplissage}%)`,
        zIndex:   300,
      });
      this.dijkstraMarkers.push(m);
    }

    const allPts = (data.segments ?? []).flatMap((s: any) => s.chemin?.map((p: any) => ({ lat: p.lat, lng: p.lng })) ?? []);
    if (allPts.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      allPts.forEach((p: any) => bounds.extend(p));
      this.map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }

  private clearDijkstraLines() {
    this.dijkstraPolylines.forEach(l => l.setMap(null)); this.dijkstraPolylines = [];
    this.dijkstraMarkers.forEach(m => m.setMap(null));   this.dijkstraMarkers = [];
  }

  effacerDijkstra() {
    this.clearDijkstraLines();
    this.dijkstraResult = null;
    this.positionCamion = null;
    this.cdr.markForCheck();
  }

  // ── Simulation véhicule ───────────────────────────────────────────────────
  simulerVehicule() {
    if (this.simVehiculeActif) { this.stopperSimVehicule(); return; }
    if (this.bacs.length < 2) {
      this.errorMsg = 'Chargez au moins 2 bacs sur la carte pour simuler.';
      this.cdr.markForCheck(); return;
    }

    // Position de départ = premier véhicule actif avec GPS, sinon centre de Douala
    const vehiculeDepart = this.vehicules.find(v => v.localisationGPS?.lat && v.localisationGPS?.lng);
    const depart = vehiculeDepart?.localisationGPS ?? { lat: 4.0511, lng: 9.7679 };

    // Trier les bacs par distance depuis la position du camion → sens de navigation réaliste
    const bacsFiltres = this.bacs
      .filter(b => b.latitude && b.longitude)
      .sort((a, b) =>
        this.haversine(depart.lat, depart.lng, a.latitude, a.longitude) -
        this.haversine(depart.lat, depart.lng, b.latitude, b.longitude)
      )
      .slice(0, 8);

    if (bacsFiltres.length < 2) return;

    // Insérer le dépôt en première position pour démarrer depuis le camion
    const depot = { latitude: depart.lat, longitude: depart.lng, codeBac: 'Dépôt' };
    const route = [depot, ...bacsFiltres];

    this.simVehiculeActif = true;
    this.simVehiculeEtape = '🚛 Départ du dépôt…';
    this.cdr.markForCheck();

    const fakeVehiculeId = 'SIM-001';
    let segIdx = 0; let step = 0;
    const STEPS_PER_SEG = 15; const STEP_MS = 300;

    const tick = () => {
      if (!this.simVehiculeActif) return;
      const from = route[segIdx]; const to = route[segIdx + 1];
      const t = step / STEPS_PER_SEG;
      const lat = from.latitude  + (to.latitude  - from.latitude)  * t;
      const lng = from.longitude + (to.longitude - from.longitude) * t;

      this.updateVehiculeMarker({ vehiculeId: fakeVehiculeId, lat, lng, immatriculation: 'SIM-DÉMO', statut: 'En tournée' });
      this.simVehiculeEtape = `🚛 Bac ${segIdx + 1}/${route.length - 1} — ${to.codeBac}`;
      this.cdr.markForCheck();

      step++;
      if (step > STEPS_PER_SEG) { step = 0; segIdx = (segIdx + 1) % (route.length - 1); }
      this.simVehiculeTimers.push(setTimeout(tick, STEP_MS));
    };

    tick();
  }

  stopperSimVehicule() {
    this.simVehiculeActif = false;
    this.simVehiculeEtape = '';
    for (const t of this.simVehiculeTimers) clearTimeout(t);
    this.simVehiculeTimers = [];

    // Supprimer le marqueur SIM-001 de la carte
    const simMarker = this.vehiculeMarkers.get('SIM-001');
    if (simMarker) {
      simMarker.setMap(null);
      this.vehiculeMarkers.delete('SIM-001');
    }

    this.cdr.markForCheck();
  }

  nbBacsPleinsFiltres() { return this.bacs.filter(b => b.statut === 'Plein').length; }
}
