import jscodeshift from 'jscodeshift';
import { print, prettyPrint } from 'recast';
import { describe } from 'jscodeshift-helper';

export { print, prettyPrint, describe };

export function printCode(...args: any[]) {
  args.forEach(arg => console.log(code(arg)));
}

export function code(ast: any) {
  return print(ast).code;
}

export function api(options): jscodeshift.API {
  let j = jscodeshift;

  if (options.parser) {
    j = j.withParser(options.parser);
  }

  return {
    jscodeshift: j,
    j,
    stats: () => {},
    report: () => {},
  };
}

type File = {
  path: string;
  source: string;
};

export function runPlugin(
  plugin: jscodeshift.Transform,
  file: string | File,
  options = {},
) {
  const source = typeof file === 'string' ? file : file.source;
  const path = typeof file === 'string' ? 'test.js' : file.path;
  return plugin({ source, path }, api(options), options);
}

export function wrapPlugin(plugin: jscodeshift.Transform) {
  return (source: string | File, options = {}) =>
    runPlugin(plugin, source, options) || null;
}
