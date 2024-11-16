import expect from 'expect';
import { it, describe } from 'mocha';

import plugin from './duplicate-object-keys';
import { runPlugin } from './testing';

describe('duplicate-object-keys', () => {
  it('duplicate-object-keys 1', async () => {
    const result = await runPlugin(
      plugin,
      /* JavaScript */ `
        var x = {
            [a]: 1,
            a: a,
            'a': 'a',
            a() { },
            get a() { },
            b: b,
            a: aa,
            a: a,
            z: z
        }`,
    );

    expect(result).toEqual(/* JavaScript */ `
        var x = {
            [a]: 1,
            b: b,
            a: a,
            z: z
        }`);
  });

  it('duplicate-object-keys nested', () => {
    const result = runPlugin(
      plugin,
      /* JavaScript */ `
        var x = {
            a: {
                a: 1
            },
            b: {
                a: 2
            }
        }`,
    );
    expect(result).toEqual(/* JavaScript */ `
        var x = {
            a: {
                a: 1
            },
            b: {
                a: 2
            }
        }`);
  });

  it('ignore object spread', () => {
    const result = runPlugin(plugin, `var x = {...(date && { date }) }`);
    expect(result).toEqual(`var x = {...(date && { date }) }`);
  });
});
