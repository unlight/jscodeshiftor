import expect from 'expect';
import { it, describe } from 'mocha';

import plugin from './bottom-exports';
import { runPlugin, runTransform } from './testing';

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

  it('keep exports', () => {
    const { lines } = runTransform(
      plugin,
      'const a = 1, b = 1; export { a as e, b }',
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual('const a = 1, b = 1');
    expect(lines[1]).toEqual('export { a as e, b }');
  });

  it('export class', () => {
    expect(runPlugin(plugin, 'export class A { }')).toEqual(
      'class A { };\nexport { A };',
    );
  });

  it('combine already declared bottom export', () => {
    const { lines } = runTransform(
      plugin,
      'const a = 1; export const b = 1; export { a }',
    );

    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual('const a = 1');
    expect(lines[1]).toEqual('const b = 1');
    expect(lines[2]).toEqual('export { a, b }');
  });

  it('collect from top and move to bottom', () => {
    const { lines } = runTransform(plugin, 'export { a }; const a = 1;');
    expect(lines).toEqual(['const a = 1', 'export { a }']);
  });
});
