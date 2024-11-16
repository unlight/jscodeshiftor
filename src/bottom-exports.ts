import { ok } from 'assert';
import jscodeshift from 'jscodeshift';
import { describe, printCode } from './testing';

export default <jscodeshift.Transform>function (file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);
  type ExportSpecifier = any;

  const exportNames: string[] = [];
  const exportSpecifiers: ExportSpecifier[] = [];

  // Find exports
  root.find(j.ExportNamedDeclaration).forEach(path => {
    const { specifiers, declaration } = path.value;

    if (specifiers) exportSpecifiers.push(...specifiers);

    j(path)
      .find(j.VariableDeclarator)
      .filter(path => path.parent.value === declaration)
      .forEach(path => {
        if (path.value.id.type === 'Identifier') {
          exportNames.push(path.value.id.name);
        }
      });

    j(path)
      .find(j.FunctionDeclaration)
      .filter(path => path.parent.value === declaration)
      .forEach(path => {
        const name = path.value.id?.name;

        if (name) exportNames.push(name);
      });

    // Remove export keyword
    path.replace(declaration as any);
  });

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

  if (exportNamedDeclaration.specifiers?.length) {
    const program: jscodeshift.Program = root.get().node.program;

    program.body.push(exportNamedDeclaration);
  }

  return root.toSource({
    lineTerminator: '\n',
  });
};
