import {
  ASTPath,
  Collection,
  FunctionDeclaration,
  JSCodeshift,
  VariableDeclaration,
} from 'jscodeshift';

// https://github.com/JamieMason/codemods/blob/master/transforms/lib/helpers.js

function isTopLevel(path: ASTPath) {
  return path.parent.value.type === 'Program';
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
    const exportNamedDeclaration: any = path.value;
    if (exportNamedDeclaration.declaration?.id) {
      identifiers.push(exportNamedDeclaration.declaration.id.name);
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
    const exportNamedDeclaration: any = path.value;
    if (exportNamedDeclaration.declaration?.id) {
      identifiers.push(exportNamedDeclaration.declaration.id.name);
    }
  }

  return identifiers;
}

export function getExportsByClassName(
  j: JSCodeshift,
  collection: Collection,
  className,
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

export function exportClass(j: JSCodeshift, path: any) {
  const classDeclaration = path.value;

  return j.exportNamedDeclaration(
    j.classDeclaration(
      j.identifier(classDeclaration.id.name),
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

export function exportDefaultAsNamed(j: JSCodeshift, path, name) {
  const exportDefaultDeclaration = path.value;
  const variableName = j.identifier(name);
  const variableValue = exportDefaultDeclaration.declaration;
  return j.exportNamedDeclaration(
    j.variableDeclaration('const', [
      j.variableDeclarator(variableName, variableValue),
    ]),
  );
}

export function exportVarNameAsDefault(j: JSCodeshift, name) {
  return j.exportDefaultDeclaration(j.identifier(name));
}

export function withComments(to, from) {
  to.comments = from.comments;
  return to;
}
