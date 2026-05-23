import type { ESLint } from 'eslint';

export type LintResult = Awaited<ReturnType<ESLint['lintText']>>;
export type LintMessage = LintResult[number]['messages'][number];

export type Unused = {
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

export type LocNode = {
  node: {
    loc: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
  };
};

export type GetNoUnusedVarsFn = (files: string[]) => LintResult;

export type FindUnusedArgs = {
  files: string[];
  getNoUnusedVars?: GetNoUnusedVarsFn;
};

export type TransformOptions = {
  getNoUnusedVars?: FindUnusedArgs['getNoUnusedVars'];
  files: string[];
};

export type TOptions = {
  flags: string;
};

export type File = {
  path: string;
  source: string;
};

export type ExportSpecifier = any;
