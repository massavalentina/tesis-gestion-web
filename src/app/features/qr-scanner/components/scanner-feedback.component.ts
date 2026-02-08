
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-scan-feedback',
  standalone: true,
  template: `
    <div *ngIf="visible" class="feedback success">
      ✔ Asistencia registrada
    </div>
  `,
  styles: [`
    .feedback {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      background: #2e7d32;
    }
  `]
})
export class ScanFeedbackComponent {
  @Input() visible = false;
}
