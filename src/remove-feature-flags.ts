import jscodeshift from 'jscodeshift';

type TOptions = {
  flagNames: string[];
};

export default <jscodeshift.Transform>(
  function removeFeatureFlags(file, api, options: TOptions) {
    const j = api.jscodeshift;
    const root = j(file.source);
    const flagNames = options.flagNames || [];

    if (flagNames.length === 0) {
      console.warn(
        'No flag names provided. Please specify --flagNames=FLAG1,FLAG2',
      );
      return file.source;
    }

    // Helper to check if a node is a feature flag access
    function isFeatureFlag(node: unknown): boolean {
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
          const flagNode = isLeftFlag ? left : right;
          const valueNode = isLeftFlag ? right : left;
          const isFlagTrue = isFeatureFlag(flagNode);

          if (operator === '===' || operator === '==') {
            if (j.BooleanLiteral.check(valueNode)) {
              return valueNode.value === isFlagTrue;
            }
            if (
              j.StringLiteral.check(valueNode) ||
              j.Literal.check(valueNode)
            ) {
              return valueNode.value === (isFlagTrue ? 'true' : 'false');
            }
            if (j.NumericLiteral.check(valueNode)) {
              return valueNode.value === (isFlagTrue ? 1 : 0);
            }
          } else if (operator === '!==' || operator === '!=') {
            if (j.BooleanLiteral.check(valueNode)) {
              return valueNode.value !== isFlagTrue;
            }
            if (j.StringLiteral.check(valueNode)) {
              return valueNode.value !== (isFlagTrue ? 'true' : 'false');
            }
            if (j.NumericLiteral.check(valueNode)) {
              return valueNode.value !== (isFlagTrue ? 1 : 0);
            }
          }
        }
      }

      // Logical expressions
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
          path.replace(...path.value.consequent.body);
        } else {
          path.replace(path.value.consequent);
        }
      } else if (testResult === false && path.value.alternate) {
        // Keep the alternate branch
        if (j.BlockStatement.check(path.value.alternate)) {
          path.replace(...path.value.alternate.body);
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
        } else if (leftResult === false) {
          // false && expression -> false (but we should remove the expression)
          path.replace(j.booleanLiteral(false));
        }
      } else if (operator === '||') {
        if (leftResult === true) {
          // flag || expression -> true (the flag value)
          path.replace(path.value.left);
        } else if (leftResult === false) {
          // false || expression -> expression
          path.replace(path.value.right);
        }
      }
    });

    // Transform spread elements in object literals
    root.find(j.ObjectExpression).forEach(path => {
      const newProperties: jscodeshift.ObjectExpression['properties'] = [];

      path.value.properties.forEach(prop => {
        // Handle SpreadElement (ES2018+)
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
          }

          // Check for direct feature flag: ...(flag && obj) simplified case
          else if (isFeatureFlag(argument)) {
            // ...flag doesn't make sense, keep as-is
            newProperties.push(prop);
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

    // Clean up false boolean literals from logical expressions that are now standalone
    root
      .find(j.BooleanLiteral)
      .filter(path => j.LogicalExpression.check(path.parent?.node))
      .forEach(path => {
        if (path.value.value === false) {
          // Check if this false is the result of a removed feature flag
          const parent = path.parent.node;
          if (j.LogicalExpression.check(parent) && parent.operator === '&&') {
            // Replace the entire expression with false
            j(path.parent).replaceWith(j.booleanLiteral(false));
          }
        }
      });

    // Remove standalone false boolean literals in object spread contexts
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

    // Clean up empty objects from removed spreads
    root.find(j.ObjectExpression).forEach(path => {
      if (path.value.properties.length === 0) {
        // Replace empty object with undefined or keep as {} depending on context
        const parent = path.parent.node;
        if (j.VariableDeclarator.check(parent)) {
          path.replace(j.identifier('undefined'));
        }
      }
    });

    return root.toSource({
      lineTerminator: '\n',
    });
  }
);
