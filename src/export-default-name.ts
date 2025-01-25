import jscodeshift from 'jscodeshift';
import namify from 'namify';
import { prettyPrint, print, printCode } from './testing';
import { getTopLevelVarNames, withComments } from './utils';

export default <jscodeshift.Transform>function (file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let nameParts = file.path.replaceAll('\\', '/').split('/').filter(Boolean);
  const fileName = nameParts[nameParts.length - 1]
    ?.split('.')
    .slice(0, -1)
    .join('.')!;
  nameParts = nameParts.slice(0, -1).concat(namify(fileName));
  const getDefaultUniqueName = () => {
    for (let index = 1; index <= nameParts.length; index++) {
      const candidateName = namify(nameParts.slice(-index).join(' '));
      if (!topLevelVars.includes(candidateName)) return candidateName;
    }

    return namify(
      nameParts.slice(-1).join(' ') +
        ' ' +
        Math.random().toString(36).slice(2, 5),
    );
  };

  const defaultDeclaration = (name: string = '') => {
    if (!name) name = getDefaultUniqueName();
    return j.exportDefaultDeclaration(j.identifier(name));
  };

  const topLevelVars = getTopLevelVarNames(j, root);

  root.find(j.ExportDefaultDeclaration).forEach(path => {
    const { node } = path;
    const { declaration } = node;

    if (
      declaration.type === 'FunctionDeclaration' ||
      declaration.type === 'ClassDeclaration'
    ) {
      if (!declaration.id) {
        declaration.id = j.identifier(getDefaultUniqueName());
      }
      const name = declaration.id.name;
      withComments(declaration, node);

      path.replace(declaration);
      path.insertAfter(defaultDeclaration(name));
    }

    if (
      declaration.type === 'Literal' ||
      declaration.type === 'ArrowFunctionExpression' ||
      declaration.type === 'CallExpression'
    ) {
      path.replace(
        withComments(
          j.variableDeclaration('const', [
            j.variableDeclarator(
              j.identifier(getDefaultUniqueName()),
              declaration,
            ),
          ]),
          node,
        ),
      );

      path.insertAfter(defaultDeclaration());
    }

    if (
      declaration.type === 'AssignmentExpression' &&
      declaration.left.type === 'Identifier'
    ) {
      path.replace(
        withComments(
          j.variableDeclaration('const', [
            j.variableDeclarator(declaration.left, declaration.right),
          ]),
          node,
        ),
      );

      path.insertAfter(defaultDeclaration(declaration.left.name));
    }
  });

  return root.toSource({ lineTerminator: '\n' });
};
