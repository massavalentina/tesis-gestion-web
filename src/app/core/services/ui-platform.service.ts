import { Injectable } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  AppSectionId,
  PlatformVisibility,
  getSectionPlatformVisibility,
} from '../navigation/platform-visibility.config';

@Injectable({ providedIn: 'root' })
export class UiPlatformService {
  private readonly mobileSubject: BehaviorSubject<boolean>;

  constructor(private readonly breakpointObserver: BreakpointObserver) {
    this.mobileSubject = new BehaviorSubject<boolean>(
      this.breakpointObserver.isMatched(Breakpoints.Handset)
    );

    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.mobileSubject.next(result.matches);
    });
  }

  get isMobile$(): Observable<boolean> {
    return this.mobileSubject.asObservable();
  }

  get isMobile(): boolean {
    return this.mobileSubject.value;
  }

  get isDesktop(): boolean {
    return !this.isMobile;
  }

  matchesVisibility(visibility: PlatformVisibility | null | undefined): boolean {
    switch (visibility) {
      case 'mobile':
        return this.isMobile;
      case 'desktop':
        return this.isDesktop;
      default:
        return true;
    }
  }

  canAccessSection(sectionId: AppSectionId): boolean {
    return this.matchesVisibility(getSectionPlatformVisibility(sectionId));
  }
}
