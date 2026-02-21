import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionTournees } from './gestion-tournees';

describe('GestionTournees', () => {
  let component: GestionTournees;
  let fixture: ComponentFixture<GestionTournees>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionTournees]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionTournees);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
