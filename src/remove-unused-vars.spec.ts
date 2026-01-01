import { expect } from 'expect';
import { applyTransform } from 'jscodeshift/src/testUtils';
import { dedent } from 'strip-indent';

import removeUnusedVars, { TOptions } from './remove-unused-vars.ts';
type GetNoUnusedVars = TOptions['getNoUnusedVars'];

describe('remove unused vars', () => {
  it('should remove unused destructured variable', () => {
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
          ],
        },
      ];
    };
    const source = dedent(`
      const { usedDestructured, unusedDestructured } = object;
      console.log(usedDestructured);
    `);
    const expected = dedent(`
      const {
        usedDestructured
      } = object;
      console.log(usedDestructured);
    `);
    const result = applyTransform(
      { default: removeUnusedVars, parser: 'ts' },
      { getNoUnusedVars },
      { source },
    );

    expect(result).toBe(expected);
  });
});
