import expect from 'expect';
import { it, describe } from 'mocha';

import plugin from './export-default-name';
import { runTransform } from './testing';

describe('export default name', () => {
  it('no default export', async () => {
    const result = await runTransform(plugin, `export const foo = 1`);
    expect(result.content).toEqual('export const foo = 1');
  });

  it('take name from file', async () => {
    const result = await runTransform(plugin, {
      path: '/usr/app/homie.js',
      source: 'export default 1',
    });
    expect(result.lines).toEqual(['const homie = 1', 'export default homie']);
  });

  it('default assigment', async () => {
    const result = await runTransform(plugin, `export default foo = 1`);
    expect(result.lines).toEqual(['const foo = 1', 'export default foo']);
  });

  it('file reserved word', async () => {
    const result = await runTransform(plugin, {
      path: '/usr/app/import.js',
      source: 'export default () => {}',
    });
    expect(result.lines).toEqual([
      'const _import = () => {}',
      'export default _import',
    ]);
  });

  it('anonymous function ', async () => {
    const result = await runTransform(plugin, {
      path: '/usr/app/moscow.js',
      source: 'export default function(){}',
    });
    expect(result.lines).toEqual([
      'function moscow() {}',
      'export default moscow',
    ]);
  });

  it('anonymous class ', async () => {
    const result = await runTransform(plugin, {
      path: '/usr/app/chicago.js',
      source: 'export default class{}',
    });
    expect(result.lines).toEqual([
      'class chicago {}',
      'export default chicago',
    ]);
  });

  it('already declared', async () => {
    const result = await runTransform(plugin, {
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

  it('reuse default with name', async () => {
    const result = await runTransform(plugin, `export default class Sheet { }`);

    expect(result.lines).toEqual(['class Sheet { }', 'export default Sheet']);
  });

  it('default call expression', async () => {
    const result = await runTransform(plugin, {
      path: '/usr/app/a.js',
      source: 'export default registry(); const a = 1;',
    });

    expect(result.lines).toEqual([
      'const appA = registry()',
      'export default appA',
      'const a = 1',
    ]);
  });

  it('keep comments function', async () => {
    const result = await runTransform(plugin, {
      path: '/usr/app/fu.js',
      source: `/** comment */
      export default function() {}`,
    });
    expect(result.lines).toEqual([
      '/** comment */',
      'function fu() {}',
      'export default fu',
    ]);
  });

  it('keep comments class', async () => {
    const result = await runTransform(plugin, {
      path: '/usr/app/kl.js',
      source: `/** comment */
      export default class {}`,
    });
    expect(result.lines).toEqual([
      '/** comment */',
      'class kl {}',
      'export default kl',
    ]);
  });

  it('keep comments literals', async () => {
    const result = await runTransform(plugin, {
      path: '/usr/app/v.js',
      source: `/** comment */
      export default 1`,
    });
    expect(result.lines).toEqual([
      '/** comment */',
      'const v = 1',
      'export default v',
    ]);
  });

  it('keep comments assignment expression', async () => {
    const result = await runTransform(plugin, {
      path: '/usr/app/v.js',
      source: `/** comment */
      export default x()`,
    });
    expect(result.lines).toEqual([
      '/** comment */',
      'const v = x()',
      'export default v',
    ]);
  });
});
