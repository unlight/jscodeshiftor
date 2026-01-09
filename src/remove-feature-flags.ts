import jscodeshift, {
  ASTPath,
  ObjectExpression,
  SpreadElement,
} from 'jscodeshift';

type TOptions = {
  flags: string;
};

export const parser = 'ts';

export default <jscodeshift.Transform>(
  function removeFeatureFlags(file, api, options: TOptions) {
    const j = api.jscodeshift;
    const root = j(file.source);
    const flagNames = String(options.flags || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (flagNames.length === 0) {
      console.warn(
        'No flag names provided. Please specify --flags=FLAG1,FLAG2',
      );
      return file.source;
    }

    // Pattern: FF_<digits>_<uppercase alphanumeric and underscores>
    const FLAG_PATTERN = /^FF_\d+_[A-Z0-9_]+$/;

    function isFeatureFlag(node: unknown): boolean {
      // Check if it's a feature flag variable
      if (j.Identifier.check(node) && flagNames.includes(node.name)) {
        return true;
      }

      // Check for dot notation: context.FLAG_NAME
      if (
        j.MemberExpression.check(node) &&
        j.Identifier.check(node.property) &&
        flagNames.includes(node.property.name)
      ) {
        return true;
      }

      return false;
    }

    // Helper to evaluate feature flag conditions
    const evaluateCondition = (node: unknown): boolean | null => {
      if (!node) return null;

      // Direct feature flag access: flag
      if (isFeatureFlag(node)) {
        return true;
      }

      // Negation: !flag
      if (
        j.UnaryExpression.check(node) &&
        node.operator === '!' &&
        isFeatureFlag(node.argument)
      ) {
        return false;
      }

      // Binary expressions with comparisons
      if (j.BinaryExpression.check(node)) {
        const { left, operator, right } = node;
        const isLeftFlag = isFeatureFlag(left);
        const isRightFlag = isFeatureFlag(right);

        if (isLeftFlag || isRightFlag) {
          const valueNode = isLeftFlag ? right : left;

          if (operator === '===' || operator === '==') {
            if (j.BooleanLiteral.check(valueNode)) {
              return valueNode.value === true; // flag is always true
            }
            if (
              j.StringLiteral.check(valueNode) ||
              j.Literal.check(valueNode)
            ) {
              return valueNode.value === 'true';
            }
            if (j.NumericLiteral.check(valueNode)) {
              return valueNode.value === 1;
            }
          } else if (operator === '!==' || operator === '!=') {
            if (j.BooleanLiteral.check(valueNode)) {
              return valueNode.value !== false; // flag is always true, so !== false is true
            }
            if (j.StringLiteral.check(valueNode)) {
              return valueNode.value !== 'false';
            }
            if (j.NumericLiteral.check(valueNode)) {
              return valueNode.value !== 0;
            }
          }
        }
      }

      // Logical expressions - only evaluate if we can determine the left side
      if (j.LogicalExpression.check(node)) {
        const leftResult = evaluateCondition(node.left);
        const { operator } = node;

        if (operator === '&&') {
          if (leftResult === false) return false;
          if (leftResult === true) return evaluateCondition(node.right);
        } else if (operator === '||') {
          if (leftResult === true) return true;
          if (leftResult === false) return evaluateCondition(node.right);
        }
      }

      return null;
    };

    // Transform if statements
    root.find(j.IfStatement).forEach(path => {
      const testResult = evaluateCondition(path.value.test);

      if (testResult === true) {
        // Keep the consequent branch
        if (j.BlockStatement.check(path.value.consequent)) {
          const body = path.value.consequent.body;
          if (body.length === 1) {
            path.replace(body[0]);
          } else if (body.length > 1) {
            path.replace(...body);
          } else {
            path.replace();
          }
        } else {
          path.replace(path.value.consequent);
        }
      } else if (testResult === false && path.value.alternate) {
        // Keep the alternate branch
        if (j.BlockStatement.check(path.value.alternate)) {
          const body = path.value.alternate.body;
          if (body.length === 1) {
            path.replace(body[0]);
          } else if (body.length > 1) {
            path.replace(...body);
          } else {
            path.replace();
          }
        } else {
          path.replace(path.value.alternate);
        }
      } else if (testResult === false) {
        // Remove the entire if statement if no else branch
        path.replace();
      }
    });

    // Transform ternary expressions
    root.find(j.ConditionalExpression).forEach(path => {
      const testResult = evaluateCondition(path.value.test);

      if (testResult === true) {
        path.replace(path.value.consequent);
      } else if (testResult === false) {
        path.replace(path.value.alternate);
      }
    });

    // Transform logical expressions
    root.find(j.LogicalExpression).forEach(path => {
      const leftResult = evaluateCondition(path.value.left);
      const { operator } = path.value;

      if (operator === '&&') {
        if (leftResult === true) {
          // flag && expression -> expression
          path.replace(path.value.right);

          // path.node.right.properties; // 1
          // path.parentPath.node; // is object expre 1.5 is spread
          // path.parentPath.parentPath.node; // is object expre 2
        } else if (leftResult === false) {
          // false && expression -> false
          path.replace(j.booleanLiteral(false));
        }
      } else if (operator === '||') {
        if (leftResult === true) {
          // flag || expression -> flag (always true)
          path.replace(path.value.left);
        } else if (leftResult === false) {
          // false || expression -> expression
          path.replace(path.value.right);
        }
      }
    });

    // Transform spread elements in object literals
    root.find(j.ObjectExpression).forEach(path => {
      const newProperties: ObjectExpression['properties'] = [];

      path.value.properties.forEach(prop => {
        // Handle SpreadElement
        if (j.SpreadElement.check(prop)) {
          const argument = prop.argument;

          // Check for logical expression patterns: ...(flag && obj)
          if (
            j.LogicalExpression.check(argument) &&
            argument.operator === '&&'
          ) {
            const conditionResult = evaluateCondition(argument.left);

            if (conditionResult === true) {
              // flag is true, so we keep the right side
              const right = argument.right;

              if (j.ObjectExpression.check(right)) {
                // If it's an object literal, inline its properties
                newProperties.push(...right.properties);
              } else {
                // Otherwise keep the spread
                newProperties.push(j.spreadElement(right));
              }
            }
            // If condition is false, skip this spread entirely
            else if (conditionResult === false) {
              // Do nothing - remove this spread
            } else {
              // Unknown condition, keep as-is
              newProperties.push(prop);
            }
          }
          // Check for conditional expression patterns: ...(flag ? obj : {})
          else if (j.ConditionalExpression.check(argument)) {
            const conditionResult = evaluateCondition(argument.test);

            if (conditionResult === true) {
              const consequent = argument.consequent;
              if (j.ObjectExpression.check(consequent)) {
                newProperties.push(...consequent.properties);
              } else {
                newProperties.push(j.spreadElement(consequent));
              }
            } else if (conditionResult === false) {
              const alternate = argument.alternate;
              if (j.ObjectExpression.check(alternate)) {
                newProperties.push(...alternate.properties);
              } else if (!j.ObjectExpression.check(alternate)) {
                // Skip empty objects
                newProperties.push(j.spreadElement(alternate));
              }
            } else {
              newProperties.push(prop);
            }
          } else {
            // Keep other spread elements as-is
            newProperties.push(prop);
          }
        } else {
          // Keep non-spread properties
          newProperties.push(prop);
        }
      });

      path.value.properties = newProperties;
    });

    // Handle spread elements in arrays and function calls
    root.find(j.SpreadElement).forEach((path: ASTPath<SpreadElement>) => {
      const spreadElement = path.value;
      const parent: unknown = path.parent?.node;

      // Only handle spread elements in ArrayExpression or CallExpression
      if (!j.ArrayExpression.check(parent) && !j.CallExpression.check(parent)) {
        return;
      }

      const argument = spreadElement.argument;

      // Handle ConditionalExpression in spread
      if (j.ConditionalExpression.check(argument)) {
        const conditionResult = evaluateCondition(argument.test);

        if (conditionResult === true) {
          // Replace with consequent
          if (j.ArrayExpression.check(argument.consequent)) {
            // Inline array elements
            const elements = argument.consequent.elements;
            if (j.ArrayExpression.check(parent)) {
              // In array: replace spread with array elements
              const parentElements = parent.elements;
              const index = parentElements.indexOf(spreadElement);
              if (index !== -1 && elements && elements.length > 0) {
                // Replace spread element with the array elements
                parentElements.splice(index, 1, ...elements);
              }
            } else if (j.CallExpression.check(parent)) {
              // In function call: replace spread with array elements as arguments
              const parentArgs = parent.arguments as any[];
              const index = parentArgs.indexOf(spreadElement);
              if (index !== -1 && elements && elements.length > 0) {
                parentArgs.splice(index, 1, ...elements);
              }
            }
          } else {
            // Not an array, just update the argument
            spreadElement.argument = argument.consequent;
          }
        } else if (conditionResult === false) {
          // Replace with alternate
          if (j.ArrayExpression.check(argument.alternate)) {
            // Inline array elements
            const elements = argument.alternate.elements;
            if (j.ArrayExpression.check(parent)) {
              const parentElements = parent.elements;
              const index = parentElements.indexOf(spreadElement);
              if (index !== -1 && elements && elements.length > 0) {
                parentElements.splice(index, 1, ...elements);
              } else if (index !== -1 && elements && elements.length === 0) {
                // Empty array - remove the spread entirely
                parentElements.splice(index, 1);
              }
            } else if (j.CallExpression.check(parent)) {
              const parentArgs = parent.arguments as any[];
              const index = parentArgs.indexOf(spreadElement);
              if (index !== -1 && elements && elements.length > 0) {
                parentArgs.splice(index, 1, ...elements);
              } else if (index !== -1 && elements && elements.length === 0) {
                // Empty array - remove the spread entirely
                parentArgs.splice(index, 1);
              }
            }
          } else {
            // Not an array, just update the argument
            spreadElement.argument = argument.alternate;
          }
        }
      }

      // Handle LogicalExpression in spread (flag && array)
      else if (
        j.LogicalExpression.check(argument) &&
        argument.operator === '&&'
      ) {
        const conditionResult = evaluateCondition(argument.left);

        if (
          conditionResult === true &&
          j.ArrayExpression.check(argument.right)
        ) {
          // Inline array elements
          const elements = argument.right.elements;
          if (j.ArrayExpression.check(parent)) {
            const parentElements = parent.elements;
            const index = parentElements.indexOf(spreadElement);
            if (index !== -1 && elements && elements.length > 0) {
              parentElements.splice(index, 1, ...elements);
            }
          } else if (j.CallExpression.check(parent)) {
            const parentArgs = parent.arguments as any[];
            const index = parentArgs.indexOf(spreadElement);
            if (index !== -1 && elements && elements.length > 0) {
              parentArgs.splice(index, 1, ...elements);
            }
          }
        } else if (conditionResult === false) {
          // Remove the spread entirely (false && array -> false)
          if (j.ArrayExpression.check(parent)) {
            const parentElements = parent.elements;
            const index = parentElements.indexOf(spreadElement);
            if (index !== -1) {
              parentElements.splice(index, 1);
            }
          } else if (j.CallExpression.check(parent)) {
            const parentArgs = parent.arguments;
            const index = parentArgs.indexOf(spreadElement);
            if (index !== -1) {
              parentArgs.splice(index, 1);
            }
          }
        }
      }
    });

    // Clean up direct spread of array literals that can be inlined
    root.find(j.SpreadElement).forEach((path: ASTPath<SpreadElement>) => {
      const spreadElement = path.value;
      const parent = (path.parent as ASTPath).node;

      // Direct spread of array literal - inline it
      if (j.ArrayExpression.check(spreadElement.argument)) {
        const noLogicalExpression =
          j(parent).find(j.LogicalExpression).length === 0;
        const array = spreadElement.argument;

        if (j.ArrayExpression.check(parent) && noLogicalExpression) {
          const elements = parent.elements;
          const index = elements.indexOf(spreadElement);

          if (index !== -1 && array.elements?.length > 0) {
            elements.splice(index, 1, ...array.elements);
          }
        } else if (j.CallExpression.check(parent)) {
          const args = parent.arguments as any[];
          const index = args.indexOf(spreadElement);
          if (index !== -1 && array.elements?.length > 0) {
            args.splice(index, 1, ...array.elements);
          }
        }
      }
    });

    // Clean up standalone false boolean literals from logical expressions
    root.find(j.VariableDeclarator).forEach(path => {
      if (
        j.BooleanLiteral.check(path.value.init) &&
        path.value.init.value === false &&
        j.Identifier.check(path.value.id)
      ) {
        // Check if this false came from a feature flag transformation
        const varName = path.value.id.name;
        if (FLAG_PATTERN.test(varName)) {
          // This was a feature flag variable that became false
          path.value.init = j.booleanLiteral(true); // Since flags are always true
        }
      }
    });

    let count = 0;
    while (++count <= 2) {
      // Clean up direct spread of object literals that can be inlined
      root.find(j.SpreadElement).forEach((path: ASTPath<SpreadElement>) => {
        const spreadElement = path.value;

        if (j.ObjectExpression.check(spreadElement.argument)) {
          const parentObject = (path.parentPath as ASTPath).node;
          if (j.ObjectExpression.check(parentObject)) {
            const index = parentObject.properties.indexOf(spreadElement);
            if (index !== -1) {
              parentObject.properties.splice(
                index,
                1,
                ...spreadElement.argument.properties,
              );
            }
          }
        }
      });
    }

    // Clean up false boolean literals in object spread contexts
    root.find(j.ObjectExpression).forEach(path => {
      const newProperties = path.value.properties.filter(prop => {
        if (
          j.SpreadElement.check(prop) &&
          j.BooleanLiteral.check(prop.argument)
        ) {
          return !(prop.argument.value === false);
        }
        return true;
      });

      if (newProperties.length !== path.value.properties.length) {
        path.value.properties = newProperties;
      }
    });

    return root.toSource({
      lineTerminator: '\n',
    });
  }
);
