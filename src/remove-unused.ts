import assert from 'node:assert';
import { ExecException, execSync } from 'node:child_process';

import jscodeshift, { Identifier } from 'jscodeshift';

import { isInsideNode, isParentOf } from './utils.ts';

import type {
  FindUnusedArgs,
  LintResult,
  LocNode,
  TransformOptions,
  Unused,
} from './types.ts';

export type { LintMessage, TransformOptions } from './types.ts';

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

    for (const unused of unusedParts) {
      // Remove variables
      if (unused.ruleId === 'no-unused-vars') {
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
          } else if (
            j.Identifier.check(node.id) &&
            isMatchVariable(node.id, unused)
          ) {
            path.prune();
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

      // Remove unreachable code
      if (unused.ruleId === 'no-unreachable') {
        // Collect all nodes completely inside the reported range
        const insidePaths: Array<jscodeshift.ASTPath<jscodeshift.Node>> = [];

        root.find(j.Node).forEach(path => {
          if (isInsideNode(path.node, unused)) {
            insidePaths.push(path);
          }
        });

        // Keep only the top‑most nodes (i.e., remove children if parent is already in the set)
        const topPaths = insidePaths.filter(
          (p, i) =>
            !insidePaths.some((other, j) => i !== j && isParentOf(other, p)),
        );

        // Remove them in reverse source order (safest for multiple removals)
        (topPaths as LocNode[])
          .toSorted((a, b) => {
            // sort by start position descending
            const aStart = a.node.loc.start;
            const bStart = b.node.loc.start;
            return bStart.line - aStart.line || bStart.column - aStart.column;
          })
          .forEach(path => j(path as jscodeshift.ASTPath).remove());
      }
    }

    // Cleanup
    if (unusedParts.some(x => x.ruleId === 'no-unused-vars')) {
      root.findVariableDeclarators().forEach(path => {
        const { node } = path;

        // Remove empty in destructured object
        if (j.ObjectPattern.check(node.id) && node.id.properties.length === 0) {
          j(path).remove();
        }
      });
    }

    return root.toSource({ lineTerminator: '\n' });
  }
);

function findUnused(args: FindUnusedArgs) {
  const { files } = args;
  const getUnusedVariables = args.getNoUnusedVars ?? getNoUnusedVars;

  try {
    const results = getUnusedVariables(files);
    const unused: Unused[] = [];

    for (const result of results) {
      const { filePath, messages } = result;
      if (!messages) continue;
      // Sort messages by line (descending) to avoid position issues
      messages.sort((a, b) => b.line - a.line || b.column - a.column);

      for (const message of result.messages) {
        const {
          column,
          endColumn,
          endLine,
          line,
          message: text,
          ruleId,
        } = message;
        if (!ruleId) continue;

        if (ruleId === 'no-unused-vars' || ruleId.endsWith('/no-unused-vars')) {
          // Extract variable name from message
          const varName = text.match(/'([^']+)'/)?.[1];

          if (!varName) continue;

          unused.push({
            column,
            file: filePath,
            line,
            name: varName,
            ruleId: 'no-unused-vars',
          });
        }

        if (ruleId === 'no-unreachable' && endLine && endColumn) {
          unused.push({
            column,
            endColumn,
            endLine,
            file: filePath,
            line,
            ruleId,
          });
        }
      }
    }

    return { result: unused };
  } catch (error) {
    return { error: error as Error, message: (error as Error).message };
  }
}

function getNoUnusedVars(files: string[]) {
  const fileList = files.map(f => `"${f}"`).join(' ');
  let output: string;
  try {
    output = execSync(`npx eslint --format json ${fileList}`, {
      encoding: 'utf8',
    });
  } catch (error) {
    output = (error as ExecException).stdout || '';
  }

  try {
    return JSON.parse(output) as LintResult;
  } catch (error) {
    (error as Error).cause = new Error(`Parse of ${output}`);

    throw error;
  }
}

function isMatchVariable(node: Identifier | null, unused: Unused) {
  if (!node?.loc) return false;
  const { start } = node.loc;

  return (
    unused.line === start.line && 'name' in unused && unused.name === node.name
  );
}
