import expect from 'expect';

import { runPlugin } from '../testing';
import plugin from './duplicate-object-keys';

it('duplicate-object-keys 1', () => {
    const result = runPlugin(
        plugin,
        /* JavaScript */ `
        var x = {
            [a]: 1,
            a: a,
            b: b,
            a: aa,
            a: aaa
        }`,
    );
    expect(result).toEqual(/* JavaScript */ `
        var x = {
            [a]: 1,
            b: b,
            a: aaa
        }`);
});
