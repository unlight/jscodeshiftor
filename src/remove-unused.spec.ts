import { expect } from 'expect';
import { applyTransform } from 'jscodeshift/src/testUtils';
import { dedent } from 'strip-indent';

import removeUnusedVars, { type LintMessage } from './remove-unused.ts';

const createGetNoUnusedVars = (...messages: Partial<LintMessage>[]) => {
  return function getNoUnusedVars() {
    return [{ messages }];
  };
};

describe('remove unused vars from destructured object', () => {
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
});
