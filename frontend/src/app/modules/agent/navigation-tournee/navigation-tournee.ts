import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, PLATFORM_ID, inject,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavigationService }   from '../../../core/services/navigation.service';
import { AgentTourneeService } from '../../../core/services/agent-tournee.service';
import { SocketService }       from '../../../core/services/socket.service';
import { ToastService }        from '../../../core/services/toast.service';
import { environment }         from '../../../../environments/environment';

// Typage minimal Google Maps (chargé dynamiquement, pas de package @types)
declare var google: any;

@Component({
  selector: 'app-navigation-tournee',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navigation-tournee.html',
  styleUrl: './navigation-tournee.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationTournee implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;
  private readonly platformId = inject(PLATFORM_ID);

  // ── Carte Google Maps ─────────────────────────────────────────────────────
  private map:            any = null;
  private camionMarker:   any = null;
  private prochainMarker: any = null;
  private routeLine:      any = null;
  private bacsMarkers:    Map<string, any> = new Map();
  private infoWindow:     any = null; // fenêtre d'info partagée

  // ── Données ───────────────────────────────────────────────────────────────
  tourneeId   = '';
  tournee:    any = {};
  prochainBac: any = null;
  chemin:      any[] = [];
  bacsDejaCollectes: string[] = [];
  bacsRestants = 0;
  totalBacs    = 0;

  // ── GPS ───────────────────────────────────────────────────────────────────
  private watchId:          number | null = null;
  private lastPositionSent  = 0;
  private readonly POSITION_INTERVAL = 5000;
  positionActuelle: { lat: number; lng: number } | null = null;
  gpsActif    = false;
  distanceKm  = 0;
  tempsMin    = 0;

  // ── Alerte proximité ──────────────────────────────────────────────────────
  proximiteAlert = false;
  bacProche: any = null;

  // ── État ──────────────────────────────────────────────────────────────────
  loading      = true;
  navLoading   = false;
  tourneeFinie = false;

  // ── Mode Simulation ───────────────────────────────────────────────────────
  modeSimulation  = false;
  simAutoActif    = false;
  simEtape        = '';
  simEtapeNum     = 0;
  private simTimers: any[] = [];

  private socketSub: Subscription | null = null;

  constructor(
    private route:      ActivatedRoute,
    private router:     Router,
    private navSvc:     NavigationService,
    private agentSvc:   AgentTourneeService,
    private socket:     SocketService,
    private toast:      ToastService,
    private cdr:        ChangeDetectorRef,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  ngOnInit() {
    this.tourneeId = this.route.snapshot.params['id'] ?? '';
    if (!this.tourneeId) { this.router.navigate(['/agent/tournee']); return; }

    this.agentSvc.getTourneeById(this.tourneeId).subscribe({
      next: r => {
        this.tournee = r.data ?? r;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });

    this.bacsDejaCollectes = [];
    this.bacsRestants = 0;
    this.totalBacs    = 0;
  }

  async ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.initMap();
    this.demarrerGPS();

    this.socket.connect();
    this.socketSub = this.socket.bacProximity$.subscribe((data: any) => {
      if (data.tourneeId === this.tourneeId) this.alerteProximite(data);
    });
  }

  // ── Initialisation Google Maps ────────────────────────────────────────────
  private async initMap() {
    await this.loadGoogleMapsApi();

    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center:            { lat: 4.0511, lng: 9.7679 }, // Douala
      zoom:              14,
      mapTypeId:         'roadmap',
      streetViewControl: false,
      mapTypeControl:    true,
      fullscreenControl: true,
      zoomControl:       true,
    });

    // InfoWindow partagée (un seul popup ouvert à la fois)
    this.infoWindow = new google.maps.InfoWindow();
  }

  // ── Chargement dynamique du SDK Google Maps ───────────────────────────────
  private loadGoogleMapsApi(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps) { resolve(); return; }
      const cbName = '__gmNavigationInit';
      (window as any)[cbName] = () => { delete (window as any)[cbName]; resolve(); };
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&callback=${cbName}&loading=async`;
      s.async = true;
      s.onerror = () => reject(new Error('Google Maps API failed to load'));
      document.head.appendChild(s);
    });
  }

  // ── GPS réel ──────────────────────────────────────────────────────────────
  demarrerGPS() {
    if (!isPlatformBrowser(this.platformId) || !navigator.geolocation) return;

    this.watchId = navigator.geolocation.watchPosition(
      pos => {
        this.positionActuelle = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        this.gpsActif = true;
        this.mettreAJourMarqueurCamion();
        const now = Date.now();
        if (now - this.lastPositionSent >= this.POSITION_INTERVAL) {
          this.lastPositionSent = now;
          this.mettreAJourPositionServeur();
        }
        this.cdr.markForCheck();
      },
      () => { this.gpsActif = false; this.cdr.markForCheck(); },
      { enableHighAccuracy: true, maximumAge: 3000 },
    );
  }

  // ── Marqueur camion ───────────────────────────────────────────────────────
  mettreAJourMarqueurCamion() {
    if (!google?.maps || !this.map || !this.positionActuelle) return;
    const { lat, lng } = this.positionActuelle;

    if (this.camionMarker) {
      this.camionMarker.setPosition({ lat, lng });
    } else {
      this.camionMarker = new google.maps.Marker({
        position:    { lat, lng },
        map:         this.map,
        icon:        this.camionIcon(),
        zIndex:      1000,
        title:       'Ma position',
      });
    }
  }

  private camionIcon() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#16a34a" stroke="white" stroke-width="1.5"/>
      <path d="M1 6.5H13V11H1V6.5M13 7.7H15.5L18 10.3V11H13V7.7M4.5 11A2 2 0 0 1 6.5 13A2 2 0 0 1 4.5 15A2 2 0 0 1 2.5 13A2 2 0 0 1 4.5 11M15.5 11A2 2 0 0 1 17.5 13A2 2 0 0 1 15.5 15A2 2 0 0 1 13.5 13A2 2 0 0 1 15.5 11Z" fill="white" transform="translate(3,3) scale(0.75)"/>
    </svg>`;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(48, 48),
      anchor:     new google.maps.Point(24, 24),
    };
  }

  private prochainBacIcon() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="66" viewBox="0 0 52 66">
      <circle cx="26" cy="26" r="23" fill="#ef4444" stroke="white" stroke-width="3"/>
      <text x="26" y="32" font-family="Arial,sans-serif" font-size="22" text-anchor="middle" fill="white">📍</text>
      <polygon points="16,47 36,47 26,63" fill="#ef4444"/>
    </svg>`;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(52, 66),
      anchor:     new google.maps.Point(26, 63),
    };
  }

  private bacIcon(niveau: number, collecte = false) {
    const color = collecte ? '#9ca3af'
                : niveau >= 80 ? '#ef4444'
                : niveau >= 40 ? '#f59e0b'
                : '#22c55e';
    const label = collecte ? '✓' : `${niveau}%`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="58" viewBox="0 0 44 58">
      <circle cx="22" cy="22" r="20" fill="${color}" stroke="white" stroke-width="2.5"/>
      <text x="22" y="27" font-family="Arial,sans-serif" font-size="11" font-weight="bold" fill="white" text-anchor="middle">${label}</text>
      <polygon points="13,40 31,40 22,56" fill="${color}"/>
    </svg>`;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(44, 58),
      anchor:     new google.maps.Point(22, 56),
    };
  }

  // ── Envoi position serveur ────────────────────────────────────────────────
  private mettreAJourPositionServeur() {
    if (!this.positionActuelle || !this.tournee?.vehiculeId?._id) return;
    this.navSvc.mettreAJourPosition({
      vehiculeId: this.tournee.vehiculeId._id,
      lat:        this.positionActuelle.lat,
      lng:        this.positionActuelle.lng,
      tourneeId:  this.tourneeId,
    }).subscribe({
      next: r => {
        if (r?.data?.proximite && r?.data?.bacProche) {
          this.alerteProximite({ bacId: r.data.bacProche._id, ...r.data.bacProche });
        }
      },
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  calculerProchaineEtape() {
    if (!this.positionActuelle) {
      this.toast.error('GPS inactif', 'Activez la géolocalisation ou le mode simulation.');
      return;
    }
    this.navLoading = true;
    this.cdr.markForCheck();

    this.navSvc.getProchainBac({
      position:          this.positionActuelle,
      tourneeId:         this.tourneeId,
      bacsDejaCollectes: this.bacsDejaCollectes,
    }).subscribe({
      next: r => {
        const data = r?.data;
        this.prochainBac  = data?.prochainBac ?? null;
        this.chemin       = data?.chemin ?? [];
        this.distanceKm   = data?.distanceKm ?? 0;
        this.tempsMin     = data?.tempsMin ?? 0;
        this.bacsRestants = data?.bacsRestants ?? 0;

        if (!this.totalBacs && this.bacsRestants > 0) {
          this.totalBacs = this.bacsRestants + this.bacsDejaCollectes.length;
        }
        if (this.prochainBac) {
          this.tracerChemin();
          this.afficherProchainMarker();
        }
        this.navLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.navLoading = false; this.cdr.markForCheck(); },
    });
  }

  private tracerChemin() {
    if (!google?.maps || !this.map || this.chemin.length < 2) return;
    if (this.routeLine) this.routeLine.setMap(null);

    const path = this.chemin.map((p: any) => ({ lat: p.lat, lng: p.lng }));
    this.routeLine = new google.maps.Polyline({
      path,
      map:          this.map,
      strokeColor:  '#ef4444',
      strokeWeight: 5,
      strokeOpacity: 0.9,
    });

    const bounds = new google.maps.LatLngBounds();
    path.forEach((p: any) => bounds.extend(p));
    if (this.positionActuelle) bounds.extend(this.positionActuelle);
    this.map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  }

  private afficherProchainMarker() {
    if (!google?.maps || !this.map || !this.prochainBac) return;

    if (this.prochainMarker) {
      this.prochainMarker.setPosition({ lat: this.prochainBac.latitude, lng: this.prochainBac.longitude });
      this.prochainMarker.setIcon(this.prochainBacIcon());
    } else {
      this.prochainMarker = new google.maps.Marker({
        position: { lat: this.prochainBac.latitude, lng: this.prochainBac.longitude },
        map:      this.map,
        icon:     this.prochainBacIcon(),
        zIndex:   900,
        title:    this.prochainBac.codeBac,
      });
    }
  }

  alerteProximite(data: any) {
    const bacId = data.bacId?.toString() ?? data._id?.toString();
    if (this.bacsDejaCollectes.includes(bacId)) return;
    this.bacProche = data;
    this.proximiteAlert = true;
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    this.cdr.markForCheck();
  }

  validerCollecte(bacId: string) {
    this.marquerBacCollecte(bacId?.toString() ?? '');
  }

  private marquerBacCollecte(bacId: string) {
    if (!this.bacsDejaCollectes.includes(bacId)) {
      this.bacsDejaCollectes = [...this.bacsDejaCollectes, bacId];
    }
    this.bacsRestants   = Math.max(0, this.bacsRestants - 1);
    this.proximiteAlert = false;
    this.bacProche      = null;
    this.griserMarqueur(bacId);
    this.toast.success('Collecte validée', 'Bac marqué comme collecté.');

    if (this.bacsRestants > 0) {
      this.calculerProchaineEtape();
    } else {
      this.tourneeFinie = true;
      if (this.prochainMarker) { this.prochainMarker.setMap(null); this.prochainMarker = null; }
      if (this.routeLine)      { this.routeLine.setMap(null);      this.routeLine = null; }
      this.toast.success('Tournée terminée !', 'Tous les bacs ont été collectés.');
    }
    this.cdr.markForCheck();
  }

  private griserMarqueur(bacId: string) {
    if (!google?.maps) return;
    const marker = this.bacsMarkers.get(bacId);
    if (!marker) return;
    marker.setIcon(this.bacIcon(0, true));
  }

  get progressionPct(): number {
    if (!this.totalBacs) return 0;
    return Math.round((this.bacsDejaCollectes.length / this.totalBacs) * 100);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODE SIMULATION
  // ══════════════════════════════════════════════════════════════════════════

  toggleSimulation() {
    this.modeSimulation = !this.modeSimulation;
    if (!this.modeSimulation) this.stopperDemo();
    this.cdr.markForCheck();
  }

  // ── 1. Simuler la position GPS ────────────────────────────────────────────
  simulerPosition() {
    let pos: { lat: number; lng: number };

    if (this.prochainBac?.latitude) {
      pos = { lat: this.prochainBac.latitude + 0.004, lng: this.prochainBac.longitude + 0.004 };
    } else if (this.positionActuelle) {
      pos = this.positionActuelle;
    } else {
      pos = { lat: 4.0511, lng: 9.7679 };
    }

    this.positionActuelle = pos;
    this.gpsActif = true;
    this.simEtape = '📍 Position GPS simulée';
    this.mettreAJourMarqueurCamion();
    if (this.map) this.map.setCenter(pos);
    this.cdr.markForCheck();
    if (!this.simAutoActif) this.toast.success('Simulation GPS', 'Position placée sur la carte.');
  }

  // ── 2. Animer le déplacement ──────────────────────────────────────────────
  simulerDeplacement(onComplete?: () => void) {
    if (!this.chemin || this.chemin.length < 2) {
      onComplete?.(); return;
    }
    this.simEtape = '🚛 Déplacement en cours…';
    this.cdr.markForCheck();

    const DUREE_MS = 4500;
    const chemin   = this.chemin;
    const stepMs   = DUREE_MS / chemin.length;
    let i = 0;

    const avancer = () => {
      if (i >= chemin.length) {
        this.positionActuelle = { lat: chemin[chemin.length - 1].lat, lng: chemin[chemin.length - 1].lng };
        this.mettreAJourMarqueurCamion();
        this.cdr.markForCheck();
        onComplete?.(); return;
      }
      const pt = chemin[i];
      this.positionActuelle = { lat: pt.lat, lng: pt.lng };
      this.mettreAJourMarqueurCamion();

      if (this.tournee?.vehiculeId?._id && i % 3 === 0) {
        this.navSvc.mettreAJourPosition({
          vehiculeId: this.tournee.vehiculeId._id,
          lat: pt.lat, lng: pt.lng,
          tourneeId: this.tourneeId,
        }).subscribe();
      }
      this.cdr.markForCheck();
      i++;
      const t = setTimeout(avancer, stepMs);
      this.simTimers.push(t);
    };

    avancer();
  }

  // ── 3. Alerte proximité ───────────────────────────────────────────────────
  simulerProximite() {
    if (!this.prochainBac) { onComplete?.(); return; }
    this.simEtape = '🔔 Alerte proximité déclenchée !';
    this.alerteProximite({
      bacId:             this.prochainBac._id,
      codeBac:           this.prochainBac.codeBac,
      niveauRemplissage: this.prochainBac.niveauRemplissage,
      distanceMetres:    23,
    });
    this.cdr.markForCheck();
  }

  // ── 4. Démo automatique complète ──────────────────────────────────────────
  lancerDemoComplete() {
    if (this.simAutoActif) { this.stopperDemo(); return; }
    this.simAutoActif = true;
    this.simEtape     = '⚡ Démo automatique — démarrage…';
    this.cdr.markForCheck();
    this.toast.success('Mode démo', 'Simulation automatique lancée.');
    const t = setTimeout(() => this.runDemoEtape(), 400);
    this.simTimers.push(t);
  }

  private runDemoEtape() {
    if (!this.simAutoActif || this.tourneeFinie) { this.stopperDemo(); return; }

    this.simEtapeNum = 1;
    this.simulerPosition();

    const t1 = setTimeout(() => {
      if (!this.simAutoActif) return;
      this.simEtapeNum = 2;
      this.simEtape    = '🗺 Calcul de l\'itinéraire…';
      this.navLoading  = true;
      this.cdr.markForCheck();

      this.navSvc.getProchainBac({
        position:          this.positionActuelle!,
        tourneeId:         this.tourneeId,
        bacsDejaCollectes: this.bacsDejaCollectes,
      }).subscribe({
        next: r => {
          if (!this.simAutoActif) return;
          const data = r?.data;
          this.prochainBac  = data?.prochainBac ?? null;
          this.chemin       = data?.chemin ?? [];
          this.distanceKm   = data?.distanceKm ?? 0;
          this.tempsMin     = data?.tempsMin ?? 0;
          this.bacsRestants = data?.bacsRestants ?? 0;
          this.navLoading   = false;
          if (!this.totalBacs && this.bacsRestants > 0)
            this.totalBacs = this.bacsRestants + this.bacsDejaCollectes.length;
          if (this.prochainBac) { this.tracerChemin(); this.afficherProchainMarker(); }
          this.cdr.markForCheck();
          if (!this.prochainBac) { this.stopperDemo(); return; }

          const t2 = setTimeout(() => {
            if (!this.simAutoActif) return;
            this.simEtapeNum = 3;
            this.simulerDeplacement(() => {
              if (!this.simAutoActif) return;
              const t3 = setTimeout(() => {
                if (!this.simAutoActif) return;
                this.simEtapeNum = 4;
                this.simulerProximite();
                this.cdr.markForCheck();
                const t4 = setTimeout(() => {
                  if (!this.simAutoActif || !this.prochainBac) return;
                  this.simEtapeNum = 5;
                  this.simEtape    = '✅ Collecte validée !';
                  this.validerCollecte(this.prochainBac._id.toString());
                  this.cdr.markForCheck();
                  const t5 = setTimeout(() => {
                    if (this.simAutoActif && !this.tourneeFinie) this.runDemoEtape();
                    else this.stopperDemo();
                  }, 1800);
                  this.simTimers.push(t5);
                }, 2200);
                this.simTimers.push(t4);
              }, 600);
              this.simTimers.push(t3);
            });
          }, 800);
          this.simTimers.push(t2);
        },
        error: () => { this.navLoading = false; this.stopperDemo(); },
      });
    }, 900);
    this.simTimers.push(t1);
  }

  stopperDemo() {
    this.simAutoActif = false;
    this.simEtape     = '';
    this.simEtapeNum  = 0;
    for (const t of this.simTimers) clearTimeout(t);
    this.simTimers = [];
    this.cdr.markForCheck();
  }

  // ─────────────────────────────────────────────────────────────────────────
  ngOnDestroy() {
    if (this.watchId !== null) navigator.geolocation?.clearWatch(this.watchId);
    this.stopperDemo();
    this.socketSub?.unsubscribe();
    // Google Maps n'a pas de méthode remove() — les ressources sont libérées par le GC
    this.map = null;
  }
}

// Fallback no-op pour TypeScript (évite erreur sur appel onComplete dans simulerProximite)
function onComplete() {}
