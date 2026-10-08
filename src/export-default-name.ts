import jscodeshift from 'jscodeshift';
import namify from 'namify';

import { getTopLevelVarNames, withComments } from './utils';

import type {
  ArrowFunctionExpression,
  CallExpression,
  ExportDefaultDeclaration,
  Literal,
  VariableDeclaration,
} from 'jscodeshift';

const toValidName = namify as (s: string) => string;

function isValueDeclaration(
  declaration: ExportDefaultDeclaration['declaration'],
): declaration is Literal | ArrowFunctionExpression | CallExpression {
  return ['Literal', 'ArrowFunctionExpression', 'CallExpression'].includes(
    declaration.type,
  );
}

export default <jscodeshift.Transform>function (file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let nameParts = file.path.replaceAll('\\', '/').split('/').filter(Boolean);
  const fileName = nameParts.at(-1)?.split('.').slice(0, -1).join('.');
  if (!fileName) return file.source;
  nameParts = [...nameParts.slice(0, -1), toValidName(fileName)];
  const getDefaultUniqueName = () => {
    for (let index = 1; index <= nameParts.length; index++) {
      const candidateName = toValidName(nameParts.slice(-index).join(' '));
      if (!topLevelVars.includes(candidateName)) return candidateName;
    }

    return toValidName(
      nameParts.slice(-1).join(' ') +
        ' ' +
        Math.random().toString(36).slice(2, 5),
    );
  };

  const defaultDeclaration = (name = '') => {
    if (!name) name = getDefaultUniqueName();
    return j.exportDefaultDeclaration(j.identifier(name));
  };

  const topLevelVars = getTopLevelVarNames(j, root);

  for (const path of root.find(j.ExportDefaultDeclaration).paths()) {
    const { node } = path;
    const { declaration } = node;

    if (
      declaration.type === 'FunctionDeclaration' ||
      declaration.type === 'ClassDeclaration'
    ) {
      if (!declaration.id) {
        declaration.id = j.identifier(getDefaultUniqueName());
      }
      const name = declaration.id.name as string;
      withComments(declaration, node);

      path.replace(declaration);
      path.insertAfter(defaultDeclaration(name));
    } else if (isValueDeclaration(declaration)) {
      const identifier = j.identifier(getDefaultUniqueName());
      const declarator = j.variableDeclarator(identifier, declaration);
      const variableDeclaration = j.variableDeclaration('const', [declarator]);

      path.replace(
        withComments(variableDeclaration, node) as VariableDeclaration,
      );
      path.insertAfter(defaultDeclaration());
    } else if (
      declaration.type === 'AssignmentExpression' &&
      declaration.left.type === 'Identifier'
    ) {
      const declarator = j.variableDeclarator(
        declaration.left,
        declaration.right,
      );
      const variableDeclaration = j.variableDeclaration('const', [declarator]);

      path.replace(
        withComments(variableDeclaration, node) as VariableDeclaration,
      );
      path.insertAfter(defaultDeclaration(declaration.left.name));
    }
  }

  return root.toSource({ lineTerminator: '\n' });
};
