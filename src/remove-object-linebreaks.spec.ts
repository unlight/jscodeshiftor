import { expect } from 'expect';
import { applyTransform } from 'jscodeshift/src/testUtils';
import { describe, it } from 'mocha';
import { dedent } from 'strip-indent';

import transform from './remove-object-linebreaks.ts';

describe('remove object linebreaks', () => {
  it('should remove empty lines between simple properties', () => {
    const source = dedent(`
      ({
        a: 1,

        b: 2,

        c: 3,
      })`);
    const expected = dedent(`
      ({
        a: 1,
        b: 2,
        c: 3,
      })`);
    const result = applyTransform(
      { default: transform, parser: 'ts' },
      {},
      { source },
    );

    expect(result).toBe(expected);
  });

  it('should not modify objects with complex values', () => {
    const source = dedent(`
      ({
        a: {
          nested: true,
        },
        b: function() {
          return 42;
        },
      })`);
    const result = applyTransform(
      { default: transform, parser: 'ts' },
      {},
      { source },
    );

    expect(result).toBe(source);
  });

  it('should preserve comments between properties', () => {
    const source = dedent(`
  ({
    a: 1,
    // This is a comment
    b: 2,
    /* Multi-line
       comment */
    c: 3,
  })`);

    const result = applyTransform(
      { default: transform, parser: 'ts' },
      {},
      { source },
    );

    expect(result).toBe(source);
  });

  it('should handle nested objects correctly', () => {
    const source = dedent(`
      const obj = {
        a: 1,

        b: 2,
        nested: {
          x: 1,

          y: 2,
        },
        c: 3,
      };`);
    const expected = dedent(`
      const obj = {
        a: 1,
        b: 2,
        nested: {
          x: 1,
          y: 2,
        },
        c: 3,
      };`);

    const result = applyTransform(
      { default: transform, parser: 'ts' },
      {},
      { source },
    );

    expect(result).toBe(expected);
  });

  it('should handle computed properties', () => {
    const source = dedent(`
      ({
        a: 1,

        [computed]: 2,

        c: 3,
      })`);
    const expected = dedent(`
      ({
        a: 1,
        [computed]: 2,
        c: 3,
      })`);
    const result = applyTransform(
      { default: transform, parser: 'ts' },
      {},
      { source },
    );

    expect(result).toBe(expected);
  });

  it('should handle spread operator', () => {
    const source = dedent(`
      ({
        ...rest,

        a: 1,

        ...more,
      })`);
    const expected = dedent(`
      ({
        ...rest,
        a: 1,
        ...more,
      })`);

    const result = applyTransform(
      { default: transform, parser: 'ts' },
      {},
      { source },
    );

    expect(result).toBe(expected);
  });

  it('should handle methods and getters/setters', () => {
    const source = dedent(`
      ({
        a: 1,

        get value() {
          return this.a;
        },

        method() {
          return 42;
        },
      })`);
    const expected = dedent(`
      ({
        a: 1,
        get value() {
          return this.a;
        },
        method() {
          return 42;
        },
      })`);
    const result = applyTransform(
      { default: transform, parser: 'ts' },
      {},
      { source },
    );

    expect(result).toBe(expected);
  });

  it('should not modify single-line objects', () => {
    const source = dedent(`({ a: 1, b: 2, c: 3 })`);
    const result = applyTransform(
      { default: transform, parser: 'ts' },
      {},
      { source },
    );

    expect(result).toBe(source);
  });

  it('should handle edge cases with trailing commas', () => {
    const source = dedent(`
        ({
          a: 1,

          b: 2,

        })`);
    const expected = dedent(`
        ({
          a: 1,
          b: 2,
        })`);
    const result = applyTransform(
      { default: transform, parser: 'ts' },
      {},
      { source },
    );

    expect(result).toBe(expected);
  });
});
