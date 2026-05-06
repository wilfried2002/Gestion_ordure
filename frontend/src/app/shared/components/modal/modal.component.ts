import {
  Component, Input, Output, EventEmitter,
  OnChanges, OnDestroy, SimpleChanges, HostListener,
} from '@angular/core';

/**
 * Modale animée (entrée spring + sortie fluide).
 *
 * Usage :
 *   <app-modal title="Mon titre" size="lg" [visible]="show" (close)="show = false">
 *     <div class="modal-body">…</div>
 *     <div class="modal-footer">…</div>
 *   </app-modal>
 *
 * Inputs  : title (string), size ('sm'|'lg'|'wide'|'xl'|''), visible (boolean)
 * Outputs : close (void)
 * Touches clavier : Échap ferme la modale
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    @if (active) {
      <div class="modal-backdrop"
           [class.modal-closing]="closing"
           (click)="close.emit()"
           role="presentation"></div>

      <div class="modal"
           [class]="sizeClass"
           [class.modal-closing]="closing"
           role="dialog"
           aria-modal="true"
           [attr.aria-label]="title"
           (click)="$event.stopPropagation()">

        <div class="modal-header">
          <!-- Slot titre personnalisé (ex : icône + texte) -->
          <ng-content select="[modal-title]"></ng-content>
          <!-- Titre texte simple par défaut -->
          @if (title) { <h2>{{ title }}</h2> }

          <button class="modal-close" type="button"
                  (click)="close.emit()" aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M6 18 18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <ng-content></ng-content>
      </div>
    }
  `,
})
export class ModalComponent implements OnChanges, OnDestroy {

  @Input() title   = '';
  /** 'sm' | 'lg' | 'wide' | 'xl' | '' (540 px par défaut) */
  @Input() size    = '';
  @Input() visible = false;
  @Output() close  = new EventEmitter<void>();

  /** Le DOM est présent (entrée OU pendant la sortie) */
  active  = false;
  /** Animation de sortie en cours */
  closing = false;

  private timer: any;

  /** Classe CSS appliquée au panneau modal */
  get sizeClass(): string {
    return this.size ? `modal modal-${this.size}` : 'modal';
  }

  ngOnChanges(c: SimpleChanges): void {
    if (!c['visible']) return;
    const next = c['visible'].currentValue;

    if (next) {
      // --- OUVERTURE ---
      clearTimeout(this.timer);
      this.closing = false;
      this.active  = true;   // @if rend le DOM → CSS animation joue
    } else if (this.active) {
      // --- FERMETURE ---
      this.closing = true;   // classe modal-closing → animation CSS sortie
      this.timer = setTimeout(() => {
        this.active  = false; // @if retire le DOM
        this.closing = false;
      }, 240);               // doit être ≥ durée des animations CSS
    }
  }

  /** Touche Échap → fermeture */
  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.active && !this.closing) this.close.emit();
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}
