import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsistenciaRapidaComponent } from './asistencia-rapida.component';

describe('AsistenciaRapidaComponent', () => {
  let component: AsistenciaRapidaComponent;
  let fixture: ComponentFixture<AsistenciaRapidaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsistenciaRapidaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AsistenciaRapidaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
