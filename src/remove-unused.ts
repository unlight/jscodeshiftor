import assert from 'node:assert';
import { execSync } from 'node:child_process';

import jscodeshift, { Identifier, Node } from 'jscodeshift';

import { code } from './testing';

import type { ESLint } from 'eslint';
type LintResult = Awaited<ReturnType<ESLint['lintText']>>;
export type TransformOptions = {
  getNoUnusedVars?: FindUnusedArgs['getNoUnusedVars'];
  files: string[];
};

export default <jscodeshift.Transform>(
  function removeUnusedVars(file, api, options: TransformOptions) {
    const j = api.jscodeshift;
    const root = j(file.source);
    const filePath = file.path;
    // Get unused variables
    const { error, result: unusedParts } = findUnused({
      files: [filePath],
      getNoUnusedVars: options.getNoUnusedVars,
    });

    assert.ifError(error);

    if (!unusedParts || unusedParts.length === 0) {
      return file.source;
    }

    for (const unused of unusedParts) {
      root.findVariableDeclarators().forEach(path => {
        const { node } = path;

        if (j.ObjectPattern.check(node.id)) {
          node.id.properties = node.id.properties.filter(prop => {
            const shouldRemove =
              'value' in prop &&
              j.Identifier.check(prop.value) &&
              isMatchVariable(prop.value, unused);

            return !shouldRemove;
          });
        }
      });

      root
        .find(j.FunctionDeclaration, {
          id: { name: unused.name },
        })
        .forEach(path => {
          if (
            j.Identifier.check(path.node.id) &&
            isMatchVariable(path.node.id, unused)
          ) {
            j(path).remove();
          }
        });
    }

    // Cleanup

    root.findVariableDeclarators().forEach(path => {
      const { node } = path;

      // Remove empty in destructured object
      if (j.ObjectPattern.check(node.id) && node.id.properties.length === 0) {
        j(path).remove();
      }
    });

    // Remove empty variable declarations
    // root.find(j.VariableDeclaration).forEach(path => {
    //   if (!path.node.declarations || path.node.declarations.length === 0) {
    //     j(path).remove();
    //   }
    // });

    // // Remove standalone semicolons that might be left behind
    // root.find(j.EmptyStatement).forEach(path => {
    //   j(path).remove();
    // });

    // // Clean up trailing commas in object/array patterns
    // root.find(j.ObjectPattern).forEach(path => {
    //   const properties = path.node.properties;
    //   const lastProp = properties.at(-1);
    //   if (
    //     lastProp &&
    //     lastProp.type === 'ObjectProperty' &&
    //     !lastProp.computed
    //   ) {
    //     // Remove trailing comma if present
    //     // jscodeshift handles this in toSource()
    //   }
    // });

    return root.toSource({ lineTerminator: '\n' });
  }
);

type FindUnusedArgs = {
  files: string[];
  getNoUnusedVars?: typeof getNoUnusedVars;
};

type Unused = {
  column: number;
  file: string;
  line: number;
  name: string;
};

function findUnused(args: FindUnusedArgs) {
  const { files } = args;
  const getUnusedVariables = args.getNoUnusedVars ?? getNoUnusedVars;

  try {
    const results = getUnusedVariables(files);
    const unused: Unused[] = [];

    for (const result of results) {
      if (!result.messages) continue;

      for (const message of result.messages) {
        const { column, line, message: text, ruleId } = message;
        if (
          ruleId === 'no-unused-vars' ||
          ruleId?.endsWith('/no-unused-vars')
        ) {
          // Extract variable name from message
          const varName = text.match(/'([^']+)'/)?.[1];

          if (!varName) continue;

          unused.push({
            column,
            file: result.filePath,
            line,
            name: varName,
          });
        }
      }
    }

    return { result: unused };
  } catch (error_) {
    const error = error_ as Error;
    return { error, message: error.message };
  }
}

function getNoUnusedVars(files: string[]) {
  const fileList = files.map(f => `"${f}"`).join(' ');
  let output: string;
  try {
    output = execSync(
      `npx eslint --rule "*: 0" --rule "no-unused-vars: 1" --format json ${fileList}`,
      { encoding: 'utf8' },
    );
  } catch (error) {
    output = error.stdout;
  }

  return JSON.parse(output) as LintResult;
}

function isMatchVariable(node: Identifier | null, unused: Unused) {
  if (!node?.loc) return false;
  const { start } = node.loc;

  return node.name === unused.name && unused.line === start.line;
}

// Helper functions for removal
// function removeSimpleVariable(decl) {
//   const parentPath = decl.parentPath;
//   const parentNode = parentPath.node;

//   if (parentNode.declarations.length === 1) {
//     // Remove entire declaration if this is the only declarator
//     j(parentPath).remove();
//   } else {
//     // Remove just this declarator from the declaration
//     parentNode.declarations = parentNode.declarations.filter(
//       d => d !== decl.node,
//     );
//   }
// }

// function removeDestructuredVariable(decl) {
//   if (decl.parentNode.type === 'ObjectPattern') {
//     // Handle object destructuring
//     const parentPattern = decl.parentNode;
//     const properties = parentPattern.properties;

//     // Remove the property from the object pattern
//     const newProperties = properties.filter(prop => {
//       if (prop.type === 'ObjectProperty' && prop.value.type === 'Identifier') {
//         return prop.value.name !== decl.node.value.name;
//       } else if (
//         prop.type === 'RestElement' &&
//         prop.argument.type === 'Identifier'
//       ) {
//         return prop.argument.name !== decl.node.name;
//       }
//       return true;
//     });

//     parentPattern.properties = newProperties;

//     // If pattern is now empty, remove entire declaration
//     if (newProperties.length === 0 && decl.declaratorNode) {
//       const varDecl = decl.parentPath.node;
//       const newDeclarators = varDecl.declarations.filter(
//         d => d !== decl.declaratorNode,
//       );

//       if (newDeclarators.length === 0) {
//         j(decl.parentPath).remove();
//       } else {
//         varDecl.declarations = newDeclarators;
//       }
//     }
//   } else if (decl.parentNode.type === 'ArrayPattern') {
//     // Handle array destructuring - replace with null placeholder
//     const parentPattern = decl.parentNode;
//     const elements = parentPattern.elements;

//     elements[decl.index] = null;

//     // Check if all elements are null
//     const allNull = elements.every(el => el === null);
//     if (allNull && decl.declaratorNode) {
//       const varDecl = decl.parentPath.node;
//       const newDeclarators = varDecl.declarations.filter(
//         d => d !== decl.declaratorNode,
//       );

//       if (newDeclarators.length === 0) {
//         j(decl.parentPath).remove();
//       } else {
//         varDecl.declarations = newDeclarators;
//       }
//     }
//   }
// }
