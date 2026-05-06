import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {

  private socket: Socket | null = null;
  private readonly platformId   = inject(PLATFORM_ID);

  /** Flux des nouvelles plaintes reçues via Socket.io */
  readonly nouvellePlainte$   = new Subject<any>();
  /** Flux des positions GPS des véhicules (temps réel) */
  readonly vehiculePosition$  = new Subject<any>();
  /** Flux des mises à jour de niveau des bacs */
  readonly bacNiveauUpdate$   = new Subject<any>();
  /** Flux des alertes de proximité bac (chauffeur approche d'un bac) */
  readonly bacProximity$      = new Subject<any>();

  connect() {
    if (!isPlatformBrowser(this.platformId) || this.socket?.connected) return;

    // Connexion au backend Express (même hôte, port 5000)
    const url = `${location.protocol}//${location.hostname}:5000`;
    this.socket = io(url, { transports: ['websocket', 'polling'] });

    this.socket.on('nouvelle-plainte',   (data: any) => this.nouvellePlainte$.next(data));
    this.socket.on('vehicule-position',  (data: any) => this.vehiculePosition$.next(data));
    this.socket.on('bac-niveau-update',  (data: any) => this.bacNiveauUpdate$.next(data));
    this.socket.on('bac-proximity-alert',(data: any) => this.bacProximity$.next(data));
  }

  /** Émet la position GPS du chauffeur vers le backend (tracking temps réel) */
  emitVehiculePosition(data: { vehiculeId: string; immatriculation: string; lat: number; lng: number; statut: string }) {
    this.socket?.emit('vehicule-position', data);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  ngOnDestroy() { this.disconnect(); }
}
