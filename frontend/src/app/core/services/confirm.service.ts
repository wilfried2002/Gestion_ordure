import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface ConfirmOptions {
  title:         string;
  message:       string;
  confirmLabel?: string;   // défaut : "Confirmer"
  cancelLabel?:  string;   // défaut : "Annuler"
  danger?:       boolean;  // bouton rouge si true
}

interface ConfirmState {
  options: ConfirmOptions;
  subject: Subject<boolean>;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {

  private _state = new BehaviorSubject<ConfirmState | null>(null);
  readonly state$ = this._state.asObservable();

  /** Ouvre le dialogue et retourne une Promise<boolean>. */
  open(options: ConfirmOptions): Promise<boolean> {
    // Ferme tout dialogue précédent
    if (this._state.value) {
      this._state.value.subject.next(false);
      this._state.value.subject.complete();
    }
    const subject = new Subject<boolean>();
    this._state.next({ options, subject });
    return new Promise<boolean>(resolve => {
      subject.subscribe({ next: resolve, complete: () => {} });
    });
  }

  /** Appelé par le composant UI quand l'utilisateur répond. */
  answer(value: boolean) {
    const state = this._state.value;
    if (!state) return;
    state.subject.next(value);
    state.subject.complete();
    this._state.next(null);
  }
}
