import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiNotifications } from './shared/components/ui-notifications/ui-notifications';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiNotifications],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
}
