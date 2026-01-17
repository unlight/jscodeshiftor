import { getImportsByPackageName } from './utils.ts';

import type { ASTPath, default as jscodeshift } from 'jscodeshift';

export default <jscodeshift.Transform>function (file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const [seqName] = getImportsByPackageName(j, root, '@noodoo/seq')
    .find(j.ImportDefaultSpecifier)
    .filter(path => j.Identifier.check(path.node.local))
    .map(path => path.get('local'))
    .nodes()
    .map(local => j.Identifier.check(local) && local.name);

  if (!seqName) return file.source;

  root
    .find(j.CallExpression, { callee: { type: 'Identifier' } })
    .filter(
      path =>
        j.Identifier.check(path.node.callee) &&
        path.node.callee.name === seqName,
    )
    .paths()
    .flatMap(callPath =>
      callPath.node.arguments.map((_, i) => callPath.get('arguments', i)),
    )
    .filter(
      (argPath: ASTPath) =>
        j.BooleanLiteral.check(argPath.node) && argPath.node.value === false,
    )
    .forEach((argPath: ASTPath) => {
      argPath.prune();
    });

  return root.toSource({
    lineTerminator: '\n',
  });
};
