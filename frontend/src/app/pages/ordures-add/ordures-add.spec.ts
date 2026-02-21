import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrduresAdd } from './ordures-add';

describe('OrduresAdd', () => {
  let component: OrduresAdd;
  let fixture: ComponentFixture<OrduresAdd>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrduresAdd]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrduresAdd);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
