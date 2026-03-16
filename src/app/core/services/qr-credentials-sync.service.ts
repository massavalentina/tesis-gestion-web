import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class QrCredentialsSyncService {
  private readonly generationUpdatedSubject = new Subject<string>();

  notifyGenerationUpdated(cursoId: string): void {
    if (!cursoId) {
      return;
    }

    this.generationUpdatedSubject.next(cursoId);
  }

  get generationUpdated$(): Observable<string> {
    return this.generationUpdatedSubject.asObservable();
  }
}
