import { Component, ViewEncapsulation, inject } from '@angular/core';
import { AsyncPipe, NgClass } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-ui-notifications',
  standalone: true,
  imports: [AsyncPipe, NgClass],
  templateUrl: './ui-notifications.html',
  styleUrl:    './ui-notifications.scss',
  encapsulation: ViewEncapsulation.None,
})
export class UiNotifications {

  readonly toastSvc   = inject(ToastService);
  readonly confirmSvc = inject(ConfirmService);

  readonly toasts$  = this.toastSvc.toasts$;
  readonly confirm$ = this.confirmSvc.state$;

  dismiss(id: string)    { this.toastSvc.dismiss(id); }
  answer(value: boolean) { this.confirmSvc.answer(value); }

  trackToast(_: number, t: Toast) { return t.id; }
}
