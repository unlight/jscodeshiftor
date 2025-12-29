import { expect } from 'expect';
import { applyTransform } from 'jscodeshift/src/testUtils';
import { dedent } from 'strip-indent';

import removeFeatureFlags from './remove-feature-flags';
import { runTransform } from './testing';

it('transforms if statements with feature flag true', async () => {
  const source =
    'if (process.env.FF_1234_STORY) execute(); else executeLegacy();';
  const result = await runTransform(removeFeatureFlags, source, {
    flagNames: ['FF_1234_STORY'],
  });

  expect(result.content).toBe('execute();');
});

it('transforms if statements with negation', () => {
  const source =
    'if (!process.env.FF_1234_STORY) { executeLegacy() } else { execute() }';
  const result = applyTransform(
    removeFeatureFlags,
    { flagNames: ['FF_1234_STORY'] },
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
    { flagNames: ['FF_1234_STORY'] },
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
    { flagNames: ['FF_1234_STORY'] },
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
        ...({ b: 2 }),
        d: 4
      };
    `);

  const result = applyTransform(
    removeFeatureFlags,
    { flagNames: ['FF_1234_STORY'] },
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
    { flagNames: ['FF_1234_STORY', 'FF_5678_STORY'] },
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
    { flagNames: ['FF_1234_STORY'] },
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
    { flagNames: ['FF_1234_STORY'] },
    { source },
  );

  expect(result).toBe(expected);
});

it('does not transform non-feature-flag code', () => {
  const source = dedent(`
      if (otherCondition) {
        execute();
      }

      const x = regularVar ? a : b;
    `);
  const result = applyTransform(
    removeFeatureFlags,
    { flagNames: ['FF_1234_STORY'] },
    { source },
  );

  expect(result).toBe(source);
});
