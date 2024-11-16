import expect from 'expect';
import { it, describe } from 'mocha';

import plugin from './bottom-exports';
import { runPlugin } from './testing';

describe('bottom-exports', () => {
  it('noop ', () => {
    const result = runPlugin(plugin, `const foo = 1`);

    expect(result).toEqual('const foo = 1');
  });

  it('export const', () => {
    const result = runPlugin(plugin, `export const foo = 1`);
    expect(result).toEqual('const foo = 1;\nexport { foo };');
  });

  it('export var', () => {
    const result = runPlugin(plugin, `export var v = 1`);
    expect(result).toEqual('var v = 1;\nexport { v };');
  });

  it('multiple vars in declaration', () => {
    const result = runPlugin(plugin, `export const a = 1, b = 2`);
    expect(result).toEqual('const a = 1, b = 2;\nexport { a, b };');
  });

  it('single function', () => {
    const result = runPlugin(plugin, `export function f() { }`);
    expect(result).toEqual('function f() { }\nexport { f };');
  });

  it('export class');
  it('combine already declared bottom export');
  it('collect from top and move to bottom');
});
