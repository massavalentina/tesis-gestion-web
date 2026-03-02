import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CredencialesQrComponent } from './credenciales-qr.component';

describe('CredencialesQrComponent', () => {
  let component: CredencialesQrComponent;
  let fixture: ComponentFixture<CredencialesQrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CredencialesQrComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CredencialesQrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
