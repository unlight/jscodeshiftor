import {
  ASTPath,
  ClassDeclaration,
  Collection,
  ExportDefaultDeclaration,
  FunctionDeclaration,
  JSCodeshift,
  Node,
  VariableDeclaration,
} from 'jscodeshift';

// https://github.com/JamieMason/codemods/blob/master/transforms/lib/helpers.js

function isTopLevel(path: ASTPath) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return path.parentPath?.node.type === 'Program';
}

export function getTopLevelVariables(j: JSCodeshift, collection: Collection) {
  return collection.find(j.VariableDeclaration).filter(isTopLevel).paths();
}

export function getTopLevelVariableNames(
  j: JSCodeshift,
  collection: Collection,
) {
  const identifiers: string[] = [];

  for (const path of getTopLevelVariables(j, collection)) {
    const variableDeclaration = path.value;

    for (const declaration of variableDeclaration.declarations) {
      if (declaration.type === 'VariableDeclarator') {
        if (declaration.id.type === 'Identifier') {
          identifiers.push(declaration.id.name);
        }
        if (declaration.id.type === 'ObjectPattern') {
          for (const p of declaration.id.properties) {
            if (p.type === 'Property' && p.value.type === 'Identifier')
              identifiers.push(p.value.name);
          }
        }
      }
    }
  }

  return identifiers;
}

export function getImportedVarNames(j: JSCodeshift, collection: Collection) {
  const identifiers: string[] = [];
  for (const path of collection.find(j.ImportDeclaration).paths()) {
    const importDeclaration = path.value;
    if (importDeclaration.specifiers)
      for (const specifier of importDeclaration.specifiers) {
        if (typeof specifier.local?.name === 'string') {
          identifiers.push(specifier.local?.name);
        }
      }
  }

  return identifiers;
}

export function getExportsByFunctionName(
  j: JSCodeshift,
  collection: Collection,
  className: string,
) {
  return collection.find(j.ExportNamedDeclaration, {
    declaration: {
      id: { name: className, type: 'Identifier' },
      type: 'FunctionDeclaration',
    },
  });
}

export function getNamedExportedClasses(
  j: JSCodeshift,
  collection: Collection,
) {
  return collection
    .find(j.ExportNamedDeclaration, {
      declaration: { id: { type: 'Identifier' }, type: 'ClassDeclaration' },
    })
    .paths();
}

export function getNamedExportedClassNames(
  j: JSCodeshift,
  collection: Collection,
) {
  const identifiers: string[] = [];

  for (const path of getNamedExportedClasses(j, collection)) {
    const exportNamedDeclaration = path.value;
    const declaration = exportNamedDeclaration.declaration;
    if (declaration?.type === 'ClassDeclaration' && declaration.id) {
      identifiers.push(declaration.id.name as string);
    }
  }

  return identifiers;
}

export function getNamedExportedFunctions(
  j: JSCodeshift,
  collection: Collection,
) {
  return collection
    .find(j.ExportNamedDeclaration, {
      declaration: {
        id: { type: 'Identifier' },
        type: 'FunctionDeclaration',
      },
    })
    .paths();
}

export function getNamedExportedFunctionNames(
  j: JSCodeshift,
  collection: Collection,
) {
  const identifiers: string[] = [];

  for (const path of getNamedExportedFunctions(j, collection)) {
    const exportNamedDeclaration = path.value;
    const declaration = exportNamedDeclaration.declaration;
    if (declaration?.type === 'FunctionDeclaration' && declaration.id) {
      identifiers.push(declaration.id.name as string);
    }
  }

  return identifiers;
}

export function getExportsByClassName(
  j: JSCodeshift,
  collection: Collection,
  className: string,
) {
  return collection.find(j.ExportNamedDeclaration, {
    declaration: {
      id: { name: className, type: 'Identifier' },
      type: 'ClassDeclaration',
    },
  });
}

export function getNamedExportedVars(j: JSCodeshift, collection: Collection) {
  return collection
    .find(j.ExportNamedDeclaration, {
      declaration: { type: 'VariableDeclaration' },
    })
    .paths();
}

export function getTopLevelClasses(j: JSCodeshift, collection: Collection) {
  return collection.find(j.ClassDeclaration).filter(isTopLevel).paths();
}

export function getTopLevelFunctions(j: JSCodeshift, collection: Collection) {
  return collection.find(j.FunctionDeclaration).filter(isTopLevel).paths();
}

export function getTopLevelClassByName(
  j: JSCodeshift,
  collection: Collection,
  className: string,
) {
  return collection
    .find(j.ClassDeclaration, {
      id: { name: className, type: 'Identifier' },
    })
    .filter(isTopLevel);
}

export function getTopLevelFunctionByName(
  j: JSCodeshift,
  collection: Collection,
  className: string,
) {
  return collection
    .find(j.FunctionDeclaration, {
      id: { name: className, type: 'Identifier' },
    })
    .filter(isTopLevel);
}

export function getTopLevelVariableByName(
  j: JSCodeshift,
  collection: Collection,
  variableName: string,
) {
  return collection
    .find(j.VariableDeclaration, {
      declarations: [
        {
          id: { name: variableName, type: 'Identifier' },
          type: 'VariableDeclarator',
        },
      ],
    })
    .filter(isTopLevel);
}

