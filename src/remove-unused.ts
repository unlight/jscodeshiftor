import assert from 'node:assert';
import { execSync, ExecException } from 'node:child_process';

import jscodeshift, { Identifier } from 'jscodeshift';

import { findNodesAt } from './utils.ts';

import type { ESLint } from 'eslint';
type LintResult = Awaited<ReturnType<ESLint['lintText']>>;
export type LintMessage = LintResult[number]['messages'][number];
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
        const paths = findNodesAt(j, root, unused);
        paths.forEach(path => j(path).remove());
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

type FindUnusedArgs = {
  files: string[];
  getNoUnusedVars?: typeof getNoUnusedVars;
};

type Unused = {
  column: number;
  file: string;
  line: number;
} & (
  | {
      ruleId: 'no-unused-vars';
      name: string;
    }
  | {
      ruleId: 'no-unreachable';
      endColumn: number;
      endLine: number;
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

        if (ruleId === 'no-unreachable' && endColumn && endLine) {
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

  return JSON.parse(output) as LintResult;
}

function isMatchVariable(node: Identifier | null, unused: Unused) {
  if (!node?.loc) return false;
  const { start } = node.loc;

  return (
    unused.line === start.line && 'name' in unused && unused.name === node.name
  );
}
