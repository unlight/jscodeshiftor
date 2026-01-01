import assert from 'node:assert';
import { execSync } from 'node:child_process';

import jscodeshift, { VariableDeclarator } from 'jscodeshift';

import type { ESLint } from 'eslint';
type LintResult = Awaited<ReturnType<ESLint['lintText']>>;
export type TOptions = {
  getNoUnusedVars?: TFindOptions['getNoUnusedVars'];
  files: string[];
};

export default <jscodeshift.Transform>(
  function removeUnusedVars(file, api, options: TOptions) {
    const j = api.jscodeshift;
    const root = j(file.source);
    const filePath = file.path;
    // Get unused variables
    const { error, result: unusedVariables } = findUnusedVariables({
      files: [filePath],
      getNoUnusedVars: options.getNoUnusedVars,
    });

    assert.ifError(error);

    if (!unusedVariables || unusedVariables.length === 0) {
      return;
    }

    // Track all variable declarations and their usage
    const variableDeclarations = new Map(); // name -> Array<declaration info>

    // Collect from regular variable declarations (var, let, const)
    root.find(j.VariableDeclaration).forEach(path => {
      const { node } = path;

      node.declarations.forEach(declarator => {
        const { id } = declarator as VariableDeclarator;

        switch (id.type) {
          case 'Identifier': {
            // Simple variable: let x = 5;
            const varName = id.name;
            if (!variableDeclarations.has(varName)) {
              variableDeclarations.set(varName, []);
            }
            variableDeclarations.get(varName).push({
              isDestructured: false,
              kind: node.kind, // 'var', 'let', or 'const'
              node: declarator,
              parentPath: j(path),
              path: path,
            });

            break;
          }
          case 'ObjectPattern': {
            // Destructuring: const { a, b } = object;
            id.properties.forEach(property => {
              if (
                property.type === 'ObjectProperty' &&
                property.value.type === 'Identifier'
              ) {
                const varName = property.value.name;
                if (!variableDeclarations.has(varName)) {
                  variableDeclarations.set(varName, []);
                }
                variableDeclarations.get(varName).push({
                  declaratorNode: declarator,
                  isDestructured: true,
                  kind: node.kind,
                  node: property,
                  parentDeclarator: declarator,
                  parentNode: id,
                  parentPath: path,
                });
              } else if (
                property.type === 'RestElement' &&
                property.argument.type === 'Identifier'
              ) {
                // Handle rest: const { a, ...rest } = object;
                const varName = property.argument.name;
                if (!variableDeclarations.has(varName)) {
                  variableDeclarations.set(varName, []);
                }
                variableDeclarations.get(varName).push({
                  declaratorNode: declarator,
                  isDestructured: true,
                  isRest: true,
                  kind: node.kind,
                  node: property,
                  parentNode: id,
                  parentPath: path,
                });
              }
            });

            break;
          }
          case 'ArrayPattern': {
            // Array destructuring: const [a, b] = arr;
            id.elements.forEach((element, index) => {
              if (element && element.type === 'Identifier') {
                const varName = element.name;
                if (!variableDeclarations.has(varName)) {
                  variableDeclarations.set(varName, []);
                }
                variableDeclarations.get(varName).push({
                  declaratorNode: declarator,
                  index: index,
                  isDestructured: true,
                  kind: node.kind,
                  node: element,
                  parentNode: id,
                  parentPath: path,
                });
              }
            });

            break;
          }
          // No default
        }
      });
    });

    // Remove unused variables
    for (const [varName, declarations] of variableDeclarations.entries()) {
      if (!unusedVariables.some(u => u.name === varName)) continue;

      for (const decl of declarations) {
        const { start } = decl.node.loc;

        if (
          !unusedVariables.some(
            u => u.startLocation === `${start.line}:${start.column}`,
          )
        ) {
          continue;
        }

        // Check if variable should be removed
        const shouldRemoveByKind =
          decl.kind === 'var' || decl.kind === 'let' || decl.kind === 'const';

        if (shouldRemoveByKind) {
          if (!decl.isDestructured) {
            // Remove simple variable declaration
            removeSimpleVariable(decl);
          } else if (true /*removeDestructuredUnused*/) {
            // Remove destructured variable
            removeDestructuredVariable(decl);
          }
        }
      }
    }

    // Cleanup

    // Remove empty variable declarations
    root.find(j.VariableDeclaration).forEach(path => {
      if (!path.node.declarations || path.node.declarations.length === 0) {
        j(path).remove();
      }
    });

    // Remove standalone semicolons that might be left behind
    root.find(j.EmptyStatement).forEach(path => {
      j(path).remove();
    });

    // Clean up trailing commas in object/array patterns
    root.find(j.ObjectPattern).forEach(path => {
      const properties = path.node.properties;
      if (properties.length > 0) {
        const lastProp = properties.at(-1);
        if (lastProp.type === 'ObjectProperty' && !lastProp.computed) {
          // Remove trailing comma if present
          // jscodeshift handles this in toSource()
        }
      }
    });

    return root.toSource({ lineTerminator: '\n' });
  }
);

