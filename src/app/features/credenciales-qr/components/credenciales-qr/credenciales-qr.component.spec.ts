import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CredencialesQrComponent } from './credenciales-qr.component';

describe('CredencialesQrComponent', () => {
  let component: CredencialesQrComponent;
  let fixture: ComponentFixture<CredencialesQrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CredencialesQrComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(CredencialesQrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
