import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsistenciaConfirmDialogComponent } from './asistencia-confirm-dialog.component';

describe('AsistenciaConfirmDialogComponent', () => {
  let component: AsistenciaConfirmDialogComponent;
  let fixture: ComponentFixture<AsistenciaConfirmDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsistenciaConfirmDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AsistenciaConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
