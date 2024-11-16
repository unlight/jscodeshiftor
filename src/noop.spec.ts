import expect from 'expect';
import { it, describe } from 'mocha';

import plugin from './noop';
import { runPlugin } from './testing';

describe('noop', () => {
  it('noop', () => {
    const result = runPlugin(plugin, `const foo = 1`);

    expect(result).toEqual('const foo = 1');
  });
});
