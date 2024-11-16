import jscodeshift from 'jscodeshift';
import { describe, printCode } from './testing';

export default <jscodeshift.Transform>function (file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const exportNames: string[] = [];

  // Find exports
  root.find(j.ExportNamedDeclaration).forEach(path => {
    const declaration = path.value.declaration;
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

    path.replace(declaration as any);
  });

  const exportNamedDeclaration = j.exportNamedDeclaration(
    null, // No declaration
    exportNames.map(name =>
      j.exportSpecifier.from({
        exported: j.identifier(name),
        local: j.identifier(name),
      }),
    ),
  );

  if (exportNamedDeclaration.specifiers?.length) {
    const program: jscodeshift.Program = root.get().node.program;

    program.body.push(exportNamedDeclaration);
  }

  return root.toSource({
    lineTerminator: '\n',
  });
};