type TFindOptions = {
  files: string[];
  getNoUnusedVars?: typeof getNoUnusedVars;
};

function findUnusedVariables(args: TFindOptions) {
  const { files } = args;
  const getUnusedVariables = args.getNoUnusedVars ?? getNoUnusedVars;

  try {
    const results = getUnusedVariables(files);
    const unusedVariables = [] as {
      column: number;
      file: string;
      line: number;
      message: string;
      name: string | null;
      startLocation: string;
    }[];

    for (const result of results) {
      if (!result.messages) continue;

      for (const message of result.messages) {
        const { column, line, message: text, ruleId } = message;
        if (
          ruleId === 'no-unused-vars' ||
          ruleId === '@typescript-eslint/no-unused-vars'
        ) {
          // Extract variable name from message
          const match = text.match(/'([^']+)'/);
          const varName = match?.[1] || null;

          unusedVariables.push({
            column,
            file: result.filePath,
            line,
            message: text,
            name: varName,
            startLocation: `${line}:${column - 1}`, // Adapt for jscodeshift
          });
        }
      }
    }

    return { result: unusedVariables };
  } catch (error_) {
    const error = error_ as Error;
    return { error, message: error.message };
  }
}

function getNoUnusedVars(files: string[]) {
  const fileList = files.map(f => `"${f}"`).join(' ');
  const output = execSync(
    `npx eslint --rule "*: 0" --rule "no-unused-vars: 1" --format json ${fileList}`,
    { encoding: 'utf8' },
  );

  return JSON.parse(output) as LintResult;
}

// Helper functions for removal
function removeSimpleVariable(decl) {
  const parentPath = decl.parentPath;
  const parentNode = parentPath.node;

  if (parentNode.declarations.length === 1) {
    // Remove entire declaration if this is the only declarator
    j(parentPath).remove();
  } else {
    // Remove just this declarator from the declaration
    parentNode.declarations = parentNode.declarations.filter(
      d => d !== decl.node,
    );
  }
}

function removeDestructuredVariable(decl) {
  if (decl.parentNode.type === 'ObjectPattern') {
    // Handle object destructuring
    const parentPattern = decl.parentNode;
    const properties = parentPattern.properties;

    // Remove the property from the object pattern
    const newProperties = properties.filter(prop => {
      if (prop.type === 'ObjectProperty' && prop.value.type === 'Identifier') {
        return prop.value.name !== decl.node.value.name;
      } else if (
        prop.type === 'RestElement' &&
        prop.argument.type === 'Identifier'
      ) {
        return prop.argument.name !== decl.node.name;
      }
      return true;
    });

    parentPattern.properties = newProperties;

    // If pattern is now empty, remove entire declaration
    if (newProperties.length === 0 && decl.declaratorNode) {
      const varDecl = decl.parentPath.node;
      const newDeclarators = varDecl.declarations.filter(
        d => d !== decl.declaratorNode,
      );

      if (newDeclarators.length === 0) {
        j(decl.parentPath).remove();
      } else {
        varDecl.declarations = newDeclarators;
      }
    }
  } else if (decl.parentNode.type === 'ArrayPattern') {
    // Handle array destructuring - replace with null placeholder
    const parentPattern = decl.parentNode;
    const elements = parentPattern.elements;

    elements[decl.index] = null;

    // Check if all elements are null
    const allNull = elements.every(el => el === null);
    if (allNull && decl.declaratorNode) {
      const varDecl = decl.parentPath.node;
      const newDeclarators = varDecl.declarations.filter(
        d => d !== decl.declaratorNode,
      );

      if (newDeclarators.length === 0) {
        j(decl.parentPath).remove();
      } else {
        varDecl.declarations = newDeclarators;
      }
    }
  }
}