export function getNamedExportedVarNames(
  j: JSCodeshift,
  collection: Collection,
) {
  const identifiers: string[] = [];

  for (const path of getNamedExportedVars(j, collection)) {
    const exportNamedDeclaration = path.value;
    if (
      exportNamedDeclaration.declaration?.type === 'VariableDeclaration' &&
      exportNamedDeclaration.declaration.declarations
    )
      for (const declaration of exportNamedDeclaration.declaration
        .declarations) {
        if (declaration.type === 'VariableDeclarator') {
          if (declaration.id.type === 'Identifier') {
            identifiers.push(declaration.id.name);
          }
          if (declaration.id.type === 'ObjectPattern') {
            for (const p of declaration.id.properties) {
              if (p.type === 'Property' && p.value.type === 'Identifier')
                identifiers.push(p.value.name);
            }
          }
        }
      }
  }

  return identifiers;
}

export function getTopLevelClassNames(j: JSCodeshift, collection: Collection) {
  const identifiers: string[] = [];
  for (const path of getTopLevelClasses(j, collection)) {
    const classDeclaration = path.value;
    if (classDeclaration?.id) {
      identifiers.push(classDeclaration.id.name as string);
    }
  }
  return identifiers;
}

export function getTopLevelFunctionNames(
  j: JSCodeshift,
  collection: Collection,
) {
  const identifiers: string[] = [];
  for (const path of getTopLevelFunctions(j, collection)) {
    const functionDeclaration = path.value;
    if (functionDeclaration.id) {
      identifiers.push(functionDeclaration.id.name as string);
    }
  }
  return identifiers;
}

export function getTopLevelVarNames(j: JSCodeshift, collection: Collection) {
  return [
    ...getImportedVarNames(j, collection),
    ...getNamedExportedClassNames(j, collection),
    ...getNamedExportedFunctionNames(j, collection),
    ...getNamedExportedVarNames(j, collection),
    ...getTopLevelClassNames(j, collection),
    ...getTopLevelFunctionNames(j, collection),
    ...getTopLevelVariableNames(j, collection),
  ];
}

export function exportClass(j: JSCodeshift, path: ASTPath<ClassDeclaration>) {
  const classDeclaration = path.value;

  return j.exportNamedDeclaration(
    j.classDeclaration(
      j.identifier(classDeclaration.id!.name as string),
      classDeclaration.body,
      classDeclaration.superClass,
    ),
  );
}

export function getExportsByVarName(
  j: JSCodeshift,
  collection: Collection,
  variableName: string,
) {
  return collection.find(j.ExportNamedDeclaration, {
    declaration: {
      declarations: [
        {
          id: { name: variableName, type: 'Identifier' },
          type: 'VariableDeclarator',
        },
      ],
      type: 'VariableDeclaration',
    },
  });
}

export function getImportsByPackageName(
  j: JSCodeshift,
  collection: Collection,
  packageName: string,
) {
  return collection.find(j.ImportDeclaration, {
    source: {
      value: packageName,
    },
  });
}

export function exportFunction(
  j: JSCodeshift,
  path: ASTPath<FunctionDeclaration>,
) {
  const functionDeclaration = path.value;

  return j.exportNamedDeclaration(
    j.functionDeclaration(
      j.identifier(functionDeclaration.id!.name as string),
      functionDeclaration.params,
      functionDeclaration.body,
    ),
  );
}

export function exportVariable(
  j: JSCodeshift,
  path: ASTPath<VariableDeclaration>,
) {
  const variableDeclaration = path.value;

  return j.exportNamedDeclaration(
    j.variableDeclaration('const', variableDeclaration.declarations),
  );
}

export function exportDefaultAsNamed(
  j: JSCodeshift,
  path: ASTPath<ExportDefaultDeclaration>,
  name: string,
) {
  const exportDefaultDeclaration = path.value;
  const variableName = j.identifier(name);
  return j.exportNamedDeclaration(
    j.variableDeclaration('const', [
      j.variableDeclarator(
        variableName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        exportDefaultDeclaration.declaration as any,
      ),
    ]),
  );
}

export function exportVarNameAsDefault(j: JSCodeshift, name: string) {
  return j.exportDefaultDeclaration(j.identifier(name));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withComments(to: any, from: any) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  to.comments = from.comments;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return to;
}

export function findNodesAtPosition(
  j: JSCodeshift,
  root: Collection,
  pos: { line: number; column: number },
) {
  const nodes: ASTPath<Node>[] = [];
  const { column, line } = pos;

  root.find(j.Node).forEach(path => {
    const { node } = path;

    if (
      node.loc &&
      node.loc.start.line === line &&
      node.loc.start.column === column
    ) {
      nodes.push(path);
    }

    // Also check if position is within the node's range
    const nodeAny = node as unknown as { start?: number; end?: number };
    if (
      nodeAny.start !== undefined &&
      nodeAny.end !== undefined &&
      nodeAny.start <= column &&
      nodeAny.end >= column && // Additional check for line match
      node.loc &&
      node.loc.start.line === line
    ) {
      nodes.push(path);
    }
  });

  return nodes;
}

export function isInsideNode(
  node: Node,
  pos: { line: number; column: number; endLine: number; endColumn: number },
): boolean {
  if (!node.loc) return false;
  const startOk =
    node.loc.start.line > pos.line ||
    (node.loc.start.line === pos.line &&
      node.loc.start.column + 1 >= pos.column);
  const endOk =
    node.loc.end.line < pos.endLine ||
    (node.loc.end.line === pos.endLine &&
      node.loc.end.column + 1 <= pos.endColumn);
  return startOk && endOk;
}

// Returns true if `parent` is an ancestor of `child`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isParentOf(parent: ASTPath<any>, child: ASTPath<any>) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  let current: ASTPath | null = child.parentPath;
  while (current) {
    if (current === parent) return true;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    current = current.parentPath;
  }
  return false;
}

export function getNodeStart(node?: Node): number | undefined {
  if (
    node &&
    typeof node === 'object' &&
    'start' in node &&
    typeof node.start === 'number'
  ) {
    return node.start;
  }
}
