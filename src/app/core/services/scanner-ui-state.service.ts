import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ScannerUiStateService {
  private readonly scannerActiveSubject = new BehaviorSubject<boolean>(false);

  setScannerActive(active: boolean): void {
    this.scannerActiveSubject.next(active);
  }

  get scannerActive$(): Observable<boolean> {
    return this.scannerActiveSubject.asObservable();
  }

  get isScannerActive(): boolean {
    return this.scannerActiveSubject.value;
  }
}
