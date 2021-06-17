import { runPlugin } from '../testing';
import plugin from './noop';

it('noop', () => {
    const result = runPlugin(plugin, `const foo = 1`);
});
