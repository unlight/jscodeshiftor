import { expect } from 'expect';
import { applyTransform } from 'jscodeshift/src/testUtils';
import { dedent } from 'strip-indent';

import removeFeatureFlags from './remove-feature-flags';
import { runTransform } from './testing';

describe('remove feature flags', () => {
  it('transforms if statements with feature flag true', async () => {
    const source =
      'if (process.env.FF_1234_STORY) execute(); else executeLegacy();';
    const result = await runTransform(removeFeatureFlags, source, {
      flags: ['FF_1234_STORY'],
    });

    expect(result.content).toBe('execute();');
  });

  it('transforms if statements with negation', () => {
    const source =
      'if (!process.env.FF_1234_STORY) { executeLegacy() } else { execute() }';
    const result = applyTransform(
      removeFeatureFlags,
      { flags: ['FF_1234_STORY'] },
      { source },
    );

    expect(result).toBe('execute()');
  });

  it('transforms ternary expressions', () => {
    const source = dedent(`
      const a = context.FF_1234_STORY ? truthy : falsy;
      const b = !config.FF_1234_STORY ? falsy : truthy;
    `);
    const expected = dedent(`
      const a = truthy;
      const b = truthy;
    `);
    const result = applyTransform(
      removeFeatureFlags,
      { flags: ['FF_1234_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('transforms logical AND expressions', () => {
    const source = dedent(`
      const x = context.FF_1234_STORY && { a: 1 };
      const y = flags.FF_1234_STORY && someFunction();
    `);
    const expected = dedent(`
      const x = { a: 1 };
      const y = someFunction();
    `);

    const result = applyTransform(
      removeFeatureFlags,
      { flags: ['FF_1234_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('transforms spread elements with logical expressions', () => {
    const source = dedent(`
      const obj = {
        a: 1,
        ...(context.FF_1234_STORY && { b: 2 }),
        ...(!config.FF_1234_STORY && { c: 3 }),
        d: 4
      };
    `);

    const expected = dedent(`
      const obj = {
        a: 1,
        b: 2,
        d: 4
      };
    `);

    const result = applyTransform(
      removeFeatureFlags,
      { flags: ['FF_1234_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('handles multiple flags', () => {
    const source = dedent(`
      if (process.env.FF_1234_STORY && context.FF_5678_STORY) {
        execute();
      } else {
        fallback();
      }
    `);

    const expected = dedent(`
      execute();
    `);

    const result = applyTransform(
      removeFeatureFlags,
      { flags: ['FF_1234_STORY', 'FF_5678_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('handles nested conditions', () => {
    const source = dedent(`
      function test() {
        if (process.env.FF_1234_STORY) {
          if (someOtherCondition) {
            return a;
          }
          return b;
        } else {
          return c;
        }
      }
    `);

    const expected = dedent(`
      function test() {
        if (someOtherCondition) {
          return a;
        }
        return b;
      }
    `);

    const result = applyTransform(
      removeFeatureFlags,
      { flags: ['FF_1234_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('handles string comparisons', () => {
    const source = dedent(`
      if (process.env.FF_1234_STORY === 'true') {
        execute();
      }

      if (process.env.FF_1234_STORY === 'false') {
        legacy();
      }
    `);
    const expected = dedent('execute();');

    const result = applyTransform(
      removeFeatureFlags,
      { flags: ['FF_1234_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('does not transform non-feature-flag code', () => {
    const source = dedent(`
      // These should not be modified
      status.code = status.code._ || status.code;
      const emptyObject = {};
      const regularFlag = isEnabled ? a : b;
      const underscore = someObj._ && something;
    `);
    const expected = source;

    const result = applyTransform(
      removeFeatureFlags,
      { flags: ['FF_1234_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('handles destructured feature flags', () => {
    const source = dedent(`
      const { FF_1234_STORY } = process.env;
      const { FF_5678_STORY } = someObject;

      if (FF_1234_STORY) {
        execute();
      } else {
        legacy();
      }

      const result = FF_5678_STORY ? 'new' : 'old';
    `);

    const expected = dedent(`
      const { FF_1234_STORY } = process.env;
      const { FF_5678_STORY } = someObject;

      execute();

      const result = 'new';
    `);

    const result = applyTransform(
      removeFeatureFlags,
      { flags: ['FF_1234_STORY', 'FF_5678_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('transforms logical expressions with feature flags', () => {
    const source = dedent(`
      const x = someObject.FF_1234_STORY && { a: 1 };
      const y = flags.FF_5678_STORY && someFunction();
      const z = !config.FF_1234_STORY || fallback();
    `);

    const expected = dedent(`
      const x = { a: 1 };
      const y = someFunction();
      const z = fallback();
    `);

    const result = applyTransform(
      removeFeatureFlags,
      { flags: ['FF_1234_STORY', 'FF_5678_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('handles feature flags as boolean variables', () => {
    const source = dedent(`
      const FF_1234_STORY = true; // Always true
      const FF_5678_STORY = false; // This is not a feature flag

      if (FF_1234_STORY) {
        execute();
      }
    `);

    // Expected: Should transform since FF_1234_STORY matches our pattern
    const expected = dedent(`
      const FF_1234_STORY = true; // Always true
      const FF_5678_STORY = false; // This is not a feature flag

      execute();
    `);

    const result = applyTransform(
      removeFeatureFlags,
      { flags: ['FF_1234_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('ignores non-matching flag names', () => {
    const source = dedent(`
      if (someObject.OTHER_FLAG) {
        execute();
      }

      if (flags.FF_1234) { // Doesn't match FF_<digits>_<name> pattern
        doSomething();
      }
    `);

    // Expected: No changes since flag names don't match
    const expected = source;

    const result = applyTransform(
      removeFeatureFlags,
      { flags: ['FF_1234_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('ignores non feature flag code', () => {
    const source = dedent(`
      status.code = status.code._ || status.code;
    `);
    const expected = source;
    const result = applyTransform(
      { default: removeFeatureFlags, parser: 'ts' },
      { flags: ['FF_1234_STORY', 'FF_20150_PRICE'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('handles nested arrays in spread', () => {
    const source = dedent(`
      const items = [
        ...(FF_1234_STORY ? [[1, 2], [3, 4]] : [[5]]),
        [6]
      ];
    `);

    const expected = dedent(`
      const items = [[1, 2], [3, 4], [6]];
    `);

    const result = applyTransform(
      { default: removeFeatureFlags, parser: 'ts' },
      { flags: ['FF_1234_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('transforms spread with ternary returning array in function call', () => {
    const source = dedent(`
      function_call(
        { options },
        ...(FF_1234_STORY
          ? [sign, number(G('price'), 2, numberLocale)]
          : [number1, Math.abs, 2, numberLocale]
          )
      );
    `);
    const expected = dedent(`
      function_call({ options }, sign, number(G('price'), 2, numberLocale));
    `);
    const result = applyTransform(
      removeFeatureFlags,
      { flags: ['FF_1234_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('handles direct spread of array after transformation', () => {
    const source = dedent(`
      // After flag is true, we have ...[...array]
      const items = [
        ...(FF_1234_STORY ? [...extraItems] : []),
        regularItem
      ];
    `);

    const expected = dedent(`
      // After flag is true, we have ...[...array]
      const items = [
        ...extraItems,
        regularItem
      ];
    `);

    const result = applyTransform(
      removeFeatureFlags,
      { flags: ['FF_1234_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('transforms spread with logical AND returning array', () => {
    const source = dedent(`
      const result = someFunction(
        arg1,
        ...(FF_1234_STORY && [arg2, arg3]),
        arg4
      );
    `);

    const expected = dedent(`
      const result = someFunction(arg1, arg2, arg3, arg4);
    `);

    const result = applyTransform(
      removeFeatureFlags,
      { flags: ['FF_1234_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('should preserve nullish coalescing in direct spreads', () => {
    const source = dedent(`
      const a = [...[purchaseOrder ?? []], ...purchaseOrderAdditional];
      const b = [...(FF_1234_STORY ? [item1, item2] : [])];
    `);

    const expected = dedent(`
      const a = [...[purchaseOrder ?? []], ...purchaseOrderAdditional];
      const b = [item1, item2];
    `);

    const result = applyTransform(
      { default: removeFeatureFlags, parser: 'ts' },
      { flags: ['FF_1234_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('should not modify complex expressions in direct spreads', () => {
    const source = dedent(`
      // These should remain unchanged
      const a = [...(items || [])];
      const b = [...(getItems() ?? [])];
      const c = [...(condition ? computedArray : fallbackArray)];

      // This should be transformed (has feature flag)
      const d = [...(FF_1234_STORY ? specialItems : defaultItems)];
    `);

    const expected = dedent(`
      // These should remain unchanged
      const a = [...(items || [])];
      const b = [...(getItems() ?? [])];
      const c = [...(condition ? computedArray : fallbackArray)];

      // This should be transformed (has feature flag)
      const d = [...(specialItems)];
    `);
    const result = applyTransform(
      { default: removeFeatureFlags, parser: 'ts' },
      { flags: ['FF_1234_STORY'] },
      { source },
    );

    expect(result).toBe(expected);
  });

  it('merge spread objects', async () => {
    const source = dedent(`
      const a = {
        ...{
          a: 1,
          ...(FF_1_A && {
            x: true,
          }),
          b: 2,
        },
      };
    `);
    const expected = dedent(`
      const a = {
        a: 1,
        x: true,
        b: 2
      };
    `);
    const result = applyTransform(
      { default: removeFeatureFlags, parser: 'ts' },
      { flags: ['FF_1_A'] },
      { source },
    );

    expect(result).toBe(expected);
  });
});
