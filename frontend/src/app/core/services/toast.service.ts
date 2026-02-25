import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id:       string;
  type:     ToastType;
  title:    string;
  message?: string;
  duration: number;
  exiting:  boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {

  private _toasts = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this._toasts.asObservable();

  show(type: ToastType, title: string, message?: string, duration = 4000) {
    const id = Math.random().toString(36).slice(2, 9);
    const toast: Toast = { id, type, title, message, duration, exiting: false };
    this._toasts.next([...this._toasts.value, toast]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(title: string, message?: string) { this.show('success', title, message); }
  error(title: string, message?: string)   { this.show('error',   title, message, 5500); }
  warning(title: string, message?: string) { this.show('warning', title, message); }
  info(title: string, message?: string)    { this.show('info',    title, message); }

  dismiss(id: string) {
    // Marque le toast comme sortant (déclenche l'animation CSS)
    this._toasts.next(this._toasts.value.map(t => t.id === id ? { ...t, exiting: true } : t));
    // Retire du DOM après l'animation
    setTimeout(() => {
      this._toasts.next(this._toasts.value.filter(t => t.id !== id));
    }, 320);
  }
}
