import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionEquipes } from './gestion-equipes';

describe('GestionEquipes', () => {
  let component: GestionEquipes;
  let fixture: ComponentFixture<GestionEquipes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionEquipes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionEquipes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
