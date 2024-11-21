import expect from 'expect';
import { it, describe } from 'mocha';

import plugin from './export-default-name';
import { runTransform } from './testing';

describe('export default name', () => {
  it('no default export', () => {
    const result = runTransform(plugin, `export const foo = 1`);
    expect(result.content).toEqual('export const foo = 1');
  });

  it('take name from file', () => {
    const result = runTransform(plugin, {
      path: '/usr/app/homie.js',
      source: 'export default 1',
    });
    expect(result.lines).toEqual(['const homie = 1', 'export default homie']);
  });

  it('default assigment', () => {
    const result = runTransform(plugin, `export default foo = 1`);
    expect(result.lines).toEqual(['const foo = 1', 'export default foo']);
  });

  it('file reserved word', () => {
    const result = runTransform(plugin, {
      path: '/usr/app/import.js',
      source: 'export default () => {}',
    });
    expect(result.lines).toEqual([
      'const _import = () => {}',
      'export default _import',
    ]);
  });

  it('anonymous function ', () => {
    const result = runTransform(plugin, {
      path: '/usr/app/moscow.js',
      source: 'export default function(){}',
    });
    expect(result.lines).toEqual([
      'function moscow() {}',
      'export default moscow',
    ]);
  });

  it('anonymous class ', () => {
    const result = runTransform(plugin, {
      path: '/usr/app/chicago.js',
      source: 'export default class{}',
    });
    expect(result.lines).toEqual([
      'class chicago {}',
      'export default chicago',
    ]);
  });

  it('already declared', () => {
    const result = runTransform(plugin, {
      path: '/usr/app/joo.js',
      source: `import joo from "joo";
      const { appJoo } = shared;
      export default function () {}`,
    });
    expect(result.lines).toEqual([
      'import joo from "joo"',
      'const { appJoo } = shared',
      'function usrAppJoo() {}',
      'export default usrAppJoo',
    ]);
  });
});
