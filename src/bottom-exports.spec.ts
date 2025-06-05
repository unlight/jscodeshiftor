import expect from 'expect';
import { it, describe } from 'mocha';

import plugin, { parser } from './bottom-exports';
import { runTransform } from './testing';

describe('bottom-exports', () => {
  it('nothing ', async () => {
    const { lines } = await runTransform(plugin, `const foo = 1`);
    expect(lines).toEqual(['const foo = 1']);
  });

  it('export const', async () => {
    const { lines } = await runTransform(plugin, `export const foo = 1`);
    expect(lines).toEqual(['const foo = 1', 'export { foo }']);
  });

  it('export var', async () => {
    const { lines } = await runTransform(plugin, `export var v = 1`);
    expect(lines).toEqual(['var v = 1', 'export { v }']);
  });

  it('multiple vars in declaration', async () => {
    const { lines } = await runTransform(plugin, `export const a = 1, b = 2`);
    expect(lines).toEqual(['const a = 1, b = 2', 'export { a, b }']);
  });

  it('single function', async () => {
    const { lines } = await runTransform(plugin, `export function f() { }`);
    expect(lines).toEqual(['function f() { }', 'export { f }']);
  });

  it('keep exports', async () => {
    const { lines } = await runTransform(
      plugin,
      'const a = 1, b = 1; export { a as e, b }',
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual('const a = 1, b = 1');
    expect(lines[1]).toEqual('export { a as e, b }');
  });

  it('export class', async () => {
    const { lines } = await runTransform(plugin, 'export class A { }');
    expect(lines).toEqual(['class A { }', 'export { A }']);
  });

  it('combine already declared bottom export', async () => {
    const { lines } = await runTransform(
      plugin,
      'const a = 1; export const b = 1; export { a }',
    );

    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual('const a = 1');
    expect(lines[1]).toEqual('const b = 1');
    expect(lines[2]).toEqual('export { a, b }');
  });

  it('collect from top and move to bottom', async () => {
    const { lines } = await runTransform(plugin, 'export { a }; const a = 1;');
    expect(lines).toEqual(['const a = 1', 'export { a }']);
  });

  it('keep exports from', async () => {
    const { lines } = await runTransform(plugin, `export { a } from './a.js'`);
    expect(lines).toEqual([`export { a } from './a.js'`]);
  });

  it('exported from object', async () => {
    const { lines } = await runTransform(
      plugin,
      'const exported = {}; export const { d } = exported',
      { parser },
    );
    expect(lines).toEqual([
      'const exported = {}',
      'const { d } = exported',
      'export { d }',
    ]);
  });

  it('move export default before', async () => {
    const { lines } = await runTransform(
      plugin,
      `const a = 1;
      export default a;
      export const b = 1`,
    );

    expect(lines).toHaveLength(4);
    expect(lines[0]).toEqual('const a = 1');
    expect(lines[1]).toEqual('const b = 1');
    expect(lines[2]).toEqual('export default a');
    expect(lines[3]).toEqual('export { b }');
  });

  it('move default to the end', async () => {
    const { lines } = await runTransform(
      plugin,
      `export default form;
      function form (p) {};
      function header(hdr) {};`,
    );
    expect(lines).toEqual([
      'function form (p) {}',
      'function header(hdr) {}',
      'export default form',
    ]);
  });

  it.skip('export default and other witout line break', async () => {
    const result = await runTransform(
      plugin,
      'export default form;\n\nfunction form (p) {};\n\nexport const x = 1',
    );

    const lines = String(result.content).split('\n').slice(-2);
    expect(lines).toEqual(['export default form;', 'export { x };']);
  });
});
