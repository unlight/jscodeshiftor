import { expect } from 'expect';
import { applyTransform } from 'jscodeshift/src/testUtils';
import { it } from 'mocha';
import { dedent } from 'strip-indent';

import transform from './remove-falsy-seq.ts';

it('remove false from seq', () => {
  const source = dedent(`
    import seq from '@noodoo/seq';
    seq(false, callback);
  `);
  const expected = dedent(`
    import seq from '@noodoo/seq';
    seq(callback);
  `);
  const result = applyTransform(transform, {}, { source }, { parser: 'ts' });

  expect(result).toBe(expected);
});

it('import as non seq name', () => {
  const source = dedent(`
    import sequentially from '@noodoo/seq';
    sequentially(false, callback);
  `);
  const expected = dedent(`
    import sequentially from '@noodoo/seq';
    sequentially(callback);
  `);
  const result = applyTransform(transform, {}, { source }, { parser: 'ts' });

  expect(result).toBe(expected);
});

it('multiple arguments', () => {
  const source = dedent(`
    import seq from '@noodoo/seq';
    seq({}, false, callback);
  `);
  const expected = dedent(`
    import seq from '@noodoo/seq';
    seq({}, callback);
  `);
  const result = applyTransform(transform, {}, { source }, { parser: 'ts' });

  expect(result).toBe(expected);
});

it('no seq', () => {
  const source = dedent(`
    seq(false, callback);
  `);
  const expected = dedent(`
    seq(false, callback);
  `);
  const result = applyTransform(transform, {}, { source }, { parser: 'ts' });

  expect(result).toBe(expected);
});
