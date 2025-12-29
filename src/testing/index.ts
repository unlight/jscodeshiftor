import jscodeshift from 'jscodeshift';
import { print } from 'recast';

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
    j,
    jscodeshift: j,
    report: () => {},
    stats: () => {},
  };
}

type File = {
  path: string;
  source: string;
};

export async function runTransform(
  transform: jscodeshift.Transform,
  file: string | File,
  options = {},
) {
  const source = typeof file === 'string' ? file : file.source;
  const path = typeof file === 'string' ? 'test.js' : file.path;

  const content = await transform({ path, source }, api(options), options);
  const lines = String(content)
    .split('\n')
    .filter(Boolean)
    .map(line => (line.at(-1) === ';' ? line.slice(0, -1) : line));

  return { content, lines };
}

export function runPlugin(
  plugin: jscodeshift.Transform,
  file: string | File,
  options = {},
) {
  const source = typeof file === 'string' ? file : file.source;
  const path = typeof file === 'string' ? 'test.js' : file.path;

  const result = plugin({ path, source }, api(options), options);

  return result;
}

export function wrapPlugin(plugin: jscodeshift.Transform) {
  return (source: string | File, options = {}) =>
    runPlugin(plugin, source, options) || null;
}

export { print, prettyPrint } from 'recast';
export { describe } from 'jscodeshift-helper';
