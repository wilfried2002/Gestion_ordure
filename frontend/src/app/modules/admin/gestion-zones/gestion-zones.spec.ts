import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionZones } from './gestion-zones';

describe('GestionZones', () => {
  let component: GestionZones;
  let fixture: ComponentFixture<GestionZones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionZones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionZones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
