import { TestBed } from '@angular/core/testing';

import { Tournee } from './tournee';

describe('Tournee', () => {
  let service: Tournee;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Tournee);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
