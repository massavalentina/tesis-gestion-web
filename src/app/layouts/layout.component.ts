import { Component } from '@angular/core';
import { SidebarComponent } from './sidebar/components/sidebar.component';
import { NavbarComponent } from './navbar/components/navbar.component';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({
  selector: 'app-layout',
  imports: [
    NavbarComponent,
    SidebarComponent,
    RouterOutlet
  ],
  template: `
<div class="layout-root">

  <app-sidebar class="layout-sidebar"></app-sidebar>

  <div class="layout-main">
    <app-navbar class="layout-navbar"></app-navbar>

    <main class="layout-content">
      <router-outlet></router-outlet>
    </main>
  </div>

</div>


  `,
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent {
  isMobile = false;

  constructor(private breakpointObserver: BreakpointObserver) {
    this.breakpointObserver
      .observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isMobile = result.matches;
      });
  }
}