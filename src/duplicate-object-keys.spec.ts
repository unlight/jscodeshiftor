import expect from 'expect';

import plugin from './duplicate-object-keys';
import { code, runPlugin } from './testing';

it('duplicate-object-keys 1', () => {
    const result = runPlugin(
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
    expect(code(result)).toEqual(/* JavaScript */ `
        var x = {
            [a]: 1,
            b: b,
            a: a,
            z: z
        }`);
});
