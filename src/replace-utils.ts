import jscodeshift, {
  Collection,
  JSCodeshift,
  VariableDeclarator,
} from 'jscodeshift';
import assert from 'assert';
import { code } from './testing';

export default <jscodeshift.Transform>function (file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const imports = root.find(j.ImportDeclaration, {
    source: { value: '@noodoo/utils' },
  });

  imports.forEach(path => {
    path.value.source.value = '@flow/utils';
  });

  root
    .find(j.CallExpression, {
      callee: { name: 'require' },
    })
    .forEach(path => {
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

        if (!name) return;

        const importNames: Record<string, string> = findImports({
          name,
          root,
          j,
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
    });

  root
    .find(j.ImportDeclaration, {
      source: { value: '@flow/utils' },
    })
    .forEach(path => {
      if (path.value.specifiers?.length === 1) {
        const specifier = path.value.specifiers[0];
        if (specifier?.type === 'ImportDefaultSpecifier') {
          const name = specifier.local?.name;
          assert.ok(name);
          path.value.specifiers[0] = j.importNamespaceSpecifier(
            j.identifier(name),
          );
        }
      }
    });

  // Find namespace imports from "@flow/utils"
  root
    .find(j.ImportDeclaration, {
      source: { value: '@flow/utils' },
      specifiers: [specifier => specifier.type === 'ImportNamespaceSpecifier'],
    })
    .forEach(importPath => {
      const namespaceSpecifier = importPath.node.specifiers?.[0];
      const name = namespaceSpecifier?.local?.name;
      assert.ok(name);

      const importNames = findImports({ name, root, j });

      if (Object.keys(importNames).length > 0) {
        importPath.node.specifiers = Object.entries(importNames).map(
          ([key, value]) =>
            j.importSpecifier(j.identifier(key), j.identifier(String(value))),
        );
      }
    });

  return root.toSource({
    lineTerminator: '\n',
  });
};

function findImports(args: { name: string; root: Collection; j: JSCodeshift }) {
  const { j, name, root } = args;

  const importNames = {};
  root
    .find(j.VariableDeclarator, {
      init: { type: 'Identifier', name },
    })
    .filter(p => p.parent?.parent?.value?.type === 'Program')
    .forEach(path => {
      // Declaration
      if (path.node.id.type === 'ObjectPattern') {
        path.node.id.properties.forEach(p => {
          if (
            p.type === 'Property' &&
            p.key.type === 'Identifier' &&
            p.value.type === 'Identifier'
          ) {
            importNames[p.key.name] = p.value.name;
          }
        });
        path.prune();
      }
    });

  root
    .find(j.VariableDeclarator, {
      init: {
        type: 'MemberExpression',
        object: {
          type: 'Identifier',
          name,
        },
      },
    })
    .forEach(path => {
      const key =
        path.node.init?.type === 'MemberExpression' &&
        path.node.init?.property.type === 'Identifier' &&
        path.node.init?.property.name;
      const value = path.node.id.type === 'Identifier' && path.node.id.name;
      if (!key) {
        return;
      }

      path.prune();

      importNames[key] = value;
    });

  return importNames;
}
