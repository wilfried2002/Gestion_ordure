import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaTournee } from './ma-tournee';

describe('MaTournee', () => {
  let component: MaTournee;
  let fixture: ComponentFixture<MaTournee>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaTournee]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaTournee);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
