import jscodeshift, {
  ASTPath,
  JSCodeshift,
  Literal,
  Program,
} from 'jscodeshift';

function transformer(fileInfo: jscodeshift.FileInfo, api: jscodeshift.API) {
  const j: JSCodeshift = api.jscodeshift;
  const root = j(fileInfo.source);

  const hasImportOrExport: boolean =
    root.find(j.ImportDeclaration).length > 0 ||
    root.find(j.ExportNamedDeclaration).length > 0 ||
    root.find(j.ExportDefaultDeclaration).length > 0 ||
    root.find(j.ExportAllDeclaration).length > 0;

  if (!hasImportOrExport) {
    const body = root.get(
      'program',
      'body',
    ) as ASTPath<Program>['value']['body'];
    const firstStatement = body[0];
    if (
      body.length === 0 ||
      !(
        firstStatement?.type === 'ExpressionStatement' &&
        (firstStatement.expression as Literal).value === 'use strict'
      )
    ) {
      body.unshift(j.expressionStatement(j.literal('use strict')));
    }
  }

  return root.toSource();
}

export default transformer satisfies jscodeshift.Transform;
