import { ok } from 'node:assert';

import jscodeshift from 'jscodeshift';

import { describe, printCode } from './testing';

export const parser = 'acorn';

export default <jscodeshift.Transform>function (file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  type ExportSpecifier = any;

  const exportNames: string[] = [];
  const exportSpecifiers: ExportSpecifier[] = [];

  // Find exports
  for (const path of root.find(j.ExportNamedDeclaration).paths()) {
    const { comments, declaration, source, specifiers } = path.value;

    // Keep export from
    if (source) continue;

    if (declaration && comments?.length) {
      if (!declaration?.comments?.length) declaration.comments = [];

      declaration.comments.unshift(...comments);
    }

    if (specifiers?.length) exportSpecifiers.push(...specifiers);

    j(path)
      .find(j.VariableDeclarator)
      .filter(path => path.parent.value === declaration)
      .forEach(path => {
        if (path.value.id.type === 'Identifier') {
          exportNames.push(path.value.id.name);
        }
        if (path.value.id.type === 'ObjectPattern') {
          for (const p of path.value.id.properties.filter(
            p => p.type === 'Property',
          )) {
            if (p.value.type === 'Identifier') {
              exportNames.push(p.value.name);
            }
          }
        }
      });

    if (declaration?.type === 'ClassDeclaration') {
      const name = declaration.id?.name as string;
      if (name) exportNames.push(name);
    }

    if (declaration?.type === 'FunctionDeclaration') {
      const name = declaration.id?.name as string;
      if (name) exportNames.push(name);
    }

    // Remove export keyword
    path.replace(declaration as any);
  }

  const exportNamedDeclaration = j.exportNamedDeclaration(
    null, // No declaration
    [],
  );

  ok(exportNamedDeclaration.specifiers);

  const exportNameSpecifiers = exportNames.map(name =>
    j.exportSpecifier.from({
      exported: j.identifier(name),
      local: j.identifier(name),
    }),
  );

  exportNamedDeclaration.specifiers.push(
    ...exportSpecifiers,
    ...exportNameSpecifiers,
  );

  const exportDefaultDeclaration = root.find(j.ExportDefaultDeclaration);

  const program: jscodeshift.Program = root.get().node.program;
  program.body.push('\n' as any);

  const exportDefault = exportDefaultDeclaration.nodes();

  exportDefaultDeclaration.remove();

  program.body.push(...exportDefault);

  if (exportNamedDeclaration.specifiers?.length) {
    program.body.push(exportNamedDeclaration);
  }

  return root.toSource({
    lineTerminator: '\n',
    // reuseWhitespace: false,
  });
};
