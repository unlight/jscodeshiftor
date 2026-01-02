import { expect } from 'expect';
import { applyTransform } from 'jscodeshift/src/testUtils';
import { dedent } from 'strip-indent';

import removeUnusedVars, { TOptions } from './remove-unused-vars.ts';
type GetNoUnusedVars = TOptions['getNoUnusedVars'];

describe('remove unused vars from destructured object', () => {
  it('should remove unused destructured variable', () => {
    // @ts-expect-error Test
    const getNoUnusedVars: GetNoUnusedVars = () => {
      return [
        {
          messages: [
            {
              column: 27,
              line: 1,
              message:
                "'unusedDestructured' is assigned a value but never used.",
              ruleId: 'no-unused-vars',
            },
            {
              column: 12,
              line: 2,
              message: "'unused' is assigned a value but never used.",
              ruleId: 'no-unused-vars',
            },
          ],
        },
      ];
    };
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
    // @ts-expect-error Test
    const getNoUnusedVars: GetNoUnusedVars = () => {
      return [
        {
          messages: [
            {
              column: 12,
              line: 2,
              message: "'unused' is assigned a value but never used.",
              ruleId: 'no-unused-vars',
            },
          ],
        },
      ];
    };
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
});
