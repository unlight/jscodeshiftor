import expect from 'expect';
import { it, describe } from 'mocha';

import plugin from './noop';
import { runTransform } from './testing';

describe('noop', () => {
  it('noop', () => {
    const result = runTransform(plugin, `const foo = 1`);

    expect(result.lines).toEqual(['const foo = 1']);
  });
});
