import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsistenciaSuccessDialogComponent } from './asistencia-success-dialog.component';

describe('AsistenciaSuccessDialogComponent', () => {
  let component: AsistenciaSuccessDialogComponent;
  let fixture: ComponentFixture<AsistenciaSuccessDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsistenciaSuccessDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AsistenciaSuccessDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
