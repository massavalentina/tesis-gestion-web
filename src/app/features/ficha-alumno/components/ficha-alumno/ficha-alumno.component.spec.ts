import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FichaAlumnoComponent } from './ficha-alumno.component';

describe('FichaAlumnoComponent', () => {
  let component: FichaAlumnoComponent;
  let fixture: ComponentFixture<FichaAlumnoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FichaAlumnoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FichaAlumnoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
