import { Component, ElementRef, NgZone, OnInit, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { startBallsAnimation } from '../../../core/utils/balls-canvas.util';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  userName = '';
  formattedDate = '';

  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  private stopAnimation?: () => void;

  constructor(private authService: AuthService, private ngZone: NgZone) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;
    this.userName = (user?.nombre ?? 'usuario').split(' ')[0];
    this.formattedDate = this.formatDate(new Date());
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      const container = this.containerRef.nativeElement;
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
      container.insertBefore(canvas, container.firstChild);
      this.stopAnimation = startBallsAnimation(canvas, 17);
    });
  }

  ngOnDestroy(): void {
    this.stopAnimation?.();
  }

  private formatDate(date: Date): string {
    const days   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const months = ['enero','febrero','marzo','abril','mayo','junio','julio',
                    'agosto','septiembre','octubre','noviembre','diciembre'];
    return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  }
}
