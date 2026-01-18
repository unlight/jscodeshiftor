import { applyTransform } from 'jscodeshift/src/testUtils';
import { dedent } from 'strip-indent';
import { it, expect } from 'vitest';

import transform from './noop';

it('noop', () => {
  const source = dedent(``);
  const expected = dedent(``);
  const result = applyTransform(
    { default: transform, parser: 'ts' },
    {},
    { source },
  );

  expect(result).toBe(expected);
});
