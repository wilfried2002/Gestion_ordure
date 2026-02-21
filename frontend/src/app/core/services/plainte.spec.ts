import { TestBed } from '@angular/core/testing';

import { Plainte } from './plainte';

describe('Plainte', () => {
  let service: Plainte;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Plainte);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
