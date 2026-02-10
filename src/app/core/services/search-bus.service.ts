import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SearchBusService {
  private readonly _query$ = new BehaviorSubject<string>('');

  setQuery(q: string) {
    this._query$.next(q);
  }

  clear() {
    this._query$.next('');
  }

  get query$(): Observable<string> {
    return this._query$.asObservable();
  }

  get current(): string {
    return this._query$.value;
  }
}
