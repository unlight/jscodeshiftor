import jscodeshift from 'jscodeshift';
import { parse, print } from 'recast';

export function code(text: string | void | null | undefined): string {
    return print(parse(String(text)), { lineTerminator: '\n' }).code;
}

export function api(): jscodeshift.API {
    return {
        jscodeshift,
        j: jscodeshift,
        stats: () => {},
        report: () => {},
    };
}

export function runPlugin(plugin: jscodeshift.Transform, source: string, options = {}) {
    return plugin({ source, path: 'test.js' }, api(), options);
}

export function wrapPlugin(plugin: jscodeshift.Transform) {
    return (source: string, options = {}) => runPlugin(plugin, source, options) || null;
}
