import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrduresList } from './ordures-list';

describe('OrduresList', () => {
  let component: OrduresList;
  let fixture: ComponentFixture<OrduresList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrduresList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrduresList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
