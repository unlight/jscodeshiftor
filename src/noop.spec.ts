import { expect } from 'expect';
import { applyTransform } from 'jscodeshift/src/testUtils';
import { it, describe } from 'mocha';
import { dedent } from 'strip-indent';

import plugin from './noop';

describe('noop', () => {
  it('noop', () => {
    const source = dedent(``);
    const expected = dedent(``);
    const result = applyTransform(
      { default: plugin, parser: 'ts' },
      {},
      { source },
    );

    expect(result).toBe(expected);
  });
});
