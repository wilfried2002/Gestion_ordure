import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuiviRequetes } from './suivi-requetes';

describe('SuiviRequetes', () => {
  let component: SuiviRequetes;
  let fixture: ComponentFixture<SuiviRequetes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuiviRequetes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuiviRequetes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
