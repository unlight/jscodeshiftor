import plugin from './noop';
import { runPlugin } from './testing';

it('noop', () => {
    const result = runPlugin(plugin, `const foo = 1`);
});
