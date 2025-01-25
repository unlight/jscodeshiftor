import jscodeshift from 'jscodeshift';

export default <jscodeshift.Transform>function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // Check if the file contains import or export statements
  const hasImportOrExport =
    root.find(j.ImportDeclaration).length > 0 ||
    root.find(j.ExportNamedDeclaration).length > 0 ||
    root.find(j.ExportDefaultDeclaration).length > 0 ||
    root.find(j.ExportAllDeclaration).length > 0;

  // If the file is not in ESM format, check for 'use strict'
  if (!hasImportOrExport) {
    const topLevelStatements = root.get('program', 'body').value;
    // Check if 'use strict' is already present
    if (
      topLevelStatements.length === 0 ||
      !(
        topLevelStatements[0].type === 'ExpressionStatement' &&
        topLevelStatements[0].expression.value === 'use strict'
      )
    ) {
      // Add 'use strict' as the first statement
      root
        .get('program', 'body')
        .unshift(j.expressionStatement(j.literal('use strict')));
    }
  }

  return root.toSource();
};
