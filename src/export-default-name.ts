import path from 'node:path';
import jscodeshift from 'jscodeshift';
import namify from 'namify';
import { prettyPrint, print, printCode } from './testing';

export default <jscodeshift.Transform>function (file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const defaultName = namify(
    path.basename(file.path.split('.').slice(0, -1).join('.')),
  );
  const defaultDeclaration = (name: string = defaultName) =>
    j.exportDefaultDeclaration(j.identifier(name));

  root.find(j.ExportDefaultDeclaration).forEach(path => {
    const declaration = path.node.declaration;

    if (
      declaration.type === 'FunctionDeclaration' ||
      declaration.type === 'ClassDeclaration'
    ) {
      if (!declaration.id) {
        declaration.id = j.identifier(defaultName);
      }

      path.replace(declaration);
      path.insertAfter(defaultDeclaration());
    }

    if (
      declaration.type === 'Literal' ||
      declaration.type === 'ArrowFunctionExpression'
    ) {
      path.replace(
        j.variableDeclaration('const', [
          j.variableDeclarator(j.identifier(defaultName), declaration),
        ]),
      );

      path.insertAfter(defaultDeclaration());
    }

    if (
      declaration.type === 'AssignmentExpression' &&
      declaration.left.type === 'Identifier'
    ) {
      path.replace(
        j.variableDeclaration('const', [
          j.variableDeclarator(declaration.left, declaration.right),
        ]),
      );

      path.insertAfter(defaultDeclaration(declaration.left.name));
    }
  });

  return root.toSource({ lineTerminator: '\n' });
};
