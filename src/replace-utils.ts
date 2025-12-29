import assert from 'node:assert';

import jscodeshift, {
  Collection,
  JSCodeshift,
  VariableDeclarator,
} from 'jscodeshift';

import { code } from './testing';

export default <jscodeshift.Transform>function (file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const imports = root
    .find(j.ImportDeclaration, {
      source: { value: '@noodoo/utils' },
    })
    .paths();

  for (const path of imports) {
    path.value.source.value = '@flow/utils';
  }

  for (const path of root
    .find(j.CallExpression, {
      callee: { name: 'require' },
    })
    .paths()) {
    const args = path.value.arguments;

    if (
      args.length === 1 &&
      args[0]?.type === 'Literal' &&
      args[0].value === '@noodoo/utils'
    ) {
      args[0].value = '@flow/utils';
    }

    if (args[0]?.['value'] === '@flow/utils') {
      const variableDeclarator: VariableDeclarator = path.parent.value;
      const name =
        variableDeclarator.id?.type === 'Identifier' &&
        variableDeclarator.id.name;

      if (!name) continue;

      const importNames: Record<string, string> = findImports({
        j: j,
        name,
        root,
      });

      if (Object.keys(importNames).length > 0) {
        const properties = Object.entries(importNames).map(([key, value]) => {
          const property = j.property(
            'init',
            j.identifier(key),
            j.identifier(value),
          );
          property.shorthand = key === value;
          return property;
        });
        variableDeclarator.id = j.objectPattern(properties);
      }
    }
  }

  for (const path of root
    .find(j.ImportDeclaration, {
      source: { value: '@flow/utils' },
    })
    .paths()) {
    if (path.value.specifiers?.length === 1) {
      const specifier = path.value.specifiers[0];
      if (specifier?.type === 'ImportDefaultSpecifier') {
        const name = specifier.local?.name;
        assert.ok(name);
        path.value.specifiers[0] = j.importNamespaceSpecifier(
          j.identifier(name as string),
        );
      }
    }
  }

  // Find namespace imports from "@flow/utils"
  for (const importPath of root
    .find(j.ImportDeclaration, {
      source: { value: '@flow/utils' },
      specifiers: [specifier => specifier.type === 'ImportNamespaceSpecifier'],
    })
    .paths()) {
    const namespaceSpecifier = importPath.node.specifiers?.[0];
    const name = namespaceSpecifier?.local?.name;
    assert.ok(name);

    const importNames = findImports({ j: j, name: name as string, root });

    if (Object.keys(importNames).length > 0) {
      importPath.node.specifiers = Object.entries(importNames).map(
        ([key, value]) =>
          j.importSpecifier(j.identifier(key), j.identifier(String(value))),
      );
    }
  }

  return root.toSource({
    lineTerminator: '\n',
  });
};

function findImports(args: { name: string; root: Collection; j: JSCodeshift }) {
  const { j, name, root } = args;

  const importNames = {};
  for (const path of root
    .find(j.VariableDeclarator, {
      init: { name, type: 'Identifier' },
    })
    .filter(p => p.parent?.parent?.value?.type === 'Program')
    .paths()) {
    // Declaration
    if (path.node.id.type === 'ObjectPattern') {
      for (const p of path.node.id.properties) {
        if (
          p.type === 'Property' &&
          p.key.type === 'Identifier' &&
          p.value.type === 'Identifier'
        ) {
          importNames[p.key.name] = p.value.name;
        }
      }
      path.prune();
    }
  }

  for (const path of root
    .find(j.VariableDeclarator, {
      init: {
        object: {
          name,
          type: 'Identifier',
        },
        type: 'MemberExpression',
      },
    })
    .paths()) {
    const key =
      path.node.init?.type === 'MemberExpression' &&
      path.node.init?.property.type === 'Identifier' &&
      path.node.init?.property.name;
    const value = path.node.id.type === 'Identifier' && path.node.id.name;
    if (!key) {
      continue;
    }

    path.prune();

    importNames[key] = value;
  }

  return importNames;
}
