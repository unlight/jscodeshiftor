import { applyTransform } from 'jscodeshift/src/testUtils';
import { dedent } from 'strip-indent';
import { it, expect } from 'vitest';

import removeUnusedVars from './remove-unused.ts';

const createGetNoUnusedVars = (...messages: Record<string, unknown>[]) => {
  return function getNoUnusedVars() {
    return [{ messages }];
  };
};

it('should remove unused destructured variable', () => {
  const getNoUnusedVars = createGetNoUnusedVars(
    {
      line: 1,
      message: "'unusedDestructured' is assigned a value but never used.",
      ruleId: 'no-unused-vars',
    },
    {
      line: 2,
      message: "'unused' is assigned a value but never used.",
      ruleId: 'no-unused-vars',
    },
  );
  const source = dedent(`
      const { usedDestructured, unusedDestructured } = object;
      const { unused } = object;
    `);
  const expected = dedent(`
      const {
        usedDestructured
      } = object;
    `);
  const result = applyTransform(
    { default: removeUnusedVars, parser: 'ts' },
    { getNoUnusedVars },
    { source },
  );

  expect(result).toBe(expected);
});

it('keep unrelated empty assignment expression', () => {
  const getNoUnusedVars = createGetNoUnusedVars({
    line: 2,
    message: "'unused' is assigned a value but never used.",
    ruleId: 'no-unused-vars',
  });
  const source = dedent(`
      const { origin = {}, model } = object;
    `);
  const expected = dedent(`
      const { origin = {}, model } = object;
    `);
  const result = applyTransform(
    { default: removeUnusedVars, parser: 'ts' },
    { getNoUnusedVars },
    { source },
  );

  expect(result).toBe(expected);
});

it('remove unused functions', () => {
  const getNoUnusedVars = createGetNoUnusedVars(
    {
      line: 1,
      message: "'unusedFunc' is assigned a value but never used.",
      ruleId: 'no-unused-vars',
    },
    {
      line: 4,
      message: "'unusedFunc2' is assigned a value but never used.",
      ruleId: 'no-unused-vars',
    },
  );
  const source = dedent(`
      function unusedFunc() {};
      var a;
      console.log();
      function unusedFunc2() {};
    `);
  const expected = dedent(`
      var a;
      console.log();
    `);
  const result = applyTransform(
    { default: removeUnusedVars, parser: 'ts' },
    { getNoUnusedVars },
    { source },
  );

  expect(result).toBe(expected);
});

it('unreachable code', () => {
  const getNoUnusedVars = createGetNoUnusedVars({
    column: 2,
    endColumn: 16,
    endLine: 4,
    line: 3,
    ruleId: 'no-unreachable',
  });
  const source = dedent(`
      function fn() {
        return;
        x = 3;
        console.log();
      }
    `);
  const expected = dedent(`
      function fn() {
        return;
      }
    `);
  const result = applyTransform(
    { default: removeUnusedVars, parser: 'ts' },
    { getNoUnusedVars },
    { source },
  );

  expect(result).toBe(expected);
});

it('unused variable init', () => {
  const getNoUnusedVars = createGetNoUnusedVars({
    column: 13,
    line: 1,
    message: "'state' is assigned a value but never used.",
    ruleId: 'no-unused-vars',
  });
  const source = dedent(`
      var a; const state = s.isBefore(), x = 1; var b;
    `);
  const expected = dedent(`
      var a; const x = 1; var b;
    `);
  const result = applyTransform(
    { default: removeUnusedVars, parser: 'ts' },
    { getNoUnusedVars },
    { source },
  );

  expect(result).toBe(expected);
});

it('unreachable double return', () => {
  const getNoUnusedVars = createGetNoUnusedVars({
    column: 9,
    endColumn: 16,
    endLine: 5,
    line: 5,
    message: 'Unreachable code.',
    messageId: 'unreachableCode',
    nodeType: 'ReturnStatement',
    ruleId: 'no-unreachable',
    severity: 2,
  });
  const source = dedent(`// prettier-ignore
function fn() {
        return 1;

        return;
      }
`);
  const expected = dedent(`// prettier-ignore
function fn() {
  return 1;
}
`);
  const result = applyTransform(
    { default: removeUnusedVars, parser: 'ts' },
    { getNoUnusedVars },
    { source },
  );

  expect(result).toBe(expected);
});

it('unreachable statements', () => {
  const getNoUnusedVars = createGetNoUnusedVars({
    column: 13,
    endColumn: 17,
    endLine: 9,
    line: 3,
    message: 'Unreachable code.',
    messageId: 'unreachableCode',
    nodeType: 'VariableDeclaration',
    ruleId: 'no-unreachable',
    severity: 2,
  });
  const source = dedent(`// prettier-ignore
export async function get(ids) {
  return 1; let a; const rows = 1;
  const index = indexBy('id', rows);

  for (const key in events) {
  }

  return events;
}`);

  const result = applyTransform(
    { default: removeUnusedVars, parser: 'ts' },
    { getNoUnusedVars },
    { source },
  );
  expect(result).toEqual(`// prettier-ignore
export async function get(ids) {
  return 1;
}`);
});
