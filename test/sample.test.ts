import {expect, it} from 'vitest';

import {test} from '../src';

it('just works', () => {
  expect(test(1)).toBe(2);
  expect(test(-1)).toBe(0);
});
